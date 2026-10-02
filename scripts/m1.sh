#!/usr/bin/env bash
# Builds Stint on the M1 builder (`ssh m1`). The ios/ folder is generated there by
# `expo prebuild` and never checked in.
#
#   scripts/m1.sh sync               copy the source to the builder
#   scripts/m1.sh sim                sync, then build a Debug dev client for simulators
#   scripts/m1.sh install-sim UDID   install the last simulator build on a booted simulator
#   scripts/m1.sh device             sync, then archive a signed Release build and export a
#                                    development-signed .ipa to ios/build/export on m1
#   scripts/m1.sh testflight         sync, then archive a Release build with a fresh build
#                                    number and upload it to App Store Connect for TestFlight
#   scripts/m1.sh ota "What changed" sync, then publish the JS to installed release builds over the
#                                    air (EAS Update, channel production). JS and assets only;
#                                    native changes need a version bump and a TestFlight build
#   scripts/m1.sh asc METHOD PATH [JSON]
#                                    call the App Store Connect API (see scripts/asc.mjs)
set -euo pipefail

REMOTE_DIR=Developer/stint-v1
SCHEME=Stint
TEAM_ID=2243J9RD68
# App Store Connect API key, deployed to m1 by ~/infra.
ASC_KEY_PATH=/run/secrets/app-store-connect/api-key
ASC_KEY_ID=85N8Y9CZC4
ASC_ISSUER_ID=e4b59e5f-0f40-4b1b-996e-b7a01664676a
cd "$(dirname "$0")/.."

sync() {
  nix run nixpkgs#rsync -- -a --delete \
    --exclude node_modules --exclude /ios --exclude /android --exclude .git --exclude .jj \
    --exclude .devenv --exclude "devenv.*" --exclude .expo --exclude dist --exclude .shots \
    ./ "m1:$REMOTE_DIR/"
}

# Runs a command in the project directory on the builder, queued behind other builds.
remote() {
  ssh m1 "cd ~/$REMOTE_DIR && builder-control run --timeout 3600 -- bash -lc $(printf '%q' "ulimit -n 65536; $1")"
}

# Like `remote`, but in Hauke's GUI session, where the login keychain is unlocked for signing.
remote_gui() {
  ssh m1 "cd ~/$REMOTE_DIR && builder-control run --gui --timeout 3600 -- bash -lc $(printf '%q' "ulimit -n 65536; $1")"
}

prepare='export LANG=en_US.UTF-8; npm ci --no-audit --no-fund && npx expo prebuild --platform ios --no-install && (cd ios && pod install)'
auth="-allowProvisioningUpdates -authenticationKeyPath $ASC_KEY_PATH -authenticationKeyID $ASC_KEY_ID -authenticationKeyIssuerID $ASC_ISSUER_ID"
archive="xcodebuild -workspace ios/$SCHEME.xcworkspace -scheme $SCHEME -configuration Release \
  -destination 'generic/platform=iOS' -archivePath ios/build/$SCHEME.xcarchive \
  DEVELOPMENT_TEAM=$TEAM_ID CODE_SIGN_STYLE=Automatic $auth archive | tail -30"

case "${1:-}" in
  sync) sync ;;
  sim)
    sync
    # Signed to run locally (no keychain needed): the App Group that hands the Live
    # Activity layout to the widget extension only works in a signed build.
    remote "$prepare && xcodebuild -workspace ios/$SCHEME.xcworkspace -scheme $SCHEME -configuration Debug \
      -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' -derivedDataPath ios/build/sim \
      CODE_SIGN_IDENTITY=- CODE_SIGNING_ALLOWED=YES CODE_SIGNING_REQUIRED=NO build | tail -40"
    ;;
  install-sim)
    ssh m1 "xcrun simctl install ${2:?simulator UDID} ~/$REMOTE_DIR/ios/build/sim/Build/Products/Debug-iphonesimulator/$SCHEME.app"
    ;;
  device)
    sync
    remote_gui "$prepare && $archive && rm -rf ios/build/export && \
      xcodebuild -exportArchive -archivePath ios/build/$SCHEME.xcarchive -exportPath ios/build/export \
        -exportOptionsPlist scripts/export-options.plist $auth | tail -15"
    ;;
  testflight)
    # Every upload needs a build number App Store Connect hasn't seen; a UTC timestamp works.
    build=$(date -u +%Y%m%d%H%M)
    echo "build $build"
    sync
    remote_gui "export STINT_BUILD_NUMBER=$build; $prepare && $archive && rm -rf ios/build/upload && \
      xcodebuild -exportArchive -archivePath ios/build/$SCHEME.xcarchive -exportPath ios/build/upload \
        -exportOptionsPlist scripts/export-testflight.plist $auth | tail -20"
    ;;
  ota)
    message="${2:?usage: scripts/m1.sh ota \"What changed\"}"
    # Its own checkout, since builder-control runs two jobs at once and an npm ci here
    # must not pull node_modules out from under a running archive.
    REMOTE_DIR=Developer/stint-ota
    ssh m1 "mkdir -p ~/$REMOTE_DIR"
    sync
    # Published from the M1 because hermesc, which compiles the bundle, has no Linux arm64
    # build. The developer-role Expo robot from Hauke's Bitwarden goes over in a private
    # file rather than on a command line.
    bw-personal get password cafe27d5-dc69-4924-8ad9-0ec6da104004 | ssh m1 'umask 077; cat > ~/.stint-expo-token'
    remote "export EXPO_TOKEN=\$(cat ~/.stint-expo-token); rm -f ~/.stint-expo-token; npm ci --no-audit --no-fund >/dev/null && \
      npx --yes eas-cli@latest update --channel production --platform ios --message $(printf '%q' "$message") --non-interactive"
    ;;
  asc)
    shift
    # The key is readable over plain SSH, so API calls don't queue behind builds.
    ssh -o LogLevel=error m1 "node --input-type=module - $(printf '%q ' "$@")" <scripts/asc.mjs
    ;;
  *)
    sed -n '2,16p' "$0"
    exit 1
    ;;
esac
