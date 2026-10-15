# Architecture

Hopwatch (formerly Stint) is a personal time tracker (spec: [spec.md](spec.md)) with one design, Jelly
([design/](design/)). Expo SDK 57, React Native, expo-router, Skia, `@expo/ui`.

## Layers

- `src/core`: everything that isn't UI. The data model (`model.ts`), the timeline domain
  module (`timeline.ts`, the only code that writes entries; it keeps entries from
  overlapping and allows at most one open entry, see the property tests), the context tree,
  reports, a zustand store over synchronous expo-sqlite (`store.ts`, `db.ts`), read hooks
  (`hooks.ts`), nudge notifications, deep links, JSON export and import, and device-local
  preferences (`actions.setPref` / `usePref`). Screens read through hooks and write through
  `actions`; nothing in the UI touches SQLite or notifications directly.
- `src/jelly`: the UI. Characters (`character/`), the candy dial (`dial/`), screens by tab
  (`now/`, `day/`, `report/`, `stuff/`), sheets and settings.
- `src/app`: expo-router routes, thin files that render `src/jelly` screens. Native tabs at
  the root, details as form sheets.
- `modules/on-device-model`: a local Expo module over Apple's Foundation Models, used as a
  progressive enhancement. It suggests a jelly's emoji, color, look and mood
  (`src/jelly/character/ask.ts`), phrases the week summary from facts computed in
  `src/core/week-facts.ts` (which also rejects invented numbers), and reads typed entries
  like "2h deep work this morning": the model extracts, `src/core/sentence.ts` resolves the
  times, and the user confirms a preview. Without the model, none of it shows.
- `plugins/with-scene-lifecycle.js`: the UIScene life cycle iOS 27 requires (TODO: drop
  when the Expo SDK 58 template includes it).

## Data

Three tables, `contexts`, `entries` and `days_off`, with UUIDs, `updated_at` and soft
deletes, so a later last-write-wins sync needs no migration. Job hours live on the context
(`work_days` as a Monday-first bitmask, `balance_since`, `balance_start_minutes`);
`src/core/workdays.ts` spreads a target over work days and `holidays.ts` computes German
public holidays per state (pref `holidays.region`). Timestamps are epoch milliseconds plus the local
UTC offset at recording time. Colors are hue keys the UI maps to its palette. A `meta` table
holds the schema version and preferences (`pref:<area>.<name>`). Schema changes go through
the migration steps in `db.ts`.

## Development

- Node comes from `devenv.nix`. `npm test` runs the domain tests, `npx tsc --noEmit`
  type-checks, `npx expo lint` lints.
- Metro runs as the agent-service `metro-all` (port 3100, published on the Tailnet).
- Native development builds run on the M1 builder (`ssh m1`) via `scripts/m1.sh`: `sim`
  for the simulator dev client, `device` for a development-signed IPA. `scripts/sim.sh`
  drives the simulators (launch into a route, screenshots, taps). `scripts/model.sh`
  runs on-device model prompts on the M1.

## Android

