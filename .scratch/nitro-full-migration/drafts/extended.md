# Extended-feature vertical ticket draft

Planning only; 34 provisional tickets, not published, approved, agent-ready or dispatched. This draft owns feature-local extended surfaces only. It does not authorize source changes, checks, runtime probes, data operations or edits to other planning artifacts.

## Policy, evidence and ownership

Target: Nitro v3 + Vite/React + TanStack Router + direct oRPC. The Nitro application is the sole application build gate. Old Homarr URLs, APIs, CLI signatures and serialized formats may change; no compatibility adapter or simultaneously buildable Next app is required. Preserve capabilities and durable content through explicit, recoverable conversion, including relationship/reference remapping when IDs or formats change. Source recommendations to retain exact archive layouts, route redirects, CLI flags or format labels are superseded by this policy. External Workshop/PocketBase and docs services remain excluded runtimes: their *actual currently supported remote protocols* are dependencies, not permission to modify those services.

Evidence read: `to-tickets` guidance; `TICKET-DRAFTING.md`; `DESIGN.md`; completed `research_notes/Homarr full Nitro migration/extended-features.md`; cross-owner identity, persistence, localization, dashboard/navigation and integration notes. Existing endpoint research supplies names for coverage, not an independently repeated census. Additional read-only tour/management/certificate source inspection supplies the gaps not enumerated in the extended note. Research paths and historical route names below belong to the coverage ledger, not implementation instructions.

Each ticket owns its feature-local service/orchestration, authorization at the capability boundary, endpoint descriptor/handler/client adapter, screen/component and focused verification. Central composition is delivered by the designated single writer. A contract fixture can demonstrate a runnable target slice before a peer finishes; fixture-only behavior does not satisfy a production integration gate. No production-mounted fixture principal, fake admin, no-op permission or fake-success service is permitted.

**Single writers outside this draft:** database engines/schema/migrations/crypto primitives/maintenance replacement and generic lifecycle belong to PERSISTENCE; coordination backends/atomics/jobs/fanout to COORDINATION; authentication, account/group services, principal policy, sessions, API-key authority and shared settings to IDENTITY; root router/providers/catalogs/modals/notification infrastructure/assets/head to the frontend integrator; root Fetch/oRPC/OpenAPI/MCP/stream registration to TRANSPORTS; widget registration/options/placement/board services to widget/dashboard owners; provider clients/integration factory and connection-test UI to integration owners. Feature-local contributions are exported to these owners, never concurrently registered in shared files. Lockfile, manifests, package exports and container/launcher assembly each need one explicitly assigned integrator.

**Decision dependencies, not fictitious tickets:** D-TOPOLOGY (singleton/replicas/workers, ingress and supervision); D-IDENTITY (real auth implementation, session continuity, public origin/cookie/CSRF policy); D-LIBRARIES (AI SDK/assistant-ui coherence and browser/SSR boundaries; other replacement libraries); D-DATA (target durable engine/portability, supported conversion frontier and recovery); D-BACKUP (archive confidentiality/key carriage and restart/quiescing guarantees); D-UX (interaction redesign, management navigation, tour behavior and anonymous media delivery policy). These block only the affected final implementation choice or production proof, not every feature's contract-fixture work. The current AI catalog/install skew and assistant-ui private composer internals are unresolved evidence, not a chosen library solution.

### Minimal prerequisite contracts

| Seam | Exact feature-facing contract required to start | Final integrated gate, not a start blocker |
| --- | --- | --- |
| FOUNDATION / IDENTITY | Request-local principal and safe UI projection; current named permissions/resource ownership; demo mode; separate validated setup capability; trusted public origin; abort signal; deny-by-default unavailable production resolver | Real sign-in/session revocation, claim races, deployment headers/origins, anonymous/authenticated/admin cases |
| PERSISTENCE | Authorized feature repositories with durable IDs/parent/reference mapping, transaction commands, private encrypted-field references, conversion inventory and error/result shapes | Real chosen-dialect durability/conversion/restart; no lost content or incorrect deletion |
| COORDINATION | Preview revision CAS/evidence/TTL, user-token claim/lock, request rate/concurrency, image mapping and ordered log/keyed task streams; disposal ownership | Chosen-topology atomic behavior, cleanup/reconnect, restore invalidation/epochs |
| TRANSPORTS | Feature descriptor and domain-error mapping; native signal-aware `Request → Response`; multipart/binary/AI stream support; curated authorized ToolCatalog/Executor with approval continuation | Central registration, actual client framing/cancellation, ingress limits/timeouts, external MCP/OpenAPI capability exposure |
| LOCALIZATION / frontend | Safe locale/settings/session snapshot; typed navigation/search, Query/loader invalidation, client-only loading, confirmation/modal and notify adapters; feature screen registration | Real root order/hydration/RTL/translations/accessibility; no cross-principal cache or duplicate replay |
| BOARD-/WIDGET-/INTEGRATION-RUNTIME | Authorized board mutation/placement and invalidation commands; widget descriptor/renderer port; integration full/use/interact policy, source resolver and trusted HTTP port | Real placement/permission/provider behavior, credential/trust changes and all named consumers |
| ASSETS / packaging | Binary/static asset descriptors, safe image selection, build metadata, readiness/restart and CLI launch/artifact contracts | Shipping resources/native ABI/supervisor/signals/volume ownership and public-board consumers |

## Assistant — 5 tickets

### ASSISTANT-01 — Configure providers and select usable models

**Delivery/demo:** An administrator configures an Assistant connection, tests discovery or enters manual models, enables it, and a permitted user sees safe runtime choices. Own configuration domain services, feature procedures and Assistant management UI; not external integration provider implementations or the shared secret engine.

**Coverage:** provider presets `homarr`, `openrouter`, `openai`, `anthropic`, `google-gemini`, `xai`, `groq`, `mistral`, `deepseek`, `together`, `ollama`, `lm-studio`, `llama-cpp`, `custom`; local/custom URLs, headers, OpenRouter options, discovery/manual-model settings, enablement, context-entity/model-capability/runtime projections. Public protocol capability is an OpenAI-compatible provider connection, not an assumption that every vendor label implements every upstream feature.

**Start prerequisites / blocked by:** FOUNDATION principal/secret/repository contracts; agreed provider descriptor and invalidation interface. D-LIBRARIES blocks selecting an incoherent SDK combination, not management validation with fixtures. No dependency on finished chat or Workshop sign-in.

**Integrated gate:** real IDENTITY/PERSISTENCE/TRANSPORTS, provider timeout/cache adapter and WORKSHOP-04 for the hosted-provider choice; all other provider families remain independently usable.

**Acceptance:**
1. Target management flow round-trips every named preset and durable connection/model setting; rejected discovery has bounded timeout and recoverable manual fallback rather than erasing configured content.
2. Admin-only writes and safe authenticated availability/runtime/model/context queries are enforced server-side; no API-key/header plaintext appears in HTML, browser state, responses or diagnostics.
3. Retain/clear credentials deliberately: destination changes clear incompatible bindings and disable selection; explicit clearing and safe configured flags work, including custom headers.
4. Available model capabilities control attachment/web-search/context choices and reject invalid selections on both client and server; focused validation covers denial, discovery failure and credential-binding changes without paid model calls.

### ASSISTANT-02 — Own conversations, branch history and diagnostic exports

**Delivery/demo:** A user creates, renames, switches and deletes owned conversations, navigates persisted branches after reload, selects a per-thread model, inspects generation metadata and submits feedback or exports a diagnostic conversation. Own history services/codec adapter and history/export/telemetry UI; stream generation and multi-surface composer state are other tickets.

**Coverage:** Assistant thread/message parent relationships, stored rich message parts, local IDs, append/update/delete effects, telemetry, feedback, conversation Markdown copy/download and redaction. Existing `ai-sdk/v6` persisted content is a conversion input even if the target format changes.

**Start prerequisites / blocked by:** agreed owned conversation repository, message codec/conversion and runtime-model contracts from ASSISTANT-01; request identity and feature navigation/invalidation. Contract availability, not completion of ASSISTANT-01's entire UI, is required.

**Integrated gate:** durable repository/explicit old-content conversion, selected SDK/client history adapter and ASSISTANT-03 real finished turns.

**Acceptance:**
1. Converted representative histories retain branches/parent ordering, rich tool/source/approval parts, timestamps, ownership and selected model; restart/reload reconstructs history rather than flattening it.
2. Foreign thread/message IDs are denied/not found for read, rename, append, delete, telemetry and feedback; demo-writable conversation policy does not grant ordinary administrative access.
3. Thread lifecycle, branch navigation, partial message updates/deletions and model changes refresh only the correct user/thread state; failed writes remain visible and retryable without duplicated content.
4. Exports retain branch/tool/source/approval diagnostics with bounded built-in secret/token/URL/data-URL redaction, clearly not a guaranteed confidential-content sanitizer or an import format; focused old-history/ownership/export regressions cover these obligations.

### ASSISTANT-03 — Run incremental multimodal turns in the chat panel

**Delivery/demo:** In one usable target chat panel, an authenticated user sends text and supported attachments, sees incremental text/reasoning/sources/files/tool/metadata state, stops a turn, handles failure and reloads its saved messages. Own chat request/turn orchestration, native stream handler descriptor, panel/composer/message renderer and attachment adapter; tool policy/catalog is consumed, not recreated.

**Coverage:** AI SDK UI-message SSE with the chosen coherent client contract: semantic text/reasoning/source/file/tool/approval/step/error/abort events, terminal marker/metadata and incremental delivery. The present protocol uses `x-vercel-ai-ui-message-stream: v1` and `[DONE]`; if replaced, both target client/server and existing-history conversion must preserve semantics. oRPC async-iterator text is not equivalent by itself.

**Start prerequisites / blocked by:** ASSISTANT-01 model/credential/capability contract; ASSISTANT-02 history persistence contract; curated ToolExecutor contract; signal-aware Fetch mount and root UI ports. D-LIBRARIES must settle exact SDK/client compatibility before production stream implementation. Tool fixtures permit work before all tools or external MCP are finished.

**Integrated gate:** real stream ingress/abort/SDK, durable history writes, real auth and ASSISTANT-04 tools; WORKSHOP-04 only for hosted execution.

**Acceptance:**
1. Observe separate arriving semantic events and saved final/partial states, not a buffered final response; reasoning, sources, errors and terminal usage/timing/context metadata survive UI and history.
2. Enforce bounded inputs on both sides: baseline 12,000,000-byte body, 200 messages/parts, 16 browser tools, five attachments, 1,000,000-byte image and 350,000-byte text/JSON limits; model-incompatible images are rejected and text attachments remain tagged content.
3. Stop/disconnect, early/late upstream failure and slow-reader scenarios terminate resources and represent interrupted turns correctly; no automatic repeated paid turn or hidden tool mutation follows an ambiguous failure.
4. Preserve application turn deadlines/step bounds through the service, not a copied Next duration setting; targeted stream/abort/oversize/ownership cases run only in later authorized disposable fixtures.

