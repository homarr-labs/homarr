# Transport planning draft — unapproved

Planning only. Five proposed shared acceptance slices; **zero domain procedure owners** added by this lane. No implementation, checks, live calls, publication, or compatibility approval is claimed. Source: completed `research_notes/Homarr full Nitro migration/endpoints-transports.md`, read with `TICKET-DRAFTING.md`, `DESIGN.md`, and `to-tickets`. The latest user confirmations override older preservation recommendations in the research.

## Policy and ownership contract

- Nitro is the only application build target. Internal clients, external URLs/APIs, CLI commands and formats may change completely; no tRPC bridge, old REST coercion adapter, legacy MCP transport or old-wire compatibility window is required by default. Ledger identifiers below identify **source capabilities**, not approved replacement URLs or signatures. Merge deprecated preference aliases into equivalent replacement capabilities deliberately rather than preserving obsolete routes automatically.
- Preserve capabilities, authorization, privacy, durable content and legitimate public access. Breaking a wire contract does not authorize dropping a feature, changing identity requirements accidentally, losing encrypted data, or touching a real installation. SQLite remains default with optional PostgreSQL. Backup capability restrictions/conversion remain the extended/persistence owners' responsibility.
- Singleton production is confirmed, not clustered deployment. Retain Mantine; use standalone use-intl; prove Auth.js Core Fetch integration first. TanStack uses descriptively named route files within feature/group folders, ignores `-components`, and deliberately applies pathless/layout/nonnested/dynamic semantics. No literal folder named `files` is required. These are core/dashboard responsibilities, not new transport tickets.
- Each domain owner supplies client-safe contracts, authorized services, local RPC/REST/MCP descriptors, owned UI, output/event semantics and focused acceptance. This lane consumes those contributions; it never copies business services, permission constructors or source bindings into protocol handlers.
- **One `COMPOSITION` writer** owns central application/REST/MCP registries, HTTP route precedence, TanStack route registration, package/export manifests and lockfile. Coordinator must assign this person and exact write boundary before implementation. Transport workers supply local adapters/descriptors; composition edits are queued contributions, not concurrent edits. This is not a demand for a sixth transport ticket.
- Keys below are provisional semantic family references to the five peer drafts, not final ticket IDs. Multiple semantic families can resolve to one approved ticket; one family can be split only by explicitly assigning every leaf. Coordinator must resolve all keys to actual tickets once, preserving exactly one primary owner per row. Consumer edges are not additional owners.

## Five proposed runnable slices

### TRANSPORT-RPC — Exercise authorized Fetch RPC through a real browser/server caller

**Delivers:** A registered domain contribution is callable from the Nitro application's browser and request-local server loader without loopback HTTP, secret-bearing client imports or a Next runtime. This is the narrow runnable shared expansion exception, not a 334-endpoint migration ticket.

**Start prerequisites:** Agreed `FOUNDATION` principal/policy/context, error, client-safe contract and identity-key interfaces; contract-output decision for the first contribution; composition writer assigned. Local adapter/service work can start against contracts before all identity/providers/persistence/peers are implemented.

**Runnable acceptance prerequisites:** One feature-owned real query/mutation contribution and its authorized UI/server consumer; minimal Nitro host from core. Suggested first query is `info.getInfo`, followed by an owned mutation; the feature owner retains both. Full identity correctness is an integrated gate, not a blocker for all local contract authoring.

**Exclusive domain:** Local internal Fetch host/client/error/serialization adapters, transport-specific context construction and dispatch selection. Core owns identity/persistence/SSR runtime; dashboard/widgets own loader/query/UI adoption; composition writer mounts contributions.

- [ ] Browser and direct server paths invoke the same authorized feature service exactly once; unknown API paths yield intentional 404/405 rather than page fallback. RPC/REST/MCP/Auth/media precedence is explicit.
- [ ] Internal RPC ApiKey-then-cookie precedence, cookie-only SSR and request-local memoization do not become ambient-cookie REST/MCP authorization. Anonymous public-board reads still work through their feature policies; demo write rules and Assistant exception remain service-owned.
- [ ] Typed errors retain safe validation/domain details and denial-as-NOT_FOUND without exposing secrets/stacks. Actual outputs, null/undefined, Dates/units and SSR hydration are reconciled with the agreed new serializer; durable SuperJSON decoding is not confused with old wire support.
- [ ] Identity-scoped Query keys, logout/permission-denial clearing, retry/write ambiguity and feature invalidation are exercised by a real feature consumer. No global private SSR cache or indefinitely open streaming prefetch is introduced.
- [ ] Media/certificate multipart transport can select a bounded native Fetch adapter independently if RPC parser support is unsuitable; their services/UI/limits remain feature-owned. Focused transport/policy regression and scoped Nitro checks are deferred to authorized implementation acceptance.

**Integrated gate:** All 334 contributions resolve through the approved application composition and their feature acceptance, not through 334 transport-only tickets.

### TRANSPORT-REST — Publish and exercise the curated public API and explorer

**Delivers:** An external client can discover and call a deliberately selected public operation and inspect its accurate API document in the application's API explorer. Remaining public capability contributions are composed incrementally by their feature owners.

**Start prerequisites:** `FOUNDATION` ApiKey principal/policy contract; explicit public registry and output/schema-converter/spec decisions. Depends on TRANSPORT-RPC's shared interfaces, not its full release completion. Start with one feature-owned REST contribution and the dashboard/core API-management UI interface.

**Exclusive domain:** Local curated REST handler, specification generator/normalizer and specification HTTP response. API-key management remains core; explorer's surrounding management shell remains dashboard. Composition writer alone installs registry/mount/package changes.

- [ ] Runtime exposure uses an explicit curated registry; hiding a leaf in generated documentation is not treated as denying invocation. No implicit nested-default exposure of all application procedures.
- [ ] The 52 source selections are individually accounted for by their primary feature owners. Approved redesign can merge aliases or change paths/methods, but each source capability maps to a chosen replacement; optional anonymous board/app read semantics are documented accurately.
- [ ] ApiKey-only authentication rejects ambient cookie authorization; origin/CORS/preflight and deliberate HEAD/405 behavior are specified for the new API, with safe response/error/void mappings.
- [ ] Real input refinements/defaults/normalizations and redacted outputs produce usable public schemas, including preferences and integration selector constraints. No empty-schema fallback or invented result DTO.
- [ ] Explorer and external-client acceptance cover one real read/write/error path plus accurate server base URL from the trusted-origin contract. Scalar recursive normalization is retained only if the chosen explorer needs it; old `format=scalar` URL is not mandatory.

**Integrated gate:** The curated capability ledger reconciles all 52 selections to approved new public operations, independently of the 334 internal paths. Protocol/binary documentation policy remains explicit rather than accidentally exposing them as JSON RPC.

### TRANSPORT-MCP — Discover and invoke curated tools/resources with safe dispatch

**Delivers:** An external MCP client and the Assistant's internal tool consumer discover an authorized catalog, invoke an approved feature capability, and read Custom Widget authoring resources without secret or cross-user leakage.

**Start prerequisites:** `FOUNDATION` ApiKey/Bearer and policy interfaces; agreed local descriptor/raw-input/safe-result contracts; schema converter decision for catalog generation. Feature tool services and Custom Widget resource/prompt interfaces can be developed independently; no OAuth-login prerequisite for ApiKey catalog work.

**Exclusive domain:** Local MCP SDK Fetch host, curated extraction/diagnostics/private catalog caching and shared authorized dispatcher. Feature descriptions/schemas/policies/resources belong to their feature owners. Extended owns Assistant activation/approval and Custom Widget authoring UI/content; core owns API-key records. Composition writer chooses central catalog/mount.

- [ ] All 133 source candidates are accounted for exactly once; aliases resolve to their application owners. Kubernetes' three wrappers preserve their admin/input semantics without running equivalent policy middleware twice. The 71 eager non-candidates and nine annotation-only application leaves are not accidentally exposed.
- [ ] Enabled-only non-subscription selection, valid unique names, deterministic collision omission/diagnostics and schema compilation have explicit acceptance; no-input dispatch, transforms/refinements and raw-input validation execute once. Name redesign is allowed; discovery prerequisites/destructive guidance are not discarded.
- [ ] ApiKey-then-Bearer, no-cookie identity; private identity-scoped catalog cache; non-admin Custom Widget hiding; and safe failure/result projections are exercised. A listed admin tool still enforces execution authorization.
- [ ] Admin authoring prompt/resources/templates retain their actual content/MIME/decoding/unknown-resource behavior via extended-owned services. A catalog tool's existence never auto-approves an Assistant action.
- [ ] MCP Streamable HTTP framing/status/lifecycle remain SDK protocol work, not oRPC SSE. Focused tools/list/call, safe-error and resource acceptance use a real feature contribution; old `/sse`/`message` 410 aliases need not exist under the confirmed complete-rewrite policy.

**Integrated gate:** All candidates and non-tool capabilities have deliberate replacement dispositions and authenticated runtime schema/catalog evidence. Static candidate counts are not a claimed successful tools/list count.

### TRANSPORT-OAUTH — Connect an MCP client through login, PKCE and discovery

**Delivers:** A client registers, discovers the authorization server/resource, continues through Homarr login, exchanges a single-use PKCE code and invokes an MCP tool with the resulting durable Bearer credential.

**Start prerequisites:** Core's Auth.js Core Fetch proof and agreed identity/login continuation, trusted-origin/resource and token repository contracts; singleton state/consent/expiry decisions. OAuth store/service construction can begin against interfaces before production providers finish. TRANSPORT-MCP's credential/dispatch contract is needed; its full catalog completion is not.

