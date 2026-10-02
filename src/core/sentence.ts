// Typed logging: "2h deep work this morning" or "lunch 12:30 to 13:15" becomes a plan for
// the timeline. Apple's on-device model only extracts what the sentence says (an action,
// a jelly, clock times, minutes, a day, a part of the day) as plain strings. This module
// builds that request and does everything else in code: date math, a.m./p.m., where a
// block without times goes, clamping to now and validation. Small models are bad at time
// arithmetic; code isn't. Nothing here calls the model or writes entries.

import { type ContextId, type Entry, MIN_ENTRY_MS } from './model';
import { addDays, formatClock, HOUR, MINUTE, startOfDay } from './time';
import { findOpen, isLive } from './timeline';
import { type ContextTree, pathLabel, pickable, type ResolvedContext } from './tree';

/** What typed logging can do: switch (maybe backdated), log a past block, or stop. */
export type Plan =
  | { kind: 'start'; contextId: ContextId; at: number }
  | { kind: 'place'; contextId: ContextId; from: number; to: number }
  | { kind: 'stop'; at: number };

/** A plan, or what's wrong with the sentence in words. */
export type Reading = { plan: Plan } | { problem: string };

const ACTIONS = ['start', 'log', 'stop', 'none'] as const;
const DAYS = ['today', 'yesterday', 'other'] as const;
const PARTS = ['morning', 'noon', 'afternoon', 'evening', 'none'] as const;
const NONE = 'none';

/** Longest block or backdate typed logging accepts. */
const LONGEST = 16 * HOUR;

/** The jellies the model picks from: names, or paths where a name repeats. */
export function jellyChoices(tree: ContextTree): Map<string, ContextId> {
  const list = pickable(tree);
  const count = new Map<string, number>();
  for (const c of list) count.set(c.name.toLowerCase(), (count.get(c.name.toLowerCase()) ?? 0) + 1);
  return new Map(list.map((c) => [(count.get(c.name.toLowerCase()) ?? 0) > 1 ? pathLabel(c) : c.name, c.id]));
}

const INSTRUCTIONS = [
  'You turn a short note typed into a time tracker into fields. Notes are in English or German.',
  'Copy clock times and lengths from the note as they are written. Do not work out new times.',
].join('\n');

// The examples in the descriptions matter: without them the model leaves times empty.
function fieldsFor(jellies: readonly string[]) {
  return [
    {
      name: 'action',
      description:
        'start: they began something and are still at it, like "since 9", "started 20 min ago" or "cooking now". log: a finished stretch of time, like "2h this morning" or "lunch 12:30 to 13:15". stop: they stopped or finished, like "done", "stopped at 5" or "fertig". none: not about time.',
      choices: ACTIONS,
    },
    { name: 'jelly', description: 'Which activity it was. none if it stops, or if nothing fits.', choices: [...jellies, NONE] },
    { name: 'from', description: 'The start time in the note, like 9:00 for "since 9" or 12:30 for "12:30 to 13:15". Empty if there is none.' },
    { name: 'to', description: 'The end time in the note, like 13:15 for "12:30 to 13:15" or 5:00 for "stopped at 5", or now. Empty if there is none.' },
    {
      name: 'minutes',
      description: 'A number of minutes in the note: a length, like 120 for "2h" or 30 for "half an hour", or how long ago, like 20 for "20 min ago". Empty if there is none.',
    },
    { name: 'day', description: 'today, unless the note says yesterday (gestern) or names another day.', choices: DAYS },
    { name: 'part', description: 'The part of the day the note names, like "this morning". none if it names none.', choices: PARTS },
  ] as const;
}

type FieldName = ReturnType<typeof fieldsFor>[number]['name'];
/** The model's answer: one string per field. */
export type SentenceAnswer = Record<FieldName, string>;

/**
 * The on-device model request for `sentence`. It leaves out the current time on purpose:
 * code does all the date math, and given the time, the model copies it into answers.
 */
export function sentenceRequest(sentence: string, tree: ContextTree) {
  return {
    instructions: INSTRUCTIONS,
    prompt: sentence.trim(),
    fields: fieldsFor([...jellyChoices(tree).keys()]),
  };
}

/** A wall-clock time, hours 0 to 23. `exact` when a.m. or p.m. is settled. */
interface ClockTime {
  h: number;
  m: number;
  exact?: boolean;
}

/**
 * "14:30", "9:05", "14.30", "2 pm", "since 9", "14 Uhr", "quarter to 3" or "halb 3" →
 * hours and minutes. Null for anything else: lengths like "5 Minuten", and the "0",
 * "00:00" or "none" a model may write for nothing.
 */
