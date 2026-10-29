#!/usr/bin/env bash
# Sends the newest store build of one platform to everyone, once the store approves it (both
# publish on approval). Calder runs it on the Mac agent for `{"release":"store"}`.
#   ios       pushes the listing in store/app-store/ to app.json's version (scripts/app-store.mjs),
#             attaches that version's newest TestFlight build and submits it for App Store review.
#   android   promotes the internal testing release to production, with the release notes in
#             store/play/<locale>/release_notes.txt.
set -euo pipefail
cd "$(dirname "$0")/.."

case "${1:?ios or android}" in
  ios)
    node scripts/app-store.mjs
    asc review submit --app 6818526671 --version "$(node -p 'require("./app.json").expo.version')" \
      --latest --wait --confirm
    ;;
  android)
    notes=$(node -e '
      const { readdirSync, readFileSync } = require("node:fs");
      const notes = readdirSync("store/play", { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && entry.name !== "graphics")
        .map(({ name }) => ({ language: name, text: readFileSync("store/play/" + name + "/release_notes.txt", "utf8").trim() }));
      console.log(JSON.stringify(notes));')
    gplay promote --package dev.schnau.hopwatch --from internal --to production --release-notes "$notes"
    ;;
  *)
    echo "usage: scripts/store.sh ios|android" >&2
    exit 2
    ;;
esac