**Runnable prerequisites:** A real identity session and MCP tool host/contribution. No fake authentication substitute for the end-to-end login acceptance.

**Exclusive domain:** OAuth/discovery Fetch adapters and bounded singleton client/code/pending/rate-limit lifecycle. Core retains login/session/provider/API-key persistence; composition writer owns mounts/aliases.

- [ ] Public registration validates bounded HTTP(S) redirect lists and applies bounded IP-sensitive rate limits without retaining/logging unnecessary identifiers. No accidental admin/session requirement is added to client registration.
- [ ] Authorize/login continuation enforces exact registered redirect, intended resource, S256 and owned pending state; forwarded origin is trusted deliberately, not copied unvalidated from arbitrary headers.
- [ ] Code consumption is single-use, PKCE/redirect/resource validated, and ambiguous token issuance is not auto-retried. Issued credentials are hashed durably with no token/code/secret logging; persistence/key revocation is core-owned.
- [ ] Discovery JSON, CORS/preflight, WWW-Authenticate and failure/retry signaling agree with the chosen canonical resources and changed routes. Legacy discovery rewrites are not required, but discovery must remain interoperable with new canonical routes.
- [ ] Singleton TTL/bounds/restart/shutdown behavior is explicit for ephemeral registration/code/pending/rate-limit state versus durable API keys; focused replay/mismatch/expiry/privacy regressions and a real MCP client login are future acceptance.

**Integrated gate:** Actual credentials/LDAP/OIDC/session lifecycle acceptance from identity plus the real registration→login→token→tool path. Shared Redis or durable registrations are open design choices, not invented cluster requirements.

### TRANSPORT-STREAMS — Run feature-owned streams with bounded disconnect and shutdown

**Delivers:** Log, job-status, Docker-log and Beszel live consumers can receive correctly reduced typed events through the selected Nitro realtime host, disconnect/reconnect and stop cleanly. Assistant UIMessage and MCP streams stay separate and feature/protocol-owned.

**Start prerequisites:** Named primary realtime transport/exposure decision and long-lived identity/origin/expiry/revocation contract; `COORDINATION` lifecycle contract and feature-owned event/cleanup interfaces. Generator/service authoring does not wait for the transport decision or all operations/widget features.

**Runnable prerequisites:** At least one real feature generator and owned UI consumer; independently mount others as ready. All four implementations are an integrated gate, not a start dependency on every feature.

**Exclusive domain:** Local shared stream host/client framing, keepalive/backpressure/disconnect wiring and its shutdown interface. Extended owns three operations stream generators, reducers and UI; widgets owns Beszel generator/reducer/UI. Core owns one scheduler/server lifecycle; no second listener/scheduler appears here.

- [ ] Selected SSE/WS host supports the four declared event contracts; log accumulation, keyed job updates and Beszel snapshot merge are distinct. Latest-event replacement is not applied universally; existing batching need not remain a wire capability.
- [ ] Log subscribe-before-history ordering/deduplication, explicitly bounded buffering and close-before-setup behavior work; Docker late async setup always disposes; Beszel queue-of-four/drop-oldest and abort behavior are retained or deliberately revised without feature loss.
- [ ] Reconnect refreshes appropriate snapshots without inventing durable pub/sub replay or blindly reissuing mutations. Job subscriptions never start a scheduler. Event IDs imply replay only if a retained source exists.
- [ ] Long-lived authorization rejects expired/revoked principals and handles permission changes/origin checks under the agreed policy; moving streams to SSE does not silently add Bearer/ApiKey access. Session expiry gaps are not copied as desired behavior.
- [ ] Slow readers, abort before/after setup, errors after headers, terminal events and singleton shutdown leave no upstream subscription alive. Selected preset/proxy buffering/flush/timeouts are demonstrated later, not claimed proven by static types.

**Integrated gate:** Four feature-owned stream demonstrations plus separate Assistant approval/UIMessage abort and MCP SDK lifecycle acceptance. If WS is selected, ordered experimental CrossWS message handling and close on every path are explicit obligations.

## Decisions — proposals, not approvals

| Decision key | Proposal | Alternatives / affected gate |
| --- | --- | --- |
| DEC-REALTIME-PRIMARY | oRPC Fetch SSE for the four typed application streams, with distinct reducers; do not require WS for ordinary calls | WS for three operations streams plus SSE Beszel remains viable; choose transport independently from WS callable surface. Blocks shared stream mounts, not ordinary Q/M extraction |
| DEC-WS-EXPOSURE | Do not retain the full 334-procedure WS host by default; subscriptions-only if WS is selected | Full-router WS is a capability/exposure decision, not compelled by old external contracts; no compatibility adapter assumed |
| DEC-OUTPUT-CONTRACT | Accurate explicit outputs at client-safe parallel/public/event boundaries; staged internal code-first exceptions only when named | Many source results are inferred. Feature owners derive real safe DTOs; unknown output is not complete typed parity. Blocks affected contract/client acceptance, not service extraction |
| DEC-OPENAPI-AUTHORITY | One curated oRPC public document; use 3.1 if tool compatibility favors it; document protocol/binary routes separately unless useful together | Choose exact version/status/body/error/void/projection semantics and explorer. Default generator version is not approval; runtime selection must equal intended exposure |
| DEC-SCHEMA-CONVERTER | Verify a converter matching chosen schemas or deliberately align Zod and oRPC converter versions via composition writer | Research cites Zod 4.4.3 versus converter peer >=4.5.0. This blocks generated-schema acceptance, not every domain service |
| DEC-REALTIME-IDENTITY | Cookie/session-derived principal with explicit expiry, revocation, permission refresh and allowed-origin policy | Decide refresh cadence, shutdown/heartbeat/reconnect and bounded log limits. Never silently inherit expired-session acceptance or broaden credentials |
| DEC-OAUTH-STATE | Bounded TTL singleton ephemeral state with explicitly documented restart behavior; durable issued API keys | Redis remains possible; persistent registrations/consent/token lifespan need a conscious policy. Singleton does not imply registrations must become durable |
| DEC-RUNTIME-ORIGIN | One trusted forwarded-origin contract and Nitro preset/HTTP lifecycle authority supplied by core | Required for redirect/discovery/spec URLs and secure cookies; exact Nitro release/preset is not settled here |

No user approval is invented for these choices. Auth.js Core Fetch proof, retained Mantine, standalone use-intl, SQLite+optionalPG, singleton production and TanStack route conventions are confirmed constraints, not questions repeated here.

### Dependency graph: start contracts are not release dependencies

| slice_key | true_start_blockers | local_runnable_acceptance_inputs | final_integrated_gate |
| --- | --- | --- | --- |
| TRANSPORT-RPC | FOUNDATION interfaces; first output contract choice; named COMPOSITION writer | minimal core Nitro host; one real domain contribution and browser/server consumer | all 334 feature-owned contributions, identity/cache/hydration/policy acceptance |
| TRANSPORT-REST | ApiKey policy/public-descriptor interfaces; DEC-OPENAPI-AUTHORITY; DEC-SCHEMA-CONVERTER | shared host interfaces; one real public contribution; explorer consumer | all 52 source selections deliberately mapped and generated-schema/client evidence |
| TRANSPORT-MCP | MCP identity/descriptor/raw-dispatch/result interfaces; DEC-SCHEMA-CONVERTER | SDK host; one real tool and authoring-resource service; internal Assistant dispatcher consumer | all 133 candidate dispositions, runtime schema/catalog/resource/approval evidence |
| TRANSPORT-OAUTH | Auth.js Core Fetch proof; identity/trusted-origin/token contracts; DEC-OAUTH-STATE | real login session, durable credential repository and one MCP tool | real providers/session expiry/revocation plus full registration/login/PKCE/token/tool acceptance |
| TRANSPORT-STREAMS | DEC-REALTIME-PRIMARY; DEC-WS-EXPOSURE if WS; realtime identity and lifecycle/event interfaces | one feature generator/UI consumer at a time; chosen Nitro host | all four stream consumers plus separate Assistant/MCP lifecycle evidence |

Shared interface reuse does not require waiting for another entire transport slice to finish: REST and MCP can consume a frozen host/context contract while RPC's feature/client acceptance progresses. OAuth code/store work can proceed after its identity proof/contracts without waiting for every MCP tool. Feature services/contracts can start independently under the agreed interfaces; no unauthenticated policy-bypassing mount is an acceptable shortcut. Final integrated gates are coordinator release edges, not a chain making all feature tickets wait for a completed infrastructure rewrite.

## Machine-readable ledger conventions

Tables are relational Markdown. `application_path` is the unique primary key; `kind` is Q/M/S; `primary_owner` is one semantic family key, **never a second transport owner**. `rest_id` joins the 52-operation table; `mcp_candidate` is the exact source eager name, or `-`. Each nonempty MCP cell identifies one candidate and one application owner, including Kubernetes wrapper aliases. Every source procedure inherits its source schemas, policy, services, privacy/error/serialization/durable-state obligations from the cited research; the short key is not permission to simplify them.

REST and MCP columns are projections of the same leaf, not new application registrations. Names/paths are source evidence only. Per-feature replacement contracts may change with a deliberate capability disposition. `?` source callers remain owned capabilities, not dead-code authorization.

### Primary procedure ledger — 334 unique paths

