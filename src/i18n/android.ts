// Strings for Android's surfaces outside the app (src/widgets): the running entry's
// notification and the launcher's shortcuts.

import { localized } from '.';

export const androidText = localized({
  en: {
    running: {
      /** The notification channel, as listed in the system's notification settings. */
      channel: 'Running',
      channelDescription: 'Shows the running jelly with a timer, and buttons to stop it or go back.',
      since: (clock: string) => `Since ${clock}`,
      stop: 'Stop',
      back: (name: string) => `Back to ${name}`,
    },
    /** Long labels; launchers fall back to the jelly's name, or "Stop", when space is short. */
    shortcuts: {
      stop: 'Stop',
      stopNamed: (name: string) => `Stop ${name}`,
      back: (name: string) => `Back to ${name}`,
      resume: (name: string) => `Resume ${name}`,
      start: (name: string) => `Start ${name}`,
    },
  },
  de: {
    running: {
      channel: 'Läuft',
      channelDescription: 'Zeigt das laufende Jelly mit Timer und Knöpfen zum Stoppen oder Zurückwechseln.',
      since: (clock) => `Seit ${clock}`,
      stop: 'Stopp',
      back: (name) => `Zurück zu ${name}`,
    },
    shortcuts: {
      stop: 'Stopp',
      stopNamed: (name) => `${name} stoppen`,
      back: (name) => `Zurück zu ${name}`,
      resume: (name) => `${name} fortsetzen`,
      start: (name) => `${name} starten`,
    },
  },
});
