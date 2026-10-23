#!/usr/bin/env bash
# Archives a Release build with a fresh build number, uploads it to App Store Connect and waits
# until Apple has processed it, so Hauke's internal TestFlight group can install it. Calder's
# testflight step runs this on a Mac agent in Hauke's GUI session, where the keychain can sign,
# when a push changes the iOS runtime version (.calder/ci.ts). The Calder agent there provides the
# App Store Connect key as APP_STORE_CONNECT_API_KEY_PATH, _KEY_ID and _ISSUER_ID.
#
#   scripts/testflight.sh RUNTIME_VERSION    the iOS runtime version CI computed for this commit
set -euo pipefail
cd "$(dirname "$0")/.."
expected=${1:?the runtime version CI computed}
app=6818526671
version=$(node -p 'require("./app.json").expo.version')

# Apple takes no new builds of a version once it passed review; fail now rather than at the upload.
approved=$(asc versions list --app "$app" --platform IOS --version "$version" --output json \
  --state READY_FOR_SALE,PENDING_DEVELOPER_RELEASE,PENDING_APPLE_RELEASE,PROCESSING_FOR_APP_STORE,REPLACED_WITH_NEW_VERSION,REMOVED_FROM_SALE,DEVELOPER_REMOVED_FROM_SALE |
  node -pe 'JSON.parse(require("fs").readFileSync(0)).data.length')
if [ "$approved" != 0 ]; then
  echo "$version already passed App Store review; raise version in app.json for new builds" >&2
  exit 1
fi

# Every upload needs a build number App Store Connect hasn't seen; a UTC timestamp works.
HOPWATCH_BUILD_NUMBER=$(date -u +%Y%m%d%H%M)
# CocoaPods fails without a UTF-8 locale, and launchd starts the agent without one.
export HOPWATCH_BUILD_NUMBER LANG=en_US.UTF-8
echo "build $HOPWATCH_BUILD_NUMBER of $version, runtime $expected"

pnpm install --frozen-lockfile
pnpm exec expo prebuild --platform ios --no-install --clean
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

# Over-the-air updates for this commit go to the runtime version CI computed, so the binary must
# report the same one, or it would never receive them.
embedded=$(<ios/build/Hopwatch.xcarchive/Products/Applications/Hopwatch.app/EXUpdates.bundle/fingerprint)
if [ "$embedded" != "$expected" ]; then
  echo "the build's runtime version $embedded differs from CI's $expected" >&2
  exit 1
fi

xcodebuild -exportArchive -quiet -archivePath ios/build/Hopwatch.xcarchive -exportPath ios/build/upload \
  -exportOptionsPlist scripts/export-testflight.plist "${auth[@]}"
asc builds wait --app "$app" --build-number "$HOPWATCH_BUILD_NUMBER" --platform IOS --timeout 45m --fail-on-invalid