| application_path | kind | primary_owner | rest_id | mcp_candidate |
| --- | --- | --- | --- | --- |
| assistant.getAvailability | Q | extended.ASSISTANT-RUNTIME | - | - |
| assistant.getContextEntities | Q | extended.ASSISTANT-RUNTIME | - | - |
| assistant.getModelCapabilities | Q | extended.ASSISTANT-RUNTIME | - | - |
| assistant.getRuntimeOptions | Q | extended.ASSISTANT-RUNTIME | - | - |
| assistant.getAdminConfiguration | Q | extended.ASSISTANT-CONFIGURATION | - | - |
| assistant.updateConnection | M | extended.ASSISTANT-CONFIGURATION | - | - |
| assistant.clearCredentials | M | extended.ASSISTANT-CONFIGURATION | - | - |
| assistant.discoverModels | Q | extended.ASSISTANT-CONFIGURATION | - | - |
| assistant.updateConfiguration | M | extended.ASSISTANT-CONFIGURATION | - | - |
| assistant.listThreads | Q | extended.ASSISTANT-CONVERSATIONS | - | - |
| assistant.createThread | M | extended.ASSISTANT-CONVERSATIONS | - | - |
| assistant.updateThreadModel | M | extended.ASSISTANT-CONVERSATIONS | - | - |
| assistant.getThread | Q | extended.ASSISTANT-CONVERSATIONS | - | - |
| assistant.getGenerationTelemetry | Q | extended.ASSISTANT-CONVERSATIONS | - | - |
| assistant.renameThread | M | extended.ASSISTANT-CONVERSATIONS | - | - |
| assistant.deleteThread | M | extended.ASSISTANT-CONVERSATIONS | - | - |
| assistant.appendMessage | M | extended.ASSISTANT-CONVERSATIONS | - | - |
| assistant.submitFeedback | M | extended.ASSISTANT-CONVERSATIONS | - | - |
| assistant.deleteMessages | M | extended.ASSISTANT-CONVERSATIONS | - | - |
| user.initUser | M | core.ACCOUNTS | - | - |
| user.register | M | core.ACCOUNTS | - | - |
| user.create | M | core.ACCOUNTS | R30 | user_create |
| user.setProfileImage | M | core.ACCOUNTS | R31 | - |
| user.getAll | Q | core.ACCOUNTS | R32 | user_getAll |
| user.selectable | Q | core.ACCOUNTS | R33 | - |
| user.search | Q | core.ACCOUNTS | R34 | - |
| user.getPreferences | Q | core.PREFERENCES | R35 | user_getPreferences |
| user.getById | Q | core.ACCOUNTS | R36 | user_getById |
| user.editProfile | M | core.ACCOUNTS | R37 | - |
| user.delete | M | core.ACCOUNTS | R38 | user_delete |
| user.changePassword | M | core.ACCOUNTS | R39 | - |
| user.updatePreferences | M | core.PREFERENCES | R40 | user_updatePreferences |
| user.changeHomeBoards | M | core.PREFERENCES | R41 | - |
| user.changeDefaultSearchEngine | M | core.PREFERENCES | R42 | - |
| user.changeSearchPreferences | M | core.PREFERENCES | R43 | - |
| user.changeColorScheme | M | core.PREFERENCES | R44 | - |
| user.changeByteUnitSystem | M | core.PREFERENCES | - | - |
| user.changeEnableRightClickOnWidgets | M | core.PREFERENCES | R45 | - |
| user.changePingIconsEnabled | M | core.PREFERENCES | - | - |
| user.changeHeaderPreferences | M | core.PREFERENCES | R46 | - |
| user.changeDdgBangs | M | core.PREFERENCES | R47 | - |
| user.changeFirstDayOfWeek | M | core.PREFERENCES | R48 | - |
| user.completeTour | M | core.PREFERENCES | - | - |
| user.resetTours | M | core.PREFERENCES | - | - |
| user.getTourStatus | Q | core.PREFERENCES | - | - |
| group.getAll | Q | core.GROUP-ACCESS | - | - |
| group.getPaginated | Q | core.GROUP-ACCESS | - | - |
| group.getById | Q | core.GROUP-ACCESS | - | - |
| group.selectable | Q | core.GROUP-ACCESS | - | - |
| group.search | Q | core.GROUP-ACCESS | - | - |
| group.createInitialExternalGroup | M | core.GROUP-ACCESS | - | - |
| group.createGroup | M | core.GROUP-ACCESS | - | - |
| group.updateGroup | M | core.GROUP-ACCESS | - | - |
| group.savePartialSettings | M | core.GROUP-ACCESS | - | - |
| group.savePositions | M | core.GROUP-ACCESS | - | - |
| group.savePermissions | M | core.GROUP-ACCESS | - | - |
| group.transferOwnership | M | core.GROUP-ACCESS | - | - |
| group.deleteGroup | M | core.GROUP-ACCESS | - | - |
| group.addMember | M | core.GROUP-ACCESS | - | - |
| group.removeMember | M | core.GROUP-ACCESS | - | - |
| invite.getAll | Q | core.INVITES | R25 | invite_getAll |
| invite.createInvite | M | core.INVITES | R26 | invite_createInvite |
| invite.deleteInvite | M | core.INVITES | R27 | invite_deleteInvite |
| integration.request | M | integrations.HTTP-REQUEST | R51 | integration_request |
| integration.testConnection | Q | integrations.MANAGEMENT | R52 | - |
| integration.getKinds | Q | integrations.MANAGEMENT | - | integration_getKinds |
| integration.all | Q | integrations.MANAGEMENT | - | integration_all |
| integration.allThatSupportSearch | Q | integrations.MANAGEMENT | - | - |
| integration.allOfGivenCategory | Q | integrations.MANAGEMENT | - | - |
| integration.search | Q | integrations.MANAGEMENT | - | integration_search |
| integration.byIds | Q | integrations.MANAGEMENT | - | - |
| integration.byId | Q | integrations.MANAGEMENT | - | integration_byId |
| integration.create | M | integrations.MANAGEMENT | - | integration_create |
| integration.update | M | integrations.MANAGEMENT | - | - |
| integration.delete | M | integrations.MANAGEMENT | - | integration_delete |
| integration.getIntegrationPermissions | Q | integrations.MANAGEMENT | - | - |
| integration.saveUserIntegrationPermissions | M | integrations.MANAGEMENT | - | - |
| integration.saveGroupIntegrationPermissions | M | integrations.MANAGEMENT | - | - |
| integration.searchInIntegration | Q | integrations.SEARCH | - | integration_searchInIntegration |
| integration.mediaRequestSearchTargets | Q | integrations.MEDIA-REQUEST | - | integration_mediaRequestSearchTargets |
| integration.searchMediaRequests | Q | integrations.MEDIA-REQUEST | - | integration_searchMediaRequests |
| integration.getMediaRequestOptions | Q | integrations.MEDIA-REQUEST | - | integration_getMediaRequestOptions |
| integration.requestMedia | M | integrations.MEDIA-REQUEST | - | integration_requestMedia |
| board.exists | Q | dashboard.BOARD-CATALOG | - | - |
| board.getPublicBoards | Q | dashboard.BOARD-CATALOG | - | - |
| board.getBoardsForGroup | Q | dashboard.BOARD-CATALOG | - | - |
| board.getAllBoards | Q | dashboard.BOARD-CATALOG | R09 | board_getAllBoards |
| board.getManageOverview | Q | dashboard.BOARD-CATALOG | - | - |
| board.catalog | Q | dashboard.BOARD-CATALOG | - | board_catalog |
| board.search | Q | dashboard.BOARD-CATALOG | - | board_search |
| board.createBoard | M | dashboard.BOARD-LIFECYCLE | R10 | board_createBoard |
| board.duplicateBoard | M | dashboard.BOARD-LIFECYCLE | R11 | board_duplicateBoard |
| board.renameBoard | M | dashboard.BOARD-LIFECYCLE | R12 | board_renameBoard |
| board.changeBoardVisibility | M | dashboard.BOARD-LIFECYCLE | R13 | board_changeBoardVisibility |
| board.deleteBoard | M | dashboard.BOARD-LIFECYCLE | R14 | board_deleteBoard |
| board.setHomeBoard | M | dashboard.HOME | R15 | board_setHomeBoard |
| board.setMobileHomeBoard | M | dashboard.HOME | R16 | board_setMobileHomeBoard |
| board.getHomeBoard | Q | dashboard.HOME | - | - |
| board.getBoardByName | Q | dashboard.BOARD-RUNTIME | - | board_getBoardByName |
| board.getBoardSettings | Q | dashboard.BOARD-SETTINGS | R17 | board_getBoardSettings |
| board.saveLayouts | M | dashboard.BOARD-SETTINGS | R18 | board_saveLayouts |
| board.resetLayout | M | dashboard.BOARD-SETTINGS | R19 | board_resetLayout |
| board.savePartialBoardSettings | M | dashboard.BOARD-SETTINGS | R20 | board_savePartialBoardSettings |
| board.saveBoard | M | dashboard.BOARD-EDITOR | R21 | board_saveBoard |
| board.getBoardPermissions | Q | dashboard.BOARD-ACCESS | - | - |
| board.saveUserBoardPermissions | M | dashboard.BOARD-ACCESS | - | - |
| board.saveGroupBoardPermissions | M | dashboard.BOARD-ACCESS | - | - |
| board.addItem | M | dashboard.BOARD-EDITOR | R22 | board_addItem |
| board.updateItemLayout | M | dashboard.BOARD-EDITOR | R23 | board_updateItemLayout |
| app.getPaginated | Q | dashboard.APPS | R01 | app_getPaginated |
| app.all | Q | dashboard.APPS | R02 | app_all |
| app.search | Q | dashboard.APPS | R03 | app_search |
| app.selectable | Q | dashboard.APPS | R04 | - |
| app.byId | Q | dashboard.APPS | R05 | app_byId |
| app.byIds | Q | dashboard.APPS | - | - |
| app.create | M | dashboard.APPS | R06 | app_create |
| app.createMany | M | dashboard.APPS | - | - |
| app.update | M | dashboard.APPS | R07 | app_update |
| app.delete | M | dashboard.APPS | R08 | app_delete |
| searchEngine.getPaginated | Q | dashboard.SEARCH | - | - |
| searchEngine.getSelectable | Q | dashboard.SEARCH | - | - |
| searchEngine.byId | Q | dashboard.SEARCH | - | - |
| searchEngine.getDefaultSearchEngine | Q | dashboard.SEARCH | - | - |
| searchEngine.catalog | Q | dashboard.SEARCH | - | searchEngine_catalog |
| searchEngine.search | Q | dashboard.SEARCH | - | - |
| searchEngine.create | M | dashboard.SEARCH | - | - |
| searchEngine.update | M | dashboard.SEARCH | - | - |
| searchEngine.delete | M | dashboard.SEARCH | - | - |
| section.changeCollapsed | M | dashboard.BOARD-EDITOR | - | - |
| location.searchCity | Q | integrations.LOCATION | - | - |
| log.subscribe | S | extended.LOGS | - | - |
| icon.findIcons | Q | integrations.ICONS | - | icon_findIcons |
| onboard.currentStep | Q | extended.ONBOARDING | - | - |
| onboard.nextStep | M | extended.ONBOARDING | - | - |
| onboard.testIntegration | M | extended.ONBOARDING | - | - |
| onboard.detectRuntimeCapabilities | Q | extended.ONBOARDING | - | - |
| onboard.discoverDockerServices | Q | extended.ONBOARDING | - | - |
| onboard.completeSetup | M | extended.ONBOARDING | - | - |
| home.getStats | Q | dashboard.MANAGEMENT | - | - |
| docker.reconcileServices | Q | extended.DOCKER | - | docker_reconcileServices |
| docker.getServiceHealth | Q | extended.DOCKER | - | docker_getServiceHealth |
| docker.refreshInventory | M | extended.DOCKER | - | docker_refreshInventory |
| docker.getContainers | Q | extended.DOCKER | - | docker_getContainers |
| docker.getEndpoints | Q | extended.DOCKER | - | docker_getEndpoints |
| docker.startAll | M | extended.DOCKER | - | docker_startAll |
| docker.stopAll | M | extended.DOCKER | - | docker_stopAll |
| docker.restartAll | M | extended.DOCKER | - | docker_restartAll |
| docker.removeAll | M | extended.DOCKER | - | docker_removeAll |
| docker.logs | Q | extended.DOCKER | - | docker_logs |
| docker.subscribeLogs | S | extended.DOCKER | - | - |
| kubernetes.contexts.getContexts | Q | extended.KUBERNETES | - | kubernetes_contexts_getContexts |
| kubernetes.nodes.getNodes | Q | extended.KUBERNETES | - | - |
| kubernetes.cluster.getCluster | Q | extended.KUBERNETES | - | - |
| kubernetes.cluster.getClusterResourceCounts | Q | extended.KUBERNETES | - | - |
| kubernetes.namespaces.getNamespaces | Q | extended.KUBERNETES | - | - |
| kubernetes.ingresses.getIngresses | Q | extended.KUBERNETES | - | kubernetes_ingresses_getIngresses |
| kubernetes.services.getServices | Q | extended.KUBERNETES | - | - |
| kubernetes.pods.getPods | Q | extended.KUBERNETES | - | kubernetes_pods_getPods |
| kubernetes.secrets.getSecrets | Q | extended.KUBERNETES | - | - |
| kubernetes.configMaps.getConfigMaps | Q | extended.KUBERNETES | - | - |
| kubernetes.volumes.getVolumes | Q | extended.KUBERNETES | - | - |
| serverSettings.getCulture | Q | core.SETTINGS | - | - |
| serverSettings.getAll | Q | core.SETTINGS | - | - |
| serverSettings.getBranding | Q | core.SETTINGS | - | serverSettings_getBranding |
| serverSettings.getBoardSettings | Q | core.SETTINGS | R28 | serverSettings_getBoardSettings |
| serverSettings.updateBoardSettings | M | core.SETTINGS | R29 | serverSettings_updateBoardSettings |
| serverSettings.saveSettings | M | core.SETTINGS | - | - |
| cronJobs.triggerJob | M | extended.TASKS | - | - |
| cronJobs.startJob | M | extended.TASKS | - | - |
| cronJobs.stopJob | M | extended.TASKS | - | - |
| cronJobs.updateJobInterval | M | extended.TASKS | - | - |
| cronJobs.disableJob | M | extended.TASKS | - | - |
| cronJobs.enableJob | M | extended.TASKS | - | - |
| cronJobs.getJobs | Q | extended.TASKS | - | - |
| cronJobs.subscribeToStatusUpdates | S | extended.TASKS | - | - |
| apiKeys.getAll | Q | core.API-KEYS | - | apiKeys_getAll |
| apiKeys.create | M | core.API-KEYS | - | - |
| apiKeys.delete | M | core.API-KEYS | - | apiKeys_delete |
| media.getPaginated | Q | extended.MEDIA | - | - |
| media.uploadMedia | M | extended.MEDIA | - | - |
| media.deleteMedia | M | extended.MEDIA | - | - |
| updateChecker.getAvailableUpdates | Q | integrations.UPDATES | - | - |
| certificates.getCertificate | Q | integrations.CERTIFICATES | R49 | - |
| certificates.ensureRootCertificate | M | integrations.CERTIFICATES | R50 | - |
| certificates.addCertificate | M | integrations.CERTIFICATES | - | - |
| certificates.trustHostnameMismatch | M | integrations.CERTIFICATES | - | - |
| certificates.removeTrustedHostname | M | integrations.CERTIFICATES | - | - |
| certificates.removeCertificate | M | integrations.CERTIFICATES | - | - |
| bangs.search | Q | dashboard.SEARCH | - | - |
| analytics.sendAnalytics | M | core.TELEMETRY | - | - |
| info.getInfo | Q | core.RUNTIME-INFO | R24 | info_getInfo |
| info.isDemoMode | Q | core.RUNTIME-INFO | - | - |
| info.isDemoReadOnly | Q | core.RUNTIME-INFO | - | - |
| widget.stats.catalog | Q | widgets.STATS | - | stats_catalog |
| widget.stats.snapshot | Q | widgets.STATS | - | stats_snapshot |
| widget.stats.refresh | M | widgets.STATS | - | stats_refresh |
| widget.archiveTeamWarrior.getStatus | Q | widgets.ARCHIVE-TEAM-WARRIOR | - | - |
| widget.beszel.getSystems | Q | widgets.BESZEL | - | beszel_getSystems |
| widget.beszel.getAlerts | Q | widgets.BESZEL | - | beszel_getAlerts |
| widget.beszel.getSystemStats | Q | widgets.BESZEL | - | beszel_getSystemStats |
| widget.beszel.subscribeSystemStats | S | widgets.BESZEL | - | - |
| widget.anchorNotes.listNotes | Q | widgets.ANCHOR-NOTES | - | - |
| widget.anchorNotes.getNote | Q | widgets.ANCHOR-NOTES | - | - |
| widget.anchorNotes.updateNote | M | widgets.ANCHOR-NOTES | - | - |
| widget.coolify.getInstancesInfo | Q | widgets.COOLIFY | - | - |
| widget.immich.getServerStats | Q | widgets.IMMICH | - | - |
| widget.immich.getAlbum | Q | widgets.IMMICH | - | - |
| widget.immich.getAlbumPreview | Q | widgets.IMMICH | - | - |
| widget.immich.getAlbums | Q | widgets.IMMICH | - | - |
| widget.paperlessNgx.getStats | Q | widgets.PAPERLESS-NGX | - | - |
| widget.patchmon.getStats | Q | widgets.PATCHMON | - | patchmon_getStats |
| widget.bazarr.getBadges | Q | widgets.BAZARR | - | bazarr_getBadges |
| widget.notebook.updateContent | M | widgets.NOTEBOOK | - | - |
| widget.weather.atLocation | Q | widgets.WEATHER | - | - |
| widget.airQuality.atLocation | Q | widgets.AIR-QUALITY | - | airQuality_atLocation |
| widget.app.ping | Q | widgets.APP-PING | - | - |
| widget.dnsHole.summary | Q | widgets.DNS-HOLE | - | dnsHole_summary |
| widget.dnsHole.enable | M | widgets.DNS-HOLE | - | dnsHole_enable |
| widget.dnsHole.disable | M | widgets.DNS-HOLE | - | dnsHole_disable |
| widget.smartHome.entityState | Q | widgets.SMART-HOME | - | smartHome_entityState |
| widget.smartHome.entityDetails | Q | widgets.SMART-HOME | - | smartHome_entityDetails |
| widget.smartHome.switchEntity | M | widgets.SMART-HOME | - | smartHome_switchEntity |
| widget.smartHome.executeAutomation | M | widgets.SMART-HOME | - | smartHome_executeAutomation |
| widget.stockPrice.getPriceHistory | Q | widgets.STOCKS | - | - |
| widget.mediaServer.getCurrentStreams | Q | widgets.MEDIA-SERVER | - | mediaServer_getCurrentStreams |
| widget.mediaRelease.getMediaReleases | Q | widgets.MEDIA-RELEASE | - | - |
| widget.calendar.findAllEvents | Q | widgets.CALENDAR | - | calendar_findAllEvents |
| widget.downloads.getJobsAndStatuses | Q | widgets.DOWNLOADS | - | downloads_getJobsAndStatuses |
| widget.downloads.pause | M | widgets.DOWNLOADS | - | downloads_pause |
| widget.downloads.pauseItem | M | widgets.DOWNLOADS | - | - |
| widget.downloads.resume | M | widgets.DOWNLOADS | - | downloads_resume |
| widget.downloads.resumeItem | M | widgets.DOWNLOADS | - | - |
| widget.downloads.deleteItem | M | widgets.DOWNLOADS | - | - |
| widget.mediaRequests.getLatestRequests | Q | widgets.MEDIA-REQUESTS | - | mediaRequests_getLatestRequests |
| widget.mediaRequests.getStats | Q | widgets.MEDIA-REQUESTS | - | mediaRequests_getStats |
| widget.mediaRequests.answerRequest | M | widgets.MEDIA-REQUESTS | - | mediaRequests_answerRequest |
| widget.mediaOrganizer.getData | Q | widgets.MEDIA-ORGANIZER | - | mediaOrganizer_getData |
| widget.rssFeed.getFeeds | Q | widgets.RSS-FEED | - | - |
| widget.indexerManager.getIndexersStatus | Q | widgets.INDEXER-MANAGER | - | - |
| widget.indexerManager.testAllIndexers | M | widgets.INDEXER-MANAGER | - | - |
| widget.healthMonitoring.getSystemHealthStatus | Q | widgets.HEALTH-MONITORING | - | healthMonitoring_getSystemHealthStatus |
| widget.healthMonitoring.listStorageVolumes | Q | widgets.HEALTH-MONITORING | - | healthMonitoring_listStorageVolumes |
| widget.healthMonitoring.getClusterHealthStatus | Q | widgets.HEALTH-MONITORING | - | healthMonitoring_getClusterHealthStatus |
| widget.mediaTranscoding.getDataAsync | Q | widgets.MEDIA-TRANSCODING | - | - |
| widget.minecraft.getServerStatus | Q | widgets.MINECRAFT | - | - |
| widget.options.getWidgetOptionSettings | Q | widgets.OPTIONS | - | - |
| widget.options.saveItemOptions | M | widgets.OPTIONS | - | - |
| widget.releases.getLatest | Q | widgets.RELEASES | - | - |
| widget.networkController.summary | Q | widgets.NETWORK-CONTROLLER | - | - |
| widget.firewall.getFirewallCpuStatus | Q | widgets.FIREWALL | - | - |
| widget.firewall.getFirewallInterfacesStatus | Q | widgets.FIREWALL | - | - |
| widget.firewall.getFirewallVersionStatus | Q | widgets.FIREWALL | - | - |
| widget.firewall.getFirewallMemoryStatus | Q | widgets.FIREWALL | - | - |
| widget.notifications.deleteNotification | M | widgets.NOTIFICATIONS | - | - |
| widget.notifications.getNotifications | Q | widgets.NOTIFICATIONS | - | - |
| widget.timetable.getTimetable | Q | widgets.TIMETABLE | - | - |
| widget.timetable.searchStations | Q | widgets.TIMETABLE | - | - |
| widget.tracearr.getDashboard | Q | widgets.TRACEARR | - | - |
| widget.speedtestTracker.getDashboard | Q | widgets.SPEEDTEST-TRACKER | - | - |
| widget.uptimeKuma.getDashboard | Q | widgets.UPTIME-KUMA | - | - |
| widget.audioStats.getStats | Q | widgets.AUDIO-STATS | - | - |
| widget.umami.getWebsites | Q | widgets.UMAMI | - | - |
| widget.umami.getVisitorStats | Q | widgets.UMAMI | - | - |
| widget.umami.getEventNames | Q | widgets.UMAMI | - | - |
| widget.umami.getTopPages | Q | widgets.UMAMI | - | - |
| widget.umami.getTopReferrers | Q | widgets.UMAMI | - | - |
| widget.umami.getMultiEventTimeSeries | Q | widgets.UMAMI | - | - |
| widget.umami.getActiveVisitors | Q | widgets.UMAMI | - | - |
| widget.vpn.getSummaries | Q | widgets.VPN | - | - |
| widget.ups.getSummaries | Q | widgets.UPS | - | - |
| widget.traefik.getDashboard | Q | widgets.TRAEFIK | - | traefik_getDashboard |
| widget.customApi.refresh | M | widgets.CUSTOM-API | - | - |
| widget.customApi.getData | Q | widgets.CUSTOM-API | - | - |
| widget.customApi.queryRequest | Q | widgets.CUSTOM-API | - | - |
| widget.customApi.executeAction | M | widgets.CUSTOM-API | - | - |
| widget.secrets.setSecret | M | widgets.SECRETS | - | widgetSecrets_setSecret |
| widget.secrets.deleteSecret | M | widgets.SECRETS | - | widgetSecrets_deleteSecret |
| widget.secrets.getConfiguredKinds | Q | widgets.SECRETS | - | widgetSecrets_getConfiguredKinds |
| widget.wud.getStats | Q | widgets.WUD | - | wud_getStats |
| widget.llamacpp.getStats | Q | widgets.LLAMACPP | - | - |
| widget.wazuh.getAgents | Q | widgets.WAZUH | - | - |
| widget.wazuh.getAlerts | Q | widgets.WAZUH | - | - |
| widget.wazuh.getSummary | Q | widgets.WAZUH | - | - |
| widget.wazuh.getTimeline | Q | widgets.WAZUH | - | - |
| widget.wazuh.getTopList | Q | widgets.WAZUH | - | - |
| widget.wazuh.getVulnerabilities | Q | widgets.WAZUH | - | - |
| widget.wazuh.getFim | Q | widgets.WAZUH | - | - |
| widget.wazuh.getAuthFailures | Q | widgets.WAZUH | - | - |
| customWidget.schema | Q | extended.CW-AUTHORING | - | customWidget_schema |
| customWidget.getAuthoringPrompt | Q | extended.CW-AUTHORING | - | customWidget_getAuthoringPrompt |
| customWidget.getSkill | Q | extended.CW-AUTHORING | - | customWidget_getSkill |
| customWidget.getReference | Q | extended.CW-AUTHORING | - | customWidget_getReference |
| customWidget.getComponentCatalog | Q | extended.CW-AUTHORING | - | customWidget_getComponentCatalog |
| customWidget.findComponents | Q | extended.CW-AUTHORING | - | customWidget_findComponents |
| customWidget.getComponent | Q | extended.CW-AUTHORING | - | customWidget_getComponent |
| customWidget.getComponents | Q | extended.CW-AUTHORING | - | customWidget_getComponents |
| customWidget.getSharedProps | Q | extended.CW-AUTHORING | - | customWidget_getSharedProps |
| customWidget.getExample | Q | extended.CW-AUTHORING | - | customWidget_getExample |
| customWidget.validateTemplate | Q | extended.CW-AUTHORING | - | customWidget_validateTemplate |
| customWidget.validate | Q | extended.CW-AUTHORING | - | customWidget_validate |
| customWidget.list | Q | extended.CW-MANAGEMENT | - | customWidget_list |
| customWidget.legacyMigrationPrompt | Q | extended.CW-TRANSFER | - | customWidget_legacyMigrationPrompt |
| customWidget.get | Q | extended.CW-MANAGEMENT | - | customWidget_get |
| customWidget.available | Q | extended.CW-MANAGEMENT | - | - |
| customWidget.optionRequest | Q | extended.CW-SOURCES | - | - |
| customWidget.create | M | extended.CW-EDITOR | - | customWidget_create |
| customWidget.createFromPreview | M | extended.CW-PREVIEW | - | customWidget_createFromPreview |
| customWidget.updateFromPreview | M | extended.CW-PREVIEW | - | customWidget_updateFromPreview |
| customWidget.update | M | extended.CW-EDITOR | - | customWidget_update |
| customWidget.secretSet | M | extended.CW-SOURCES | - | customWidget_secretSet |
| customWidget.sourceConfigure | M | extended.CW-SOURCES | - | customWidget_sourceConfigure |
| customWidget.configurationRequestUser | M | extended.CW-SOURCES | - | customWidget_configurationRequestUser |
| customWidget.secretClear | M | extended.CW-SOURCES | - | - |
| customWidget.workshopSearch | Q | extended.WORKSHOP | - | customWidget_workshopSearch |
| customWidget.workshopGet | Q | extended.WORKSHOP | - | customWidget_workshopGet |
| customWidget.workshopInstall | M | extended.WORKSHOP | - | customWidget_workshopInstall |
| customWidget.toggleEnabled | M | extended.CW-MANAGEMENT | - | - |
| customWidget.delete | M | extended.CW-MANAGEMENT | - | customWidget_delete |
| customWidget.duplicate | M | extended.CW-MANAGEMENT | - | - |
| customWidget.readTemplate | Q | extended.CW-EDITOR | - | - |
| customWidget.writeTemplate | M | extended.CW-EDITOR | - | - |
| customWidget.templatePatch | M | extended.CW-EDITOR | - | customWidget_templatePatch |
| customWidget.export | Q | extended.CW-TRANSFER | - | - |
| customWidget.exportLegacy | Q | extended.CW-TRANSFER | - | - |
| customWidget.import | M | extended.CW-TRANSFER | - | - |
| customWidget.migrateLegacy | M | extended.CW-TRANSFER | - | customWidget_migrateLegacy |
| customWidget.previewCreate | M | extended.CW-PREVIEW | - | customWidget_previewCreate |
| customWidget.previewReviseTemplate | M | extended.CW-PREVIEW | - | customWidget_previewReviseTemplate |
| customWidget.previewGet | Q | extended.CW-PREVIEW | - | - |
| customWidget.previewRefresh | M | extended.CW-PREVIEW | - | - |
| customWidget.previewQuery | Q | extended.CW-PREVIEW | - | customWidget_previewQuery |
| customWidget.setPreviewLiveActions | M | extended.CW-PREVIEW | - | - |
| customWidget.previewJournal | Q | extended.CW-PREVIEW | - | customWidget_previewJournal |
| customWidget.previewAction | M | extended.CW-PREVIEW | - | customWidget_previewAction |

