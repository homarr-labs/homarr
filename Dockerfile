# syntax=docker/dockerfile:1.29@sha256:572cebbc2b15e6f84c077742952674889cb63cd5e9b80abdffcbe587b6f19183

FROM oven/bun:1.4.4-debian@sha256:93d5032fe06d163427822dc1598f420363759bb18155c9cc90eb1be05a64a19e AS bun-tool

FROM redis:8.8.4-trixie@sha256:6e61ab45b3e867bacbef2fdd969ec74f4e0f8aaca8cc946cb8ac0c494035e7e7 AS redis-tool

FROM node:24.22.3-trixie-slim@sha256:af02d57b57719b9657a45199a79264a9437940cd55b3c7b3fc99615654f124a0 AS base

FROM base AS builder
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
ARG TARGETPLATFORM
RUN --mount=type=secret,id=TURBO_API,env=TURBO_API \
    --mount=type=secret,id=TURBO_TEAM,env=TURBO_TEAM \
    --mount=type=secret,id=TURBO_TOKEN,env=TURBO_TOKEN \
    --mount=type=secret,id=TURBO_REMOTE_CACHE_SIGNATURE_KEY,env=TURBO_REMOTE_CACHE_SIGNATURE_KEY \
    --mount=type=cache,id=homarr-next-build-${TARGETPLATFORM}-glibc-2.41-node-24.22.3,target=/app/apps/nextjs/.next/cache,sharing=locked \
    --mount=type=cache,id=homarr-turbo-${TARGETPLATFORM}-glibc-2.41-node-24.22.3,target=/app/.turbo,sharing=locked \
    TURBO_PLATFORM="${TARGETPLATFORM:-linux/amd64}/glibc-2.41/node-24.22.3" \
    bun run turbo run build --filter=@homarr/nextjs... --filter=@homarr/cli

# Use the fixed upstream Debian packages while Trixie lacks the November 2026 NGINX fixes.
FROM scratch AS nginx-amd64
ADD --chmod=644 --checksum=sha256:7e9e787849bed1fbb677868fc8ee86f8b513cd9e46ad29e41c7710cec3c8825d https://nginx.org/packages/debian/pool/nginx/n/nginx/nginx_1.30.7-1~trixie_amd64.deb /nginx.deb

FROM scratch AS nginx-arm64
ADD --chmod=644 --checksum=sha256:b32bff964b8e64e1297e6da783748b8db1117a68f3d9ad85589b41be79a38f46 https://nginx.org/packages/debian/pool/nginx/n/nginx/nginx_1.30.7-1~trixie_arm64.deb /nginx.deb

FROM nginx-${TARGETARCH} AS nginx-package

FROM debian:trixie-slim@sha256:f6b08b09a05725f9431502d3b5714f5c4576e82c1a84fa1debe0c24a7e0c3ec4 AS runner
WORKDIR /app
# envsubst, privilege drop and AUTH_SECRET generation are used by the entrypoint.
# Keep wget for existing health-check overrides from Alpine-based deployments.
RUN --mount=from=nginx-package,source=/nginx.deb,target=/tmp/nginx.deb \
    apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends \
      libstdc++6 libatomic1 libzstd1 zlib1g ca-certificates bash gettext-base util-linux openssl wget /tmp/nginx.deb && \
    rm -rf /var/lib/apt/lists/* && \
    mkdir -p /appdata /var/cache/nginx /var/log/nginx /var/lib/nginx \
      /run/nginx /etc/nginx/templates /etc/nginx/ssl/certs && \
    touch /run/nginx/nginx.pid
COPY --from=base /usr/local/bin/node /usr/local/bin/node
# Keep Redis's persisted RDB format compatible with the previous Alpine image.
COPY --from=redis-tool /usr/local/bin/redis-server /usr/local/bin/redis-cli /usr/local/bin/
VOLUME /appdata
COPY --from=builder /app/packages/cli/cli.cjs /app/apps/cli/cli.cjs
RUN printf '#!/bin/sh\ncd /app/apps/cli && exec node ./cli.cjs "$@"\n' > /usr/bin/homarr && \
    chmod +x /usr/bin/homarr
COPY --from=builder /app/packages/db/migrations ./db/migrations
# Ship only Next's traced production dependencies and application assets.
COPY --from=builder /app/apps/nextjs/.output/standalone ./
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
EXPOSE 7575
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 CMD ["node", "-e", "fetch('http://127.0.0.1:7575/api/health/live', { method: 'HEAD', signal: AbortSignal.timeout(4000) }).then((response) => { process.exitCode = Number(!response.ok); }).catch((error) => { console.error(error); process.exitCode = 1; })"]
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["sh", "run.sh"]
