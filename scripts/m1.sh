#!/usr/bin/env bash
# Builds Stint on the M1 builder (`ssh m1`). The ios/ folder is generated there by
# `expo prebuild` and never checked in.
#
#   scripts/m1.sh sync               copy the source to the builder
#   scripts/m1.sh sim                sync, then build a Debug dev client for simulators
#   scripts/m1.sh install-sim UDID   install the last simulator build on a booted simulator
#   scripts/m1.sh device             sync, then archive a signed Release build and export a
#                                    development-signed .ipa to ios/build/export on m1
set -euo pipefail

REMOTE_DIR=Developer/stint-five
SCHEME=StintFive
TEAM_ID=2243J9RD68
# App Store Connect API key, deployed to m1 by ~/infra.
ASC_KEY_PATH=/run/secrets/app-store-connect/api-key
ASC_KEY_ID=85N8Y9CZC4
ASC_ISSUER_ID=e4b59e5f-0f40-4b1b-996e-b7a01664676a
cd "$(dirname "$0")/.."

sync() {
  nix run nixpkgs#rsync -- -a --delete \
    --exclude node_modules --exclude /ios --exclude /android --exclude .git --exclude .jj \
    --exclude .devenv --exclude "devenv.*" --exclude .expo --exclude dist \
    ./ "m1:$REMOTE_DIR/"
}

# Runs a command in the project directory on the builder, queued behind other builds.
remote() {
  ssh m1 "cd ~/$REMOTE_DIR && builder-control run --timeout 3600 -- bash -lc $(printf '%q' "ulimit -n 65536; $1")"
}

prepare='export LANG=en_US.UTF-8; npm ci --no-audit --no-fund && npx expo prebuild --platform ios --no-install && (cd ios && pod install)'

case "${1:-}" in
  sync) sync ;;
  sim)
    sync
    remote "$prepare && xcodebuild -workspace ios/$SCHEME.xcworkspace -scheme $SCHEME -configuration Debug \
      -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' -derivedDataPath ios/build/sim \
      CODE_SIGNING_ALLOWED=NO build | tail -40"
    ;;
  install-sim)
    ssh m1 "xcrun simctl install ${2:?simulator UDID} ~/$REMOTE_DIR/ios/build/sim/Build/Products/Debug-iphonesimulator/$SCHEME.app"
    ;;
  device)
    # --gui runs in Hauke's GUI session, where the login keychain is unlocked for signing.
    # The App Store Connect API key on m1 drives automatic provisioning.
    auth="-allowProvisioningUpdates -authenticationKeyPath $ASC_KEY_PATH -authenticationKeyID $ASC_KEY_ID -authenticationKeyIssuerID $ASC_ISSUER_ID"
    sync
    ssh m1 "cd ~/$REMOTE_DIR && builder-control run --gui --timeout 3600 -- bash -lc $(printf '%q' "ulimit -n 65536; $prepare && \
      xcodebuild -workspace ios/$SCHEME.xcworkspace -scheme $SCHEME -configuration Release \
        -destination 'generic/platform=iOS' -archivePath ios/build/$SCHEME.xcarchive \
        DEVELOPMENT_TEAM=$TEAM_ID CODE_SIGN_STYLE=Automatic $auth archive | tail -30 && \
      rm -rf ios/build/export && xcodebuild -exportArchive -archivePath ios/build/$SCHEME.xcarchive \
        -exportPath ios/build/export -exportOptionsPlist scripts/export-options.plist $auth | tail -15")"
    ;;
  *)
    sed -n '2,11p' "$0"
    exit 1
    ;;
esac