function clockOf(value: string): ClockTime | null {
  const v = value.trim().toLowerCase();
  if (/\d\s*(h\b|min|std|stunde|hour|hr)/.test(v)) return null;
  const spoken = /(quarter|viertel) (to|vor|past|nach) (\d{1,2})|(half past|halb) (\d{1,2})/.exec(v);
  if (spoken) {
    const h = Number(spoken[3] ?? spoken[5]);
    if (spoken[4]) return { h: spoken[4] === 'halb' ? h - 1 : h, m: 30 };
    return ['to', 'vor'].includes(spoken[2]) ? { h: h - 1, m: 45 } : { h, m: 15 };
  }
  const match = /(\d{1,2})(?:[:.h](\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?/.exec(v);
  // A bare 0 or 00:00 is a model's way of saying nothing far more often than midnight.
  if (!match || (Number(match[1]) === 0 && Number(match[2] ?? 0) === 0)) return null;
  let h = Number(match[1]);
  const m = Number(match[2] ?? 0);
  const half = match[3]?.replaceAll('.', '');
  if (half === 'pm' && h < 12) h += 12;
  if (half === 'am' && h === 12) h = 0;
  return h < 24 && m < 60 ? { h, m, exact: half !== undefined || h === 0 || h > 12 } : null;
}

/** A positive number of minutes from "90", "90 min", "1:30", "1h30", "1.5h" or "2 Stunden"; null otherwise. */
function minutesOf(value: string): number | null {
  const v = value.trim().toLowerCase();
  const hours = '(?:h|hrs?|hours?|std|stunden?)';
  const clock = /^(\d+):(\d{2})$/.exec(v) ?? new RegExp(`^(\\d+)\\s*${hours}\\s*(\\d+)`).exec(v);
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]) || null;
  const match = new RegExp(`^(\\d+(?:[.,]\\d+)?)\\s*(${hours})?`).exec(v);
  if (!match) return null;
  const minutes = Math.round(Number(match[1].replace(',', '.')) * (match[2] ? 60 : 1));
  return minutes > 0 ? minutes : null;
}

const saysNow = (value: string) => /^(now|jetzt)$/i.test(value.trim());

// Code reads a few things straight from the sentence, where words and digits are
// unambiguous and the model is not: named days, written ranges and "ago", "since" and
// jelly names.

/** Lowercase words and numbers, so "Kunde Acme, 14-16 Uhr" is "kunde acme 14 16 uhr". */
const plain = (text: string) => ` ${text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean).join(' ')} `;

/** Whether the plain sentence has any of these words. */
const saysAny = (sentence: string, ...words: string[]) => words.some((w) => sentence.includes(` ${w} `));

const weekdayNames = [
  ['sunday', 'sonntag'],
  ['monday', 'montag'],
  ['tuesday', 'dienstag'],
  ['wednesday', 'mittwoch'],
  ['thursday', 'donnerstag'],
  ['friday', 'freitag'],
  ['saturday', 'samstag', 'sonnabend'],
];

/**
 * The day the sentence names, in days from today (-1 is yesterday), or null when it names
 * none. "last monday" on a Wednesday is not yesterday, whatever the model says.
 */
function namedDay(sentence: string, now: number): number | null {
  const says = (...words: string[]) => saysAny(sentence, ...words);
  if (says('vorgestern')) return -2;
  if (says('tomorrow', 'übermorgen')) return 1;
  if (says('yesterday', 'gestern')) return -1;
  const weekday = weekdayNames.findIndex((names) => says(...names));
  if (weekday >= 0) return -((new Date(now).getDay() - weekday + 7) % 7);
  if (says('today', 'heute')) return 0;
  return null;
}

/** A range written with digits: "12-1", "10–11", "9 to 11", "von 12 bis 13 Uhr", "2-4pm". */
function writtenRange(sentence: string): [ClockTime, ClockTime] | null {
  const time = '(\\d{1,2}(?:[:.]\\d{2})?(?:\\s*[ap]m)?)';
  // Not lengths like "2-3 hours".
  const range = new RegExp(`${time}\\s*(?:-|–|—|to|till|until|bis)\\s*${time}(?!\\d|\\s*(?:h\\b|hours?|hrs?|min|std|stunden?))`, 'i');
  const match = range.exec(sentence);
  const from = match && clockOf(match[1]);
  const to = match && clockOf(match[2]);
  return from && to ? [from, to] : null;
}

