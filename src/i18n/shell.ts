// The frame around the screens: tabs, the mini player, the toast's own words, the live
// timer, header titles and navigation, and the error screen.

import { localized } from '.';

type Range = 'day' | 'week';

export const shellText = localized({
  en: {
    tabs: { now: 'Now', day: 'Day', week: 'Week', stuff: 'Stuff' },
    /** The mini player, read out as one button. */
    miniPlayer: (name: string) => `${name} running. Opens Now`,
    since: (clock: string) => `since ${clock}`,
    undo: 'Undo',
    dismiss: (label: string) => `${label}. Dismiss`,
    /** The live timer, read out. */
    timer: (hours: number, minutes: number) =>
      `${hours} ${hours === 1 ? 'hour' : 'hours'} ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`,
    header: {
      jumpHint: 'Jumps back to now',
      previous: (range: Range): string => (range === 'day' ? 'Previous day' : 'Previous week'),
      next: (range: Range): string => (range === 'day' ? 'Next day' : 'Next week'),
    },
    /** Week titles; days come from the core's formatters. */
    weeks: {
      this: 'This week',
      last: 'Last week',
      next: 'Next week',
      ago: (n: number) => `${n} weeks ago`,
      ahead: (n: number) => `In ${n} weeks`,
    },
    error: {
      title: 'This screen melted',
      body: 'Your entries are safe. Everything you saved before this is still there.',
      retry: 'Try Again',
      close: 'Close',
    },
  },
  de: {
    tabs: { now: 'Jetzt', day: 'Tag', week: 'Woche', stuff: 'Kram' },
    miniPlayer: (name) => `${name} läuft. Öffnet „Jetzt“`,
    since: (clock) => `seit ${clock}`,
    undo: 'Rückgängig',
    dismiss: (label) => `${label}. Ausblenden`,
    timer: (hours, minutes) =>
      `${hours} ${hours === 1 ? 'Stunde' : 'Stunden'} ${minutes} ${minutes === 1 ? 'Minute' : 'Minuten'}`,
    header: {
      jumpHint: 'Springt zurück ins Jetzt',
      previous: (range) => (range === 'day' ? 'Vorheriger Tag' : 'Vorherige Woche'),
      next: (range) => (range === 'day' ? 'Nächster Tag' : 'Nächste Woche'),
    },
    weeks: {
      this: 'Diese Woche',
      last: 'Letzte Woche',
      next: 'Nächste Woche',
      ago: (n) => `Vor ${n} Wochen`,
      ahead: (n) => `In ${n} Wochen`,
    },
    error: {
      title: 'Hier ist was geschmolzen',
      body: 'Deine Einträge sind sicher. Alles, was du vorher gespeichert hast, ist noch da.',
      retry: 'Nochmal versuchen',
      close: 'Schließen',
    },
  },
});
