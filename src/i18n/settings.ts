// Strings for the Settings sheet: sounds, Apple Intelligence, Shortcuts links and data.

import type { Availability } from '@modules/on-device-model';

import { localized } from '.';

const jelliesEn = (count: number) => `${count} ${count === 1 ? 'jelly' : 'jellies'}`;
const entriesEn = (count: number) => `${count} ${count === 1 ? 'entry' : 'entries'}`;
const jelliesDe = (count: number) => `${count} ${count === 1 ? 'Jelly' : 'Jellys'}`;
const entriesDe = (count: number) => `${count} ${count === 1 ? 'Eintrag' : 'Einträge'}`;

export const settingsText = localized({
  en: {
    title: 'Settings',
    done: 'Done',
    cancel: 'Cancel',
    sound: 'Sound',
    sounds: 'Squishy sounds',
    intelligence: {
      footer:
        'While you name a new jelly, it suggests an emoji, a look and a mood, and a color for jellies at the top level. Existing jellies get dressed up in the background. It also writes the summary on the Week tab and reads what you type when picking a jelly, like "2h deep work this morning". Everything works without it.',
      status: {
        available: 'Ready',
        appleIntelligenceNotEnabled: 'Off. Turn on Apple Intelligence in the Settings app.',
        modelNotReady: 'The model is still downloading. Try again later.',
        deviceNotEligible: 'Not supported on this iPhone.',
        unsupported: 'Not available right now.',
      } satisfies Record<Availability, string>,
      checking: 'Checking…',
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
      footer: (jellies: number, entries: number) =>
        `${jelliesEn(jellies)} and ${entriesEn(entries)}, stored on this iPhone. An export is a file you can restore here or on your next iPhone.`,
      export: 'Export Data',
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
    idea: "Everything your time goes to is a gummy with a face. The one you're on wakes up in the dial. The others nap in their slots until you tap them.",
  },
  de: {
    title: 'Einstellungen',
    done: 'Fertig',
    cancel: 'Abbrechen',
    sound: 'Ton',
    sounds: 'Glibbertöne',
    intelligence: {
      footer:
        'Während du ein neues Jelly benennst, schlägt es ein Emoji, einen Look und eine Laune vor, auf oberster Ebene auch eine Farbe. Bestehende Jellys kleidet es nebenbei ein. Es schreibt auch die Zusammenfassung im Tab Woche und versteht, was du beim Wählen eines Jellys tippst, etwa „2 Stunden Deep Work heute Morgen“. Alles geht auch ohne.',
      status: {
        available: 'Bereit',
        appleIntelligenceNotEnabled: 'Aus. Schalte Apple Intelligence in der Einstellungen-App ein.',
        modelNotReady: 'Das Modell lädt noch. Versuch es später noch mal.',
        deviceNotEligible: 'Auf diesem iPhone nicht verfügbar.',
        unsupported: 'Gerade nicht verfügbar.',
      },
      checking: 'Wird geprüft…',
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
      footer: (jellies, entries) =>
        `${jelliesDe(jellies)} und ${entriesDe(entries)}, gespeichert auf diesem iPhone. Einen Export kannst du hier oder auf deinem nächsten iPhone wiederherstellen.`,
      export: 'Daten exportieren',
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
