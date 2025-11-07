FROM node:24.11.0-alpine AS base

WORKDIR /app
RUN apk add --no-cache libc6-compat curl bash
RUN apk update

FROM base AS deps
# Files required by pnpm install
COPY pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./

# If you patched any package, include patches before install too
COPY patches patches

RUN corepack enable pnpm && pnpm fetch

#FROM base AS prod-deps
#RUN corepack enable pnpm && pnpm install --recursive --frozen-lockfile --prod

FROM deps AS builder

COPY . .
RUN pnpm install -r --offline

# Copy static data as it is not part of the build
COPY static-data ./static-data
ARG SKIP_ENV_VALIDATION='true'
ARG CI='true'
ARG DISABLE_REDIS_LOGS='true'

RUN corepack enable pnpm && pnpm build

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

COPY --from=builder /app/node_modules/better-sqlite3/build/Release/better_sqlite3.node /app/build/better_sqlite3.node

COPY --from=builder /app/packages/db/migrations ./db/migrations

# Copy Next.js build output (no longer using standalone mode)
COPY --from=builder /app/apps/nextjs/.next ./.next
COPY --from=builder /app/apps/nextjs/public ./public
COPY --from=builder /app/apps/nextjs/server.cjs ./server.cjs
COPY --from=builder /app/node_modules ./node_modules
COPY scripts/run.sh ./run.sh
COPY --chmod=777 scripts/entrypoint.sh ./entrypoint.sh
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

