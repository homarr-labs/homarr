# syntax=docker/dockerfile:1.25

FROM node:24.18.0-alpine AS base

FROM base AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat curl bash && apk update

RUN corepack enable pnpm
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY patches ./patches
# Workaround for pnpm/pnpm#5268: pnpm fetch crashes when patchedDependencies
# are configured with nodeLinker: hoisted. The applyPatchToDir function tries
# to chdir into node_modules/<pkg> which doesn't exist during fetch (only the
# content-addressable store is populated). By temporarily switching to the
# isolated linker, patches apply inside the virtual store (node_modules/.pnpm/...)
# which IS created by pnpm fetch. The original hoisted linker is restored
# before the install step so the final node_modules layout stays flat.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store && \
    sed -i 's/nodeLinker: hoisted/nodeLinker: isolated/' pnpm-workspace.yaml && \
    pnpm fetch && \
    sed -i 's/nodeLinker: isolated/nodeLinker: hoisted/' pnpm-workspace.yaml

COPY . .
# Follow the pnpm fetch pattern from https://pnpm.io/cli/fetch
# --frozen-lockfile is omitted as recommended by the pnpm fetch docs
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --recursive

ARG SKIP_ENV_VALIDATION='true'
ARG CI='true'
ARG DISABLE_REDIS_LOGS='true'
ARG TARGETPLATFORM

RUN --mount=type=secret,id=TURBO_API,env=TURBO_API \
    --mount=type=secret,id=TURBO_TEAM,env=TURBO_TEAM \
    --mount=type=secret,id=TURBO_TOKEN,env=TURBO_TOKEN \
    --mount=type=secret,id=TURBO_REMOTE_CACHE_SIGNATURE_KEY,env=TURBO_REMOTE_CACHE_SIGNATURE_KEY \
    TURBO_PLATFORM="${TARGETPLATFORM:-linux/amd64}" pnpm build

FROM base AS runner
WORKDIR /app

# gettext is required for envsubst, openssl for generating AUTH_SECRET, su-exec for running application as non-root
RUN apk add --no-cache redis nginx bash gettext su-exec openssl
RUN mkdir /appdata
VOLUME /appdata

# Enable homarr cli
COPY --from=builder /app/packages/cli/cli.cjs /app/apps/cli/cli.cjs
RUN echo $'#!/bin/bash\ncd /app/apps/cli && node ./cli.cjs "$@"' > /usr/bin/homarr
RUN chmod +x /usr/bin/homarr

# Don't run production as root
RUN mkdir -p /var/cache/nginx && \
    mkdir -p /var/log/nginx && \
    mkdir -p /var/lib/nginx && \
    touch /run/nginx/nginx.pid && \
    mkdir -p /etc/nginx/templates /etc/nginx/ssl/certs

COPY --from=builder /app/apps/nextjs/next.config.ts .
COPY --from=builder /app/apps/nextjs/package.json .
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

COPY --from=builder /app/node_modules/better-sqlite3/build/Release/better_sqlite3.node /app/build/better_sqlite3.node

COPY --from=builder /app/packages/db/migrations ./db/migrations

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder /app/apps/nextjs/.next/standalone ./
COPY --from=builder /app/apps/nextjs/.next/static ./apps/nextjs/.next/static
COPY --from=builder /app/apps/nextjs/public ./apps/nextjs/public
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

ENTRYPOINT [ "/app/entrypoint.sh" ]
CMD ["sh", "run.sh"]
