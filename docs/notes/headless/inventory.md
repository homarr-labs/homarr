# Headless backend baseline inventory

Inventory date: 2026-10-16. Baseline: `dc2662d9f2eaabf9b7ba14693f8ddda8a56aeeff`. Source was read from Git's baseline while parallel agents edited the worktree, so this ledger remains stable. It describes required migration coverage; it does not mark implementation or acceptance complete. See [upstream architecture research](architecture-research.md).

## HTTP routes

There are 26 baseline `route.ts` files under `apps/nextjs/src/app`, comprising 25 API route files and the well-known route. Each route below needs explicit Hono ownership, correct method behavior, and preservation of relevant headers, streaming, access control, and error responses. Dynamic route files represent many concrete paths.

| Baseline route                                     | Methods                                | Behavior to preserve                                                                                                      |
| -------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `/api/trpc/:trpc`                                  | GET, POST, OPTIONS                     | Full lazy app router, API-key or session context, SuperJSON compatibility, errors, CORS                                   |
| `/api/*` REST catch-all                            | GET, POST, PUT, PATCH, DELETE, OPTIONS | Existing OpenAPI router; API-key authentication without ambient session fallback                                          |
| `/api/openapi`                                     | GET                                    | Base-URL-aware schema; `format=scalar` recursive-schema normalization                                                     |
| `/api/auth/*`                                      | GET, POST                              | Credentials, LDAP, OIDC, sessions, CSRF, callback redirects, cookie names and flags                                       |
| `/api/onboarding/claim`                            | POST                                   | First-run claim locking, expiry, administrator override, same-origin checks, HTTP-only cookie                             |
| `/api/health/ready`                                | GET                                    | Baseline unconditional 200; any new readiness semantics must be intentional                                               |
| `/api/health/live`                                 | GET                                    | DB and Redis check payload, status, latency, no-store headers                                                             |
| `/api/mcp`                                         | POST                                   | Authenticated MCP request transport, tools, prompts, resources, error sanitization                                        |
| `/api/mcp/:transport`                              | GET, POST, DELETE                      | Transport alias behavior and supported-method rejection                                                                   |
| `/api/mcp/oauth/authorize`                         | GET, POST                              | PKCE consent initiation/resumption and decision, browser binding, session, origin checks                                  |
| `/api/mcp/oauth/register`                          | POST                                   | Bounded dynamic registration, validation and rate limits                                                                  |
| `/api/mcp/oauth/token`                             | POST                                   | Authorization-code redemption, resource binding, failure limits, no-store                                                 |
| `/well-known/*`                                    | GET, OPTIONS                           | Authorization-server and protected-resource metadata, CORS, unknown-path 404                                              |
| `/api/backup/export`                               | GET                                    | Administrator-only SQLite ZIP export including encryption metadata, attachment response, cleanup                          |
| `/api/backup/import`                               | POST                                   | Administrator or valid onboarding claim, archive and body bounds, migrations, secret re-encryption, restore lock, restart |
| `/api/backup/migrations`                           | GET                                    | SQLite migration SQL plus journal, filesystem lookup and cache response                                                   |
| `/api/backup/sql-wasm`                             | GET                                    | Required sql.js WASM artifact with correct MIME and immutable cache                                                       |
| `/api/custom-widgets/:resource`                    | GET                                    | Administrator authoring catalog/schema/skill/reference resources and unknown-resource 404                                 |
| `/api/custom-widgets/configuration-request/:token` | GET, POST                              | Session/admin authorization, token ownership, bounded configuration request body and lifecycle                            |
| `/api/image-proxy/:id`                             | GET                                    | Forwarded bytes, abort signal, cache/MIME headers, distinct upstream/fetch/missing error statuses                         |
| `/api/user-medias/:id`                             | GET                                    | DB media, SVG sanitization, validators/304, CSP, nosniff, private-cache behavior                                          |
| `/api/about/dependencies`                          | GET                                    | Catalog-resolved dependency information without reliance on Next's working directory                                      |
| `/api/about/contributors/github`                   | GET                                    | Bundled static contributors JSON                                                                                          |
| `/api/about/contributors/crowdin`                  | GET                                    | Bundled static translators JSON                                                                                           |
| `/api/about/contributors/opencollective`           | GET                                    | Bundled static supporters JSON                                                                                            |
| `/api/assistant/chat`                              | POST                                   | Authorized AI stream, request bounds, tools/MCP, locale, cancellation/deadlines, persisted threads and usage              |

