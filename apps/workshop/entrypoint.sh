#!/bin/sh
set -eu

exec pocketbase serve \
  --http="0.0.0.0:${PORT:-8090}" \
  --origins="${PB_ALLOWED_ORIGINS:-*}" \
  --dir=/pb_data \
  --migrationsDir=/pb_migrations \
  --publicDir=/pb_public \
  --indexFallback=true
