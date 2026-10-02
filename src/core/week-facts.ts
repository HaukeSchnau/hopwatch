// Facts about a week worth saying, for the plain-language summary on the Week tab. Code
// decides what is true and what matters; Apple's on-device model only turns the facts
// into a few friendly sentences (src/jelly/report/summary.ts), and `checkSummary` turns
// down an answer that brings numbers or days the facts don't have.

import type { ContextId, Entry } from './model';
import { type Segment, type TargetLine, weekReport, type WeekReport } from './reports';
import { addDays, HOUR, MINUTE } from './time';
import type { ContextTree, ResolvedContext } from './tree';

/** A week with less tracked time than this gets no summary. */
const MIN_TRACKED = 3 * HOUR;

/**
 * A duration the way people say it: 5-minute steps below an hour, half hours below ten
 * hours, whole hours above, hedged when it's off by more than a little. "25 minutes",
 * "almost 2 hours", "6 and a half hours", "just over 38 hours".
 */
export function spoken(ms: number): string {
  const minutes = Math.round(ms / MINUTE);
  if (minutes < 55) return `${Math.max(5, Math.round(minutes / 5) * 5)} minutes`;
  const step = minutes < 600 ? 30 : 60;
  const rounded = Math.round(minutes / step) * step;
  const off = minutes - rounded;
  const slack = step / 6;
  const hedge = off < -slack ? 'almost ' : off > slack ? 'just over ' : '';
  const hours = Math.floor(rounded / 60);
  if (rounded % 60 === 0) return `${hedge}${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  return `${hedge}${hours === 1 ? 'an hour and a half' : `${hours} and a half hours`}`;
}

const weekdayFormat = new Intl.DateTimeFormat('en-GB', { weekday: 'long' });
const weekday = (ts: number) => weekdayFormat.format(ts);
const rootOf = (context: ResolvedContext) => context.ancestors[0] ?? context;
const sum = (segments: readonly Segment[]) => segments.reduce((total, s) => total + s.end - s.start, 0);

/** Segments cut to [from, to). */
const clip = (segments: readonly Segment[], from: number, to: number) =>
  segments.flatMap((s) => {
    const start = Math.max(s.start, from);
    const end = Math.min(s.end, to);
    return end > start ? [{ ...s, start, end }] : [];
  });

/** ", mostly Deep work" when one context (or root, with `roots`) has `share` of the time, ", all Deep work" for nearly all. */
function mostly(segments: readonly Segment[], share: number, roots = false): string {
  const sums = new Map<ContextId, { context: ResolvedContext; ms: number }>();
  for (const s of segments) {
    const context = roots ? rootOf(s.context) : s.context;
    const entry = sums.get(context.id) ?? { context, ms: 0 };
    entry.ms += s.end - s.start;
    sums.set(context.id, entry);
  }
  const top = [...sums.values()].sort((a, b) => b.ms - a.ms)[0];
  const total = sum(segments);
  if (!top || top.ms < share * total) return '';
  return `, ${top.ms >= 0.95 * total ? 'all' : 'mostly'} ${top.context.name}`;
}

/** "Monday, Tuesday and Thursday" */
const listOf = (names: string[]) => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`);

/**
 * Where a weekly target stands, as a clause after "Job got 38 hours": past it, just short
 * of it or short of it, or for the running week whether that's on pace with the week so
 * far and otherwise what's still needed. The shortfall itself stays unsaid, so the model
 * has no second number to mix up with the first.
 */
function targetClause(line: TargetLine, running: boolean, elapsed: number): string {
  const target = `its target of ${spoken(line.target)}`;
  if (line.diff >= 0) return `${running ? 'already ' : ''}past ${target}`;
  if (running) return line.actual >= line.target * elapsed ? `on track for ${target}` : `with ${spoken(-line.diff)} to go for ${target}`;
  return `${-line.diff <= line.target * 0.1 ? 'just short' : 'short'} of ${target}`;
}