Source: baseline [route directory](../../../apps/nextjs/src/app/api) and [well-known handler](../../../apps/nextjs/src/app/well-known/[...path]/route.ts).

The route count excludes two public URL rewrites in `next.config.ts`: `/.well-known/*` and `/api/mcp/:transport/.well-known/*`. Mount their equivalent paths in Hono, including resource identifiers. The `well-known` source path alone does not provide the advertised discovery URL. Preserve OAuth response security headers currently added by Next's configuration. [Next configuration](../../../apps/nextjs/next.config.ts).

## Procedure coverage

The root app router contains 27 lazy namespaces:

`assistant`, `user`, `group`, `invite`, `integration`, `board`, `section`, `app`, `searchEngine`, `widget`, `location`, `log`, `icon`, `onboard`, `home`, `docker`, `kubernetes`, `serverSettings`, `cronJobs`, `apiKeys`, `media`, `updateChecker`, `certificates`, `bangs`, `analytics`, `info`, `customWidget`.

The widget router contains 46 lazy subrouters:

`stats`, `archiveTeamWarrior`, `beszel`, `anchorNotes`, `coolify`, `immich`, `paperlessNgx`, `patchmon`, `bazarr`, `notebook`, `weather`, `airQuality`, `app`, `dnsHole`, `smartHome`, `stockPrice`, `mediaServer`, `mediaRelease`, `calendar`, `downloads`, `mediaRequests`, `mediaOrganizer`, `rssFeed`, `indexerManager`, `healthMonitoring`, `mediaTranscoding`, `minecraft`, `options`, `releases`, `networkController`, `firewall`, `notifications`, `timetable`, `tracearr`, `speedtestTracker`, `uptimeKuma`, `audioStats`, `umami`, `vpn`, `ups`, `traefik`, `customApi`, `secrets`, `wud`, `llamacpp`, `wazuh`.

A source scan of the 137 non-test TypeScript files below `packages/api/src/router` found 193 `.query(...)`, 140 `.mutation(...)`, and 4 `.subscription(...)` declarations. These are declaration counts, not a proof of reachable runtime path counts: helpers, reused procedures, aliases, and the separate MCP/OpenAPI compositions can change the reachable set. A completion check should resolve lazy routers and compare path sets, input/output contracts, and authorization against the baseline. [Root router](../../../packages/api/src/root.ts), [widget router](../../../packages/api/src/router/widgets/index.ts).

The separate eager MCP router has a different namespace composition and enabled-tool filtering; the REST OpenAPI router exposes a curated subset. Preserving only the root router does not preserve all transport-specific contracts. [MCP composition](../../../packages/api/src/mcp.ts), [REST composition](../../../packages/api/src/open-api.ts).

| Subscription                         | Baseline output | Extraction concern                                                         |
| ------------------------------------ | --------------- | -------------------------------------------------------------------------- |
| `log.subscribe`                      | tRPC observable | Preserve history ordering, buffered messages, filtering, async unsubscribe |
| `cronJobs.subscribeToStatusUpdates`  | tRPC observable | Unsubscribe every status channel on disconnect                             |
| `docker.subscribeLogs`               | tRPC observable | Preserve endpoint capability check and stop upstream stream on disconnect  |
| `widget.beszel.subscribeSystemStats` | Async generator | Preserve bounded queue, signal, permission checks, upstream cleanup        |

## Server actions and frontend server data

The baseline contains one `"use server"` module: `packages/common/src/revalidate-path-action.ts`. Its exported action calls Next's `revalidatePath`. Its many dashboard callers invalidate rendered frontend pages after a mutation. This belongs to the dashboard rendering layer; an independent frontend should invalidate its own query/page caches after backend mutations. It is not an additional integration-domain endpoint to port. [Action](../../../packages/common/src/revalidate-path-action.ts).

