#!/usr/bin/env bash
# Prints the runtime version of this checkout's native app for ios or android, as expo-updates
# resolves it: Expo's fingerprint (fingerprint.config.js), which store builds embed and `eas update`
# publishes to. With OUT, writes it there as JSON instead, the form Calder reads a task's value in.
#
#   scripts/runtime-version.sh ios|android [OUT]
set -euo pipefail
cd "$(dirname "$0")/.."

version=$(pnpm exec expo-updates runtimeversion:resolve --platform "$1" |
  node -pe 'JSON.parse(require("fs").readFileSync(0)).runtimeVersion')
if [ -n "${2:-}" ]; then
  printf '"%s"\n' "$version" >"$2"
else
  echo "$version"
fi
