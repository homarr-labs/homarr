#!/bin/sh
set -eu

if [ "$(id -u)" -eq 0 ]; then
  chown -R pocketbase:pocketbase /pb_data
  exec su -p -s /bin/sh pocketbase -c 'exec /usr/local/bin/workshop-entrypoint'
fi

exec pocketbase serve \
  --http="0.0.0.0:${PORT:-8090}" \
  --origins="${PB_ALLOWED_ORIGINS:-*}" \
  --dir=/pb_data \
  --migrationsDir=/pb_migrations \
  --publicDir=/pb_public \
  --indexFallback=true
