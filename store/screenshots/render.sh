#!/usr/bin/env bash
# Renders the App Store frames: every shot in shots.js, for each locale with captures in
# raw/<locale>/, into app-store/<locale>/NN-<id>.png at 1320 x 2868 (APP_IPHONE_67).
#
#   store/screenshots/render.sh             all locales
#   store/screenshots/render.sh de-DE       one locale
#
# Uses nixpkgs' Chromium (or $CHROME). The caption font, SF Pro Rounded, isn't checked in
# (Apple's license): the first run copies it from the M1 into fonts/ and fonts.py makes the
# static cuts that Chromium gets through fontconfig.
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -f fonts/hopwatch-rounded-black.ttf ]; then
  mkdir -p fonts
  [ -f fonts/SFNSRounded.ttf ] || scp -q m1:/System/Library/Fonts/SFNSRounded.ttf fonts/
  nix shell --impure --expr 'with import <nixpkgs> {}; python3.withPackages (p: [ p.fonttools ])' -c python3 fonts.py
fi

# Only the caption fonts: the frames show no other text.
fontconf=$(mktemp)
trap 'rm -f "$fontconf"' EXIT
cat >"$fontconf" <<EOF
<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig><dir>$PWD/fonts</dir><cachedir>${XDG_CACHE_HOME:-$HOME/.cache}/hopwatch-frames-fontconfig</cachedir></fontconfig>
EOF
export FONTCONFIG_FILE=$fontconf

CHROME=${CHROME:-$(nix build nixpkgs#chromium --no-link --print-out-paths)/bin/chromium}

ids=$(grep -oP "^\s+id: '\K[^']+" shots.js)
locales=${1:-$(ls raw)}
for locale in $locales; do
  mkdir -p "app-store/$locale"
  rm -f "app-store/$locale"/*.png
  n=0
  for id in $ids; do
    n=$((n + 1))
    out="app-store/$locale/$(printf '%02d' $n)-$id.png"
    # --timeout rather than --virtual-time-budget, which keeps local images from loading.
    "$CHROME" --headless --hide-scrollbars --force-device-scale-factor=1 --window-size=1320,2868 \
      --allow-file-access-from-files --timeout=3000 --screenshot="$PWD/$out" \
      "file://$PWD/frame.html?shot=$id&lang=$locale" 2>/dev/null >/dev/null
    echo "$out"
  done
  # Lossless recompression keeps every frame well under 1 MiB (Chromium's PNGs run to 1.2 MB).
  nix run nixpkgs#oxipng -- -o 4 --strip safe -q "app-store/$locale"/*.png
done
