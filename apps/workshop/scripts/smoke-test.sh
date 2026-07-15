#!/bin/sh
set -eu

image="${1:-homarr/workshop:ci}"
container="homarr-workshop-smoke-${$}"
port="${WORKSHOP_SMOKE_PORT:-18090}"

cleanup() {
  docker rm --force "$container" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

docker run --detach --name "$container" --publish "127.0.0.1:${port}:8090" "$image" >/dev/null

attempt=0
until curl --fail --silent "http://127.0.0.1:${port}/api/health" >/dev/null; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 30 ]; then
    docker logs "$container"
    exit 1
  fi
  sleep 1
done

curl --fail --silent "http://127.0.0.1:${port}/" | grep --quiet "Homarr"
curl --fail --silent "http://127.0.0.1:${port}/workshop/" | grep --quiet "Workshop"
curl --fail --silent "http://127.0.0.1:${port}/api/collections/marketplace/records?page=1&perPage=1" >/dev/null
curl --fail --silent "http://127.0.0.1:${port}/api/health" | grep --quiet '"code":200'

echo "Workshop image serves Docusaurus and PocketBase successfully"
