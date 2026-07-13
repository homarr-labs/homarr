#!/bin/sh
set -eu

project="homarr-workshop-integration"
port="${WORKSHOP_TEST_PORT:-18091}"
email="integration@homarr.test"
password="WorkshopIntegrationPassword123!"

cleanup() {
  PB_EXPOSE_PORT="$port" docker compose --env-file .env.example --file apps/workshop/docker-compose.yml --project-name "$project" down --volumes >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM
cleanup

PB_EXPOSE_PORT="$port" \
PB_SUPERUSER_EMAIL="$email" \
PB_SUPERUSER_PASSWORD="$password" \
GITHUB_CLIENT_ID="integration-client" \
GITHUB_CLIENT_SECRET="integration-secret" \
docker compose --env-file .env.example --file apps/workshop/docker-compose.yml --project-name "$project" up --detach --build --wait

if ! WORKSHOP_TEST_URL="http://127.0.0.1:$port" \
  WORKSHOP_TEST_SUPERUSER_EMAIL="$email" \
  WORKSHOP_TEST_SUPERUSER_PASSWORD="$password" \
  node apps/workshop/tests/workshop.integration.mjs; then
  docker compose --env-file .env.example --file apps/workshop/docker-compose.yml --project-name "$project" logs --no-color workshop
  exit 1
fi
