ARG NODE_IMAGE=node:24.18.0-trixie-slim
ARG BUN_IMAGE=oven/bun:1.4.3-debian
FROM ${BUN_IMAGE} AS bun-tool
FROM ${NODE_IMAGE}
WORKDIR /app
COPY --from=bun-tool /usr/local/bin/bun /usr/local/bin/bun
# Keep the fallback compiler inside this temporary native-binding image.
RUN if command -v apk >/dev/null; then \
      apk add --no-cache python3 make g++; \
    else \
      apt-get update && \
      apt-get install -y --no-install-recommends ca-certificates python3 make g++ && \
      rm -rf /var/lib/apt/lists/*; \
    fi
COPY package.json bun.lock ./
RUN npm_config_nodedir=/usr/local bun install --frozen-lockfile --concurrent-scripts=1 && \
    node -e 'const Database = require("better-sqlite3"); const db = new Database(":memory:"); db.prepare("SELECT 1").get(); db.close()'
