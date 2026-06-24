# Homarr Store (PocketBase)

Self-hosted backend for the Homarr community store of **custom CSS** and **custom widgets**.
It handles GitHub OAuth, submissions, upvotes/downvotes, abuse reports, and screenshot
uploads. The browse/submit UI lives in the docs app at `/store`; Homarr installs entries
in-app by reading PocketBase's public REST API.

## Run locally

```bash
cd apps/store
docker compose up
```

- API + dashboard: http://localhost:8090 (admin UI at `/_/`)
- Collections and rules are created automatically by `pb_migrations/`.
- Vote counters and ownership enforcement live in `pb_hooks/`.

## GitHub OAuth setup

1. Create a GitHub OAuth app: https://github.com/settings/developers
   - Homepage URL: `https://store.homarr.dev` (or `http://localhost:8090` in dev)
   - Authorization callback URL: `https://store.homarr.dev/api/oauth2-redirect`
     (dev: `http://localhost:8090/api/oauth2-redirect`)
2. Provide the credentials before the first run so the init migration wires them up:

```bash
GITHUB_CLIENT_ID=xxx GITHUB_CLIENT_SECRET=yyy docker compose up
```

If you start without them, GitHub OAuth is left disabled — enable it later from the admin
UI under **Collections -> users -> Options -> OAuth2**.

## Collections

| Collection    | Purpose                                                                                        |
| ------------- | ---------------------------------------------------------------------------------------------- |
| `users`       | Built-in auth collection, GitHub OAuth2 enabled                                                |
| `submissions` | `type` (`css`/`widget`), title, description, content, screenshot, counters, version, changelog |
| `votes`       | One row per (submission, user); `value` is `1` or `-1`                                         |
| `reports`     | Abuse flags, moderation-only (not publicly readable)                                           |

Submissions are auto-published. Moderate reported entries from the admin UI.

## Schema versions

- Custom widgets store Homarr's `homarr-custom-widget-v2` JSON in `content`.
- Custom CSS stores the raw stylesheet in `content`, tagged `homarr-custom-css-v1`.

`content` is validated client-side against these schemas before submission and before
install (see `apps/docs/src/lib/store-schema.ts`).
