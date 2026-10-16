# Remote platform account service

`packages/remote-platform` is a separate Hono/Bun service mounted at `https://homarr.dev/remote`. It reuses the existing Workshop PocketBase `users` accounts and GitHub provider configuration. It owns connection directory metadata and short-lived platform sessions; it does not introduce another GitHub registration or identity provider. It imports no Homarr application database, integration client, dashboard renderer, Next.js, Redis, or Node executable.

The platform is not a worker authorization authority. A compromised account database cannot issue an accepted worker grant, replace a pinned worker identity, or decrypt the private transport. Directory membership is explicitly returned as `accessStatus: "requiresWorkerGrant"`. Grant issuance and revocation must happen through the encrypted owner session at the worker.

## Identity and enrollment

- Workshop already configures GitHub OAuth in `apps/workshop/pb_hooks/workshop.pb.js`. The remote client uses the same PocketBase SDK popup flow, `users.authWithOAuth2({ provider: "github" })`, and the existing PocketBase `/api/oauth2-redirect` callback. An existing same-origin Workshop auth store can be refreshed and reused. No additional GitHub client ID, secret, or callback is configured by the remote platform.
- `GET /remote/api/auth/config` supplies the Workshop public API URL and browser-bound login CSRF token. The browser submits its Workshop user token to `POST /remote/auth/workshop/session`. Hono validates it by calling the configured PocketBase `users/auth-refresh` endpoint, as recommended by PocketBase for third-party token verification. The returned record must belong to `users`. Platform identity is the immutable PocketBase record ID; the Workshop's existing `name` mapping is only a display/login label.
- Workshop tokens and refreshed tokens are never persisted by the platform. GitHub tokens remain managed by the existing PocketBase login flow. Tests inject explicit adapters or run a disposable local HTTP server implementing the PocketBase auth-refresh contract; no live external service is verified.
- Platform sessions use 256-bit random opaque tokens, with only SHA-256 token hashes stored. HTTPS deployments use `__Host-` cookies with Secure, HttpOnly, SameSite=Lax, and Path=/. Session lifetime is one hour. A repeated sign-in rotates the current session; logout removes its server-side record. PocketBase account changes are revalidated when the platform session is renewed, rather than on every directory request.
- Mutations require the exact configured public Origin and a session-specific `X-CSRF-Token`. The service does not trust forwarded headers to select its origin or cookie security. Plain HTTP is accepted only on loopback for development.
- Enrolling a worker requires a five-minute platform challenge containing the account ID, origin, nonce, and expiration. The browser asks the worker owner to sign this statement inside its encrypted session. The platform verifies P-256 ECDSA and derives the worker ID from the pinned signing key with `@homarr/remote-protocol`.
- Enrollment rejects private JWK fields, arbitrary bearer fields, mismatched challenge accounts, changed challenge audience, forged worker IDs, expired challenges, and challenge replay. An existing directory worker cannot be taken over by another account.

`@homarr/remote-platform/types` and `@homarr/remote-platform/enrollment` are browser-safe public entrypoints. `enrollmentMessage()` defines explicit canonical statement field ordering.

## Directory, invitations, and sharing

Each account has its own connection name and relay/direct URL choice. Direct HTTPS endpoints can be Tailscale addresses; insecure HTTP/WS is restricted to loopback. URL credentials, queries, and fragments are rejected to prevent accidentally persisting bearer material. SQLite is authoritative for this new connection directory and its invitations/share pointers, while Workshop PocketBase remains authoritative for identity. The local user rows are a profile cache keyed by the same PocketBase user IDs; no separate account signup exists.

Owners can invite administrators or members. Administrators can invite members. Invite codes are random, stored only as hashes, expire, have bounded use counts, and can be revoked. Redemption uses an immediate SQLite transaction. The same code cannot restore a removed membership. Invitations grant connection directory membership; an independently delivered worker capability is still required to access the worker.

Share records hold only a public worker/grant identifier, optional public label, anonymous flag, and expiry/revocation metadata. They accept no capability bearer. Capability material belongs in the browser URL fragment or local browser storage. Temporary and permanent share pointers are supported; anonymous pointers can be resolved without a platform account. The actual worker independently enforces each capability's permitted dashboard, operations, expiry, and revocation.

Removing directory membership or a share pointer does not revoke a worker capability. The response explicitly returns `workerAccessRevoked: false`, and the client must revoke the grant over its encrypted owner connection. The platform's anonymous flag does not grant anonymous access at the worker.

## Service interface

