// The Now tab: the stage with the dial, the back pill, the pinned grid and the recents row.

import { localized } from '.';

type Pill = 'back' | 'resume';

export const nowText = localized({
  en: {
    /** The stage's top-left corner, by hour. */
    greeting: (hour: number): string =>
      hour < 5 ? 'Night owl' : hour < 12 ? 'Morning!' : hour < 17 ? 'Afternoon!' : hour < 22 ? 'Evening!' : 'Late one',
    today: 'today',
    todayLabel: (total: string) => `${total} tracked today. Open the day`,
    runningLabel: (name: string, clock: string) => `${name}, running since ${clock}. Change the start`,
    nothingRunning: 'Nothing running',
    idleHint: 'Tap a jelly to wake it up',
    since: 'since',
    startedLabel: (clock: string) => `Started at ${clock}. Change the start`,
    /**
     * The back pill's words around the jelly's name, so German can put the verb last:
     * "Back to Dog", "Resume Dog".
     */
    pill: (kind: Pill) => (kind === 'back' ? { before: 'Back to ', after: '' } : { before: 'Resume ', after: '' }),
    all: 'All',
    allLabel: 'All jellies',
    allHint: 'Pick any context from the whole tree',
    switchTo: (name: string) => `Switch to ${name}`,
    running: (name: string) => `${name}, running`,
    newJelly: 'New jelly',
  },
  de: {
    greeting: (hour) =>
      hour < 5 ? 'Nachteule' : hour < 12 ? 'Morgen!' : hour < 17 ? 'Hallo!' : hour < 22 ? 'Abend!' : 'Noch wach?',
    today: 'heute',
    todayLabel: (total) => `Heute ${total} erfasst. Öffnet den Tag`,
    runningLabel: (name, clock) => `${name}, läuft seit ${clock}. Start ändern`,
    nothingRunning: 'Nichts läuft',
    idleHint: 'Tipp ein Jelly wach',
    since: 'seit',
    startedLabel: (clock) => `Gestartet um ${clock}. Start ändern`,
    pill: (kind) => (kind === 'back' ? { before: 'Zurück zu ', after: '' } : { before: '', after: ' fortsetzen' }),
    all: 'Alle',
    allLabel: 'Alle Jellys',
    allHint: 'Wähle irgendein Jelly aus allen',
    switchTo: (name) => `Zu ${name} wechseln`,
    running: (name) => `${name}, läuft`,
    newJelly: 'Neues Jelly',
  },
});
