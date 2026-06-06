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
# 1. Replace the HOSTNAME in the nginx template file
# 2. Create the nginx configuration file from the template
# 3. Start the nginx server
export HOSTNAME
envsubst '${HOSTNAME}' < /etc/nginx/templates/nginx.conf > /etc/nginx/nginx.conf
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
