#!/usr/bin/env bash

MIGRATION_PID=""
BACKEND_PID=""
NEXTJS_PID=""
NGINX_PID=""
REDIS_PID=""
SHUTTING_DOWN=false

stop_process() {
    if [ -n "$1" ]; then
        kill -TERM "$1" 2>/dev/null
        wait "$1" 2>/dev/null
    fi
}

terminate() {
    trap '' TERM INT
    SHUTTING_DOWN=true
    echo "Shutting down..."
    stop_process "$MIGRATION_PID"
    stop_process "$NGINX_PID"
    stop_process "$NEXTJS_PID"
    stop_process "$BACKEND_PID"
    stop_process "$REDIS_PID"
    echo "Shutdown complete."
    exit 0
}

# Install before migrations: a foreground child defers the shell's signal trap.
trap terminate TERM INT

# Check before creating SQLite files or invoking a removed migration bundle.
reject_mysql() {
  echo "ERROR: MySQL is no longer supported in v2. Use the MySQL-to-SQLite converter before starting Homarr."
  exit 1
}
case "$DB_DIALECT:$DB_DRIVER" in
  mysql:*|mariadb:*|*:mysql2|*:mysql|*:mariadb) reject_mysql ;;
esac
case "$DB_URL" in
  [mM][yY][sS][qQ][lL]:*|[mM][aA][rR][iI][aA][dD][bB]:*) reject_mysql ;;
esac

# Create sub directories in volume
mkdir -p /appdata/db
mkdir -p /appdata/redis
mkdir -p /appdata/trusted-certificates

# Run migrations
if [ "$DB_MIGRATIONS_DISABLED" = "true" ]; then
  echo "DB migrations are disabled, skipping"
else
    echo "Running DB migrations"
    DISABLE_REDIS_LOGS=true node ./db/migrations/$DB_DIALECT/migrate.cjs ./db/migrations/$DB_DIALECT &
    MIGRATION_PID=$!
    wait "$MIGRATION_PID"
    MIGRATION_EXIT_CODE=$?
    MIGRATION_PID=""
    if [ "$MIGRATION_EXIT_CODE" -ne 0 ]; then
        echo "ERROR: DB migrations failed, aborting startup"
        exit 1
    fi
fi

# Keep an explicitly configured secret stable across independent backend replicas.
if [ -z "${AUTH_SECRET:-}" ]; then
    AUTH_SECRET=$(openssl rand -base64 32) || exit 1
    export AUTH_SECRET
fi

HOMARR_REQUEST_IDENTITY_SECRET=$(openssl rand -hex 32) || exit 1
export HOMARR_REQUEST_IDENTITY_SECRET
NGINX_TRUSTED_PROXIES=$(node ./scripts/trusted-proxies.mjs) || exit 1
export NGINX_TRUSTED_PROXIES
export HOMARR_FRONTEND_ENABLED=${HOMARR_FRONTEND_ENABLED:-true}
if [ "$HOMARR_FRONTEND_ENABLED" = "true" ]; then
    export NGINX_FRONTEND_UPSTREAM=${NGINX_FRONTEND_UPSTREAM:-http://127.0.0.1:3000}
else
    export NGINX_FRONTEND_UPSTREAM=${NGINX_FRONTEND_UPSTREAM:-http://127.0.0.1:3002}
fi

# Start nginx proxy
# 1. Create the nginx configuration file from the template
# 2. Start the nginx server
# Only listen on IPv6 when the host actually has IPv6 configured (#4596).
# Otherwise nginx aborts with "socket() [::]:7575 failed (97: Address family
# not supported by protocol)". Check HOMARR_DISABLE_IPV6 first so users can
# force IPv4-only even when the host supports IPv6, then probe for IPv6
# addresses via grep (not -s: proc files always report size 0).
export NGINX_LISTEN_IPV6=''
if [ "${HOMARR_DISABLE_IPV6:-false}" != "true" ] && grep -q . /proc/net/if_inet6 2>/dev/null; then
    NGINX_LISTEN_IPV6='listen [::]:7575;'
fi
envsubst '${NGINX_LISTEN_IPV6} ${NGINX_TRUSTED_PROXIES} ${HOMARR_REQUEST_IDENTITY_SECRET} ${NGINX_FRONTEND_UPSTREAM}' < /etc/nginx/templates/nginx.conf > /etc/nginx/nginx.conf
nginx -t || exit 1
# Start services in the background and store their PIDs
nginx -g 'daemon off;' &
NGINX_PID=$!

if [ "$REDIS_IS_EXTERNAL" = "true" ]; then
    echo "Using external Redis server at redis://$REDIS_HOST:$REDIS_PORT"
    REDIS_PID=""
else
    echo "Starting internal Redis server"
    redis-server /app/redis.conf &
    REDIS_PID=$!
fi

# The HTTP backend owns initialization, scheduled tasks and subscriptions.
bun apps/backend/index.js &
BACKEND_PID=$!

if [ "$HOMARR_FRONTEND_ENABLED" = "true" ]; then
    # Next.js standalone uses HOSTNAME as its bind address. Docker's generated
    # hostname can be unresolvable, so bind explicitly behind nginx.
    export HOSTNAME=0.0.0.0
    export NODE_OPTIONS="--max-semi-space-size=4 ${NODE_OPTIONS:-}"
    node apps/nextjs/server.js &
    NEXTJS_PID=$!
fi

# Backup restore exits the backend cleanly so it can reopen the replaced DB.
# Unexpected failures stop the group for the container restart policy.
while true; do
    EXITED_PID=""
    wait -n -p EXITED_PID "$BACKEND_PID" "$NGINX_PID" ${NEXTJS_PID:+"$NEXTJS_PID"} ${REDIS_PID:+"$REDIS_PID"}
    EXIT_CODE=$?

    if [ "$SHUTTING_DOWN" = true ]; then
        break
    fi

    if [ "$EXIT_CODE" -eq 0 ] && [ "$EXITED_PID" = "$BACKEND_PID" ]; then
        echo "Backend requested a restart, reopening the database..."
        bun apps/backend/index.js &
        BACKEND_PID=$!
        continue
    fi

    echo "A required service exited with code $EXIT_CODE, shutting down..."
    stop_process "$NGINX_PID"
    stop_process "$NEXTJS_PID"
    stop_process "$BACKEND_PID"
    stop_process "$REDIS_PID"
    if [ "$EXIT_CODE" -eq 0 ]; then
        EXIT_CODE=1
    fi
    exit "$EXIT_CODE"
done
