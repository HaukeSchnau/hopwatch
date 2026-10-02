# German

Stint is in English and German (src/i18n). The German should read like it was written in
German for this app, not translated: short, warm, a little playful, never cute for its own
sake. These rules keep the three people (or agents) writing it consistent.

## Tone

- Du, never Sie. Lowercase "du" and "dein" in running text.
- Short. German runs about 30% longer than English, and Stint's labels sit in pills, tabs
  and menus. Prefer the shorter word when it means the same ("Ziel" over "Zielsetzung").
- Plain words over anglicisms, except where Germans really say the English word in this
  context ("Meeting", "Deep Work" as a jelly name, "Live Activity", "Apple Intelligence").
- No em dashes, same as English. German quotation marks („…“) where quotes are needed.
- Numbers: decimal comma (1,5 Std.), 24-hour times without "Uhr" in tight spots (14:30),
  durations as on screen (1:30). Dates through Intl with `locale` from src/i18n.

## Glossary

| English | German | Notes |
|---|---|---|
| jelly, jellies | Jelly, Jellys | das Jelly. Stint's word for a context; keep it as a name. |
| Now / Day / Week / Stuff (tabs) | Jetzt / Tag / Woche / Kram | |
| entry, entries | Eintrag, Einträge | |
| switch to X | zu X wechseln | Toast: „Zu Hund gewechselt“ |
| Back to X | Zurück zu X | |
| Resume X | X fortsetzen | |
| start / stop (verbs) | starten / stoppen | Button: „Stopp“ |
| running | läuft | |
| since 09:12 | seit 09:12 | |
| untracked | nicht erfasst | |
| fill the gap | Lücke füllen | |
| backdate | zurückdatieren | Prefer showing the time: „Seit 14:50“ |
| weekly target | Wochenziel | |
| nudge, nudge after | Erinnerung, erinnern nach | |
| pin, pinned | anpinnen, angepinnt | Unpin: „lösen“ |
| archive, archived | archivieren, archiviert | |
| group, inside X, top level | Gruppe, in X, oberste Ebene | |
| look, mood | Look, Laune | |
| suggested ✨ | vorgeschlagen ✨ | |
| Undo | Rückgängig | |
| Settings | Einstellungen | |
| export / restore | exportieren / wiederherstellen | |
| erase all data | alle Daten löschen | |
| Today / Yesterday | Heute / Gestern | |
| min, h | Min., Std. | |
| tracked | erfasst | |
| added (an entry) | eingetragen | Toast: „Fokus eingetragen“ |
| almost / just over (summary) | knapp / gut | „knapp 38 Stunden“; in a week sentence „Ziel von 40 Stunden“ reads better than „Wochenziel“ |
| bean, bead, block | Bohne, Perle, Block (Blöcke) | Day and Week visuals |
| target jars, totals, bubbles | Zielgläser, Summen, Blasen | Week tab |
| At a time… | Uhrzeit wählen… | Menus |
| greetings | Nachteule / Morgen! / Hallo! / Abend! / Noch wach? | Now header |
| dial | Rad | |
| unarchive | zurückholen | |
| pin to Now / unpin | Auf Jetzt anpinnen / Von Jetzt lösen | |
| start at 14:50 / stop at 14:50 (buttons) | Ab 14:50 starten / Um 14:50 stoppen | „Seit“ reads oddly on a button |
| N a week | N pro Woche | |
| Shortcuts, Action Button, start link | Kurzbefehle, Aktionstaste, Start-Link | |
| sample data | Beispieldaten | |
| Suggest / Surprise me / Automatic | Vorschlag / Überrasch mich / Automatisch | |
| look parts | Körper, Augen, Mund, Kopf, Hals, Muster, Laune | „Muster“ for coat |
| squishy sounds | Glibbertöne | |

In `localized({ en, de })`, give optional parameters as `flag?: boolean`, not with a default
value: a default in the `en` function makes the `de` side lose its parameter types.
