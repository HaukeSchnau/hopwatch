# Stint Five: working notes

Durable context for this build. Newest state first; prune what's superseded.

## Goal

Five fully working design directions of the Stint MVP (docs/spec.md) in one iOS app,
installable on Hauke's iPhone, built natively on the M1 builder. No Expo Go.

## Decisions

- One app, five directions, shared data. The Lab (`/lab`) picks the active direction;
  every direction links back to it from settings. Rejected: five separate apps (data
  would not be shared, five installs).
- Identity: "Stint Five", bundle `dev.schnau.stint.five`, scheme `stintfive://`.
  A parallel thread builds "Stint Lab" (`dev.schnau.stint.lab`) on the same M1, and an
  older project uses `dev.schnau.stint` + `stint://`; distinct ids avoid clobbering.
  TODO in `src/core/links.ts`: switch to `stint://` once one direction becomes the app.
- Core in `src/core`: pure timeline module with property tests (vitest + fast-check),
  zustand store with synchronous expo-sqlite writes, hooks, nudges, deep links via
  `+native-intent`, JSON export, sample data. Colors stored as hue keys so every
  direction maps them to its own palette.
- Directions: glass (native Liquid Glass), deck (Teenage Engineering hardware),
  almanac (editorial riso print), orbit (24 h dial, dark), jelly (squishy blobs).
  Briefs in docs/directions/, contract in docs/building-a-direction.md.

## Infrastructure

- `ssh m1` = M1 builder (Xcode 27, 16 GB). Not Hauke's MacBook (that's `mbp`, M4, offline).
- `scripts/m1.sh sim` syncs to `m1:~/Developer/stint-five` and builds the Debug dev
  client for simulators. Don't touch `~/Developer/stint` or `~/Developer/stint-lab`.
- Simulators created for this project (iPhone 18 Pro, iOS 27):
  Glass 5230DDD4-EDF3-4C8A-BF26-9F9BE311FE6C, Deck 594D2BB8-93ED-4F85-BCB5-69A328873AD8,
  Almanac 66FBBE5F-8716-495C-8FEC-CD3EE097B963, Orbit 2EB1D0E2-3250-46F5-B059-F0FFE9772DEA,
  Jelly 9CD905EA-FFD6-4B75-B2C4-FBABF7327CFE. Delete them when the project wraps up.
- Metro: one agent-service per direction, each with `STINT_DIRECTION` so metro.config.js
  blocks the other four directions: metro-glass :3101, stint-metro-deck :3102,
  metro-almanac :3103, stint-metro-orbit :3104, stint-metro-jelly :3105, published as
  https://px-b8ee4debfe-<service>.schnau.dev. A single shared Metro stalled for minutes
  under five builders' edits; async routes didn't help (each chunk carried the whole graph).
  Services in this sandbox share one network namespace, so give each an explicit port.
  Failed agent-service units can't be recreated under the same name from the sandbox.
- Signing: team 2243J9RD68, automatic signing with the App Store Connect API key at
  /run/secrets/app-store-connect/api-key on m1. The keychain is only unlocked in Hauke's
  GUI session: `builder-control run --gui`. Use the system `pod` on m1 (pinned nixpkgs
  CocoaPods aborts on macOS 27). `scripts/m1.sh device` archives and exports a
  development-signed IPA; verified working 2026-09-25.
- iPhone 16 Pro UDID 00008140-000E345826BB001C is registered in the team but not paired
  with m1. Install route: development-signed IPA + manifest under /srv/agent-share,
  opened as itms-services link (needs Developer Mode on the phone).

## Gotchas found

- iOS 27 traps at launch without the UIScene life cycle. `plugins/with-scene-lifecycle.js`
  applies Expo main's template (SceneDelegate on `ExpoAppSceneDelegate`).
- `simctl openurl` with a custom scheme stops at "Open in …?". The dev client loads Metro
  via `simctl launch … --initialUrl <metro>`, and routes are opened with the dev-only
  `-stintRoute /path` launch argument (read through RN `Settings` in `_layout.tsx`).
  `scripts/sim.sh view` wraps both and locks per simulator.
- The M1 is shared with a parallel thread (3 simulators, an Android emulator, Release
  builds), so the T3 device hub (`device_open`) timed out; agent-device runs directly on
  m1 via `scripts/sim.sh ad`.

## State

- Core committed (`feat: scaffold Stint Five …`). Five builder subagents running, one per
  direction, owning `src/app/<id>`, `src/directions/<id>`, `docs/directions/<id>.md`.
  They wait for `.shots/SIMULATORS_READY` before using simulators.
- Dev client (with scene fix) installed on all five simulators; `.shots/SIMULATORS_READY`
  exists. Builders were interrupted by the API session limit at ~01:45 and resumed ~06:20.

## Next

1. Review each direction as it lands; QA pass, fixes, core requests.
2. Release build, development-signed IPA (`scripts/export-options.plist`), OTA install
   link under /srv/agent-share for Hauke.