Next's RSC callers also read authentication, headers, and the database directly. A backend that starts alone can coexist with those callers temporarily, but a separately deployed dashboard should obtain its server data through the service boundary or an explicitly shared backend service API. Audit `@homarr/api/server`, `rsc-context.ts`, the board/user/server-settings server entrypoints, root/layout/onboarding reads, and auth wrappers. Shipping Hono while Next continues to execute domain work itself is incomplete frontend/backend separation. [RSC context](../../../packages/api/src/rsc-context.ts), [API server entrypoint](../../../packages/api/src/server.ts).

## Next-specific backend dependency seams

| Baseline module or boundary            | Coupling                                                                   | Required separation                                                                               |
| -------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `auth/index.ts`                        | Runtime `next/headers` and configuration barrel                            | Export request-independent session/auth helpers separately                                        |
| `auth/configuration.ts`                | NextAuth, `next/headers`, manually written credentials/LDAP session cookie | Reuse provider and DB logic through request/cookie adapters on Hono                               |
| `auth/events.ts`                       | Runtime cookie write for color scheme                                      | Inject response-cookie handling                                                                   |
| `auth/providers/*`                     | NextAuth provider APIs; some Next header types                             | Verify Auth.js core compatibility and preserve current account/session behavior                   |
| `common/src/request.ts`                | Runtime `next/server` user-agent parser                                    | Framework-neutral user-agent function; preserve device contract                                   |
| `common/src/url.ts`                    | Next `ReadonlyHeaders` type                                                | Use portable `Headers`/minimal header interface; type-only coupling differs from runtime coupling |
| `api/src/rsc-context.ts`               | Next headers plus request-cached auth                                      | Keep in dashboard adapter, never backend server imports                                           |
| `api/src/shared.ts`                    | Dynamic Next cookies for SSR; fixed loopback origin                        | Keep client/SSR header utility out of backend runtime; service URL configurable                   |
| `translation/src/server.ts`            | `next-intl/server`                                                         | Explicit locale translator for backend assistant work; Next adapter remains for dashboard         |
| `common/src/revalidate-path-action.ts` | Next cache server action                                                   | Dashboard-only export                                                                             |
| Assistant route and helper graph       | `~/` aliases, component contracts/types, app env, locale cookies           | Move server logic and shared contracts out of the Next app                                        |

Do not mistake removing imports from the Hono entrypoint for eliminating transitive coupling. `@homarr/common/server` exports the request parser; tRPC context imports it. Importing the root auth barrel in the WebSocket runtime also reaches Next code at baseline. Distinguish `import type` edges from executed imports when evaluating the shipped graph.

A conservative traversal of baseline workspace `dependencies` from API/auth/tasks/websocket/image-proxy reaches 34 workspaces. It includes the following mixed server/UI packages: API, auth, common, translation, custom-widgets, DB, Workshop, widgets, UI, boards, forms-collection, form, modals, modals-collection, notifications, settings, and spotlight. This is a manifest closure, not an executed import graph or image-size measurement. Copying its full install can retain editors, charts, React, Next, and dashboard dependencies even if the backend never imports their UI exports. Prefer narrow package entrypoints and measured runtime bundling/pruning. [API manifest](../../../packages/api/package.json), [Custom Widgets manifest](../../../packages/custom-widgets/package.json), [DB manifest](../../../packages/db/package.json).

`@t3-oss/env-nextjs` is used in core environment validation; its package name does not establish a Next server dependency. Inspect actual runtime resolution rather than classifying dependencies by names alone. [Core environment factory](../../../packages/core/src/infrastructure/env/index.ts).

## Runtime, storage, and operations

### Existing production topology

At baseline the image runs Node 24.18.0 on Alpine. Bun 1.4.2 installs/builds in the builder stage. Nginx listens on 7575, routes `/websockets` to 3001, and sends other traffic to 3000. Production Next instrumentation imports both tasks and WebSocket services into its process. The architecture reference's statement that production is already a Bun process is stale against the actual Dockerfile/run script. [Dockerfile](../../../Dockerfile), [run script](../../../scripts/run.sh), [instrumentation](../../../apps/nextjs/src/instrumentation-node.ts).