### REST operation ledger — 52 source selections

`primary_owner` is obtained by exact join on `application_path` above. R IDs are local ledger identifiers, not ticket numbers. None is a separate migration ticket. Old names and path coercions are not binding on the rewrite.

| rest_id | method | source_public_path | application_path |
| --- | --- | --- | --- |
| R01 | GET | /api/apps/paginated | app.getPaginated |
| R02 | GET | /api/apps | app.all |
| R03 | GET | /api/apps/search | app.search |
| R04 | GET | /api/apps/selectable | app.selectable |
| R05 | GET | /api/apps/{id} | app.byId |
| R06 | POST | /api/apps | app.create |
| R07 | PATCH | /api/apps/{id} | app.update |
| R08 | DELETE | /api/apps/{id} | app.delete |
| R09 | GET | /api/boards | board.getAllBoards |
| R10 | POST | /api/boards | board.createBoard |
| R11 | POST | /api/boards/{id}/duplicate | board.duplicateBoard |
| R12 | PATCH | /api/boards/{id}/name | board.renameBoard |
| R13 | PATCH | /api/boards/{id}/visibility | board.changeBoardVisibility |
| R14 | DELETE | /api/boards/{id} | board.deleteBoard |
| R15 | PATCH | /api/boards/{id}/home | board.setHomeBoard |
| R16 | PATCH | /api/boards/{id}/mobile-home | board.setMobileHomeBoard |
| R17 | GET | /api/boards/{id}/settings | board.getBoardSettings |
| R18 | PUT | /api/boards/{id}/layouts | board.saveLayouts |
| R19 | POST | /api/boards/{boardId}/layouts/{layoutId}/reset | board.resetLayout |
| R20 | PATCH | /api/boards/{id}/settings | board.savePartialBoardSettings |
| R21 | PUT | /api/boards/{id}/content | board.saveBoard |
| R22 | POST | /api/boards/items | board.addItem |
| R23 | PATCH | /api/boards/{boardId}/items/{itemId}/layouts/{layoutId} | board.updateItemLayout |
| R24 | GET | /api/info | info.getInfo |
| R25 | GET | /api/invites | invite.getAll |
| R26 | POST | /api/invites | invite.createInvite |
| R27 | DELETE | /api/invites/{id} | invite.deleteInvite |
| R28 | GET | /api/settings/board | serverSettings.getBoardSettings |
| R29 | PATCH | /api/settings/board | serverSettings.updateBoardSettings |
| R30 | POST | /api/users | user.create |
| R31 | PUT | /api/users/profileImage | user.setProfileImage |
| R32 | GET | /api/users | user.getAll |
| R33 | GET | /api/users/selectable | user.selectable |
| R34 | POST | /api/users/search | user.search |
| R35 | GET | /api/users/preferences | user.getPreferences |
| R36 | GET | /api/users/{userId} | user.getById |
| R37 | PUT | /api/users/profile | user.editProfile |
| R38 | DELETE | /api/users/{userId} | user.delete |
| R39 | PATCH | /api/users/{userId}/changePassword | user.changePassword |
| R40 | PATCH | /api/users/preferences | user.updatePreferences |
| R41 | PATCH | /api/users/changeHome | user.changeHomeBoards |
| R42 | PATCH | /api/users/changeSearchEngine | user.changeDefaultSearchEngine |
| R43 | PATCH | /api/users/search-preferences | user.changeSearchPreferences |
| R44 | PATCH | /api/users/changeScheme | user.changeColorScheme |
| R45 | PATCH | /api/users/right-click-widgets | user.changeEnableRightClickOnWidgets |
| R46 | PATCH | /api/users/header-preferences | user.changeHeaderPreferences |
| R47 | PATCH | /api/users/ddg-bangs | user.changeDdgBangs |
| R48 | PATCH | /api/users/firstDayOfWeek | user.changeFirstDayOfWeek |
| R49 | GET | /api/certificates/{fileName} | certificates.getCertificate |
| R50 | POST | /api/certificates/root | certificates.ensureRootCertificate |
| R51 | POST | /api/integrations/request | integration.request |
| R52 | GET | /api/integrations/{id}/test-connection | integration.testConnection |

