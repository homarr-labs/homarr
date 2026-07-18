#!/bin/sh
set -eu

WORKSHOP_TEST_DATA_DIR=$(mktemp -d)
WORKSHOP_TEST_PORT=${WORKSHOP_TEST_PORT:-18090}

cleanup() {
  WORKSHOP_DATA_DIR="$WORKSHOP_TEST_DATA_DIR" PB_EXPOSE_PORT="$WORKSHOP_TEST_PORT" \
    docker compose -f apps/workshop/docker-compose.yml down --remove-orphans >/dev/null 2>&1 || true
  rm -rf "$WORKSHOP_TEST_DATA_DIR"
}
trap cleanup EXIT

WORKSHOP_DATA_DIR="$WORKSHOP_TEST_DATA_DIR" PB_EXPOSE_PORT="$WORKSHOP_TEST_PORT" \
  docker compose -f apps/workshop/docker-compose.yml up --build -d

for attempt in $(seq 1 60); do
  if curl --fail --silent "http://127.0.0.1:$WORKSHOP_TEST_PORT/api/health" >/dev/null; then
    break
  fi
  if [ "$attempt" -eq 60 ]; then
    WORKSHOP_DATA_DIR="$WORKSHOP_TEST_DATA_DIR" PB_EXPOSE_PORT="$WORKSHOP_TEST_PORT" \
      docker compose -f apps/workshop/docker-compose.yml logs --no-color workshop
    exit 1
  fi
  sleep 1
done

docker exec homarr-workshop-workshop-1 pocketbase superuser create \
  workshop-test@example.invalid 'WorkshopLocalTest123!' --dir=/pb_data

WORKSHOP_TEST_URL="http://127.0.0.1:$WORKSHOP_TEST_PORT" node apps/workshop/tests/workshop.integration.mjs
