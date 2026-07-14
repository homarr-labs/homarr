#!/bin/sh
set -eu

data_dir="${WORKSHOP_DATA_DIR:-apps/workshop/pb_data}"

if [ "${1:-}" != "--force" ]; then
  printf "Delete the local Workshop database at %s? [y/N] " "$data_dir"
  read -r answer
  case "$answer" in
    y|Y|yes|YES) ;;
    *) echo "Reset cancelled"; exit 0 ;;
  esac
fi

docker compose --env-file .env --file apps/workshop/docker-compose.yml down --remove-orphans >/dev/null 2>&1 || true
docker compose --env-file .env --file apps/workshop/docker-compose.preview.yml down --remove-orphans >/dev/null 2>&1 || true

mkdir -p "$data_dir"
docker run --rm --volume "$(cd "$data_dir" && pwd):/data" alpine:3.22 sh -c 'rm -rf /data/.[!.]* /data/..?* /data/*'
echo "Workshop database reset"
