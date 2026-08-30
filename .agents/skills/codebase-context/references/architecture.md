# Homarr architecture

## Contents

- [Applications and runtimes](#applications-and-runtimes)
- [Package map](#package-map)
- [Dependency direction](#dependency-direction)
- [Core patterns](#core-patterns)
- [Commands and conventions](#commands-and-conventions)

## Applications and runtimes

| Path             | Role                                                                                     |
| ---------------- | ---------------------------------------------------------------------------------------- |
| `apps/nextjs`    | Main Next.js application and HTTP APIs on port 3000                                      |
| `apps/docs`      | Docusaurus documentation site on port 3003                                               |
| `apps/tasks`     | Cron-job initialization and scheduling runtime; it does not expose the old port-3002 API |
| `apps/websocket` | tRPC WebSocket subscriptions on port 3001                                                |
| `apps/workshop`  | Go/PocketBase Workshop service and provider integration                                  |

`pnpm dev` runs only `@homarr/nextjs`. Use `pnpm --filter @homarr/tasks dev`, `pnpm --filter @homarr/websocket dev`, or `pnpm dev:docs` when a task needs those runtimes.

In production, `apps/nextjs/src/instrumentation-node.ts` starts the tasks and WebSocket runtimes inside the Node process. Nginx listens on port 7575, proxies `/websockets` to port 3001, and sends other traffic to port 3000. Redis can run internally or externally.

## Package map

### Foundation and domain

- `core`: environment validation, database and Redis factories, logging, infrastructure.
- `definitions`: domain enums, integration definitions, widget kinds, permissions.
- `common`: shared utilities with environment-specific entrypoints. Search it before adding helpers.
- `validation`: shared Zod schemas.
- `server-settings`: typed server-setting keys and access.

### Data, identity, and transport

- `db`: Drizzle schemas, queries, migrations, and three database drivers.
- `auth`: Auth.js/NextAuth configuration, sessions, providers, and API keys.
- `api`: tRPC routers, contexts, MCP metadata extraction, OpenAPI, and client/server entrypoints.
- `redis`: Redis clients, pub/sub channels, and caches.
- `cron-jobs-core`, `cron-jobs`, `cron-job-status`: scheduling primitives, job implementations, and status transport.

### Backends and external systems

- `integrations`: typed clients for external applications.
- `request-handler`: shared server request flows.
- `docker`, `ping`, `image-proxy`, `icons`, `analytics`: bounded infrastructure capabilities.
- `custom-widgets`: Custom JSX v2 schema, validation, runtime, and security contracts.
- `workshop`: TypeScript Workshop client, backend contracts, and schemas used by Homarr.

### UI and composed features

- `ui`: shared Mantine components, theme, and hooks. Search here before creating a primitive.
- `form`, `forms-collection`: Zod-backed form setup and reusable forms.
- `modals`, `modals-collection`: modal primitives and feature modals.
- `boards`: board state, edit mode, and cache coordination.
- `settings`, `spotlight`, `notifications`, `onboarding`: cross-feature UI flows.
- `widgets`: widget definitions, dynamic component loaders, and shared widget UI.
- `translation`: next-intl configuration and locale catalogs.
- `cli`: Node operations CLI. `tools/homarr-dev` is the separate Go developer CLI.

## Dependency direction

Prefer these directions; verify the exact dependency in package manifests before changing a boundary.

1. Put infrastructure in `core` and stable domain names in `definitions`.
2. Put reusable, dependency-light helpers in `common`; use its public environment-specific entrypoints.
3. Build persistence in `db`, identity in `auth`, transport in `redis`, and external clients in `integrations`.
4. Compose server behavior in `api`, `cron-jobs`, and request-handler packages.
5. Build primitives in `ui`, `form`, and `modals`; compose product surfaces in widgets and collection packages.
6. Keep app entrypoints in `apps/*` thin. Avoid moving reusable behavior into `apps/nextjs` when a package already owns it.

## Core patterns

### tRPC and MCP

`packages/api/src/root.ts` lazily composes the application router. Server components use `@homarr/api/server`; client components use `@homarr/api/client`. MCP extraction requires the eager router in `packages/api/src/mcp.ts`, so MCP-enabled subrouters must be imported and registered there directly. Use the `mcp-integration` skill for exposure and security rules.

### Databases

Drizzle schemas live in parallel files under `packages/db/schema/`. `DB_DRIVER` selects `better-sqlite3`, `mysql2`, or `node-postgres`; migrations live in matching directories under `packages/db/migrations/`. Apply schema behavior consistently across all supported drivers unless the task is explicitly driver-specific.

### Widgets

`packages/widgets/src/registry.ts` owns the explicit widget-module and component-loader registries. `packages/widgets/src/manifest.ts` caches those loaders and exposes definitions, components, and combined resources. Widget modules use `createWidgetDefinition` and typed option builders. Data commonly comes from tRPC queries or Redis-backed cron results. Use existing shared widget components before creating local variants.

### Integrations

`packages/definitions/src/integration.ts` owns `integrationDefs` and `IntegrationKind`. `packages/integrations/src/base/creator.ts` owns `createIntegrationAsync`; concrete integrations implement the shared base contract. Keep credentials and permission checks on server-owned paths.

### Cron jobs

Jobs live in `packages/cron-jobs/src/jobs/` and use `createCronJob`. `apps/tasks` initializes and starts the job group. Job results and status can flow through Redis and tRPC; the retired port-3002 management-API model is no longer part of the architecture.

### Routing and localization

User routes live below `apps/nextjs/src/app/[locale]/`; the locale segment does not add a URL prefix. Route groups organize home and board surfaces. Administrative routes live under `manage`, Custom Widget configuration has a token route, and Workshop has a management surface.

### Custom Widgets and Workshop

`packages/custom-widgets` owns the Custom JSX v2 contract. `packages/workshop` is the Homarr-side client/contract package; `apps/workshop` is the separate Go/PocketBase service. Use the `homarr-custom-widget` skill for authoring and security constraints.

## Commands and conventions

- Read current scripts from the root or package `package.json`; avoid caching commands that do not exist.
- Use `pnpm dev` for Next.js, `pnpm dev:docs` for docs, and `pnpm dev:cli -- <args>` for the Go developer CLI.
- Use `pnpm docker:dev:up` for the Redis development dependency.
- Use package-filtered typechecks or focused tests for the touched behavior.
- Use `~/*` only inside the Next.js app. Use public `@homarr/*` entrypoints across package boundaries.
- Keep Mantine application styles separate from the Tailwind-based docs app.
