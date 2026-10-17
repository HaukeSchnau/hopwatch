#!/usr/bin/env bash
# Builds a release AAB with a fresh versionCode, signed with the Play upload key, and releases it
# to Google Play's internal testing track. Calder's play step runs this on the M1 builder. The upload
# key comes from the project's Calder secrets: UPLOAD_KEYSTORE names a file with the PKCS12 keystore
# in base64, UPLOAD_KEYSTORE_PASSWORD one with its password (store and key share it, alias
# "upload"). The M1's gplay brings the Urbs UG service account itself (~/infra, app-stores).
set -euo pipefail
cd "$(dirname "$0")/.."

# A versionCode Play hasn't seen: app.config.ts turns this UTC timestamp into minutes.
HOPWATCH_BUILD_NUMBER=$(date -u +%Y%m%d%H%M)
export HOPWATCH_BUILD_NUMBER LANG=en_US.UTF-8
echo "build $HOPWATCH_BUILD_NUMBER"

pnpm install --frozen-lockfile
pnpm exec expo prebuild --platform android --no-install --clean

# Gradle takes the upload key from android.injected.signing.* properties. They go in the
# generated, private gradle.properties rather than on a command line, and leave with the key.
umask 077
key=$(mktemp -d)
trap 'rm -rf "$key" android/gradle.properties' EXIT
base64 -d <"$UPLOAD_KEYSTORE" >"$key/upload.p12"
password=$(<"$UPLOAD_KEYSTORE_PASSWORD")
chmod 600 android/gradle.properties
{
  echo
  printf '%s\n' \
    "android.injected.signing.store.file=$key/upload.p12" \
    "android.injected.signing.store.password=$password" \
    "android.injected.signing.key.alias=upload" \
    "android.injected.signing.key.password=$password"
} >>android/gradle.properties

# --no-daemon: the builder is shared, so no Gradle daemon should linger for hours.
(cd android && ./gradlew --no-daemon --console=plain --quiet --init-script ../scripts/android-sdk.gradle :app:bundleRelease)
aab=android/app/build/outputs/bundle/release/app-release.aab
"$JAVA_HOME/bin/keytool" -printcert -jarfile "$aab" | grep -E 'Owner|SHA256:'
gplay release --package dev.schnau.hopwatch --track internal --bundle "$aab"
