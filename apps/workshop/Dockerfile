# syntax=docker/dockerfile:1.10

FROM node:24.18.0-alpine AS docs
WORKDIR /app

RUN corepack enable

COPY . .
RUN --mount=type=cache,id=workshop-pnpm,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store && \
    pnpm install --frozen-lockfile --filter @homarr/docs...
RUN WORKSHOP_URL="" pnpm --filter @homarr/docs build

FROM alpine:3.22 AS pocketbase
ARG POCKETBASE_VERSION=0.39.6
ARG TARGETARCH

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
    cd /tmp && \
    grep " ${ARCHIVE}$" checksums.txt | sha256sum -c - && \
    unzip "/tmp/${ARCHIVE}" pocketbase -d /out

FROM alpine:3.22 AS runtime
RUN apk add --no-cache ca-certificates tzdata

COPY --from=pocketbase /out/pocketbase /usr/local/bin/pocketbase
COPY --from=docs /app/apps/docs/build /pb_public
COPY apps/workshop/pb_hooks /pb_hooks
COPY apps/workshop/pb_migrations /pb_migrations

RUN addgroup -S workshop && \
    adduser -S -G workshop -h /home/workshop workshop && \
    mkdir -p /pb_data && \
    chown -R workshop:workshop /pb_data /pb_public /pb_hooks /pb_migrations

USER workshop
EXPOSE 8090
VOLUME ["/pb_data"]

HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=10 \
  CMD wget --quiet --spider http://127.0.0.1:8090/api/health || exit 1

ENTRYPOINT ["/usr/local/bin/pocketbase"]
CMD ["serve", "--http=0.0.0.0:8090", "--dir=/pb_data", "--publicDir=/pb_public", "--hooksDir=/pb_hooks", "--migrationsDir=/pb_migrations", "--indexFallback=true"]
