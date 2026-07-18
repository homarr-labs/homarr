#!/bin/sh
set -eu

exec pocketbase serve \
  --http=0.0.0.0:8090 \
  --origins="${PB_ALLOWED_ORIGINS:-*}" \
  --dir=/pb_data \
  --hooksDir=/pb_hooks \
  --migrationsDir=/pb_migrations \
  --publicDir=/pb_public \
  --indexFallback=true