### MCP candidate reconciliation — exact names in the primary ledger

Every non-`-` `mcp_candidate` cell is one candidate. `eager_root` totals below allow a machine to aggregate the exact cells, without duplicating a second candidate list. Widget eager aliases and three Kubernetes wrappers are not extra application leaves. This is a static selection ledger, **not** a runtime tools/list observation.

| eager_root | application_family | candidates | primary_area |
| --- | --- | ---: | --- |
| stats | widget.stats | 3 | widgets |
| app | app | 7 | dashboard |
| apiKeys | apiKeys | 2 | core |
| board | board | 18 | dashboard |
| customWidget | customWidget | 33 | extended |
| docker | docker | 10 | extended |
| icon | icon | 1 | integrations |
| info | info | 1 | core |
| integration | integration | 12 | integrations |
| invite | invite | 3 | core |
| kubernetes | kubernetes wrapper aliases | 3 | extended |
| searchEngine | searchEngine | 1 | dashboard |
| user | user | 6 | core |
| airQuality | widget.airQuality | 1 | widgets |
| bazarr | widget.bazarr | 1 | widgets |
| serverSettings | serverSettings | 3 | core |
| beszel | widget.beszel | 3 | widgets |
| calendar | widget.calendar | 1 | widgets |
| dnsHole | widget.dnsHole | 3 | widgets |
| downloads | widget.downloads | 3 | widgets |
| healthMonitoring | widget.healthMonitoring | 3 | widgets |
| mediaRequests | widget.mediaRequests | 3 | widgets |
| mediaServer | widget.mediaServer | 1 | widgets |
| mediaOrganizer | widget.mediaOrganizer | 1 | widgets |
| patchmon | widget.patchmon | 1 | widgets |
| smartHome | widget.smartHome | 4 | widgets |
| traefik | widget.traefik | 1 | widgets |
| widgetSecrets | widget.secrets | 3 | widgets |
| wud | widget.wud | 1 | widgets |

