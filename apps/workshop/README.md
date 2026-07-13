# Homarr Workshop backend

PocketBase provides the central Workshop API at `workshop.homarr.dev`. It is not a per-instance Homarr service. Local deployment is for development and integration testing.

## Local startup

1. Copy the repository-root `.env.example` to `.env` and create a GitHub OAuth app.
2. Set its callback URL to `http://localhost:8090/api/oauth2-redirect`.
3. Set `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `PB_SUPERUSER_EMAIL`, and `PB_SUPERUSER_PASSWORD`.
4. Run `pnpm dev:workshop` from the repository root. It starts PocketBase and the Docusaurus Workshop together and removes obsolete Compose containers.

Open the Workshop at `http://localhost:3003/workshop`. The API is at `http://localhost:8090`; the emergency PocketBase dashboard is at `http://localhost:8090/_/`. `0.0.0.0` in PocketBase's server log is its container bind address, not a browser URL. Day-to-day moderation belongs in `/workshop/admin`, not the PocketBase dashboard.

Use `pnpm dev:workshop:backend` when only the API is needed. All Workshop configuration is read from the repository-root `.env`; there is no app-specific environment file. If port 8090 is unavailable, set `PB_EXPOSE_PORT` there. The website derives its local API URL from that port unless `WORKSHOP_API_URL` is explicitly set.

The image downloads the official PocketBase `0.39.6` release and verifies it against that release's `checksums.txt`. Migrations and hooks are mounted read-only.

GitHub OAuth configuration is synchronized from the environment on every boot, including for an existing development volume. Local CORS is restricted to the Docusaurus origins in `PB_ALLOWED_ORIGINS`; production must set it to `https://homarr.dev`.

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

- Terminate TLS at the reverse proxy and forward the real client IP.
- Keep superuser credentials outside Compose and rotate them after bootstrap.
- Restrict the dashboard path to operators; GitHub users never need it.
- Review the versioned default rate limits for OAuth, submissions, votes, reports, moderation, and general API traffic against production load before launch.
- Back up `/pb_data` before every PocketBase or migration upgrade and test restore regularly.
- Monitor health, authentication failures, 429/5xx responses, moderation actions, disk use, and backup age.
