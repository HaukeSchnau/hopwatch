# Hopwatch: working notes

Durable context for this project. Current state first; prune what's superseded. The
architecture is in docs/architecture.md, store details in store/README.md.

## State (2026-10-05)

- Google Play: live since 2026-10-05,
  https://play.google.com/store/apps/details?id=dev.schnau.hopwatch (app
  4975816330263293130 in the Urbs UG account). Release 1.1.0, versionCode 29849538, 178
  countries. Managed publishing off.
- App Store: 1.1.0 (build 202610022047) submitted 2026-10-05 08:25 UTC via the API, still
  "Waiting for Review" on 2026-10-06 11:42 UTC (reviewSubmission
  154e7a56-8631-4c23-8661-41fb5749fcfc, appStoreVersion 7f4890fc-d144-481c-adb6-21b6988dec09,
  releaseType AFTER_APPROVAL, so it goes live on approval). App 6818526671, "Hopwatch: Time Tracker" / "Hopwatch: Zeiterfassung".
  Status mails ("The status of your (iOS) app, Hopwatch: Time Tracker, is now …") arrive
  in `himalaya --account urbs`; `https://itunes.apple.com/lookup?bundleId=dev.schnau.hopwatch&country=de`
  turns non-empty once it's live.
- Website https://hopwatch.schnau.dev (site/, Gitea `schnau/hopwatch` main, deployed by
  Kiln CI on push). Official store badges (Hauke's call, 2026-10-06; artwork in
  site/img/badges, Apple's from toolbox.marketingtools.apple.com/api/badges/…, Google's
  PNGs cropped to the badge) with the trademark credits in the footer. Google Play is live;
  the App Store badge waits in a TODO comment next to "Coming soon to the App Store" in
  site/index.html and site/de/index.html.
- OTA: EAS project @haukeschnau/hopwatch (7e0183d8-3743-41ea-a29a-7188f5dd5cf5), channel
  production, runtime = app version 1.1.0, `scripts/m1.sh ota` publishes for both platforms.

## Decisions

- Name Hopwatch (plain "Stint", "Hopwatch" and "Jellytime" were taken on the App Store);
  internal IDs dev.schnau.hopwatch everywhere, scheme hopwatch://. Publisher Urbs UG.
  iOS 26 minimum, iPhone only (no iPad, Mac or Vision Pro). Free, all territories.
