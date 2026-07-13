# Homarr Workshop service

The Workshop image serves the compiled Homarr documentation and the PocketBase community API from one origin: `https://homarr.dev`. It is not a per-instance Homarr service. Local deployment is for development and integration testing.

## Local startup

1. Copy the repository-root `.env.example` to `.env` and create a GitHub OAuth app.
2. Set its callback URL to `http://localhost:<PB_EXPOSE_PORT>/api/oauth2-redirect` (port `8090` by default).
3. Set `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `PB_SUPERUSER_EMAIL`, and `PB_SUPERUSER_PASSWORD`.
4. Run `pnpm dev:workshop` from the repository root. It builds the single Workshop image, starts it, and removes obsolete Compose containers.

Open the Workshop at `http://localhost:<PB_EXPOSE_PORT>/workshop`. The API is at `/api` on the same origin and the emergency PocketBase dashboard is at `/_/` (port `8090` by default). `0.0.0.0` in PocketBase's server log is its container bind address, not a browser URL. Day-to-day moderation belongs in `/workshop/admin`, not the PocketBase dashboard.

All Workshop configuration is read from the repository-root `.env`; there is no app-specific environment file. If port 8090 is unavailable, set `PB_EXPOSE_PORT` there. `pnpm dev:workshop:website` remains available for Docusaurus HMR and connects to the local container through `WORKSHOP_API_URL`.

The multi-stage image builds Docusaurus, downloads the official PocketBase `0.39.6` release, verifies it against that release's `checksums.txt`, and copies the versioned migrations, hooks, and static website into the runtime image.

GitHub OAuth configuration is synchronized from the environment on every boot, including for an existing development volume. `PB_ALLOWED_ORIGINS` defaults to `*` because arbitrary self-hosted Homarr origins consume the central API. PocketBase authenticates writes with bearer tokens and does not use cookies; CORS is not an authorization boundary.

## Roles and account states

- `member`: publish, update/delete owned submissions, vote, and report.
- `moderator`: report queue, submission removal, posting bans, and account disable/restore.
- `admin`: moderator actions plus role changes.
- `posting_banned`: cannot create or update submissions; can browse, vote, and report.
- `disabled`: cannot authenticate or write.

Bootstrap the first admin through the PocketBase dashboard by changing a GitHub-authenticated user's role. All later staff actions use the restricted Workshop back office and are recorded in `moderation_actions`.

## Backup and restore

PocketBase stores records and uploads in `/pb_data`. Stop writes or stop the container, then archive the named volume:

```sh
docker compose --env-file .env --file apps/workshop/docker-compose.yml stop workshop
docker run --rm -v homarr-workshop_workshop_data:/data -v "$PWD":/backup alpine tar czf /backup/workshop-backup.tgz -C /data .
docker compose --env-file .env --file apps/workshop/docker-compose.yml start workshop
```

Restore only into the same PocketBase version after preserving the current volume. Extract the archive into an empty `workshop_data` volume, start the service, and verify `/api/health`, collection migrations, a listing request, and an authenticated write.

## Production checklist

- Run `ghcr.io/homarr-labs/workshop:dev` behind the `homarr.dev` TLS endpoint; the image owns both the website and `/api`.
- Terminate TLS at the reverse proxy and forward the real client IP.
- Keep superuser credentials outside Compose and rotate them after bootstrap.
- Restrict the dashboard path to operators; GitHub users never need it.
- Review the versioned default rate limits for OAuth, submissions, votes, reports, moderation, and general API traffic against production load before launch.
- Back up `/pb_data` before every PocketBase or migration upgrade and test restore regularly.
- Monitor health, authentication failures, 429/5xx responses, moderation actions, disk use, and backup age.
