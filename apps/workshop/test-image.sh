#!/bin/sh
set -eu

WORKSHOP_IMAGE_TEST_PORT=${WORKSHOP_IMAGE_TEST_PORT:-18091}
WORKSHOP_IMAGE_TEST_NAME="homarr-workshop-image-test-$$"
WORKSHOP_IMAGE_TEST_TAG="homarr-workshop:test-$$"
PREVIEW_ORIGIN=https://v2.preview.homarr.dev

cleanup() {
  docker rm --force "$WORKSHOP_IMAGE_TEST_NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker build --target production -f apps/workshop/Dockerfile -t "$WORKSHOP_IMAGE_TEST_TAG" .
docker run --detach --name "$WORKSHOP_IMAGE_TEST_NAME" \
  --publish "127.0.0.1:$WORKSHOP_IMAGE_TEST_PORT:8090" \
  --env HOMARR_WEBSITE_URL="$PREVIEW_ORIGIN" \
  --env WORKSHOP_API_URL="$PREVIEW_ORIGIN" \
  --env WORKSHOP_WEB_URL="$PREVIEW_ORIGIN/workshop" \
  --env WORKSHOP_PUBLIC_ORIGIN="$PREVIEW_ORIGIN" \
  --env PB_ALLOWED_ORIGINS='*' \
  "$WORKSHOP_IMAGE_TEST_TAG" >/dev/null

for attempt in $(seq 1 60); do
  if curl --fail --silent "http://127.0.0.1:$WORKSHOP_IMAGE_TEST_PORT/api/health" >/dev/null; then
    break
  fi
  if [ "$attempt" -eq 60 ]; then
    docker logs "$WORKSHOP_IMAGE_TEST_NAME"
    exit 1
  fi
  sleep 1
done

WORKSHOP_TEST_URL="http://127.0.0.1:$WORKSHOP_IMAGE_TEST_PORT" \
  EXPECTED_HOMARR_WEBSITE_URL="$PREVIEW_ORIGIN" \
  EXPECTED_WORKSHOP_API_URL="$PREVIEW_ORIGIN" \
  EXPECTED_WORKSHOP_WEB_URL="$PREVIEW_ORIGIN/workshop" \
  node apps/workshop/tests/runtime-config.integration.mjs

curl --fail --location --silent "http://127.0.0.1:$WORKSHOP_IMAGE_TEST_PORT/workshop" >/dev/null
curl --fail --silent \
  "http://127.0.0.1:$WORKSHOP_IMAGE_TEST_PORT/api/collections/workshop_listings/records?perPage=1" >/dev/null
curl --fail --silent --dump-header - --output /dev/null \
  --header 'Origin: https://homarr.example' \
  "http://127.0.0.1:$WORKSHOP_IMAGE_TEST_PORT/api/collections/workshop_listings/records?perPage=1" \
  | tr -d '\r' \
  | grep -qi '^Access-Control-Allow-Origin: \*$'

echo "Workshop production image passed"
