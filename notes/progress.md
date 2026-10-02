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
  OTA-capable build: TestFlight 202610020056 (also has the AI round). First update
  published 2026-10-02 (same code, 01a0fa2f…), served for runtime 1.0.0; not yet seen
  applying on the phone; `scripts/m1.sh ota "message"` after that
    (published from the M1: hermesc has no Linux arm64 build, srv-2 is aarch64).

- German (2026-10-02): src/i18n (`localized({ en, de })`, language from AppleLanguages via
  RN Settings, no native module), docs/german.md (tone + glossary), CFBundleLocalizations
  en/de in app.json, version 1.1.0 (TestFlight 202610020536). Test in German with `SIM_LANG=de scripts/sim.sh …`.
  Unchecked on screen: the German Live Activity (needs a dev client with
  NSSupportsLiveActivities, i.e. a new `scripts/m1.sh sim`), a German nudge.

- Public release (2026-10-02, in progress). Decisions: name **Hopwatch** (home screen and
  in-app; store "Hopwatch: Time Tracker" / de "Hopwatch: Zeiterfassung", both claimed on
  the ASC record; plain "Stint", "Hopwatch" and "Jellytime" are taken). Internal IDs stay
  (dev.schnau.stint, stint://, Expo slug). Android package dev.schnau.hopwatch. iOS 26 min.
  Publisher Urbs UG on both stores.
  - ASC: free-apps agreement active; EU DSA trader declaration already active since
    2025-06-05. Name checks: a PATCH of appInfoLocalizations.name answers 409 when taken;
    only trust a response that echoes the name (network errors looked like success once).
  - Play: HaukeSchnau@gmail.com's own developer account (7788062506280838249) was closed
    by Google in April 2026 for inactivity. The Urbs account (6128263103673779539) is
    active (apps one.urbs.urbs, dev.schnau.studienbuch, .merkbeet, .schnipsel); its API
    service account is in Bitwarden (bcfce376-…, attachment). Creating the app and the
    content declarations need the web UI: use `play-console-browser` (host Chromium signed
    in as info@urbs.one, residential route; CSS selectors; shared state: never sign out or
    switch accounts; on a Google security challenge stop and ask infra). Urbs is an
    organization account, so no 12-testers rule.
  - Store copy lives in store/ (fastlane layout).
  - Website: site/ (static, EN/DE), served at https://hopwatch.schnau.dev from Gitea
    `schnau/hopwatch` main (remote `origin`, pushed 2026-10-02; infra deploys on push via
    project.nix/flake.nix/CI). Preview: agent-service hopwatch-site. Impressum data from
    App Store trader info + North Data (HRB 185737); Hauke to confirm, VAT ID unknown.
    Store buttons/screenshots on the site are placeholders.
  - History cleanup for the push: abandoned three empty undescribed commits (no content).
  - Android i18n gap: src/i18n/device.ts only reads iOS AppleLanguages.
  - ASC privacy URLs set (en /privacy/, de /de/datenschutz/).
  - M1 network (2026-10-02): on Hauke's Android phone hotspot (metered). IPv4 dropped
    upstream for ~1 h while IPv6 worked; check `ping 10.97.241.181` vs
    `nc -4 -vz -G 4 1.1.1.1 80`, and if only IPv4 fails ask Hauke to reset the hotspot.
    The ASC key stays on m1 only (moving ASC work to srv-2 is Hauke's call).
  - Wave 1 builders: Android groundwork (app.json android, builds in m1:~/Developer/
    stint-android, emulator, scripts/emu.sh), iOS release pass (rename, dev paths, stranger
    pass, iPad), website. Next: Android UI port, screenshots, metadata push, Play setup.

- Internal IDs renamed to hopwatch (2026-10-02, Hauke's call): iOS bundle
  dev.schnau.hopwatch (+ .widgets, App Group group.dev.schnau.hopwatch, all registered and
  wired in the portal), new ASC app **6818526671** (SKU hopwatch; names en/de, privacy
  URLs, internal TestFlight group "Hauke" with hauke@schnau-lilienthal.de). The old record
  6818258577 (dev.schnau.stint) is renamed "Stint Schnau"; Hauke's installed TestFlight
  "Stint" keeps working until he moves his data (Export → Restore; parser accepts
  app 'stint' and 'hopwatch'). Expo project @haukeschnau/hopwatch
  (7e0183d8-3743-41ea-a29a-7188f5dd5cf5, channel production); the old @haukeschnau/stint
  project stays for the old build. Scheme hopwatch://, DB hopwatch.db, useHopwatch,
  -hopwatchRoute, HOPWATCH_BUILD_NUMBER, m1 dirs ~/Developer/hopwatch-{ios,android,ota}.
  Simulators need a new dev client (bundle changed); sim.sh takes SIM_BUNDLE for old ones.

- Release work in flight (2026-10-02): App Store assets builder (screenshots in
  store/screenshots, scripts/app-store.mjs, ASC metadata on app 6818526671), website polish
  (livelier jellies, better hop, footer "Eine Hauke Schnau Produktion" / "A Hauke Schnau
  Production"), Android port in two parts (forms/sheets/menus; shell/screens/platform),
  Google Play setup (app record, declarations, store/play listing, feature graphic,
  internal track). Next after the port: Android ongoing notification + app shortcuts
  (native), Play screenshots, final iOS 1.1.0 build to TestFlight and attach, OTA for
  Android (`m1.sh ota` is iOS-only so far), then ask Hauke before submitting either store.
- Done since: t3.json (T3 Code icon), Apple Watch Live Activity layout (bannerSmall, OTA-able,
  unseen on a real watch), Android groundwork committed (see docs/architecture.md).
- Store screenshots exceed jj's 1 MiB snapshot limit; decide at commit (ignore raw/,
  compress finals or raise snapshot.max-new-file-size for the repo).

- App Store listing done on 6818526671 (store/app-store + scripts/app-store.mjs; 12 framed
  screenshots). App Privacy published (Hauke left it to me): Identifiers › Device ID and
  Diagnostics › Crash Data, App Functionality + Analytics, not linked, no tracking; same
  as Play's data safety and the privacy policy (Expo's EAS-Client-ID and update error).
  "Not linked" because the ID is random and tied to no account or person.
- Google Play draft app 4975816330263293130 (Urbs), package dev.schnau.hopwatch: all App
  content declarations (18+, IARC Everyone/USK 0, data safety: device IDs + crash logs via
  Expo, nothing shared), listing en/de with icon and feature graphic (console only: an API
  commit would send everything for review), internal testing list "Hauke" with
  haukeschnau@gmail.com. Missing: a working AAB (first upload in the console sets up Play
  App Signing with the Bitwarden upload key), phone + 7"/10" tablet screenshots,
  production countries, the Play button on the website.
- Fixed: generate() 20 s timeout; week summary "behind pace" instead of hours to go;
  AD_ID permission blocked. In-app privacy/help links requested from the forms porter.

- Android port committed (2026-10-02): forms/sheets/menus (Menu.android.tsx, forms.android.tsx,
  material.tsx, menuSymbols.ts, .android screens; shared logic in settings/parts.tsx,
  sheets/entry.tsx, sheets/time.tsx, stuff/editor.tsx) and shell/screens (Material tabs,
  mini player card, headers/insets, Icon in ui.tsx, Nunito via rounded(weight), Android
  locale, notification permission + "Nudges" channel). In flight: native features
  (ongoing notification with timer + Stop/Back, app shortcuts, alert accent, locale
  config, embedded Nunito; one rebuild) and JS polish (font/icon leftovers, pause idle
  animations off-screen, dev warning).
- After that: Android release AAB → Play internal testing (first upload in the console),
  Play phone + tablet screenshots, final iOS 1.1.0 build → TestFlight → attach to the
  App Store version, App Privacy decision (asked Hauke), `m1.sh ota` for Android, then ask
  Hauke before submitting either store.

- First Hopwatch TestFlight build 202610022013 (2026-10-02): signing with the new bundle,
  widget extension and App Group works; internal testers have it. It was INTERNAL_ONLY
  (export option testFlightInternalTestingOnly), which App Store versions can't take;
  removed the option, rebuilding for the 1.1.0 App Store version.

## Final cleanup (after both stores are done; Hauke asked, 2026-10-02)

Rename everything that still says stint, once no agents are working:
- the workspace folder /home/haukeschnau/stint and the T3 project ("Stint") → hopwatch,
  plus anything in ~/infra that refers to the old path or name;
- simulators named "Stint Five …" (and the spare ones) → rename or delete; the old dev
  clients with bundle dev.schnau.stint;
- old M1 folders ~/Developer/stint-five (ours; stint, stint-lab* belong to other threads);
- the old App Store Connect record 6818258577 ("Stint Schnau", dev.schnau.stint, its
  bundle IDs and App Group) and the old Expo project @haukeschnau/stint, once Hauke has
  moved his data to Hopwatch;
- the file share folders /srv/agent-share/stint-five and /srv/agent-share/stint;
- remaining "Stint" mentions in docs and notes (history like "Stint Five" can stay).

## Next

1. Commit the builders' work, final QA (light/dark), `scripts/m1.sh testflight`.
2. Tell Hauke how to move data: Stint Five › Settings › Export JSON, save to Files,
   then Stint › Settings › Restore from Export.
