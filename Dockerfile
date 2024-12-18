FROM node:22.12.0-alpine AS base

FROM base AS builder
RUN apk add --no-cache libc6-compat
RUN apk update

# Set working directory
WORKDIR /app
RUN apk add --no-cache libc6-compat curl bash
RUN apk update
COPY . .

RUN corepack enable pnpm && pnpm install --recursive --frozen-lockfile

# Install sharp for image optimization
RUN corepack enable pnpm && pnpm install sharp -w

# Copy static data as it is not part of the build
COPY static-data ./static-data
ARG SKIP_ENV_VALIDATION='true'
ARG CI='true'
ARG DISABLE_REDIS_LOGS='true'
RUN corepack enable pnpm && pnpm build

FROM base AS runner
WORKDIR /app

# gettext is required for envsubst
RUN apk add --no-cache redis nginx bash gettext su-exec
RUN mkdir /appdata
VOLUME /appdata
RUN mkdir /secrets
VOLUME /secrets



RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Enable homarr cli
COPY --from=builder --chown=nextjs:nodejs /app/packages/cli/cli.cjs /app/apps/cli/cli.cjs
RUN echo $'#!/bin/bash\ncd /app/apps/cli && node ./cli.cjs "$@"' > /usr/bin/homarr
RUN chmod +x /usr/bin/homarr

# Don't run production as root
RUN chown -R nextjs:nodejs /secrets
RUN mkdir -p /var/cache/nginx && chown -R nextjs:nodejs /var/cache/nginx && \
    mkdir -p /var/log/nginx && chown -R nextjs:nodejs /var/log/nginx && \
    mkdir -p /var/lib/nginx && chown -R nextjs:nodejs /var/lib/nginx && \
    touch /run/nginx/nginx.pid && chown -R nextjs:nodejs /run/nginx/nginx.pid && \
    mkdir -p /etc/nginx/templates /etc/nginx/ssl/certs && chown -R nextjs:nodejs /etc/nginx

COPY --from=builder /app/apps/nextjs/next.config.mjs .
COPY --from=builder /app/apps/nextjs/package.json .

COPY --from=builder --chown=nextjs:nodejs /app/apps/tasks/tasks.cjs ./apps/tasks/tasks.cjs
COPY --from=builder --chown=nextjs:nodejs /app/apps/websocket/wssServer.cjs ./apps/websocket/wssServer.cjs
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/better-sqlite3/build/Release/better_sqlite3.node /app/build/better_sqlite3.node

COPY --from=builder --chown=nextjs:nodejs /app/packages/db/migrations ./db/migrations

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/apps/nextjs/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/nextjs/.next/static ./apps/nextjs/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/nextjs/public ./apps/nextjs/public
COPY --chown=nextjs:nodejs scripts/run.sh ./run.sh
COPY scripts/entry-point.sh ./entry-point.sh
RUN chmod +x ./entrypoint.sh
COPY --chown=nextjs:nodejs scripts/generateRandomSecureKey.js ./generateRandomSecureKey.js
COPY --chown=nextjs:nodejs packages/redis/redis.conf /app/redis.conf
COPY --chown=nextjs:nodejs nginx.conf /etc/nginx/templates/nginx.conf


ENV DB_URL='/appdata/db/db.sqlite'
ENV DB_DIALECT='sqlite'
ENV DB_DRIVER='better-sqlite3'
ENV AUTH_PROVIDERS='credentials'

ENTRYPOINT [ "/app/entrypoint.sh" ]
CMD ["sh", "run.sh"]
