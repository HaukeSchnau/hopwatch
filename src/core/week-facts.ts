// Facts about a week worth saying, for the plain-language summary on the Week tab. Code
// decides what is true and what matters; Apple's on-device model only turns the facts
// into a few friendly sentences (`summaryRequest`, sent by src/jelly/report/summary.ts),
// and `checkSummary` turns down an answer that brings numbers or days the facts don't
// have. English or German: the app's language unless a caller asks for the other.

import { type Language, language } from '@/i18n';
import { factText } from '@/i18n/summary';

import type { ContextId, Entry } from './model';
import { type Segment, type TargetLine, weekReport, type WeekReport } from './reports';
import { addDays, HOUR, MINUTE } from './time';
import type { ContextTree, ResolvedContext } from './tree';

/** A week with less tracked time than this gets no summary. */
const MIN_TRACKED = 3 * HOUR;

/**
 * A duration the way people say it: 5-minute steps below an hour, half hours below ten
 * hours, whole hours above, hedged when it's off by more than a little. "25 minutes",
 * "almost 2 hours", "6 and a half hours", "just over 38 hours"; "knapp 2 Stunden".
 */
export function spoken(ms: number, lang: Language = language): string {
  const text = factText[lang];
  const minutes = Math.round(ms / MINUTE);
  if (minutes < 55) return text.minutes(Math.max(5, Math.round(minutes / 5) * 5));
  const step = minutes < 600 ? 30 : 60;
  const rounded = Math.round(minutes / step) * step;
  const off = minutes - rounded;
  const slack = step / 6;
  const hours = Math.floor(rounded / 60);
  const said = rounded % 60 === 0 ? text.hours(hours) : text.halfHours(hours);
  return off < -slack ? text.almost(said) : off > slack ? text.justOver(said) : said;
}

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
function mostly(segments: readonly Segment[], share: number, lang: Language, roots = false): string {
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
  return factText[lang].mostly(top.context.name, top.ms >= 0.95 * total);
}

/**
 * Where a weekly target stands, said after "Job got 38 hours": past it, just short of it
 * or short of it, or for the running week whether it's on pace with the week so far or
 * behind. The shortfall itself stays unsaid, so the model has no second number to mix up
 * with the first (when it got one, it wrote "with 5 hours left for 6 hours").
 */