### ASSISTANT-04 — Review and execute curated tools with safe continuations

**Delivery/demo:** A chat turn requests a native app/board/widget change or human answer; the user reviews/approves or denies it, sees resulting authorized changes and refreshed context, and can use permitted docs/integration research and Custom JSX authoring tools. Own Assistant-side execution policy, approval/continuation and browser/native review components; native domain mutations, external clients and Custom JSX authoring persistence remain their primary owners.

**Coverage:** lazy curated tool groups; shared MCP-authorized ToolCatalog/Executor; browser allowlists; ask-user; app creation/review, board settings and widget review forms; same-origin navigation; integration research; bounded docs index/Markdown search; Custom JSX authoring-controller consumer; tool tracing/redaction.

**Start prerequisites / blocked by:** tool descriptor/execution/approval contract from TRANSPORTS, native domain command/review/invalidation interfaces, ASSISTANT-03 turn contract. CUSTOM-04 authoring contract is needed only for those tools. Approval key-reference contract comes from secret authority. No start dependency on the entire MCP OAuth host or every provider/widget.

**Integrated gate:** real native services/permission policy, Custom JSX final-revision evidence, shipping approval/abort behavior and docs external-connection policy.

**Acceptance:**
1. Default autoapproval remains off; approval material is bound to trusted encryption-key derivation or an explicitly reviewed replacement. Continuation is bounded to the right conversation/request, and denial stops the turn without denied mutation or automatic retry.
2. Server permission/resource checks remain authoritative after approval, including admin-only Custom JSX, integration scope and board/widget placement; an extracted/internal tool path cannot bypass the shared executor.
3. Human review/ask-user, same-origin navigation, lazy discovery and resulting domain/cache refresh work end-to-end with sanitized errors; no unapproved browser tool or foreign-origin navigation is accepted.
4. Docs consumes the remote `llms.txt` and docs Markdown capabilities with bounded searches/timeouts/no redirects and `NO_EXTERNAL_CONNECTION` enforcement; authoring turns enforce 40 steps/two retries/32,768 output tokens/600-second total/240-second step/90-second tool bounds or reviewed equivalents.
5. Focused denied/expired approval, cancelled tool, stale authoring evidence and no-external-search regressions demonstrate no side effects; no broad provider suite or real paid calls are required.

### ASSISTANT-05 — Share one run across independent chat surfaces

**Delivery/demo:** Floating panel, board Assistant widgets and Spotlight can show the same conversation/run while their drafts, attachments, focus and selection stay independent; feedback/export/speech and waiting/completion/error notifications work without duplication. Own feature surface-runtime adapters and Assistant surface integrations; widget kind registration/placement and Spotlight/root composition are single-writer consumers.

**Coverage:** shared messages/run/history, bounded inactive composer cache, model/preferences/selection, tool rendering and human-question portal ownership, Markdown/directives/images, copy/download and browser speech synthesis; Assistant-specific notification state, not the shared notification framework.

**Start prerequisites / blocked by:** ASSISTANT-02/03/04 history/turn/tool contracts; widget render-slot and Spotlight feature-registration contracts; root client-only/session/notification ports. D-LIBRARIES blocks reliance on incompatible private assistant-ui composer APIs; a public replacement must satisfy the same behavior, not preserve old implementation internals.

**Integrated gate:** real panel + multiple board widgets + Spotlight in the target shell, real identity/history/stream, finalized composer library and root notification integration.

**Acceptance:**
1. A turn begun in one surface appears in all attached surfaces, yet typing/attachments in another surface does not mirror drafts or start duplicate runs; inactive composer state remains bounded (current cache limit 12 unless reviewed).
2. Switching conversations/model/preferences, pending approval and history selection retain the correct run without stolen focus/scroll or duplicated ask-user portals.
3. Copy/export, feedback, speech start/stop and rendered tool/source/directive/image content work in the applicable surfaces; missing browser speech degrades safely.
4. Exactly one logical waiting/completion/error signal is emitted for a shared run; unmount/hydration/reconnect neither drops terminal status nor replays notifications. A focused shared-surface regression covers drafts and duplicate runs/signals.

## Custom JSX — 6 tickets

### CUSTOM-01 — Manage and transfer portable definitions

**Delivery/demo:** An administrator lists, creates, edits, enables/disables, duplicates and deletes definitions, imports reviewed JSON/Markdown and exports portable content for sharing/publishing. Own definition CRUD/transfer service, procedures and list/new/edit/transfer UI. Protected execution, source secrets, preview-origin save and legacy conversion are separate domain slices.

**Coverage:** definition schemas/options/template/sources/requests/creator/enabled/version state; direct authorized form CRUD; JSON/Markdown portability; imported deployment bindings/source-review warnings; safe duplicate/delete effects on dependent placements.

**Start prerequisites / blocked by:** definition repository/transaction/validation and admin/secret-policy contracts; feature forms/navigation/invalidation. Existing schema/core is reusable; no dependency on a functioning Assistant or full dashboard.

**Integrated gate:** real durable conversion, CUSTOM-05 secret-retention policy, CUSTOM-06 runtime consumers and WORKSHOP-01/02 local import/export paths.

**Acceptance:**
1. List/new/edit/enable/duplicate/delete and error/retry flows reach authorized services and durable storage; stale/invalid updates do not corrupt definitions or silently discard referenced content.
2. Portable JSON/Markdown exports exclude local integration IDs and secret values; imports require source/binding review and validated limits, assigning local identity independently of a remote submission.
3. CRUD retains creator/version/enabled/options semantics and refreshes placement eligibility; direct admin form/import saves remain valid without pretending all saves need preview evidence.
4. Old v2 definitions/options/templates and transfer content are explicitly converted if target format changes; focused denied CRUD, transfer redaction and failed import cases show durable content unchanged on rejection.

### CUSTOM-02 — Convert legacy definitions without losing placements or credentials

**Delivery/demo:** An administrator identifies a legacy Custom Widget, exports its recoverable v1 content/secret kinds, obtains a migration brief, reviews a validated replacement and resumes existing placements. Own legacy conversion workflow/service/UI; not shared SQL migration infrastructure or the JSX engine.

**Coverage:** legacy definition/secret rows, migration prompt, v1 export, validated v2 replacement, enabled/creator/creation state, placement identity/reference mapping and compatible credential reuse versus explicit replacement.

**Start prerequisites / blocked by:** CUSTOM-01 definition/transfer and CUSTOM-05 binding/crypto-reference contracts; PERSISTENCE conversion transaction and reference-map contract; approved D-DATA preservation frontier.

**Integrated gate:** converted legacy/v2 durable content and live CUSTOM-06/widget placement, complete DATA-04 encrypted-field inventory. Existing ID may be preserved or explicitly remapped; silent dangling placements are forbidden.

**Acceptance:**
1. Legacy recovery/export remains accessible rather than deleting unreadable rows; export contains configured secret kinds but not values.
2. Replacement validates target schema and applies atomically, preserving definition/placement relationships and enabled/creator/creation state; failed/concurrent conversion leaves original content recoverable.
3. Legacy-specific origin/auth/header compatibility controls ciphertext retention; explicit replacements work and incompatible credentials are cleared/re-requested, never broadly reused.
4. Existing placements resolve the replacement after restart, or show a deliberate migration-required state until converted; focused conflict, wrong-origin secret retention and reference-remap cases cover this boundary.

### CUSTOM-03 — Author interactively with revision-safe preview and action simulation

**Delivery/demo:** An administrator edits a definition in the workbench, gets completion/diagnostics/response tree, runs cancellable query previews, inspects journals and simulates actions; explicitly enabling live actions and confirmation executes only permitted requests. Own workbench/preview lifecycle domain adapter, procedures and preview screen. Shared coordination implements atomics, and CUSTOM-04 owns preview-origin final save.

**Coverage:** `CustomWidgetWorkbenchPort.preview`, `queryPreview`, `simulateAction`, `setLiveActions`, `readJournal`; preview creation/revision/get/refresh/query/live-toggle/journal/action; source setup dialogs; final-revision query/action evidence and failure recovery.

**Start prerequisites / blocked by:** revision CAS/TTL/journal/evidence and request-limit contracts from COORDINATION; definition/source/executor contracts from CUSTOM-01/05/06; frontend CodeMirror/client-only/form/modal ports. Contract fixtures allow work before production Redis/transport is finished.

**Integrated gate:** real atomic stores, protected executor/credential authorization, workbench hydration and CUSTOM-04 evidence consumer.

**Acceptance:**
1. Workbench/new/edit/preview shows coherent diagnostics, completion, response trees, cancellation and journal updates through authorized adapters; browser-only editor code does not execute on the server.
2. Preview revision changes invalidate old evidence; user/session ownership, TTL, rate/concurrency and stale-write rejection are enforced server-side, not inferred from a disabled button.
3. Actions default to simulation; live/destructive execution requires explicit enabling/confirmation and current permissions. Cancel/expiry/upstream error cannot produce successful evidence or leak injected credentials.
4. Query/action evidence is revision-specific and journals show safe failures without automatic retry after an unavailable upstream; focused stale-revision, expired preview and simulated-versus-live cases validate the slice.

### CUSTOM-04 — Expose bounded authoring protocols and evidence-gated saves

**Delivery/demo:** An administrator or authorized authoring client discovers schema/components/examples/references, validates or patches templates, previews a revision and creates/updates a definition only from valid final evidence; saved output appears in management UI. Own authoring domain controllers, feature HTTP/MCP/oRPC payload descriptors and human review/save feedback; central MCP/HTTP registration and Assistant turn orchestration remain consumers.

**Coverage:** schema, catalog/shared props/component lookup, examples, skill/reference/authoring prompt, validation, template read/write/revision patch, create/update-from-preview and authoring failure recovery. Actual clients include admin-protected HTTP resource reads and curated MCP tools/resources/prompts; current resources use `homarr://custom-widgets/schema`, `/components`, `/skill`, `/references/{schema|runtime|security}`. Names can change, capabilities and consistent schema/catalog/prompt versions cannot disappear.

**Start prerequisites / blocked by:** CUSTOM-01 definition persistence and CUSTOM-03 final-revision evidence contracts; TRANSPORTS curated catalog/resource/approval/error descriptor; portable core exports contract. No need for finished external MCP OAuth or Assistant UI to validate a fixture authoring client.

**Integrated gate:** real admin/resource authorization, centralized public-client dispatch, CUSTOM-03 stores and ASSISTANT-04 authoring consumer; excluded docs still consume portable browser-safe core/workbench/catalog exports.

