#!/bin/sh
set -eu

if [ "${1:-}" != 'pair' ] || [ "$#" -ne 1 ]; then
    echo 'Usage: homarr-worker pair' >&2
    exit 1
fi

pairing_file="${HOMARR_WORKER_STATE_DIRECTORY:-/appdata/worker}/pairing.json"
if [ ! -r "$pairing_file" ]; then
    echo 'Pairing information is unavailable; start the worker first.' >&2
    exit 1
fi

# Explicit local operator access; this file is never served over HTTP.
cat "$pairing_file"
printf '\n'
