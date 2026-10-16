# Headless deployment scratchpad

## Runtime ownership

The default Docker image starts three application-facing services: Nginx on
7575, Bun's Hono backend on loopback 3002, and the Next.js dashboard on loopback 3000. The backend also starts scheduled tasks and the subscription listener on 3001. Next.js does not own backend startup.

Nginx sends `/api`, MCP discovery and consent, and `/websockets` to the backend
services. Other requests reach the dashboard. In the `backend` Docker target,
the fallback also reaches Hono; the image contains no dashboard build or public
assets and starts no Next.js process.

Both images retain database migrations, the `homarr` administration CLI,
trusted certificate handling, PUID/PGID support, and optional internal Redis.
Node remains installed for the existing migration and CLI bundles. The HTTP
backend uses Bun, including its SQLite implementation; the retained Node SQLite
binding supports the CLI and migrations.

The launcher restarts Bun after a clean backend exit so database restore can
reopen the replaced database without a Docker restart policy. Other required
service failures stop the container; its restart policy recovers the complete
service set. SIGTERM stops ingress,
dashboard, backend, and internal Redis. An explicitly supplied `AUTH_SECRET` is
preserved so independently launched services can share stable sessions.

## Backend artifact

`scripts/assemble-backend.mjs` builds `apps/backend/build/index.js` as an ESM
bundle with esbuild, executed by Bun at runtime. Bun 1.4.2's bundler produced
undefined namespace bindings for external `export *` declarations in Drizzle
and GitHub authentication dependencies; esbuild preserves those exports. The
backend build prepares endpoint assets
before bundling and emits `bundle-meta.json` to inspect dependency size and
ownership. Native addons and packages that read files next to their JavaScript
remain external. Only their dependency closure is copied into the artifact;
the monorepo's complete `node_modules` is not shipped in the headless image.
Root external package versions are reserved before traversing dependencies so
packages with nested incompatible versions retain Node's resolution behavior.
The backup SQL WASM resource is copied separately into the artifact.

The image also includes a minimal root `package.json`, which the bundled Node
SQLite binding loader requires. The backend artifact build rejects emitted
Next.js, React, and Mantine inputs so frontend imports cannot silently return.

The Docker `backend-builder` stage builds database migrations, the CLI, and the
backend. It has no dependency on the frontend builder. The final default
`runner` stage adds the existing traced Next.js production artifact on top of
the shared runtime.

## Launch commands

Generate two persistent secrets with `openssl rand -hex 32` and save them as
`AUTH_SECRET` and `SECRET_ENCRYPTION_KEY` in a local environment file. Retain the
same encryption key when attaching an existing Homarr database.

From the repository root:

```sh
docker compose --env-file .env -f deployments/headless/compose.yml up --build -d
```

The backend is available at `http://localhost:7575`. Set `BASE_URL` to its actual
public origin for MCP OAuth and authentication redirects. To call it from a
frontend on another origin, set `BACKEND_CORS_ORIGINS` to the comma-separated
list of exact frontend origins. Cookie-authenticated browser requests must
include credentials; API keys can be used for supported automation endpoints.

Build and run the targets separately:

```sh
docker build --target backend -t homarr:backend .
docker build -t homarr:full .
docker run --rm --env-file .env -p 7575:7575 -v homarr-data:/appdata homarr:backend
```

To launch the backend from source after configuring the repository `.env`,
database migrations, and Redis:

```sh
bun run --filter @homarr/backend start
```

This binds directly to `0.0.0.0:3002` by default. `BACKEND_HOST` and
`BACKEND_PORT` configure the direct listener. The Docker image intentionally
keeps 3002 private behind Nginx so its trusted client identity headers cannot
be supplied directly from outside the container.

## Validation ledger

- `bash -n scripts/run.sh`, `sh -n scripts/entrypoint.sh`, and
  `node --check scripts/assemble-backend.mjs` passed.
