#!/bin/sh
set -eu

if ! command -v act >/dev/null 2>&1; then
  echo "act is required: https://nektosact.com/installation/" >&2
  exit 1
fi

socket="${DOCKER_HOST:-}"
if [ -z "$socket" ]; then
  socket="$(docker context inspect --format '{{ (index .Endpoints "docker").Host }}' 2>/dev/null || true)"
fi
if [ -z "$socket" ]; then
  socket="unix:///var/run/docker.sock"
fi

exec act workflow_dispatch \
  --workflows .github/workflows/deployment-workshop.yml \
  --job deploy \
  --env ACT=true \
  --container-daemon-socket "$socket" \
  --container-architecture linux/amd64
