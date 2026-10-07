FROM oven/bun:1.4.2 AS bun-tool

FROM node:24.18.0-bookworm-slim AS dependencies
WORKDIR /converter
COPY --from=bun-tool /usr/local/bin/bun /usr/local/bin/bun
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production --ignore-scripts

FROM node:24.18.0-bookworm-slim
WORKDIR /converter
COPY --from=dependencies /converter/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY legacy ./legacy
ENTRYPOINT ["node", "src/cli.mjs"]
