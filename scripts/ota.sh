#!/usr/bin/env bash
# Publishes this commit's JavaScript and assets over the air (EAS Update, channel production) to
# installed release builds whose runtime version, the app version, matches. Kiln's ota step runs
# this on the M1 builder, since hermesc, which compiles the bundle, has no Linux arm64 build.
# EXPO_TOKEN_FILE names a file with the token of the developer-role Expo robot.
set -euo pipefail
cd "$(dirname "$0")/.."

EXPO_TOKEN=$(<"$EXPO_TOKEN_FILE")
export EXPO_TOKEN

pnpm install --frozen-lockfile
pnpm dlx eas-cli@latest update --channel production --environment production --platform all \
  --message "$(git log -1 --format=%s)" --non-interactive
