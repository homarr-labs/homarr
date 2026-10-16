FROM oven/bun:1.4.2 AS build
WORKDIR /app
RUN printf '{"private":true,"type":"module","dependencies":{"hono":"4.13.13"}}' > package.json && bun install --production
COPY packages/remote-protocol ./packages/remote-protocol
COPY apps/relay ./apps/relay
RUN mkdir -p node_modules/@homarr && ln -s ../../packages/remote-protocol node_modules/@homarr/remote-protocol
RUN bun build apps/relay/src/index.ts --target=bun --minify --outfile=/app/relay.js

FROM oven/bun:1.4.2-distroless
WORKDIR /app
COPY --from=build --chown=65532:65532 /app/relay.js ./relay.js
USER 65532:65532
ENV HOST=0.0.0.0 PORT=8787
EXPOSE 8787
ENTRYPOINT ["/usr/local/bin/bun", "/app/relay.js"]
