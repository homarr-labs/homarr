#!/bin/sh
set -eu

DOCS_IMAGE=${DOCS_IMAGE:-homarr/docs:local}
DOCS_EXPOSE_PORT=${DOCS_EXPOSE_PORT:-3003}

docker build \
  --target production \
  --file apps/workshop/Dockerfile \
  --tag "$DOCS_IMAGE" \
  .

exec docker run \
  --rm \
  --name homarr-docs \
  --publish "127.0.0.1:${DOCS_EXPOSE_PORT}:8090" \
  --env PB_ALLOWED_ORIGINS='*' \
  "$DOCS_IMAGE"
