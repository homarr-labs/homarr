# syntax=docker/dockerfile:1.29@sha256:572cebbc2b15e6f84c077742952674889cb63cd5e9b80abdffcbe587b6f19183

FROM oven/bun:1.4.4-debian@sha256:93d5032fe06d163427822dc1598f420363759bb18155c9cc90eb1be05a64a19e AS bun-tool

FROM oven/bun:1.4.4-alpine AS worker-bun-tool

FROM redis:8.8.4-trixie@sha256:6e61ab45b3e867bacbef2fdd969ec74f4e0f8aaca8cc946cb8ac0c494035e7e7 AS redis-tool

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

# This stage has no dependency on a Next.js build or its production assets.
FROM sources AS backend-builder
RUN bun run --filter @homarr/db build && \
    bun run --filter @homarr/cli build && \
    bun run --filter @homarr/backend build

# The worker needs no Node CLI or migration build: all operational entrypoints
# are assembled for Bun with the backend in a single dependency graph.
FROM sources AS worker-builder
RUN bun scripts/assemble-backend.mjs --worker && \
    rm /app/apps/worker/build/bundle-meta.json

FROM sources AS frontend-builder
ARG TARGETPLATFORM
RUN --mount=type=secret,id=TURBO_API,env=TURBO_API \
    --mount=type=secret,id=TURBO_TEAM,env=TURBO_TEAM \
    --mount=type=secret,id=TURBO_TOKEN,env=TURBO_TOKEN \
    --mount=type=secret,id=TURBO_REMOTE_CACHE_SIGNATURE_KEY,env=TURBO_REMOTE_CACHE_SIGNATURE_KEY \
    --mount=type=cache,id=homarr-next-build-${TARGETPLATFORM}-glibc-2.41-node-24.22.3,target=/app/apps/nextjs/.next/cache,sharing=locked \
    --mount=type=cache,id=homarr-turbo-${TARGETPLATFORM}-glibc-2.41-node-24.22.3,target=/app/.turbo,sharing=locked \
    TURBO_PLATFORM="${TARGETPLATFORM:-linux/amd64}/glibc-2.41/node-24.22.3" \
    bun run turbo run build --filter=@homarr/nextjs...

FROM debian:trixie-slim@sha256:f6b08b09a05725f9431502d3b5714f5c4576e82c1a84fa1debe0c24a7e0c3ec4 AS runtime
WORKDIR /app
# envsubst, privilege drop and AUTH_SECRET generation are used by the entrypoint.
# Keep wget for existing health-check overrides from Alpine-based deployments.
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends \
      libstdc++6 libatomic1 libzstd1 zlib1g ca-certificates nginx bash gettext-base util-linux openssl wget && \
    rm -rf /var/lib/apt/lists/* && \
    mkdir -p /appdata /var/cache/nginx /var/log/nginx /var/lib/nginx \
      /run/nginx /etc/nginx/templates /etc/nginx/ssl/certs && \
    touch /run/nginx/nginx.pid
COPY --from=base /usr/local/bin/node /usr/local/bin/node
COPY --from=bun-tool /usr/local/bin/bun /usr/local/bin/bun
# Keep Redis's persisted RDB format compatible with the previous Alpine image.
COPY --from=redis-tool /usr/local/bin/redis-server /usr/local/bin/redis-cli /usr/local/bin/
VOLUME /appdata
COPY --from=backend-builder /app/packages/cli/cli.cjs /app/apps/cli/cli.cjs
COPY --from=backend-builder /app/packages/db/migrations ./db/migrations
COPY --from=backend-builder /app/apps/backend/build/ ./apps/backend/
# Keep the shared runtime module root consistent with the ESM backend assembly.
COPY --from=backend-builder /app/apps/backend/build/package.json ./package.json
# CLI's external bcrypt dependency uses the same small runtime package closure.
RUN printf '#!/bin/sh\ncd /app/apps/cli && DISABLE_REDIS_LOGS=true NODE_PATH=/app/apps/backend/node_modules exec node ./cli.cjs "$@"\n' > /usr/bin/homarr && \
    chmod +x /usr/bin/homarr
COPY scripts/run.sh ./run.sh
COPY scripts/trusted-proxies.mjs ./scripts/trusted-proxies.mjs
COPY --chmod=755 scripts/entrypoint.sh ./entrypoint.sh
COPY packages/redis/redis.conf /app/redis.conf
COPY nginx.conf /etc/nginx/templates/nginx.conf
ENV DB_URL='/appdata/db/db.sqlite'
ENV DB_DIALECT='sqlite'
ENV DB_DRIVER='better-sqlite3'
ENV AUTH_PROVIDERS='credentials'
ENV REDIS_IS_EXTERNAL='false'
ENV NODE_ENV='production'
ENV BACKEND_HOST='127.0.0.1'
ENV BACKEND_PORT='3002'
EXPOSE 7575
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 CMD ["node", "-e", "fetch('http://127.0.0.1:7575/api/health/live', { method: 'HEAD', signal: AbortSignal.timeout(4000) }).then((response) => { process.exitCode = Number(!response.ok); }).catch((error) => { console.error(error); process.exitCode = 1; })"]
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["bash", "run.sh"]

# docker build --target backend -t homarr:backend .
FROM runtime AS backend
ENV HOMARR_FRONTEND_ENABLED='false'
ENV NGINX_FRONTEND_UPSTREAM='http://127.0.0.1:3002'

# Standalone worker: direct Hono HTTP, no Node, nginx or embedded Redis server.
# docker build --target worker -t homarr:worker .
# Worker-only Dockerfile (worker is its default target):
# docker build -f apps/backend/Dockerfile -t homarr:worker-mini-local .
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

# The default image retains the dashboard and runs its backend independently.
FROM runtime AS runner
COPY --from=frontend-builder /app/apps/nextjs/.output/standalone ./
ENV HOMARR_FRONTEND_ENABLED='true'
ENV BACKEND_LEGACY_TRPC='true'
ENV NGINX_FRONTEND_UPSTREAM='http://127.0.0.1:3000'
