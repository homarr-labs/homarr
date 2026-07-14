#!/bin/sh
set -eu

project="homarr-workshop-preview-test"
port="${WORKSHOP_PREVIEW_TEST_PORT:-18092}"
email="preview@homarr.test"
password="${WORKSHOP_PREVIEW_TEST_PASSWORD:-WorkshopPreviewPassword123!}"
data_dir="$(mktemp -d)"
base_url="http://127.0.0.1:$port"

cleanup() {
  PB_EXPOSE_PORT="$port" WORKSHOP_DATA_DIR="$data_dir" docker compose --env-file .env.example --file apps/workshop/docker-compose.preview.yml --project-name "$project" down --remove-orphans >/dev/null 2>&1 || true
  docker run --rm --volume "$data_dir:/data" alpine:3.22 sh -c 'rm -rf /data/.[!.]* /data/..?* /data/*' >/dev/null 2>&1 || true
  rmdir "$data_dir" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM
PB_EXPOSE_PORT="$port" WORKSHOP_DATA_DIR="$data_dir" docker compose --env-file .env.example --file apps/workshop/docker-compose.preview.yml --project-name "$project" down --remove-orphans >/dev/null 2>&1 || true

PB_EXPOSE_PORT="$port" WORKSHOP_DATA_DIR="$data_dir" docker compose \
  --env-file .env.example \
  --file apps/workshop/docker-compose.preview.yml \
  --project-name "$project" \
  up --detach --build --wait

curl --fail --silent --show-error "$base_url/api/health" >/dev/null
curl --fail --silent --show-error --location "$base_url/workshop" >/dev/null
curl --fail --silent --show-error "$base_url/workshop-sw.js" >/dev/null

PB_EXPOSE_PORT="$port" WORKSHOP_DATA_DIR="$data_dir" docker compose \
  --env-file .env.example \
  --file apps/workshop/docker-compose.preview.yml \
  --project-name "$project" \
  exec --no-TTY workshop pocketbase superuser upsert "$email" "$password" --dir=/pb_data >/dev/null

token="$(curl --fail --silent --show-error \
  --header 'Content-Type: application/json' \
  --data "{\"identity\":\"$email\",\"password\":\"$password\"}" \
  "$base_url/api/collections/_superusers/auth-with-password" | jq --raw-output '.token')"

collections="$(curl --fail --silent --show-error \
  --header "Authorization: $token" \
  "$base_url/api/collections?perPage=200")"

for collection in users submissions votes reports moderation_actions workshop_listings; do
  echo "$collections" | jq --exit-status --arg name "$collection" '.items | any(.name == $name)' >/dev/null || {
    echo "Missing Workshop collection: $collection" >&2
    exit 1
  }
done

echo "Workshop production preview passed"
