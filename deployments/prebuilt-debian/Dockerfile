FROM oven/bun:1.4.2 AS bun-tool
FROM node:24.18.0-trixie
WORKDIR /app
COPY --from=bun-tool /usr/local/bin/bun /usr/local/bin/bun
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --concurrent-scripts=1
CMD ["sleep", "60s"]