Package dev.schnau.hopwatch. Builds run on the M1 in ~/Developer/hopwatch-android:
`scripts/m1.sh android-dev` + `android-install` put a dev client on the `hopwatch-pixel`
emulator, which `scripts/emu.sh` drives (launch into a route, screenshots, taps; read its
header). Release builds run in Kiln (see Releasing), signed with the upload key ("Hopwatch
Play upload key" in Bitwarden; Play App Signing holds the app signing key).
iOS-only pieces (SwiftUI views from @expo/ui, SF Symbols, the Live Activity, Apple
Intelligence) have Android counterparts (`*.android.tsx`, Material via @expo/ui's Jetpack
Compose, Material Symbols) or stay hidden there.

`modules/system-surfaces` (Kotlin) shows the running entry as an ongoing notification
(channel "running", system chronometer, Stop / Back to buttons), the home screen widget and
the Quick Settings tile, and publishes the launcher's dynamic shortcuts;
`src/widgets/running-notification.ts` and `shortcuts.ts` drive the notification and the
shortcuts from the store. Notification, widget and tile taps switch in place (see Switching
from anywhere); launcher shortcuts open hopwatch:// links in a fresh activity start. A link that cold-started the app must not run again after an over-the-air reload in the
same process: Android clears it natively (`forgetLaunchLink`), and on both platforms
`src/core/launch.ts` skips the initial link once after an update reload. Nunito is embedded
by expo-font; `plugins/with-android-accent.js` colors AppCompat dialogs; expo-localization
declares en/de for the per-app language pickers.

## Switching from anywhere

The Live Activity, widgets, controls, Siri and Shortcuts actions (iOS), and the
notification, widget and tile (Android) switch without bringing the app forward. JavaScript
stays the only writer of entries:

- **Snapshot.** On every store change `src/widgets/surfaces.ts` writes `snapshot.json`
  (`Snapshot` in `src/core/remote.ts`: what runs, Back, recent entries, jellies with their
  colors, strings) to `surfaces/` in the app group container (iOS,
  `group.dev.schnau.hopwatch`) or the app's files (Android). Native code only reads it.
- **Commands.** A tap appends `surfaces/queue/<seq>-<uuid>.json`, a start or stop made
  against the snapshot it was drawn from (`expectOpen`, the entry id to use). JS replays
  the queue (`drainRemote` in `store.ts`, `replay` in `remote.ts`) at launch, on the
  module's `onCommands` event, on foreground and before every write. A command whose
  `expectOpen` no longer matches is dropped, which also makes replay idempotent.
- **iOS.** `targets/widget` is a widget extension (`@bacons/apple-targets`): the Live
  Activity, widgets and controls. `_shared/` compiles into both the extension and the app:
  the queue and snapshot IO, `Effective` (the snapshot plus pending taps, so surfaces update
  before JS runs) and the App Intents. The intents are `LiveActivityIntent`s, so iOS runs
  `perform()` in the app process, launching it in the background if needed; the
  extension never writes. `native/ios/AppSurfaces.swift` (added to the app target by
  `plugins/with-app-surfaces.js`, installed in `didFinishLaunching`) owns the Live
  Activity, widget reloads, the nudge after a tap and App Shortcut parameters;
  `AppShortcuts.swift` lists the Siri phrases.
- **Android.** `SurfaceReceiver` appends the command baked into each PendingIntent, then
  `Headless.kt` runs the headless JS task `HopwatchSurfaces` (registered in the root
  `index.ts`, `src/widgets/headless.ts`), which replays the queue and syncs the
  notification, nudge, evening check and shortcuts. If JS can't start, the command waits
  for the next launch. The debug dev client can't run headless JS (no bundled script);
  test this with a release build.
- The nudge has a fixed identifier (`hopwatch.nudge`) on both sides, so a native tap can
  replace it.

## Releasing

Releases build on the M1 builder from the head of `main` as manual Kiln runs (`.kiln/ci.ts`),
one step each, so a push to `main` only deploys the website. Follow a run with `kiln status`
and `kiln logs`, or at https://kiln.schnau.dev.

- JavaScript and asset changes: `kiln trigger hopwatch --inputs '{"release":"ota"}'`
  (`scripts/ota.sh`) publishes an EAS Update for iOS and Android to the `production` channel
  of @haukeschnau/hopwatch, with the commit subject as its message. Release builds download
  it when they come to the foreground and switch to it the next time they go to the
  background (`src/shell/updates.ts`). Updates only reach builds whose runtime version (the
  app `version`) matches.
- Native changes (a new native package, a config plugin, native settings in app.json) need
  new store builds: bump `version` in app.json (otherwise JS that expects the new native
  code would reach older builds over the air), push, then
  - iOS: `kiln trigger hopwatch --inputs '{"release":"testflight"}'`
    (`scripts/testflight.sh`). The build reaches Hauke's internal TestFlight group on its
    own; for the App Store, create the new version in App Store Connect, push the listing
    with `scripts/app-store.mjs` (release notes now apply), attach the build and submit it.
  - Android: `kiln trigger hopwatch --inputs '{"release":"play"}'`
    (`scripts/play-internal.sh`) builds a signed AAB and releases it to the internal testing
    track. Managed publishing is off, so that commit also sends every change queued in the
    Play Console for review; check Publishing overview first (`store/README.md`). Promote
    the release to production in the Console.

Kiln hands the steps the Play upload key (secrets `play-upload-keystore`, the keystore in
base64, and `play-upload-password`) and the developer-role Expo robot's token
(`expo-token`). ~/infra maps them in hosts/srv-2/kiln.nix to the SOPS keys
`projects/hopwatch/*`, copies of the Bitwarden items "Hopwatch Play upload key"
(***REMOVED***) and ***REMOVED***. The App
Store Connect key comes with the M1's Kiln agent, the Play service account with the M1's
`gplay`.