**Acceptance:**
1. HTTP/oRPC/MCP capabilities expose the same validated schema/component/skill/reference/prompt version and safe errors; server executor/secrets are absent from browser/docs graphs.
2. Authoring research/discovery/template/preview/save transitions remain bounded and cancellable; missing components, invalid JSX or revision conflicts return actionable domain errors without raw transport internals.
3. Preview-origin create/update requires successful queries and successful or simulated actions for the final revision; stale/failed evidence and ambiguous upstream outage cannot save or auto-retry mutation. Direct CUSTOM-01 CRUD is intentionally a different authorized path.
4. Saved create/update appears in management and preserves target-board eligibility only through authorized placement commands; focused external-resource denial, stale patch and evidence-gated save tests cover the public client path.

### CUSTOM-05 — Configure scoped secrets and complete human configuration requests

**Delivery/demo:** An administrator binds a source/integration and sets or clears secret kinds; a requested human opens an expiring configuration page, supplies required values and receives completion without exposing secrets. Own source/secret domain policy, configuration-request orchestration, procedures/token Fetch descriptors and source editor/request UI; identity and atomic store implementations remain shared owners.

**Coverage:** basic/bearer/API-key-header/API-key-query auth; source URL/network/auth binding retention; integration full-access bindings; secret set/clear/sourceConfigure/configurationRequestUser; token GET/POST and owner request page with pending/applying/completed states.

**Start prerequisites / blocked by:** admin/source and real-user token authorization contract, encrypted-value references, ten-minute ownership/lock/TTL/CAS contract, integration source resolver and CUSTOM-01 record contract. D-IDENTITY/public-origin policy gates deployed human links/cookies, not source-form fixture work.

**Integrated gate:** durable secret storage/conversion inventory, chosen-topology one-applier lock, real identity/CSRF and CUSTOM-06 runtime source resolution.

**Acceptance:**
1. Secrets remain server-only and authorization precedes decrypt; source editor/configuration responses show safe configured metadata, never plaintext/ciphertext results or credential-bearing errors.
2. Ordinary edits retain secrets only for compatible origin + network scope + complete auth binding; integration bindings do not inherit local source secrets. Changing destination/binding clears incompatible credentials deliberately.
3. Expired/revoked/foreign tokens or users cannot read/apply requests; concurrent applies have one winner and terminal completed state is idempotent, with no duplicated configuration or leaked secret result.
4. Source setup reports origins/scopes/methods/permissions/actions clearly; focused origin-change, expiry/ownership and duplicate-apply cases plus a durable-field mapping feed DATA-04's complete conversion gate.

### CUSTOM-06 — Render and execute protected Custom JSX requests in the target app

**Delivery/demo:** A saved enabled definition renders safe JSX, takes options/input, loads/refetches authorized data and executes a confirmed action in a feature harness and then a real placed widget. Own feature protected-request orchestration, runtime adapter/renderer integration and runtime error/confirmation/notification behavior; do not recreate the interpreter, low-level runtime platform, integration clients or widget registry.

**Coverage:** `CustomWidgetRuntimePort.query(input, signal?)`, `executeAction`, `invalidate`, `confirm`, `notify`; availability/option-request services; existing interpreter/catalog/renderer, refresh/manual/load/action distinctions and legacy-required outcomes. Board kind `customApi` and definition/configuration/version relationships are converted or retained coherently by the widget owner.

**Start prerequisites / blocked by:** CUSTOM-01/05 definition/source/secret contracts; DNS-pinned executor interface, atomic limits and trusted integration-source policy; BOARD-/WIDGET-RUNTIME permission/placement/options/invalidation contracts; frontend runtime ports. These are contracts, not all widgets or providers being finished.

**Integrated gate:** widget-owner `customApi` refresh/getData/queryRequest/executeAction registration and real placement, public-board/authenticated action cases, native DNS/TLS/Undici packaging and source credentials.

**Acceptance:**
1. Converted saved definitions/options render through bounded safe interpretation; no `eval`, arbitrary JSX compilation, unsafe tags/globals/prototype/CSS/portal escape or unrestricted browser fetch is introduced.
2. Protect public/private/loopback scopes, pinned DNS, origin/path-scoped integration sources, reserved headers, injected credentials and redaction. Authenticated/actions do not redirect; unauthenticated query redirects are limited to three revalidated hops.
3. Enforce existing request/response/interpreter bounds or explicitly reviewed replacements: 10 KiB request, 1 MiB response, depth 32/50,000 JSON nodes, 10-second hop/45-second total; 50,000 template characters, AST depth 64, 25,000 operations, collection 4,000, rendered nodes 10,000 and string work 200,000.
4. Accessible public boards can query only permitted placed definitions; actions require authentication/current request permission/confirmation, editing disables actions, enabled/legacy/option validation is honored and refresh invalidates the correct epoch. Focused denied destination/redirect/action and safe render cases cover the real integration edge.

## Workshop Homarr client — 4 tickets

### WORKSHOP-01 — Browse, review and install through browser and server clients

**Delivery/demo:** A user browses/searches/sorts/pages Workshop, opens submission screenshots/details and an administrator reviews sources before importing a local definition; an authorized MCP client can search/get/install the same submission through the server path. Own Homarr-side remote read/install adapter, feature services and browse/detail/import UI. CUSTOM-01 owns generic local transfer and CUSTOM-05 owns binding/secret policy.

**Coverage:** PocketBase validated list/detail and file/screenshot URL capabilities, search/sorts/pagination/outdated/incompatible handling; browser import and server `workshopSearch/Get/Install`; runtime API/web destination config; existing Workshop navigation entry capability, without requiring old redirects or URLs.

**Start prerequisites / blocked by:** CUSTOM-01 reviewed local import and CUSTOM-05 source-binding contracts; public URL-config/navigation and remote reader descriptor; curated MCP dispatch contract. No dependency on Workshop login, Assistant or full board migration.

**Integrated gate:** real excluded Workshop service/browser/server requests, local durable install and CUSTOM-06 placement eligibility; approved origins/CSP and centralized MCP registration.

**Acceptance:**
1. Search/sort/page/outdated selections, details/screenshots and unavailable/fallback states work with validated remote responses and deployment-configured API/web URLs rather than baked browser defaults.
2. Browser detail→review→local import and server search/get/install independently validate the same portable content; remote submission IDs/revisions never masquerade as local definition identities.
3. Invalid/incompatible payloads, missing required source bindings or denied install leave local state unchanged; portable exports do not sneak remote credentials/local integration IDs into another installation.
4. Installed definition appears in management and authorized placement choices; focused malformed/outdated/server-versus-browser install cases cover both client paths without modifying the Go service.

### WORKSHOP-02 — Sign in separately and publish, update, vote or report

**Delivery/demo:** A Homarr user signs into their separate Workshop GitHub account, refreshes/signs out, publishes or updates a reviewed local definition with screenshots, and votes/reports submissions with safe errors. Own Homarr Workshop account/publish/interaction services/adapters and UI; not Homarr authentication or Go callbacks/moderation implementation.

**Coverage:** PocketBase GitHub popup OAuth, LocalAuthStore change/tab synchronization/refresh/signout, multipart File/Blob screenshots, publish/update, vote/report; preserve comment/moderation backend exports if consumed, without inventing absent Homarr comment/moderation pages.

**Start prerequisites / blocked by:** WORKSHOP-01 remote schema/config contract; CUSTOM-01 portable export; browser account/client-only/notify ports. D-IDENTITY deployment origins/callback/CSP and D-LIBRARIES browser/SSR choice gate real account integration, not fixture publish/review UI.

**Integrated gate:** real popup return/callback/file origins and remote account lifecycle, durable local export and screenshot upload through shipping browser policy.

**Acceptance:**
1. Workshop account login/refresh/signout does not merge Homarr identities or share authenticated server clients across users; browser tokens never enter global SSR state/bootstrap.
2. Publish/update review exports portable content and screenshots correctly, distinguishes new/update ownership, and surfaces validation/auth/unavailable failures without misleading success.
3. Vote/report reflects accepted remote outcomes and supports recoverable errors; account change/tab events invalidate only the relevant remote user state.
4. Selected local definition and remote submission/revision relationship survives intended updates without accidentally modifying another local definition; focused popup failure, shared-client isolation and invalid publish payload cases cover the slice.

### WORKSHOP-03 — Import reviewed CSS into a settings draft

**Delivery/demo:** A user browses the supported Workshop CSS/theme import, reviews it, applies it to the appropriate settings draft and either saves or discards it. Own remote CSS import/review/draft adapter UI; dashboard/settings owner supplies the authorized draft/save contract and final settings page registration.

**Coverage:** remote CSS/theme selection, reviewed content, draft appearance and persistence-on-save only; local custom CSS durable content remains in settings conversion, not a second storage model.

**Start prerequisites / blocked by:** WORKSHOP-01 remote read contract; settings draft/authorization/save/invalidation contract; frontend safe CSS/document and localization ports. No dependency on Assistant, Custom JSX preview or Workshop publishing.

**Integrated gate:** real authorized settings screen/draft/save/undo, persisted converted CSS and root document consumer under approved D-UX/CSP policy.

**Acceptance:**
1. Remote review/import errors do not replace the existing CSS; accepted reviewed CSS changes the draft and its preview immediately.
2. Closing/discarding an unsaved draft leaves durable settings unchanged; explicit authorized save persists and refreshes the correct branding/theme consumer after reload.
3. Import cannot bypass settings/board permissions or serialize remote account credentials; imported CSS uses the application's deliberate safe rendering policy, not a new arbitrary execution path.
4. A focused import→discard and import→save fixture flow proves the distinction and remains runnable before remote auth/publishing is done.

### WORKSHOP-04 — Connect hosted Assistant identity, quota and exact token forwarding

**Delivery/demo:** A Workshop-signed-in user sees hosted model availability/quota, runs an eligible Homarr-provider turn and gets actionable quota/account errors; switching to a custom provider cannot send the Workshop token there. Own Homarr hosted-provider token/quota adapter and Assistant controls; generic provider configuration/stream and remote quota service stay their existing owners.

**Coverage:** external OpenAI-compatible `/api/ai/v1/models` and `/api/ai/v1/chat/completions`, quota `/api/ai/usage`, browser `X-Homarr-Provider-Token` and separate Workshop account. These are actual excluded-service capabilities, not oRPC/MCP streams or Homarr session credentials.

**Start prerequisites / blocked by:** WORKSHOP-02 account/token and runtime API URL contracts; ASSISTANT-01 provider/base-URL contract and ASSISTANT-03 turn header/signal contract. Token/quota fixture UI can start before full chat/account implementation; real external calls wait for approved origins/account policy.

**Integrated gate:** real Workshop login/quota and hosted stream through target ingress, current remote service contract, safe provider-change invalidation.

