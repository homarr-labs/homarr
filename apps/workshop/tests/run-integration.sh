#!/bin/sh
set -eu

project="homarr-workshop-integration"
port="${WORKSHOP_TEST_PORT:-18091}"
email="integration@homarr.test"
password="${WORKSHOP_TEST_PASSWORD:-WorkshopIntegrationPassword123!}"
data_dir="$(mktemp -d)"

cleanup() {
  PB_EXPOSE_PORT="$port" WORKSHOP_DATA_DIR="$data_dir" docker compose --env-file .env.example --file apps/workshop/docker-compose.yml --project-name "$project" down --remove-orphans >/dev/null 2>&1 || true
  docker run --rm --volume "$data_dir:/data" alpine:3.22 sh -c 'rm -rf /data/.[!.]* /data/..?* /data/*' >/dev/null 2>&1 || true
  rmdir "$data_dir" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM
PB_EXPOSE_PORT="$port" WORKSHOP_DATA_DIR="$data_dir" docker compose --env-file .env.example --file apps/workshop/docker-compose.yml --project-name "$project" down --remove-orphans >/dev/null 2>&1 || true

PB_EXPOSE_PORT="$port" WORKSHOP_DATA_DIR="$data_dir" docker compose \
  --env-file .env.example \
  --file apps/workshop/docker-compose.yml \
  --project-name "$project" \
  up --detach --build --wait

WORKSHOP_DATA_DIR="$data_dir" docker compose \
  --env-file .env.example \
  --file apps/workshop/docker-compose.yml \
  --project-name "$project" \
  exec --no-TTY workshop pocketbase superuser upsert "$email" "$password" --dir=/pb_data

if ! WORKSHOP_TEST_URL="http://127.0.0.1:$port" \
  WORKSHOP_TEST_SUPERUSER_EMAIL="$email" \
  WORKSHOP_TEST_SUPERUSER_PASSWORD="$password" \
  node apps/workshop/tests/workshop.integration.mjs; then
  PB_EXPOSE_PORT="$port" WORKSHOP_DATA_DIR="$data_dir" docker compose --env-file .env.example --file apps/workshop/docker-compose.yml --project-name "$project" logs --no-color workshop
  exit 1
fi

PB_EXPOSE_PORT="$port" WORKSHOP_DATA_DIR="$data_dir" docker compose \
  --env-file .env.example \
  --file apps/workshop/docker-compose.yml \
  --project-name "$project" \
  restart workshop >/dev/null
PB_EXPOSE_PORT="$port" WORKSHOP_DATA_DIR="$data_dir" docker compose \
  --env-file .env.example \
  --file apps/workshop/docker-compose.yml \
  --project-name "$project" \
  up --detach --wait >/dev/null

WORKSHOP_TEST_URL="http://127.0.0.1:$port" \
  WORKSHOP_TEST_SUPERUSER_EMAIL="$email" \
  WORKSHOP_TEST_SUPERUSER_PASSWORD="$password" \
  WORKSHOP_VERIFY_CONFIGURATION_ONLY=true \
  node apps/workshop/tests/workshop.integration.mjs
