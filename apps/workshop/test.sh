#!/bin/sh
set -eu

WORKSHOP_TEST_PORT=${WORKSHOP_TEST_PORT:-18090}
WORKSHOP_TEST_PROJECT="homarr-workshop-test-$$"

cleanup() {
  PB_EXPOSE_PORT="$WORKSHOP_TEST_PORT" docker compose -p "$WORKSHOP_TEST_PROJECT" \
    -f apps/workshop/docker-compose.yml down --volumes --remove-orphans >/dev/null 2>&1 || true
}
trap cleanup EXIT

PB_EXPOSE_PORT="$WORKSHOP_TEST_PORT" docker compose -p "$WORKSHOP_TEST_PROJECT" \
  -f apps/workshop/docker-compose.yml up --build -d

for attempt in $(seq 1 60); do
  if curl --fail --silent "http://127.0.0.1:$WORKSHOP_TEST_PORT/api/health" >/dev/null; then
    break
  fi
  if [ "$attempt" -eq 60 ]; then
    PB_EXPOSE_PORT="$WORKSHOP_TEST_PORT" docker compose -p "$WORKSHOP_TEST_PROJECT" \
      -f apps/workshop/docker-compose.yml logs --no-color workshop
    exit 1
  fi
  sleep 1
done

docker compose -p "$WORKSHOP_TEST_PROJECT" -f apps/workshop/docker-compose.yml exec -T workshop \
  pocketbase superuser create \
  workshop-test@example.invalid 'WorkshopLocalTest123!' --dir=/pb_data

WORKSHOP_TEST_URL="http://127.0.0.1:$WORKSHOP_TEST_PORT" node apps/workshop/tests/workshop.integration.mjs
