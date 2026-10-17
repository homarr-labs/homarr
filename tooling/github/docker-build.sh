#!/usr/bin/env bash
set -eu

secret_args=()
for secret in TURBO_API TURBO_TEAM TURBO_TOKEN TURBO_REMOTE_CACHE_SIGNATURE_KEY; do
  if [ -n "${!secret:-}" ]; then
    secret_args+=(--secret "id=${secret},env=${secret}")
  fi
done

DOCKER_BUILDKIT=1 exec docker build ${secret_args[@]+"${secret_args[@]}"} "$@"