**Acceptance:**
1. Quota/model availability and account/signout states update the correct user's hosted controls, with no invented quota/sales/cost or fake-success fallback.
2. Forward provider token only when the configured base URL exactly matches the deployment-resolved Workshop `/api/ai/v1` origin/path; arbitrary custom/local URLs, redirects or spoofed token destinations never receive it.
3. Quota/unavailable/auth failures remain safely actionable without losing stored conversation/provider configuration or automatically repeating paid requests.
4. A focused exact-match-versus-near-match destination regression and signout/in-flight abort case validate credential isolation without touching Go implementation.

## Onboarding and durable transfer — 4 tickets

### DATA-01 — Complete claim, account/group and finish entry flows

**Delivery/demo:** On an unfinished target installation, a claimant enters welcome/account-or-group recovery, signs in, reaches authorized setup and finishes/home; other browsers or completed installations cannot reopen setup. Own init step orchestration, entry/claim handler descriptor and step UI. IDENTITY owns claim hashing/CAS, account/group creation, auth and setup policy; this ticket consumes them, never fabricates admin identity.

**Coverage:** public current step, claimed next step, welcome→user/group→setup→finish, local account and external-group recovery, safe environment projection, sign-in/navigation and finish presentation/sounds/confetti.

**Start prerequisites / blocked by:** identity claim/status/initial-account/group/sign-in contracts, durable onboarding-state transition and frontend locale/navigation/environment projection. D-IDENTITY gates real auth/cookie/forwarded-origin behavior; no need for finished boards/integrations or optional Assistant.

**Integrated gate:** real claim/account/group transactions, trusted forwarded headers/CSRF, DATA-02 setup and DATA-04 onboarding restore handoff.

**Acceptance:**
1. Two clients racing for initial claim have exactly one authorized owner; cross-site, expired/revoked claim, wrong step and finished-state mutation are denied at the server.
2. Claim remains a scoped setup capability with no ordinary admin privileges; no environment/credential/claim-token secret appears in initial HTML or safe UI projection.
3. Local credentials and external-group recovery/sign-in complete with explicit recoverable failure states; step refresh/deep-link/home transitions work without Next page revalidation.
4. Converted current/previous onboarding state does not reopen completed setup; focused claim-race, completed-state denial and sign-in/finish flows cover both account families.

### DATA-02 — Select discoveries and atomically create or reuse a setup board

**Delivery/demo:** A claimant uses the studio to choose preset/layout/color/locale/analytics, discovers and selects services, tests integrations, optionally sets Assistant/MCP/API/backup choices, then completes a usable board without losing selected existing content. Own input→plan orchestration, studio services/adapters/UI and complete-setup command contribution; persistence owns actual transaction semantics, board/widget/integration owners own constructors/limits.

**Coverage:** runtime Docker/Kubernetes/Workshop probes; Docker labels/grouping/discovery; integration testing; existing-board selection, stable app/integration mapping, options/bindings/order/layout/gutters; optional settings and restore delegation to DATA-04. No invented generic historical board/config importer.

**Start prerequisites / blocked by:** DATA-01 claim/step context; board/app/widget/integration planning commands, deterministic ID/reference map, atomic conditional setup transaction; runtime capability/test and optional-setting contracts. Only interfaces for optional Assistant/API/MCP are required; unavailable optional features degrade explicitly.

**Integrated gate:** real selected discovery/test providers and constructed board, durable transaction/retry semantics, identity/settings and optional DATA-04 restore when selected.

**Acceptance:**
1. Every visible studio family has usable states: presets/layout/gutters/colors/locale/analytics, existing board, discovery/group/label selection, probes, tests and optional Assistant/MCP/API/backup; unavailable/error capabilities are recoverable and do not silently drop selections.
2. Input produces an authorized validated plan using canonical constructor/limit rules; selected services yield correct app/integration/widget bindings and order, with stable retries not duplicating content.
3. Reusing an existing board preserves its actual content/layout/identity references rather than creating a similarly named board; conditional setup→finish and claim removal are atomic on every supported target engine.
4. Focused existing-board preservation, duplicate-retry, integration-test failure and transaction-conflict cases verify both plan and target UI; no broad provider suite is introduced.

### DATA-03 — Export sensitive backups and preview supported archives

**Delivery/demo:** An administrator exports a consistent SQLite backup, understands its secret-bearing scope, and an administrator or permitted setup user selects a supported archive to inspect counts/boards before authoritative restore. Own authorization/HTTP/client adaptation, export/download UI and browser preview flow. PERSISTENCE owns archive snapshot/migration/crypto internals; DATA-04 owns applying restore.

**Coverage:** SQLite snapshot ZIP download, metadata/version/dialect/key carriage under D-BACKUP; browser JSZip/sql.js preview, migration metadata/SQL and WASM asset capabilities; counts/board selection and preparation of the selected restore request. Existing `db.sqlite` + `metadata.json` layout is a conversion input, not a mandatory target export format.

**Start prerequisites / blocked by:** authorized BackupService export/inspect result and sensitive-delivery contract; supported old-format decoder/conversion frontier; frontend download/browser SQL/client-only and asset descriptors. D-BACKUP decides target confidentiality/key carriage; D-DATA decides engine scope. No dependency on completed live restore for fixture export/preview.

**Integrated gate:** real consistent isolated snapshot, packaged browser SQL/migration/WASM resources, actual multipart/ingress limits and DATA-04 authoritative parser agreement.

**Acceptance:**
1. Authorized SQLite export downloads valid content/metadata; unsupported databases are clearly handled (current product has no PostgreSQL ZIP export), and concurrent exports/errors cannot share/corrupt temporary outputs.
2. UI and responses treat backup as sensitive, explicitly explain whether key material is included, and identify scope: SQL content, not Redis histories/maps or certificate-file whole-volume recovery. Deliberate confidentiality/cache changes are recorded, not falsely described as old behavior.
3. Browser preview of each approved old/new archive reports converted counts/board choices without touching live storage; WASM/SQL assets load in the shipping app, with cancellation/bounds and actionable parser/migration errors.
4. Preview is not authority to restore: malformed/wrong-dialect/oversized/unsupported archives are rejected consistently and the selected board/reference survives handoff to DATA-04; focused preview and concurrent-export fixtures verify the slice.

### DATA-04 — Restore explicitly converted content with complete crypto and recovery

**Delivery/demo:** An administrator or valid setup claimant supplies a supported archive and required old key, sees validated conversion/maintenance progress, restores, reconnects after restart and opens preserved content; rejection/failure leaves a recoverable original installation. Own restore application orchestration, authorized handler descriptor, key/confirm/progress/recovery UI and cross-feature preservation gate. Low-level archive conversion, engine operations, encrypted-field implementation, exclusive replacement and lifecycle are PERSISTENCE/COORDINATION/packaging responsibilities, not duplicated tickets here.

**Coverage:** original/target archive and DB-format conversion, all durable feature references, missing/wrong/same/different key policy, temporary migration, maintenance/quiescing, restart/readiness, selected/home board routing, cache/session/coordination reconciliation. All encrypted field declarations must include integration secrets, `widgetSecrets`, Assistant API keys/headers, v2 and legacy Custom Widget secrets, plus any additional authoritative crypto-inventory fields.

**Start prerequisites / blocked by:** approved D-DATA/D-BACKUP conversion/recovery policy; bounded inspect/prepare result, comprehensive encrypted-field inventory/conversion report and maintenance transaction/restart/readiness contracts; DATA-01 claim and DATA-03 selected archive contracts. UI/validation fixtures may start before the low-level replacement is implemented; live apply cannot.

**Integrated gate:** real complete field conversion, exclusive writer/job/stream drain and connection disposal, chosen-topology lock, recoverable snapshot/rollback, native driver/assets and supervised restart/readiness. D-TOPOLOGY and D-IDENTITY cache/session policy must be resolved before declaring restore safe.

**Acceptance:**
1. Restore only starts for current admin or narrowly allowed setup claim/state; concurrent attempts and ambiguous completion cannot trigger duplicate apply/automatic retry. UI waits for DB/required-service/auth readiness, not a static shell/port.
2. Before live replacement, authoritative temporary migration validates supported format, references and every encrypted durable family under same/different key; missing/wrong key fails even when integration-secret row count is zero. No plaintext or imported key is logged/returned, and no paid external calls validate credentials.
3. Malformed/archive-bomb/oversized/wrong-dialect/migration/crypto/maintenance failures leave live data untouched or use the documented recovery snapshot. Current bounds (256 MiB compressed plus multipart overhead, 512 MiB DB, 514 MiB archive, 1 MiB metadata and 1,024-byte key entry) must be reconciled with actual ingress, not merely copied constants.
4. Converted boards/users/grants/apps/layouts/media/icons/settings/onboarding/threads/branches/Custom JSX definitions and placements survive restart; encrypted features decrypt correctly, stale private cache/session artifacts cannot be reused, and excluded Redis/trust data receives explicit retain/convert/invalidate treatment.
5. Focused disposable old/new-key, missing-key-with-only-Assistant-or-Custom-secrets, rejected-import-live-unchanged, interrupted-apply/recovery and readiness tests are the final integrated gate, not a broad suite or an operation on real appdata.

## Media and icons — 3 tickets

### MEDIA-01 — Upload, manage and display durable media safely

**Delivery/demo:** A permitted user uploads an image, searches/pages their media, selects it for branding/background/icon use, views it on an accessible public board and deletes it with corresponding local icon cleanup. Own media domain procedures, multipart/binary handler descriptors, management/upload/selector adapters and security projections; shared DB/blob operations and generic image components remain other owners.

**Coverage:** PNG/JPEG/WebP/GIF/SVG, 32 MiB upload limit, SQL-backed bytes/name/type/size/creator, own/all-user view permissions and deletion, public binary image read, sanitized SVG/ETag/304/security headers and durable selected references.

**Start prerequisites / blocked by:** binary media/icon repository transaction and authorization contracts; multipart/File parsing/error boundary, safe image/selector and route/invalidation ports. D-UX/IDENTITY review any change to anonymous media accessibility; no unrelated board-runtime completion is needed for a fixture upload/view.

**Integrated gate:** real multipart ingress/byte fidelity and sanitizer packaging; selected public-board/branding consumers, converted media/icon references and real permission context.

**Acceptance:**
1. Upload/list/search/page/delete flows validate format and 32 MiB bound, preserve exact non-SVG bytes/metadata, show failures and enforce `media-upload`, own-default, opt-in `media-view-all`, and creator-or-`media-full-all` deletion.
2. Successful delete atomically removes the matching local icon mapping; converted uploads/selected URLs or IDs continue resolving content, rather than relying on an old URL signature.
3. Binary read policy deliberately supports anonymous public-board/branding images unless approved otherwise; SVG is sanitized before hashing/serving, validators return correct 304 and sandbox CSP/nosniff/private-no-cache semantics are retained or deliberately reviewed.
4. Target selectors and management preserve include-all/search/page/page-size state and correct invalidation; focused denied all-user/delete, malformed SVG, upload bounds and conditional binary read cases verify the full path.

### MEDIA-02 — Resolve opaque image-proxy URLs for integration consumers

