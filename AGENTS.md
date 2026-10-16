# Hopwatch

A personal time tracker for iOS and Android, formerly called Stint (spec: `docs/spec.md`),
with one design, Jelly. Store name "Hopwatch: Time Tracker", publisher Urbs UG on both the
App Store and Google Play (`store/`). IDs: dev.schnau.hopwatch (iOS and Android), hopwatch://,
Expo project @haukeschnau/hopwatch. The repo folder is still called stint, and exports from
before the rename (app: 'stint') still restore. Start with `notes/progress.md` for the
current state, then `docs/architecture.md`.

- `src/core`: data model, timeline domain module (the only writer of entries), store,
  hooks, reports, nudges, deep links, export and import. Tests: `pnpm test`.
- `src/jelly`: the UI. `src/app`: expo-router routes.
- `modules/on-device-model`: Apple Foundation Models bridge.
- `scripts/m1.sh`: native development builds on the M1 builder (`ssh m1`). Releases
  (TestFlight, Play internal testing, OTA updates) are manual Kiln runs on the M1, see
  `docs/architecture.md`.
- `asc` and `gplay`: App Store Connect and Google Play Console CLIs, already signed in to
  Urbs UG (see the `app-stores` skill).
- Node and pnpm come from `devenv.nix` (`nix/toolchain.nix`, shared with Kiln's dev shell).
- `site/`: the website at hopwatch.schnau.dev, on Cloudflare through `alchemy.run.ts`; Kiln
  deploys it on push to `main` and previews pull requests. `project dev up` serves it with
  `alchemy dev`, one instance per checkout.

This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

The project uses pnpm.

```bash
pnpm expo install <package>  # ALWAYS use instead of pnpm add — resolves SDK-compatible versions
pnpm start                   # start the dev server
pnpm lint                    # lint
pnpm typecheck               # typecheck
pnpm dlx expo-doctor         # diagnose dependency and config issues
pnpm expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building and EAS

Store builds don't use EAS Build: they run on the M1 builder as manual Kiln runs (Releasing in
`docs/architecture.md`). EAS hosts the over-the-air updates (`eas update`). Run EAS CLI as
`pnpm dlx eas-cli@latest <command>`; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `scripts/m1.sh sim` or `scripts/m1.sh android-dev` on the M1 builder.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
