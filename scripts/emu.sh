#!/usr/bin/env bash
# Drives the project's Android emulator on the M1 builder over SSH: the AVD "hopwatch-pixel"
# (Pixel 9, Android 16 with Google APIs), always on console port 5584, so its adb serial is
# emulator-5584. It runs headless on the host GPU. Other emulators on m1 belong to other
# projects; leave them alone.
#
#   scripts/emu.sh boot                       start the emulator unless it runs, wait for boot
#   scripts/emu.sh stop                       shut it down (it holds ~3 GB on the shared M1)
#   scripts/emu.sh connect [ROUTE]            (re)launch the dev client against Metro,
#                                             optionally opening ROUTE, e.g. /day
#   scripts/emu.sh shot OUT.png               save a screenshot locally (view it with Read)
#   scripts/emu.sh view ROUTE OUT.png [S]     relaunch into ROUTE, wait S more seconds (default 8),
#                                             screenshot; holds the lock throughout
#   scripts/emu.sh run ROUTE OUT.png STEP...  relaunch into ROUTE, wait, run each STEP, then
#                                             screenshot; all under the lock. Steps:
#                                               'tap X Y'  'swipe X1 Y1 X2 Y2 [MS]'  'type TEXT'
#                                               'back'  'key KEYCODE'  'link URL'  'sleep S'
#                                               'ad ARGS' (an agent-device command, e.g. 'ad press @e22')
#   scripts/emu.sh tap|swipe|type|back|key|link|ad ARGS
#                                             one step on its own, under the lock; `ad snapshot -i`
#                                             lists the screen's elements with @refs to press
#   scripts/emu.sh logs [N]                   the last N (default 200) lines of JS and crash logs
#   scripts/emu.sh bundle                     build the Android bundle on Metro; prints 200, or the
#                                             status and Metro's error
#   scripts/emu.sh adb ARGS...                any adb command against the emulator, under the lock
#
# Coordinates (tap, swipe) are pixels in this script's screenshots, which are SHOT_SIZE
# (default 1000) px tall, so you can read them straight off an image. ROUTE becomes the deep
# link hopwatch://ROUTE, so /stop, /resume and /start?context=… run those actions rather than
# open a screen. WAIT=seconds changes how long run/view wait after launching (default 8).
# EMU_LANG=de sets Android's per-app language for the launch (en otherwise; the app must
# read the Android locale for it to show). EMU_DARK=1 launches in dark mode.
#
# Install a new dev client with `scripts/m1.sh android-dev && scripts/m1.sh android-install`.
set -euo pipefail

AVD=hopwatch-pixel
PORT=5584
SERIAL=emulator-$PORT
PACKAGE=dev.schnau.hopwatch
AD='~/.t3/device/tools/agent-device@0.21.7/node_modules/.bin/agent-device'
SHOT_SIZE=${SHOT_SIZE:-1000}

# The development Metro (agent-service metro-all) and its Tailnet URL, which the
# emulator reaches through the M1's Tailscale.
METRO_PORT=3100
METRO_HOST=px-b8ee4debfe-metro-all.schnau.dev

m1() { ssh -o LogLevel=error m1 "$@"; }
adb_() { m1 "adb -s $SERIAL $(printf '%q ' "$@")"; }

# Serializes access to the emulator across agents on this machine; released on exit.
lock() {
  exec 9>/tmp/hopwatch-emu.lock
  flock 9
}

boot() {
  # Headless on the host GPU (Metal through gfxstream), which Skia needs to be judged fairly.
  m1 "pgrep -f 'avd $AVD ' >/dev/null || nohup emulator -avd $AVD -port $PORT -no-window -no-audio \
    -no-boot-anim -gpu host >~/.android/$AVD.log 2>&1 </dev/null &"
  for _ in $(seq 90); do
    [ "$(m1 "adb -s $SERIAL shell getprop sys.boot_completed 2>/dev/null" | tr -d '\r')" = 1 ] && return 0
    sleep 2
  done
  echo "emu.sh: no boot after 3 minutes, see m1:~/.android/$AVD.log" >&2
  return 1
}

# Sets HEIGHT, the screen's height in device pixels, once per run.
HEIGHT=
measure() {
  [ -n "$HEIGHT" ] || HEIGHT=$(m1 "adb -s $SERIAL shell wm size" | awk -F'[x ]' '/Physical/ {print $NF}' | tr -d '\r')
}

