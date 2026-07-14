# Homarr Workshop

Workshop ships as one container. Its build stage compiles the current Docusaurus site, and its runtime stage serves those static files and the PocketBase API from the same origin.

## Local production-like run

Configure optional values in the repository-root `.env`, then run:

```sh
pnpm dev:workshop
```

Open:

- documentation: `http://localhost:8090/`;
- Workshop: `http://localhost:8090/workshop/`;
- PocketBase API: `http://localhost:8090/api/`;
- PocketBase dashboard: `http://localhost:8090/_/`.

The `homarr_workshop_deployment_data` volume persists records and uploaded files across image rebuilds. Migrations run automatically when PocketBase starts. It is intentionally separate from volumes created by earlier prototypes with incompatible schemas.

## GitHub OAuth

Create a GitHub OAuth application with these local values:

- homepage: `http://localhost:8090`;
- callback: `http://localhost:8090/api/oauth2-redirect`.

Set these values only in the repository-root `.env`:

```dotenv
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

For production, use `https://workshop.homarr.dev` and `https://workshop.homarr.dev/api/oauth2-redirect`. Create the first PocketBase superuser through the installer link printed on first startup or through the PocketBase CLI.

## Local image validation

Build and test the exact runtime shape:

```sh
docker build -f apps/workshop/Dockerfile -t homarr/workshop:ci .
pnpm test:workshop-image
```

The smoke test starts a temporary container and verifies the documentation homepage, `/workshop/`, the migrated public collection, and `/api/health`.

## GitHub Actions and ACT

`.github/workflows/deployment-workshop.yml` runs only for changes below `apps/docs/` or `apps/workshop/`, plus manual dispatches. It builds and tests the combined image, then publishes:

- `ghcr.io/homarr-labs/workshop:latest`;
- `ghcr.io/homarr-labs/workshop:sha-<commit>`.

Run the same build and smoke test locally without registry credentials:

```sh
pnpm ci:act:workshop
```

See `.github/act/workshop.md` for the direct ACT command and Docker socket behavior.

## VPS deployment

Copy `apps/workshop/docker-compose.yml` to the checkout on the VPS, authenticate Docker to GHCR if the package is private, and run from the repository root. Compose reads the optional root `.env` automatically:

```sh
docker compose -f apps/workshop/docker-compose.yml pull
docker compose -f apps/workshop/docker-compose.yml up -d --no-build
```

The service binds to `127.0.0.1:8090` by default. Put a TLS reverse proxy in front of it for `workshop.homarr.dev`, forward the original scheme and host, and persist the `homarr_workshop_deployment_data` volume. Back up that volume before PocketBase upgrades.

## Content schema

- Custom widgets use `homarr-custom-widget-v2` JSON.
- Custom CSS uses raw CSS tagged as `homarr-custom-css-v1`.

Client-side validation lives in `apps/docs/src/lib/workshop-schema.ts`. PocketBase collection rules and hooks remain in this directory.
