#!/usr/bin/env bash
# Runs an on-device model request on this Mac (it needs Apple Intelligence), with the same JSON
# shape the app's on-device-model module takes:
#
#   echo '{"instructions":"…","prompt":"…","fields":[{"name":"emoji","description":"…"}]}' \
#     | scripts/model.sh
#
# Prints the answer as JSON on stdout and the latency on stderr.
set -euo pipefail
cd "$(dirname "$0")"

hash=$(shasum on-device-model.swift | cut -c1-12)
bin="${TMPDIR:-/tmp}/hopwatch-on-device-model-$hash"
[ -x "$bin" ] || xcrun swiftc -parse-as-library -O -o "$bin" on-device-model.swift >&2
"$bin"
