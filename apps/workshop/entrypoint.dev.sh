#!/bin/sh
set -eu

echo "Workshop development API: http://localhost:8090/api"
echo "PocketBase dashboard: http://localhost:8090/_/"

exec pocketbase serve \
  --dev \
  --automigrate=false \
  --http=0.0.0.0:8090 \
  --origins="${PB_ALLOWED_ORIGINS:-*}" \
  --dir=/pb_data \
  --hooksDir=/pb_hooks \
  --migrationsDir=/pb_migrations \
  --publicDir=/pb_public \
  --indexFallback=true
