// Strings for the Settings sheet: sounds, Apple Intelligence, Shortcuts links and data.

import type { Availability } from '@modules/on-device-model';

import type { Hue } from '@/core/model';
import type { Motion } from '@/jelly/character/traits';

import { localized } from '.';
import { characterText } from './character';

const jelliesEn = (count: number) => `${count} ${count === 1 ? 'jelly' : 'jellies'}`;
const entriesEn = (count: number) => `${count} ${count === 1 ? 'entry' : 'entries'}`;
const jelliesDe = (count: number) => `${count} ${count === 1 ? 'Jelly' : 'Jellys'}`;
const entriesDe = (count: number) => `${count} ${count === 1 ? 'Eintrag' : 'Einträge'}`;

/** What the test suggestion came back with; `seconds` arrives formatted. */
interface Tried {
  name: string;
  emoji: string | null;
  hue: Hue | null;
  topic: string | null;
  motion: Motion | undefined;
  seconds: string;
}

export const settingsText = localized({
  en: {
    title: 'Settings',
    done: 'Done',
    cancel: 'Cancel',
    jelly: 'Jelly',
    sounds: 'Squishy sounds',
    intelligence: {
      footer:
        'While you name a new jelly, it suggests an emoji, a look and a mood, and a color for jellies at the top level. Existing jellies get dressed up in the background. It also writes the summary on the Week tab and reads what you type when picking a jelly, like "2h deep work this morning". Everything works without it.',
      status: {
        available: 'Ready',
        appleIntelligenceNotEnabled: 'Off. Turn on Apple Intelligence in the Settings app.',
        modelNotReady: 'The model is still downloading. Try again later.',
        deviceNotEligible: 'Not supported on this iPhone.',
        unsupported: 'Needs iOS 26 or later.',
      } satisfies Record<Availability, string>,
      checking: 'Checking…',
      asking: 'Asking…',
      try: 'Try a Suggestion',
      /** The name the test suggestion is for. */
      sample: 'Espresso run',
      worked: 'It works',
      got: ({ name, emoji, hue, topic, motion, seconds }: Tried) =>
        `"${name}" got ${emoji ?? 'no emoji'}, ${hue ?? 'no color'}, ${topic ? `the ${topic} look` : 'the look its name points at'}${motion ? ` and a ${motion} mood` : ''}, in ${seconds} s.`,
      none: 'No suggestion',
      noAnswer: 'The model gave no answer.',
    },
    shortcuts: {
      title: 'Shortcuts',
      footer: 'Open these from the Shortcuts app, the Action Button or an automation. Each jelly has its own start link in its editor.',
      copyStop: 'Copy Stop Link',
      copiedStop: 'Copied Stop Link',
      copyResume: 'Copy Resume Link',
      copiedResume: 'Copied Resume Link',
    },
    data: {
      title: 'Data',
      footer: (jellies: number, entries: number) => `${jelliesEn(jellies)} and ${entriesEn(entries)}, stored on this iPhone.`,
      export: 'Export JSON',
      exportFailed: 'Export failed',
      restore: 'Restore from Export',
      cantRestore: "Can't restore this file",
      restoreTitle: 'Restore this backup?',
      /** `day` is when it was exported, when the file says. */
      restoreMessage: (day: string | null, jellies: number, entries: number, replacing: boolean) =>
        `The export${day ? ` from ${day}` : ''} has ${jelliesEn(jellies)} and ${entriesEn(entries)}.${replacing ? ' Everything on this iPhone now gets replaced.' : ''}`,
      restoreConfirm: 'Restore',
      erase: 'Erase All Data',
      eraseTitle: 'Erase all data?',
      eraseMessage: 'Every jelly and every entry goes. Export first if you want a backup.',
      eraseConfirm: 'Erase',
    },
    idea: "Every context is a gummy with a face. The one you're on wakes up in the dial; the rest nap in their slots until you tap them.",
  },
  de: {
    title: 'Einstellungen',
    done: 'Fertig',
    cancel: 'Abbrechen',
    jelly: 'Jelly',
    sounds: 'Glibbertöne',
    intelligence: {
      footer:
        'Während du ein neues Jelly benennst, schlägt es ein Emoji, einen Look und eine Laune vor, auf oberster Ebene auch eine Farbe. Bestehende Jellys kleidet es nebenbei ein. Es schreibt auch die Zusammenfassung im Tab Woche und versteht, was du beim Wählen eines Jellys tippst, etwa „2 Stunden Deep Work heute Morgen“. Alles geht auch ohne.',
      status: {
        available: 'Bereit',
        appleIntelligenceNotEnabled: 'Aus. Schalte Apple Intelligence in der Einstellungen-App ein.',
        modelNotReady: 'Das Modell lädt noch. Versuch es später noch mal.',
        deviceNotEligible: 'Auf diesem iPhone nicht verfügbar.',
        unsupported: 'Braucht iOS 26 oder neuer.',
      },
      checking: 'Wird geprüft…',
      asking: 'Fragt…',
      try: 'Vorschlag testen',
      sample: 'Espresso holen',
      worked: 'Klappt',
      // The topic is the look's internal name, quoted as such.
      got: ({ name, emoji, hue, topic, motion, seconds }) =>
        `„${name}“ bekam ${emoji ?? 'kein Emoji'}, ${hue ? characterText.hues[hue] : 'keine Farbe'}, ${topic ? `den Look „${topic}“` : 'den Look, der zum Namen passt'}${motion ? ` und die Laune ${characterText.options.motion[motion]}` : ''}, in ${seconds} s.`,
      none: 'Kein Vorschlag',
      noAnswer: 'Das Modell hat nicht geantwortet.',
    },
    shortcuts: {
      title: 'Kurzbefehle',
      footer: 'Öffne sie aus der Kurzbefehle-App, mit der Aktionstaste oder per Automation. Jedes Jelly hat in seinem Editor einen eigenen Start-Link.',
      copyStop: 'Stopp-Link kopieren',
      copiedStop: 'Stopp-Link kopiert',
      copyResume: 'Fortsetzen-Link kopieren',
      copiedResume: 'Fortsetzen-Link kopiert',
    },
    data: {
      title: 'Daten',
      footer: (jellies, entries) => `${jelliesDe(jellies)} und ${entriesDe(entries)}, gespeichert auf diesem iPhone.`,
      export: 'JSON exportieren',
      exportFailed: 'Export fehlgeschlagen',
      restore: 'Aus Export wiederherstellen',
      cantRestore: 'Diese Datei lässt sich nicht wiederherstellen',
      restoreTitle: 'Dieses Backup wiederherstellen?',
      restoreMessage: (day, jellies, entries, replacing) =>
        `Der Export hat ${jelliesDe(jellies)} und ${entriesDe(entries)}${day ? `, Stand ${day}` : ''}.${replacing ? ' Alles auf diesem iPhone wird dabei ersetzt.' : ''}`,
      restoreConfirm: 'Wiederherstellen',
      erase: 'Alle Daten löschen',
      eraseTitle: 'Alle Daten löschen?',
      eraseMessage: 'Alle Jellys und Einträge verschwinden. Exportiere vorher, wenn du ein Backup willst.',
      eraseConfirm: 'Löschen',
    },
    idea: 'Alles, wohin deine Zeit geht, ist ein Fruchtgummi mit Gesicht. Woran du gerade bist, wacht im Rad auf. Die anderen dösen in ihren Fächern, bis du sie antippst.',
  },
});
