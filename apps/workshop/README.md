# Homarr Workshop

Workshop is the public, community-driven PocketBase service behind the Workshop pages in Homarr's Docusaurus site. It
stores Custom JSX v2 widgets and Custom CSS submissions. Installation-time validation inside Homarr remains
authoritative: public content must be reviewed before it is installed.

The runtime base is PocketBase 0.39.9 pinned by its multi-platform OCI digest in `apps/workshop/Dockerfile`. Update the
version and digest together, then run the Workshop integration and production-image smoke suites.

The internal PocketBase field `users.isAdmin` means **Workshop moderator**. It does not grant Homarr administrator
access. Moderators can review private reports, dismiss reports, and remove submissions or comments.

## Run the complete local stack

From the repository root:

```sh
cp .env.example .env
pnpm install --frozen-lockfile
pnpm dev:workshop
```

This starts persistent PocketBase at `http://127.0.0.1:8090`, waits for health and required collections, and starts
Docusaurus at `http://127.0.0.1:3003`. Open:

- PocketBase administration: `http://127.0.0.1:8090/_/`
- Workshop: `http://127.0.0.1:3003/workshop`

For direct Compose work, copy `apps/workshop/.env.example` to `apps/workshop/.env` and pass it explicitly with
`docker compose --env-file apps/workshop/.env -f apps/workshop/docker-compose.yml …`.

Create the first PocketBase superuser in the administration UI, or use:

```sh
docker compose -f apps/workshop/docker-compose.yml exec workshop \
  pocketbase superuser create you@example.com 'replace-with-a-strong-password' --dir=/pb_data
```

Stopping `pnpm dev:workshop` stops PocketBase and Docusaurus without deleting
`homarr-workshop_pb_data`. To inspect or stop the service separately:

```sh
docker compose -f apps/workshop/docker-compose.yml logs -f workshop
docker compose -f apps/workshop/docker-compose.yml stop workshop
```

## Connect the Homarr application

Use the same URL contract in the repository-root `.env`, then restart Homarr:

```dotenv
HOMARR_WEBSITE_URL=http://127.0.0.1:3003
WORKSHOP_API_URL=http://127.0.0.1:8090
WORKSHOP_WEB_URL=http://127.0.0.1:3003/workshop
WORKSHOP_PUBLIC_ORIGIN=http://127.0.0.1:3003
PB_ALLOWED_ORIGINS=*
```

```sh
pnpm dev
```

`WORKSHOP_API_URL` controls API calls. `WORKSHOP_WEB_URL` controls links from Homarr. `HOMARR_WEBSITE_URL` is the
documentation/site base. All three must be absolute HTTP(S) URLs. `DOCS_BASE_URL` configures a Docusaurus path such as
`/docs-site/`. The old Docusaurus-only `WORKSHOP_URL` variable remains a deprecated alias for one release.

## Optional GitHub OAuth

Create a GitHub OAuth application with this callback:

```text
https://<workshop-host>/api/oauth2-redirect
```

Set both credentials in `.env`:

```dotenv
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

OAuth settings synchronize on every PocketBase startup. Restart after rotation. A production deployment must never
supply only one credential. `PB_ALLOWED_ORIGINS=*` is appropriate for the central community because arbitrary
self-hosted Homarr origins must open its OAuth popup; a restricted list must include every allowed browser origin.

## Promote a Workshop moderator

Sign in once through GitHub so the user record exists. In the PocketBase administration UI, open the `users` collection
and set `isAdmin` to `true`. The user must sign in again. Set it back to `false` to remove moderator access.

Regular API rules cannot set this field. Never describe a Workshop moderator as a Homarr administrator: they are
separate roles in separate services.

## Validation and tests

The official browser and shared client validate content with the canonical TypeScript schema and send the matching
schema identifier. PocketBase stores submission content without parsing, normalizing, or validating it; it only owns
revision fields and rejects stale compare-and-swap updates. Homarr validates downloaded content again before
installation, so direct API submissions that bypass the official client can be rejected there.

Run the disposable integration suite:

```sh
pnpm test:workshop
pnpm --filter @homarr/workshop typecheck
pnpm --filter @homarr/docs typecheck
```

The integration suite uses a separate Compose project and deletes only its disposable volume.

## Backup and restore

PocketBase data lives in `/pb_data`. Stop writes and copy it into a new, empty host directory for each
filesystem-level backup:

```sh
docker compose -f apps/workshop/docker-compose.yml stop workshop
docker compose -f apps/workshop/docker-compose.yml cp workshop:/pb_data/. ./workshop-backup
docker compose -f apps/workshop/docker-compose.yml start workshop
```

Never copy a backup over a non-empty PocketBase volume: files created after the backup could survive and make the
restore inconsistent. For a development restore, first verify that the selected backup contains the database, then
empty the stopped volume before copying it:

```sh
test -f ./workshop-backup/data.db
docker compose -f apps/workshop/docker-compose.yml stop workshop
docker compose -f apps/workshop/docker-compose.yml run --rm --no-deps --entrypoint sh workshop \
  -c 'find /pb_data -mindepth 1 -maxdepth 1 -exec rm -rf {} +'
docker compose -f apps/workshop/docker-compose.yml cp ./workshop-backup/. workshop:/pb_data
docker compose -f apps/workshop/docker-compose.yml start workshop
curl --fail http://127.0.0.1:8090/api/health
curl --fail 'http://127.0.0.1:8090/api/collections/workshop_listings/records?perPage=1'
```

The cleanup command irreversibly empties the selected Compose volume, so confirm the backup path and preserve the
current volume separately before running it. After the HTTP checks, verify sign-in, reports, and a test installation.
Production backups must be versioned, access-controlled, restored into a clean staging volume, and validated before a
release.

## Production image and operations

The production target serves the built documentation from `/pb_public` and PocketBase from the same image. Required
production configuration:

```dotenv
HOMARR_WEBSITE_URL=https://homarr.dev
WORKSHOP_API_URL=https://homarr.dev
WORKSHOP_WEB_URL=https://homarr.dev/workshop
WORKSHOP_PUBLIC_ORIGIN=https://homarr.dev
PB_ALLOWED_ORIGINS=*
WORKSHOP_REQUIRE_OAUTH=true
```

Build and smoke-test the combined image locally:

```sh
docker compose -f apps/workshop/docker-compose.yml --profile docs up --build --detach docs
curl --fail http://127.0.0.1:3003/api/health
curl --fail http://127.0.0.1:3003/
curl --fail http://127.0.0.1:3003/workshop
docker compose -f apps/workshop/docker-compose.yml --profile docs stop docs
```

Normal `up`, `start`, `stop`, and `down` operations retain the named volume. The following command is an intentional,
irreversible local reset:

```sh
docker compose -f apps/workshop/docker-compose.yml down --volumes
```

Never run the reset command against production. Release by immutable image digest, back up application and PocketBase
data first, rehearse restore and rollback in staging, and promote the exact tested digest. The Algolia recrawl workflow
remains manual until the external Homarr website host can dispatch it after promotion; publishing the image to GHCR does
not make that image live.