- `docker compose -f deployments/headless/compose.yml config --quiet` passed
  using placeholder configuration values.
- Initial `mise exec -- bun scripts/assemble-backend.mjs` passed: 9,201,261-byte
  JavaScript bundle and 160 external runtime packages, 100 MiB total artifact.
  This initial graph still retained Next.js, React, and Mantine inputs; their
  source owners are removing those imports before final validation.
- Largest initial external packages: Drizzle 17 MiB, better-sqlite3 13 MiB,
  ssh2 9.6 MiB, and jsdom 8.5 MiB. These sizes include published source maps,
  declarations, and native compilation sources; they are not Docker layer sizes.
- Both final AMD64 image builds passed. The headless image measured 353,019,421
  bytes (336.7 MiB) and full image 545,415,132 bytes (520.1 MiB), a 35.3%
  difference in uncompressed Docker image sizes.
- Fresh SQLite startup, migrations, readiness/liveness, oRPC, compatibility
  tRPC, OpenAPI, dependency information, MCP discovery/challenge, WebSocket
  handshake, SQL WASM, and credentialed CORS passed in the container.
- Auth sign-in/CSRF, CLI administrator recovery, and a credential login producing
  an authenticated admin session passed. A graceful stop returned exit zero;
  the administrator persisted when the image was recreated with PUID/PGID 1000.
  The CLI wrapper disables Redis logging so its connection does not retain the
  command process after completion.
- The headless image contains no `apps/nextjs`, Next.js, React, or Mantine
  runtime package directories.
- A PostgreSQL 17 Alpine fixture passed fresh migrations/seeding, Bun
  readiness/liveness, and an authorized oRPC onboarding transition from `start`
  to `user`; `user` persisted after restarting the application container.
- Full-image startup exposed a locale redirect loop when the launcher changed
  Next's bind host to 127.0.0.1. Restoring the original 0.0.0.0 bind resolves the
  loop; the permanent launcher restores that behavior.
- The final unmodified full image passed readiness, `/rpc/onboard/currentStep`,
  and root navigation to `/init` with HTTP 200 and dashboard HTML. Its source
  proxy hash was
  `d9edc7e548936e1003ee2f157bdb187d2b3b60d5d0ea5c57779060195e52b9c0`.
- Real administrator-authenticated SQLite export/import passed with a
  2,457,380-byte archive. The restored backend returned readiness 200 and kept
  the authenticated admin session. Bun's PID changed from 43 to 105; Nginx
  (41/44) and Redis (42) stayed running. Container start time was unchanged,
  restart count remained zero, and Docker restart policy was `no`.

Final local images:

- `homarr:headless-hono-local`:
  `sha256:ab48932b41c3cfe0b0ee50601b475e1ffc1ffb9013dcc7fcf11d0c051537e9f0`.
- `homarr:hono-full-local`:
  `sha256:8a8c10269c5b57a19884016a5ac7b9cefb8eb878a88408affcae5ee68687a40b`.

Validation used disposable task-specific data and local images. No production
deployment, registry publication, ARM build, or external LDAP/OIDC provider
acceptance was performed by this deployment workstream.

## Size interpretation

The measured headless runtime still includes a 122.6 MiB Node binary for the
existing migration/CLI bundles, 70.1 MiB Bun binary, 103.1 MiB backend artifact,
10.8 MiB migrations, 2.6 MiB CLI, and 2.3 MiB retained Node SQLite binding.
These allocated-file values differ from Docker layer and registry compressed
sizes. Moving the remaining administration tools to Bun would remove a large
part of the runtime; removing dashboard assets alone cannot make the image tiny.

## Documentation sources

The assembler uses the official [esbuild API](https://esbuild.github.io/api/)
for external dependencies, minification, and the build metafile. The
[Bun bundler API](https://bun.sh/docs/bundler) was reviewed before the packaging
incompatibility was reproduced.