function targetState(line: TargetLine, running: boolean, elapsed: number, lang: Language) {
  const of = spoken(line.target, lang);
  if (line.diff >= 0) return { of, state: { kind: 'past', running } } as const;
  if (running) {
    return line.actual >= line.target * elapsed
      ? ({ of, state: { kind: 'onTrack' } } as const)
      : ({ of, state: { kind: 'behind' } } as const);
  }
  return { of, state: { kind: -line.diff <= line.target * 0.1 ? 'justShort' : 'short' } } as const;
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
export function weekFacts(
  entries: readonly Entry[],
  tree: ContextTree,
  weekStart: number,
  now: number,
  lang: Language = language,
): WeekFacts | null {
  const text = factText[lang];
  const say = (ms: number) => spoken(ms, lang);
  /** Monday is 0. */
  const weekday = (ts: number) => text.weekdays[(new Date(ts).getDay() + 6) % 7];
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
  const diff = total - before;
  const versus =
    before < HOUR ? null : Math.abs(diff) >= Math.max(HOUR, before * 0.1) ? { by: say(Math.abs(diff)), more: diff > 0 } : 'same';
  facts.push(text.tracked(say(total), running, versus));

  // The biggest top-level context with its target.
  const targets = new Map(week.targets.map((line) => [line.context.id, line]));
  const roots = [...week.totals.roots].sort((a, b) => b.total - a.total).filter((r) => r.total >= Math.max(30 * MINUTE, total * 0.1));
  /** "Job got almost 38 hours, just short of its target of 40 hours." */
  const contextFact = (context: ResolvedContext, actual: number) => {
    const line = targets.get(context.id);
    targets.delete(context.id);
    return text.context(context.name, actual > 0 ? say(actual) : null, running, line ? targetState(line, running, elapsed, lang) : null);
  };
  if (roots[0]) facts.push(contextFact(roots[0].context, roots[0].total));

  // The one most notable thing about the week, if any.
  const tracked = week.days.filter((d) => d.totals.total > 0);
  const notable = (): string | null => {
    const late = week.days.map((d) => clip(d.segments, d.end - 2 * HOUR, d.end));
    const lateDays = week.days.filter((_, i) => sum(late[i]) >= 15 * MINUTE);
    if (lateDays.length >= 2) {
      return text.lateEvenings(lateDays.length, text.list(lateDays.map((d) => weekday(d.start))), mostly(late.flat(), 0.5, lang));
    }
    const scattered = [...tracked].sort((a, b) => b.fragmentation.blocks - a.fragmentation.blocks)[0];
    if (scattered && scattered.fragmentation.blocks >= 12 && scattered.fragmentation.median < 30 * MINUTE) {
      const { blocks, median } = scattered.fragmentation;
      return text.brokenUp(weekday(scattered.start), blocks, say(median));
    }
    const weekend = week.days.slice(5).flatMap((d) => d.segments);
    if (at > week.days[5].start && sum(weekend) >= Math.max(2 * HOUR, total * 0.25)) {
      return text.weekend(say(sum(weekend)), running, mostly(weekend, 0.5, lang, true));
    }
    const busiest = [...tracked].sort((a, b) => b.totals.total - a.totals.total)[0];
    if (tracked.length >= 2 && busiest.totals.total >= 1.3 * (total / tracked.length)) {
      return text.busiest(weekday(busiest.start), say(busiest.totals.total), mostly(busiest.segments, 0.4, lang));
    }
    const longest = week.days.flatMap((d) => d.segments).sort((a, b) => b.end - b.start - (a.end - a.start))[0];
    if (longest && longest.end - longest.start >= 3 * HOUR) {
      return text.longest(say(longest.end - longest.start), longest.context.name, weekday(longest.start));
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

  const span = running ? text.span(text.weekdays[0], today === 0 ? null : weekday(at)) : null;
  return { over: !running, span, facts: facts.slice(0, MAX_FACTS) };
}

/**
 * The on-device model request that words `week`, with one field, `summary`. The prompt
 * alone says what's asked, so a hash of it tells when a stored summary is out of date.
 */
export function summaryRequest(week: WeekFacts, lang: Language = language) {
  const text = factText[lang].request;
  return {
    instructions: [
      'You write the short summary at the top of the Week screen in Hopwatch, a personal time tracker.',
      `Write 2 or 3 short sentences, under 45 words in all, ${text.addressAs}. Sound warm and a little playful, like a friend glancing at their week.`,
      'Weave the facts into flowing sentences with lively, friendly verbs instead of listing them.',
      'Use only the facts you are given. Keep each number with the thing it belongs to, copy numbers as written and keep names as written.',
      'Never calculate, round or invent numbers, days, reasons or advice. No closing remark.',
      `${text.writeIn} No greeting, no questions, no emoji.`,
    ].join('\n'),
    prompt: [week.span === null ? text.over : text.running(week.span), text.facts, ...week.facts.map((fact) => `- ${fact}`)].join('\n'),
    fields: [{ name: 'summary', description: 'The summary: 2 or 3 short sentences, under 45 words, using only the facts.' }] as const,
  };
}

/** Letters or digits on neither side, since \b only knows ASCII ("dreißig", "fünf"). */
const word = (pattern: string) => `(?<![\\p{L}\\p{N}])(?:${pattern})(?![\\p{L}\\p{N}])`;
/** Number words, longest first so "fünfzehn" isn't read as "fünf". */
const longestFirst = (words: readonly string[]) => [...words].sort((a, b) => b.length - a.length).join('|');

const englishUnits = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const germanUnits = ['null', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf', 'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn'];
const englishTens = ['twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const germanTens = ['zwanzig', 'dreißig', 'vierzig', 'fünfzig', 'sechzig', 'siebzig', 'achtzig', 'neunzig'];

/**
 * Number words and phrases as digits. English: "twenty-one", "two and a half" (2.5), "an
 * hour and a half" (1.5). German: "einundzwanzig", "anderthalb" and "eineinhalb" (1.5),
 * "zweieinhalb" or "2 ½" (2.5), "eine Stunde" (1), "eine halbe Stunde" (0.5). "One",
 * "ein" and "eine" alone are left out, since they're mostly pronouns and articles.
 */
const numberWords: Record<Language, (text: string) => string> = {
  en: (text) => {
    const units = longestFirst(englishUnits.slice(2));
    const tens = englishTens.join('|');
    const value = (w: string) => (englishTens.includes(w) ? (englishTens.indexOf(w) + 2) * 10 : englishUnits.indexOf(w));
    return text
      .replace(/\ban hour and a half\b/g, '1.5 hours')
      .replace(/\bhalf an hour\b/g, '0.5 hours')
      .replace(new RegExp(`\\b(${tens})[- ](${englishUnits.slice(1, 10).join('|')})\\b`, 'g'), (_, t: string, u: string) => String(value(t) + value(u)))
      .replace(new RegExp(`\\b(${tens}|${units})\\b`, 'g'), (w: string) => String(value(w)))
      .replace(/(\d+) and a half\b/g, '$1.5');
  },
  de: (text) => {
    const units = longestFirst(germanUnits.slice(2, 13));
    // "ein" only shows up in compounds here: einundzwanzig.
    const value = (w: string) => (germanTens.includes(w) ? (germanTens.indexOf(w) + 2) * 10 : w === 'ein' ? 1 : germanUnits.indexOf(w));
    return text
      .replace(new RegExp(word('anderthalb|eineinhalb'), 'gu'), '1,5')
      .replace(new RegExp(word(`(${units})einhalb`), 'gu'), (_, u: string) => `${value(u)},5`)
      .replace(/(\d+)\s*(?:einhalb|½)/gu, '$1,5')
      .replace(new RegExp(word('(?:eine[nr]?\\s+)?halben?\\s+stunde'), 'gu'), '0,5 stunden')
      .replace(new RegExp(word('eine[nr]?\\s+(?:(?:knappe|gute)n?\\s+)?stunde'), 'gu'), '1 stunde')
      .replace(new RegExp(word(`(ein|${units})und(${germanTens.join('|')})`), 'gu'), (_, u: string, t: string) => String(value(t) + value(u)))
      .replace(new RegExp(word(`${germanTens.join('|')}|${longestFirst(germanUnits.slice(2))}`), 'gu'), (w: string) => String(value(w)));
  },
};

/** The numbers in a text, in digits or words, decimals with a point or a comma. */
function numbersIn(text: string, lang: Language): Set<number> {
  const found = new Set<number>();
  for (const match of numberWords[lang](text.toLowerCase()).matchAll(/\d+(?:[.,]\d+)?/g)) found.add(Number(match[0].replace(',', '.')));
  return found;
}

/** Weekday names to look for, Monday first, with what may follow them. */
const weekdayNames: Record<Language, { names: string[][]; suffix: string }> = {
  en: { names: [['monday'], ['tuesday'], ['wednesday'], ['thursday'], ['friday'], ['saturday'], ['sunday']], suffix: 's?(?![\\p{L}])' },
  // German glues on "s", "abend", "nachmittag" and the like: "dienstags", "Dienstagabend".
  de: { names: [['montag'], ['dienstag'], ['mittwoch'], ['donnerstag'], ['freitag'], ['samstag', 'sonnabend'], ['sonntag']], suffix: '' },
};

/** The weekdays a text names, by their first name in `weekdayNames`. */
function weekdaysIn(text: string, lang: Language): Set<string> {
  const { names, suffix } = weekdayNames[lang];
  return new Set(names.filter((day) => new RegExp(`(?<![\\p{L}])(?:${day.join('|')})${suffix}`, 'iu').test(text)).map((day) => day[0]));
}

/**
 * Why a model's summary of `week` can't be shown, or null when it can: it must be a few
 * sentences long without questions, and every number and weekday in it must come from
 * the facts. `lang` is the language of both.
 */
export function checkSummary(summary: string, week: WeekFacts, lang: Language = language): string | null {
  const text = summary.trim();
  if (text.length < 20 || text.length > 420) return `length ${text.length}`;
  if (text.includes('?')) return 'a question';
  const source = [week.span ?? '', ...week.facts].join('\n');
  const allowed = numbersIn(source, lang);
  const numbers = [...numbersIn(text, lang)].filter((n) => !allowed.has(n));
  if (numbers.length > 0) return `numbers not in the facts: ${numbers.join(', ')}`;
  const days = weekdaysIn(source, lang);
  const extra = [...weekdaysIn(text, lang)].filter((day) => !days.has(day));
  if (extra.length > 0) return `days not in the facts: ${extra.join(', ')}`;
  return null;
}
