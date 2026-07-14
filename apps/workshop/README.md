# Homarr Workshop service

Workshop combines the public Docusaurus experience with a PocketBase community API. Development keeps the two processes separate; the production image serves both from one origin.

## Development

From the repository root, run:

```sh
pnpm dev:workshop
```

This starts:

- PocketBase in Docker with `--dev` at `http://localhost:8090`;
- the PocketBase dashboard at `http://localhost:8090/_/`;
- `@homarr/workshop` in watch mode on the host;
- Docusaurus with HMR at `http://localhost:3003/workshop`.

PocketBase data is bind-mounted at `apps/workshop/pb_data/`. The directory is gitignored and survives container rebuilds. Hooks and migrations are mounted read-only and PocketBase reloads them in development mode.

No users, superusers, OAuth providers, or submissions are seeded. Create the first superuser manually in the PocketBase dashboard, configure GitHub OAuth on the `users` collection, and use `http://localhost:8090/api/oauth2-redirect` as the local callback URL. OAuth account creation is handled by PocketBase directly. Promote moderators and administrators by creating a `workshop_staff` record for the user; that record is the authorization source of truth.

Optional ports and CORS behavior are configured only in the repository-root `.env`:

```dotenv
PB_EXPOSE_PORT=8090
WORKSHOP_WEB_PORT=3003
PB_ALLOWED_ORIGINS=*
```

## Production-like preview

Run the exact combined image shape used for deployment:

```sh
pnpm preview:workshop
```

The multi-stage image builds Docusaurus, verifies and installs PocketBase `0.39.6`, copies the hooks and migrations, and serves everything from `http://localhost:8090`:

- website: `http://localhost:8090/workshop`;
- API: `http://localhost:8090/api`;
- dashboard: `http://localhost:8090/_/`.

The preview reuses `apps/workshop/pb_data/`, so OAuth configuration and local records remain available when switching between development and preview. `--remove-orphans` replaces the previous service shape without deleting data.

## Reset local data

Resetting is always explicit:

```sh
pnpm reset:workshop
```

The command asks for confirmation, stops both service variants, and clears `apps/workshop/pb_data/`. For automation, use `pnpm reset:workshop -- --force`.

Authentication failures for an old email are requests made by the PocketBase dashboard against the persisted database; Workshop startup never attempts to authenticate or seed that account.

## Build and validation

`pnpm build` builds both `@homarr/workshop` and Docusaurus as part of the monorepo build. The production image can be validated locally with:

```sh
pnpm test:workshop-preview
```

The test uses a temporary database, builds and starts the production image, checks the website, API, service worker, and migrated collections, then removes all test state. The dedicated Workshop CI workflow runs this test only when Workshop-related sources or build inputs change; it does not publish an image.

## Operations

The live service uses the production target behind the `homarr.dev` TLS proxy. PocketBase superuser access is bootstrap/emergency access only; normal moderation belongs in `/workshop/admin`.

Back up `/pb_data` before PocketBase or schema upgrades. It contains records, uploads, OAuth settings, and credentials. Production must also restrict `/_/`, monitor health and authentication failures, and validate backup restoration regularly.
