#!/bin/sh
set -eu

if [ -n "${PB_SUPERUSER_EMAIL:-}" ] && [ -n "${PB_SUPERUSER_PASSWORD:-}" ]; then
  pocketbase superuser upsert "${PB_SUPERUSER_EMAIL}" "${PB_SUPERUSER_PASSWORD}" --dir=/pb_data
fi

echo "Workshop API: ${PB_PUBLIC_URL:-http://localhost:8090}"
echo "Workshop website: http://localhost:3003/workshop"

exec pocketbase serve \
  --http=0.0.0.0:8090 \
  --origins="${PB_ALLOWED_ORIGINS:-http://localhost:3000,http://127.0.0.1:3000,http://localhost:3003,http://127.0.0.1:3003,http://localhost:7575,http://127.0.0.1:7575}" \
  --dir=/pb_data \
  --hooksDir=/pb_hooks \
  --migrationsDir=/pb_migrations
