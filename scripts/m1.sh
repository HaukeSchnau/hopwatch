#!/usr/bin/env bash
# Builds Stint on the M1 builder (`ssh m1`). The ios/ folder is generated there by
# `expo prebuild` and never checked in.
#
#   scripts/m1.sh sync               copy the source to the builder
#   scripts/m1.sh sim                sync, then build a Debug dev client for simulators
#   scripts/m1.sh install-sim UDID   install the last simulator build on a booted simulator
#   scripts/m1.sh device             sync, then build a signed Release .ipa for the iPhone
#                                    (needs ASC_KEY_PATH on the builder, see below)
set -euo pipefail

REMOTE_DIR=Developer/stint-five
SCHEME=StintFive
TEAM_ID=2243J9RD68
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

prepare='npm ci --no-audit --no-fund && npx expo prebuild --platform ios --no-install && (cd ios && nix shell nixpkgs#cocoapods -c pod install)'

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
    # Signing needs Hauke's GUI session (unlocked keychain) and an App Store Connect
    # API key for automatic provisioning. ASC_KEY_PATH points at the .p8 on the builder.
    sync
    ssh m1 "cd ~/$REMOTE_DIR && builder-control run --timeout 3600 -- sudo -n -E launchctl asuser 501 sudo -n -E -u haukeschnau -- \
      bash -lc $(printf '%q' "ulimit -n 65536; $prepare && xcodebuild -workspace ios/$SCHEME.xcworkspace -scheme $SCHEME \
        -configuration Release -destination 'generic/platform=iOS' -archivePath ios/build/$SCHEME.xcarchive \
        -allowProvisioningUpdates -authenticationKeyPath \$ASC_KEY_PATH -authenticationKeyID \$ASC_KEY_ID \
        -authenticationKeyIssuerID \$ASC_ISSUER_ID DEVELOPMENT_TEAM=$TEAM_ID CODE_SIGN_STYLE=Automatic archive | tail -40 && \
        xcodebuild -exportArchive -archivePath ios/build/$SCHEME.xcarchive -exportPath ios/build/export \
        -exportOptionsPlist scripts/export-options.plist -allowProvisioningUpdates \
        -authenticationKeyPath \$ASC_KEY_PATH -authenticationKeyID \$ASC_KEY_ID -authenticationKeyIssuerID \$ASC_ISSUER_ID | tail -20")"
    ;;
  *)
    sed -n '2,11p' "$0"
    exit 1
    ;;
esac
