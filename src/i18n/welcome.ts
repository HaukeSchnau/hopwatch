// Strings for the first launch: making the first jelly, the emoji well and sample data.

import { localized } from '.';

export const welcomeText = localized({
  en: {
    hello: 'Hi there!',
    intro: "Let's make your first jelly. One for each thing your time goes to: the job, a client, the dog. Tap one to start tracking it.",
    namePlaceholder: 'Name it, e.g. Job',
    emoji: 'Emoji',
    color: 'Color',
    colorSuggested: '✨ suggested for the name',
    make: 'Make it!',
    sample: 'or load sample data',
    sampleTitle: 'Load sample data?',
    sampleMessage: 'Three weeks of made-up days with 18 jellies, to try out the timeline and reports.',
    cancel: 'Cancel',
    load: 'Load',
    /** The emoji well's accessibility label. */
    typeEmoji: 'Type an emoji',
    suggestedEmoji: 'Suggested emoji. Type another',
  },
  de: {
    hello: 'Hallo!',
    intro: 'Lass uns dein erstes Jelly machen. Eins für alles, wohin deine Zeit geht: der Job, ein Kunde, der Hund. Tipp es an, und seine Zeit läuft.',
    namePlaceholder: 'Nenn es, z. B. Job',
    emoji: 'Emoji',
    color: 'Farbe',
    colorSuggested: '✨ zum Namen vorgeschlagen',
    make: 'Jelly machen!',
    sample: 'oder Beispieldaten laden',
    sampleTitle: 'Beispieldaten laden?',
    sampleMessage: 'Drei Wochen ausgedachter Tage mit 18 Jellys, zum Ausprobieren von Zeitleiste und Berichten.',
    cancel: 'Abbrechen',
    load: 'Laden',
    typeEmoji: 'Emoji eintippen',
    suggestedEmoji: 'Vorgeschlagenes Emoji. Tipp ein anderes ein',
  },
});
