# syntax=docker/dockerfile:1.10

FROM node:24.18.0-alpine AS website
WORKDIR /app

RUN corepack enable pnpm
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY patches ./patches
RUN --mount=type=cache,id=workshop-pnpm-store,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store && \
    pnpm --config.node-linker=isolated fetch --ignore-scripts && \
    rm -rf node_modules

COPY apps/docs ./apps/docs
COPY packages/definitions ./packages/definitions
COPY packages/validation ./packages/validation
COPY packages/workshop ./packages/workshop
COPY tooling/typescript ./tooling/typescript
RUN --mount=type=cache,id=workshop-pnpm-store,target=/pnpm/store \
    pnpm install --recursive --offline --frozen-lockfile && \
    CI=true SKIP_ENV_VALIDATION=true pnpm turbo build --filter=@homarr/docs

FROM alpine:3.22 AS pocketbase

ARG TARGETARCH
ARG POCKETBASE_VERSION=0.39.6

RUN apk add --no-cache ca-certificates curl unzip
RUN case "${TARGETARCH}" in \
      amd64) PB_ARCH=amd64 ;; \
      arm64) PB_ARCH=arm64 ;; \
      arm) PB_ARCH=armv7 ;; \
      *) echo "Unsupported architecture: ${TARGETARCH}" >&2; exit 1 ;; \
    esac && \
    BASE_URL="https://github.com/pocketbase/pocketbase/releases/download/v${POCKETBASE_VERSION}" && \
    ARCHIVE="pocketbase_${POCKETBASE_VERSION}_linux_${PB_ARCH}.zip" && \
    curl --fail --location --silent --show-error "${BASE_URL}/${ARCHIVE}" --output "/tmp/${ARCHIVE}" && \
    curl --fail --location --silent --show-error "${BASE_URL}/checksums.txt" --output /tmp/checksums.txt && \
    cd /tmp && grep " ${ARCHIVE}$" checksums.txt | sha256sum -c - && \
    unzip "/tmp/${ARCHIVE}" pocketbase -d /out

FROM alpine:3.22

RUN apk add --no-cache ca-certificates tzdata && addgroup -S pocketbase && adduser -S -G pocketbase pocketbase
COPY --from=pocketbase /out/pocketbase /usr/local/bin/pocketbase
COPY --from=website /app/apps/docs/build /pb_public
COPY apps/workshop/entrypoint.sh /usr/local/bin/workshop-entrypoint
COPY apps/workshop/pb_hooks /pb_hooks
COPY apps/workshop/pb_migrations /pb_migrations

RUN chmod +x /usr/local/bin/workshop-entrypoint && \
    mkdir -p /pb_data && \
    chown -R pocketbase:pocketbase /pb_data /pb_hooks /pb_migrations /pb_public

USER pocketbase
EXPOSE 8090
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD wget -q --spider http://127.0.0.1:8090/api/health || exit 1
ENTRYPOINT ["workshop-entrypoint"]
