FROM node:22.12.0-alpine AS base

FROM base AS builder
RUN apk add --no-cache libc6-compat
RUN apk update

# Set working directory
WORKDIR /app
COPY . .
RUN npm i -g turbo
RUN turbo prune @homarr/nextjs --docker --out-dir ./next-out
RUN turbo prune @homarr/tasks --docker --out-dir ./tasks-out
RUN turbo prune @homarr/websocket --docker --out-dir ./websocket-out
RUN turbo prune @homarr/db --docker --out-dir ./migration-out
RUN turbo prune @homarr/cli --docker --out-dir ./cli-out

# Add lockfile and package.json's of isolated subworkspace
FROM base AS installer
RUN apk add --no-cache libc6-compat curl bash
RUN apk update
WORKDIR /app

# First install the dependencies (as they change less often)
COPY .gitignore .gitignore

COPY --from=builder /app/tasks-out/json/ .
COPY --from=builder /app/websocket-out/json/ .
COPY --from=builder /app/migration-out/json/ .
COPY --from=builder /app/cli-out/json/ .
COPY --from=builder /app/next-out/json/ .
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml

# Is used for postinstall of docs definitions
COPY --from=builder /app/packages/definitions/src/docs ./packages/definitions/src/docs

# Uses the lockfile to install the dependencies
RUN corepack enable pnpm && pnpm install --recursive --frozen-lockfile

# Install sharp for image optimization
RUN corepack enable pnpm && pnpm install sharp -w

# Build the project
COPY --from=builder /app/tasks-out/full/ .
COPY --from=builder /app/websocket-out/full/ .
COPY --from=builder /app/next-out/full/ .
COPY --from=builder /app/migration-out/full/ .
COPY --from=builder /app/cli-out/full/ .

# Copy static data as it is not part of the build
COPY static-data ./static-data
ARG SKIP_ENV_VALIDATION='true'
ARG CI='true'
ARG DISABLE_REDIS_LOGS='true'
RUN corepack enable pnpm && pnpm build

FROM base AS runner
WORKDIR /app

# gettext is required for envsubst
RUN apk add --no-cache redis nginx bash gettext
RUN mkdir /appdata
VOLUME /appdata
RUN mkdir /secrets
VOLUME /secrets



RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Enable homarr cli
COPY --from=installer --chown=nextjs:nodejs /app/packages/cli/cli.cjs /app/apps/cli/cli.cjs
RUN echo $'#!/bin/bash\ncd /app/apps/cli && node ./cli.cjs "$@"' > /usr/bin/homarr
RUN chmod +x /usr/bin/homarr

# Don't run production as root
RUN chown -R nextjs:nodejs /appdata
RUN chown -R nextjs:nodejs /secrets
RUN mkdir -p /var/cache/nginx && chown -R nextjs:nodejs /var/cache/nginx && \
    mkdir -p /var/log/nginx && chown -R nextjs:nodejs /var/log/nginx && \
    mkdir -p /var/lib/nginx && chown -R nextjs:nodejs /var/lib/nginx && \
    touch /run/nginx/nginx.pid && chown -R nextjs:nodejs /run/nginx/nginx.pid && \
    mkdir -p /etc/nginx/templates /etc/nginx/ssl/certs && chown -R nextjs:nodejs /etc/nginx
USER nextjs

COPY --from=installer /app/apps/nextjs/next.config.mjs .
COPY --from=installer /app/apps/nextjs/package.json .

COPY --from=installer --chown=nextjs:nodejs /app/apps/tasks/tasks.cjs ./apps/tasks/tasks.cjs
COPY --from=installer --chown=nextjs:nodejs /app/apps/websocket/wssServer.cjs ./apps/websocket/wssServer.cjs
COPY --from=installer --chown=nextjs:nodejs /app/node_modules/better-sqlite3/build/Release/better_sqlite3.node /app/build/better_sqlite3.node

COPY --from=installer --chown=nextjs:nodejs /app/packages/db/migrations ./db/migrations

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=installer --chown=nextjs:nodejs /app/apps/nextjs/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app/apps/nextjs/.next/static ./apps/nextjs/.next/static
COPY --from=installer --chown=nextjs:nodejs /app/apps/nextjs/public ./apps/nextjs/public
COPY --chown=nextjs:nodejs scripts/run.sh ./run.sh
COPY --chown=nextjs:nodejs scripts/generateEncryptionKey.js ./generateEncryptionKey.js
COPY --chown=nextjs:nodejs packages/redis/redis.conf /app/redis.conf
COPY --chown=nextjs:nodejs nginx.conf /etc/nginx/templates/nginx.conf


ENV DB_URL='/appdata/db/db.sqlite'
ENV DB_DIALECT='sqlite'
ENV DB_DRIVER='better-sqlite3'
ENV AUTH_PROVIDERS='credentials'

CMD ["sh", "run.sh"]
