FROM node:20.13.1-alpine AS base

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

# Add lockfile and package.json's of isolated subworkspace
FROM base AS installer
RUN apk add --no-cache libc6-compat curl bash
RUN apk update
WORKDIR /app

# First install the dependencies (as they change less often)
COPY .gitignore .gitignore

COPY --from=builder /app/tasks-out/json/ .
COPY --from=builder /app/tasks-out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN corepack enable pnpm && pnpm install

COPY --from=builder /app/websocket-out/json/ .
COPY --from=builder /app/websocket-out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN corepack enable pnpm && pnpm install

COPY --from=builder /app/migration-out/json/ .
COPY --from=builder /app/migration-out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN corepack enable pnpm && pnpm install

COPY --from=builder /app/next-out/json/ .
COPY --from=builder /app/next-out/pnpm-lock.yaml ./pnpm-lock.yaml

RUN corepack enable pnpm && pnpm install sharp -w

# Build the project
COPY --from=builder /app/tasks-out/full/ .
COPY --from=builder /app/websocket-out/full/ .
COPY --from=builder /app/next-out/full/ .
COPY --from=builder /app/migration-out/full/ .
# Copy static data as it is not part of the build
COPY static-data ./static-data
ARG SKIP_ENV_VALIDATION=true
RUN corepack enable pnpm && pnpm turbo run build

FROM base AS runner
WORKDIR /app

RUN apk add --no-cache redis

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
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

ENV DB_URL='/app/db/db.sqlite'
ENV DB_DIALECT='sqlite'
ENV DB_DRIVER='better-sqlite3'

CMD ["sh", "run.sh"]
