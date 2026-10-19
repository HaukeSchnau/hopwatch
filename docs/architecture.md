# Architecture

Hopwatch is a personal time tracker (spec: [spec.md](spec.md)) with one design, Jelly
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

- Node and pnpm come from `devenv.nix`, which shares `nix/toolchain.nix` with the dev shell
  Calder checks in. `pnpm test` runs the domain tests, `pnpm typecheck` type-checks, `pnpm lint`
  lints. Calder runs all three on every pull request and push.
- `pnpm start --dev-client` runs Metro for development builds, which `pnpm expo run:ios`
  (a Mac with Xcode) and `pnpm expo run:android` make. `scripts/model.sh` runs on-device
  model prompts on a Mac with Apple Intelligence.

## Android

Package dev.schnau.hopwatch. `pnpm expo run:android` puts a dev client on an emulator or
device. Release builds run in Calder (see Releasing), signed with the upload key; Play App
Signing holds the app signing key.
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

## Slack

A jelly's Slack status (`contexts.slack_status`, resolved with the jelly's emoji in
`tree.ts`, not inherited) is set while it runs. `src/core/slack.ts` holds what both platforms share and is tested: Slack's
emoji names (`slack-emoji.json`, generated from iamcal/emoji-data by
`scripts/slack-emoji.mjs`), the sign-in URL, token answers, and `slackStep`, the rule that
only a status Hopwatch set itself or an empty one gets changed.

- **Sign-in** is OAuth with PKCE and the `hopwatch://slack-auth` redirect, no client secret
  and no server (`connectSlack` in `slack-link.ts`, through expo-web-browser's auth
  session). Slack issues rotating user tokens: the access token lasts 12 hours, the refresh
  token 30 days, and every refresh brings a new pair. `+native-intent.tsx` drops the
  redirect, which Android also delivers to the app.
- **One client per platform, where taps run.** iOS: `HopwatchSlack` in
  `modules/system-surfaces/ios/Slack.swift`, tokens in the Keychain, driven by AppSurfaces
  after every snapshot change, tap and foreground; the snapshot carries each jelly's status
  in Slack's form. Android: `syncSlack` in `slack-link.ts`, tokens in expo-secure-store,
  run on store changes, foreground and in the headless task. Both run one call at a time,
  since two refreshes would spend the same refresh token, and skip work when
  `appliedKey` hasn't changed.
- expo-secure-store's config plugin isn't used: its backup rules would include only shared
  preferences and drop the database from Android's Auto Backup. Without it, a restored
  phone can't decrypt the token and the library returns null, which reads as not
  connected.
- The Slack app ("Hopwatch", client id in `slack.ts`) belongs to Urbs' Slack workspace,
  with user scopes `users.profile:read` and `users.profile:write` and public distribution.

## Releasing

Releases build on a Mac Calder agent from the head of `main` as manual Calder runs (`.calder/ci.ts`),
one step each. A push to `main` runs the checks and deploys the website (`site/`) to Cloudflare
with `alchemy.run.ts`; a pull request gets a preview of it that's destroyed when it closes. Follow a run with `calder status`
and `calder logs`, or at https://calder.schnau.dev/app/.

- JavaScript and asset changes: `calder trigger hopwatch --inputs '{"release":"ota"}'`
  (`scripts/ota.sh`) publishes an EAS Update for iOS and Android to the `production` channel
  of @haukeschnau/hopwatch, with the commit subject as its message. Release builds download
  it when they come to the foreground and switch to it the next time they go to the
  background (`src/shell/updates.ts`). Updates only reach builds whose runtime version (the
  app `version`) matches.
- Native changes (a new native package, a config plugin, native settings in app.json) need
  new store builds: bump `version` in app.json (otherwise JS that expects the new native
  code would reach older builds over the air), push, then
  - iOS: `calder trigger hopwatch --inputs '{"release":"testflight"}'`
    (`scripts/testflight.sh`). The build reaches Hauke's internal TestFlight group on its
    own; for the App Store, create the new version in App Store Connect, push the listing
    with `scripts/app-store.mjs` (release notes now apply), attach the build and submit it.
  - Android: `calder trigger hopwatch --inputs '{"release":"play"}'`
    (`scripts/play-internal.sh`) builds a signed AAB and releases it to the internal testing
    track. Managed publishing is off, so that commit also sends every change queued in the
    Play Console for review; check Publishing overview first (`store/README.md`). Promote
    the release to production in the Console.

Calder hands the steps the Play upload key (secrets `play-upload-keystore`, the keystore in
base64, and `play-upload-password`) and the developer-role Expo robot's token
(`expo-token`), and the website deploys the Cloudflare credentials (`cloudflare`). The App
Store Connect key comes with the Mac agent, the Play service account with its `gplay`.