**Delivery/demo:** A provider registers an authenticated/trusted image, the target UI displays its opaque proxy reference, and expiry/upstream errors produce safe status/fallback without exposing remote URLs/headers. Own image-proxy feature adapter/handler and consumer-facing error behavior; integration provider guts, encrypted mapping engine and generic HTTP trust primitives are not rewritten.

**Coverage:** HMAC deduplication, encrypted URL/header references, 86,400-second TTL, opaque image delivery, upstream status/502/404 and diagnostic error-header capability, one-hour cache behavior; Immich/Plex/Gotify/Tracearr consumers.

**Start prerequisites / blocked by:** encrypted mapping/TTL/dedup contract; trusted-certificate signal-aware HTTP and redacted error contract; ASSETS image/fallback and provider proxy-registration interface.

**Integrated gate:** real mapping/trust lifecycle and all four named provider consumers through shipping binary ingress. D-TOPOLOGY affects coordination lifetime; no dependency on every integration.

**Acceptance:**
1. Equivalent registrations deduplicate safely, expire deliberately and serve only opaque local references; secret URL credentials and headers never reach browser query strings, serialized cache or diagnostics.
2. Upstream statuses/expired/missing mapping and safe proxy error metadata produce deliberate client behavior with bounded resource cleanup and approved cache headers.
3. LAN/trusted-certificate providers still work under their existing trust model; the proxy is explicitly not the CUSTOM-06 DNS-pinned SSRF executor and cannot weaken that boundary or accidentally impose a new incompatible universal policy.
4. Focused expiry/dedup/credential-redaction/error cases plus a consumer fixture for each named family demonstrate image delivery without rewriting those provider clients.

### MEDIA-03 — Search icons, preserve repository metadata and select media-backed icons

**Delivery/demo:** A user searches or auto-searches an app icon, reviews grouped results/licenses, selects a repository or local-media icon and reloads the persisted selection after icon refresh. Own public icon-query adapter, picker/auto-search integrations and selection behavior; repository fetchers/jobs/provider internals and scheduler registration remain integration/background owners.

**Coverage:** dashboard-icons, selfhst, SimpleIcons, Papirus, homelab-svg-assets and local media; normalization/ranking/SVG-local order, groups/limits/counts/licenses, app auto-search, icon/media form pickers and references used by branding/backgrounds/Assistant images.

**Start prerequisites / blocked by:** public findIcons/result metadata contract, icon-fetch/refresh and local-media lookup contract, authorized app/settings selection command and root images/forms. MEDIA-01 local icon transaction interface is required, not completed media management UI.

**Integrated gate:** all six sources, actual background refresh/scheduler and persisted reference conversion; selected icon consumers with safe remote/public URLs.

**Acceptance:**
1. Every named repository/local source can produce selectable results with normalized search, demonstrated ranking/group limits/counts and license metadata; no source disappears under a generic replacement registry.
2. App auto-search and form selectors work through typed search state, handle empty/unavailable sources safely and preserve exact selected image content/reference across reload/conversion.
3. Refresh updates results without clearing valid user selections; local-media deletion is reflected without silently substituting another icon or leaking another user's restricted management list.
4. Focused ranked/grouped search, local selection/deletion and refresh cases verify picker/query integration; background job lifecycle is graded only in its primary owner's gate.

## Operations and residual product UI — 12 tickets

### OPS-01 — Read permitted logs with ordered live terminal cleanup

**Delivery/demo:** A user with log-view permission opens logs, filters levels/focus, reads history and follows live entries; navigation/reconnect/error/terminal resize clean up resources and keep safe useful output. Own log page/client reducer/terminal and feature authorization/stream descriptor; logger/history store and global streaming host belong to persistence/transports.

**Coverage:** `log.subscribe`, history/message event union, subscribe-before-history buffer/dedup semantics, levels, `focus` string/array query state, client-only xterm, translated errors and terminal lifecycle.

**Start prerequisites / blocked by:** ordered history/live stream/cancel contract, `other-view-logs` permission, typed search/client-only terminal and error mapping. No requirement for admin or completion of unrelated ops pages.

**Integrated gate:** real logging stream/history/fanout through selected ingress and topology; explicitly approved bounded UI/server history policy and secret-safe diagnostics.

**Acceptance:**
1. Target history/live logs show correct allowed levels/focus and ordered deduplicated messages during history/live races; denied users cannot subscribe through an internal descriptor.
2. Terminal initial load/resize/theme/navigation/reconnect and translated error recovery work without server browser globals or duplicate mounted terminals.
3. Abort-before-subscribe-completes, close/error and reconnect release subscriptions/listeners/resources; retained history is not falsely described as guaranteed durable replay.
4. Focused race/order/permission/unmount cases verify the slice and enforce the chosen bounded history policy rather than silently dropping snapshots.

### OPS-02 — Control tasks and display keyed status updates

**Delivery/demo:** An administrator sees tasks, edits allowed intervals/enabled state, triggers allowed tasks and observes status/recovery after reconnect. Own task page/forms/action service adapter/authorization and status consumer; job bodies/registry/scheduler/storage/lifecycle remain background owner.

**Coverage:** all eight cronJobs capabilities, keyed status events, start/stop, manual trigger, interval/enable/disable, translated error/status controls; exactly the `analytics`, `iconsUpdater` and `ping` registered jobs with their current hidden/manual/custom-interval restrictions. Disabled-provider session cleanup is separate startup lifecycle work, not an invented fourth task.

**Start prerequisites / blocked by:** TaskControlService and keyed status/disposal contract, current job metadata/allowed-action flags, durable settings and admin context.

**Integrated gate:** actual three-job scheduler/status and persisted configuration with D-TOPOLOGY ownership; no need for all providers or ops pages to implement the UI.

**Acceptance:**
1. Listed task/status/actions match the real registry, not invented jobs; hidden/manual/interval restrictions are enforced server-side and represented accurately in the UI.
2. Authorized enable/disable/interval/start/stop/trigger update durable configuration/status and refresh the right task; invalid intervals/forbidden controls and running/error states are actionable.
3. Keyed status reconciliation across initial fetch/subscription/reconnect/unmount neither regresses newer state nor reports an interrupted run as successful; streams are disposed.
4. Focused permission, restricted-job, persisted-edit and reconnect cases verify the target page; scheduler overlap/replica/retry policy is the background owner's final gate.

### OPS-03 — Manage Docker inventory, actions, discovery and container logs

**Delivery/demo:** An administrator selects endpoints, sees inventory/health/reconciliation, refreshes or performs permitted batch container actions and opens cancellable live container logs; discovery can hand reviewed apps to the existing app-creation flow. Own Docker tools pages/action/terminal/discovery UI adapters and endpoint descriptors; Docker clients/runtime registry/provider/widget guts stay with their owners.

**Coverage:** all eleven Docker capabilities: reconcile services, service health, inventory refresh, containers/endpoints, batch start/stop/restart/remove, history logs and subscribe logs; endpoint IDs/capability flags, log container/name/tail links and discovery add-app review.

**Start prerequisites / blocked by:** authorized DockerInventory/Control/LogStream contract with runtime-enabled/capability flags; app creation/review contract; stream/search/client-only/confirmation ports. This contract can precede full Docker implementation/widget completion.

**Integrated gate:** actual configured Docker endpoints/permissions/batch results, streaming ingress and delegated app creation; approved runtime feature availability.

**Acceptance:**
1. Inventory/filter/health/reconciliation/refresh show real endpoint identities and status, preserve selected search/log context and explicitly handle unavailable/disabled Docker.
2. Batch start/stop/restart/remove require current endpoint capability/admin policy and confirmation where destructive, with per-target safe failure/refresh; denied actions have no effects.
3. Container history/live log page honors selected endpoint/container/tail, renders errors/resize and releases readers/subscriptions on abort/unmount; arbitrary endpoint names are not trusted identity.
4. Discovery→reviewed app creation uses canonical constructors and notifications, not duplicate provider logic; focused denied remove, partial batch and log cleanup cases cover the complete tools path.

### OPS-04 — Inspect Kubernetes contexts, cluster topology, nodes and namespaces

**Delivery/demo:** An administrator enters enabled Kubernetes tools, switches configured contexts and inspects cluster dashboard/counts, nodes and namespaces; failures/disabled environments are explicit. Own shared feature-local Kubernetes context UI and these topology pages/services/adapters; underlying Kubernetes clients and central root/router are other single writers.

**Coverage:** contexts, cluster dashboard and resource counts, nodes, namespaces; context selection/navigation and sanitized permissions/capability availability. This ticket is the sole Kubernetes feature context/composition owner; OPS-05 supplies resource screen descriptors rather than editing that shell.

**Start prerequisites / blocked by:** integration-owner authorized Kubernetes reader/context contract, safe cluster/resource result schemas, environment feature flags and frontend typed context/navigation/table/image ports.

**Integrated gate:** real contexts/cluster/node/namespace readers and IDENTITY policy; OPS-05 supplies links for a complete tools family, not a blocker to demonstrating topology screens.

**Acceptance:**
1. Target context/cluster/nodes/namespaces screens reach authorized service results and render meaningful counts/resources/errors, not empty route placeholders.
2. Context switching cancels/rekeys stale queries and cannot mix another context's cached resource data; invalid context/disabled Kubernetes is denied/degraded on server and client.
3. No kube configuration/server credentials enter bootstrap or generic browser storage; current table/search/loading/image affordances work via frontend ports.
4. Focused context-switch race, disabled/denied and unavailable-reader cases verify this set independently of every workload page or integration provider.

### OPS-05 — Inspect Kubernetes workloads, networking, storage and sensitive resources

**Delivery/demo:** In the Kubernetes tools shell, an administrator inspects pods, services, ingresses, volumes, configmaps and secrets for the selected context with safe authorized results, filtering and failure states. Own these six resource screens/domain adapters/descriptors only; OPS-04 owns feature context/composition and provider owner owns client guts.

**Coverage:** Kubernetes pods/services/ingresses/volumes/configMaps/secrets reader capabilities and corresponding page families; native details/links/actions only where current UI/source demonstrates them, no invented write/control API.

**Start prerequisites / blocked by:** OPS-04 context-registration/query identity contract; authorized per-resource reader and secret projection policy, frontend table/navigation/formatting contracts. Completion of topology UI is not required once its context contract is frozen.

**Integrated gate:** real readers and secret-read policy through the assembled context shell, including centralized MCP wrappers where curated; D-IDENTITY must settle sensitive data projections.

**Acceptance:**
1. Each of six named resource families is reachable, meaningful and handles empty/loading/unavailable/errors; it is not represented by only a generic cluster-count tile.
2. Context and resource filters rekey/cancel safely, preserve intended links and never display stale resources from a different context.
3. Secret/configmap content is returned only through authorized deliberate projections; no broad public/admin-independent ops reader or credential-bearing error is introduced.
4. Focused foreign-context/denied-secret and one fixture per resource family verify this finite read-only set; no broad cluster E2E suite or real cluster mutation is planned.