- Privacy, same on both stores and in the privacy policy: device ID and crash data from
  expo-updates (Expo's random EAS-Client-ID, the update error), app functionality and
  analytics, not linked, no tracking. Revisit when the app gains a network call or an SDK.
- Apple Intelligence (modules/on-device-model) is a progressive enhancement: character
  looks, week summary, typed entries. Without the model none of it shows.
- German everywhere (src/i18n, glossary in docs/german.md).
- Both stores publish on approval (Hauke, 2026-10-05).

## Infrastructure

- `ssh m1` = M1 builder (Xcode 27), on Hauke's metered phone hotspot. `scripts/m1.sh`
  works in m1:~/Developer/hopwatch-{ios,android,ota}. Don't touch ~/Developer/stint or
  ~/Developer/stint-lab* (other threads). If only IPv4 fails (`nc -4 -vz -G 4 1.1.1.1 80`),
  ask Hauke to reset the hotspot. When it drops off the Tailnet entirely (as on 2026-10-05,
  09:21 to sometime that night), only Hauke can fix it on site: the O2 hotspot phone first,
  then the Mac itself. Infra's `M1Unreachable` alert fires meanwhile.
- Store CLIs (infra, 2026-10-06): `asc` and `gplay` in the project environment, with the
  Urbs credentials set by the host wrapper (skill `app-stores`). `asc web …` covers what the
  public API can't (creating and removing apps, App Groups, App Privacy) with an Apple web
  session for info@urbs.one; its first sign-in texts a code to the number ending 08, which
  the wrapper reads from the M1's Messages, so don't retry sign-ins in a loop. Signed in
  since 2026-10-06; the session is cached in ~/.asc/web on the srv-2 host and shared by
  every project there (`asc web auth status` checks it).
- Signing: team 2243J9RD68 (Urbs UG), automatic signing with the ASC API key at
  /run/secrets/app-store-connect/api-key on m1 (Hauke agreed on 2026-10-06 that it may live
  on srv-2 too, which is how `asc` gets it). The keychain is only unlocked in Hauke's GUI
  session (`builder-control run --gui`). scripts/app-store.mjs calls the API through
  `asc api`.
- App Store Connect web UI as a fallback: `agent-browser-personal` signed in as
  info@urbs.one (shared profile, leave it signed in), credentials from `bw-personal` item
  95ac0ffc-4d39-4722-87c0-b881b82d7387, SMS codes from m1's `~/Library/Messages/chat.db`.
- Play Console: `play-console-browser` (host Chromium signed in as info@urbs.one; shared
  state, never sign out or switch accounts; on a Google security challenge stop and ask
  infra). Play API service account and the upload key are in Bitwarden (store/README.md).
- Metro: agent-service `metro-all` on port 3100.
- Simulators (iOS 27): "Hopwatch" (iPhone 18 Pro, 9CD905EA-FFD6-4B75-B2C4-FBABF7327CFE) is
  the main one, "Hopwatch Screens" (iPhone 18 Pro Max) took the store screenshots,
  "Hopwatch iPad" checks the iPhone app in iPad compatibility mode. The other "Stint …"
  simulators belong to other threads. Android emulators: hopwatch-pixel, hopwatch-tablet-7,
  hopwatch-tablet-10 (`scripts/emu.sh`).

## Gotchas

- iOS 27 traps at launch without the UIScene life cycle (`plugins/with-scene-lifecycle.js`).
- `simctl openurl` with a custom scheme stops at "Open in …?". `scripts/sim.sh` launches
  with `--initialUrl <metro>` and the dev-only `-hopwatchRoute /path` argument.
- Apple Intelligence on the M1 needs Siri's language to match the system language; infra
  pinned Siri to en-US and turned off Siri iCloud sync there. Don't change those settings.
- A Release archive fails with "Authentication failed … No profiles" when an App Group
  isn't registered on the App IDs; register it in the developer portal (the API can't).
- App Store versions can't take INTERNAL_ONLY builds (export option
  testFlightInternalTestingOnly), so scripts/export-testflight.plist leaves it out.
- hermesc has no Linux arm64 build, so OTA updates publish from the M1.
- jj won't snapshot files over 1 MiB: store/screenshots/raw/ is ignored, finals are
  compressed.
- Don't edit a script in place while it runs (bash reads it lazily); `sed -i` writes a new
  file and is safe.

## Unconfirmed on a real device

The compact Dynamic Island timer past one hour, the Apple Watch Live Activity layout,
week summary latency on the phone.

## Final cleanup (Hauke asked, 2026-10-02)

Done:
- old file share folders; leftover Stint names in scripts and docs (history like "Stint
  Five" and the jelly named Stint in test data stay);
- the four spare "Stint Five" simulators, the old dev clients on the main one (renamed
  "Hopwatch"), m1:~/Developer/stint-five;
- 2026-10-06, after Hauke moved his data: App Store Connect app 6818258577 "Stint Schnau"
  removed (web UI, App Information › Remove App), bundle IDs dev.schnau.stint.widgets and
  dev.schnau.stint.five deleted, App Group group.dev.schnau.stint removed; Expo project
  @haukeschnau/stint deleted. dev.schnau.stint itself can't be deleted ("in use by the App
  Store", Apple keeps an app's bundle ID reserved).

Left: the workspace folder /home/haukeschnau/stint and the T3 project ("Stint") →
hopwatch, plus anything in ~/infra that refers to the old path or name; do it from outside
this workspace, since the running agent lives in it.

## Expo notes

- Robot tokens (EXPO_TOKEN) can't delete projects. A user session can: POST
  https://api.expo.dev/v2/auth/loginAsync, then v2/auth/upgradeSudo with the password
  (sudo mode), then the `app.scheduleAppDeletion` mutation; log the session out after.