/** Tracked time in `report` before `cutoff`, for "at this point last week". */
const trackedBefore = (report: WeekReport, cutoff: number) => sum(clip(report.days.flatMap((d) => d.segments), report.start, cutoff));

/** What a summary of a week gets to say. */
export interface WeekFacts {
  /** False for the current week. */
  over: boolean;
  /** The current week's days so far, "Monday to Thursday"; null once the week is over. */
  span: string | null;
  /** A few short sentences worth saying, most important first. */
  facts: string[];
}

/** The model tends to say every fact it gets; more than three make a long, muddled answer. */
const MAX_FACTS = 3;

/**
 * What's worth saying about the week starting at `weekStart`, most important first: the
 * total against the week before, the biggest context with its target, the one most notable
 * thing about the week (late evenings, a broken-up day, a big weekend, the busiest day or
 * a long stretch), other targets, then the runner-up context. Durations are spoken
 * ("almost 38 hours"). Null when the week has too little tracked time to summarize.
 */
export function weekFacts(entries: readonly Entry[], tree: ContextTree, weekStart: number, now: number): WeekFacts | null {
  const end = addDays(weekStart, 7);
  const at = Math.min(now, end);
  const week = weekReport(entries, tree, weekStart, at);
  const total = week.totals.total;
  if (total < MIN_TRACKED) return null;
  const previous = weekReport(entries, tree, addDays(weekStart, -7), weekStart);
  const running = now < end;
  const today = week.days.findIndex((d) => at >= d.start && at < d.end);
  const elapsed = (at - weekStart) / (end - weekStart);
  const facts: string[] = [];

  // The total, against the week before (for a running week, up to the same moment).
  const before = running ? trackedBefore(previous, addDays(at, -7)) : previous.totals.total;
  const last = running ? 'at this point last week' : 'the week before';
  const diff = total - before;
  let compared = '';
  if (before >= HOUR && Math.abs(diff) >= Math.max(HOUR, before * 0.1)) {
    compared = `, ${spoken(Math.abs(diff))} ${diff > 0 ? 'more' : 'less'} than ${last}`;
  } else if (before >= HOUR) compared = `, about the same as ${last}`;
  facts.push(`You tracked ${spoken(total)}${running ? ' so far' : ''}${compared}.`);

  // The biggest top-level context with its target.
  const targets = new Map(week.targets.map((line) => [line.context.id, line]));
  const roots = [...week.totals.roots].sort((a, b) => b.total - a.total).filter((r) => r.total >= Math.max(30 * MINUTE, total * 0.1));
  /** "Job got almost 38 hours, just short of its target of 40 hours." */
  const contextFact = (context: ResolvedContext, actual: number) => {
    const line = targets.get(context.id);
    targets.delete(context.id);
    const got = actual > 0 ? `got ${spoken(actual)}${running ? ' so far' : ''}` : 'got no time';
    return `${context.name} ${got}${line ? `, ${targetClause(line, running, elapsed)}` : ''}.`;
  };
  if (roots[0]) facts.push(contextFact(roots[0].context, roots[0].total));

  // The one most notable thing about the week, if any.
  const tracked = week.days.filter((d) => d.totals.total > 0);
  const notable = (): string | null => {
    const late = week.days.map((d) => clip(d.segments, d.end - 2 * HOUR, d.end));
    const lateDays = week.days.filter((_, i) => sum(late[i]) >= 15 * MINUTE);
    if (lateDays.length >= 2) {
      return `You tracked time after 10 pm on ${lateDays.length} days (${listOf(lateDays.map((d) => weekday(d.start)))})${mostly(late.flat(), 0.5)}.`;
    }
    const scattered = [...tracked].sort((a, b) => b.fragmentation.blocks - a.fragmentation.blocks)[0];
    if (scattered && scattered.fragmentation.blocks >= 12 && scattered.fragmentation.median < 30 * MINUTE) {
      const { blocks, median } = scattered.fragmentation;
      return `${weekday(scattered.start)} was the most broken up day: ${blocks} blocks of about ${spoken(median)}.`;
    }
    const weekend = week.days.slice(5).flatMap((d) => d.segments);
    if (at > week.days[5].start && sum(weekend) >= Math.max(2 * HOUR, total * 0.25)) {
      return `The weekend${running ? ' so far' : ''} had ${spoken(sum(weekend))}${mostly(weekend, 0.5, true)}.`;
    }
    const busiest = [...tracked].sort((a, b) => b.totals.total - a.totals.total)[0];
    if (tracked.length >= 2 && busiest.totals.total >= 1.3 * (total / tracked.length)) {
      return `${weekday(busiest.start)} was the busiest day, with ${spoken(busiest.totals.total)}${mostly(busiest.segments, 0.4)}.`;
    }
    const longest = week.days.flatMap((d) => d.segments).sort((a, b) => b.end - b.start - (a.end - a.start))[0];
    if (longest && longest.end - longest.start >= 3 * HOUR) {
      return `Your longest stretch was ${spoken(longest.end - longest.start)} of ${longest.context.name} on ${weekday(longest.start)}.`;
    }
    return null;
  };
  const extra = notable();
  if (extra) facts.push(extra);

  // Other targets, unless archived and untouched, then the runner-up context.
  for (const line of [...targets.values()]) {
    if (!(line.context.hidden && line.actual === 0)) facts.push(contextFact(line.context, line.actual));
  }
  if (roots[1]) facts.push(contextFact(roots[1].context, roots[1].total));

  const span = !running ? null : today === 0 ? 'Monday' : `Monday to ${weekday(at)}`;
  return { over: !running, span, facts: facts.slice(0, MAX_FACTS) };
}