/** Minutes ago written with digits: "20 min ago", "vor 5 Minuten", "vor 2 Stunden". */
function writtenAgo(sentence: string): number | null {
  const unit = '(min|mins|minutes?|minuten|h|hrs?|hours?|std|stunden?)';
  const match =
    new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*${unit}\\s+ago\\b`, 'i').exec(sentence) ?? new RegExp(`\\bvor\\s+(\\d+(?:[.,]\\d+)?)\\s*${unit}\\b`, 'i').exec(sentence);
  return match && minutesOf(`${match[1]} ${match[2]}`);
}

/**
 * The jelly whose name the sentence spells out, over the model's pick: "meeting with Acme"
 * is Acme, not Meetings. With several, the one with more of its path spelled out wins, so
 * "stint website" is Stint › Website.
 */
function namedJelly(sentence: string, picked: ContextId | undefined, tree: ContextTree): ContextId | undefined {
  const score = (c: ResolvedContext) => [...c.ancestors, c].filter((a) => sentence.includes(plain(a.name))).length;
  const named = pickable(tree).filter((c) => sentence.includes(plain(c.name)));
  const best = named.reduce<ResolvedContext | null>((a, b) => (a && score(a) >= score(b) ? a : b), null);
  const current = picked && tree.byId.get(picked);
  if (!best || (current && named.includes(current) && score(current) >= score(best))) return picked;
  return best.id;
}

function on(day: number, { h, m }: ClockTime): number {
  const d = new Date(day);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

/**
 * The latest past instant at `clock` on `day`, reading 1 to 11 as a.m. or p.m.: "since 9"
 * is 21:00 late in the evening. On today, a time still to come may mean late yesterday,
 * like 23:30 said at 00:10.
 */
function recent(day: number, clock: ClockTime, now: number): number | null {
  const hours = !clock.exact && clock.h >= 1 && clock.h <= 11 ? [clock.h, clock.h + 12] : [clock.h];
  const isToday = day === startOfDay(now);
  const days = isToday ? [day, addDays(day, -1)] : [day];
  const candidates = days
    .flatMap((d) => hours.map((h) => on(d, { h, m: clock.m })))
    .filter((t) => t <= now && (t >= day || now - t <= 6 * HOUR));
  return candidates.length ? Math.max(...candidates) : null;
}

/** A clock time in a past block. 1 to 5 means the afternoon when that's already past. */
function blockTime(day: number, clock: ClockTime, now: number): number {
  if (!clock.exact && clock.h >= 1 && clock.h <= 5) {
    const afternoon = on(day, { h: clock.h + 12, m: clock.m });
    if (afternoon <= now) return afternoon;
  }
  return on(day, clock);
}

/** The first time at `clock` after `from`: "12:30 to 1:15" ends at 13:15, "22 to 1" the next day. */
function blockEnd(day: number, from: number, clock: ClockTime): number {
  const same = on(day, clock);
  const afternoon = !clock.exact && clock.h < 12 ? [on(day, { h: clock.h + 12, m: clock.m })] : [];
  return [same, ...afternoon].find((t) => t > from) ?? addDays(same, 1);
}

/** Where a block of `length` goes when only its part of the day is known, in hours. */
const windows = {
  morning: { from: 6, to: 12, anchor: 8 },
  noon: { from: 11, to: 14, anchor: 12 },
  afternoon: { from: 12, to: 18, anchor: 14 },
  evening: { from: 17, to: 23, anchor: 19 },
} as const;

/** The start closest to `anchor` where `length` fits between entries inside [lo, hi], or null. */
function nearestFit(entries: readonly Entry[], lo: number, hi: number, anchor: number, length: number, now: number): number | null {
  let best: number | null = null;
  const consider = (gapStart: number, gapEnd: number) => {
    if (gapEnd - gapStart < length) return;
    const start = Math.min(Math.max(anchor, gapStart), gapEnd - length);
    if (best === null || Math.abs(start - anchor) < Math.abs(best - anchor)) best = start;
  };
  let cursor = lo;
  for (const e of entries) {
    if (!isLive(e)) continue;
    const end = e.endUtc ?? now;
    if (end <= cursor) continue;
    if (e.startUtc >= hi) break;
    consider(cursor, e.startUtc);
    cursor = end;
  }
  consider(cursor, Math.min(hi, now));
  return best;
}

/**
 * A block of `length` on `day` when the sentence gives no clock time: in the gap closest
 * to the named part's usual hour ("this morning" is 08:00), else at that hour. Without a
 * part, a block today ends now, and one yesterday goes in its daytime.
 */
function placeLength(entries: readonly Entry[], day: number, part: string, length: number, now: number) {
  const window = part in windows ? windows[part as keyof typeof windows] : null;
  if (!window && day === startOfDay(now)) return { from: now - length, to: now };
  const { from, to, anchor } = window ?? { from: 8, to: 20, anchor: 9 };
  const at = (h: number) => on(day, { h, m: 0 });
  // A part of the day still to come stays there, and the caller says so.
  if (at(from) >= now) return { from: at(anchor), to: at(anchor) + length };
  const start = nearestFit(entries, at(from), at(to), at(anchor), length, now) ?? Math.min(at(anchor), now - length);
  return { from: start, to: start + length };
}

/**
 * Turns the model's answer for `sentence` into a plan against the current entries, or
 * says why it can't. Null when the sentence isn't about tracking time at all.
 */
export function readSentence(
  sentence: string,
  answer: SentenceAnswer,
  { tree, entries, now }: { tree: ContextTree; entries: readonly Entry[]; now: number },
): Reading | null {
  const problem = (text: string): Reading => ({ problem: text });
  if (answer.action === NONE || !(ACTIONS as readonly string[]).includes(answer.action)) return null;

  const said = plain(sentence);
  const today = startOfDay(now);
  const offset = namedDay(said, now) ?? (answer.day === 'yesterday' ? -1 : answer.day === 'today' ? 0 : null);
  if (offset !== 0 && offset !== -1) return problem('Only today and yesterday work');
  const day = addDays(today, offset);

  // The model sometimes makes numbers up. A time counts only if its hour is written in the
  // sentence (2 may come back as 14:00), a length only if the sentence has digits or says one.
  const numbers = new Set((sentence.match(/\d+/g) ?? []).map(Number));
  const grounded = (value: string) => {
    const h = Number(/\d+/.exec(value)?.[0]);
    return numbers.has(h) || numbers.has(h - 12);
  };
  const written = writtenRange(sentence);
  const from = written?.[0] ?? (grounded(answer.from) ? clockOf(answer.from) : null);
  const to = written?.[1] ?? (grounded(answer.to) ? clockOf(answer.to) : null);
  const untilNow = saysNow(answer.to);
  const saysLength = numbers.size > 0 || /half|halb|hour|stunde|minute|viertel|quarter/i.test(sentence);
  const minutes = saysLength ? minutesOf(answer.minutes) : null;

  /** When a start or stop happened: some minutes ago, at a clock time, or now. */
  const instant = (clock: ClockTime | null): number | Reading => {
    const ago = writtenAgo(sentence);
    if (ago !== null) return now - ago * MINUTE;
    if (clock) return recent(day, clock, now) ?? problem(`${formatClock(on(day, clock))} is still to come`);
    return minutes !== null ? now - minutes * MINUTE : now;
  };

  if (answer.action === 'stop') {
    const open = findOpen(entries);
    if (!open) return problem('Nothing is running');
    // A model may put the stop time in either field.
    const at = instant(to ?? from);
    if (typeof at !== 'number') return at;
    const name = tree.byId.get(open.contextId)?.name ?? 'It';
    if (at < open.startUtc) return problem(`That's before ${name} started at ${formatClock(open.startUtc)}`);
    return { plan: { kind: 'stop', at } };
  }

  const contextId = namedJelly(said, jellyChoices(tree).get(answer.jelly), tree);
  if (!contextId) return problem("Couldn't tell which jelly");

  // A start with an end is a block. A block with nothing but a start today, or one that
  // says "since", is still going.
  const open = to === null && !untilNow;
  const onlyStart = open && from !== null && minutes === null;
  const ongoing = open && saysAny(said, 'since', 'seit');
  const isBlock = answer.action === 'log' ? !ongoing && !(onlyStart && offset === 0) : to !== null;

  if (!isBlock) {
    const at = instant(from);
    if (typeof at !== 'number') return at;
    if (now - at > LONGEST) return problem('That started more than 16 hours ago');
    return { plan: { kind: 'start', contextId, at } };
  }

  let range: { from: number; to: number };
  if (from && (to || untilNow)) {
    const start = blockTime(day, from, now);
    range = { from: start, to: to ? blockEnd(day, start, to) : now };
  } else if (from && minutes !== null) {
    const start = blockTime(day, from, now);
    range = { from: start, to: start + minutes * MINUTE };
  } else if (to && minutes !== null) {
    const end = blockTime(day, to, now);
    range = { from: end - minutes * MINUTE, to: end };
  } else if (minutes !== null) {
    range = placeLength(entries, day, answer.part, minutes * MINUTE, now);
  } else {
    return problem('Say how long, or until when');
  }

  if (range.from >= now) return problem(`${formatClock(range.from)} is still to come`);
  const end = Math.min(range.to, now);
  if (end - range.from < Math.max(MIN_ENTRY_MS, MINUTE)) return problem("That's too short");
  if (end - range.from > LONGEST) return problem("That's longer than 16 hours");
  return { plan: { kind: 'place', contextId, from: range.from, to: end } };
}
