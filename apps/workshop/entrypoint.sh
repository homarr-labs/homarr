#!/bin/sh
set -eu

if [ "$(id -u)" -eq 0 ]; then
  chown -R pocketbase:pocketbase /pb_data
  exec su -p -s /bin/sh pocketbase -c 'exec /usr/local/bin/workshop-entrypoint'
fi

HOMARR_WEBSITE_URL=${HOMARR_WEBSITE_URL:-https://homarr.dev}
WORKSHOP_API_URL=${WORKSHOP_API_URL:-$HOMARR_WEBSITE_URL}
WORKSHOP_WEB_URL=${WORKSHOP_WEB_URL:-$HOMARR_WEBSITE_URL/workshop}

encode_runtime_value() {
  printf '%s' "$1" | base64 | tr -d '\n'
}

cat >/pb_public/workshop-runtime-config.js <<EOF
const decodeRuntimeValue = (value) =>
  new TextDecoder().decode(Uint8Array.from(atob(value), (character) => character.charCodeAt(0)));
globalThis.homarrRuntimeConfig = Object.freeze({
  homarrWebsiteUrl: decodeRuntimeValue("$(encode_runtime_value "$HOMARR_WEBSITE_URL")"),
  workshopApiUrl: decodeRuntimeValue("$(encode_runtime_value "$WORKSHOP_API_URL")"),
  workshopWebUrl: decodeRuntimeValue("$(encode_runtime_value "$WORKSHOP_WEB_URL")")
});
EOF

exec pocketbase serve \
  --http="0.0.0.0:${PORT:-8090}" \
  --origins="${PB_ALLOWED_ORIGINS:-*}" \
  --dir=/pb_data \
  --hooksDir=/pb_hooks \
  --migrationsDir=/pb_migrations \
  --publicDir=/pb_public \
  --indexFallback=true
