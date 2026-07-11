#!/usr/bin/env bash

set -euo pipefail

mode="${1:-all}"
case "$mode" in
  fast) job="fast-gate" ;;
  docker) job="container" ;;
  all) job="" ;;
  cleanup) job="cleanup" ;;
  *)
    echo "Usage: $0 {fast|docker|all|cleanup}" >&2
    exit 2
    ;;
esac

command -v act >/dev/null 2>&1 || {
  echo "act is required: https://nektosact.com/installation/index.html" >&2
  exit 1
}

docker info >/dev/null 2>&1 || {
  echo "Docker is not running" >&2
  exit 1
}

if [[ -z "${DOCKER_HOST:-}" ]]; then
  DOCKER_HOST=$(docker context inspect --format '{{.Endpoints.docker.Host}}' 2>/dev/null || true)
  export DOCKER_HOST
fi

head_sha=$(git rev-parse HEAD)
base_sha=$(git rev-parse HEAD~1 2>/dev/null || echo "$head_sha")
head_ref=$(git branch --show-current)
head_ref=${head_ref:-act-local}
event_file=$(mktemp "${TMPDIR:-/tmp}/homarr-act-event.XXXXXX")
trap 'rm -f "$event_file"' EXIT

json_escape() { printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g; s/\t/\\t/g'; }

if [[ "$mode" == "cleanup" ]]; then
  event_name="workflow_dispatch"
  cat >"$event_file" <<EOF
{
  "inputs": { "operation": "cleanup", "pr_number": "1", "ref": "" },
  "repository": { "full_name": "homarr-labs/homarr" }
}
EOF
else
  event_name="pull_request"
  safe_ref=$(json_escape "$head_ref")
  cat >"$event_file" <<EOF
{
  "action": "synchronize",
  "number": 1,
  "repository": { "full_name": "homarr-labs/homarr" },
  "pull_request": {
    "number": 1,
    "draft": false,
    "base": { "sha": "$base_sha", "ref": "dev" },
    "head": {
      "sha": "$head_sha",
      "ref": "$safe_ref",
      "repo": { "full_name": "homarr-labs/homarr" }
    }
  }
}
EOF
fi

runner_image="${ACT_RUNNER_IMAGE:-catthehacker/ubuntu:act-latest}"
args=(
  "$event_name"
  --workflows .github/workflows/ci.yml
  --eventpath "$event_file"
  --platform "ubuntu-latest=$runner_image"
  --container-architecture linux/amd64
  --bind
)

if [[ -n "$job" ]]; then
  args+=(--job "$job")
fi

git_common_dir=$(cd "$(git rev-parse --git-common-dir)" && pwd)
container_options="--volume homarr-act-node-modules:$PWD/node_modules --volume homarr-act-pnpm-store:$PWD/.pnpm-store"
case "$git_common_dir" in
  "$PWD" | "$PWD"/*) ;;
  *) container_options="$container_options --volume $git_common_dir:$git_common_dir:ro" ;;
esac
args+=(--container-options "$container_options")

if [[ -n "${ACT_SECRET_FILE:-}" ]]; then
  args+=(--secret-file "$ACT_SECRET_FILE")
fi

exec act "${args[@]}"
