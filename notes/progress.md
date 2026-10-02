# Stint: working notes

Durable context for this build. Newest state first; prune what's superseded.

## Goal

Stint v1: Jelly as the only design, production ready, installed through TestFlight on
Hauke's iPhone 16 Pro. Before v1 this repo held "Stint Five", five design directions in
one app (`dev.schnau.stint.five`); Hauke picked Jelly 2. The old app stays installed on
his phone until he moves his data over (export there, restore here).

## Decisions

- Identity: "Stint", bundle `dev.schnau.stint`, scheme `stint://`, version 1.0.0.
  `app.config.ts` stamps `STINT_BUILD_NUMBER` into release builds.
- Install: TestFlight, internal testing. `scripts/m1.sh testflight` archives and uploads
  with the ASC API key. `scripts/publish-ipa.sh` (development-signed IPA over the Tailnet
  share) stays as the fallback.
- v1 scope (Hauke, 2026-10-01): bring back from Jelly 1 "Day opens at now", bigger
  emoji, the target/nudge quick chips and backdate consequence warnings. Extras: a Live
  Activity for the running entry and restore from a JSON export.
- Also v1: per-screen error fallbacks, DB migration steps, no Lab, no sample data outside
  onboarding, lint + typecheck + tests green.
- Apple Intelligence (modules/on-device-model) is a progressive enhancement. It works on
  Hauke's phone since the model finished downloading; Foundation Models has no download
  progress API, only availability.

## Infrastructure

- `ssh m1` = M1 builder (Xcode 27). `scripts/m1.sh` syncs to `m1:~/Developer/stint-v1`.
  Don't touch `~/Developer/stint` or `~/Developer/stint-lab` (other threads);
  `~/Developer/stint-five` is the old Stint Five checkout; `~/Developer/stint-ota` is
  `scripts/m1.sh ota`'s own checkout.
- Signing: team 2243J9RD68, automatic signing with the ASC API key at
  /run/secrets/app-store-connect/api-key on m1. The keychain is only unlocked in Hauke's
  GUI session (`builder-control run --gui`). Use the system `pod` on m1.
- Metro: agent-service `metro-all` on port 3100,
  https://px-b8ee4debfe-metro-all.schnau.dev. The old per-direction Metros are stopped.
- Simulators (iPhone 18 Pro, iOS 27): Jelly 9CD905EA-FFD6-4B75-B2C4-FBABF7327CFE is the
  main one. Spare: 5230DDD4-EDF3-4C8A-BF26-9F9BE311FE6C, 594D2BB8-93ED-4F85-BCB5-69A328873AD8,
  66FBBE5F-8716-495C-8FEC-CD3EE097B963, 2EB1D0E2-3250-46F5-B059-F0FFE9772DEA.
  Delete them when the project wraps up.

## Gotchas found

- iOS 27 traps at launch without the UIScene life cycle; `plugins/with-scene-lifecycle.js`.
- `simctl openurl` with a custom scheme stops at "Open in …?". `scripts/sim.sh` launches
  with `--initialUrl <metro>` and the dev-only `-stintRoute /path` argument.
- The M1 is shared with other threads, so the T3 device hub times out; agent-device runs
  on m1 via `scripts/sim.sh ad`.

## State

- Consolidated (2026-10-01): Jelly lives in `src/jelly`, routes at the root of
  `src/app`, the other directions, Lab, per-direction Metro config, fonts and unused
  packages are gone. Docs: docs/architecture.md, docs/design/.
- Done and checked on simulator 594D2BB8 (2026-10-01): restore from export (Settings ›
  Data; `src/core/backup.ts` parses export format 1 and 2, tests in backup.test.ts),
  export format 2 with prefs (jelly looks), `ErrorScreen` exported as `ErrorBoundary` from
  every route, numbered migrations in db.ts, `expo install --fix` + expo-asset
  (expo-doctor 21/21; expo-widgets had pulled a duplicate @expo/ui).
