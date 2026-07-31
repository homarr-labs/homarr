# Homarr web application

This workspace contains Homarr's Next.js application. It consumes the shared API, authentication, database, board,
widget, translation, and UI packages from this monorepo.

Run commands from the repository root:

```sh
pnpm install --frozen-lockfile
cp .env.example .env
```

Keep infrastructure running in the first terminal:

```sh
pnpm docker:dev
```

Apply migrations and start the application in a second terminal:

```sh
pnpm db:migration:sqlite:run
pnpm dev
```

The app listens on `http://127.0.0.1:3000`. Configure an absolute writable `DB_URL`, `AUTH_SECRET`, and
`SECRET_ENCRYPTION_KEY` in `.env` before first startup.

To test Custom Widgets against a local Community Workshop, start PocketBase and the docs in separate terminals:

```sh
pnpm docker:workshop
WORKSHOP_API_URL=http://127.0.0.1:8090 pnpm dev:docs
```

Then set:

```dotenv
HOMARR_WEBSITE_URL=http://127.0.0.1:3003
WORKSHOP_API_URL=http://127.0.0.1:8090
WORKSHOP_WEB_URL=http://127.0.0.1:3003/workshop
```

Server-rendered runtime configuration exposes those URLs to the browser, so changing a production container's
environment does not require rebuilding the Next.js bundle.

See [`apps/docs/docs/advanced/development/getting-started.mdx`](../docs/docs/advanced/development/getting-started.mdx)
for the full contributor setup.
