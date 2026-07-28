#!/bin/sh
set -eu

normalize_http_url() {
  variable_name=$1
  value=$2
  printf '%s\n' "$value" | awk \
    -v variable_name="$variable_name" \
    -f "${WORKSHOP_URL_VALIDATOR_PATH:-/usr/local/lib/workshop-url.awk}"
}

normalize_docs_base_url() {
  value=$1
  case "$value" in
    /*) ;;
    *)
      echo "DOCS_BASE_URL must start with '/'" >&2
      return 1
      ;;
  esac
  case "${value%/}/" in
    *[!A-Za-z0-9._~/-]* | */./* | */../*)
      echo "DOCS_BASE_URL must be a safe URL path without traversal" >&2
      return 1
      ;;
  esac
  printf '/%s\n' "$(printf '%s' "$value" | sed 's#^/*##; s#/*$##')"
}

if [ "${1:-}" = "--validate-url" ]; then
  normalize_http_url "${2:-URL}" "${3:-}"
  exit
fi

if [ "${1:-}" = "--validate-docs-base-url" ]; then
  normalize_docs_base_url "${2:-}"
  exit
fi

HOMARR_WEBSITE_URL=$(normalize_http_url HOMARR_WEBSITE_URL "${HOMARR_WEBSITE_URL:-https://homarr.dev}")
WORKSHOP_API_URL=$(normalize_http_url WORKSHOP_API_URL "${WORKSHOP_API_URL:-$HOMARR_WEBSITE_URL}")
WORKSHOP_WEB_URL=$(normalize_http_url WORKSHOP_WEB_URL "${WORKSHOP_WEB_URL:-$HOMARR_WEBSITE_URL/workshop}")
if [ "${WORKSHOP_REQUIRE_PUBLIC_ORIGIN:-false}" = "true" ] && [ -z "${WORKSHOP_PUBLIC_ORIGIN:-}" ]; then
  echo "WORKSHOP_PUBLIC_ORIGIN must be set explicitly in production" >&2
  exit 1
fi
if [ -n "${WORKSHOP_PUBLIC_ORIGIN:-}" ]; then
  WORKSHOP_PUBLIC_ORIGIN=$(normalize_http_url WORKSHOP_PUBLIC_ORIGIN "$WORKSHOP_PUBLIC_ORIGIN")
fi
export HOMARR_WEBSITE_URL WORKSHOP_API_URL WORKSHOP_WEB_URL WORKSHOP_PUBLIC_ORIGIN

if [ "$(id -u)" -eq 0 ]; then
  chown -R pocketbase:pocketbase /pb_data
  exec su -p -s /bin/sh pocketbase -c 'exec /usr/local/bin/workshop-entrypoint'
fi

if [ -d /pb_public ]; then
  docs_base_url=$(normalize_docs_base_url "${DOCS_BASE_URL:-/}")
  runtime_directory="/pb_public${docs_base_url%/}"
  mkdir -p "$runtime_directory"
  cat >"$runtime_directory/workshop-runtime-config.js" <<EOF
globalThis.homarrRuntimeConfig = Object.freeze({
  homarrWebsiteUrl: "$HOMARR_WEBSITE_URL",
  workshopApiUrl: "$WORKSHOP_API_URL",
  workshopWebUrl: "$WORKSHOP_WEB_URL"
});
EOF
fi

exec pocketbase serve \
  --http="0.0.0.0:${PORT:-8090}" \
  --origins="${PB_ALLOWED_ORIGINS:-*}" \
  --dir=/pb_data \
  --hooksDir=/pb_hooks \
  --migrationsDir=/pb_migrations \
  --publicDir=/pb_public \
  --indexFallback=true
