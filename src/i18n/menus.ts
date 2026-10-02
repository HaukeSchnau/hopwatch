// The long-press menus for starting and stopping, their consequence subtitles ("Deep
// work stops at 14:50"), and the hints that point at them. The time sheets reuse the
// consequences through src/jelly/menus.ts.

import { localized } from '.';

export const menuText = localized({
  en: {
    /** "5 min ago · 09:07" */
    ago: (minutes: number, clock: string) => `${minutes} min ago · ${clock}`,
    startedEarlier: 'Started earlier',
    /** The section header when the held jelly is the one running. */
    actuallyStarted: 'Actually started',
    stoppedEarlier: 'Stopped earlier',
    atTime: 'At a time…',
    edit: (name: string) => `Edit ${name}`,
    stop: (name: string) => `Stop ${name}`,
    startHint: 'Hold to start it at an earlier time',
    stopHint: 'Hold to stop at an earlier time',
    /** Stands in for a jelly that's gone. */
    something: 'Something',
    /** What a backdated start does to the entry it cuts. */
    cut: (name: string, running: boolean, clock: string) => `${name} ${running ? 'stops' : 'ends'} at ${clock}`,
    replaces: (name: string) => `replaces ${name}`,
    replacesMany: (count: number) => `replaces ${count} entries`,
    /** What a backdated stop leaves: "0:40 of Deep work". */
    stopLeaves: (duration: string, name: string) => `${duration} of ${name}`,
    tooShort: (name: string) => `Too short, ${name} is dropped`,
    /** The toast after moving the running entry's start. */
    movedStart: (name: string | undefined, clock: string) => `${name ?? 'It'} since ${clock}`,
  },
  de: {
    ago: (minutes, clock) => `vor ${minutes} Min. · ${clock}`,
    startedEarlier: 'Früher gestartet',
    actuallyStarted: 'Eigentlich gestartet',
    stoppedEarlier: 'Früher gestoppt',
    atTime: 'Uhrzeit wählen…',
    edit: (name) => `${name} bearbeiten`,
    stop: (name) => `${name} stoppen`,
    startHint: 'Halten, um früher zu starten',
    stopHint: 'Halten, um früher zu stoppen',
    something: 'Etwas',
    cut: (name, running, clock) => `${name} ${running ? 'stoppt' : 'endet'} um ${clock}`,
    replaces: (name) => `ersetzt ${name}`,
    replacesMany: (count) => `ersetzt ${count} Einträge`,
    stopLeaves: (duration, name) => `${duration} ${name}`,
    tooShort: (name) => `Zu kurz, ${name} fällt weg`,
    movedStart: (name, clock) => (name ? `${name} seit ${clock}` : `Seit ${clock}`),
  },
});
