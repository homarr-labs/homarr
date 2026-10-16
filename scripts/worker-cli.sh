#!/bin/sh
set -eu

# docker exec inherits image configuration, not the entrypoint's exports.
directory=${HOMARR_WORKER_STATE_DIRECTORY:-/appdata/worker}
if [ -z "${SECRET_ENCRYPTION_KEY:-}" ]; then
    IFS= read -r SECRET_ENCRYPTION_KEY < "$directory/secret-encryption-key"
fi
if [ -z "${AUTH_SECRET:-}" ]; then
    IFS= read -r AUTH_SECRET < "$directory/auth-secret"
fi
export SECRET_ENCRYPTION_KEY AUTH_SECRET
export HOMARR_CLI=true
exec bun /app/apps/worker/cli.js "$@"
