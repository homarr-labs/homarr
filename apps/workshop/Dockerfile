# syntax=docker/dockerfile:1.10

ARG POCKETBASE_IMAGE=ghcr.io/muchobien/pocketbase:0.39.9@sha256:c0667fe6c5197ff226ff642120ab1ad870c3f2f27300940a61e5a7fa082b6816

FROM node:24.18.0-alpine AS dependencies
WORKDIR /app
ENV COREPACK_HOME=/corepack
RUN mkdir -p /corepack && corepack enable pnpm && corepack install --global pnpm@11.11.0
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY patches ./patches
COPY apps/docs ./apps/docs
COPY packages/custom-widgets ./packages/custom-widgets
COPY packages/definitions ./packages/definitions
COPY packages/workshop ./packages/workshop
COPY scripts/build-workshop-validator.mjs ./scripts/build-workshop-validator.mjs
COPY tooling/typescript ./tooling/typescript
RUN pnpm config set store-dir /pnpm/store && pnpm install --filter @homarr/docs... --frozen-lockfile
RUN pnpm build:workshop-validator

FROM dependencies AS website
ARG HOMARR_WEBSITE_URL=https://homarr.dev
ARG WORKSHOP_API_URL=https://homarr.dev
ARG WORKSHOP_WEB_URL=https://homarr.dev/workshop
ARG DOCS_BASE_URL=/
ENV HOMARR_WEBSITE_URL=$HOMARR_WEBSITE_URL
ENV WORKSHOP_API_URL=$WORKSHOP_API_URL
ENV WORKSHOP_WEB_URL=$WORKSHOP_WEB_URL
ENV DOCS_BASE_URL=$DOCS_BASE_URL
RUN CI=true SKIP_ENV_VALIDATION=true pnpm turbo build --filter=@homarr/docs \
  && mkdir -p /app/workshop-public \
  && docs_path="$(printf '%s' "$DOCS_BASE_URL" | sed 's#^/*##; s#/*$##')" \
  && if [ -z "$docs_path" ]; then \
    cp -R /app/apps/docs/build/. /app/workshop-public/; \
  else \
    mkdir -p "/app/workshop-public/$docs_path" \
    && cp -R /app/apps/docs/build/. "/app/workshop-public/$docs_path/" \
    && cp /app/apps/docs/build/index.html /app/workshop-public/index.html; \
  fi

FROM ${POCKETBASE_IMAGE} AS pocketbase-runtime
ENV PORT=8090
RUN addgroup -S pocketbase && adduser -S -G pocketbase pocketbase
COPY apps/workshop/entrypoint.sh /usr/local/bin/workshop-entrypoint
COPY apps/workshop/workshop-url.awk /usr/local/lib/workshop-url.awk
RUN chmod 755 /usr/local/bin/workshop-entrypoint \
  && chmod 644 /usr/local/lib/workshop-url.awk \
  && mkdir -p /pb_data /pb_public \
  && chown pocketbase:pocketbase /pb_data /pb_public
ENTRYPOINT ["workshop-entrypoint"]

FROM pocketbase-runtime AS development
COPY --chown=pocketbase:pocketbase apps/workshop/pb_migrations /pb_migrations
COPY --chown=pocketbase:pocketbase apps/workshop/pb_hooks /pb_hooks
COPY --from=dependencies --chown=pocketbase:pocketbase \
  /app/apps/workshop/pb_hooks/widget-validator.bundle.cjs \
  /pb_hooks/widget-validator.bundle.cjs
EXPOSE 8090
HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=6 CMD wget -q --spider "http://127.0.0.1:${PORT}/api/health" || exit 1

FROM pocketbase-runtime AS production
ENV WORKSHOP_REQUIRE_PUBLIC_ORIGIN=true
COPY --from=website /app/workshop-public /pb_public
COPY apps/workshop/pb_migrations /pb_migrations
COPY apps/workshop/pb_hooks /pb_hooks
COPY --from=dependencies \
  /app/apps/workshop/pb_hooks/widget-validator.bundle.cjs \
  /pb_hooks/widget-validator.bundle.cjs
RUN chown -R pocketbase:pocketbase /pb_hooks /pb_migrations /pb_public
EXPOSE 8090
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD wget -q --spider "http://127.0.0.1:${PORT}/api/health" || exit 1
