#!/bin/sh
set -eu

if [ -n "${PB_SUPERUSER_EMAIL:-}" ] && [ -n "${PB_SUPERUSER_PASSWORD:-}" ]; then
  pocketbase superuser upsert "${PB_SUPERUSER_EMAIL}" "${PB_SUPERUSER_PASSWORD}" --dir=/pb_data
fi

echo "Workshop: ${PB_PUBLIC_URL:-http://localhost:8090}/workshop"
echo "Workshop API: ${PB_PUBLIC_URL:-http://localhost:8090}/api"

exec pocketbase serve \
  --http=0.0.0.0:8090 \
  --origins="${PB_ALLOWED_ORIGINS:-*}" \
  --dir=/pb_data \
  --hooksDir=/pb_hooks \
  --migrationsDir=/pb_migrations \
  --publicDir=/pb_public \
  --indexFallback=true
