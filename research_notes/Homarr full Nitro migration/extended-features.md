# Extended features and external contracts: full Nitro migration

Research only, October 10, 2026. Assigned question: `.scratch/nitro-full-migration/issues/extended-features.md`; shared scope: [full migration research contract](../../.scratch/nitro-full-migration/RESEARCH.md). Inspected checkout: branch `rework-hono`, HEAD `66e2199f9cd1e4026249c3763413988bab8664c4`, with pre-existing dirty `.gitignore`/`bun.lock` and untracked research/experiment material. Findings describe current source, not only that commit, and do not certify the uncommitted fixture or a working replacement. Only this note was written. No application probes, builds, installs, tests, lint/typecheck, tracker mutations or nested agents were run.

## Executive recommendation

**Retain the feature engines and replace their framework/transport adapters.** Custom JSX already has runtime/workbench ports, protected execution and injectable stores; Workshop has a reusable PocketBase client and schema; CLI commands largely bypass HTTP. Assistant should keep its AI SDK UI-message stream independently of oRPC procedure transport. Onboarding and backup need more deliberate extraction because they combine permissions, transactions, filesystem operations and restart behavior. [Assistant route][A1]; [Custom JSX ports][C2]; [workbench ports][C3]; [Workshop backend][W1]; [CLI][L1]; [onboarding][O1]; [backup import][B2].

Highest-risk reconciliation items:

1. Backup key conversion currently rewrites only `integrationSecret`, not encrypted Assistant configuration or Custom Widget secrets. Feature-preserving restore must resolve this existing defect, not silently carry it forward. [B2]; [A2]; [C5].
2. Assistant approval/tool extraction depends on the curated MCP surface and tRPC caller/internals; changing transport must not bypass permission, approval, redaction or Custom JSX evidence gates. [A1]; [A4]; [C5].
3. Library installation is not a validated coherent baseline: catalog `ai` is `7.0.56`, but inspected root `node_modules/ai/package.json` reports `6.0.33`; installed `@assistant-ui/react-ai-sdk@1.4.4` requires `ai ^7.0.37`. This is an observed local mismatch, not a runtime failure reproduced here. Do not use those installed AI declarations as proof of v7 compatibility. [D1]; [D2]; [D3].
4. Restore exits the application and relies on supervision; migrations, SQL WASM, CLI/native dependencies, public assets, forwarding headers and stream behavior remain packaging obligations. Nitro Fetch compatibility alone proves none of them. [B2]; [B3]; [P1]; [P2]; [P3].

## 1. Prior decisions/evidence consumed, and boundaries

- [Exact oRPC beta.43 investigation](../Homarr%20Nitro%20v3%20stack%20choices/orpc-elysia.md): direct Nitro Fetch mounting is plausible; oRPC SSE is not the Assistant stream; multipart bodies cannot be consumed early; native HTTP routes can remain separate. Beta.43's optional Zod converter peer mismatch and public OpenAPI ownership remain that lane's questions.
- [TanStack rendering investigation](../Homarr%20Nitro%20v3%20stack%20choices/tanstack-rendering.md): the named Nitro Router example is CSR, not a complete SSR integration. Request-local identity/Query/router state and explicit client-only boundaries still matter for extended features.
- [Nitro runtime investigation](../Homarr%20Nitro%20migration%20experiment/nitro-runtime.md): v3 beta/current-doc drift, explicit registration, fallback versus global middleware, plugin/readiness and asset packaging distinctions apply here.
- [Production packaging investigation](../Homarr%20Nitro%20migration%20experiment/performance-packaging.md): current shipping application runtime is **Node**, with tasks/WebSockets initialized inside the app process, plus shell/nginx and optional internal Redis. The architecture skill's Bun-production sentence is stale relative to Docker/startup source. No framework-name RAM claim follows.
- Context7 quota exhaustion was already recorded by the shared research; it was not repeated. Official AI SDK/PocketBase documentation and inspected local source supplement the previous stack findings. Two guessed assistant-ui documentation paths returned 404; installed adapter source supplies the storage-format evidence instead, not a claimed official Nitro integration.

The full rewrite target is Nitro v3 + Vite/React + TanStack Router + direct oRPC. Recommendations below are migration seams, **not approved library substitutions or implementation authorization**. `apps/docs` and the Go/PocketBase `apps/workshop` runtime stay outside runtime replacement. Their shared-package imports, schemas, URLs, OAuth and assets remain compatibility consumers, not dead code. [W1]; [W2]; [W4]; [W5].

### Ownership reconciliation

Sibling note names below are the shared assignment destinations; none was available in this output directory when checked. These are required handoffs, not claims their owners have already accepted every edge.

| Owner / destination | Owns centrally | Required extended-feature handoff |
| --- | --- | --- |
| `endpoints-transports.md` | HTTP/oRPC/REST/MCP/subscription contracts, context/error/serialization adapters | Assistant POST stream; Custom JSX authoring/configuration routes and tools; onboarding claim; media/proxy/backup/about HTTP routes; operational streams. This note owns feature semantics, not a second endpoint inventory. |
| `persistence-background.md` | DB schema/migrations, crypto-compatible storage, Redis/cache/locks, jobs/fanout and lifecycle | Assistant thread/message/config/telemetry; Custom JSX definitions/secrets/legacy rows/preview CAS/evidence/configuration locks; onboarding conditional transaction; binary media/icons; backup consistency/restart; ops histories/tasks. |
| `identity-administration.md` | Production auth, permissions, settings, claims, certs and secret exposure | Owned Assistant histories and admin provider setup; Custom JSX admin/board/request permissions and secrets; one first-run owner; media ownership; backup admin-or-claim; Docker/Kubernetes/certificate permissions; CLI recovery. Workshop account remains separate. |
| `widgets.md` | All widget kinds, options, placement/render/refresh adapters | `customApi` definition/configuration/version placement, public read versus authenticated action, Assistant widget bridge and shared session. Extended owner owns engine/workbench; widget owner owns registry/board integration. |
| `integrations.md` | External clients/provider capabilities and integration-bound credentials | Custom JSX integration-source resolution/path scopes; Docker/Kubernetes discovery and operations; trusted HTTP/proxy consumers; onboarding integration tests; icon repository fetchers. Assistant model-provider behavior belongs here as an extended feature, with an explicit provider-contract handoff. |
| `dashboard-navigation.md` | Board/app/section navigation/editing/search | Onboarding board selection/layout preservation; native Assistant app/board/widget tools and mutation refresh; Custom JSX placement eligibility; Workshop CSS draft/save; management links. |
| `localization-ui.md` | Router/i18n/providers, shared modal/notification/form/image/client-only services | All feature UI adapters, translated strings, runtime Workshop meta config, clipboard/downloads/speech, terminal/CodeMirror/browser SQL boundaries, PWA/About. Do not rewrite catalogs separately here. |

Potentially unassigned **product UI**: operational tools, About/version/contributor/dependency display, PWA manifest/service worker/public assets, and production packaging supervision. They are explicitly covered below, but the coordinator must allocate a final UI/packaging owner; transport, storage and identity ownership alone do not port their pages.

## 2. Capability coverage ledger

