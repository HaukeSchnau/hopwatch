#!/usr/bin/env bash
# Builds Hopwatch on the M1 builder (`ssh m1`). The ios/ folder is generated there by
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
#
#   scripts/m1.sh android-dev        sync, then build a debug dev client APK (arm64) for the
#                                    emulator and Android phones
#   scripts/m1.sh android-install [SERIAL]
#                                    install the last debug APK on a running emulator or device
#                                    (default emulator-5584, the hopwatch-pixel AVD; scripts/emu.sh)
#   scripts/m1.sh android-release    sync, then build a release AAB with a fresh versionCode,
#                                    signed with the Play upload key from Hauke's Bitwarden;
#                                    copies it to dist/ here for the Play Console
#
# Android builds use their own checkout, m1:~/Developer/hopwatch-android, so their npm ci never
# pulls node_modules out from under an iOS build in hopwatch-ios. The Android SDK and JDK on m1
# come from ~/infra (JAVA_HOME, ANDROID_HOME).
set -euo pipefail

REMOTE_DIR=Developer/hopwatch-ios
SCHEME=Hopwatch
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

ANDROID_DIR=Developer/hopwatch-android
ANDROID_APK=android/app/build/outputs/apk/debug/app-debug.apk
# Bitwarden item "Hopwatch Play upload key": the keystore as attachment, its password as
# the item's password (PKCS12, so store and key share it). Alias "upload".
UPLOAD_KEY_ITEM=44b8d215-c374-437d-9993-36c7b1b9ff21
UPLOAD_KEY_FILE=upload-keystore.p12
# --no-daemon: the builder is shared, so no Gradle daemon should linger for hours.
# The init script works around the read-only SDK (see scripts/android-sdk.gradle).
gradlew='./gradlew --no-daemon --console=plain --init-script ../scripts/android-sdk.gradle'

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
    remote_gui "export HOPWATCH_BUILD_NUMBER=$build; $prepare && $archive && rm -rf ios/build/upload && \
      xcodebuild -exportArchive -archivePath ios/build/$SCHEME.xcarchive -exportPath ios/build/upload \
        -exportOptionsPlist scripts/export-testflight.plist $auth | tail -20"
    ;;
  ota)
    message="${2:?usage: scripts/m1.sh ota \"What changed\"}"
    # Its own checkout, since builder-control runs two jobs at once and an npm ci here
    # must not pull node_modules out from under a running archive.
    REMOTE_DIR=Developer/hopwatch-ota
    ssh m1 "mkdir -p ~/$REMOTE_DIR"
    sync
    # Published from the M1 because hermesc, which compiles the bundle, has no Linux arm64
    # build. The developer-role Expo robot from Hauke's Bitwarden goes over in a private
    # file rather than on a command line.
    bw-personal get password cafe27d5-dc69-4924-8ad9-0ec6da104004 | ssh m1 'umask 077; cat > ~/.hopwatch-expo-token'
    # EAS_NO_VCS: the checkout is an rsync copy, not a git repository.
    remote "export EXPO_TOKEN=\$(cat ~/.hopwatch-expo-token) EAS_NO_VCS=1 EAS_PROJECT_ROOT=\$PWD; rm -f ~/.hopwatch-expo-token; npm ci --no-audit --no-fund >/dev/null && \
      npx --yes eas-cli@latest update --channel production --environment production --platform ios --message $(printf '%q' "$message") --non-interactive"
    ;;
  android-dev)
    REMOTE_DIR=$ANDROID_DIR
    ssh m1 "mkdir -p ~/$REMOTE_DIR"
    sync
    # npm ci only when the lockfile changed: it wipes node_modules and with it the native
    # build outputs (~3 instead of ~6 minutes on an idle m1). arm64 only, which covers the
    # emulator and current phones; Play builds get every ABI.
    remote "set -o pipefail; export LANG=en_US.UTF-8; \
      { [ node_modules/.package-lock.json -nt package-lock.json ] || npm ci --no-audit --no-fund; } && \
      npx expo prebuild --platform android --no-install && \
      cd android && $gradlew -PreactNativeArchitectures=arm64-v8a :app:assembleDebug | tail -40"
    ;;
  android-install)
    ssh m1 "adb -s ${2:-emulator-5584} install -r ~/$ANDROID_DIR/$ANDROID_APK"
    ;;
  android-release)
    # A versionCode Play hasn't seen: app.config.ts turns this UTC timestamp into minutes.
    build=$(date -u +%Y%m%d%H%M)
    echo "build $build"
    REMOTE_DIR=$ANDROID_DIR
    ssh m1 "mkdir -p ~/$REMOTE_DIR"
    sync
    # The upload key only exists on m1 while the build runs, in a private folder. Like the
    # Expo token in `ota`, its password never appears on a command line: it reaches Gradle
    # as android.injected.signing.* properties in android/gradle.properties (made private
    # first; the file has no final newline), and the lines are removed when the build ends.
    ssh m1 'umask 077; rm -rf ~/.hopwatch-upload; mkdir ~/.hopwatch-upload'
    bw-personal get attachment "$UPLOAD_KEY_FILE" --itemid "$UPLOAD_KEY_ITEM" --raw | ssh m1 'umask 077; cat > ~/.hopwatch-upload/key.p12'
    bw-personal get password "$UPLOAD_KEY_ITEM" | ssh m1 'umask 077; read -r pw; printf "%s\n" \
      "android.injected.signing.store.file=$HOME/.hopwatch-upload/key.p12" "android.injected.signing.store.password=$pw" \
      "android.injected.signing.key.alias=upload" "android.injected.signing.key.password=$pw" > ~/.hopwatch-upload/signing.properties'
    aab=android/app/build/outputs/bundle/release/app-release.aab
    # --clean: a release starts from a freshly generated android/ folder.
    remote "set -o pipefail; trap 'rm -rf ~/.hopwatch-upload; sed -i \"\" /android.injected.signing/d android/gradle.properties' EXIT; \
      export LANG=en_US.UTF-8 HOPWATCH_BUILD_NUMBER=$build; \
      npm ci --no-audit --no-fund && npx expo prebuild --platform android --no-install --clean && \
      chmod 600 android/gradle.properties && { echo; cat ~/.hopwatch-upload/signing.properties; } >>android/gradle.properties && \
      (cd android && $gradlew :app:bundleRelease | tail -30) && \
      \$JAVA_HOME/bin/keytool -printcert -jarfile $aab | grep -E 'Owner|SHA256:' && mkdir -p dist && cp $aab dist/hopwatch-$build.aab"
    mkdir -p dist
    scp -q "m1:$ANDROID_DIR/dist/hopwatch-$build.aab" dist/
    echo "dist/hopwatch-$build.aab"
    ;;
  asc)
    shift
    # The key is readable over plain SSH, so API calls don't queue behind builds.
    ssh -o LogLevel=error m1 "node --input-type=module - $(printf '%q ' "$@")" <scripts/asc.mjs
    ;;
  *)
    sed -n '2,30p' "$0"
    exit 1
    ;;
esac
