#!/usr/bin/env bash
# Full render with hard caps for the shared server: a user cgroup (no swap), low CPU/IO priority, temp files on disk.
# Stops the homestack compose project for the duration (KEEP_STACK=1 to skip) and always starts it again.
# Extra arguments go to `render.mjs video` (e.g. --from 40 --to 52).
set -euo pipefail
cd "$(dirname "$0")"
if [[ "${KEEP_STACK:-0}" != 1 ]]; then
  docker compose -p homestack stop
  trap 'docker compose -p homestack start' EXIT
fi
mkdir -p out/tmp
TMPDIR="$PWD/out/tmp" systemd-run --user --scope --quiet --unit="showreel-render-$$" \
  -p MemoryMax="${MEM_MAX:-7G}" -p MemoryHigh="${MEM_HIGH:-6G}" -p MemorySwapMax=0 -p CPUQuota="${CPU_QUOTA:-1000%}" \
  nice -n 10 ionice -c 3 node render.mjs video --workers "${WORKERS:-3}" --sub "${SUB:-4}" "$@"