### OPS-06 — Manage custom certificates and fingerprint-bound hostname trust

**Delivery/demo:** An administrator views CA metadata/expiry/invalid entries, uploads or safely ensures a root certificate, removes it, inspects trusted hostname fingerprints and removes an exception; integration test remediation can consume the same authorized commands and retry. Own certificate tools UI, safe metadata service/endpoint adapters and diagnostics link contract. PERSISTENCE owns secure TrustFileStore/hostname storage; identity owns authorization; integration owner owns connection-test remediation component.

**Coverage:** all six certificate capabilities, direct authorized certificate/hostname lists, multipart add, ensure/get/remove root certificate and trust/remove hostname mismatch; customcertificates page family and credential-safe certificate diagnostics.

**Start prerequisites / blocked by:** admin/trust policy, safe certificate metadata/TrustFileStore and hostname repository contracts; bounded multipart and trusted HTTP invalidation/reload; frontend table/date/notification/confirmation ports.

**Integrated gate:** no-follow/regular-file/synced-temp/hardlink no-overwrite safe publication, mounted file ownership and real trusted HTTP consumers; final D-TOPOLOGY resource/trust refresh behavior.

**Acceptance:**
1. Certificate and hostname screens display real safe metadata, invalid/expiry states and hostname+fingerprint identity; denied callers cannot list/add/ensure/trust/remove through public clients.
2. Bounded root certificate ensure (64 KiB), validation/current-validity/self-signing/name/conflict cases and multipart upload errors are surfaced correctly; concurrent same/different-content outcomes follow TrustFileStore contract rather than overwriting silently.
3. Trust exceptions remain certificate-fingerprint-specific, never global TLS verification disablement; remove/upload/trust changes invalidate appropriate client trust and support authorized integration-test retry.
4. Focused denied trust, malformed upload and concurrent ensure cases cover UI/service adaptation; filesystem security itself is graded in the persistence/trust owner's gate, not duplicated low-level implementation here.

### OPS-07 — Deliver API-key, public API explorer and MCP setup tools

**Delivery/demo:** An administrator opens API tools, sees redacted key metadata, creates/copies a one-time key, revokes it and uses usable public API/MCP instructions/explorer against the target catalog. Own tool page/help/explorer and onboarding instruction adapters. IDENTITY remains primary owner of key CRUD/authority; TRANSPORTS remains primary owner of curated API/MCP/OAuth/protocol/schema generation.

**Coverage:** API tool page, one-time copy/revoke UX, Scalar or approved explorer, recursive-schema presentation, curated MCP connection instructions and actual authorization modes; optional onboarding key/setup consumer. Legacy REST paths/OpenAPI layout/MCP transport names need not be kept.

**Start prerequisites / blocked by:** safe key-list/create-once/revoke contract and target public API/MCP descriptors/auth-mode/runtime URL contract; clipboard/form/navigation/notify ports. D-UX may change explorer/library choice; no need for every public procedure to finish for a representative runnable explorer.

**Integrated gate:** actual curated public API/MCP/authorization and deployment origin; D-IDENTITY/OAuth decisions resolved, old-key conversion/revocation behavior agreed.

**Acceptance:**
1. Target tool page is usable, permission guarded and shows safe metadata rather than secret lists; create reveals once, explicit copy works, and revoke refreshes/deactivates authority without retaining the plaintext in settings/bootstrap.
2. Explorer/instructions name the actual target protocol/auth modes and deployment URLs and can call representative allowed/denied operations, without suggesting universal cookie fallback or exposing all internal procedures.
3. MCP setup and optional onboarding handoff work from the same descriptor, with actionable disabled/unavailable/auth errors and safe public documentation.
4. Focused one-time reveal/revoke and descriptor/explorer denial cases verify presentation; authority/OAuth/catalog security is the named cross-owner gate, not a second implementation.

### OPS-08 — Preserve management and board tours with durable completion/reset

**Delivery/demo:** An eligible user follows a management or board tour, skips/completes it, reloads without unwanted replay and resets their tour status in profile settings. Own tour state orchestration/status command adapters, shell/gates/targets contract and reset control; identity/profile owns hosting settings page, dashboard/management owners own actual target elements.

**Coverage:** management welcome/boards/apps/integrations/users list/create steps, admin-only user steps; board search/edit/settings/user-menu steps with change-access filtering; current-user getTourStatus/completeTour/resetTours and durable management/board completion flags; route waiting, branding/docs links, keyboard/mobile behavior.

**Start prerequisites / blocked by:** current-user tour repository/policy/status mutation and conversion contract; typed route/target registration and board-change access; frontend tour/client-only/modal/locale ports. D-UX settles redesign/mobile policy, not disappearance of durable completion.

**Integrated gate:** real management/board target elements and own-profile reset placement; selected tour library/hydration behavior and principal-specific status cache.

**Acceptance:**
1. Converted completion flags stay associated with the right user; status/complete/reset cannot modify another user's flags and reset refreshes the target root/status without Next revalidation.
2. Both tours expose all listed appropriate targets, hide admin/change-access steps when unavailable and provide route advancement with bounded target waiting/cleanup instead of an indefinite timer.
3. Skip/done/back/keyboard navigation, typing-field exclusion, branding and documentation links behave intentionally; completed users do not pay for/replay an active tour on every render.
4. Focused completion/reset/permission-filter and route-unmount cleanup cases verify the workflow; global profile/board shell changes are contributed through owner slots, not raced.

### OPS-09 — Deliver management home, About, update and analytics feedback

**Delivery/demo:** A user sees authorized management statistics/navigation and complete About/build/license/contributor information; administrators can see update availability and consent-gated analytics action/status. Own management landing/About/build-data adapters, info/demo projections, update header UI adapter and analytics feedback contribution; root navigation/branding, identity settings/consent and external request/background bodies remain their owners.

**Coverage:** home scoped stats for apps/boards/groups/integrations/invites/media/search engines/users; version, dependency catalog/licenses, GitHub/Crowdin/OpenCollective contributor aliases/sponsors/translators and resource payloads; keyboard/language/external links; updateChecker, analytics manual action and info version/demo/read-only public projections.

**Start prerequisites / blocked by:** scoped home statistics, safe info/demo/update/analytics result contracts and build/static contributor/dependency descriptors; consent/external-connection policy, frontend metadata/image/header/translation ports. No dependency on a complete operational backend collection.

**Integrated gate:** permission-scoped real stats, actual build version/packaged data/resources, header update consumer and consent-gated real analytics owner; D-UX may redesign but cannot omit these capabilities.

**Acceptance:**
1. Target management landing counts/links reflect current allowed scope and refresh after relevant mutations; route visibility does not grant data access or leak another user's counts.
2. About shows actual build version, dependencies/licenses and all three contributor/sponsor/translator sources/aliases with useful links and keyboard/language information; HTTP/client resource capabilities resolve without requiring old URLs.
3. Update and analytics feedback are permission/consent/`NO_EXTERNAL_CONNECTION` gated, handle unavailable services and avoid duplicate external sends; version/demo/read-only projections are safe and explicit.
4. Focused restricted statistics, packaged About-data and disabled analytics/update cases validate these small read-heavy adapters; if sizing expands, split the external feedback pair from home/About before publication, not into API/UI layers.

### OPS-10 — Run application CLI administration and credential recovery

**Delivery/demo:** On a disposable target installation without a running HTTP server, an operator lists/deletes users or integrations, updates/resets a password, fixes usernames or recreates admin access using documented target commands and safe output/exit behavior. Own application CLI domain command/adapters and CLI feature artifact contract; identity/repositories implement account algorithms and durable revocation, packaging owns executable publication.

**Coverage:** `users list/delete/update-password`, `integrations list/delete`, `reset-password`, `fix-usernames`, `recreate-admin`; selection/flags/output/exit capabilities and credential algorithms. Command names/flags may be redesigned; an explicit command mapping/operator instruction replaces obsolete signatures rather than preserving them by default.

**Start prerequisites / blocked by:** framework-neutral authorized operator/repository/credential/crypto contracts, safe environment/config loading and CLI artifact/exit interface. D-IDENTITY decides revocation semantics; no dependency on oRPC, HTTP startup or whole auth UI.

**Integrated gate:** packaged executable/native ABI/migrations/env on chosen runtime and converted DB; durable credential-session/API-key recovery policy and no real-data mutations during proof.

**Acceptance:**
1. Every named administrative/recovery capability works against authorized disposable data with meaningful help/selection/output/exit statuses, not a browser/API dependency.
2. Password/admin recovery preserves intended hashing/provider restrictions and actual session revocation semantics; API-key revocation changes, last-admin recovery and external-provider constraints are explicit decisions, not guessed side effects.
3. Listing/errors never expose plaintext credentials, keys or sensitive stored values; deletes/username fixes honor canonical relationships and converted data, with failure not reported as success.
4. Focused representative recovery/session and denied external-user mutation cases plus CLI artifact invocation validate the command family; broad CLI/e2e suites and live installations remain out of scope.

### OPS-11 — Preserve lazy harness and developer-tool launch workflows

**Delivery/demo:** An operator invokes harness/local-harness help/build/run/setup/port/stop without eager production DB initialization, and the existing Go developer tool can launch/inspect the newly built application artifact using its local/PR/provenance workflows. Own application harness adapter and consumer launch/health contract contributions; global Dockerfile/launcher/container assembly and Go implementation are excluded single-writer domains.

**Coverage:** lazy harness dispatch; target CLI artifact/Node CJS/native external resources or approved replacement; developer-tool local/PR image/build/rebuild/source fingerprint/provenance, run/open/logs/data/shell/CI/stop/restart/remove/doctor/TUI capabilities. No actual destructive lifecycle action or image build is authorized by this draft.

**Start prerequisites / blocked by:** packaging launch/env/port/health/resource-manifest contract, runtime readiness and safe workspace/disposable-data interfaces; CLI command dispatch seam. D-TOPOLOGY/D-LIBRARIES chooses runtime/packaging; target command contract can be drafted before the app is complete.

**Integrated gate:** shipping artifact starts under actual supervision with chosen resources; Go consumer acceptance in authorized disposable environments preserves necessary source/revision/PR provenance, port/volume/key/env semantics or documented explicit replacement.

**Acceptance:**
1. Harness-only help/control path has no eager auth/database/environment dependency; normal domain commands initialize only their required runtime resources.
2. Build/run/setup/port/stop target commands and publication entry are usable with clear errors and selected native/migration/resource paths; no stale Next artifact path is treated as successful startup.
3. Packaging descriptors account for Go-tool source/revision/PR labels, current 7575 and appdata/stable-encryption-key assumptions, or explicit approved changes with safe data/reference mapping; local/PR/provenance consumers are not silently removed.
4. Final focused artifact/help/lazy-dispatch and disposable launch/health checks are coordinated with the packaging single writer; this ticket does not rewrite Go for oRPC or execute broad Docker workflows during planning.