Legend: **R** reusable engine/contract; **A** adapter required; **X** Next-specific entry/glue must be replaced. R never means no verification. Each row includes an acceptance obligation; later sections make security/durable-data obligations concrete.

| Capability and current entry/source | Disposition and target seam | Required feature evidence / handoff |
| --- | --- | --- |
| Assistant provider configuration, enablement, model discovery, manual models, OpenRouter settings and telemetry; `/manage/assistant`, `assistantRouter` | R provider/config logic; A request-authorized procedures and management queries; X RSC/page/auth hooks. [A2]; [A3] | Existing provider presets and custom/local URLs, secret preservation/reset, discovery failure/cache/manual fallback, admin-only changes; identity/storage/endpoint owners. |
| Assistant chat, streamed reasoning/sources/metadata, tool loops/approvals and abort; `/api/assistant/chat` | R bounded input/model/tool controllers; A Fetch Response service with request auth/signal and curated tool executor; preserve AI UI-message protocol, not oRPC event replacement. [A1]; [A4] | Real incremental events, approve/deny/continue/stop/error, no denied mutation/retry, no lost tool/source state; endpoint owner. |
| Assistant conversations, branches/history, attachments, panel/widget/Spotlight, exports/feedback/speech and notifications | R codecs/helpers/UI; A thread/history/browser tool/navigation/invalidation adapters; X Next dynamic/client/provider glue. [A3] | Owned durable history survives reload; separate composer drafts but shared run/messages across surfaces; supported attachments/export and browser actions; frontend/widget/dashboard owners. |
| Custom JSX schema/catalog/interpreter/renderer/options/input/data/refresh/action primitives | R `core`, `jsx`, `runtime`; A `CustomWidgetRuntimePort`; X Next-only lazy wrapper. [C1]; [C2]; [C6] | Stored definitions render identically, bounded safe evaluation, request capabilities/permissions/invalidation, edit-mode action disabling; widget/identity owners. |
| Custom JSX workbench, completion/diagnostics/preview/response tree/request journal/source setup | R CodeMirror/workbench; A `CustomWidgetWorkbenchPort` and management procedures; X management pages/hooks. [C3]; [C4]; [C5] | Query previews, simulated/live actions, cancellation, revision-appropriate evidence; frontend/endpoint/storage owners. |
| Definition CRUD/enable/delete/duplicate, JSON/Markdown transfer, legacy export/v2 replacement and source secrets | R validation/serialization/security/transaction helpers; A thin admin services and adapters. [C5]; [C7] | Portable exports exclude deployment binding/secret values; compatible encrypted credentials and same legacy ID retained; incompatible edits clear credentials; storage/identity owners. |
| AI authoring research/discovery/template/preview/evidence/persistence and authoring HTTP/MCP resources | R shared authoring controllers/catalog/resources; A curated tools/resource dispatch and domain errors. [A1]; [C5]; [C8] | No save from stale/failed final revision; no auto-retry after upstream preview outage; HTTP/resources/prompts agree; endpoint owner. |
| Human configuration request `/custom-widget-configuration/[token]`, GET/POST `/api/custom-widgets/configuration-request/[token]` | R state/lock/application service; A token/user auth/body/status adapter; X page. [C9] | Expiry, ownership, pending/applying/completed transitions, no duplicate apply or secret result leak; identity/storage/endpoint owners. |
| Workshop browse/detail/search/sorts/pagination/outdated, screenshots and install | R PocketBase schema/client/Query hooks; A browser config/navigation and local definition import; X page shell. [W1]; [W2]; [W3] | Existing Workshop submission URLs remain remote; local imported ID differs; invalid/incompatible payload cannot install; both native UI and MCP install paths; endpoint/custom-runtime owners. |
| Workshop GitHub popup account, token/refresh/signout, publish/update, voting/reporting and CSS import | R backend and contracts; A Homarr auth UI/public config/notifications/draft editing. [W1]; [W3] | Auth works without merging Homarr session; screenshots/auth publish/update; vote/report errors; reviewed CSS affects draft and persists only on settings save; frontend/dashboard owners. |
| Homarr Assistant hosted provider/quota and docs search | R external contract; A browser token/quota and server exact-origin/path forwarding; excluded Go/docs outputs preserved. [A1]; [W4] | `X-Homarr-Provider-Token` never forwarded to an arbitrary provider; `/api/ai/v1/*`, `/api/ai/usage`, docs Markdown/index remain compatible; external contract owner. |
| `/init` first-run claim/account/group recovery/setup/finish | R claim/state/recovery/selection helpers and setup transaction; A request-derived environment/sign-in/queries; X page/revalidation. [O1]; [O2] | Exactly one claimant; local/external auth recovery; no completed setup reopen; selected existing board/layout and stable IDs preserved; identity/storage/dashboard owners. |
| Onboarding studio discovery/probes/tests, presets/layout/color/locale/analytics, optional Assistant/MCP/API/backup | R planning helpers; A Docker/Kubernetes/Workshop/integration/settings executors plus router refresh; X Next hooks. [O1]; [O2] | Unavailable capability degrades deliberately, selected discoveries produce correct app/integration/widget bindings, optional settings and SQLite restore finish; all related owners. |
| Media management/upload/list/search/delete and local icon sync | R schema/DB/icon mapping; A multipart mutation/browser form; X management page. [M1]; [M2] | File validation/limits, owner/all-user permission semantics, byte integrity, deletion removes matching local icon; endpoint/storage/identity/frontend owners. |
| `/api/user-medias/[id]` read and SVG/cache/security | R sanitizer/validator logic; A binary Fetch handler; X `notFound`/NextResponse. [M3] | Existing anonymous image URLs on public boards work; SVG sanitized, ETag/304/security headers maintained; endpoint/identity owners. |
| `/api/image-proxy/[id]` and proxy registration/dedup/error/TTL/trust | R `ImageProxy`; A route/Redis/trusted HTTP initialization, no invented common SSRF policy. [M4]; [M5] | Immich/Plex/Gotify/Tracearr image consumers, opaque URLs, encrypted headers, expiry/status/header/cache behavior; integration/storage/endpoint owners. |
| Icon repositories/local media search, auto-search, licenses/groups and refresh | R icon clients/ranking/group mapping; A public query/forms and job startup. [M6]; [M7] | Existing repositories and local URL choices, ranked/grouped limits and license metadata; integrations/background/frontend owners. |
| SQLite backup export/download, preview, import/migrate/key conversion/restore/restart; `/manage/tools/backup`, `/api/backup/*` | R bounded archive/migration/preview helpers; A isolated backup/restore coordinator, filesystem and lifecycle ports; X auth/Response/page glue. [B1]; [B2]; [B3] | Exact archive compatibility, all encrypted feature data decryptable, rejected archives leave live DB unchanged, restart/readiness success; storage/identity/endpoint/packaging owners. |
| Logs/levels/live terminal, task management/status, Docker and Kubernetes tools, cert/hostname/API/MCP tools, update/analytics | R server clients/status and terminal/helpers; A procedure/subscription/permission adapters; X tool pages/client-only loading. [T1]; [T2] | Complete tools UI and denied cases, stream cleanup/reconnect, actions/history/status, disabled-feature behavior; split transport/storage/identity/integrations plus explicit UI owner. |
| Transient UI notifications and Assistant waiting/completion/error signals | R Mantine notifications wrapper and Assistant state helpers; A root provider and shared feature notification port. [N1]; [A3] | No duplicate/lost notification across Assistant surfaces, consistent form/action errors; frontend owner. Gotify's widget is a different lane. |
| Application CLI user/integration/recovery operations and harness tooling | R brocli command/service logic; A compatible auth/DB/env plus artifact/runtime paths; preserve lazy harness dispatch. [L1]; [L2] | Published command/flag/exit semantics and durable mutations; harness help/build/run/setup/port/stop works without eager DB config; storage/identity/packaging owners. |
| Go developer CLI local/PR images/build provenance, run/log/data/shell/CI/open/lifecycle/doctor | R external tool/runtime; A changed image entry/health only if needed; do not rewrite Go CLI for oRPC. [L3]; [P1] | Same port/volume/env/encryption/provenance/image contracts; source fingerprint/rebuild/PR workflows; packaging owner. |
| About/version/contributors/dependencies and PWA/manifest/sw/static assets | R payload/assets/branding selection; A version/static-data export and dynamic manifest; X Next metadata/image paths. [U1]; [U2]; [P3] | Full About display/HTTP resources, branding-aware manifest/direct assets/service-worker scope; frontend/endpoint/packaging owners need assignment. |

