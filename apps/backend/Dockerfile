# syntax=docker/dockerfile:1.29@sha256:572cebbc2b15e6f84c077742952674889cb63cd5e9b80abdffcbe587b6f19183

FROM oven/bun:1.4.4-debian@sha256:93d5032fe06d163427822dc1598f420363759bb18155c9cc90eb1be05a64a19e AS bun-tool

FROM oven/bun:1.4.4-alpine AS worker-bun-tool

FROM node:24.22.3-trixie-slim@sha256:af02d57b57719b9657a45199a79264a9437940cd55b3c7b3fc99615654f124a0 AS base

FROM base AS sources
ARG TARGETPLATFORM
WORKDIR /app
# Compiler tools stay in the builder for optional native dependency fallbacks.
RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates python3 make g++ && \
    rm -rf /var/lib/apt/lists/*
COPY --from=bun-tool /usr/local/bin/bun /usr/local/bin/bun
COPY bun.lock bunfig.toml package.json ./
COPY patches ./patches
COPY --parents ./apps/*/package.json ./packages/*/package.json ./tooling/*/package.json ./
RUN --mount=type=cache,id=homarr-bun-${TARGETPLATFORM}-glibc-2.41-node-24.22.3-bun-1.4.4,target=/root/.bun/install/cache,sharing=locked \
    npm_config_nodedir=/usr/local bun install --frozen-lockfile --concurrent-scripts=1

# Runtime configuration changes do not invalidate the application build.
COPY --exclude=scripts/entrypoint.sh --exclude=scripts/run.sh --exclude=scripts/trusted-proxies.mjs --exclude=packages/redis/redis.conf --exclude=nginx.conf . .
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
COPY --from=worker-bun-tool /usr/local/bin/bun /usr/local/bin/bun
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
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD ["bun", "-e", "fetch('http://127.0.0.1:3002/api/health/live', { method: 'HEAD', signal: AbortSignal.timeout(4000) }).then((response) => { process.exitCode = Number(!response.ok); }).catch((error) => { console.error(error); process.exitCode = 1; })"]
ENTRYPOINT ["/app/worker-entrypoint.sh"]
CMD []
