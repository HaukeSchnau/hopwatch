// Strings for the first launch: making the first jelly, the emoji well, sample data, restoring
// an export and why Hopwatch asks to send notifications.

import { localized } from '.';

export const welcomeText = localized({
  en: {
    hello: 'Hi there!',
    intro:
      "Hopwatch tracks where your time goes. The job, a client, the dog: each gets a jelly. Tap one and its clock starts. Let's make your first.",
    namePlaceholder: 'Name it, e.g. Job',
    emoji: 'Emoji',
    color: 'Color',
    colorSuggested: '✨ suggested for the name',
    make: 'Make it!',
    sample: 'or load sample data',
    sampleTitle: 'Load sample data?',
    sampleMessage: 'Three weeks of made-up days with 18 jellies, to try out the timeline and reports. Erase it any time in Settings.',
    cancel: 'Cancel',
    load: 'Load',
    restore: 'or restore from an export',
    /** Shown once, right before iOS asks to allow notifications. */
    nudge: {
      title: 'One more thing',
      message: (hours: number) =>
        `When a jelly has been running for ${hours} hours, Hopwatch can nudge you in case you forgot to stop it. That's the only notification it sends. iOS asks you next.`,
      ok: 'Continue',
    },
    /** The emoji well's accessibility label. */
    typeEmoji: 'Type an emoji',
    suggestedEmoji: 'Suggested emoji. Type another',
  },
  de: {
    hello: 'Hallo!',
    intro:
      'Hopwatch erfasst, wohin deine Zeit geht. Ob Job, Kunde oder Hund: Alles bekommt ein Jelly. Tipp eins an, und seine Uhr läuft. Lass uns dein erstes machen.',
    namePlaceholder: 'Nenn es, z. B. Job',
    emoji: 'Emoji',
    color: 'Farbe',
    colorSuggested: '✨ zum Namen vorgeschlagen',
    make: 'Jelly machen!',
    sample: 'oder Beispieldaten laden',
    sampleTitle: 'Beispieldaten laden?',
    sampleMessage: 'Drei Wochen ausgedachter Tage mit 18 Jellys, zum Ausprobieren von Zeitleiste und Berichten. In den Einstellungen löschst du sie jederzeit.',
    cancel: 'Abbrechen',
    load: 'Laden',
    restore: 'oder aus einem Export wiederherstellen',
    nudge: {
      title: 'Noch eine Sache',
      message: (hours) =>
        `Läuft ein Jelly schon ${hours} Stunden, kann Hopwatch dich erinnern, falls du das Stoppen vergessen hast. Andere Mitteilungen schickt es nicht. Gleich fragt iOS nach.`,
      ok: 'Weiter',
    },
    typeEmoji: 'Emoji eintippen',
    suggestedEmoji: 'Vorgeschlagenes Emoji. Tipp ein anderes ein',
  },
});