| Route                                                                                    | Purpose                                                  |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `GET /api/health`, `GET /api/session`                                                    | Health and current account/CSRF                          |
| `GET /api/auth/config`, `POST /auth/workshop/session`, `POST /auth/logout`               | Reuse Workshop login and manage a platform session       |
| `GET /api/workers`, `POST /api/workers/challenge`, `POST /api/workers`                   | List and cryptographically enroll workers                |
| `PATCH /api/workers/:workerId`, `DELETE /api/workers/:workerId`                          | Personal connection settings and owner directory removal |
| `GET /api/workers/:workerId/members`, `DELETE .../members/:userId`                       | Membership inspection/removal                            |
| `GET /api/workers/:workerId/invites`, `POST .../invites`, `DELETE .../invites/:inviteId` | Invitations                                              |
| `POST /api/invites/redeem`                                                               | Join a worker directory                                  |
| `GET /api/workers/:workerId/shares`, `POST .../shares`, `DELETE .../shares/:shareId`     | Share metadata                                           |
| `GET /api/shares/:shareId`                                                               | Public/signed-in pointer lookup                          |

The table lists paths relative to `/remote`. This small service uses a metadata REST interface; private Homarr procedures use the worker's oRPC transport inside the encrypted connection.

Start with `bun packages/remote-platform/src/index.ts`. Configure `REMOTE_PUBLIC_URL` (production `https://homarr.dev/remote`, development default `http://localhost:3104/remote`), `WORKSHOP_API_URL` (default `https://homarr.dev`), `REMOTE_PLATFORM_DB` (default `./data/platform.sqlite`), and `PORT` (default 3104). Existing Workshop GitHub settings remain in the Workshop service. Optional `REMOTE_FRONTEND_DIR` serves the TanStack SPA's static assets and `_shell.html` fallback from the same Bun process, stripping `/remote` from filesystem paths. The default listener binds `0.0.0.0`; configure `HOSTNAME` to restrict it.

Run behind TLS using the exact configured public URL. The main website proxy routes `/remote` and its child paths to this service; existing `/api/collections`, `/api/realtime`, and `/api/oauth2-redirect` remain routed to PocketBase. SQLite uses foreign keys, WAL, and a busy timeout. Persist and back up the metadata database. API responses are no-store; request bodies are limited to 16 KiB. Login and mutation/invitation routes have bounded in-process rate limits. A front proxy should additionally enforce a global abuse budget for a public deployment.

## Verification

Focused verification on 2026-10-16: `bun test packages/remote-platform/src/platform.test.ts` passed **10 tests and 106 assertions**. Strict TypeScript, focused oxlint, and oxfmt pass. The tests cover Workshop token verification, rejection of non-user auth collections, local PocketBase HTTP contract exchange, browser-bound login CSRF, secure session rotation/expiry, `/remote` path routing, origin/CSRF enforcement, bounded bodies, enrollment signatures/private key rejection/replay, persisted SQLite connection settings, cross-account isolation, loopback WS relay support with remote insecure URL rejection, invitation permissions/use limits/revocation/expiry, and temporary/permanent/anonymous share metadata. No unrelated suites were run.

The focused HTTP integration uses only a disposable loopback server; it verifies that Hono actually calls `POST /api/collections/users/auth-refresh`, accepts the authenticated existing user record, sets an HttpOnly platform session, and persists neither the supplied Workshop token nor the refreshed token. Per user instruction, no live PocketBase, GitHub, deployment, or secret inspection was performed. End-to-end encrypted worker access and frontend acceptance are separate integration gates owned by the corresponding workstreams.

`Dockerfile.remote` builds the actual TanStack SPA and bundles the Hono service, with a Bun-only distroless runtime. Its source stage exactly matches the main Dockerfile to reuse the existing workspace install cache. `deployments/remote/compose.yml` defines the platform and optional blind relay, while `nginx.locations.conf` preserves the existing main-domain website/PocketBase routes and strips `/relay` only for the relay service. Both Compose profiles validate, `docker buildx build --check -f Dockerfile.remote .` completes without warnings, and the Nginx snippet passes `nginx -t` inside the existing local headless image.

A local assembled-runtime smoke bundled **63 modules / 58.27 KB** and served the then-current **816 KiB** SPA output from one Bun process. `/remote`, its JavaScript asset, health, session, auth configuration, and JSON API 404 behavior all passed. `WORKSHOP_API_URL` pointed to an unused loopback port, confirming these startup/public routes require no live PocketBase request.

The final actual Docker build subsequently passed: **95,626,874 bytes / 91.20 MiB**, Bun-only distroless runtime, current approximately **824 KiB** SPA, and a **54.94 KB** backend bundle. Isolated container checks verified the actual HTML/JS/API, existing Workshop public auth configuration, local PocketBase account-token exchange, metadata/session persistence after restart, UID 65532, no Node/shell, and a healthy container health check. See [platform-deployment.md](./platform-deployment.md) for exact artifact ID and memory observations.

Sources inspected: the local Workshop Go module (`PocketBase 0.39.9`), OAuth synchronization hook, users migration, and existing `WorkshopBackend` client (`pocketbase` SDK `0.26.9`); [PocketBase authentication and third-party token verification](https://pocketbase.io/docs/authentication/), [Hono cookies](https://hono.dev/docs/helpers/cookie), [Hono body limits](https://hono.dev/docs/middleware/builtin/body-limit), [Hono security headers](https://hono.dev/docs/middleware/builtin/secure-headers), and [Bun SQLite](https://bun.sh/docs/runtime/sqlite).
