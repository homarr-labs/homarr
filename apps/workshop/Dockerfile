FROM alpine:3.22 AS download

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
COPY --from=download /out/pocketbase /usr/local/bin/pocketbase
COPY entrypoint.sh /usr/local/bin/workshop-entrypoint

RUN chmod +x /usr/local/bin/workshop-entrypoint && mkdir -p /pb_data /pb_hooks /pb_migrations && chown -R pocketbase:pocketbase /pb_data /pb_hooks /pb_migrations

USER pocketbase
EXPOSE 8090
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD wget -q --spider http://127.0.0.1:8090/api/health || exit 1
ENTRYPOINT ["workshop-entrypoint"]
