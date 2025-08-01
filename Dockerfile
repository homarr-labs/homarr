#syntax=docker/dockerfile:1.7-labs

FROM node:22.17.0-alpine AS base


FROM base AS installer
WORKDIR /app

RUN apk add --no-cache python3 make g++ gcc libc6-compat bash
RUN apk update
RUN npm install --global node-gyp

COPY --parents */*/package.json ./
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY ./patches ./patches
COPY ./packages/definitions/src/docs ./packages/definitions/src/docs

# We use corepack as it uses the version of pnpm that is configured in package.json
RUN corepack enable pnpm && pnpm install --frozen-lockfile --recursive --shamefully-hoist

FROM base AS builder
WORKDIR /app

RUN apk add --no-cache python3 make g++ gcc libc6-compat bash
RUN apk update
RUN npm install --global node-gyp

COPY --from=installer /app/node_modules ./node_modules
COPY --from=installer --parents /app/*/*/node_modules ../
COPY . .

ARG SKIP_ENV_VALIDATION='true'
ARG CI='true'
ARG DISABLE_REDIS_LOGS='true'

# add pnpm, build and prune (remove dev dependencies)
RUN corepack enable pnpm
RUN pnpm build
RUN pnpm prune --prod
#RUN rm -rf node_modules
#RUN pnpm install --frozen-lockfile --recursive --shamefully-hoist --prod

#CMD ["pnpm", "start"]
CMD ["ls", "-la", "/app"]