# Converts screenshot pixels to device pixels (after `measure`): prints each argument scaled.
to_device() {
  for value in "$@"; do awk -v v="$value" -v h="$HEIGHT" -v s="$SHOT_SIZE" 'BEGIN { printf "%d ", v * h / s + 0.5 }'; done
}

launch() {
  local metro="https://$METRO_HOST"
  m1 "adb -s $SERIAL shell cmd locale set-app-locales $PACKAGE --locales ${EMU_LANG:-en}; \
    adb -s $SERIAL shell cmd uimode night $([ "${EMU_DARK:-}" = 1 ] && echo yes || echo no) >/dev/null; \
    adb -s $SERIAL shell am force-stop $PACKAGE"
  # The dev launcher gives up on the manifest after a few seconds and a busy Metro can take
  # longer, so warm it up first (the same trick as scripts/sim.sh).
  curl -s -m 90 -o /dev/null -H 'expo-platform: android' "http://127.0.0.1:$METRO_PORT/" || true
  # The dev launcher takes this link under any of the app's schemes; it only checks the host.
  m1 "adb -s $SERIAL shell am start -W -a android.intent.action.VIEW \
    -d $(printf '%q' "'hopwatch://expo-development-client/?url=$(jq -rn --arg u "$metro" '$u|@uri')'") $PACKAGE >/dev/null"
  sleep 12
  if [ -n "${1:-}" ]; then
    link "hopwatch://${1#/}"
    sleep 2
  fi
}

link() {
  m1 "adb -s $SERIAL shell am start -a android.intent.action.VIEW -d $(printf '%q' "'$1'") $PACKAGE >/dev/null"
}

shot() {
  local remote="/tmp/hopwatch-shot-$$-$RANDOM.png"
  m1 "adb -s $SERIAL exec-out screencap -p >$remote && sips -Z $SHOT_SIZE $remote >/dev/null && cat $remote && rm -f $remote" >"$1"
}

# One input step, e.g. `step tap 200 400` or `step type hello`.
step() {
  local verb="$1"
  shift
  case "$verb" in
    tap) measure && adb_ shell input tap $(to_device "$1" "$2") ;;
    swipe) measure && adb_ shell input swipe $(to_device "$1" "$2" "$3" "$4") "${5:-300}" ;;
    # `input text` takes %s for spaces and needs shell metacharacters escaped on the device.
    type) adb_ shell input text "$(printf '%q' "${*// /%s}")" ;;
    back) adb_ shell input keyevent KEYCODE_BACK ;;
    key) adb_ shell input keyevent "$1" ;;
    link) link "$1" ;;
    sleep) sleep "$1" ;;
    ad) m1 "$AD $(printf '%q ' "$@") --session hopwatch-emu --platform android --serial $SERIAL" ;;
    *)
      echo "emu.sh: unknown step '$verb'" >&2
      return 1
      ;;
  esac
}

case "${1:-}" in
  boot)
    lock
    boot
    ;;
  stop)
    lock
    m1 "adb -s $SERIAL emu kill" >/dev/null || true
    ;;
  connect)
    lock
    boot
    launch "${2:-}"
    ;;
  shot)
    shot "${2:?OUT.png}"
    ;;
  view)
    route="${2:?ROUTE}" out="${3:?OUT.png}"
    lock
    boot
    launch "$route"
    sleep "${4:-${WAIT:-8}}"
    shot "$out"
    ;;
  run)
    route="${2:?ROUTE}" out="${3:?OUT.png}"
    shift 3
    lock
    boot
    launch "$route"
    sleep "${WAIT:-8}"
    for s in "$@"; do
      # shellcheck disable=SC2086
      step $s || echo "step failed: $s" >&2
    done
    shot "$out"
    ;;
  tap | swipe | type | back | key | link | ad)
    lock
    step "$@"
    ;;
  logs)
    m1 "adb -s $SERIAL logcat -d -v brief ReactNativeJS:V ReactNative:W AndroidRuntime:E '*:S' | tail -n ${2:-200}"
    ;;
  bundle)
    out=/tmp/hopwatch-android-bundle.js
    code=$(curl -s -m 600 -o "$out" -w '%{http_code}' \
      "http://127.0.0.1:$METRO_PORT/node_modules/expo-router/entry.bundle?platform=android&dev=true&minify=false")
    echo "$code"
    [ "$code" = 200 ] || head -c 3000 "$out"
    ;;
  adb)
    shift
    lock
    adb_ "$@"
    ;;
  *)
    sed -n '2,35p' "$0"
    exit 1
    ;;
esac
