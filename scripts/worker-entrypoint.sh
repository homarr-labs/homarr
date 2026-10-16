#!/bin/sh
set -eu

# Secrets remain outside the image, including Docker/Kubernetes file mounts.
for file_var in $(env | cut -d '=' -f 1 | grep '_FILE$' || true); do
    target_var=${file_var%_FILE}
    file_path=$(printenv "$file_var")
    if [ ! -f "$file_path" ]; then
        echo "ERROR: Secret file for $target_var is missing" >&2
        exit 1
    fi
    export "$target_var=$(tr -d '\n\r' < "$file_path")"
done

mkdir -p /appdata/db /appdata/trusted-certificates /appdata/worker
if [ "$(id -u)" = '0' ] && [ "${PUID:-1000}" != '0' ]; then
    chown "${PUID:-1000}:${PGID:-1000}" /appdata
    chown -R "${PUID:-1000}:${PGID:-1000}" /appdata/db /appdata/trusted-certificates /appdata/worker
    exec su-exec "${PUID:-1000}:${PGID:-1000}" "$0" "$@"
fi

bun /app/scripts/initialize-worker.ts
IFS= read -r SECRET_ENCRYPTION_KEY < "${HOMARR_WORKER_STATE_DIRECTORY:-/appdata/worker}/secret-encryption-key"
IFS= read -r AUTH_SECRET < "${HOMARR_WORKER_STATE_DIRECTORY:-/appdata/worker}/auth-secret"
export SECRET_ENCRYPTION_KEY AUTH_SECRET

if [ "$#" -gt 0 ]; then
    exec "$@"
fi

case "${DB_DIALECT:-sqlite}" in
    sqlite|postgresql) ;;
    *) echo 'ERROR: The worker supports SQLite and PostgreSQL.' >&2; exit 1 ;;
esac

child=''
stopping='false'
shutdown() {
    stopping='true'
    if [ -n "$child" ]; then
        kill -TERM "$child" 2>/dev/null || true
        wait "$child" 2>/dev/null || true
    fi
    exit 0
}
trap shutdown INT TERM

run_child() {
    "$@" &
    child=$!
    code=0
    wait "$child" || code=$?
    child=''
    return "$code"
}

if [ "${DB_MIGRATIONS_DISABLED:-false}" != 'true' ]; then
    echo 'Running database migrations with Bun'
    run_child bun /app/apps/worker/migrations/"${DB_DIALECT:-sqlite}".js /app/db/migrations/"${DB_DIALECT:-sqlite}"
fi

while [ "$stopping" = 'false' ]; do
    code=0
    run_child bun /app/apps/worker/index.js || code=$?
    if [ "$code" -ne 0 ]; then
        echo "ERROR: Backend exited with code $code" >&2
        exit "$code"
    fi
    # Backup restore requests a clean restart after replacing the database.
    echo 'Backend requested a restart, reopening the database'
done
