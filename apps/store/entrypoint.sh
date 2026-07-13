#!/bin/sh
set -eu

chown -R pocketbase:pocketbase /pb_data

if [ -n "${PB_SUPERUSER_EMAIL:-}" ] && [ -n "${PB_SUPERUSER_PASSWORD:-}" ]; then
  su-exec pocketbase pocketbase superuser upsert "${PB_SUPERUSER_EMAIL}" "${PB_SUPERUSER_PASSWORD}" --dir=/pb_data
fi

exec su-exec pocketbase pocketbase serve \
  --http=0.0.0.0:8090 \
  --dir=/pb_data \
  --hooksDir=/pb_hooks \
  --migrationsDir=/pb_migrations
