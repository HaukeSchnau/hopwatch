// Strings for the week summary: the facts and the on-device model request that
// src/core/week-facts.ts builds, and the bubble's labels. The facts take a language so
// tests can check German without running in German.

import { type Language, localized } from '.';

/** A target clause after "Job got 38 hours", e.g. "past its target of 40 hours". */
type TargetState =
  | { kind: 'past'; running: boolean }
  | { kind: 'onTrack' }
  | { kind: 'behind' }
  | { kind: 'justShort' }
  | { kind: 'short' };

/** The week's total against the week before: more or less by a duration, or about the same. */
type Versus = { by: string; more: boolean } | 'same' | null;

const en = {
  weekdays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  minutes: (n: number) => `${n} minutes`,
  hours: (n: number) => `${n} ${n === 1 ? 'hour' : 'hours'}`,
  /** n and a half hours. */
  halfHours: (n: number) => (n === 1 ? 'an hour and a half' : `${n} and a half hours`),
  almost: (duration: string) => `almost ${duration}`,
  justOver: (duration: string) => `just over ${duration}`,
  /** "Monday, Tuesday and Thursday" */
  list: (names: readonly string[]) => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`),
  /** ", mostly Deep work" or ", all Deep work" after a fact. */
  mostly: (name: string, all: boolean) => `, ${all ? 'all' : 'mostly'} ${name}`,
  /** The running week's days so far: "Monday", "Monday to Thursday". */
  span: (first: string, last: string | null) => (last ? `${first} to ${last}` : first),
  tracked: (total: string, running: boolean, versus: Versus) => {
    const last = running ? 'at this point last week' : 'the week before';
    const compared = versus === null ? '' : versus === 'same' ? `, about the same as ${last}` : `, ${versus.by} ${versus.more ? 'more' : 'less'} than ${last}`;
    return `You tracked ${total}${running ? ' so far' : ''}${compared}.`;
  },
  /** "Job got almost 38 hours, just short of its target of 40 hours." `actual` is null for no time. */
  context: (name: string, actual: string | null, running: boolean, target: { of: string; state: TargetState } | null) => {
    const got = actual ? `got ${actual}${running ? ' so far' : ''}` : 'got no time';
    if (!target) return `${name} ${got}.`;
    const its = `its target of ${target.of}`;
    const s = target.state;
    const clause =
      s.kind === 'past'
        ? `${s.running ? 'already ' : ''}past ${its}`
        : s.kind === 'onTrack'
          ? `on track for ${its}`
          : s.kind === 'behind'
            ? `behind pace for ${its}`
            : `${s.kind === 'justShort' ? 'just short' : 'short'} of ${its}`;
    return `${name} ${got}, ${clause}.`;
  },
  lateEvenings: (days: number, names: string, mostly: string) => `You tracked time after 10 pm on ${days} days (${names})${mostly}.`,
  brokenUp: (day: string, blocks: number, length: string) => `${day} was the most broken up day: ${blocks} blocks of about ${length}.`,
  weekend: (total: string, running: boolean, mostly: string) => `The weekend${running ? ' so far' : ''} had ${total}${mostly}.`,
  busiest: (day: string, total: string, mostly: string) => `${day} was the busiest day, with ${total}${mostly}.`,
  longest: (length: string, name: string, day: string) => `Your longest stretch was ${length} of ${name} on ${day}.`,
  /**
   * The model request around the facts. The instructions stay in English with the
   * answer's language named; the tense line and the facts are in the answer's language,
   * which keeps the model in it.
   */
  request: {
    addressAs: 'talking to the user as "you"',
    writeIn: 'Write in English.',
    over: 'The week is over, so write in the past tense. Don\'t call it "last week" or "this week".',
    running: (span: string) => `The week is still going (${span} so far), so say "so far".`,
    facts: 'Facts, most important first:',
  },
};

/** The facts in each language, for core/week-facts.ts. */
export const factText: Record<Language, typeof en> = {
  en,
  de: {
    weekdays: ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'],
    minutes: (n) => `${n} Minuten`,
    hours: (n) => (n === 1 ? 'eine Stunde' : `${n} Stunden`),
    halfHours: (n) => (n === 1 ? 'anderthalb Stunden' : `${n},5 Stunden`),
    almost: (duration) => `knapp ${duration}`,
    justOver: (duration) => `gut ${duration}`,
    list: (names) => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} und ${names.at(-1)}`),
    mostly: (name, all) => `, ${all ? 'nur' : 'vor allem'} ${name}`,
    span: (first, last) => (last ? `${first} bis ${last}` : first),
    tracked: (total, running, versus) => {
      const last = running ? 'letzte Woche um diese Zeit' : 'in der Woche davor';
      const compared =
        versus === null ? '' : versus === 'same' ? `, etwa so viel wie ${last}` : `, ${versus.by} ${versus.more ? 'mehr' : 'weniger'} als ${last}`;
      return `Du hast ${running ? 'bisher ' : ''}${total} erfasst${compared}.`;
    },
    context: (name, actual, running, target) => {
      const got = actual ? `kam ${running ? 'bisher ' : ''}auf ${actual}` : `bekam ${running ? 'noch ' : ''}keine Zeit`;
      if (!target) return `${name} ${got}.`;
      const goal = `Ziel von ${target.of}`;
      const s = target.state;
      const clause =
        s.kind === 'past'
          ? `${s.running ? 'schon ' : ''}über dem ${goal}`
          : s.kind === 'onTrack'
            ? `auf Kurs zum ${goal}`
            : s.kind === 'behind'
              ? `hinter dem Plan zum ${goal}`
              : `${s.kind === 'justShort' ? 'knapp ' : ''}unter dem ${goal}`;
      return `${name} ${got}, ${clause}.`;
    },
    lateEvenings: (days, names, mostly) => `An ${days} Abenden (${names}) lief nach 22 Uhr noch etwas${mostly}.`,
    brokenUp: (day, blocks, length) => `Der ${day} war am stärksten zerstückelt: ${blocks} Blöcke von je etwa ${length}.`,
    weekend: (total, running, mostly) => `Das Wochenende hatte ${running ? 'bisher ' : ''}${total}${mostly}.`,
    busiest: (day, total, mostly) => `Der ${day} war der vollste Tag, mit ${total}${mostly}.`,
    longest: (length, name, day) => `Dein längster Block waren ${length} ${name} am ${day}.`,
    request: {
      addressAs: 'talking to the user as "du"',
      writeIn: 'Write in German.',
      over: 'Die Woche ist vorbei, also schreib in der Vergangenheit. Nenn sie nicht „letzte Woche“ oder „diese Woche“.',
      running: (span) => `Die Woche läuft noch (bisher ${span}), also sag „bisher“.`,
      facts: 'Fakten, das Wichtigste zuerst:',
    },
  },
};

/** The summary bubble's accessibility labels. */
export const summaryText = localized({
  en: {
    writing: 'Writing a summary of the week',
    label: (summary: string) => `Summary by Apple Intelligence. ${summary}`,
  },
  de: {
    writing: 'Die Woche wird zusammengefasst',
    label: (summary) => `Zusammenfassung von Apple Intelligence. ${summary}`,
  },
});
