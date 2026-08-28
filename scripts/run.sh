#!/usr/bin/env bash

# Create sub directories in volume
mkdir -p /appdata/db
mkdir -p /appdata/redis
mkdir -p /appdata/trusted-certificates

# Run migrations
if [ "$DB_MIGRATIONS_DISABLED" = "true" ]; then
  echo "DB migrations are disabled, skipping"
else
    echo "Running DB migrations"
    DISABLE_REDIS_LOGS=true node ./db/migrations/$DB_DIALECT/migrate.cjs ./db/migrations/$DB_DIALECT
    if [ $? -ne 0 ]; then
        echo "ERROR: DB migrations failed, aborting startup"
        exit 1
    fi
fi

# Auth secret is generated every time the container starts as it is required, but not used because we don't need JWTs or Mail hashing
export AUTH_SECRET=$(openssl rand -base64 32)

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
envsubst '${NGINX_LISTEN_IPV6}' < /etc/nginx/templates/nginx.conf > /etc/nginx/nginx.conf
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

SHUTTING_DOWN=false

terminate() {
    SHUTTING_DOWN=true
    echo "Shutting down..."
    kill -TERM $NEXTJS_PID 2>/dev/null
    wait $NEXTJS_PID 2>/dev/null
    kill -TERM $NGINX_PID 2>/dev/null
    wait $NGINX_PID 2>/dev/null
    if [ -n "$REDIS_PID" ]; then
        kill -TERM $REDIS_PID 2>/dev/null
        wait $REDIS_PID 2>/dev/null
    fi
    echo "Shutdown complete."
    exit 0
}

trap terminate TERM INT

# Next.js standalone uses HOSTNAME as its bind address. Docker's generated
# hostname can be unresolvable, so bind explicitly while nginx uses loopback.
export HOSTNAME=0.0.0.0
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
