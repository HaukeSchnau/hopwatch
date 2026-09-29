#!/usr/bin/env bash
# Runs an on-device model request on the M1 builder (Apple Intelligence is enabled there),
# with the same JSON shape the app's on-device-model module takes:
#
#   echo '{"instructions":"…","prompt":"…","fields":[{"name":"emoji","description":"…"}]}' \
#     | scripts/model.sh
#
# Prints the answer as JSON on stdout and the latency on stderr.
set -euo pipefail
cd "$(dirname "$0")"

hash=$(sha1sum on-device-model.swift | cut -c1-12)
bin="/tmp/stint-on-device-model-$hash"
if ! ssh -n m1 "test -x $bin"; then
  scp -q on-device-model.swift "m1:$bin.swift"
  ssh -n m1 "xcrun swiftc -parse-as-library -O -o $bin $bin.swift" >&2
fi
ssh m1 "$bin"
