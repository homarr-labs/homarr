# syntax=docker/dockerfile:1.25

ARG POCKETBASE_IMAGE=ghcr.io/muchobien/pocketbase:0.39.9@sha256:c0667fe6c5197ff226ff642120ab1ad870c3f2f27300940a61e5a7fa082b6816

FROM golang:1.25.7-alpine AS pocketbase-builder
WORKDIR /src
COPY apps/workshop/go.mod apps/workshop/go.sum ./
RUN --mount=type=cache,id=workshop-go-mod,target=/go/pkg/mod go mod download
COPY apps/workshop/*.go ./
RUN --mount=type=cache,id=workshop-go-mod,target=/go/pkg/mod \
  CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/pocketbase .

FROM pocketbase-builder AS pocketbase-test
RUN --mount=type=cache,id=workshop-go-mod,target=/go/pkg/mod go test ./...

FROM oven/bun:1.4.2-alpine AS bun-tool

FROM node:24.18.0-alpine AS dependencies
COPY --from=bun-tool /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /app
RUN apk add --no-cache libstdc++ python3 make g++
COPY bun.lock bunfig.toml package.json turbo.json ./
COPY patches ./patches
COPY apps/docs/package.json ./apps/docs/package.json
COPY packages/common/package.json ./packages/common/package.json
COPY packages/core/package.json ./packages/core/package.json
COPY packages/custom-widgets/package.json ./packages/custom-widgets/package.json
COPY packages/definitions/package.json ./packages/definitions/package.json
COPY packages/db/package.json ./packages/db/package.json
COPY packages/server-settings/package.json ./packages/server-settings/package.json
COPY packages/settings/package.json ./packages/settings/package.json
COPY packages/translation/package.json ./packages/translation/package.json
COPY packages/ui/package.json ./packages/ui/package.json
COPY packages/validation/package.json ./packages/validation/package.json
COPY packages/workshop/package.json ./packages/workshop/package.json
COPY tooling/typescript/package.json ./tooling/typescript/package.json
RUN --mount=type=cache,id=workshop-bun-cache,target=/root/.bun/install/cache \
    npm_config_nodedir=/usr/local bun install --filter @homarr/docs --filter homarr --frozen-lockfile --concurrent-scripts=1

COPY apps/docs ./apps/docs
COPY tools/motion-reel/three ./tools/motion-reel/three
COPY packages/common ./packages/common
COPY packages/core ./packages/core
COPY packages/custom-widgets ./packages/custom-widgets
COPY packages/definitions ./packages/definitions
COPY packages/db ./packages/db
COPY packages/server-settings ./packages/server-settings
COPY packages/settings ./packages/settings
COPY packages/translation ./packages/translation
COPY packages/ui ./packages/ui
COPY packages/validation ./packages/validation
COPY packages/workshop ./packages/workshop
COPY tooling/typescript ./tooling/typescript

FROM dependencies AS website
ARG TARGETPLATFORM
ARG KAPA_WEBSITE_ID=1e4656f4-abeb-4343-bbae-1d8626f52378
ENV KAPA_WEBSITE_ID=$KAPA_WEBSITE_ID
ARG HOMARR_WEBSITE_URL=https://homarr.dev
ARG WORKSHOP_API_URL=https://homarr.dev
ARG WORKSHOP_WEB_URL=https://homarr.dev/workshop
ENV HOMARR_WEBSITE_URL=$HOMARR_WEBSITE_URL
ENV WORKSHOP_API_URL=$WORKSHOP_API_URL
ENV WORKSHOP_WEB_URL=$WORKSHOP_WEB_URL
RUN --mount=type=secret,id=TURBO_API,env=TURBO_API \
    --mount=type=secret,id=TURBO_TEAM,env=TURBO_TEAM \
    --mount=type=secret,id=TURBO_TOKEN,env=TURBO_TOKEN \
    --mount=type=secret,id=TURBO_REMOTE_CACHE_SIGNATURE_KEY,env=TURBO_REMOTE_CACHE_SIGNATURE_KEY \
    --mount=type=cache,id=workshop-next-build-${TARGETPLATFORM},target=/app/apps/docs/.next/cache,sharing=locked \
    --mount=type=cache,id=workshop-turbo-${TARGETPLATFORM},target=/app/.turbo,sharing=locked \
    TURBO_PLATFORM="${TARGETPLATFORM:-linux/amd64}/musl/node-24.18.0" \
    CI=true SKIP_ENV_VALIDATION=true bun run turbo run build --filter=@homarr/docs

FROM ${POCKETBASE_IMAGE} AS pocketbase-runtime
ENV PORT=8090
COPY --from=pocketbase-builder /out/pocketbase /usr/local/bin/pocketbase
RUN addgroup -S pocketbase && adduser -S -G pocketbase pocketbase
COPY apps/workshop/entrypoint.sh /usr/local/bin/workshop-entrypoint
RUN chmod 755 /usr/local/bin/workshop-entrypoint && mkdir -p /pb_data /pb_public && chown pocketbase:pocketbase /pb_data /pb_public
VOLUME ["/pb_data"]
ENTRYPOINT ["workshop-entrypoint"]

FROM pocketbase-runtime AS development
EXPOSE 8090
HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=6 CMD wget -q --spider "http://127.0.0.1:${PORT}/api/health" || exit 1

FROM pocketbase-runtime AS production
ARG HOMARR_WEBSITE_URL=https://homarr.dev
ARG WORKSHOP_API_URL=https://homarr.dev
ARG WORKSHOP_WEB_URL=https://homarr.dev/workshop
ENV HOMARR_WEBSITE_URL=$HOMARR_WEBSITE_URL
ENV WORKSHOP_API_URL=$WORKSHOP_API_URL
ENV WORKSHOP_WEB_URL=$WORKSHOP_WEB_URL
COPY --from=website /app/apps/docs/out /pb_public
COPY apps/workshop/pb_migrations /pb_migrations
COPY apps/workshop/pb_hooks /pb_hooks
RUN chown -R pocketbase:pocketbase /pb_hooks /pb_migrations /pb_public
EXPOSE 8090
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD wget -q --spider "http://127.0.0.1:${PORT}/api/health" || exit 1
