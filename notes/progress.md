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
- Metro: agent-service `stint-metro`, port 3000, https://px-b8ee4debfe-stint-metro.schnau.dev
  (EXPO_PACKAGER_PROXY_URL set). Dev client URL:
  `stintfive://expo-development-client/?url=https%3A%2F%2Fpx-b8ee4debfe-stint-metro.schnau.dev`
- Signing: team 2243J9RD68, automatic signing with the App Store Connect API key
  (personal Bitwarden item b10f2c97-…, attachment AuthKey_85N8Y9CZC4.p8; fetch just in
  time, delete after). Keychain is only unlocked in Hauke's GUI session, hence the
  `launchctl asuser 501` wrapper in `scripts/m1.sh device`.
- iPhone 16 Pro UDID 00008140-000E345826BB001C is registered in the team but not paired
  with m1. Install route: development-signed IPA + manifest under /srv/agent-share,
  opened as itms-services link (needs Developer Mode on the phone).

## State

- Core done, tests green, typecheck clean. Lab screen done. Direction routes are
  placeholders.
- First simulator dev-client build running on m1.

## Next

1. Install the dev client on the five simulators, connect to Metro.
2. Five builder agents, one per direction, each owning its directories.
3. QA pass per direction, fixes.
4. Release build, signed IPA, OTA install link for Hauke.
