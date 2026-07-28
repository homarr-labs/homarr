#!/bin/sh
set -eu

WORKSHOP_TEST_PORT=${WORKSHOP_TEST_PORT:-18090}
WORKSHOP_TEST_PROJECT="homarr-workshop-test-$$"
WORKSHOP_ROLLBACK_PORT=${WORKSHOP_ROLLBACK_PORT:-$((WORKSHOP_TEST_PORT + 1))}
WORKSHOP_ROLLBACK_PROJECT="homarr-workshop-rollback-$$"
WORKSHOP_ROLLBACK_SNAPSHOT="/tmp/$WORKSHOP_ROLLBACK_PROJECT.json"
WORKSHOP_MIGRATION_COUNT=$(
  node -e "const fs = require('node:fs'); console.log(fs.readdirSync('apps/workshop/pb_migrations').filter((name) => name.endsWith('.js')).length)"
)
ROLLBACK_CONTAINER=""

node apps/workshop/tests/workshop-contracts.mjs
node apps/workshop/tests/workshop-migration.mjs
node apps/workshop/tests/workshop-rate-limit-migration.mjs
node apps/workshop/tests/entrypoint-url.mjs
node apps/workshop/tests/workshop-identity.mjs
node apps/workshop/tests/workshop-oauth-hook.mjs

cleanup() {
  if [ -n "$ROLLBACK_CONTAINER" ]; then
    docker stop "$ROLLBACK_CONTAINER" >/dev/null 2>&1 || true
  fi
  docker compose -p "$WORKSHOP_ROLLBACK_PROJECT" \
    -f apps/workshop/docker-compose.yml down --volumes --remove-orphans >/dev/null 2>&1 || true
  PB_EXPOSE_PORT="$WORKSHOP_TEST_PORT" docker compose -p "$WORKSHOP_TEST_PROJECT" \
    -f apps/workshop/docker-compose.yml down --volumes --remove-orphans >/dev/null 2>&1 || true
  rm -f "$WORKSHOP_ROLLBACK_SNAPSHOT"
}
trap cleanup EXIT

wait_for_workshop() {
  port=$1
  for attempt in $(seq 1 60); do
    if curl --fail --silent "http://127.0.0.1:$port/api/health" >/dev/null; then
      return
    fi
    if [ "$attempt" -eq 60 ]; then
      return 1
    fi
    sleep 1
  done
}

start_rollback_server() {
  ROLLBACK_CONTAINER=$(
    PB_EXPOSE_PORT="$WORKSHOP_ROLLBACK_PORT" docker compose -p "$WORKSHOP_ROLLBACK_PROJECT" \
      -f apps/workshop/docker-compose.yml run --rm -d --service-ports --no-deps \
      --entrypoint pocketbase workshop \
      serve --http="0.0.0.0:$WORKSHOP_ROLLBACK_PORT" --origins="*" --dir=/pb_data \
      --hooksDir=/tmp --migrationsDir=/tmp --publicDir=/pb_public --automigrate=false
  )
  wait_for_workshop "$WORKSHOP_ROLLBACK_PORT"
}

stop_rollback_server() {
  docker stop "$ROLLBACK_CONTAINER" >/dev/null
  ROLLBACK_CONTAINER=""
}

run_rollback_assertion() {
  WORKSHOP_TEST_URL="http://127.0.0.1:$WORKSHOP_ROLLBACK_PORT" \
    WORKSHOP_ROLLBACK_SNAPSHOT="$WORKSHOP_ROLLBACK_SNAPSHOT" \
    node apps/workshop/tests/workshop-rollback.integration.mjs "$1"
}

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

for client_id in workshop-test-client workshop-rotated-client; do
  GITHUB_CLIENT_ID="$client_id" GITHUB_CLIENT_SECRET="workshop-test-secret" PB_EXPOSE_PORT="$WORKSHOP_TEST_PORT" \
    docker compose -p "$WORKSHOP_TEST_PROJECT" -f apps/workshop/docker-compose.yml up -d --force-recreate workshop
  for attempt in $(seq 1 60); do
    if curl --fail --silent "http://127.0.0.1:$WORKSHOP_TEST_PORT/api/health" >/dev/null; then
      break
    fi
    if [ "$attempt" -eq 60 ]; then
      exit 1
    fi
    sleep 1
  done
  WORKSHOP_TEST_URL="http://127.0.0.1:$WORKSHOP_TEST_PORT" EXPECTED_GITHUB_CLIENT_ID="$client_id" \
    node apps/workshop/tests/oauth-sync.integration.mjs
done

GITHUB_CLIENT_ID="workshop-partial-client" GITHUB_CLIENT_SECRET="" WORKSHOP_REQUIRE_OAUTH=false \
  PB_EXPOSE_PORT="$WORKSHOP_TEST_PORT" docker compose -p "$WORKSHOP_TEST_PROJECT" \
  -f apps/workshop/docker-compose.yml up -d --force-recreate workshop
