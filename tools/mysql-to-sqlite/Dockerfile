FROM node:24.18.0-bookworm-slim
WORKDIR /converter
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY src ./src
COPY legacy ./legacy
ENTRYPOINT ["node", "src/cli.mjs"]
