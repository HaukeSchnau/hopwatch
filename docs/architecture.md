# Architecture

Stint is a personal iOS time tracker (spec: [spec.md](spec.md)) with one design, Jelly
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

## Releasing

- Native changes (a new native package, a config plugin, native settings in app.json):
  bump `version` in app.json, then `scripts/m1.sh testflight`. The build reaches Hauke's
  internal TestFlight group on its own.
- JavaScript and asset changes: `scripts/m1.sh ota "What changed"` publishes an EAS Update to
  the `production` channel. Release builds download it when they come to the foreground
  and switch to it the next time they go to the background (`src/shell/updates.ts`).
  Updates only reach builds whose runtime version (the app `version`) matches. That's
  why native changes need the version bump: without it, JS that expects the new native
  code would reach older builds too.
