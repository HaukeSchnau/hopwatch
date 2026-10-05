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

Two tables, `contexts` and `entries`, with UUIDs, `updated_at` and soft deletes, so a later
last-write-wins sync needs no migration. Timestamps are epoch milliseconds plus the local
UTC offset at recording time. Colors are hue keys the UI maps to its palette. A `meta` table
holds the schema version and preferences (`pref:<area>.<name>`). Schema changes go through
the migration steps in `db.ts`.

## Development

- Node comes from `devenv.nix`. `npm test` runs the domain tests, `npx tsc --noEmit`
  type-checks, `npx expo lint` lints.
- Metro runs as the agent-service `metro-all` (port 3100, published on the Tailnet).
- Native builds run on the M1 builder (`ssh m1`) via `scripts/m1.sh`: `sim` for the
  simulator dev client, `device` for a development-signed IPA, `testflight` for an App
  Store Connect upload. `scripts/sim.sh` drives the simulators (launch into a route,
  screenshots, taps). `scripts/model.sh` runs on-device model prompts on the M1.

## Android

Package dev.schnau.hopwatch. Builds run on the M1 in ~/Developer/hopwatch-android:
`scripts/m1.sh android-dev` + `android-install` put a dev client on the `hopwatch-pixel`
emulator, which `scripts/emu.sh` drives (launch into a route, screenshots, taps; read its
header); `android-release` builds a signed AAB into dist/ with the upload key from
Bitwarden ("Hopwatch Play upload key"; Play App Signing holds the app signing key).
iOS-only pieces (SwiftUI views from @expo/ui, SF Symbols, the Live Activity, Apple
Intelligence) have Android counterparts (`*.android.tsx`, Material via @expo/ui's Jetpack
Compose, Material Symbols) or stay hidden there.

`modules/system-surfaces` (Kotlin) shows the running entry as an ongoing notification
(channel "running", system chronometer, Stop / Back to buttons) and publishes the launcher's
dynamic shortcuts; `src/widgets/running-notification.ts` and `shortcuts.ts` drive them from
the store, like `live-activity.ts` does the iOS Live Activity. Buttons and shortcuts open
hopwatch:// links in a fresh activity start, so they work after the process was killed.
A link that cold-started the app must not run again after an over-the-air reload in the
same process: Android clears it natively (`forgetLaunchLink`), and on both platforms
`src/core/launch.ts` skips the initial link once after an update reload. Nunito is embedded
by expo-font; `plugins/with-android-accent.js` colors AppCompat dialogs; expo-localization
declares en/de for the per-app language pickers.

## Releasing

- JavaScript and asset changes: `scripts/m1.sh ota "What changed"` publishes an EAS Update
  for iOS and Android to the `production` channel of @haukeschnau/hopwatch. Release builds
  download it when they come to the foreground and switch to it the next time they go to
  the background (`src/shell/updates.ts`). Updates only reach builds whose runtime version
  (the app `version`) matches.
- Native changes (a new native package, a config plugin, native settings in app.json) need
  new store builds: bump `version` in app.json (otherwise JS that expects the new native
  code would reach older builds over the air), then
  - iOS: `scripts/m1.sh testflight`. The build reaches Hauke's internal TestFlight group on
    its own; for the App Store, create the new version in App Store Connect, push the
    listing with `scripts/app-store.mjs` (release notes now apply), attach the build and
    submit it.
  - Android: `scripts/m1.sh android-release`, then upload the AAB in the Play Console
    (`store/README.md` explains why not through the API) and roll it out.