Cron startup performs session cleanup, initializes persisted job schedules, and starts enabled jobs. Some startup callbacks do external work. An extracted process must explicitly own startup and failures and avoid starting the same jobs from both Next and Hono. The job group already exposes `stopAll()` for shutdown. [Tasks entrypoint](../../../apps/tasks/src/main.ts), [job group](../../../packages/cron-jobs-core/src/group.ts).

The baseline WebSocket runtime binds port 3001 and resolves database sessions from the session cookie. It uses tRPC's `ws` adapter and heartbeat, not a Hono route. Preserve the current dashboard subscription contract during migration, and specify whether standalone typed clients use oRPC SSE or a separate WebSocket adapter. Validate authentication on the actual transport in use. [WebSocket entrypoint](../../../apps/websocket/src/main.ts).

### Files and native dependencies

| Required artifact or capability                                      | Why it remains in a headless image                                        |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| SQLite/PostgreSQL migrations, journals, custom migrations, seed data | Fresh install, upgrades, restore, migration download API                  |
| SQLite native binding                                                | Active SQLite driver and temporary restore/export databases               |
| bcrypt native/runtime compatibility                                  | Password verification; existing hashes must remain usable                 |
| `sql-wasm.wasm`                                                      | Existing backup API contract used by browser tooling                      |
| Contributors JSON and dependency metadata                            | Existing about endpoints                                                  |
| Translation catalogs                                                 | Backend assistant/error presentation where applicable                     |
| Custom Widget schemas, authoring catalog, skill references, examples | HTTP and MCP authoring resources and validation                           |
| DOMPurify/jsdom dependencies                                         | SVG media sanitization security boundary                                  |
| Integration SDKs, XML/iCal parsers, WebSocket clients                | Actual broker and widget-data capability                                  |
| TLS CA bundle and mounted trusted certificates                       | Self-hosted upstream integrations and LDAP/OIDC trust                     |
| Writable `/appdata` and temp space                                   | DB, Redis persistence, restore staging, certificate data                  |
| Docker/Kubernetes access configuration                               | Optional integration capability; retain permission/capability enforcement |

A headless image need not include Next-generated dashboard assets, CodeMirror workbench, dashboard fonts/images, or Next's image optimizer. Keep backend media and authoring resources that are part of real API behavior. Avoid removing sanitizer or network-validation code to reduce size.

SQLite restore uploads can reach 256 MiB compressed and 512 MiB uncompressed database size at baseline. Response construction, multipart parsing, and ZIP/database processing can therefore exceed idle memory by a large factor. Preserve existing limits and avoid using idle RSS as the deployment memory ceiling. PostgreSQL is supported for the main DB, but the existing ZIP backup flow is deliberately SQLite-only; do not claim otherwise. [Backup implementation](../../../packages/backend-handlers/src/backup).

The existing runner supervises Next and restarts it after the restore endpoint calls `process.exit(0)`. Preserve effective backend restart behavior, cleanup, and failure propagation. A Compose restart policy alone may behave differently for a clean exit, so verify the selected policy.

### Identity and security

The current proxy signs its internal client-identity forwarding header and derives trusted proxies before startup. The Hono ingress must preserve that trust model, including source IP for rate limits, API-key auditing, MCP failure limits, and URL construction. Do not trust attacker-provided forwarding headers simply because Hono receives a Fetch `Request`. [Request identity](../../../packages/common/src/request-identity.ts), [nginx config](../../../nginx.conf), [trusted proxies](../../../scripts/trusted-proxies.mjs).

Keep API-key authorization, session authorization, anonymous-board visibility, integration/board permissions, demo read-only restrictions, claimed onboarding, and MCP tool filtering unchanged across transports. New RPC exposure must not bypass tRPC middleware through direct resolver calls. [Procedure middleware](../../../packages/api/src/trpc.ts).

For a separately hosted frontend, define its allowed origins and cookie/CORS model explicitly. The existing REST route intentionally authenticates only by API key; do not add ambient-cookie authentication to it accidentally. Session-authenticated mutations need CSRF/origin behavior appropriate to the chosen frontend origin.

