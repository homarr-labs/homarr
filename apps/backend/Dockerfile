# syntax=docker/dockerfile:1.25

FROM oven/bun:1.4.2-alpine AS bun-tool

FROM node:24.18.0-alpine AS base

FROM base AS sources
ARG TARGETPLATFORM
WORKDIR /app
COPY --from=bun-tool /usr/local/bin/bun /usr/local/bin/bun
# Node and native build tools are build-only workspace install dependencies.
RUN apk add --no-cache libstdc++ python3 make g++
COPY bun.lock bunfig.toml package.json ./
COPY patches ./patches
COPY --parents ./apps/*/package.json ./packages/*/package.json ./tooling/*/package.json ./
RUN --mount=type=cache,id=homarr-bun-cache,target=/root/.bun/install/cache,sharing=locked \
    npm_config_nodedir=/usr/local bun install --frozen-lockfile --concurrent-scripts=1
COPY . .
ARG SKIP_ENV_VALIDATION='true'
ARG CI='true'
ARG DISABLE_REDIS_LOGS='true'

# Share the worker assembler and runtime scripts with the root worker target.
FROM sources AS worker-builder
RUN bun scripts/assemble-backend.mjs --worker && \
    rm /app/apps/worker/build/bundle-meta.json

FROM alpine:3.24.2 AS worker
WORKDIR /app
RUN apk add --no-cache libstdc++ ca-certificates su-exec && \
    mkdir -p /appdata/db /appdata/trusted-certificates
COPY --from=bun-tool /usr/local/bin/bun /usr/local/bin/bun
COPY --from=worker-builder /app/apps/worker/build/ ./apps/worker/
RUN mv /app/apps/worker/db /app/db
COPY --chmod=755 scripts/worker-cli.sh /usr/bin/homarr
COPY --chmod=755 scripts/worker-operator.sh /usr/bin/homarr-worker
COPY --chmod=755 scripts/worker-entrypoint.sh /app/worker-entrypoint.sh
COPY scripts/initialize-worker.ts /app/scripts/initialize-worker.ts
ENV DB_URL='/appdata/db/db.sqlite' \
    DB_DIALECT='sqlite' \
    DB_DRIVER='better-sqlite3' \
    AUTH_PROVIDERS='credentials' \
    HOMARR_STATE_BACKEND='memory' \
    NODE_ENV='production' \
    HOMARR_FRONTEND_ENABLED='false' \
    WORKER_HOST='0.0.0.0' \
    WORKER_PORT='3002' \
    PUID='1000' \
    PGID='1000'
VOLUME /appdata
EXPOSE 3002
ENTRYPOINT ["/app/worker-entrypoint.sh"]
CMD []
