FROM oven/bun:1.4.2-slim
WORKDIR /converter
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production --ignore-scripts
COPY src ./src
COPY legacy ./legacy
ENTRYPOINT ["bun", "src/cli.mjs"]