### OAuth and onboarding without the dashboard

The baseline MCP authorization endpoint redirects to Next pages at `/auth/login` and `/auth/mcp`. API-key access alone does not prove a fully independent OAuth login/consent flow. Provide minimal backend-owned login/consent HTML or an explicitly configured external frontend authorization UI, preserving state, PKCE, browser binding, consent token, redirect validation, and security headers. [OAuth authorize](../../../apps/nextjs/src/app/api/mcp/oauth/authorize/route.ts), [existing consent UI](../../../apps/nextjs/src/app/[locale]/auth/mcp/page.tsx).

Fresh headless setup needs a usable claimed onboarding/account path and a way to obtain an API key without launching the dashboard. Reuse the existing onboard procedures and claim rules. A seeded development administrator is not sufficient proof of a first-run product flow.

## Acceptance checklist

These are completion requirements, not an instruction to run broad test suites. Use focused manual requests and relevant requested checks, record actual outputs separately, and mark external prerequisites explicitly.

- [ ] Standalone Bun backend starts with no Next listener/process and no frontend runtime import.
- [ ] Fresh SQLite initialization and existing-data upgrade work with migration/seed artifacts; PostgreSQL startup is separately validated.
- [ ] Every listed HTTP route and rewrite has Hono ownership; unsupported methods, route precedence, and unknown paths are correct.
- [ ] Resolved procedure paths match baseline across lazy root, nested widget routers, MCP and REST compositions.
- [ ] New oRPC handles representative reads, writes, validation/domain errors, authentication, and all four subscription forms.
- [ ] Legacy tRPC/REST clients retain wire format, status codes, request limits, authorization, and relevant headers.
- [ ] Credentials, configured LDAP/OIDC, session expiry/revocation, API keys, anonymous reads, and denied operations remain enforced.
- [ ] Fresh claimed onboarding and API-key creation work without the dashboard.
- [ ] MCP initialization, tool discovery/call, resources, prompts, OAuth discovery/registration/consent/token redemption work with the frontend absent.
- [ ] Integration broker and widget-data requests exercise stored credentials, permitted network targets, cache refresh, and safe error handling.
- [ ] Cron starts once, honors persisted disabled jobs/intervals, publishes status, and stops during shutdown.
- [ ] Streaming disconnects cancel upstream assistant/Docker/Beszel work and unsubscribe Redis listeners.
- [ ] Media SVG sanitization and conditional-cache responses match baseline; required binary/static resources exist in packaged image.
- [ ] Backup export/import preserve bounds, secret re-encryption, migration, cleanup, response delivery, and backend restart.
- [ ] Full mode routes all backend endpoints to Hono and provides correct dashboard data/session forwarding.
- [ ] Headless container honors data volume, `_FILE`, PUID/PGID, external/internal Redis, trusted certificates/proxies, signals, and health checks.
- [ ] Final image and import graph demonstrate backend independence; architecture-specific native dependencies are checked on shipped platforms.
- [ ] Matched full/headless measurements record image bytes, idle/process/container memory, startup and representative workload costs.

No acceptance item is checked by this inventory itself.

## Extraction work recorded during implementation

The neutral common barrel no longer exports React hooks or Mantine theme helpers. Their callers use the explicit `@homarr/common/hooks` and `@homarr/common/theme` entrypoints; 16 frontend/widget import declarations were updated. `stockPriceTimeFrames` moved to `@homarr/definitions/stocks`, so the stock-price API no longer loads a widget definition and its component-loader graph just to obtain enum values. Translation HTTP work uses a locale-only server path, and RPC path constants have a separate lightweight API entrypoint.

A focused AST import audit rooted at `apps/backend/src/index.ts` traversed 770 workspace source modules, including literal lazy imports and runtime reexports. It found zero direct external edges to `next`, `next-auth`, `next-intl`, React, Mantine, Tabler, or Mantine table packages; zero `"use client"` directives; and zero parse failures. Type-only imports were excluded. This is source-graph evidence, not emitted-bundle, third-party-transitive, container, or runtime acceptance evidence. The analysis script was kept outside the repository at `/tmp/homarr-headless-import-graph.cjs`.
