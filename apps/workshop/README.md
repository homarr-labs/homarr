# Homarr Workshop

Workshop is a small PocketBase service that serves the public documentation site and stores one Custom JSX v2 widget per submission.

The runtime image extends `ghcr.io/muchobien/pocketbase:0.39`; Homarr adds only the built documentation, PocketBase
collections, API rules, and its explicit serve arguments.

It intentionally has no approval queue, user bans, comments, email notifications, audit log, reusable widget connections,
or remote control over installed widgets. Submissions publish immediately. Authenticated users can vote and report;
users with `isAdmin` enabled can inspect and dismiss reports or delete any submission.

## Local development

```sh
PB_EXPOSE_PORT=18090 docker compose -f apps/workshop/docker-compose.yml up --build
```

Compose passes the selected port to PocketBase as `PORT`, so it listens on the same port inside and outside the
container. With the image directly, set both values: `docker run -e PORT=3003 -p 3003:3003 <workshop-image>`.

Open `http://127.0.0.1:18090/_/`, create the first PocketBase superuser, and configure GitHub OAuth on the `users` collection.

The `users.isAdmin` field defaults to `false`. Collection rules allow account creation only through OAuth without that
field and reject regular-user updates to it. Appoint administrators from the PocketBase dashboard with a superuser
account.

Users must sign in again after the role changes. Setting the value back to `false` removes Workshop administrator access.

The GitHub OAuth application needs one callback for the Workshop host:

```text
https://<workshop-host>/api/oauth2-redirect
```

Self-hosted Homarr origins do not need to be registered with GitHub. Keep `PB_ALLOWED_ORIGINS=*` (the default) so localhost and arbitrary self-hosted domains can open the central PocketBase OAuth popup. Set a restricted origin list only if it includes every Homarr origin that should use Workshop sign-in.

Run the disposable service integration test from the repository root:

```sh
pnpm test:workshop
```

The test uses a separate Compose project and deletes its named volume on exit. It never writes fixture users or admin
roles into the normal `homarr-workshop_pb_data` volume.

The Workshop does not maintain a second Custom Widget schema. Its frontend validates submissions with
`customWidgetImportSchema` from `@homarr/custom-widgets`, and Homarr validates canonical content again before installation.
The validated `$schema` is also stored as `widgetSchema` for listing compatibility badges; it must match the downloaded
manifest before Homarr enables installation.
PocketBase API rules enforce submission ownership, one vote/report per user and submission, and administrator-only
moderation. Reports are dismissed by deleting them; PocketBase cascade deletion removes related votes and reports when a
submission is deleted.

## Production docs preview

Build the documentation and serve it from PocketBase using the same production image layout as the hosted Workshop:

```sh
pnpm docker:docs
```

Open `http://127.0.0.1:3003`. Set `DOCS_EXPOSE_PORT` to use another host port. PocketBase data persists in the
`homarr-workshop_pb_data` named volume.

Point a local Homarr checkout at it with:

```sh
WORKSHOP_API_URL=http://127.0.0.1:3003 pnpm dev
```

The production Homarr image reads the same variable when the container starts:

```sh
docker run -p 7575:7575 -e WORKSHOP_API_URL=http://127.0.0.1:3003 <homarr-image>
```

This command starts the profiled `docs` service from `apps/workshop/docker-compose.yml`. It does not start the development `workshop` service. Stop and remove the preview with:

```sh
docker compose -f apps/workshop/docker-compose.yml --profile docs rm --stop --force docs
```

PocketBase data lives in `/pb_data`. Docker Compose persists it in the `pb_data` named volume for both the development Workshop service and the production documentation/Workshop service. The image serves the built Homarr documentation and Workshop UI from `/pb_public`.
