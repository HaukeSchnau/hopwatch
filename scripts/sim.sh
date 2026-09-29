#!/usr/bin/env bash
# Drives the project's simulators on the M1 builder over SSH.
#
#   scripts/sim.sh connect UDID [ROUTE]        (re)launch the dev client against the stint-metro
#                                              service, optionally opening ROUTE, e.g. /glass/day
#   scripts/sim.sh shot UDID OUT.png           save a screenshot locally (view it with Read)
#   scripts/sim.sh view UDID ROUTE OUT.png [S] relaunch into ROUTE, wait S more seconds (default 8),
#                                              screenshot; holds a per-simulator lock throughout
#   scripts/sim.sh run UDID ROUTE OUT.png STEP...
#                                              relaunch into ROUTE, wait for it, run each STEP (an
#                                              agent-device command line like 'press 200 400', or
#                                              'sleep 2'), then screenshot; all under the lock.
#                                              Use this for interactions on a shared simulator.
#   scripts/sim.sh bundle DIRECTION            build DIRECTION's bundle on its Metro; prints 200,
#                                              or the status and Metro's error
#   scripts/sim.sh ad UDID ARGS...             run one agent-device command against UDID (session
#                                              sf-UDID) under the lock, e.g. `ad UDID snapshot -i`;
#                                              run `ad UDID open dev.schnau.stint.five` first
#
# Launching takes ~15 s (it retries if the dev launcher times out on Metro). Set WAIT=seconds
# to change how long run/view wait after that before the first step (default 8).
#
# The route's first segment picks the Metro (glass → port 3101, deck 3102, almanac 3103,
# orbit 3104, jelly 3105); STINT_DIRECTION=all uses metro-all on 3100, which serves every
# direction (for checking the Lab and switching between directions);
# for routes like /lab set STINT_DIRECTION.
#
# Deep links opened from outside (simctl openurl) stop at iOS's "Open in …?" prompt, so
# routes are passed as a -stintRoute launch argument that the app reads in development.
set -euo pipefail

BUNDLE=dev.schnau.stint.five
AD='~/.t3/device/tools/agent-device@0.21.7/node_modules/.bin/agent-device'

# Each direction has its own Metro (agent-services metro-glass, stint-metro-deck,
# metro-almanac, stint-metro-orbit, jelly-dev) that ignores the
# other directions' files, so one builder's edits never rebuild another's bundle.
declare -A PORTS=([all]=3100 [glass]=3101 [deck]=3102 [almanac]=3103 [orbit]=3104 [jelly]=3105)
declare -A HOSTS=(
  [all]=px-b8ee4debfe-metro-all.schnau.dev
  [glass]=px-b8ee4debfe-metro-glass.schnau.dev
  [deck]=px-b8ee4debfe-stint-metro-deck.schnau.dev
  [almanac]=px-b8ee4debfe-metro-almanac.schnau.dev
  [orbit]=px-b8ee4debfe-stint-metro-orbit.schnau.dev
  [jelly]=px-b8ee4debfe-jelly-dev.schnau.dev
)

# The direction a route belongs to: its first segment, else $STINT_DIRECTION, else glass.
direction_of() {
  if [ "${STINT_DIRECTION:-}" = all ]; then echo all; return; fi
  local first="${1#/}"
  first="${first%%\?*}"
  first="${first%%/*}"
  if [ -n "${PORTS[$first]:-}" ]; then echo "$first"; else echo "${STINT_DIRECTION:-glass}"; fi
}

launch() {
  local route_args=""
  # %q quotes the route for the remote shell, so spaces and ? survive.
  [ -n "${2:-}" ] && route_args="-stintRoute $(printf '%q' "$2")"
  local dir port metro
  dir=$(direction_of "${2:-}")
  port=${PORTS[$dir]}
  metro="https://${HOSTS[$dir]}"
  for attempt in 1 2 3; do
    # The dev launcher gives up on the manifest after 10 s, and a busy Metro sometimes
    # takes longer. Warm it up first, then retry when the launcher logs a timeout.
    curl -s -m 90 -o /dev/null -H 'expo-platform: ios' "http://127.0.0.1:$port/" || true
    # --initialUrl makes the dev launcher load Metro directly. The EXDevMenu flags skip the
    # dev menu intro and hide its floating button, which would cover the app in screenshots.
    ssh m1 "xcrun simctl launch --terminate-running-process $1 $BUNDLE --initialUrl $metro \
      -EXDevMenuIsOnboardingFinished YES -EXDevMenuShowFloatingActionButton NO $route_args >/dev/null"
    sleep 14
    if ssh m1 "xcrun simctl spawn $1 log show --last 15s --style compact \
      --predicate 'process == \"StintFive\" AND eventMessage CONTAINS \"request timed out\"' 2>/dev/null" |
      grep -q "timed out"; then
      echo "sim.sh: manifest request timed out, relaunching (attempt $attempt)" >&2
      continue
    fi
    return 0
  done
}

# Serializes access to one simulator across builders; released when the script exits.
lock() {
  exec 9>"/tmp/stint-sim-$1.lock"
  flock 9
}

ad_cmd() {
  local udid="$1"
  shift
  ssh m1 "$AD $(printf '%q ' "$@") --session sf-$udid --platform ios --udid $udid"
}

shot() {
  local remote="/tmp/stint-shot-$$-$RANDOM.png"
  # Downscaled to 1000 px (or $SHOT_SIZE) so screenshots stay cheap to look at.
  ssh m1 "xcrun simctl io $1 screenshot --type=png $remote >/dev/null 2>&1 && sips -Z ${SHOT_SIZE:-1000} $remote >/dev/null && cat $remote && rm -f $remote" >"$2"
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
    lock "$udid"
    launch "$udid" "${3:?ROUTE}"
    sleep "${5:-${WAIT:-8}}"
    shot "$udid" "${4:?OUT.png}"
    ;;
  run)
    udid="${2:?UDID}" route="${3:?ROUTE}" out="${4:?OUT.png}"
    shift 4
    lock "$udid"
    launch "$udid" "$route"
    sleep "${WAIT:-8}"
    # Attaches agent-device's session to the running app (it doesn't relaunch it).
    ad_cmd "$udid" open "$BUNDLE" >/dev/null || echo "agent-device open failed" >&2
    for step in "$@"; do
      if [[ "$step" == sleep\ * ]]; then
        sleep "${step#sleep }"
      else
        # shellcheck disable=SC2086
        ad_cmd "$udid" $step || echo "step failed: $step" >&2
      fi
    done
    shot "$udid" "$out"
    ;;
  bundle)
    dir="${2:?DIRECTION}"
    out="/tmp/stint-bundle-$dir.js"
    code=$(curl -s -m 600 -o "$out" -w '%{http_code}' \
      "http://127.0.0.1:${PORTS[$dir]}/node_modules/expo-router/entry.bundle?platform=ios&dev=true&minify=false")
    echo "$code"
    [ "$code" = 200 ] || head -c 3000 "$out"
    ;;
  ad)
    udid="${2:?UDID}"
    shift 2
    lock "$udid"
    ad_cmd "$udid" "$@"
    ;;
  *)
    sed -n '2,27p' "$0"
    exit 1
    ;;
esac
