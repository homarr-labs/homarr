# Homarr Workshop

Workshop is the PocketBase service behind the community pages in Homarr's documentation site. It stores Custom JSX v2
widgets and Custom CSS submissions. Homarr validates community content again before installation.

The PocketBase version and multi-platform image digest are pinned in `apps/workshop/Dockerfile`; update and validate
them together.

## Run locally

From the repository root:

```sh
cp apps/workshop/.env.example apps/workshop/.env
pnpm install --frozen-lockfile
docker compose --env-file apps/workshop/.env -f apps/workshop/docker-compose.yml up --build workshop
```

Start the documentation site in another terminal:

```sh
WORKSHOP_API_URL=http://127.0.0.1:8090 pnpm dev:docs
```

Open PocketBase administration at `http://127.0.0.1:8090/_/` and Workshop at
`http://127.0.0.1:3003/workshop`. Create the first PocketBase superuser in the administration UI or run:

```sh
docker compose -f apps/workshop/docker-compose.yml exec workshop \
  pocketbase superuser create you@example.com 'replace-with-a-strong-password' --dir=/pb_data
```

Useful service commands:

```sh
docker compose -f apps/workshop/docker-compose.yml logs -f workshop
docker compose -f apps/workshop/docker-compose.yml stop workshop
```

## Connect Homarr

Use the same URL contract in the repository-root `.env`, then restart Homarr:

```dotenv
HOMARR_WEBSITE_URL=http://127.0.0.1:3003
WORKSHOP_API_URL=http://127.0.0.1:8090
WORKSHOP_WEB_URL=http://127.0.0.1:3003/workshop
WORKSHOP_PUBLIC_ORIGIN=http://127.0.0.1:3003
PB_ALLOWED_ORIGINS=*
```

`WORKSHOP_API_URL` controls API calls, `WORKSHOP_WEB_URL` controls links from Homarr, and
`HOMARR_WEBSITE_URL` is the documentation-site base. All three must be absolute HTTP(S) URLs.

## OAuth and moderators

For optional GitHub OAuth, set both `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`. The callback is:

```text
https://<workshop-host>/api/oauth2-redirect
```

After a user signs in, a PocketBase superuser can promote them by setting `users.isAdmin` to `true`. This grants
Workshop moderation only; it does not grant Homarr administrator access. The user must sign in again after the change.

The public community uses `PB_ALLOWED_ORIGINS=*` because self-hosted Homarr instances can run on any origin. Private
deployments can use an explicit comma-separated allowlist.

## Validate changes

Run the focused Workshop checks:

```sh
pnpm test:workshop
pnpm --filter @homarr/workshop typecheck
pnpm --filter @homarr/docs typecheck
```

The integration suite uses a disposable Compose project. `pnpm test:workshop-image` additionally builds and smoke-tests
the combined production image.

## Data safety

PocketBase data lives in `/pb_data`. Normal start, stop, and down operations retain the named volume. Back up the
database before migrations or image promotion, and test restores in a separate empty volume.

The v2 branch consolidates the unreleased Workshop migrations. Volumes that ran an earlier v2 migration chain are
unsupported and must be backed up and recreated. The following command permanently removes the local Workshop volume:

```sh
docker compose -f apps/workshop/docker-compose.yml down --volumes
```

Never run that reset against production.

## Production

The production image serves the documentation site and PocketBase from one origin. See the
[Workshop operator guide](../docs/docs/workshop/operator.mdx) for environment variables, proxying, staging, backups,
and promotion. Publish by immutable digest, validate that exact digest in staging, then promote it.
