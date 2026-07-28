# Homarr development

This repository contains the Homarr application, task and WebSocket services, the Docusaurus documentation site, and
the PocketBase-backed Community Workshop.

## Prerequisites

- Node.js 24.18 or newer
- Corepack with pnpm 11.11
- Docker with Docker Compose
- Git

Enable the repository's pnpm version and install dependencies:

```sh
corepack enable
corepack install
pnpm install --frozen-lockfile
```

## Run Homarr locally

Copy the environment template and choose a writable absolute SQLite path:

```sh
cp .env.example .env
```

Keep the development infrastructure running in the first terminal:

```sh
pnpm docker:dev
```

Then apply migrations and start Homarr in a second terminal:

```sh
pnpm db:migration:sqlite:run
pnpm dev
```

Homarr is available at `http://127.0.0.1:3000`. The foreground infrastructure command starts Redis and the optional
database services from `development/development.docker-compose.yml`; stop it with Ctrl+C after stopping Homarr.

## Run PocketBase and documentation locally

The integrated command starts persistent PocketBase on port 8090, waits for its health endpoint and Workshop
collections, then starts Docusaurus on port 3003:

```sh
pnpm dev:workshop
```

Open the PocketBase administration UI at `http://127.0.0.1:8090/_/` to create the first superuser. Open the Workshop at
`http://127.0.0.1:3003/workshop`.

To run Homarr against this local stack, set these values in `.env` and restart `pnpm dev`:

```dotenv
HOMARR_WEBSITE_URL=http://127.0.0.1:3003
WORKSHOP_API_URL=http://127.0.0.1:8090
WORKSHOP_WEB_URL=http://127.0.0.1:3003/workshop
```

Stopping `pnpm dev:workshop` stops the services but retains the `homarr-workshop_pb_data` volume. See
[`apps/workshop/README.md`](apps/workshop/README.md) for OAuth, moderator access, logs, backup, restore, and intentional
reset instructions.

## Common checks

```sh
pnpm format
pnpm lint
pnpm typecheck
pnpm test
pnpm test:workshop
pnpm turbo build --filter=@homarr/docs
```

Use `pnpm format:fix` and `pnpm lint:fix` to apply mechanical fixes. User-facing code changes must include the matching
documentation under `apps/docs/docs/`.

## Repository map

- `apps/nextjs` — main Homarr web application
- `apps/tasks` — scheduled task runner and API
- `apps/websocket` — WebSocket server
- `apps/docs` — Docusaurus documentation and public Workshop UI
- `apps/workshop` — PocketBase image, migrations, hooks, and integration tests
- `packages` — shared application, API, database, UI, widget, and integration packages
- `development` — local Docker infrastructure
- `e2e` — end-to-end tests