This reconciles the assigned surface at the capability level. It deliberately does not repeat every widget, integration, schema table or transport procedure. No old generic board/config importer was established by the inspected transfer searches; do not infer one from historical Homarr versions. Current feature transfer paths are Custom JSX, Workshop/CSS, Assistant conversation export and SQLite backup. Any additional importer discovered by another owner must become another parity row, not disappear under “imports done.”

## 3. Assistant: split stream, storage, curated tools and browser runtime

### Current service and wire contracts

`apps/nextjs/src/app/api/assistant/chat/route.ts` authenticates the session, checks thread ownership, loads permitted context/tools/configuration and returns `toUIMessageStreamResponse`. It uses `createOpenAICompatible` for the presets; fourteen definitions are `homarr`, `openrouter`, `openai`, `anthropic`, `google-gemini`, `xai`, `groq`, `mistral`, `deepseek`, `together`, `ollama`, `lm-studio`, `llama-cpp`, `custom`. Native provider-specific SDK substitution is **not** required by the runtime change. Preserve supported options/model capabilities rather than assuming a provider label proves every upstream feature. [A1]; [A2]; [A5].

`assistantRouter` already owns encrypted API key/custom headers, destination-change clearing/disabling, enablement, manual model IDs, model discovery/cache, context entity lookup, owned thread/message CRUD and telemetry. Model lookup has a 15-second timeout and ten-minute cache. Durable messages use parent relationships and SuperJSON; browser history adapters append/update/delete them. Stream finish updates thread metadata; it is not the entire message persistence path. These operations can sit behind oRPC while chat retains the independent stream. [A2]; [A3].

Preserve existing request ceilings: 12,000,000-byte chat body, bounded 200-message/part inputs and 16 browser tools; up to five attachments per message, image payload at most 1,000,000 bytes and text/JSON at most 350,000 bytes. Text attachments become tagged text; image support is model-dependent. Preserve validation and model capability rejection on both sides, not merely a file picker. [A1]; [A3].

The official [AI SDK stream protocol](https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol) documents a custom-backend SSE protocol with `x-vercel-ai-ui-message-stream: v1`, distinct text/reasoning/source/file/tool/approval/step/error/abort events and `[DONE]`. A plain text or oRPC async-iterator response would lose semantic parity. Current official examples may differ from the repo's SDK API; retain source-shaped response generation until the exact chosen installed version is coherent and validated.

Storage format remains **`ai-sdk/v6`**: Homarr's `createHistoryAdapter` checks this string; installed adapter source `src/ui/adapters/aiSDKFormatAdapter.ts` also declares it despite `react-ai-sdk@1.4.4` depending on AI SDK v7. Do not rename persisted format labels or flatten branch history because the package major changes. [A3]; [D3]; [D4].

### Tool and safety obligations

- Curated server tools come from eager MCP registration/extraction; permissions remain authoritative. Admin-only Custom Widget tools, lazy tool-group activation, browser-tool allowlists, native app/board/widget review forms, ask-user and same-origin navigation must remain available. MCP/oRPC adapters need one shared curated executor rather than a second permissive tool registry. [A1]; [A4]; [A6]; [A7].
- Approval key material is HKDF-derived from the configured encryption key. A denial stops the turn; default autoapproval is false and per-conversation state is reset/bounded. Preserve approval continuation, deny semantics and redacted user-visible errors. Transport conversion cannot create unchecked “internal” execution paths. [A1]; [A3].
- Shared Custom JSX controllers bound authoring/research/discovery/template/preview/evidence/save transitions and safe recovery. Existing policy is 40 steps, two retries, 32,768 max output tokens, total 600 seconds, step 240 seconds and tool 90 seconds, with abort propagation. These are application limits, not Nitro's `maxDuration` configuration; copy their enforcement, not only the Next route constant. [A1]; [C12].
- Keep metadata/timing/usage/context/tool tracing and safe failure behavior. A successful text reply is insufficient acceptance when tools, mutation refresh or history stopped working. [A1]; [A2]; [A3].

### Browser runtime and external contracts

`assistant-provider.tsx` composes AI SDK chat, remote thread/history, browser/native tool adapters, attachment handling, notifications and refresh. `createAssistantSurfaceRuntime` subclasses assistant-ui `INTERNAL.DefaultThreadComposerRuntimeCore` and proxies internal bindings: messages/run/history are shared, drafts/attachments/selection are local per surface/conversation; inactive composer cache is bounded at 12. This is a **version-sensitive seam**, not ordinary React context reuse. Retain installed compatible internals initially or explicitly replace with a public adapter preserving those behaviors; no production compatibility was measured. [A3]; [D3].

Required UI acceptance: floating panel + multiple board widgets + Spotlight can refer to one conversation without mirrored drafts, duplicate runs, stolen focus/scroll, duplicated human-question portals or duplicate notifications. Preserve selection/model/preferences, pending approvals, tool rendering, Markdown/directives/images, copy/download conversation exports, feedback and browser speech synthesis. The widget registry owner integrates the Assistant widget; frontend owner owns provider/client-only/navigation substitutions. [A3].

Conversation export is a diagnostic Markdown path with branch/message/tool/source/approval information and built-in redaction/bounding of sensitive keys, token patterns, URL credentials and data URLs. Preserve that behavior; it is not a conversation-import/restore format or a guarantee that arbitrary conversation text contains no confidential information. [A8].

Hosted Homarr provider is a separate Workshop account: browser token header `X-Homarr-Provider-Token`, quota `/api/ai/usage`, and Workshop OpenAI-compatible `/api/ai/v1/models` and `/api/ai/v1/chat/completions`. The chat server only forwards the token when configured base URL exactly matches the resolved Workshop `/api/ai/v1`. Preserve that boundary; never turn incoming provider-token headers into arbitrary upstream credentials. [A1]; [W1]; [W4].

