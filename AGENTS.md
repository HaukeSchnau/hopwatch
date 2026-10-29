# Hopwatch

A personal time tracker for iOS and Android (spec: `docs/spec.md`), with one design, Jelly.
Store name "Hopwatch: Time Tracker", publisher Urbs UG on both the App Store and Google Play
(`store/`). IDs: dev.schnau.hopwatch (iOS and Android), hopwatch://, Expo project
@haukeschnau/hopwatch. The app was called Stint before its launch, and exports from then
(app: 'stint') still restore. Open source under the MIT license (`LICENSE`): the repository
is public at git.schnau.dev/schnau/hopwatch, mirrored to github.com/HaukeSchnau/hopwatch, so
nothing secret, internal or tied to one machine goes in it. The working notes (current state,
decisions, the build and store setup, the plan for the next version) and the tooling for
Hauke's Mac builder are private, in `~/infra/docs/agent-notes/hopwatch/` (its README.md
first); start there, then with `docs/architecture.md`, and keep account, credential and host
details there.

- `src/core`: data model, timeline domain module (the only writer of entries), store,
  hooks, reports, nudges, deep links, export and import. Tests: `pnpm test`.
- `src/jelly`: the UI. `src/app`: expo-router routes.
- `modules/on-device-model`: Apple Foundation Models bridge.
- Releases run through Calder (`@calder-ci/std/Expo`) for every push to `main`: an OTA update
  exported on the tower, plus TestFlight and Play internal builds on the Mac when Expo's
  fingerprint of the native code changed (`fingerprint.config.js`). Store submission is a manual Calder run. See `docs/architecture.md`.
- `scripts/app-store.mjs`: pushes the App Store listing in `store/` through the `asc` CLI.
- Node and pnpm come from `devenv.nix` (`nix/toolchain.nix`, shared with Calder's dev shell).
- `site/`: the website at hopwatch.schnau.dev, on Cloudflare through `alchemy.run.ts`; Calder
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

Store builds don't use EAS Build: they run on a Mac Calder agent as manual Calder runs (Releasing in
`docs/architecture.md`). EAS hosts the over-the-air updates (`eas update`). Run EAS CLI as
`pnpm dlx eas-cli@latest <command>`; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `pnpm expo run:ios` or `pnpm expo run:android` (on Hauke's machines, the private tooling builds on the Mac builder).
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
