# Hopwatch: working notes

Durable context for this project. Current state first; prune what's superseded. The
architecture is in docs/architecture.md, store details in store/README.md.

## State (2026-10-05)

- Google Play: live since 2026-10-05,
  https://play.google.com/store/apps/details?id=dev.schnau.hopwatch (app
  4975816330263293130 in the Urbs UG account). Release 1.1.0, versionCode 29849538, 178
  countries. Managed publishing off.
- App Store: 1.1.0 (build 202610022047) submitted 2026-10-05 via the API, "Waiting for
  Review" (reviewSubmission 154e7a56-8631-4c23-8661-41fb5749fcfc, appStoreVersion
  7f4890fc-d144-481c-adb6-21b6988dec09, releaseType AFTER_APPROVAL, so it goes live on
  approval). App 6818526671, "Hopwatch: Time Tracker" / "Hopwatch: Zeiterfassung".
  Status mails ("The status of your (iOS) app, Hopwatch: Time Tracker, is now …") arrive
  in `himalaya --account urbs`; `https://itunes.apple.com/lookup?bundleId=dev.schnau.hopwatch&country=de`
  turns non-empty once it's live.
- Website https://hopwatch.schnau.dev (site/, Gitea `schnau/hopwatch` main, deployed by
  Kiln CI on push). The Play button is live; the App Store button still says "Coming soon"
  (TODO in site/index.html and site/de/index.html: add
  https://apps.apple.com/app/id6818526671, drop class "soon").
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
  ask Hauke to reset the hotspot. The M1 was unreachable over SSH on 2026-10-05; infra was
  asked.
- Signing: team 2243J9RD68 (Urbs UG), automatic signing with the ASC API key at
  /run/secrets/app-store-connect/api-key on m1 (it stays there; moving ASC work to srv-2 is
  Hauke's call). The keychain is only unlocked in Hauke's GUI session
  (`builder-control run --gui`). `scripts/m1.sh asc METHOD PATH [JSON]` calls the API.
- App Store Connect web UI, when the API can't (creating apps, App Groups, App Privacy):
  `agent-browser-personal` signed in as info@urbs.one (shared profile, leave it signed in),
  credentials from `bw-personal` item 95ac0ffc-4d39-4722-87c0-b881b82d7387. SMS codes for
  the number ending 08 land in m1's `~/Library/Messages/chat.db`.
- Play Console: `play-console-browser` (host Chromium signed in as info@urbs.one; shared
  state, never sign out or switch accounts; on a Google security challenge stop and ask
  infra). Play API service account and the upload key are in Bitwarden (store/README.md).
- Metro: agent-service `metro-all` on port 3100.
- Simulators: iPhone 18 Pro, iOS 27; Jelly 9CD905EA-FFD6-4B75-B2C4-FBABF7327CFE is the
  main one, "Hopwatch Screens" (iPhone 18 Pro Max) took the store screenshots. Android
  emulators hopwatch-pixel, hopwatch-tablet-7, hopwatch-tablet-10 (`scripts/emu.sh`).

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

## Final cleanup (Hauke asked, 2026-10-02; once both stores are live)

Done 2026-10-05: the old file share folders, the leftover Stint names in scripts and docs
(history like "Stint Five" and the jelly named Stint in test data stay).

Left:
- the workspace folder /home/haukeschnau/stint and the T3 project ("Stint") → hopwatch,
  plus anything in ~/infra that refers to the old path or name; do it from outside this
  workspace, since the running agent lives in it;
- simulators named "Stint Five …" and the spare ones (5230DDD4…, 594D2BB8…, 66FBBE5F…,
  2EB1D0E2…), and old dev clients with bundle dev.schnau.stint;
- the pre-rename M1 checkouts ~/Developer/stint-five, stint-v1, stint-android and stint-ota
  (ours; stint and stint-lab* belong to other threads);
- once Hauke has moved his data to Hopwatch (TestFlight "Stint" › Settings › Export, then
  Hopwatch › Settings › Restore from Export): the old App Store Connect record 6818258577
  ("Stint Schnau", bundle IDs dev.schnau.stint and .widgets, App Group
  group.dev.schnau.stint) and the old Expo project @haukeschnau/stint.