Assistant docs search consumes `https://homarr.dev/llms.txt` and `/docs/*.md`, with bounded fetches/timeouts, no redirects and max two searches; `NO_EXTERNAL_CONNECTION` disables that docs tool. The excluded docs runtime must continue producing those resources. Live docs content availability was not probed by this feature inventory. [A1]; [W4].

**Proposed seams:** request-authorized chat service returning `Response`; provider/config/model service; owned conversation repository preserving codec/branches; curated `ToolCatalog/ToolExecutor`; browser navigation/review/invalidation adapters; shared Assistant UI runtime. Those names are proposed responsibilities, not new approved package APIs.

## 4. Custom JSX: reuse its ports and security model

### Reusable engine versus adapter glue

`packages/custom-widgets` separates core schemas/catalog/authoring helpers, safe JSX interpreter, server protected executor, runtime renderer and workbench. The manifest does not require Next. Public ports already express transport-independent operations: [C1]; [C2]; [C3].

- `CustomWidgetRuntimePort`: `query(input, signal?)`, `executeAction(input)`, `invalidate(input)`, `confirm(...)`, `notify(...)`.
- `CustomWidgetWorkbenchPort`: `preview(values, signal?)`, `queryPreview(input, signal?)`, `simulateAction(input)`, `setLiveActions(input)`, `readJournal(sessionId, signal?)`.
- Server preview service accepts `PreviewSessionStore` plus crypto/ID injection; rate/concurrency service accepts `RequestLimitStore`. Production wrappers use Redis with revision CAS, TTL, journals/evidence and Lua limits. These are ready adapter seams, not a reason to replace Redis with process memory. [C5]; [C10].

Current API composition is spread across `custom-widget-router.ts` and management/query/creation/metadata/template/preview/action/secret/transfer/Workshop/configuration files. Existing domain errors are translated to tRPC; extract a stable domain error mapping for oRPC rather than leaking `TRPCError` into the interpreter. Retain validation and record serializers. Workbench CodeMirror/render/preview components can be ported against fake ports before real procedures or the whole dashboard are complete. [C4]; [C5].

### Security and lifecycle must not be weakened