Source eager MCP registry: 29 roots, 204 leaves = 133 candidates + 71 non-candidates; two non-candidates are Docker/Beszel subscriptions. Application annotation-only `widget.llamacpp.getStats` and Wazuh's eight leaves add nine annotation candidates outside the eager surface: 142 application annotation candidates is **not** 142 exposed tools. The 33 Custom Widget candidates are hidden from non-admin listings; remaining 100 static candidates is not a guaranteed runtime count. Subscriptions are never MCP tools.

MCP registry kind totals from the completed research are 108Q + 94M + 2S = 204. The listed enabled selections reconcile to 77Q + 56M + 0S = 133; non-candidates therefore reconcile to 31Q + 38M + 2S = 71. REST registry selection is 33Q + 45M = 78, of which the 52 metadata-bearing operations above are 17Q + 35M; the remaining 26 are selected internal leaves, not extra public operations or extra application paths. A REST POST such as user.search remains a source Q procedure: HTTP methods and application operation kinds are different fields.

### HTTP registration ledger — 26 source files, 38 method rows

`http_file_id` groups rows from one source file. Unique method key is (`http_file_id`, `method`). Domain HTTP responses are feature-owned; shared protocol hosts reference this lane's five slices. Source file names are ledger evidence (under the former app directory), not proposed target paths. More specific protocol routes take precedence over catchall REST; rewritten routing must make that explicit.

