#!/usr/bin/env bash
# Publishes the current JavaScript and assets to installed release builds over the air
# (EAS Update, channel "production", project @haukeschnau/stint).
#
#   scripts/ota.sh "What changed"
#
# Updates only reach builds with the same runtime version, which is the app "version" in
# app.json. So this is for JS and asset changes only. When native code changes (a new
# native package, a config plugin, native settings in app.json), bump "version" and ship
# a TestFlight build with scripts/m1.sh testflight instead.
set -euo pipefail
cd "$(dirname "$0")/.."

# The developer-role Expo robot from Hauke's Bitwarden, fetched just in time.
: "${EXPO_TOKEN:=$(bw-personal get password cafe27d5-dc69-4924-8ad9-0ec6da104004)}"
export EXPO_TOKEN
npx --yes eas-cli@latest update --channel production --platform ios --message "${1:?usage: scripts/ota.sh \"What changed\"}" --non-interactive
