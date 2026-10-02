#!/usr/bin/env bash
# Renders the store frames from the shots in shots.js.
#
#   store/screenshots/render.sh               App Store: for each locale with captures in
#                                             raw/<locale>/, app-store/<locale>/NN-<id>.png at
#                                             1320 x 2868 (APP_IPHONE_67)
#   store/screenshots/render.sh de-DE         App Store, one locale
#   store/screenshots/render.sh play [LOCALE] Google Play: for each set (phone, tablet-7,
#                                             tablet-10) and locale with captures in
#                                             raw/android/<set>/<locale>/,
#                                             play/<locale>/<set>/NN-<id>.png at 1080 x 1920
#                                             (tablet-10: 1440 x 2560)
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

# The shot ids for a store in shots.js order, leaving out shots that are `only` for another.
ids() {
  awk -F"'" -v store="$1" '
    /^  \{/ { id = ""; only = "" }
    /^    id: / { id = $2 }
    /^    only: / { only = $2 }
    /^  \},/ { if (id != "" && (only == "" || only == store)) print id }
  ' shots.js
}

# Renders the shots for STORE into DIR, a window of WIDTH,HEIGHT CSS px at SCALE; QUERY
# goes to frame.html.
render() {
  local store="$1" dir="$2" window="$3" scale="$4" query="$5" n=0
  mkdir -p "$dir"
  rm -f "$dir"/*.png
  for id in $(ids "$store"); do
    n=$((n + 1))
    out="$dir/$(printf '%02d' $n)-$id.png"
    # --timeout rather than --virtual-time-budget, which keeps local images from loading.
    "$CHROME" --headless --hide-scrollbars --force-device-scale-factor="$scale" --window-size="$window" \
      --allow-file-access-from-files --timeout=3000 --screenshot="$PWD/$out" \
      "file://$PWD/frame.html?shot=$id&$query" 2>/dev/null >/dev/null
    echo "$out"
  done
  # Lossless recompression keeps every frame under 1 MiB (Chromium's PNGs run to 1.2 MB).
  nix run nixpkgs#oxipng -- -o 4 --strip safe -q "$dir"/*.png
}

if [ "${1:-}" = play ]; then
  for set in phone tablet-7 tablet-10; do
    # The 10-inch set needs 1080 px or more on each side, so it's the same page at 4/3.
    scale=1
    [ "$set" = tablet-10 ] && scale=1.3333333333
    for locale in ${2:-$(ls "raw/android/$set")}; do
      render play "play/$locale/$set" 1080,1920 "$scale" "lang=$locale&set=$set"
    done
  done
else
  for locale in ${1:-$(cd raw && ls -d ??-??)}; do
    render app-store "app-store/$locale" 1320,2868 1 "lang=$locale"
  done
fi
