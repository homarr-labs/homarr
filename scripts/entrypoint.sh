#!/bin/sh
set -e

export PUID=${PUID:-0}
export PGID=${PGID:-0}

echo "Starting with UID='$PUID', GID='$PGID'"

if [ "${PUID}" != "0" ] || [ "${PGID}" != "0" ]; then
    # Only chown the paths the non-root user must actually write to at runtime.
    # Recursively chowning the whole /app tree is extremely slow on network- or
    # HDD-backed storage (e.g. TrueNAS Apps), because the Next.js standalone
    # bundle and its node_modules contain tens of thousands of tiny files. This
    # turned a ~10s step into 15+ minutes for some users (#2190). Application
    # code, migrations and native modules are only read/executed, so they stay
    # owned by root and do not need chowning.
    echo "Changing owner to $PUID:$PGID..."
    # Application data volume (db, redis dumps, trusted certificates).
    # Ensure the known subdirectories exist and migrate ownership of any
    # existing content, so a persistent volume with stale or root-owned
    # entries stays writable after a PUID/PGID change. These trees are small
    # (a single sqlite db, a redis dump, a few certs), unlike the /app tree.
    mkdir -p /appdata/db /appdata/redis /appdata/trusted-certificates
    chown "${PUID}:${PGID}" /appdata
    chown -R "${PUID}:${PGID}" /appdata/db /appdata/redis /appdata/trusted-certificates
    # Next.js runtime cache (image optimization, fetch cache, ...)
    mkdir -p /app/apps/nextjs/.next/cache
    chown -R "${PUID}:${PGID}" /app/apps/nextjs/.next/cache
    # nginx runtime directories and the rendered configuration
    chown -R "${PUID}:${PGID}" /var/cache/nginx
    chown -R "${PUID}:${PGID}" /var/log/nginx
    chown -R "${PUID}:${PGID}" /var/lib/nginx
    chown -R "${PUID}:${PGID}" /run/nginx/nginx.pid
    chown -R "${PUID}:${PGID}" /etc/nginx
    echo "Changing owner to $PUID:$PGID, done."
fi

# support _FILE Suffix for environment variables
for file_var in $(env | cut -d '=' -f 1 | grep "_FILE$"); do
    target_var=$(echo "$file_var" | cut -d'=' -f1 | sed 's/_FILE//')
    file_path=$(printenv "$file_var")

    if [ -f "$file_path" ]; then
        export "$target_var"=$(cat "$file_path" | tr -d '\n\r')
        echo "Info: Loaded secret for $target_var from $file_path"
    else
        echo "Warning: Secret file $file_path not found for $target_var"
    fi
done

if [ "${PUID}" != "0" ]; then
    exec su-exec $PUID:$PGID "$@"
else
    exec "$@"
fi
