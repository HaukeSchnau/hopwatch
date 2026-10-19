#!/usr/bin/env bash
# Archives a Release build with a fresh build number and uploads it to App Store Connect, where
# Hauke's internal TestFlight group gets it. Calder's testflight step runs this on a Mac agent in
# Hauke's GUI session, where the keychain can sign. The Calder agent there provides the App Store
# Connect key as APP_STORE_CONNECT_API_KEY_PATH, _KEY_ID and _ISSUER_ID.
set -euo pipefail
cd "$(dirname "$0")/.."

# Every upload needs a build number App Store Connect hasn't seen; a UTC timestamp works.
HOPWATCH_BUILD_NUMBER=$(date -u +%Y%m%d%H%M)
# CocoaPods fails without a UTF-8 locale, and launchd starts the agent without one.
export HOPWATCH_BUILD_NUMBER LANG=en_US.UTF-8
echo "build $HOPWATCH_BUILD_NUMBER"

pnpm install --frozen-lockfile
pnpm exec expo prebuild --platform ios --no-install
(cd ios && pod install)

auth=(
  -allowProvisioningUpdates
  -authenticationKeyPath "$APP_STORE_CONNECT_API_KEY_PATH"
  -authenticationKeyID "$APP_STORE_CONNECT_API_KEY_ID"
  -authenticationKeyIssuerID "$APP_STORE_CONNECT_API_ISSUER_ID"
)
xcodebuild archive -quiet -workspace ios/Hopwatch.xcworkspace -scheme Hopwatch -configuration Release \
  -destination generic/platform=iOS -archivePath ios/build/Hopwatch.xcarchive \
  DEVELOPMENT_TEAM=2243J9RD68 CODE_SIGN_STYLE=Automatic "${auth[@]}"
xcodebuild -exportArchive -quiet -archivePath ios/build/Hopwatch.xcarchive -exportPath ios/build/upload \
  -exportOptionsPlist scripts/export-testflight.plist "${auth[@]}"
