#!/usr/bin/env bash
# Publishes this commit's JavaScript and assets over the air (EAS Update, channel production) to
# installed release builds whose runtime version matches: Expo's fingerprint of their native code.
# Calder's ota step runs this on a Mac agent for every push to main, since hermesc, which compiles
# the bundle, has no Linux arm64 build. EXPO_TOKEN_FILE names a file with the token of the
# developer-role Expo robot.
#
#   scripts/ota.sh IOS_RUNTIME ANDROID_RUNTIME    the runtime versions CI computed for this commit
set -euo pipefail
cd "$(dirname "$0")/.."

EXPO_TOKEN=$(<"$EXPO_TOKEN_FILE")
export EXPO_TOKEN

pnpm install --frozen-lockfile

# eas resolves the runtime versions here on the Mac; the store builds were keyed by CI's.
same_runtime() {
  local here
  here=$(scripts/runtime-version.sh "$1")
  if [ "$here" != "$2" ]; then
    echo "$1 runtime version $here on this Mac differs from CI's $2" >&2
    exit 1
  fi
}
same_runtime ios "${1:?the iOS runtime version CI computed}"
same_runtime android "${2:?the Android runtime version CI computed}"

# A pinned eas-cli: a new one once started exporting web for `--platform all`.
pnpm dlx eas-cli@25.3.0 update --channel production --environment production --platform all \
  --message "$(git log -1 --format=%s)" --non-interactive