| http_file_id | source_file | method | source_path_family | primary_owner | cross_owner_consumers |
| --- | --- | --- | --- | --- | --- |
| H01 | api/trpc/[trpc]/route.ts | GET | /api/trpc/:trpc | TRANSPORT-RPC | all five feature areas; COMPOSITION |
| H01 | api/trpc/[trpc]/route.ts | POST | /api/trpc/:trpc | TRANSPORT-RPC | all five feature areas; multipart media/cert owners; COMPOSITION |
| H01 | api/trpc/[trpc]/route.ts | OPTIONS | /api/trpc/:trpc | TRANSPORT-RPC | COMPOSITION |
| H02 | api/[...trpc]/route.ts | GET | /api/* | TRANSPORT-REST | domain REST owners; COMPOSITION |
| H02 | api/[...trpc]/route.ts | POST | /api/* | TRANSPORT-REST | domain REST owners; COMPOSITION |
| H02 | api/[...trpc]/route.ts | PUT | /api/* | TRANSPORT-REST | domain REST owners; COMPOSITION |
| H02 | api/[...trpc]/route.ts | PATCH | /api/* | TRANSPORT-REST | domain REST owners; COMPOSITION |
| H02 | api/[...trpc]/route.ts | DELETE | /api/* | TRANSPORT-REST | domain REST owners; COMPOSITION |
| H02 | api/[...trpc]/route.ts | OPTIONS | /api/* | TRANSPORT-REST | COMPOSITION |
| H03 | api/auth/[...nextauth]/route.ts | GET | /api/auth/* | core.IDENTITY | TRANSPORT-OAUTH; dashboard login consumers; COMPOSITION |
| H03 | api/auth/[...nextauth]/route.ts | POST | /api/auth/* | core.IDENTITY | TRANSPORT-OAUTH; COMPOSITION |
| H04 | api/assistant/chat/route.ts | POST | /api/assistant/chat | extended.ASSISTANT-CHAT | core.IDENTITY; TRANSPORT-MCP dispatcher; COMPOSITION |
| H05 | api/mcp/route.ts | POST | /api/mcp | TRANSPORT-MCP | feature tool owners; core.API-KEYS; COMPOSITION |
| H06 | api/mcp/[transport]/route.ts | GET | /api/mcp/:transport | TRANSPORT-MCP | TRANSPORT-OAUTH; COMPOSITION |
| H06 | api/mcp/[transport]/route.ts | POST | /api/mcp/:transport | TRANSPORT-MCP | TRANSPORT-OAUTH; COMPOSITION |
| H06 | api/mcp/[transport]/route.ts | DELETE | /api/mcp/:transport | TRANSPORT-MCP | COMPOSITION |
| H07 | api/mcp/oauth/register/route.ts | POST | /api/mcp/oauth/register | TRANSPORT-OAUTH | core identity/state interfaces; COMPOSITION |
| H08 | api/mcp/oauth/authorize/route.ts | GET | /api/mcp/oauth/authorize | TRANSPORT-OAUTH | core.IDENTITY login continuation; COMPOSITION |
| H09 | api/mcp/oauth/token/route.ts | POST | /api/mcp/oauth/token | TRANSPORT-OAUTH | core.API-KEYS durable hashed credentials; COMPOSITION |
| H10 | well-known/[...path]/route.ts | GET | /well-known/* | TRANSPORT-OAUTH | trusted origin; COMPOSITION |
| H10 | well-known/[...path]/route.ts | OPTIONS | /well-known/* | TRANSPORT-OAUTH | COMPOSITION |
| H11 | api/health/ready/route.ts | GET | /api/health/ready | core.RUNTIME-HEALTH | core singleton lifecycle; COMPOSITION |
| H12 | api/health/live/route.ts | GET | /api/health/live | core.RUNTIME-HEALTH | PERSISTENCE; COORDINATION; COMPOSITION |
| H13 | api/backup/export/route.ts | GET | /api/backup/export | extended.BACKUP | core.IDENTITY; PERSISTENCE/key coverage; COMPOSITION |
| H14 | api/backup/import/route.ts | POST | /api/backup/import | extended.BACKUP | extended.ONBOARDING; PERSISTENCE/key coverage; core singleton restart; COMPOSITION |
| H15 | api/backup/migrations/route.ts | GET | /api/backup/migrations | extended.BACKUP-ANALYSIS | PERSISTENCE packaged migrations; COMPOSITION |
| H16 | api/backup/sql-wasm/route.ts | GET | /api/backup/sql-wasm | extended.BACKUP-ANALYSIS | native/package assets; COMPOSITION |
| H17 | api/custom-widgets/[resource]/route.ts | GET | /api/custom-widgets/:resource | extended.CW-AUTHORING | TRANSPORT-MCP resources; core.IDENTITY; COMPOSITION |
| H18 | api/custom-widgets/configuration-request/[token]/route.ts | GET | /api/custom-widgets/configuration-request/:token | extended.CW-SOURCES | core.IDENTITY; integrations binding policy; COMPOSITION |
| H18 | api/custom-widgets/configuration-request/[token]/route.ts | POST | /api/custom-widgets/configuration-request/:token | extended.CW-SOURCES | core.IDENTITY; integrations binding policy; COMPOSITION |
| H19 | api/user-medias/[id]/route.ts | GET | /api/user-medias/:id | extended.MEDIA | dashboard background; core branding/profile; integrations.ICONS; COMPOSITION |
| H20 | api/image-proxy/[id]/route.ts | GET | /api/image-proxy/:id | extended.IMAGE-PROXY | widgets binary consumers; ASSETS; COMPOSITION |
| H21 | api/about/contributors/crowdin/route.ts | GET | /api/about/contributors/crowdin | dashboard.ABOUT | bundled public assets; COMPOSITION |
| H22 | api/about/contributors/github/route.ts | GET | /api/about/contributors/github | dashboard.ABOUT | bundled public assets; COMPOSITION |
| H23 | api/about/contributors/opencollective/route.ts | GET | /api/about/contributors/opencollective | dashboard.ABOUT | bundled public assets; COMPOSITION |
| H24 | api/about/dependencies/route.ts | GET | /api/about/dependencies | dashboard.ABOUT | core build/package assets; COMPOSITION |
| H25 | api/openapi/route.ts | GET | /api/openapi | TRANSPORT-REST | dashboard/core API explorer; COMPOSITION |
| H26 | api/onboarding/claim/route.ts | POST | /api/onboarding/claim | extended.ONBOARDING | core.IDENTITY/PERSISTENCE atomic claim; COMPOSITION |

Transport-owned handlers are H01/H02/H05/H06/H07/H08/H09/H10/H25: **nine files / 19 methods** (3+6+1+3+1+1+1+2+1). Feature-owned remainder is **17 files / 19 methods**. These are shared protocol registrations, not additional domain procedures.

### Dynamic and external protocol ledger — not additional fixed registrations

| capability_key | primary_owner | source_capability | consumers / disposition |
| --- | --- | --- | --- |
| D-AUTH-ACTIONS | core.IDENTITY | Core-supported GET callback/csrf/error/providers/session/signin/signout/verify-request/webauthn-options and POST callback/session/signin/signout; configured credentials/LDAP/OIDC only | Auth.js Core Fetch proof then real cookie/CSRF/session/provider/logout/redirect flows; no invented email/WebAuthn provider |
| D-OAUTH-DISCOVERY | TRANSPORT-OAUTH | authorization-server and protected-resource discovery, resource suffixes and challenge URLs | Choose new canonical resources; old well-known rewrite aliases do not add methods or require compatibility |
| D-MANIFEST | core.BRANDING-ASSETS | dynamic public-safe manifest/name/colors/start/icons | dashboard shell/PWA consumers; deliberate MIME/cache, no private bootstrap cache |
| D-SERVER-INVALIDATION | dashboard.BOARD-RUNTIME | targeted authorized domain invalidation replacing build-generated revalidate-path action | feature invalidations and core cache facade; no arbitrary client page/filesystem path endpoint |
| D-FRAMEWORK-ASSETS | dashboard.SHELL | images/static/navigation/manual SSR/deep links replacing Next-generated image/static/RSC surfaces | core assets/composition; old Next URLs not required; preserve image/player loading/error capability |
| D-PUBLIC-ASSETS-HEADERS | core.BRANDING-ASSETS | fonts/images/icons/service worker/PWA/CSP/Accept-CH and HTTP limit policies | dashboard shell, media, widgets; stronger media CSP must not be overwritten; CSP tightening explicit |
| D-MCP-PROMPT | extended.CW-AUTHORING | homarr-custom-widget-author prompt, request/documentationUrl arguments | TRANSPORT-MCP admin protocol registration; prompt is not a procedure/tool |
| D-MCP-RESOURCES | extended.CW-AUTHORING | schema/components/skill, schema/runtime/security references and actual example catalog | TRANSPORT-MCP admin resources/MIME/error/URI decoding; examples dynamic, no invented finite count |
| D-MCP-TEMPLATES | extended.CW-AUTHORING | components/{name} and examples/{name} resource templates | TRANSPORT-MCP registration and visibility; not new application leaves |
| D-WS-HOST | TRANSPORT-STREAMS | whole source router callable via WS, three browser WS subscriptions | Decide retained host exposure independently from primary transport; cookies/expiry/origin/heartbeat/shutdown are not implicit |
| D-RPC-BATCH-STREAMING | TRANSPORT-RPC | ordinary source batch-response streaming/non-JSON links | Replace client and server together; exact tRPC batch wire need not survive |
| D-ASSISTANT-STREAM | extended.ASSISTANT-CHAT | AI SDK UIMessage protocol, approvals/continuations/browser-tool/terminal events | independent from oRPC SSE and MCP; model/attachment limits, owned threads, no private-tool leakage, upstream abort |
| D-MCP-STREAM | TRANSPORT-MCP | stateless SDK Streamable HTTP | independent from oRPC application streams; no old transport aliases by default |
| E-WORKSHOP-PROVIDER | extended.ASSISTANT-CONFIGURATION | external Go GET /api/ai/v1/models, GET /api/ai/usage, POST /api/ai/v1/chat/completions | Go/PocketBase unchanged; extended Assistant adapter keeps discovery/quota/auth/error/stream/cancel capabilities |
| E-WORKSHOP-SDK | extended.WORKSHOP | PocketBase user authRefresh/OAuth, listings/submissions/votes/reports/summaries/comments, uploads/files/filter/pagination | external runtime unchanged; scoped client/token/cancellation and custom-widget install flows remain feature-owned |
| E-WORKSHOP-SHARE | extended.WORKSHOP | Go /workshop/{id} share/metadata/redirect shell | external runtime unchanged; browser/share boundary, not Nitro registration |
| E-DOCS | dashboard.NAVIGATION | external docs search/rss/llms/SEO/page links | docs app unchanged; extended Assistant retrieval and Workshop links consume it; docs feeds are not main-app RSS routes |
| E-FEEDS-ICAL | widgets.RSS-FEED | permitted configured RSS/Atom/JSON/iCal consumption | widget calendar owner + integration provider owners retain policy/partial failure/date parsing; no invented RSS publication |
| E-MEDIA-BROWSER | widgets.MEDIA-PLAYBACK | external image/video/HLS/iframe/application content | extended.MEDIA/IMAGE-PROXY and core CSP consume shared interfaces; no arbitrary browser-to-secret proxy |
| E-NATIVE-INTEGRATIONS | integrations.NATIVE-PROVIDERS | native HTTP/WS/socket/certificate/auth/deadline/cache services | widgets + extended Docker/Kubernetes/Assistant/Workshop + core LDAP/OIDC own their family-specific native clients; not extra procedure counts |
| E-PUBLIC-UPSTREAM | widgets.UPSTREAM-READS | release/weather/air-quality/stocks/timetable/Minecraft/notifications/search | integrations.LOCATION/ICONS/SEARCH and widget-specific keys above are primary leaf owners; bounded safe upstream requests, no arbitrary URL grant |

Dynamic cross-boundary rows describe protocol accountability; they do not transfer primary procedure ownership from the 334-row ledger or authorize editing excluded Docs/Go runtimes.

## Reconciliation and coordination handoff

### Application roots

| application_root | leaves | primary_area |
| --- | ---: | --- |
| assistant | 19 | extended |
| user | 26 | core |
| group | 15 | core |
| invite | 3 | core |
| integration | 20 | integrations |
| board | 26 | dashboard |
| section | 1 | dashboard |
| app | 10 | dashboard |
| searchEngine | 9 | dashboard |
| widget | 95 | widgets |
| location | 1 | integrations |
| log | 1 | extended |
| icon | 1 | integrations |
| onboard | 6 | extended |
| home | 1 | dashboard |
| docker | 11 | extended |
| kubernetes | 11 | extended |
| serverSettings | 6 | core |
| cronJobs | 8 | extended |
| apiKeys | 3 | core |
| media | 3 | extended |
| updateChecker | 1 | integrations |
| certificates | 6 | integrations |
| bangs | 1 | dashboard |
| analytics | 1 | core |
| info | 3 | core |
| customWidget | 46 | extended |

### Area totals and protocol ownership

| primary_area | application_leaves | curated_REST_selections | MCP_candidates | HTTP_files | HTTP_methods |
| --- | ---: | ---: | ---: | ---: | ---: |
| core | 57 | 25 | 15 | 3 | 4 |
| dashboard | 48 | 23 | 26 | 4 | 4 |
| widgets | 95 | 0 | 33 | 0 | 0 |
| integrations | 29 | 4 | 13 | 0 | 0 |
| extended | 105 | 0 | 46 | 10 | 11 |
| transports | 0 | 0 | 0 | 9 | 19 |
| total | 334 | 52 | 133 | 26 | 38 |

REST: apps8 + boards15 + info1 + invites3 + settings2 + users19 + certificates2 + integration2 = 52. MCP: core15 + dashboard26 + widgets33 + integrations13 + extended46 = 133 across 29 eager roots. Application: core57 + dashboard48 + widgets95 + integrations29 + extended105 = 334 across 27 roots; source kind reconciliation is 191Q + 139M + 4S. Widget95 covers all 46 subrouters; Kubernetes11 covers all 10 subrouters. Extended owns onboard6 per the planner roster, so research's earlier identity/admin63 becomes core57 and extended gains six; no double ownership with core's account/group onboarding helpers.

HTTP feature owners: core H03/H11/H12 = 3 files/4 methods; dashboard H21–H24 = 4/4; extended H04/H13–H20/H26 = 10 files/11 methods (H18 has two); transports = nine files/19 methods. Thus files 3+4+10+9 = 26 and methods 4+4+11+19 = 38. No fixed operation count is assigned to dynamic Auth actions, external SDK APIs, manifests, generated assets, server actions or discovery rewrite aliases. HTTP route methods and REST operations are distinct censuses, not a sum of extra application leaves.

Method-export totals are GET20 + POST11 + PUT1 + PATCH1 + DELETE2 + OPTIONS3 = 38. Implicit framework HEAD/OPTIONS are not counted and must receive an intentional replacement policy. All counts here are planning reconciliation of the completed static inventory and explicit draft rows, not newly executed AST/schema/runtime checks.

### Protocol acceptance stays with its end-to-end primary owner

- Core identity owns active credentials/LDAP/OIDC, CSRF, cookies/redirects/session mutations/expiry and secure origin treatment. Core health owns meaningful new readiness/liveness and safe DB/state checks; the old counterintuitive names are not mandatory. Dashboard About owns actual bundled contributor/dependency responses and its page, not a transport-only static-JSON ticket.
- Extended Assistant owns cookie-only chat identity, owned threads, model/attachment validation, source bounds of 12,000,000 bytes/200 messages/200 parts/16 browser-tool entries, approvals/continuations, UIMessage terminal/error framing and upstream generation/private-tool cleanup. New bounds may be deliberate decisions, not accidental unlimited bodies.
- Extended backup owns bounded admin/claimed-onboarding multipart restore, SQLite-specific capability behavior, restore lock/atomic replacement/migration/key conversion/cleanup/restart and client flow; persistence owns safe database/key primitives. Source limits include compressed256MiB/database512MiB and bounded archive/metadata/key overhead. Cross-key restoration cannot claim completeness while only integrationSecret is converted. API format breaks do not erase durable restore/migration obligations.
- Extended media/image-proxy owns actual bytes, safe SVG, conditional ETag304 parsing, MIME/length, strong sandbox CSP/nosniff, cache boundaries, missing/upstream errors and the browser consumers. User-media source has no local session check; changing access policy needs a deliberate product/security decision, not a blanket protected middleware. Core global headers never weaken per-media headers.
- Extended Custom Widget sources owns owner/expiry-bound configuration tokens, no-store safe GET projections, strict bounded secret submission (source24KiB body, values1..8192), source/binding/integration authorization, claim/release/concurrency and safe errors. Authoring resources remain admin-only. Widgets CUSTOM-API owns placed-board visibility/manifest/rate-limit/confirm/decrypt/bounded-query/action acceptance, consuming those interfaces rather than duplicating source configuration services.
- Integrations certificates and extended media own their FormData parser/bounds/byte-fidelity/UI behavior. Extended backup analysis owns packaged migrations/sql.js WASM and its real analysis consumer. Neither is validated merely by RPC type inference or replaced with an invented JSON blob schema.
- Transport REST/MCP/OAuth owns the protocol invariants of the five slices, not the above domain handlers. Target-specific timeout/body/header/CORS/no-store/CSRF changes must be explicit security decisions; no old-wire adapters or blanket preservation of bugs are required.

### Cross-area contracts needing coordinator resolution

| semantic_seam | primary writer / owner | consumers | start vs integrated gate |
| --- | --- | --- | --- |
| principal/session/policy/demo/claim/trusted origin | core.FOUNDATION / core.IDENTITY | every feature and protocol | agree small types early; real expiry/revocation/provider correctness gates authenticated integrated acceptance |
| authorized integration binding/decrypt/kind/access | integrations.INTEGRATION-RUNTIME | widgets, extended CW/Assistant/onboarding, dashboard placements | interface starts consumers; all-provider/management completion is not a start blocker |
| public-board view/modify/placement/anti-disclosure | dashboard.BOARD-RUNTIME | widgets, integrations, extended CW | small service contract first; editor/public/private parity integrated |
| contract/output/errors/rich values/raw input | each primary feature owner; shared types core+transports | browser/SSR/REST/MCP/Assistant | agree conventions; actual feature DTOs, hydration and generated schemas gate local acceptance |
| scheduler/cache/pubsub/stream cleanup | core.COORDINATION singleton lifecycle | extended operations, widgets Beszel, TRANSPORT-STREAMS | generator interface permits parallel starts; one scheduler/shutdown gates release |
| Auth.js Core Fetch proof/login continuation | core.IDENTITY | OAuth, extended onboarding/backup/CW configuration | proof gates chosen auth adapter; not all ordinary contracts or ApiKey MCP extraction |
| API-key repository and revocation | core.API-KEYS / PERSISTENCE | MCP/OAuth/REST, core API UI | repository interface starts OAuth; durable issuance/revoke/hashed storage gates real exchange |
| authoring resources/preview/sources | extended.CW-* | widgets CUSTOM-API/options, MCP prompt/resources, dashboard placement | specific interfaces, not all Custom JSX tickets before catalog work |
| media/image-proxy/static packaging | extended.MEDIA / extended.IMAGE-PROXY / core assets | widgets, dashboard backgrounds/About, core branding/profile, integrations icons | ASSETS interface first; byte/ETag/SVG/CSP/native packaging verified by feature |
| global registrations/route precedence/exports/manifests/lock | one COMPOSITION writer, coordinator assigns | all six planners' implementation owners | contribution protocol before edits; full ledger and Nitro-only build are final gate |

### Genuine blockers, not false serialization

1. Coordinator must bind provisional semantic keys to peer tickets and settle HTTP About/health/image-proxy/manifest owners; the draft assigns one primary owner now but cannot grant peer write ownership. The roster places onboarding in extended, identities and atomic durable policy in core; user.initUser/group.createInitialExternalGroup remain core-owned services consumed by onboarding.
2. Output-contract, converter and OpenAPI choices gate generated public contracts/catalog evidence. They do not gate framework-neutral service work or force one horizontal output-schema rewrite ticket.
3. Real Core Fetch identity proof and trust/session semantics gate live OAuth authorize and authenticated end-to-end demonstrations. Feature contract-first work can start independently with agreed interfaces; no blanket dependency on finished production auth.
4. Primary stream transport/exposure and long-lived identity policy gate the four stream mounts only. Feature generators, ordinary JSON calls, API docs and health/media are independently startable.
5. Core singleton lifecycle and extended/persistence full encrypted-family coverage gate backup restore/restart acceptance, not ordinary transport/catalog/editor work. Cross-key restore must cover Assistant/Custom Widget secrets as well as integration secrets.
6. Final release integrates all feature acceptance and coverage, Nitro-only packaging and focused authorized regression evidence. Static inventories do not prove runtime catalog compilation, multipart bytes, cookie/OAuth flow, stream cancellation, schema generation or performance. No broad checks or fixture/container changes are authorized in this planning task.

No additional per-endpoint/API-only tickets are proposed. The five shared slices are bounded runnable protocol/lifecycle exceptions; capability acceptance remains with the primary end-to-end feature families.
