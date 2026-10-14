#!/usr/bin/env bash
set -euo pipefail

if [ "${HOMARR_NITRO_ACTIVATION:-}" != "accepted" ]; then
    echo "ERROR: Nitro candidate startup requires explicit accepted activation" >&2
    exit 1
fi

if [ "${DB_MIGRATIONS_DISABLED:-false}" != "false" ]; then
    echo "ERROR: Nitro candidate requires successful migration before listener startup" >&2
    exit 1
fi

reject_mysql() {
    echo "ERROR: MySQL is unsupported; convert to SQLite before startup" >&2
    exit 1
}

case "${DB_DIALECT:-}:${DB_DRIVER:-}" in
    mysql:*|mariadb:*|*:mysql2|*:mysql|*:mariadb) reject_mysql ;;
esac
case "${DB_URL:-}" in
    [mM][yY][sS][qQ][lL]:*|[mM][aA][rR][iI][aA][dD][bB]:*) reject_mysql ;;
esac

case "${DB_DIALECT:-}" in
    sqlite|postgresql) ;;
    *) echo "ERROR: DB_DIALECT must be sqlite or postgresql" >&2; exit 1 ;;
esac

if [ -z "${AUTH_SECRET:-}" ] || [ -z "${SECRET_ENCRYPTION_KEY:-}" ]; then
    echo "ERROR: Supply persistent AUTH_SECRET and SECRET_ENCRYPTION_KEY, directly or through _FILE inputs" >&2
    exit 1
fi

SHUTDOWN_TIMEOUT="${SERVER_SHUTDOWN_TIMEOUT:-30}"
if ! [[ "$SHUTDOWN_TIMEOUT" =~ ^([1-9]|[12][0-9]|30)$ ]]; then
    echo "ERROR: SERVER_SHUTDOWN_TIMEOUT must be 1-30 seconds" >&2
    exit 1
fi

MIGRATION_PID=""
terminate() {
    trap '' TERM INT
    if [ -n "$MIGRATION_PID" ]; then
        kill -TERM "$MIGRATION_PID" 2>/dev/null || true
        wait "$MIGRATION_PID" 2>/dev/null || true
    fi
    exit 143
}
trap terminate TERM INT

cd /app
test -s apps/nitro/.output/server/index.mjs
mkdir -p /appdata/db /appdata/trusted-certificates

test -s scripts/migrate-nitro.mjs
bun --no-env-file scripts/migrate-nitro.mjs &
MIGRATION_PID=$!
if wait "$MIGRATION_PID"; then
    MIGRATION_PID=""
else
    MIGRATION_PID=""
    echo "ERROR: DB migrations failed; aborting Nitro startup" >&2
    exit 1
fi

export NITRO_HOST="${NITRO_HOST:-0.0.0.0}"
export NITRO_PORT="${NITRO_PORT:-7575}"
export SERVER_SHUTDOWN_TIMEOUT="$SHUTDOWN_TIMEOUT"
unset CI TEST
exec bun --no-env-file apps/nitro/.output/server/index.mjs
