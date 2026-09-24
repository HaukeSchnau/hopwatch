#!/usr/bin/env bash
# Drives the project's simulators on the M1 builder over SSH.
#
#   scripts/sim.sh connect UDID [ROUTE]        (re)launch the dev client against the stint-metro
#                                              service, optionally opening ROUTE, e.g. /glass/day
#   scripts/sim.sh shot UDID OUT.png           save a screenshot locally (view it with Read)
#   scripts/sim.sh view UDID ROUTE OUT.png [S] relaunch into ROUTE, wait S seconds (default 12),
#                                              screenshot; holds a per-simulator lock throughout
#   scripts/sim.sh ad UDID ARGS...             run agent-device on the builder against UDID with
#                                              session sf-UDID, e.g. `ad UDID press 200 400`
#
# Deep links opened from outside (simctl openurl) stop at iOS's "Open in …?" prompt, so
# routes are passed as a -stintRoute launch argument that the app reads in development.
set -euo pipefail

BUNDLE=dev.schnau.stint.five
METRO=https://px-b8ee4debfe-stint-metro.schnau.dev
AD='~/.t3/device/tools/agent-device@0.21.7/node_modules/.bin/agent-device'

launch() {
  local route_args=""
  [ -n "${2:-}" ] && route_args="-stintRoute '$2'"
  # --initialUrl makes the dev launcher load Metro directly.
  ssh m1 "xcrun simctl launch --terminate-running-process $1 $BUNDLE --initialUrl $METRO $route_args >/dev/null"
}

shot() {
  local remote="/tmp/stint-shot-$$-$RANDOM.png"
  # Downscaled to 1000 px so screenshots stay cheap to look at.
  ssh m1 "xcrun simctl io $1 screenshot --type=png $remote >/dev/null 2>&1 && sips -Z 1000 $remote >/dev/null && cat $remote && rm -f $remote" >"$2"
}

case "${1:-}" in
  connect)
    launch "${2:?UDID}" "${3:-}"
    ;;
  shot)
    shot "${2:?UDID}" "${3:?OUT.png}"
    ;;
  view)
    udid="${2:?UDID}"
    exec 9>"/tmp/stint-sim-$udid.lock"
    flock 9
    launch "$udid" "${3:?ROUTE}"
    sleep "${5:-12}"
    shot "$udid" "${4:?OUT.png}"
    ;;
  ad)
    udid="${2:?UDID}"
    shift 2
    ssh m1 "$AD $(printf '%q ' "$@") --session sf-$udid --platform ios --udid $udid"
    ;;
  *)
    sed -n '2,15p' "$0"
    exit 1
    ;;
esac