### OPS-12 — Deliver branding-aware install metadata and public app assets

**Delivery/demo:** A branded target installation provides valid app manifest/icons/favicon/head/public resources, registers the scoped service worker and updates branding without serving stale or private state. Own feature manifest/service-worker registration adapter and branding asset descriptors/client behavior; frontend/root owns document/head/fonts/CSP/static assembly and packaging owns emitted resources. No generic low-level asset runtime is duplicated.

**Coverage:** dynamic name/primary color/logo/favicon and maskable 192/512 fallbacks, direct public images, current service-worker install/activate/claim behavior, scope/update/security headers, viewport hints and well-known/static route capability contributions; shared transient notification *consumption* throughout this draft.

**Start prerequisites / blocked by:** safe branding/settings projection, static/manifest/head/worker descriptor and scoped browser registration contracts; frontend ASSETS/CSP/notification root placement. D-UX/D-IDENTITY settles public origin/assets policy, D-TOPOLOGY real shipping ingress.

**Integrated gate:** packaged direct assets/build references and real branding/public-media consumers; root header/CSP/worker scope and one notification provider. Offline caching/push is not a current product requirement.

**Acceptance:**
1. Default/custom branding produces a valid manifest and resolvable matching-build icons/logo/favicon/fallbacks, updated after saved branding without leaking private settings or user-specific manifest cache.
2. Service worker installs/activates/claims at the approved scope, updates/unregisters deliberately and uses correct resource/security headers; no invented offline cache or push promise is substituted for current behavior.
3. Public/well-known/static capability descriptors integrate with root CSP/blob worker/media needs and actual deploy URLs; unbundled/missing assets are failures, not success via fixture-only files.
4. All assigned feature consumers use the frontend owner's one transient success/error/warning notification port without SSR calls or hydration/mutation replay; Assistant run-specific dedup is ASSISTANT-05. Focused manifest/branding/worker-scope and notification consumer cases close this residual UX edge, not a second notification framework.

## Primary ownership coverage ledger

Every assigned feature capability below has one primary ticket or one explicitly named cross-owner primary seam. Other tickets are consumers; repeated mentions in acceptance criteria are integration edges, not duplicate write ownership. Historical page/HTTP identities identify families to preserve, not target URL obligations. Shared central contracts/registrations are never reassigned by this ledger.

### Procedure/capability ownership

| Current family / exact names | Primary ticket | Cross-owner consumers or excluded guts |
| --- | --- | --- |
| assistant getAvailability, getContextEntities, getModelCapabilities, getRuntimeOptions, getAdminConfiguration, updateConnection, clearCredentials, discoverModels, updateConfiguration (9) | ASSISTANT-01 | Other Assistant tickets; provider config repository/secret primitives remain PERSISTENCE |
| assistant listThreads, createThread, updateThreadModel, getThread, getGenerationTelemetry, renameThread, deleteThread, appendMessage, submitFeedback, deleteMessages (10) | ASSISTANT-02 | ASSISTANT-03/05; full 19-procedure family accounted for |
| Chat POST UI-message semantic stream, attachment validation, reasoning/source/tool/metadata parts | ASSISTANT-03 | TRANSPORTS mounts Fetch descriptor; ASSISTANT-04 tool policy |
| Curated approvals/continuations, lazy tool groups, native review, ask-user, browser navigation, integration/docs research | ASSISTANT-04 | TRANSPORTS ToolExecutor, native domain owners, CUSTOM-04 authoring |
| Shared panel/widget/Spotlight messages versus local drafts; speech and run notifications | ASSISTANT-05 | Widget/Spotlight/root single writers; notification infrastructure frontend |
| customWidget list, get, create, update, toggleEnabled, delete, duplicate, export, import (9) | CUSTOM-01 | Workshop publish/install and authoring/runtime; repositories are PERSISTENCE |
| customWidget legacyMigrationPrompt, exportLegacy, migrateLegacy (3) | CUSTOM-02 | DATA-04 conversion and widget placement references |
| customWidget previewCreate, previewReviseTemplate, previewGet, previewRefresh, previewQuery, setPreviewLiveActions, previewJournal, previewAction (8) | CUSTOM-03 | Coordination owner CAS/limits; CUSTOM-04 evidence and workbench runtime preview consumer |
| customWidget schema, getAuthoringPrompt, getSkill, getReference, getComponentCatalog, findComponents, getComponent, getComponents, getSharedProps, getExample, validateTemplate, validate, createFromPreview, updateFromPreview, readTemplate, writeTemplate, templatePatch (17) | CUSTOM-04 | ASSISTANT-04, central HTTP/MCP registration, excluded docs portable core exports |
| customWidget secretSet, sourceConfigure, configurationRequestUser, secretClear (4); token page/GET/POST | CUSTOM-05 | Identity authorization; atomic request store and secret engine other owners |
| customWidget available, optionRequest (2); safe runtime ports/protected executor orchestration | CUSTOM-06 | Widget owner exclusively owns customApi refresh/getData/queryRequest/executeAction and registry/options/placement; feature executor/interpreter is consumed, not redesigned |
| customWidget workshopSearch, workshopGet, workshopInstall (3) | WORKSHOP-01 | Together with above: all 46 customWidget procedures accounted for exactly once |
| Workshop list/detail/search/sort/page/outdated/screenshots and both install paths | WORKSHOP-01 | PocketBase/Go server excluded; CUSTOM-01/05 imports/bindings |
| Workshop popup account/store/refresh/signout, publish/update/screenshots/vote/report | WORKSHOP-02 | Keep consumed comment/moderation exports; no unestablished pages added |
| Workshop CSS review/import→settings draft→explicit save | WORKSHOP-03 | Settings/board owner exclusively owns durable draft/save and root rendering |
| Hosted provider models/chat/quota/token-origin boundary | WORKSHOP-04 | ASSISTANT-01/03; excluded remote provider runtime |
| onboard currentStep, nextStep; initial user/group recovery and claim entry/finish | DATA-01 | IDENTITY owns scoped claim/account/group/auth primitives and central guards |
| onboard testIntegration, detectRuntimeCapabilities, discoverDockerServices, completeSetup | DATA-02 | All six onboard procedures covered; canonical domain constructors/transaction backend other owners |
| SQLite export/download and browser inspect/migration/WASM/count/board selection | DATA-03 | PERSISTENCE authoritative backup internals, ASSETS emitted resources |
| Restore import/old-format conversion/all encrypted families/maintenance/restart/recovery UI | DATA-04 | PERSISTENCE conversion/replacement and packaging restart, not duplicated implementation |
| media getPaginated, uploadMedia, deleteMedia; binary read/SVG/ETag/304; local-icon transaction and upload/select UX | MEDIA-01 | Identity policy, durable binary repositories, frontend image adapter |
| Opaque proxy register/dedup/TTL/headers/status/cache and Immich/Plex/Gotify/Tracearr images | MEDIA-02 | Integration client/crypto/trusted HTTP/coordination guts excluded |
| icon findIcons, picker/auto-search, six source families/licenses/groups/refresh selection | MEDIA-03 | Integration owner fetchers, background owner registry/refresh job |
| log subscribe/history/live levels/focus/terminal | OPS-01 | PERSISTENCE logger/history, TRANSPORTS stream host |
| cronJobs triggerJob, startJob, stopJob, updateJobInterval, disableJob, enableJob, getJobs, subscribeToStatusUpdates | OPS-02 | Background owner alone owns jobs/config atomics/scheduler |
| docker reconcileServices, getServiceHealth, refreshInventory, getContainers, getEndpoints, startAll, stopAll, restartAll, removeAll, logs, subscribeLogs | OPS-03 | Docker runtime/client + widget registry primary elsewhere |
| kubernetes contexts.getContexts, nodes.getNodes, cluster.getCluster/getClusterResourceCounts, namespaces.getNamespaces | OPS-04 | Feature context shell owner; provider clients separate |
| kubernetes ingresses.getIngresses, services.getServices, pods.getPods, secrets.getSecrets, configMaps.getConfigMaps, volumes.getVolumes | OPS-05 | All 11 Kubernetes procedures covered; central MCP wrappers/identity projection separate |
| certificates getCertificate, ensureRootCertificate, addCertificate, trustHostnameMismatch, removeTrustedHostname, removeCertificate; safe list metadata | OPS-06 | TrustFileStore/hostname policy/backend and integration test-remediation component other owners |
| API tools one-time key UX, explorer and MCP setup instructions | OPS-07 | IDENTITY primary apiKeys getAll/create/delete; TRANSPORTS primary public API/MCP/OAuth catalogs |
| user getTourStatus, completeTour, resetTours; board/manage tour completion flags | OPS-08 | Identity repository/current-user authority, profile/dashboard/management hosting owners; do not port these again in identity UI ticket |
| home getStats; management home/About resources; info getInfo/isDemoMode/isDemoReadOnly; updateChecker getAvailableUpdates; analytics sendAnalytics feedback | OPS-09 | Identity owns consent/demo policy and background/external request owner the bodies; delegate these feature callers here |
| CLI users/integrations/recovery/fix-usernames/recreate-admin | OPS-10 | Identity/domain algorithms + PERSISTENCE; packaging artifact publication |
| CLI harness/local-harness and Go developer-tool launch/provenance consumers | OPS-11 | Go excluded; packaging single writer executes final artifact gate |
| PWA/manifest/sw/direct public assets and notification consumer closure | OPS-12 | Frontend primary static/head/worker header/root notification infrastructure, not a new low-level platform |

### Current page-flow family coverage

