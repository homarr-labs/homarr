FROM node:24.11.1-trixie AS base
WORKDIR /app
COPY package.json .
COPY pnpm-lock.yaml .
RUN corepack enable pnpm && pnpm install --frozen-lockfile
CMD ["sleep", "60s"]