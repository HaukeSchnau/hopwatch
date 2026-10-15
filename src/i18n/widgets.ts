// Strings for the Live Activity (src/widgets). Its layout runs in the widget extension's
// own runtime, so live-activity.ts resolves them here and passes them in as props.

import { localized } from '.';

export const widgetText = localized({
  en: {
    stop: 'Stop',
    back: (name: string) => `Back to ${name}`,
    resume: (name: string) => `Resume ${name}`,
    stopName: (name: string) => `Stop ${name}`,
    nothing: 'Nothing running',
  },
  de: {
    stop: 'Stopp',
    back: (name) => `Zurück zu ${name}`,
    resume: (name) => `${name} fortsetzen`,
    stopName: (name) => `${name} stoppen`,
    nothing: 'Nichts läuft',
  },
});