partial_rejected=false
for attempt in $(seq 1 30); do
  if PB_EXPOSE_PORT="$WORKSHOP_TEST_PORT" docker compose -p "$WORKSHOP_TEST_PROJECT" \
    -f apps/workshop/docker-compose.yml logs --no-color workshop | grep -q "partial_credentials"; then
    partial_rejected=true
    break
  fi
  sleep 1
done
if [ "$partial_rejected" != true ]; then
  echo "Workshop accepted a partial GitHub OAuth configuration"
  exit 1
fi

GITHUB_CLIENT_ID="" GITHUB_CLIENT_SECRET="" WORKSHOP_REQUIRE_OAUTH=true PB_EXPOSE_PORT="$WORKSHOP_TEST_PORT" \
  docker compose -p "$WORKSHOP_TEST_PROJECT" -f apps/workshop/docker-compose.yml \
  up -d --force-recreate workshop
required_rejected=false
for attempt in $(seq 1 30); do
  if PB_EXPOSE_PORT="$WORKSHOP_TEST_PORT" docker compose -p "$WORKSHOP_TEST_PROJECT" \
    -f apps/workshop/docker-compose.yml logs --no-color workshop | grep -q "required_but_disabled"; then
    required_rejected=true
    break
  fi
  sleep 1
done
if [ "$required_rejected" != true ]; then
  echo "Workshop started without OAuth while WORKSHOP_REQUIRE_OAUTH=true"
  exit 1
fi

PB_EXPOSE_PORT="$WORKSHOP_TEST_PORT" docker compose -p "$WORKSHOP_TEST_PROJECT" \
  -f apps/workshop/docker-compose.yml stop workshop

WORKSHOP_IMAGE_ID=$(
  docker compose -p "$WORKSHOP_TEST_PROJECT" -f apps/workshop/docker-compose.yml images -q workshop
)
docker image tag "$WORKSHOP_IMAGE_ID" "$WORKSHOP_ROLLBACK_PROJECT-workshop:latest"
PB_EXPOSE_PORT="$WORKSHOP_ROLLBACK_PORT" docker compose -p "$WORKSHOP_ROLLBACK_PROJECT" \
  -f apps/workshop/docker-compose.yml run --rm --no-deps --workdir /tmp --entrypoint pocketbase workshop \
  superuser create workshop-rollback@example.invalid 'WorkshopRollback123!' --dir=/pb_data \
  --hooksDir=/tmp --migrationsDir=/tmp --automigrate=false

start_rollback_server
run_rollback_assertion fresh-prepare
stop_rollback_server

PB_EXPOSE_PORT="$WORKSHOP_ROLLBACK_PORT" docker compose -p "$WORKSHOP_ROLLBACK_PROJECT" \
  -f apps/workshop/docker-compose.yml run --rm --no-deps --entrypoint pocketbase workshop \
  migrate up --dir=/pb_data --migrationsDir=/pb_migrations --hooksDir=/tmp --automigrate=false
start_rollback_server
run_rollback_assertion fresh-migrated
stop_rollback_server

printf 'y\n' | PB_EXPOSE_PORT="$WORKSHOP_ROLLBACK_PORT" docker compose -p "$WORKSHOP_ROLLBACK_PROJECT" \
  -f apps/workshop/docker-compose.yml run --rm --no-deps --entrypoint pocketbase workshop \
  migrate down "$WORKSHOP_MIGRATION_COUNT" --dir=/pb_data --migrationsDir=/pb_migrations \
  --hooksDir=/tmp --automigrate=false
start_rollback_server
run_rollback_assertion fresh-restored
run_rollback_assertion prepare
stop_rollback_server

PB_EXPOSE_PORT="$WORKSHOP_ROLLBACK_PORT" docker compose -p "$WORKSHOP_ROLLBACK_PROJECT" \
  -f apps/workshop/docker-compose.yml run --rm --no-deps --entrypoint pocketbase workshop \
  migrate up --dir=/pb_data --migrationsDir=/pb_migrations --hooksDir=/tmp --automigrate=false
start_rollback_server
run_rollback_assertion migrated
stop_rollback_server

printf 'y\n' | PB_EXPOSE_PORT="$WORKSHOP_ROLLBACK_PORT" docker compose -p "$WORKSHOP_ROLLBACK_PROJECT" \
  -f apps/workshop/docker-compose.yml run --rm --no-deps --entrypoint pocketbase workshop \
  migrate down "$WORKSHOP_MIGRATION_COUNT" --dir=/pb_data --migrationsDir=/pb_migrations \
  --hooksDir=/tmp --automigrate=false
start_rollback_server
run_rollback_assertion restored
stop_rollback_server

PB_EXPOSE_PORT="$WORKSHOP_ROLLBACK_PORT" docker compose -p "$WORKSHOP_ROLLBACK_PROJECT" \
  -f apps/workshop/docker-compose.yml run --rm --no-deps --entrypoint pocketbase workshop \
  migrate up --dir=/pb_data --migrationsDir=/pb_migrations --hooksDir=/tmp --automigrate=false
start_rollback_server
run_rollback_assertion migrated
stop_rollback_server