The server executor uses Node DNS/net/TLS and undici dispatchers to pin validated destinations. Preserve network scopes (`public`/`private`/`loopback), same-origin/path-scoped integration sources, reserved headers, credential injection/redaction and redirect rules: authenticated/action requests cannot redirect; unauthenticated queries permit at most three validated redirects. Generic platform `fetch` is not an equivalent DNS-pinned implementation. [C10].

Current bounds include 10 KiB request, 1 MiB response, JSON depth 32/nodes 50,000, 10-second request-hop and 45-second total duration; bounded in-memory response/inflight caches use epoch invalidation. Interpreter/schema limits include 50,000-character template, AST depth 64, 25,000 operations, collection 4,000, rendered nodes 10,000, string work 200,000. Prototype/global/event/unsafe tag/portal/CSS escape restrictions are security contracts. Do **not** replace the interpreter with `eval`, arbitrary JSX compilation or unrestricted browser fetch. [C1]; [C10]; [C11].

Preview actions default simulated; enabling live execution and destructive requests needs confirmation. Persistence from preview requires successful queries and successful or simulated actions for the **final revision**. Direct form CRUD/import is a separate admin-authorized path; do not claim every save universally requires preview evidence. Configuration requests are ten-minute user-owned token/lock flows with pending/applying/completed state. Preserve revision, user and token ownership at the server, not in client UI state. [C5]; [C9]; [C10].

Stored board kind stays `customApi`, with definition ID/configuration/version. `widgets/custom-api.ts` enforces board view/request permissions, public queries only through accessible public boards, authenticated actions, enabled definitions, normalized options, manual/load distinctions and a legacy-migration-required outcome. Editing a board is not automatically permission to introduce arbitrary Custom JSX definitions. Widget and board owners retain their placement checks and invalidation integration. [C6].

### Transfer, secrets and external authoring consumers

- `exportCustomWidgetDefinition` strips local `integrationId` from integration sources; encrypted secret rows are not part of the portable definition. Preserve source setup/review warnings showing origins/auth/scopes/methods/permissions/actions. [C7].
- Runtime secret auth includes basic, bearer, API-key header/query. Normal edit retention compares origin + network scope + complete auth binding; integration bindings do not retain local source secrets. Legacy migration has its own same-origin/auth/header compatibility rule, accepts explicit replacements and preserves same ID, enabled/creator/created state and compatible ciphertext. Do not broaden either rule during extraction. [C5]; [C7].
- `exportLegacy` returns v1 structure and configured secret **kinds**, not values; same-ID validated v2 replacement is available. Preserve old saved placements and legacy-export/recovery UI, not only new definitions. [C7].
- Management pages include list/new/edit/preview/publish/Workshop/detail. Authoring HTTP resources `/api/custom-widgets/{schema,components,skill,reference-*,authoring-prompt}` are admin-protected. MCP resources include `homarr://custom-widgets/schema`, `/components`, `/skill`, `/references/{schema|runtime|security}`. Schema/catalog/prompt version agreement is an external-client obligation. [C4]; [C8].
- `apps/docs` consumes Custom JSX shared core/workbench/catalog modules. Moving them into a Nitro-only app or changing exports would break an excluded runtime. Keep those packages portable; server secrets/executor never enter browser docs/authoring graphs. [C1]; [W5].

**Recommended extraction split:** one protected-execution/preview lifecycle service owner, one definition/secret/transfer service owner, one runtime/workbench adapter owner. The board registry and central MCP/HTTP registrations remain other owners' single-writer work.

## 5. Workshop: preserve both install paths and separate identity

`WorkshopBackend` owns validated list/detail schemas, listing fallback, pagination/search/sorts/outdated filtering, GitHub popup auth, LocalAuthStore token/change/refresh/signout behavior, file/screenshot URLs and publish/update/vote/report/comment/moderation helpers. Keep its current timeout and disabled-auto-cancellation choices. Native Homarr UI visibly composes browsing/install/publish/vote/report and CSS-theme import; existence of comment/moderation backend methods alone does not establish a Homarr UI for all of them. Preserve exports used by the excluded service/docs consumers without inventing new product pages. [W1]; [W2]; [W3].

Two distinct install flows must survive:

1. Browser reads PocketBase submission/detail → `useCustomWidgetImport` → local `customWidget.import` after source/secret review.
2. Server MCP `workshopSearch/Get/Install` → remote fetch/schema validation → configured source binding and local insert.

They share v2 schemas/export stripping but are not interchangeable transports. Workshop submission IDs/revisions and installed local definition IDs are different identities. Preserve incompatible/outdated handling and safe unavailable errors. [W3]; [C5]; [C7].

Runtime public meta tags `homarr-workshop-api-url` and `homarr-workshop-web-url` plus `resolveHomarrUrlConfig` let deployments select API/web destinations without baking browser-only defaults. `/manage/workshop` permanently redirects to `/manage/custom-widgets/workshop`. CSS import is reviewed then applied to the settings **draft**; persistence occurs only on save. Preserve these observable URL/edit semantics. [W2]; [W3].

The official [PocketBase SDK](https://github.com/pocketbase/js-sdk) supports browser/Node clients, multipart File/Blob upload, browser localStorage/tab synchronization, popup OAuth and disabling automatic request cancellation. Its SSR guidance requires a new authenticated client per request. A module-level unauthenticated remote reader is not proof a shared authenticated server singleton is safe; do not move the browser's token store to a global Nitro singleton.

The excluded Go/PocketBase runtime owns GitHub callback handling, provider API/quota and its own static docs serving, query-preserving redirects and cache/range behavior. Homarr does not own those OAuth callbacks through NextAuth. Preserve return/callback origins, file URLs, schema/version contracts, screenshots multipart layout and CSP/connect policy. No Go service modification is proposed. [W1]; [W4]; [P3].

**Independent demonstration:** with a fake/fixture Workshop backend, browse/detail + reviewed local import can work before Assistant or full dashboard migration; real popup/publish/provider quota and callback acceptance waits for approved deployment origins and identity/frontend contracts.

## 6. Onboarding: request gate plus setup planner/transaction

`/init` currently supplies a restricted environment from session/claim/DB/settings. `currentStep` is public; transitions/setup use claim-aware procedures. `/api/onboarding/claim` rejects cross-site requests, distinguishes lock/admin/finished outcomes and issues an HttpOnly SameSite-strict token, with Secure enabled for HTTPS inferred from URL/forwarded protocol. Preserve identity/claim policy and trusted forwarded-header handling before any loader/data-cache optimization; possession of first-run UI is not unrestricted admin authorization. [O1]; [O2]; [O3]; [O4].

UI steps start → user/group → setup → finish include local account or external-group recovery, sign-in, studio presets/gutters/colors/locale/analytics, existing-board selection, Docker discovery/grouping/labels, runtime Kubernetes/Workshop probes, integration tests and optional Assistant/MCP/API settings/SQLite restore. Sounds/confetti and smooth studio presentation are UI features, not backend proof. tRPC hooks, NextAuth `signIn`, Next route/page glue and `revalidatePath` must be adapted, while selection/account/claim/board-validation helpers remain reusable. [O1]; [O2].

`completeSetup` is large but contains reusable planning and transaction logic: stable hashed app/integration IDs, discovery labels/selection, integration limits, existing board/item/layout preservation, board/app/widget/integration creation and one conditional setup→finish update/claim removal. Split an input→plan layer from a persistence executor, but do not duplicate board or integration schemas/placement rules. SQLite sync and PostgreSQL async transaction branches must retain equivalent invariants. [O1].

Acceptance obligations:

- Two browsers race for claim; only the accepted owner may set up/restore. Cross-site, expired/revoked claim and finished instance cannot mutate setup.
- Both credential and external-auth/group-recovery paths complete without leaking env secrets into initial HTML/bootstrap.
- Re-selecting an existing board does not create a similarly named replacement or destroy layout/content; stable discoveries do not duplicate on retry.
- Optional capability/test errors are recoverable; selected integrations/apps/widgets have valid bindings/limits and expected ordering/presets.
- Setup transition is atomic and sign-in/finish/home navigation works without Next revalidation.

These are future acceptance obligations; none was executed. Identity owner supplies auth/claim context, board/integration owners supply planning contracts, persistence owner owns transaction execution; this feature batch owns studio flow and orchestration.

## 7. Media, image proxy and icons are three different boundaries

### Media

`mediaUploadSchema` accepts PNG/JPEG/WebP/GIF/SVG with 32 MiB file limit through multipart `File`/zod-form-data. `mediaRouter` has paginated/search listing, upload and deletion: own files by default; all-user listing requires `media-view-all` and opt-in; upload requires `media-upload`; delete permits creator or `media-full-all`. Binary content remains DB-backed with creator/type/size/name and corresponding local icon rows. Preserve batch semantics/IDs/validation and local-icon cleanup. [M1]; [M2].

`/api/user-medias/[id]` is an **unauthenticated binary read**, independently of authenticated listing/upload/delete. It sanitizes SVG using isomorphic-dompurify, hashes sanitized bytes for ETag, supports validator/304, and sets private-no-cache, SVG-compatible sandbox CSP and `nosniff`. Do not “secure” it by casually requiring a session and breaking public boards/branding. Existing URL accessibility and any intended policy change need identity owner's explicit review. Bundling jsdom/DOMPurify on a chosen Node/Bun/native output remains unverified. [M3]; [P3].

### Image proxy

`ImageProxy` returns opaque `/api/image-proxy/{id}` URLs, keeps encrypted URL/headers in Redis for 86,400 seconds and deduplicates via HMAC-derived keys. Forwarding uses trusted-certificate HTTP support and redacted diagnostics. HTTP route returns one-hour public immutable caching, upstream statuses or 502/404 and `X-Homarr-Image-Proxy-Error`. Preserve consumers in Immich/Plex/Gotify/Tracearr and expiry/dedup/credential behavior. It buffers image bytes currently; a streaming optimization is a separate change. [M4]; [M5].

This proxy is **not** the Custom JSX DNS-pinned SSRF executor. They have different trust models and callers. Sharing an HTTP adapter must not silently weaken Custom JSX or block supported LAN/trusted-cert image integrations. Server credentials must never become frontend URL/search params or serialized cache data. [M4]; [C10].

### Icons and UI consumers

Repositories include dashboard-icons, selfhst, SimpleIcons, Papirus, homelab-svg-assets and local media. `findIcons` is public, with normalization/ranking, SVG/local ordering, groups/limits/count and repository metadata including licenses. Fetcher/auto-search/refresh clients are reusable and belong to integration/background owners. Preserve form icon/media pickers, app auto-search, branding/backgrounds, Assistant image previews and exact selected image URLs. Next Image substitutions/assets/CSP are frontend work, not icon-provider replacement. [M6]; [M7]; [A3].

**Independent seam:** binary handlers plus media mutation/selector adapters can be demonstrated without dashboard HTML caching, Custom JSX or Assistant completion; final proof still requires public-board/branding consumers and real multipart/conditional requests through shipping ingress.

## 8. Backup and feature transfer: compatible archives, complete crypto, safe restart

### Current backup contract

- SQLite-only admin export uses snapshot/checkpoint/VACUUM work and downloads ZIP `db.sqlite` + `metadata.json` with version/date/dialect/**encryption key**. Backup is secret-bearing, not a sanitized public export. PostgreSQL is rejected, not silently converted. [B1].
- Restore permits admin or first-run-claim access only at allowed onboarding state. It bounds compressed upload at 256 MiB (multipart allowance adds 1 MiB), database at 512 MiB, archive at 514 MiB, metadata at 1 MiB and optional key entry at 1,024 bytes. It migrates a temporary SQLite DB and custom migrations, performs key conversion, replaces live file, removes WAL/SHM and schedules process exit after 500 ms. The in-process `restoreInProgress` flag is not a multi-worker/distributed restore lock. [B2].
- Browser preview uses JSZip/sql.js, `/api/backup/sql-wasm` and `/api/backup/migrations`, migrations applied to a browser copy, counts and board selection/navigation. Server migration remains authoritative. `findMigrationsFolder` supports packaged `/app/db/migrations/sqlite`; ship SQL files/journal and WASM reliably rather than assuming Next tracing or Nitro public assets will discover them. [B3].
- Production shell supervises the app process; UI polls readiness after restore. A Nitro process exit with no supervisor could leave the installation permanently down. Keep a lifecycle/restart/readiness contract with persistence/packaging owners. [B2]; [P2].

### Concrete cross-feature defect and additional unknowns

`reEncryptSecrets` in `backup/import/route.ts:130-180` selects/updates only `integrationSecret`; the missing-key check at `309-316` counts only that table. Assistant configuration separately encrypts `encryptedApiKey`/`encryptedHeaders`, and Custom Widget secrets separately store encrypted values, including preserved legacy credentials. When restored ciphertext was encrypted under a different key, those features are not converted by this function. This is source evidence of an incomplete conversion path, **not a destructive restore experiment**. [B2]; [A2]; [C5]; [C7].

Required resolution: persistence/identity owners enumerate every encrypted durable field and agree one transactional import-key conversion policy; include Assistant, v2/legacy Custom Widget secrets and any further fields discovered by their crypto inventory. An archive without the old key cannot become acceptable merely because there are zero integration-secret rows. Do not log/serialize imported plaintext or automatically launch paid/external Assistant work to validate secrets.

Other explicit acceptance/decision gates:

- Consistent snapshot and concurrent export isolation: current export temp filename is fixed; race/error/WAL/native-driver behavior was not tested.
- Rejected/oversized/malformed/archive-bomb/invalid-key/migration-failed imports must not replace or corrupt live data; valid imports preserve boards/users/media/custom definitions/thread histories and all encrypted features.
- Stop writes/jobs/connections or otherwise coordinate replacement; process-local locks are insufficient if a cluster preset is selected. Backup/restore/readonly SQLite/native operation compatibility needs observed evidence.
- Match proxy body limit with multipart overhead: nginx's `256M` ceiling may reject a near-maximum valid backup before the application accepts its extra multipart allowance. Record actual ingress limits; do not promise 256 MiB uploads solely from handler constants. [P2].
- Readiness after replacement means initialized DB/required services/auth/navigation, not just a port or static shell; restart timeout/error/recovery UI must remain.
- Whether to retain key-in-metadata exports, introduce additional archive confidentiality, or change restore quiescing is a human security/product decision, not a library migration side effect.

Custom JSX portable transfer, Workshop installs/CSS drafts and Assistant conversation exports are separately inventoried above. A successful SQLite backup does not prove their import/export UX or portability, and the SQLite feature does not promise whole-volume Redis/certificate backup. Preserve those scopes explicitly. [C7]; [W3]; [A3]; [B1].

## 9. Operational tools, notifications, About and PWA

Operational pages below `manage/tools` include application logs/history/live levels with Redis transport and client-only xterm terminals; tasks list/trigger/interval/enable/status; Docker inventory/actions/logs/discovery/reconciliation; Kubernetes contexts/cluster/namespaces/nodes/pods/services/ingresses/volumes/configmaps/secrets; certificate upload/trusted hostnames; API-key/MCP/Scalar tools. Update-checker and analytics routers/settings also remain. Preserve disabled Docker/Kubernetes mode and secret-read permissions rather than rendering all data through a public ops service. [T1]; [T2].

This feature inventory proposes an **ops UI adapter batch**, not moving every operational backend into extended-feature ownership. Endpoint owner ports subscriptions/error/abort; persistence owner ports histories/task lifecycle; identity owner ports cert/settings/key/secret authorization; integrations owner ports Docker/Kubernetes clients/discovery. UI owner must still deliver pages, filtering/actions/confirmation/terminal resize/unmount/stream cleanup and reloading status. Backend parity without the page is incomplete.

`packages/notifications` is a Mantine transient success/error/warning wrapper, not a notification database, OS push subsystem or Gotify integration. Assistant waiting/completion/error state is separate and shared across surfaces; Custom JSX already has a `notify` port. Reuse these with one root provider. Gotify widgets/integration remain the widget/integration owners' work. [N1]; [A3]; [C2].

`/manage/about` reads package version/dependency catalog and static contributor/sponsor/translator aliases, with Next Image/metadata coupling. `/api/about/contributors/{github,crowdin,opencollective}` and `/api/about/dependencies` are additional endpoint-owner entries. Preserve version source/build exports, aliases, license/contributor display, external links and keyboard/language information; do not replace them with an empty About route. [U1].

Dynamic `manifest.ts` uses branding name/primary color/logo/favicon with maskable fallback `/images/pwa/{192,512}.maskable.png`. `/sw.js` only installs/activates/claims clients: it does **not** currently implement offline caching or push. Keep registration/scope/update/security headers and public image/assets, adapting Next MetadataRoute to HTTP manifest/link generation. Claiming an offline/push migration would invent a feature. Preserve CSP blob worker/media allowances, service-worker headers, viewport `Accept-CH`, trusted-host/public URL config and well-known rewrites with frontend/identity/endpoint owners. [U2]; [U3]; [P3].

## 10. CLI and shipping runtime contracts

### Application CLI (`packages/cli`)

Current command families: `users list/delete/update-password`, `integrations list/delete`, `reset-password`, `fix-usernames`, `recreate-admin`, and `harness`/`local-harness` tooling for build/run/setup/port/stop. Domain commands directly use DB/auth/crypto; they do not need oRPC or a running Nitro HTTP server. Preserve flags/selection/output/exit codes and permission/credential algorithms, while extracting Next-bound auth imports only where necessary. [L1]; [L2].

`src/index.ts` detects harness invocation and lazily loads other commands; this intentionally avoids initializing DB/env for harness-only usage. Keep that property. CLI build bundles Node CJS through esbuild/brocli and has native/external module obligations; Docker publishes `/usr/bin/homarr` invoking the Node CLI and copies a SQLite binding/migrations. Changing the web server entry does not regenerate those artifacts automatically. [L1]; [L2]; [P1].

### Go developer CLI (`tools/homarr-dev`)

It is an external consumer/tool, not a Next app feature engine to rewrite: local/remote PR images, build provenance/rebuild, Docker API/CLI/GitHub CLI, task/CI views, open/run/data/log/shell/stop/restart/remove/doctor and TUI workflows remain useful. Preserve labels `org.homarr.dev.source`, `org.homarr.dev.revision`, `org.homarr.dev.pr`, port 7575, `/appdata`, stable encryption key and demo/env behavior. Adapting launch/health metadata is packaging work; `remove` and real-data operations are acceptance scenarios for a future authorized disposable environment, not actions performed during research. [L3].

### Image, ingress and process lifecycle

Current `Dockerfile`, `entrypoint.sh`, `run.sh`, nginx config and instrumentation jointly define PUID/PGID, `_FILE` secrets, CA/certificate ownership, migrations before startup, Redis internal/external mode, IPv4/IPv6/forwarded headers, body ceiling, WebSocket path and restart/cleanup. Current Node app initialization also starts tasks/WebSockets. None can be dropped because Nitro builds standalone output. Keep Node 24 baseline until a separately approved runtime choice validates native SQLite/auth/DOMPurify/SSH/etc. [P1]; [P2]; [P3]; [L2].

Packaging acceptance must include CLI invocation, SQL/WASM/native resources, first startup/migrations and already-migrated restart, trusted certificate usage, restored DB restart, signals/cleanup and real Assistant/subscription streaming through ingress. Existing nginx buffering/read-timeout behavior and Nitro disconnect propagation were not tested. `maxDuration` copied from Next is not proof of a ten-minute stream through nginx. No image/RAM/performance savings are asserted.

## 11. Contract-first parallel implementation proposal

These are future independently demonstrable batches after coordinator/spec approval, not work launched here. Each worker writes feature-local files only. Shared interface authors agree return/error/identity/signal/invalidation semantics first; fake ports/fixtures let local UI/engine work proceed before production transport/store implementations.

| Batch / exclusive write scope | Can demonstrate before other features finish | Genuine integration blockers |
| --- | --- | --- |
| E1 Assistant provider/history services: `assistantRouter` extraction, codecs/model/config/domain types | Model/config validation and owned parent-ordered conversation CRUD against agreed repository/auth ports | Identity context and crypto/storage contract; production oRPC registration by endpoint owner |
| E2 Assistant chat engine/Fetch adapter: chat helper directory, service/tool orchestration | Incremental full UI-message stream, cancellation and mock curated tool approval/denial independent of full management UI | E1 contracts, coherent SDK resolution; endpoint curated ToolCatalog/Executor and HTTP mount; real tools need their domain owners |
| E3 Assistant UI/runtime: Assistant components and feature-local browser adapters | Panel/widget-like/Spotlight surfaces share run/history but keep distinct composers against stream/history fixtures | E1/E2 contracts, frontend auth/router/i18n/Query/provider ports; registry integration owned by widget worker |
| E4 Custom JSX protected services: server executor + preview/limits/configuration services and API wrappers | Deterministic safe query, simulated action, revision/evidence/expiry/limit scenarios through injectable stores | Identity/source resolution/trust + Redis CAS/Lua adapters; no whole dashboard dependency |
| E5 Custom JSX definition/transfer services: CRUD/secret/stored-definition/import/legacy modules | Portable export/import/duplicate/legacy same-ID replacement against schema/repository/crypto fixtures | Storage transaction and secret policy; E4 final-revision evidence for preview-origin saves only |
| E6 Custom JSX UI adapters: runtime/workbench/management/configuration pages | Workbench diagnostics/query/simulation/journal and runtime render via existing ports without Assistant | E4/E5 contracts, frontend provider/modal/i18n; widget owner alone owns `customApi` placement/registry bridge |
| E7 Workshop Homarr client/UI: `packages/workshop`, Workshop/publish/CSS components | Browse/detail/review/import and CSS-draft flow against fixture backend; shared-package export compatibility | E5 local import contract; public runtime URLs/router; real popup/publish/token/quota acceptance needs origins/security. E2 consumes provider token; no E2 dependency for browsing |
| E8 Onboarding studio/planner: onboarding UI/helpers and setup orchestration | Claim/account/setup/finish with fake discovery/planner/persistence responses; deterministic selected-board plan | Identity claim/sign-in; board/widget/integration contracts; atomic persistence executor. No dependency on finished Assistant UI for optional config fields |
| E9 Media/proxy/icons adapters: handlers/feature management/forms | Multipart validation/read/sanitized SVG/304, opaque proxy errors/expiry, selector/local icon mapping independently | Storage/trusted HTTP/crypto, endpoint body/auth/error policy, frontend images; icon background registration belongs persistence owner |
| E10 Backup/restore: backup service/browser preview/HTTP wrappers | Archive validation/browser preview/assets and temporary-DB preparation in future isolated fixtures | **All encrypted fields policy**, migration/native/file ownership, live replacement quiescing and restart/readiness, E8 claim adapter; cannot claim restore done before packaging |
| E11 Ops/About/PWA UI: tools pages, notifications integrations, About/manifest/static client hooks | Terminal/UI/status fixtures, dynamic branding manifest/About data rendering independent of feature engines | Operational clients/subscriptions/settings/identity; central asset/headers registration and packaging owner required |
| E12 CLI/packaging compatibility: CLI artifact/entry contract and shipping assembly, developer CLI consumer checks | CLI help/lazy harness and fake runtime launch contract before full app; resource-manifest review | Persistence/auth/native ABI and E10 restart obligations; final image/global startup owned by designated packaging single writer |

High-leverage early parallel groups: E1/E4/E5/E8/E9/E11; then E2/E3/E6/E7 via frozen contract stubs. E10 browser/archive work and E12 artifact inventory can proceed early, but authoritative restore acceptance waits for reconciled crypto/lifecycle. An edge blocks **integration or acceptance**, not necessarily porting every local file.

### Single-writer registrations and shared interfaces

| Central file/responsibility | Single writer | Inputs from feature workers |
| --- | --- | --- |
| New Nitro route registration, oRPC root/public REST/OpenAPI, curated MCP tools/resources/prompts and context/error mapping | Endpoint/transport owner | Feature routers/Fetch handlers, schemas/status/protocol metadata, curated tools and resource payloads; never competing catch-alls |
| Auth/onboarding claim/session/API key adapter and sensitive settings policy | Identity owner | Feature authorization obligations; separate Workshop token identity |
| DB schema/migrations/encrypted-field conversion, Redis stores/locks/jobs/shutdown hooks | Persistence/background owner | Feature repository/store interfaces and cache/invalidation/revision requirements |
| Router tree/root providers/navigation/public Workshop config/i18n/image/modal/notification/client-only boundaries | Frontend owner, with navigation owner for management links | Lazy feature screens plus loader/query/mutation requirements |
| Widget/board placement/options/loaders and app/integration definitions/factory | Widget/dashboard/integration owners respectively | Custom JSX and Assistant components/ports; onboarding plan records; native tool review adapters |
| Dockerfile/entrypoint/startup/native/assets/readiness/restore restart | Explicit packaging owner, not yet assigned in shared table | E9 media trust, E10 restore, E12 CLI and all stream/asset contracts |

Freeze these shared responsibilities, not a giant new abstraction: request identity/claim + permissions; repository/crypto + transaction; signal-aware trusted HTTP; typed domain error mapping; curated tool execution with approval; runtime public URL config; navigation + native review/modal/notification/invalidation; binary/stream `Request → Response`; lifecycle readiness/restart. Preserve existing public Custom JSX ports and schema entrypoints wherever possible.

## 12. Acceptance gates, human decisions and explicit unknowns

### Required cross-feature acceptance ledger

Feature completion requires observed allowed **and denied/error** behavior, durable side effects and external contracts—not merely typecheck, a route response, a fake implementation mount or the existing playable board fixture.

1. **Existing-data preservation:** representative legacy/v2 Custom JSX definitions/placements/secrets, Assistant config/thread branches/messages, media/icon URLs, onboarding state and board selections survive deployment/restart. No automatic format/ID/key changes.
2. **Security isolation:** anonymous/public-board and authenticated/admin cases, revoked/expired identity/claim/token, board/request permissions, secret redaction, SSR/bootstrap separation, DNS/redirect/size policy, approval-denial and expired/stale preview/configuration state.
3. **Transport/UX:** streaming text/reasoning/sources/tools/metadata and cancellation; thread persistence/branch navigation; independent composer surfaces; human review/ask-user/refresh; multipart/binary/cache/error responses; reconnect/unmount cleanup and complete translated tools pages.
4. **External services:** Workshop browser and server install paths, popup auth/callback/file URLs/publish/vote/report, hosted provider exact token destination/quota, docs index/Markdown resources, Custom JSX HTTP/MCP schemas/catalog/prompts.
5. **Restore/recovery:** old/new key including every encrypted feature, missing/wrong key, bad archive/limits/migrations, concurrent restore/export, rejected import preserving live DB, quiescing/restart/readiness and UI completion; SQLite-only/unsupported DB behavior retained.
6. **Packaging/CLI:** application CLI/recovery/harness lazy invocation, developer CLI local/PR/provenance/run contracts, native architectures/runtime dependencies, migrations/WASM/static/PWA/About resources, `_FILE`/PUID/PGID/trust/forwarded headers/internal-external Redis/signals.

Existing specs under Assistant chat/UI, Custom JSX `src/test`, Workshop/onboarding, and backup routes are useful later regression evidence. They were inspected selectively, not run; they do not prove Nitro integration. No speculative new test files are proposed by this research.

### Human/coordinator decisions still needed

- Confirm library/version strategy after reconciling the observed local AI package skew and version-sensitive assistant-ui internals. Keeping these libraries is recommended initially, not mandatory; replacement must preserve wire/storage/surface behavior.
- Assign ops UI/About/PWA and production packaging/supervision owners. There is no complete shipping owner in the shared area table.
- Decide default runtime/process topology and whether nginx stays; cluster mode changes restore locks, singleton jobs and in-memory state. Do not attribute topology changes to oRPC alone.
- Agree backup secret confidentiality/export policy, complete key-conversion coverage, quiescing/restart/recovery guarantees and accepted old archive formats.
- Agree production browser/SSR boundaries for Assistant, CodeMirror, xterm, browser SQL and Workshop auth; SSR is not a reason to share browser token state server-side.
- Approve deployment origins/public URL/callback/CSP policy and any deliberate change to anonymous media URL accessibility. Existing public-board behavior is baseline until explicitly changed.

### Unverified, not blockers to research

Pinned Nitro/oRPC integration with the complete feature services; production AI SDK/assistant-ui dependency resolution; undici DNS-pinned dispatchers/custom CAs on selected Node/Bun output; jsdom/DOMPurify/native SQLite/auth/CLI bundling across architectures; multipart memory/body ceilings; ingress SSE timeout/buffering and upstream/client abort; WS/terminal cleanup; SQL WASM/migration/static alias inclusion; live backup snapshot/races/key conversion/DB replacement/supervisor readiness; real Workshop popup/publish/provider network behavior. No performance/RAM claim or complete runtime compatibility follows from this note.

## Source index

Source links below are checkout evidence; named symbols/limits in the sections identify the owning implementation. Live official pages are protocol guidance, not a pinned-version Homarr execution certificate.

[A1]: ../../apps/nextjs/src/app/api/assistant/chat/
[A2]: ../../packages/api/src/router/assistant.ts
[A3]: ../../apps/nextjs/src/components/assistant/
[A4]: ../../packages/api/src/mcp-tools.ts
[A5]: ../../packages/definitions/src/assistant.ts
[A6]: ../../packages/api/src/mcp.ts
[A7]: ../../apps/nextjs/src/app/api/mcp/_extract-tools.ts
[A8]: ../../apps/nextjs/src/components/assistant/assistant-conversation-export.ts
[C1]: ../../packages/custom-widgets/package.json
[C2]: ../../packages/custom-widgets/src/runtime/types.ts
[C3]: ../../packages/custom-widgets/src/workbench/ports.ts
[C4]: ../../apps/nextjs/src/components/custom-widgets/
[C5]: ../../packages/api/src/router/custom-widget/
[C6]: ../../packages/api/src/router/widgets/custom-api.ts
[C7]: ../../packages/custom-widgets/src/core/import.ts
[C8]: ../../apps/nextjs/src/app/api/custom-widgets/%5Bresource%5D/route.ts
[C9]: ../../apps/nextjs/src/app/api/custom-widgets/configuration-request/
[C10]: ../../packages/custom-widgets/src/server/
[C11]: ../../packages/custom-widgets/src/jsx/
[C12]: ../../packages/custom-widgets/src/core/assistant-execution-policy.ts
[W1]: ../../packages/workshop/src/backend.ts
[W2]: ../../packages/workshop/src/schema.ts
[W3]: ../../apps/nextjs/src/components/workshop/
[W4]: ../../apps/workshop/
[W5]: ../../apps/docs/src/components/custom-widget-code-client.tsx
[O1]: ../../packages/api/src/router/onboard/onboard-router.ts
[O2]: ../../packages/onboarding/src/
[O3]: ../../apps/nextjs/src/app/api/onboarding/claim/route.ts
[O4]: ../../apps/nextjs/src/app/%5Blocale%5D/init/page.tsx
[M1]: ../../packages/api/src/router/medias/media-router.ts
[M2]: ../../packages/validation/src/media.ts
[M3]: ../../apps/nextjs/src/app/api/user-medias/%5Bid%5D/route.ts
[M4]: ../../packages/image-proxy/src/index.ts
[M5]: ../../apps/nextjs/src/app/api/image-proxy/%5Bid%5D/route.ts
[M6]: ../../packages/api/src/router/icons.ts
[M7]: ../../packages/icons/src/
[B1]: ../../apps/nextjs/src/app/api/backup/export/route.ts
[B2]: ../../apps/nextjs/src/app/api/backup/import/route.ts
[B3]: ../../apps/nextjs/src/components/backup/use-backup-analysis.ts
[T1]: ../../apps/nextjs/src/app/%5Blocale%5D/manage/tools/
[T2]: ../../packages/api/src/router/
[N1]: ../../packages/notifications/src/index.tsx
[L1]: ../../packages/cli/src/index.ts
[L2]: ../../packages/cli/package.json
[L3]: ../../tools/homarr-dev/
[P1]: ../../Dockerfile
[P2]: ../../scripts/run.sh
[P3]: ../../apps/nextjs/next.config.ts
[U1]: ../../apps/nextjs/src/app/%5Blocale%5D/manage/about/page.tsx
[U2]: ../../apps/nextjs/src/app/manifest.ts
[U3]: ../../apps/nextjs/public/sw.js
[D1]: ../../package.json
[D2]: ../../node_modules/ai/package.json
[D3]: ../../node_modules/@assistant-ui/react-ai-sdk/package.json
[D4]: ../../node_modules/@assistant-ui/react-ai-sdk/src/ui/adapters/aiSDKFormatAdapter.ts
