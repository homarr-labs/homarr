#!/bin/sh
set -e

export PUID=${PUID:-0}
export PGID=${PGID:-0}

echo "Starting with UID='$PUID', GID='$PGID'"

if [ "${PUID}" != "0" ] || [ "${PGID}" != "0" ]; then
    # The below command will change the owner of all files in the /app directory (except node_modules) to the new UID and GID
    echo "Changing owner to $PUID:$PGID, this will take about 10 seconds..."
    chown $PUID:$PGID ./run.sh
    chown $PUID:$PGID ./apps/cli
    chown $PUID:$PGID ./apps/nextjs/server.js
    chown $PUID:$PGID ./apps/nextjs/.next
    mkdir -p ./apps/nextjs/.next/cache
    chown $PUID:$PGID ./apps/nextjs/.next/cache
    chown $PUID:$PGID ./apps/websocket/wssServer.cjs
    chown $PUID:$PGID ./apps/tasks/tasks.cjs
    chown $PUID:$PGID ./db/migrations/sqlite/migrate.cjs
    chown $PUID:$PGID ./db/migrations/mysql/migrate.cjs
    chown $PUID:$PGID ./build/better_sqlite3.node
    chown -R $PUID:$PGID /var/cache/nginx
    chown -R $PUID:$PGID /var/log/nginx
    chown -R $PUID:$PGID /var/lib/nginx
    chown -R $PUID:$PGID /run/nginx/nginx.pid
    chown -R $PUID:$PGID /etc/nginx
    echo "Changing owner to $PUID:$PGID, done."
fi

if [ "${PUID}" != "0" ]; then
    exec su-exec $PUID:$PGID "$@"
else
    exec "$@"
fi
