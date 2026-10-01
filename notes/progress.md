# Stint: working notes

Durable context for this build. Newest state first; prune what's superseded.

## Goal

Stint v1: Jelly as the only design, production ready, installed through TestFlight on
Hauke's iPhone 16 Pro. Before v1 this repo held "Stint Five", five design directions in
one app (`dev.schnau.stint.five`); Hauke picked Jelly 2. The old app stays installed on
his phone until he moves his data over (export there, restore here).

## Decisions

- Identity: "Stint", bundle `dev.schnau.stint`, scheme `stint://`, version 1.0.0.
  `app.config.ts` stamps `STINT_BUILD_NUMBER` into release builds.
- Install: TestFlight, internal testing. `scripts/m1.sh testflight` archives and uploads
  with the ASC API key. `scripts/publish-ipa.sh` (development-signed IPA over the Tailnet
  share) stays as the fallback.
- v1 scope (Hauke, 2026-10-01): bring back from Jelly 1 "Day opens at now", bigger
  emoji, the target/nudge quick chips and backdate consequence warnings. Extras: a Live
  Activity for the running entry and restore from a JSON export.
- Also v1: per-screen error fallbacks, DB migration steps, no Lab, no sample data outside
  onboarding, lint + typecheck + tests green.
- Apple Intelligence (modules/on-device-model) is a progressive enhancement. It works on
  Hauke's phone since the model finished downloading; Foundation Models has no download
  progress API, only availability.

## Infrastructure

- `ssh m1` = M1 builder (Xcode 27). `scripts/m1.sh` syncs to `m1:~/Developer/stint-v1`.
  Don't touch `~/Developer/stint` or `~/Developer/stint-lab` (other threads);
  `~/Developer/stint-five` is the old Stint Five checkout.
- Signing: team 2243J9RD68, automatic signing with the ASC API key at
  /run/secrets/app-store-connect/api-key on m1. The keychain is only unlocked in Hauke's
  GUI session (`builder-control run --gui`). Use the system `pod` on m1.
- Metro: agent-service `metro-all` on port 3100,
  https://px-b8ee4debfe-metro-all.schnau.dev. The old per-direction Metros are stopped.
- Simulators (iPhone 18 Pro, iOS 27): Jelly 9CD905EA-FFD6-4B75-B2C4-FBABF7327CFE is the
  main one. Spare: 5230DDD4-EDF3-4C8A-BF26-9F9BE311FE6C, 594D2BB8-93ED-4F85-BCB5-69A328873AD8,
  66FBBE5F-8716-495C-8FEC-CD3EE097B963, 2EB1D0E2-3250-46F5-B059-F0FFE9772DEA.
  Delete them when the project wraps up.

## Gotchas found

- iOS 27 traps at launch without the UIScene life cycle; `plugins/with-scene-lifecycle.js`.
- `simctl openurl` with a custom scheme stops at "Open in …?". `scripts/sim.sh` launches
  with `--initialUrl <metro>` and the dev-only `-stintRoute /path` argument.
- The M1 is shared with other threads, so the T3 device hub times out; agent-device runs
  on m1 via `scripts/sim.sh ad`.

## State

- Consolidated (2026-10-01): Jelly lives in `src/jelly`, routes at the root of
  `src/app`, the other directions, Lab, per-direction Metro config, fonts and unused
  packages are gone. Docs: docs/architecture.md, docs/design/.

## Next

1. Live Activity (expo-widgets) and the Jelly 1 qualities (parallel builders).
2. Restore from export, error fallbacks, DB migrations.
3. App Store Connect app record (needs Hauke's account in the browser), internal group,
   first TestFlight upload. Then tell Hauke how to move data from Stint Five.