- App Store Connect: `scripts/m1.sh asc METHOD PATH [JSON]` calls the API with the team
  key (team 2243J9RD68 is Urbs UG). Bundle ID dev.schnau.stint (M75FD6ZZAM). App record
  "Stint Schnau" (id 6818258577, SKU stint; "Stint" and "Stint Time Tracker" were taken)
  created on the website, since the API can't create apps. Internal TestFlight group
  "Hauke" (64e13ad7-a65e-468c-bbe3-59af1934c7c5, all builds) with
  hauke@schnau-lilienthal.de, same as T3 Code.
- Web sign-in, if needed again: `agent-browser-personal` (shared profile, now trusted
  for info@urbs.one, leave it signed in), credentials from `bw-personal` item
  95ac0ffc-4d39-4722-87c0-b881b82d7387 typed via command substitution. The sign-in form
  is a cross-origin iframe: click by coordinates and use `keyboard type`. SMS codes for
  the number ending 08 land in m1's `~/Library/Messages/chat.db`.
- Committed (2026-10-01): Jelly 1 qualities (Day at now, bigger emoji stickers, target and
  nudge chips, consequence subtitles in menus via src/jelly/Menu.tsx) and the Live
  Activity (src/widgets/, expo-widgets; pills are links to stint://stop and
  stint://resume, background buttons would need our own App Intents). Final light/dark
  pass on simulator 594D2BB8 looked right.
- Live Activity needs widget App ID dev.schnau.stint.widgets (8MCD639JBT) and App Group
  group.dev.schnau.stint on both App IDs. Registered by hand in the developer portal:
  without it the Release archive failed with a misleading "Authentication failed: Make
  sure a bearer token was provided…" plus "No profiles for …". The API can't register
  App Groups. Simulator builds are signed to run locally for the same App Group.
- App icon (2026-10-01): the Settings mascot in the Now dial, generated by
  scripts/icon.py into assets/stint.icon plus the splash image; previews and dropped
  directions at https://files.schnau.dev/isolated/b8ee4debfea9131bf7c6/stint/icon/.
  TestFlight builds: 202610011946 (first), 202610012043 (new icon).
- Unconfirmed on device: cold launch from a Live Activity link in Release, the compact
  island timer past one hour.

- Apple Intelligence beyond the emoji (2026-10-02, all four of Hauke's picks):
  - Characters: one request per jelly asks topic + mood (+ emoji and color while naming a
    new top-level jelly). The topic dresses the whole look (topics.ts `dress`), picks are
    keyed to name and emoji (`{ v: 2, … }`), failures aren't stored. Eyes and mouth picks
    were tested and dropped (30/46 "sparkly"). Eval: ~42/46 topics, ~42/46 moods.
  - Week summary: `src/core/week-facts.ts` builds at most 3 facts, the model phrases them,
    `checkSummary` rejects numbers/weekdays not in the facts; cached per week in prefs
    `jelly.summary.<date>`. Text is accurate but plain; tune by OTA.
  - Typed logging: pick sheet search ("Find a jelly or type what you did"), model fills 7
    strings, `src/core/sentence.ts` resolves and validates, a confirmation card shows
    consequences, `timeline.place` applies. Eval 33/33 (`scripts/sentence-eval.ts`), 9 of
    them thanks to code overrides.
  - Latency on the loaded M1: ~2.5–4 s per request; unmeasured on the phone.
- M1 gotcha: Apple Intelligence needs Siri's language to match the system language. Siri
  drifted to de-DE through iCloud sync and the model went `modelNotReady` for hours (the
  simulator then fails with "Simulator is not supported"). Infra set it back to en-US and
  turned off Siri iCloud sync on m1; don't change those settings.
- OTA: EAS project @haukeschnau/stint, channel production, runtime = app version. First
  OTA-capable build is the next TestFlight upload; `scripts/m1.sh ota "message"` after that
    (published from the M1: hermesc has no Linux arm64 build, srv-2 is aarch64).

## Next

1. Commit the builders' work, final QA (light/dark), `scripts/m1.sh testflight`.
2. Tell Hauke how to move data: Stint Five › Settings › Export JSON, save to Files,
   then Stint › Settings › Restore from Export.
