ARG BUN_IMAGE=oven/bun:1.4.2@sha256:9114c058aeae42162ee16dd5084b95fe9473970bb6bcb5b232ab1630f0546895
FROM ${BUN_IMAGE} AS build
ARG BUN_IMAGE
ARG TARGETPLATFORM
WORKDIR /build
COPY . .
RUN test "$(bun --version)" = "1.4.2" && test -f build-input.json
RUN bun install --frozen-lockfile --ignore-scripts --filter @homarr/nitro-experiment --filter '!./' --minimum-release-age 0
WORKDIR /build/apps/nitro-experiment
RUN bun run build
RUN BUN_IMAGE="$BUN_IMAGE" TARGETPLATFORM="$TARGETPLATFORM" bun scripts/container/package-output.ts

FROM ${BUN_IMAGE} AS runtime
WORKDIR /app
ENV NODE_ENV=production NITRO_HOST=0.0.0.0 NITRO_PORT=3100 NITRO_FIXTURE_ORIGIN=http://127.0.0.1:3100
RUN test "$(bun --version)" = "1.4.2" && test "$(id -u bun)" = "1000" && test "$(id -g bun)" = "1000" && mkdir -p /app/.fixture-data && chown 1000:1000 /app/.fixture-data
COPY --from=build /build/apps/nitro-experiment/.output/ ./.output/
COPY --from=build /build/apps/nitro-experiment/container-provenance.json ./container-provenance.json
COPY --from=build /build/apps/nitro-experiment/scripts/container/healthcheck.ts ./healthcheck.ts
USER 1000:1000
EXPOSE 3100
STOPSIGNAL SIGTERM
HEALTHCHECK --interval=10s --timeout=4s --start-period=20s --retries=3 CMD ["bun", "--no-env-file", "/app/healthcheck.ts"]
ENTRYPOINT ["bun", "--no-env-file"]
CMD [".output/server/index.mjs"]
