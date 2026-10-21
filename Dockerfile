# syntax=docker/dockerfile:1.25

FROM oven/bun:1.4.2-alpine AS bun-tool

FROM node:24.18.0-alpine AS base

FROM base AS sources
ARG TARGETPLATFORM
WORKDIR /app
COPY --from=bun-tool /usr/local/bin/bun /usr/local/bin/bun
# Native Node bindings remain available for the migration and administration CLI.
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
    --mount=type=cache,id=homarr-next-build-${TARGETPLATFORM},target=/app/apps/nextjs/.next/cache,sharing=locked \
    --mount=type=cache,id=homarr-turbo-${TARGETPLATFORM},target=/app/.turbo,sharing=locked \
    TURBO_PLATFORM="${TARGETPLATFORM:-linux/amd64}/musl/node-24.18.0" \
    bun run turbo run build --filter=@homarr/nextjs...

FROM alpine:3.24.2 AS runtime
WORKDIR /app
COPY --from=base /usr/local/bin/node /usr/local/bin/node
COPY --from=bun-tool /usr/local/bin/bun /usr/local/bin/bun
# Node runs the existing migrations/CLI; Bun owns HTTP, tasks and subscriptions.
RUN apk add --no-cache libstdc++ ca-certificates redis nginx bash gettext su-exec openssl && \
    mkdir -p /appdata /var/cache/nginx /var/log/nginx /var/lib/nginx \
      /run/nginx /etc/nginx/templates /etc/nginx/ssl/certs && \
    touch /run/nginx/nginx.pid
VOLUME /appdata
COPY --from=backend-builder /app/packages/cli/cli.cjs /app/apps/cli/cli.cjs
COPY --from=backend-builder /app/packages/db/migrations ./db/migrations
COPY --from=backend-builder /app/node_modules/better-sqlite3/build/Release/better_sqlite3.node /app/build/better_sqlite3.node
COPY --from=backend-builder /app/apps/backend/build/ ./apps/backend/
# Bundled Node migrations locate the native binding relative to a module root.
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

# The default image retains the dashboard and runs its backend independently.
FROM runtime AS runner
COPY --from=frontend-builder /app/apps/nextjs/.output/standalone ./
ENV HOMARR_FRONTEND_ENABLED='true'
ENV BACKEND_LEGACY_TRPC='true'
ENV NGINX_FRONTEND_UPSTREAM='http://127.0.0.1:3000'