const units = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
const tens: Record<string, number> = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

/**
 * The numbers in a text, in digits or words, with halves folded in: "2 and a half hours"
 * and "two and a half hours" are 2.5, "an hour and a half" is 1.5. "One" is left out,
 * since it's mostly a pronoun ("the busy one").
 */
function numbersIn(text: string): Set<number> {
  const tensPattern = Object.keys(tens).join('|');
  const normal = text
    .toLowerCase()
    .replace(/\ban hour and a half\b/g, '1.5 hours')
    .replace(/\bhalf an hour\b/g, '0.5 hours')
    .replace(new RegExp(`\\b(${tensPattern})[- ](${units.slice(1, 10).join('|')})\\b`, 'g'), (_, t: string, u: string) => String(tens[t] + units.indexOf(u)))
    .replace(new RegExp(`\\b(${tensPattern}|${units.slice(2).join('|')})\\b`, 'g'), (word: string) => String(tens[word] ?? units.indexOf(word)));
  const found = new Set<number>();
  for (const match of normal.matchAll(/(\d+(?:\.\d+)?)( and a half)?/g)) found.add(Number(match[1]) + (match[2] ? 0.5 : 0));
  return found;
}

const weekdaysIn = (text: string) => new Set(weekdays.filter((day) => new RegExp(`\\b${day}s?\\b`, 'i').test(text)));

/**
 * Why a model's summary of `week` can't be shown, or null when it can: it must be a few
 * sentences long without questions, and every number and weekday in it must come from
 * the facts.
 */
export function checkSummary(summary: string, week: WeekFacts): string | null {
  const text = summary.trim();
  if (text.length < 20 || text.length > 420) return `length ${text.length}`;
  if (text.includes('?')) return 'a question';
  const source = [week.span ?? '', ...week.facts].join('\n');
  const allowed = numbersIn(source);
  const numbers = [...numbersIn(text)].filter((n) => !allowed.has(n));
  if (numbers.length > 0) return `numbers not in the facts: ${numbers.join(', ')}`;
  const days = weekdaysIn(source);
  const extra = [...weekdaysIn(text)].filter((day) => !days.has(day));
  if (extra.length > 0) return `days not in the facts: ${extra.join(', ')}`;
  return null;
}