| Current page/flow identity (evidence only) | Primary | Required end-to-end continuation |
| --- | --- | --- |
| `/manage/assistant`; panel/chat message/attachment/review UI | ASSISTANT-01 / ASSISTANT-03 respectively | Config → usable model/turn; ASSISTANT-04 review/tools |
| Conversation history/branches/details/export/feedback | ASSISTANT-02 | Durable reload/conversion, ASSISTANT-05 surface navigation |
| Assistant floating panel, multiple board widgets, Spotlight and speech | ASSISTANT-05 | Widget/Spotlight host contracts and real shared run |
| `/manage/custom-widgets`, `/new`, `/edit/[id]`, transfer/duplicate/enable/delete | CUSTOM-01 | CUSTOM-05 source setup; CUSTOM-02 legacy recovery |
| `/manage/custom-widgets/preview/[id]`, workbench completion/response tree/journal/live action | CUSTOM-03 | CUSTOM-04 preview-origin save; CUSTOM-06 protected runtime |
| Admin authoring HTTP/MCP resources/prompts/tools and template patch/save client | CUSTOM-04 | Real centralized authorized public dispatch and management saved result |
| `/custom-widget-configuration/[token]` and source setup/secrets dialogs | CUSTOM-05 | Expiry/owner/lock/application and usable configured source |
| Placed Custom JSX `customApi` query/refresh/options/action/render | CUSTOM-06 feature adapter; widget owner registry primary | Actual board placement/permission/version after durable conversion |
| `/manage/custom-widgets/workshop`, `/workshop/[id]`, historical `/manage/workshop` entry | WORKSHOP-01 | Single target discoverable entry; old redirect not required |
| `/manage/custom-widgets/publish/[id]`, Workshop popup/vote/report/screenshots | WORKSHOP-02 | Portable reviewed export, remote auth/publish/update |
| Workshop CSS/theme review import and settings draft | WORKSHOP-03 | Only explicit authorized settings save persists |
| Hosted account/quota/model controls | WORKSHOP-04 | Exact token destination and real streamed hosted turn |
| `/init` welcome/user/group/claim/sign-in/finish | DATA-01 | DATA-02 setup or permitted DATA-04 restore, then authorized home |
| Onboarding setup studio/probes/discovery/tests/presets/existing board/optional settings | DATA-02 | Canonical authorized creation/reuse and atomic finish |
| `/manage/tools/backup` export/select/analyze/board choice | DATA-03 | DATA-04 apply/restart/recovery; separate slices, same feature screen slots |
| Backup key/confirm/restore/progress/readiness flow, including onboarding import | DATA-04 | Full content/crypto conversion and safe maintenance |
| `/manage/medias`, upload/media/icon/background/branding selectors and public binary image | MEDIA-01 | Durable bytes/references, local icon cleanup and real public consumer |
| Proxy-backed integration images and safe fallback/error | MEDIA-02 | Named Immich/Plex/Gotify/Tracearr consumers |
| Icon repositories/search/auto-search/groups/licenses/select/refresh | MEDIA-03 | All six source families; same selected durable content |
| `/manage/tools/logs` | OPS-01 | History plus live levels/focus/resize/reconnect/cleanup |
| `/manage/tools/tasks` | OPS-02 | Authorized control/restrictions plus keyed status |
| `/manage/tools/docker`, `/docker/logs/[containerId]` | OPS-03 | Endpoint inventory/reconcile/health/batch actions/discovery/log stream |
| `/manage/tools/kubernetes`, `/nodes`, `/namespaces` | OPS-04 | Context/cluster dashboard/counts plus topology detail |
| Kubernetes `/pods`, `/services`, `/ingresses`, `/volumes`, `/configmaps`, `/secrets` | OPS-05 | Six authorized context-sensitive resource tables/details |
| `/manage/tools/certificates`, `/certificates/hostnames` | OPS-06 | Safe files/metadata/trust mutations; integration diagnostics consumer elsewhere |
| `/manage/tools/api`, API-key/MCP help/explorer/setup | OPS-07 | Real authority/protocol descriptors from identity/transports |
| Board/manage tours and profile general reset-tour control | OPS-08 | Persisted per-user flags and real target registrations |
| `/manage`, `/manage/about`, About resource reads, update header/analytics feedback | OPS-09 | Scoped stats/build/licenses/contributors plus consent-controlled external feedback |
| App CLI domain/recovery commands | OPS-10 | Disposable offline operator workflow and packaged entry |
| Harness/local-harness and Go developer CLI image/provenance/launch lifecycle | OPS-11 | Actual shipping contract proof without rewriting excluded tool |
| Dynamic manifest/service-worker/public images/head/static capability consumers | OPS-12 | Root asset/header/CSP + shipping scope/assets |
| Shared success/error/warning transient notifications | Frontend overlay/notification primary | Each local ticket owns its mutation/form consumption; ASSISTANT-05 run-level dedup, OPS-12 closure audit |

This ledger covers the assigned families, not unrelated auth/user/group/settings/board/app/integration/widget pages already assigned to other owners. All selected page URLs may be redesigned as long as the target navigation exposes their capabilities. No missing generic importer is invented from historical Homarr versions; current transfers are Custom JSX JSON/Markdown/legacy, Workshop definitions/CSS, Assistant diagnostic export and SQL backup/restore.

### Durable content and conversion coverage

| Durable source content | Primary feature preservation gate | Backend/conversion authority |
| --- | --- | --- |
| Assistant configurations/model settings/encrypted API key+headers | ASSISTANT-01 | PERSISTENCE inventory/conversion, DATA-04 cross-key integrated gate |
| Assistant threads/messages/parents/rich format/telemetry/feedback | ASSISTANT-02 | Explicit codec/identity/reference conversion; stream consumers ASSISTANT-03/05 |
| v2 Custom JSX definition/options/template/requests/sources/enabled/creator/versions | CUSTOM-01 | PERSISTENCE repository; DATA-04 archive coverage |
| legacy definition/secret rows and existing placed references | CUSTOM-02 | PERSISTENCE transformation/reference map; widget owner placed `customApi` binding |
| Custom JSX scoped encrypted secrets, legacy compatible credentials | CUSTOM-05 (ordinary), CUSTOM-02 (legacy reuse rules) | Complete PERSISTENCE encrypted-field conversion, DATA-04 gate; neither drops originals on rejected conversion |
| Preview CAS/revisions/evidence/journals/rate state and human request tokens/locks | CUSTOM-03 / CUSTOM-05 respectively | COORDINATION lifetime/TTL conversion or explicit invalidate policy; not assumed durable SQL ZIP content |
| Workshop imported definitions and published remote/local identity relationship | WORKSHOP-01 / WORKSHOP-02 respectively | Local definition mapping + excluded remote schemas; no merging identities |
| Reviewed CSS persisted through settings save | WORKSHOP-03 | Identity/settings owner durable settings conversion |
| Onboarding state/claim/existing-board selection/stable discovered bindings | DATA-01 / DATA-02 respectively | Identity claim service and PERSISTENCE atomic transaction/reference mapping |
| Every SQL domain's backup conversion, all ciphertext including widgetSecrets | DATA-04 | PERSISTENCE exhaustive authoritative field inventory/recoverable snapshot; no partial integration-only conversion |
| Media bytes/metadata/creator/local icon and selected image references | MEDIA-01 | Binary repository/reference conversion; MEDIA-03 repository/icon result consumers |
| Proxy encrypted remote URL/header mappings and TTLs | MEDIA-02 | COORDINATION explicit retain/convert/invalidate policy under topology/key change |
| Task configuration, log/status histories/lifetimes | OPS-02 / OPS-01 respectively | Background/coordination owners; SQL backup not a history-replay promise |
| CA files and SQL trusted hostname/fingerprint state | OPS-06 | TrustFileStore/identity/persistence conversion and packaging volume policy; SQL ZIP excludes CA files |
| Current-user management/board tour-completion flags | OPS-08 | User conversion/permission contract; keep status through reload/restart |
| Keys/session/recovery effects and integration/user references touched offline | OPS-10 consumer gate | IDENTITY/PERSISTENCE primary authority/algorithms; OPS-07 key UX consumer |
| Branding/favicon/colors/custom CSS/locale/consent/demo preferences | OPS-12 / WORKSHOP-03 / OPS-09 consumers | Identity/localization/settings primary conversion; no duplicate settings model |

## Reconciliation, sizing and readiness still unresolved

1. **Primary ownership proposals needing coordinator acceptance:** OPS-01/02/03/04/05/06/07 tool pages; OPS-08 tours + profile reset/status callers; OPS-09 management home/About/info/update/analytics callers; OPS-12 manifest/worker feature callers. Research classifications put some procedures under identity/integration, but that does not establish their UI ownership. Assign feature-local adapters as above while preserving their domain backend authority. If another ticket already owns an entire vertical flow, move the whole overlapping slice there and record one primary; do not port the same procedure/screens twice.
2. **Packaging single writer is still unnamed.** OPS-11 is a CLI/consumer contract ticket, not ownership of global launcher/native/container/bootstrap files. DATA-04 cannot close without a supervised restart/readiness/maintenance owner; CUSTOM-06 needs native DNS/TLS executor output; MEDIA-01 needs sanitizer/native output; DATA-03 needs SQL/WASM; OPS-12 needs emitted assets. Name that owner in the reconciled graph.
3. **Storage/crypto conversion is not duplicated.** PERSISTENCE's BackupService/MaintenanceCoordinator owns archive preparation, full ciphertext conversion and live replacement. DATA-03/04 own delivered feature routes/UI/orchestration and explicit whole-content acceptance. Require authoritative field manifests/contracts, not waiting for unrelated storage-engine changes. Existing backup code's integration-only key conversion is an explicit defect to resolve, not an approved behavior to preserve.
4. **Fresh-context sizing risks:** ASSISTANT-04 combines native reviews and curated docs/authoring consumers; if review adapters are not already reusable, split by native review versus research/authoring with no new permissive executor. CUSTOM-03 includes preview lifecycle/workbench; reusable ports/CAS are prerequisites, otherwise split interactive queries versus confirmed live preview actions as complete flows. DATA-02 planner/atomic complete-setup and DATA-04 restore are the largest orchestration contexts; keep backend transaction/conversion primitives with their owners, and split only into independently deliverable capability scenarios if those interfaces cannot be frozen. OPS-03 Docker combines inventory/actions/logs; split terminal flow if actual endpoint/client changes exceed the shared adapter seam. OPS-05's six read-heavy tables fit only if canonical reader/schema/table conventions remain reusable; otherwise split workload/network versus storage/config/secrets, each with full UI/service/verification. OPS-09 can split home/About from update/analytics feedback if these small adapters diverge. OPS-11 must not grow into a global packaging rewrite.
5. **Pending human choices remain explicit:** D-TOPOLOGY determines atomic stores, maintenance/streams/job ownership/supervision; D-IDENTITY determines real claim/session/origin/CSRF/private projections; D-DATA and D-BACKUP determine target database portability, approved old-format conversion matrix/key confidentiality/recovery; D-LIBRARIES determines coherent AI/assistant-ui/browser SQL/editor/terminal/client SSR boundaries; D-UX determines target interactions/routes/tours/explorer and any deliberate anonymous-media policy change. Capability/content preservation stands even if those choices replace libraries or formats.
6. **Testing/validation policy:** no checks, source/runtime changes or tests were executed for this draft. Later tickets may add only focused relevant security/content-conversion/critical-flow regressions and run scoped authorized checks. Central integrated gates require observed allowed/denied/error paths, real durable effects, actual stream/multipart/binary framing and shipping resources; no full repository typecheck, broad suite or fixture-only parity claim. No nested agents, real credentials/appdata, existing playable container or excluded runtime mutation is implied.

**Count:** ASSISTANT 5 + CUSTOM 6 + DATA 4 + MEDIA 3 + OPS 12 + WORKSHOP 4 = **34**. Publish only after reconciled numbered graph/granularity/decision approval, then one file per approved ticket. This file remains solely a provisional area draft.
