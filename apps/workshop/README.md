# Homarr Workshop

Workshop is a small PocketBase service that serves the public documentation site and stores one Custom JSX v2 widget per submission.

It intentionally has no approval queue, user bans, reusable widget connections, or remote control over installed widgets. Submissions publish immediately. Authenticated users can vote and report; records in `workshop_admins` can inspect reports, dismiss them, and delete any submission.

## Local development

```sh
PB_EXPOSE_PORT=18090 docker compose -f apps/workshop/docker-compose.yml up --build
```

Open `http://127.0.0.1:18090/_/`, create the first PocketBase superuser, configure GitHub OAuth on the `users` collection, and add Workshop administrators through the `workshop_admins` collection.

The GitHub OAuth application needs one callback for the Workshop host:

```text
https://<workshop-host>/api/oauth2-redirect
```

Self-hosted Homarr origins do not need to be registered with GitHub. Keep `PB_ALLOWED_ORIGINS=*` (the default) so localhost and arbitrary self-hosted domains can open the central PocketBase OAuth popup. Set a restricted origin list only if it includes every Homarr origin that should use Workshop sign-in.

Run the disposable service integration test from the repository root:

```sh
pnpm test:workshop
```

Production data lives in `/pb_data`. The image serves the built Homarr documentation and Workshop UI from `/pb_public`.
