# syntax=docker/dockerfile:1.25

FROM oven/bun:1.4.2-alpine AS bun-tool

FROM node:24.18.0-alpine AS base

FROM base AS builder
ARG TARGETPLATFORM
WORKDIR /app
COPY --from=bun-tool /usr/local/bin/bun /usr/local/bin/bun
# Compiler tools stay in the builder for optional native dependency fallbacks.
RUN apk add --no-cache libstdc++ python3 make g++
COPY bun.lock bunfig.toml package.json ./
COPY patches ./patches
COPY --parents ./apps/*/package.json ./packages/*/package.json ./tooling/*/package.json ./
COPY --parents ./packages/definitions/src ./
RUN --mount=type=cache,id=homarr-bun-cache,target=/root/.bun/install/cache,sharing=locked \
    npm_config_nodedir=/usr/local bun install --frozen-lockfile --concurrent-scripts=1

COPY . .
ARG SKIP_ENV_VALIDATION='true'
ARG CI='true'
ARG DISABLE_REDIS_LOGS='true'
ARG TARGETPLATFORM
RUN --mount=type=secret,id=TURBO_API,env=TURBO_API \
    --mount=type=secret,id=TURBO_TEAM,env=TURBO_TEAM \
    --mount=type=secret,id=TURBO_TOKEN,env=TURBO_TOKEN \
    --mount=type=secret,id=TURBO_REMOTE_CACHE_SIGNATURE_KEY,env=TURBO_REMOTE_CACHE_SIGNATURE_KEY \
    --mount=type=cache,id=homarr-next-build-${TARGETPLATFORM},target=/app/apps/nextjs/.next/cache,sharing=locked \
    --mount=type=cache,id=homarr-turbo-${TARGETPLATFORM},target=/app/.turbo,sharing=locked \
    TURBO_PLATFORM="${TARGETPLATFORM:-linux/amd64}/musl/node-24.18.0" \
    bun run turbo run build --filter=@homarr/nextjs... --filter=@homarr/cli

FROM alpine:3.24.1 AS runner
WORKDIR /app
COPY --from=base /usr/local/bin/node /usr/local/bin/node
# envsubst, privilege drop and AUTH_SECRET generation are used by the entrypoint.
RUN apk add --no-cache libstdc++ ca-certificates redis nginx bash gettext su-exec openssl && \
    mkdir -p /appdata /var/cache/nginx /var/log/nginx /var/lib/nginx \
      /run/nginx /etc/nginx/templates /etc/nginx/ssl/certs && \
    touch /run/nginx/nginx.pid
VOLUME /appdata
COPY --from=builder /app/packages/cli/cli.cjs /app/apps/cli/cli.cjs
# Bundled CLI/migrations resolve the native binding from the application root.
COPY --from=builder /app/node_modules/better-sqlite3/build/Release/better_sqlite3.node /app/build/better_sqlite3.node
RUN printf '#!/bin/sh\ncd /app/apps/cli && exec node ./cli.cjs "$@"\n' > /usr/bin/homarr && \
    chmod +x /usr/bin/homarr
COPY --from=builder /app/packages/db/migrations ./db/migrations
# Ship only Next's traced production dependencies and application assets.
COPY --from=builder /app/apps/nextjs/.output/standalone ./
COPY scripts/run.sh ./run.sh
COPY --chmod=755 scripts/entrypoint.sh ./entrypoint.sh
COPY packages/redis/redis.conf /app/redis.conf
COPY nginx.conf /etc/nginx/templates/nginx.conf
ENV DB_URL='/appdata/db/db.sqlite'
ENV DB_DIALECT='sqlite'
ENV DB_DRIVER='better-sqlite3'
ENV AUTH_PROVIDERS='credentials'
ENV REDIS_IS_EXTERNAL='false'
ENV NODE_ENV='production'
EXPOSE 7575
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["sh", "run.sh"]
