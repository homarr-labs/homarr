#!/usr/bin/env bash

MIGRATION_PID=""
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
    stop_process "$NEXTJS_PID"
    stop_process "$NGINX_PID"
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

# Auth secret is generated every time the container starts as it is required, but not used because we don't need JWTs or Mail hashing
export AUTH_SECRET=$(openssl rand -base64 32)

HOMARR_REQUEST_IDENTITY_SECRET=$(openssl rand -hex 32) || exit 1
export HOMARR_REQUEST_IDENTITY_SECRET
NGINX_TRUSTED_PROXIES=$(node ./scripts/trusted-proxies.mjs) || exit 1
export NGINX_TRUSTED_PROXIES

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
export NGINX_USER=''
if [ "$(id -u)" = "0" ] && id www-data >/dev/null 2>&1; then
    NGINX_USER='user www-data;'
fi
# Preserve ordinary compiled temp roots without reusing old worker-owned buckets.
# nginx -V loses custom path whitespace/quoting; inherit its default if ambiguous.
NGINX_BUILD_OPTIONS=$(nginx -V 2>&1) || exit 1
NGINX_PROXY_TEMP_DIRECTIVE=$(printf '%s\n' "$NGINX_BUILD_OPTIONS" | awk '
    /^configure arguments:/ {
        lines++
        args = substr($0, length("configure arguments:") + 1)
        path = "proxy_temp"
        valid = 1
        safe = 1
        while (length(args)) {
            sub(/^[ \t]+/, "", args)
            if (!length(args)) break
            if (!match(args, /^--[-_a-zA-Z0-9]+(=|[ \t]|$)/)) { valid = 0; break }
            has_value = substr(args, RLENGTH, 1) == "="
            option = substr(args, 1, RLENGTH)
            sub(/[= \t]$/, "", option)
            args = substr(args, RLENGTH + 1)
            value = ""
            if (!has_value) {
                if (option == "--http-proxy-temp-path") { valid = 0; break }
                continue
            }
            if (substr(args, 1, 1) == "\047") {
                if (option == "--http-proxy-temp-path" || option == "--build") { valid = 0; break }
                args = substr(args, 2)
                closing = index(args, "\047")
                if (!closing) { valid = 0; break }
                value = "\047" substr(args, 1, closing)
                args = substr(args, closing + 1)
                if (length(args) && args !~ /^[ \t]/) { valid = 0; break }
            } else {
                match(args, /^[^ \t]*/)
                value = substr(args, 1, RLENGTH)
                args = substr(args, RLENGTH + 1)
                if (index(value, "\047")) { valid = 0; break }
            }
            if (option == "--http-proxy-temp-path") {
                path = value
                if (!length(path)) path = "proxy_temp"
                safe = path ~ /^[-_a-zA-Z0-9\/.]+$/
            }
        }
    }
    END {
        if (lines == 1 && valid && safe) printf "proxy_temp_path \"%s\";", path
    }
') || exit 1
export NGINX_PROXY_TEMP_DIRECTIVE
envsubst '${NGINX_USER} ${NGINX_LISTEN_IPV6} ${NGINX_TRUSTED_PROXIES} ${HOMARR_REQUEST_IDENTITY_SECRET} ${NGINX_PROXY_TEMP_DIRECTIVE}' < /etc/nginx/templates/nginx.conf > /etc/nginx/nginx.conf
# Native installs bypass the Docker entrypoint, and /run is cleared on reboot.
mkdir -p /run/nginx || exit 1
nginx -t -g 'pid /run/nginx/nginx.pid;' || exit 1
# Start services in the background and store their PIDs
nginx -g 'daemon off; pid /run/nginx/nginx.pid;' &
NGINX_PID=$!

if [ "$REDIS_IS_EXTERNAL" = "true" ]; then
    echo "Using external Redis server at redis://$REDIS_HOST:$REDIS_PORT"
    REDIS_PID=""
else
    echo "Starting internal Redis server"
    redis-server /app/redis.conf --protected-mode yes &
    REDIS_PID=$!
fi

# Next.js standalone uses HOSTNAME as its bind address. Docker's generated
# hostname can be unresolvable, so bind explicitly while nginx uses loopback.
export HOSTNAME=0.0.0.0
export NODE_OPTIONS="--max-semi-space-size=4 ${NODE_OPTIONS:-}"
node apps/nextjs/server.js &
NEXTJS_PID=$!

while true; do
    wait $NEXTJS_PID
    EXIT_CODE=$?

    if [ "$SHUTTING_DOWN" = true ]; then
        break
    fi

    echo "Next.js exited with code $EXIT_CODE, restarting in 1s..."
    sleep 1
    node apps/nextjs/server.js &
    NEXTJS_PID=$!
done
