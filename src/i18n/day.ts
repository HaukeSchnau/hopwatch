// The Day tab: the dial with today's total and the bean timeline under it.

import { localized } from '.';

export const dayText = localized({
  en: {
    dialLabel: "The day's dial. Tap a bean to find it, a gap to fill it",
    tracked: 'tracked',
    beans: (count: number) => `${count} ${count === 1 ? 'bean' : 'beans'}`,
    median: (duration: string) => ` · median ${duration}`,
    hint: 'Tap an arc to find it,\na gap to fill it',
    emptyHint: 'Tap the ring to fill a gap',
    future: "This day hasn't happened yet.",
    empty: 'No beans this day. Tap the dotted space to add what you did.',
    now: 'now',
    gapLabel: (from: string, to: string) => `Untracked ${from} to ${to}. What was this?`,
    untracked: (duration: string) => `+ untracked ${duration}`,
    /** A bean, read out: "Dog, 09:00 to 10:30, 1:30". `to` is null while it runs. */
    beanLabel: (name: string, from: string, to: string | null, duration: string) =>
      `${name}, ${from} to ${to ?? 'now'}, ${duration}`,
    /** The toast after dragging a knob. */
    moved: (name: string, edge: 'start' | 'end', clock: string) => `${name} ${edge === 'start' ? 'starts' : 'ends'} at ${clock}`,
    knobLabel: (name: string, edge: 'start' | 'end', clock: string) => `${edge === 'start' ? 'Start' : 'End'} of ${name}, ${clock}`,
  },
  de: {
    dialLabel: 'Der Tag als Ring. Tippe auf eine Bohne, um sie zu finden, auf eine Lücke, um sie zu füllen',
    tracked: 'erfasst',
    beans: (count) => `${count} ${count === 1 ? 'Bohne' : 'Bohnen'}`,
    median: (duration) => ` · Median ${duration}`,
    hint: 'Bogen antippen zeigt ihn,\nLücke antippen füllt sie',
    emptyHint: 'Ring antippen füllt eine Lücke',
    future: 'Dieser Tag kommt erst noch.',
    empty: 'Keine Bohnen an diesem Tag. Tippe auf die gepunktete Fläche und trag ein, was du gemacht hast.',
    now: 'jetzt',
    gapLabel: (from, to) => `Nicht erfasst, ${from} bis ${to}. Was war da?`,
    untracked: (duration) => `+ nicht erfasst ${duration}`,
    beanLabel: (name, from, to, duration) => `${name}, ${from} bis ${to ?? 'jetzt'}, ${duration}`,
    moved: (name, edge, clock) => `${name} ${edge === 'start' ? 'beginnt' : 'endet'} um ${clock}`,
    knobLabel: (name, edge, clock) => `${edge === 'start' ? 'Beginn' : 'Ende'} von ${name}, ${clock}`,
  },
});
