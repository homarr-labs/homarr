FROM node:20-alpine AS base

FROM base AS builder
RUN apk add --no-cache libc6-compat
RUN apk update
# Set working directory
WORKDIR /app
COPY . .
RUN npm i -g turbo
RUN turbo prune @homarr/nextjs --docker --out-dir ./next-out
RUN turbo prune @homarr/tasks --docker --out-dir ./tasks

# Add lockfile and package.json's of isolated subworkspace
FROM base AS installer
RUN apk add --no-cache libc6-compat curl bash
RUN apk update
WORKDIR /app

# First install the dependencies (as they change less often)
COPY .gitignore .gitignore

COPY --from=builder /app/tasks/json/ .
COPY --from=builder /app/tasks/pnpm-lock.yaml ./pnpm-lock.yaml
RUN corepack enable pnpm && pnpm install --prod
RUN rm -rf node_modules/next
RUN rm -rf node_modules/typescript
RUN rm -rf node_modules/@babel
RUN rm -rf node_modules/esbuild
RUN rm -rf node_modules/@esbuild
RUN rm -rf node_modules/@typescript-eslint
RUN rm -rf node_modules/prettier
RUN rm -rf node_modules/webpack
RUN rm -rf node_modules/eslint
RUN rm -rf node_modules/@swc
RUN mv node_modules ./temp_node_modules


COPY --from=builder /app/next-out/json/ .
COPY --from=builder /app/next-out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN corepack enable pnpm && pnpm install

# Build the project
COPY --from=builder /app/tasks/full/ .
COPY --from=builder /app/next-out/full/ .
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

COPY --from=installer /app/temp_node_modules ./node_modules
COPY --from=installer --chown=nextjs:nodejs /app/apps/tasks/tasks.cjs ./apps/tasks/tasks.cjs
COPY --from=installer --chown=nextjs:nodejs /app/temp_node_modules/better-sqlite3/build/Release/better_sqlite3.node /app/build/better_sqlite3.node

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=installer --chown=nextjs:nodejs /app/apps/nextjs/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app/apps/nextjs/.next/static ./apps/nextjs/.next/static
COPY --from=installer --chown=nextjs:nodejs /app/apps/nextjs/public ./apps/nextjs/public
COPY --chown=nextjs:nodejs scripts/run.sh ./run.sh
COPY --chown=nextjs:nodejs packages/db/migrations ./db/migrations
COPY --chown=nextjs:nodejs packages/db/migrate.mjs ./db/migrate.mjs

ENV DB_URL='/app/db/db.sqlite'

CMD ["sh", "run.sh"]