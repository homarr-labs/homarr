# Core, identity, administration and localization — proposed ticket graph

**Draft only; not approved, published, ready-for-agent or dispatched.** 25 provisional tickets. This file is the sole output of this drafting lane. No source, research, tracker, container or runtime checks changed.

## Authority, evidence and sizing

The current drafting contract and design interview override older recommendations in the research: Nitro v3 is the **only application build target**; Vite/React, TanStack Router and direct oRPC are selected; URLs, APIs, CLI syntax and serialized formats may break in a complete rewrite. No old Next build, route/cookie/protocol shim or compatibility adapter is a default prerequisite. Durable content, verifiers and intended capabilities still require an explicit conversion/recovery path. Narrow security, migration and critical-flow regressions are allowed; all checks remain deferred and scoped. Nothing here permits production-data/credential access or changing the playable container.

Evidence abbreviations, used below rather than repeating stale implementation paths:

- **P**: [persistence-background](../../../research_notes/Homarr%20full%20Nitro%20migration/persistence-background.md), especially §§2–6, 8–10.
- **A**: [identity-administration](../../../research_notes/Homarr%20full%20Nitro%20migration/identity-administration.md), capability IDs I01–I28 and §§3–7.
- **L**: [localization-ui](../../../research_notes/Homarr%20full%20Nitro%20migration/localization-ui.md), §§1–6 and coverage handoff.
- [Drafting contract](../TICKET-DRAFTING.md) and [design interview](../DESIGN.md) are policy authority; research is evidence, not architecture approval or executed acceptance.

Feature tickets own persistence/service → authorized call → UI → narrowly relevant acceptance, not separate backend/frontend/test phases. A shared-runtime exception is explicitly marked where unavoidable. A feature can port against accepted semantic interfaces and retained framework-neutral implementations; this does **not** require an adapter preserving an obsolete external contract. Real production authentication is required before protected routes become available; controlled principals are allowed only in disposable acceptance fixtures.

**Sizing:** 8 CORE runtime/preservation tickets, 5 AUTH tickets, 6 ADMIN tickets and 6 I18N tickets. Provider work is split by actual verification seams (credentials/session, LDAP, OIDC). Runtime duties are split by relational, response coordination, security atomics, history, scheduler and maintenance seams. Collections remain with their feature owners rather than becoming one giant frontend conversion ticket.

## Named decision dependencies — not approvals or fictitious code blockers

| Decision | Unresolved frontier / affected tickets |
| --- | --- |
| D-TOPOLOGY | Singleton versus replicas/workers, same/split runtime, migration/scheduler/maintenance ownership and fanout. CORE-02–08, AUTH-01/04. |
| D-STORAGE | Supported durable engines/portability, production runtime/drivers/ORM, conversion and rollback window. Current SQLite and PostgreSQL content must be accounted for; removal or replacement is not assumed. CORE-02/07/08. |
| D-STATE | Per-duty restart/crash/TTL preservation versus approved cold-start; Redis retention/replacement; overlap/retry/catch-up and interrupted-run recovery. CORE-03–06/08, AUTH-04. |
| D-AUTH | Auth.js Core maintained bridge, Core OIDC plus bounded custom credentials service, or evidenced replacement; session continuity versus intentional re-login; trusted origins/proxies/secure cookies. AUTH-01–04, ADMIN-06. |
| D-AUTH-POLICY | Disabled local login, mixed-provider membership, password/session/key revocation, last-admin recovery, API-key/MCP lifetime/audience/scope/consent and ongoing reauthorization latency. AUTH-01–05, ADMIN-01/03. |
| D-DEFAULTS | Target-user/public home validation, ordered group desktop/mobile fallback, generic settings validation, historical dialect defaults and interaction redesign. ADMIN-03–05; dashboard peer. |
| D-LOCALE | Engine/workflow, catalog versus Intl/message-engine identities, locale URLs/negotiation/cookie policy, switch/draft/cross-tab behavior and malformed-catalog handling. I18N-01–04. Existing keys/content must be conserved or explicitly converted, not silently discarded. |
| D-RENDER | First-paint timezone/clock/cache variants, RTL breadth, Crowdin hydration/DOM ownership, fonts/images/privacy and server/browser formatting corrections. I18N-02–06; root/dashboard/widget/extended peers. |
| D-RESTORE | Complete secret/key conversion, preserved versus invalidated ephemeral state, backup format/frontier and recoverable maintenance/rollback policy. CORE-07, AUTH-05; extended peer. |

Decision-dependent implementation choices wait for that decision; independent extraction/contract work may begin. Final acceptance cannot turn an open choice into an implied approval.

## Exclusive ownership and start frontier

**CORE-01 is the one minimal foundation composition owner.** Its writer also owns later CORE-08 composition changes: root document/provider/route/service registration, shared request-contract exports, environment declaration assembly, global manifests/dependency catalog/lockfile, build configuration and packaging. Feature workers submit exported registration descriptors and dependency requests rather than editing those files. It does not own every feature module or every package-local barrel. CORE-02 alone owns durable schema/driver/migration assembly; CORE-03 alone owns shared coordination backend atomics/key namespaces/channel exports, accepting requirements from CORE-04/05 and feature consumers. AUTH-01 alone owns auth cookie/effect/session exports; AUTH-05 owns policy/secret exports; I18N-01 owns translation exports/catalog import assembly. CORE-06 owns the job registry. Owners reconcile file allocations before dispatch; no two workers may edit a shared barrel concurrently.

**Initial frontier:** CORE-01; decision-independent discovery/conversion specifications and isolated module ports may proceed read-only or against agreed interfaces. **After its small accepted contract/runnable shell:** CORE-02–06, AUTH-01–05, ADMIN-01–06 and I18N-01–06 can start their listed work without waiting for all production services. Contract consumption is not a completion dependency on the peer's whole ticket. Each ticket below separately lists the actual completion/integration gate. CORE-07 needs a usable maintenance/lifecycle contract, not every widget; CORE-08 is late assembly/release work, never a blocker for early domain porting.

## Proposed tickets

### CORE-01 — Compose the smallest runnable Nitro application and safe feature seams

**Delivers:** a Nitro-served React route with public-safe request bootstrap, explicit anonymous context, locale/theme placeholders from validated descriptors, and registered feature slots. This is the minimal foundation/shared-interface exception, not production auth, full persistence, all transports or a replacement UI framework.

**Start blockers:** none; coordinator accepts narrow contract shapes and file ownership. **Decisions:** only chosen seams; topology/engine/auth/locale internals remain unresolved. **Integration gate:** one public shell renders/hydrates through Nitro; protected slots stay denied until real identity is connected.

**Exclusive domain / coverage:** FOUNDATION request context, principal/policy/secret interfaces, abort/response effects, request-local memoization, feature registrations, minimal root document/providers, route registrar and global manifest/lock ownership.

- Accept immutable principal and separate validated setup capability; repository/secret/token/internal settings objects never enter serialized bootstrap.
- Register one owned service handle per application runtime, not independent SSR/API auth/DB singletons; advertise readiness and close/maintenance hooks without implementing every adapter.
- Deliver a public SSR route and a protected slot that denies without a resolver; no fake admin, browser-selected principal or permissive policy fallback.
- Freeze small DTO/error/transaction/lifecycle/locale/navigation/transport interfaces and writer allocation so peer features can integrate descriptors immediately.
- Target only Nitro application build/asset composition; unrelated docs/Workshop frameworks remain outside this rewrite. Record deferred scoped acceptance, with no old Next build gate.

### CORE-02 — Open and preserve the complete durable product database

**Delivers:** existing durable content can be opened, converted deliberately when necessary, and read/written from the Nitro runtime without fixture reseeding or hidden alternate data paths. **Shared durable-runtime expansion exception**; domain UI remains owned by the model's feature owner.

**Start blockers:** CORE-01 persistence/transaction interface, not complete foundation services. **Decisions:** D-STORAGE; D-TOPOLOGY gates migration execution ownership. **Integration gates:** target driver accepted; a real feature consumes the migrated database; migration readiness precedes writes/jobs.

**Exclusive domain / coverage:** PERSISTENCE drivers, all 40 exported models/relations and their physical mappings, 49 SQLite and 17 PostgreSQL SQL migration assets/journals, five custom transformations, seed/readiness, owned connections and compound-command facilities. The ledger below enumerates every model and domain consumer.

- Explicitly map IDs, constraints/cascades/indexes/defaults/timestamps/enums, BLOB/bytea, SuperJSON options/settings and encrypted values; preserve stored `openSearchInNewTab` values and decide the true/false dialect default discrepancy rather than normalizing silently (P §§2–3).
- Recognize applied migration identities/order and package needed assets; preserve release-provider, OPNsense credential-kind, description-display, removed widget-integration and section/gutter transformations. Fresh, old-data, interrupted and repeated startup outcomes use disposable/copied fixtures later.
- Preserve transaction/savepoint semantics, parameter binding and checked-out PostgreSQL client ownership; no network await in synchronous SQLite transactions. Supply immediate/row-lock exclusion needed by board roots and rollback-safe multi-row mutations to domain owners.
- Own all main, trusted-hostname, proxy-reader and temporary connection lifetimes or deliberately consolidate them; pre-write readiness fails safely if conversion fails. Do not claim prototype WAL/busy-timeout defaults are production policy.
- Retain legacy Custom JSX content/readability or provide a proven complete conversion; new formats may break externally, but old durable content cannot disappear. Define recovery snapshot, encryption/trust prerequisites and supported binary/data rollback matrix before destructive conversion.

### CORE-03 — Deliver bounded, invalidatable refresh and last-good data

**Delivers:** a mounted peer integration/widget shows current or permitted stale data, refreshes within bounds, and never accepts obsolete data after configuration/authorization changes. **Shared coordination expansion exception**; peer feature owns its rendering and provider execution.

**Start blockers:** CORE-01 response/identity/generation contracts. **Decisions:** D-TOPOLOGY/D-STATE before replacing shared coordination. **Integration gates:** one authorized provider/widget consumer; AUTH-05 policy enforcement before protected publication. No requirement to finish all integrations.

**Exclusive domain / coverage:** COORDINATION backend atomics/key namespaces, ResponseCache, RefreshLease, InvalidationService, bounded local request handler, StatisticsSnapshotService and UpdateStateService.

- Preserve data/fresh/stale/error envelopes and version/configuration-aware identity; 15-second renewable owner leases and fenced writes reject expired owners and late settlements; SQL mutation/invalidation failure has an explicit repair strategy, not a claimed distributed transaction.
- Keep local 1,000-entry/100-in-flight bounds, deadlines/cancellation/stale-on-error and generation bounds (30-day expiry, 1,000 pending/local reads with global fallback) or an explicitly approved equivalent policy (P §4).
- Keep statistics non-expiring last-good/error/retry metadata, 128 pending, four shared slots, 120-second leases/10-second renewal/60-second upstream deadline, identity/generation fencing and unavailable-store behavior.
- Keep 24-hour release freshness, distinct non-expiring stale release and refresh ownership, including external-connection policy. Release lookup is not an invented fourth cron job.
- Demonstrate outage/cancellation/credential-change races later through the peer consumer: bounded local cache fallback is allowed only by policy; authorization failure cannot deliver last-good private data. No delayed replay of unsafe shared writes.

### CORE-04 — Preserve atomic short-lived security and handoff state

**Delivers:** peer Custom JSX preview/configuration, integration session and image registration flows retain ownership, expiry and secret isolation under concurrent edits/restarts. **Shared security-store expansion exception**; feature actions/UI/network policy remain with their named peers.

**Start blockers:** CORE-01 store/effect contracts and AUTH-05 agreed crypto/authorization interface, not completed auth providers. CORE-03 owns backend primitive changes; interface handoff is sufficient. **Decisions:** D-TOPOLOGY/D-STATE and D-RESTORE for backend conversion. **Integration gates:** actual guarded feature consumers and real identity before protected exposure.

**Exclusive domain / coverage:** RequestLimiter policy adapters; PreviewSessionStore; ConfigurationRequestStore; IntegrationSessionStore; ImageRegistrationStore; SQL onboarding-claim service. No duplicate edit of shared atomic/channel implementation.

- Keep Custom JSX server-time fixed-window rates and expiring owner concurrency leases (per-user/item 4, per-definition 8), atomic acquire/renew/release and production fail-closed behavior; a local test limiter is not production parity.
- Keep ten-minute preview TTL, revision CAS, 50-entry journal/evidence, encrypted secrets and owner checks; ten-minute pending/applying/completed configuration requests have one claimant and idempotent terminals.
- Keep configuration-fingerprinted encrypted integration session envelopes and remaining token TTL; credential/configuration changes invalidate them. Keep random/HMAC image registrations, encrypted URL/header mappings and 24-hour lifetime separately from image-body caches.
- Keep hashed four-hour SQL onboarding claims, unique-insert winner selection, timing-safe validation, conditional expiry/deletion and Strict HttpOnly effect. AUTH-05 checks claim/no-users/admin/step; extended onboarding owns studio progression and consumption.
- Define each store's restart/crash/remaining-TTL policy; quiesce old owners during conversion rather than importing live locks. Image retrieval/SSRF, preview network and service-specific secret retention remain feature-owned obligations (P §4, A I22/I27).

### CORE-05 — Show authorized historical and live operational state without gaps

**Delivers:** the operational log screen and peer task/metrics consumers obtain bounded history/snapshot then live updates with cleanup, current authorization and safe reconnect. CORE-owned log screen/service is a vertical slice; shared stream primitives are the explicit expansion edge.

**Start blockers:** CORE-01 stream/principal interfaces; CORE-03 atomic namespace contract, not all refresh features. **Decisions:** D-TOPOLOGY/D-STATE/D-AUTH-POLICY reauthorization latency. **Integration gates:** endpoint TRANSPORTS host plus AUTH-01 real identity/AUTH-05 log policy for protected delivery.

**Exclusive domain / coverage:** LatestStateStream, LogHistoryStream, SampleHistoryStore, shared subscription tracking; permission-filtered log consumer UI. Endpoint owns wire host/error/reconnect protocol; CORE-06 owns status producer; provider/extended owners own Dashdot/OPNsense/Docker/Beszel payload producers.

- Preserve latest-value store-before-publish and snapshot-to-live ordering; distinguish latest snapshot from durable replay of every event. Dispose unused listeners.
- Preserve 5,000 log bound, listener-before-history buffering and ID deduplication; enforce `other-view-logs` on subscription/history and delayed deliveries, not only page visibility.
- Preserve bounded ordered integration sample histories (default 15) and live publish for Dashdot CPU/OPNsense interfaces; prove producer/consumer agreement through those peer capabilities.
- Keep upstream Docker logs/Beszel metrics outside generic history ownership; provide abort/drain/backpressure contracts and ensure endpoint peers implement them without orphan subscriptions.
- Show loading/reconnect/error/history states and invalidate/mask private stream data after expiry/revocation according to the approved latency; later scoped race/reconnect regressions use disposable data.

### CORE-06 — Manage persisted tasks and safe startup work in the running app

**Delivers:** authorized task administration enables, edits, runs and observes supported background work, survives restart, and drains predictably. This is a vertical task-service/call/UI slice with startup integration delegated to the sole composition writer.

**Start blockers:** CORE-01 scheduler/status interfaces; provider-config/SQL/atomic contracts as used, not complete peer rewrites. **Decisions:** D-TOPOLOGY/D-STATE job ownership/overlap/retry/catch-up. **Integration gates:** CORE-02 readiness for durable config; CORE-05/endpoint status delivery; identity/policy and each actual job dependency connected.

**Exclusive domain / coverage:** `cronJobConfigurations`; SchedulerService, JobStatusStore and central job registry; exactly analytics, icon updater and ping; disabled-provider SQL session cleanup; task management calls/UI.

- Retain enable/cron persistence, start/stop/manual operations, hidden/manual/custom-interval restrictions, run-on-start and success/error hooks. Accept disabled initialization→enable and duplicate initialization without leaked schedules.
- Preserve analytics weekly/run-on-start/hidden/no-manual/no-custom behavior, consent/NO_EXTERNAL_CONNECTION and SQL CAS/idempotency metadata. Do not claim existing async `void` invocation supplies distributed exactly-once/retries.
- Invoke weekly/run-on-start icon synchronization from the icon-library owner's transactional replacement service. Preserve minute ping and any retained registry/status publication; direct authorized app ping remains dashboard-owned even if the apparently unused registry is explicitly retired.
- Clean SQL sessions of disabled providers before schedule initialization/run-on-start; decide whether caught/logged cleanup failure blocks readiness. Never treat Redis integration sessions as SQL login sessions.
- Separate durable schedule from latest execution status, repair interrupted `running` according to policy without reporting success, and stop/abort/drain owned work. Provide UI feedback and service-level admin guards independent of nav hints.

### CORE-07 — Convert backups and restore durable content under exclusive maintenance

**Delivers:** the extended backup/import/onboarding surfaces consume a bounded service that previews, snapshots and restores preserved content safely, with recoverable failure. **Persistence/maintenance expansion exception**; extended owner delivers the upload/download/preview UI and endpoint, not a competing archive implementation.

**Start blockers:** CORE-01 maintenance contract, usable CORE-02 connection/conversion/disposal seam and AUTH-05 crypto contract. **Decisions:** D-STORAGE/D-TOPOLOGY/D-RESTORE. **Integration gates:** exclusive lifecycle drain, all encrypted-family conversion coverage and extended authorized end-to-end backup flow.

**Exclusive domain / coverage:** BackupService, MaintenanceCoordinator, archive validation/conversion, temporary DB/export resources, live replacement/recovery, migration snapshot and post-restore epoch contract; all SQL/encrypted content is consumed, not separately owned here.

- Preserve backup/export/import capability and sensitivity, not obsolete ZIP/route signatures. Source SQLite export includes encryption key but excludes Redis and CA files; PostgreSQL needs an operational backup path, not a falsely advertised SQLite exporter (P §6).
- Carry forward bounded archive/metadata/DB ingestion or approve an explicit new bounded format: source limits are 256 MiB compressed input, 512 MiB DB, 514 MiB archive, 1 MiB metadata. Handle export contention and temporary-file failure, not a fixed-path atomicity assumption.
- Before live replacement, acquire deployment-wide maintenance as required, reject new writers/jobs/upgrades, drain/abort streams/refreshes, close every connection, snapshot recovery prerequisites and restore safely on failure. A process-local boolean and delayed exit are not proof.
- Resolve the documented `reEncryptSecrets` gap: original key retention or verified conversion covers integrations, widget, legacy/v2 Custom JSX and Assistant key/header stores, plus any retained encrypted state/mappings. No partial same-key/cross-key success claim.
- Reconcile SQL migrations, WAL/SHM and cache/session/generation/private-artifact epochs after restore; record preserved/invalidated Redis and CA prerequisites. AUTH-05 supplies admin/setup authorization; extended owner enforces it before bytes are accepted or emitted.

### CORE-08 — Assemble production resource ownership and retire target-runtime coupling

**Delivers:** the selected production Nitro application boots, becomes ready and shuts down/enters maintenance with one owner for every resource; obsolete Next-specific runtime glue is removed from the target graph. **Explicit composition/expansion–contraction exception**, not a feature prerequisite or blanket repo rewrite.

**Start blockers:** CORE-01 ownership map and stable service descriptors; can integrate each finished slice incrementally. **Decisions:** D-TOPOLOGY/D-STORAGE/D-STATE/D-AUTH/D-RENDER. **Release gates:** relevant CORE-02–07 and AUTH/I18N adapters, endpoint/feature acceptance assembled; unresolved supported capabilities cannot be hidden by a green shell.

**Exclusive domain / coverage:** same composition writer as CORE-01; Nitro plugins/entrypoint, environment/secret loading, runtime/launcher/container packaging, document/provider/asset registration and target-only contraction. Feature owners remove their own obsolete call sites; no duplicate root/lock writer.

- Order configure→owned resource open→migrate/verify→durable readiness→approved cleanup/scheduler readiness→accept; explicitly decide slow-start failure/readiness. Scope readiness per feature where justified, not fake global success.
- On signal/maintenance reject new mutations/runs, stop schedules, boundedly abort/drain refresh/upstream/live work, unsubscribe/close hosts, then release DB/shared clients/timers/HTTP resources, including non-main/temporary connections.
- Preserve configured durable paths/volume ownership and `_FILE` secret loading, DB/Redis/TLS configuration capabilities and trust files through approved configuration conversion. No server secret in browser graph or environment echo.
- Validate chosen production runtime/native dependencies on scoped deferred targets; Node packaging and Bun-first fixture are evidence of different environments, not proof of interchangeable drivers. Nitro generic storage/tasks/hooks do not automatically replace CAS/replay/scheduler/drain guarantees.
- Contract only after migrated target callers integrate: remove target Next instrumentation/RSC/transport glue and any temporary internal expansion no longer needed. No old app build gate, no unrelated docs/Go Workshop framework purge and no optional Redis/db0/backend elimination without decisions.

### AUTH-01 — Sign in locally with one real session authority and safe browser lifecycle

**Delivers:** local credentials login, branded/error login UI, authenticated bootstrap/refresh, logout and private-view invalidation across render, RPC and live consumers.

**Start blockers:** CORE-01 principal/effects interfaces; AUTH-05 policy interface and I18N facade interface, not completed provider tickets. **Decisions:** D-AUTH and relevant D-AUTH-POLICY. **Integration gates:** CORE-02 usable identity persistence; endpoint mounting and dashboard Query/render cancellation; approved auth integration.

**Exclusive domain / coverage:** `sessions`, `verificationTokens` service behavior; credentials verifier/session creation; provider options/configuration projection; cookie/effect/origin/session exports; client session/login/logout; A I01/I02/I06–I08/I10/I28. Provider account rows belong to AUTH-03.

- Preserve legacy bcrypt hashes, lowercase provider-scoped local lookup, generic failures, creation normalization/validation and configured session lifetime; displayed password suggestions are not invented server requirements. Decide direct local login in LDAP-only mode (A §5.4).
- Implement the selected credentials DB-session boundary explicitly; stock Auth.js Core database+Credentials is not demonstrated support. Request-local creation/token/cookie effects handle concurrent login, multiple Set-Cookie and late-failure cleanup with no token cross-talk.
- Enforce real expiry/renewal/revocation in every session reader. Correct expired-row live access and stale bootstrap timeout behavior; session continuity may be converted or an approved one-time re-login, never silently fabricated.
- Enforce approved trusted-origin/proxy, secure-cookie and CSRF policies, safe relative callback, login-error/no-auto-loop and public recovery access. Old names/routes need not survive unless selected; outgoing effects must survive SSR/direct service execution.
- In browser logout, clear/mask private data before external redirect; refresh across focus/tabs and cancel stale Query/render/live results on identity/global/resource-policy change. Dashboard/endpoint implement their consumer-side invalidation and approved live reauthorization latency.

### AUTH-02 — Authenticate LDAP users and reconcile directory-controlled identity

**Delivers:** an enabled LDAP button/direct login verifies a directory user, creates/loads the provider-scoped user, applies allowed group/profile effects and enters the same opaque session/browser lifecycle as local login.

**Start blockers:** AUTH-01 verifier→session interface, ADMIN-03 reconciliation interface and CORE-01 contracts; completion not required to port directory logic. **Decisions:** D-AUTH and LDAP-only/local-management policy in D-AUTH-POLICY. **Integration gates:** working AUTH-01 session boundary, CORE-02 persistence and disposable LDAP acceptance service.

**Exclusive domain / coverage:** LDAP service bind/search/user bind, escaped filters/DNs, scope/attribute extraction/email validation, configured group member lookup, server-only deployment adapter; A I03 and LDAP branch of I09.

- Preserve exactly-one-result requirement, valid UTF-8 email, first-valued attributes, provider-scoped email reuse/create and separate user bind; deny ambiguous/missing/invalid/wrong-password cases generically.
- Preserve extra filter/scope/attributes, RFC4514 escaping, non-ASCII DNs and AD/lldap-style mappings; no profile/debug/bind secret in public errors/logs.
- Close every LDAP client on success/error/cancellation. Establish TLS/certificate policy separately; OIDC's trusted Fetch is not evidence LDAP trust works.
- Invoke agreed external-group reconciliation, everyone retention and eligible local-management policy; no auto-created arbitrary grants. UI options hide disabled provider and direct calls enforce it.
- Demonstrate login/error/group-change/logout later through disposable directory data and the real shared session flow, not fixtureauth.

### AUTH-03 — Sign in through OIDC with safe linking and post-login effects

**Delivers:** configurable OIDC login/callback/userinfo can establish the shared session and update only the intended provider-owned profile/groups while preserving existing identities and custom avatars.

**Start blockers:** AUTH-01 session/effect/origin contract, ADMIN-03 group reconciliation and ADMIN-06 trust interfaces. **Decisions:** D-AUTH and linking/local-management/proxy rules. **Integration gates:** actual shared auth adapter, trust service and disposable OIDC provider proof.

**Exclusive domain / coverage:** `accounts`; provider-scoped adapter/linking policy, OIDC issuer/client/scopes/token method/proxy/forced-userinfo/custom Fetch, profile extraction and OIDC post-login effects; A I04/I05 and primary I09.

- Preserve account compound identity→user links and server-only token fields, issuer discovery/ID-token verification via selected maintained library, nested name/group extraction, preferred username/email/picture fallback and configured display/auto-login.
- Preserve explicit verified-email opt-in linking only with strict `email_verified === true` and nonempty email; deny unverified/cross-provider merging by default and retain credentials user's primary ownership/password/groups/boards/keys.
- Preserve forced userinfo, token-auth/scope/proxy and non-401 `www-authenticate` workaround where required; validate trusted Fetch/CA and callback origins. PKCE/state/nonce enforcement is evidenced, not inferred from cookie names.
- Reconcile only existing same-name groups on an actual array claim unless approved local management applies; missing claim means no invented removals. Update name/picture only for primary OIDC users, retain data avatars, apply request-local theme-cookie effects.
- Exercise existing/new/link/deny/missing-groups/error/logout cases through real session/browser flow later; no hand-built token verifier or claim-derived unrecognized grants.

### AUTH-04 — Issue and revoke keys with explicit external and MCP authority

**Delivers:** admin key management shows metadata and one-time token delivery, existing tokens still verify, and external/MCP/OAuth consumers select identity and enforce current permissions without ambient-cookie privilege leakage.

**Start blockers:** CORE-01 authentication-mode interface, AUTH-05 grant/issuer interface; endpoint OAuth/transport contract handoff. **Decisions:** D-AUTH-POLICY token scope/audience/lifetime/consent/precedence; D-TOPOLOGY/D-STATE OAuth storage. **Integration gates:** CORE-02 key persistence; endpoint-owned REST/MCP/OAuth flows and AUTH-01 login-resume.

**Exclusive domain / coverage:** `apiKeys`, key issuer/verifier/admin calls/UI, current-creator grant resolution and shared surface identity-selection/authority contract; A I18–I21. Endpoint peer exclusively owns OAuth registration/authorize/token state-machine implementation, discovery/challenges/rate limits/wire mounting.

- Preserve historical key IDs/token bytes/bcrypt hashes, creator references, safe hash-free lists and deletion revocation; synthesized one-day Session is not stored key expiry. New manual key creation stays admin-only and displays secret once.
- Make browser/render, browser RPC, external REST, MCP and live authentication modes explicit; approve invalid-key fallback rather than accidentally accepting cookies on REST/MCP. Key versus Bearer precedence is deliberate and verified.
- Supply shared issuer to non-admin OAuth exchange under approved authorization policy, not an admin-key endpoint bypass. `mcp:tools` metadata is not stored scope/audience/client isolation; any real redesign requires conversion/schema/product decisions.
- Endpoint OAuth owner must preserve/replace with approved equivalents S256 PKCE, registered redirects/canonical resource, atomic single-use code, expiry/caps, login resume and bounded auth/register/token failures. Current client secret/advertised-none mismatch and absent consent are decision dependencies (A §5.7–8), not cemented bugs.
- Verify ordinary RPC policy after tool discovery and privilege change; tool visibility is not authorization. Sanitize errors/logs and keep private resources/prompts/Custom Widget actions gated. Later integrated disposable OAuth/key proof includes restart/expiry/replay denial.

### AUTH-05 — Enforce current resource policy before data or secret execution

**Delivers:** anonymous public-board reads and authorized owner/delegated operations work while unrelated principals, unsafe setup/admin actions and secret reads fail consistently. **Shared policy/secret expansion exception** with real board/integration/extended consumers, not a permissive auth shim.

**Start blockers:** CORE-01 principal/context contract. **Decisions:** D-AUTH-POLICY for contested behavior, never permission to retain expired/foreign-principal access; D-DEFAULTS for target-home rules. **Integration gates:** each consuming endpoint has scoped evidence and server enforcement before publication; real identity required for protected flows.

**Exclusive domain / coverage:** inheritance/matrix/global keys and client hints; self/admin/demo/setup guards; board view/modify/full and integration query/interact/full constructors/authorized execution; PasswordVerifier/SecretStore server-safe projection contract; A I14–I17/I22/I27. Resource repository commands/ACL editing UI belong to dashboard/integration/media/search/extended peers.

- Preserve selected global grants and implication matrix, including app modify→create but not use-all; Viewer/Editor/Admin are presets, not a new role table. Keep demo/step/secret-destination restrictions even for admin.
- Preserve public/creator/current-user/group board policy and NOT_FOUND masking; integration query may derive from visible public-board placement, but interaction/full/arbitrary upstream request are separate operations.
- Fix source native integration grant-scoping risk before mounting any public native call: repository evidence is filtered for every selected integration to current user/groups; foreign grants cannot authorize anonymous/unrelated use/interact/full. Bulk/missing/foreign-kind behavior is explicit (A §5.1).
- Authorize the same principal/resource/action before decrypt; private/null-retain/clear/public-field metadata and destination/source/network binding are explicit. Preserve encryption key/ciphertext conversion obligations, prohibit production zero-key fallback, never return a generic plaintext secret map.
- Keep claim-only setup distinct from admin and ordinary settings, self/admin/media/search/app/Assistant/Custom JSX ownership guard boundaries intact; agree denial/error mapping with endpoint owner and privilege/cache invalidation with dashboard/coordination. Demonstrate policy matrix through peer calls/UI later, including hidden-control bypass.

### ADMIN-01 — Manage users, profile/password changes and offline recovery

**Delivers:** users manage their own eligible profile/password/avatar, administrators manage others with distinct guards, and an offline recovery command restores access without Next runtime dependence.

**Start blockers:** CORE-01 contracts, AUTH-05 self/admin/demo/verifier interface, AUTH-01 session-revocation interface. **Decisions:** D-AUTH-POLICY revocation/last-admin behavior. **Integration gates:** CORE-02 users/session persistence, actual identity and media/avatar input contract.

**Exclusive domain / coverage:** `users` identity/profile fields and user-admin service/metadata/selectable projections, create/search/list/edit/avatar/delete/password UI, recovery/update-password CLI capability; A I12. Preferences are ADMIN-04-owned; same table does not mean overlapping file ownership.

- Retain IDs/provider ownership and original hashes; enforce self/admin field differences and credential-only name/email/password edits server-side; external users may change custom avatars within existing bounded type/size rules.
- Preserve local username trim/lowercase/conflict feedback and create validation. Self change requires prior password even for admin; resetting another user does not. Demo restrictions remain service-enforced.
- Decide/document API password-change versus CLI session revocation and key survival, rather than claim the current HTTP path revokes sessions; enforce approved last-admin/lockout/recovery rule with narrow regressions later.
- Preserve deletion/cascade/owned-resource semantics, metadata-safe ACL user selection and offline recovery capability with new CLI syntax allowed. No real installation mutation during acceptance.
- Complete direct links, loading/error/success, structured form issues and list/profile Query/loader invalidation; avatars do not bypass media security or become private credentials in bootstrap.

### ADMIN-02 — Invite and register local users with single-use durable authorization

**Delivers:** administrators issue/list/revoke invites and guests consume one valid invite to create a local user, then reach login with branding/localized feedback.

**Start blockers:** CORE-01 contracts, AUTH-05 admin guard and AUTH-01 provider-options/verifier interfaces. **Decisions:** disabled-provider policy where relevant. **Integration gates:** CORE-02 transaction capability and real identity/session-invite-page guards.

**Exclusive domain / coverage:** `invites`; create/list/revoke/public register, token expiry and atomic consumption; A I11. Initial onboarding studio/claim progression is explicitly not this invitation flow.

- Require enabled credentials both at issuance/registration and direct calls, not just button visibility. List omits token; issuance delivers it once with inviter/expiry and safe localized warning.
- Deny existing-session, missing/revoked/expired invite appropriately; validate normalized user/password/confirmation and atomically create user plus delete invite with zero-delete concurrent reuse conflict.
- Preserve transaction rollback/duplicate-user behavior on both selected supported durable paths and do not auto-login after registration unless separately approved.
- Wire authorized UI/calls, revoke/not-found, public branded page, validation/loading/success→login and list/cache invalidation. Scoped deferred regression covers expiry and competing consumption.

### ADMIN-03 — Manage groups, membership, grants and ordered default homes

**Delivers:** administrators edit groups/members/order/presets/default homes and see effective permissions; externally managed memberships remain under the approved provider policy.

**Start blockers:** CORE-01, AUTH-05 policy/matrix and dashboard home-reference contracts. **Decisions:** D-AUTH-POLICY mixed membership and D-DEFAULTS home resolution. **Integration gates:** CORE-02 group persistence and actual provider reconciliation consumers.

**Exclusive domain / coverage:** `groups`, `groupMembers`, `groupPermissions`; group CRUD/search/pagination/owner transfer/reorder/defaults/grant UI and reconciliation service; A I13 and group consumer of I09/I14.

- Preserve group IDs/ownership/order/cumulative membership and explicit deduplicated grants; presets round-trip without promoting independent app-use or resource grants.
- Protect `everyone` from rename/delete/transfer/member edits; external reconciliation retains it and never creates arbitrary IdP-named groups/grants.
- Apply approved target-user local/mixed/external membership checks to both add and remove, correcting the source asymmetry (A §5.2); provider re-login behavior and local-management hints agree with server guards.
- Validate home references for intended users/public constraints and preserve stored desktop/mobile values; resolve ordered group fallback/comment discrepancy with dashboard, not merely a simpler settings default.
- Show ownership/grant/default edits end-to-end, invalidate affected current permissions/session scope/home routing and prevent stale private access; isolated reconciliation and membership-denial regressions remain deferred.

### ADMIN-04 — Persist user preferences and keep browser settings coherent

**Delivers:** self/admin preference editing updates dashboard/header/search/widget behavior, tours and device-specific homes without overwriting unrelated values or exposing another user's settings.

**Start blockers:** CORE-01, AUTH-05 self/admin contract and dashboard validated home/shortcut interface. **Decisions:** D-DEFAULTS and interaction redesign. **Integration gates:** CORE-02 user persistence; dashboard/bootstrap/session change consumers and locale/theme cookie peers.

**Exclusive domain / coverage:** user preference service/UI and registry: colors/theme, byte units, firstDayOfWeek, ping icons, widget right-click, desktop/mobile homes, default search/new-tab/bangs, header fields/zones/shortcuts, tour complete/reset/status; A I23.

- Preserve omitted versus null-clear semantics, header nested merge versus supplied-array replacement and validation-before-single-write. New external procedure names need not retain deprecated aliases.
- Resolve target-user versus caller-view home discrepancy explicitly; new shortcuts and homes use approved target visibility policy while preserving existing durable references until deliberate conversion.
- Keep locale and guest theme as current cookie capabilities unless a new storage policy is approved; no invented user locale column or week-start override based on language.
- Update current safe Settings/Query/loader/render snapshots after edit, and maintain self/admin/demo/tour behavior with translated failures and immediate observable effects.
- Preserve historical per-dialect stored defaults; decide changed defaults explicitly. Coordinate affected board/search/media references with their owners, not duplicate their resource services.

### ADMIN-05 — Configure instance settings and expose safe effective bootstrap/admin navigation

**Delivers:** administrators configure instance defaults/branding/culture, guests see only selected public settings, and management navigation/direct links reflect independent capabilities and enabled tools.

**Start blockers:** CORE-01 public/user/admin projection contracts, AUTH-05 guards, I18N locale/theme descriptors and dashboard home-resolution interface. **Decisions:** D-DEFAULTS and D-LOCALE/D-RENDER for visible changes. **Integration gates:** CORE-02 settings/CAS, session/preferences/groups and root bootstrap consumers; tool peers provide descriptors rather than block all settings work.

**Exclusive domain / coverage:** `serverSettings` typed settings excluding CORE-04 private-claim operations; eight families analytics/crawling/board/user/appearance/branding/culture/search, settings forms, effective safe settings snapshots, management capability navigation/help/about; A I24–I26.

- Retain serialized values/default merges/versioned legacy branding and analytics metadata CAS/five-retry behavior; generic-save validation must explicitly resolve looser source rules rather than rely on forms. Never enumerate private claim/internal rows into public/admin browser bootstrap.
- Preserve name/greeting/logos/favicon/colors/lock/background/overlay/auth display/radius/custom CSS, analytics consent/state, indexing/status/home/Gravatar/theme/culture/search configuration capabilities; deployment provider/session/encryption config remains server-only and separate.
- Implement public, user and admin projections with request-local memoization; effective home selection is user→ordered group→everyone→instance and authorized by dashboard, with device/default discrepancies explicitly decided.
- Navigation/deep-link/service guards agree for create-only users, self settings/tours/help, delegated full integration management, log-only users and admin tools/feature flags. Register backup/tasks/certificates/Docker/Kubernetes/Assistant/API-key/docs/MCP help as peer-owned capabilities, not duplicate implementations.
- Save shows scoped success/error and updates relevant public/admin/user/root render variants, including defaultLocale/branding changes; warm cached bootstrap cannot leak private settings or stale privileges.

### ADMIN-06 — Install trusted certificates and hostname exceptions securely

**Delivers:** administrators inspect/install a bounded root CA and manage trusted hostname exceptions; configured OIDC/provider traffic uses the approved trust policy with safe concurrent file behavior.

**Start blockers:** CORE-01 trust/lifetime interface, AUTH-05 admin guard and CORE-02 trusted-hostname repository contract. **Decisions:** D-AUTH trust/proxy and D-STORAGE mounted-file policy. **Integration gates:** AUTH-03/provider consumers, root packaging/disposal; endpoint owner supplies upload transport.

**Exclusive domain / coverage:** `trustedCertificateHostnames`; TrustFileStore, root CA file service, exception repository/calls/UI, trust-reader connection lifecycle handoff; A I26 trust branch, P §6.

- Preserve separate SQL hostname allowlist and CA file store; one bounded root CA (source 64 KiB), safe filename, current validity/self-signing, no-follow regular-file checks and synced temporary publication with no-overwrite conflict semantics.
- Concurrent same-content/different-content writes have explicit outcomes; no symlink/path traversal or silent trusted-file replacement. Coordinate volume ownership and disposal with CORE-08.
- Keep admin/deep-link guards, enabled configured traffic trust and localized validation/expiry labels; OIDC Fetch success does not prove LDAP TLS behavior.
- Show install/list/exception edits and downstream effect, with safe metadata only and proper Query/loader invalidation. Deferred scoped file-security/conflict acceptance uses disposable files, not existing trusted stores.

### I18N-01 — Render preserved catalogs through a request-explicit translation engine

**Delivers:** public and protected feature consumers render typed namespaces, interpolation/plurals/rich React content and localized metadata/errors without Next-specific translation context. **Catalog/facade expansion exception** with a runnable localized public shell.

**Start blockers:** CORE-01 locale/bootstrap interface. **Decisions:** D-LOCALE engine/workflow and malformed-data handling. **Integration gates:** root/server/browser consumes chosen direct dependency; no all-feature migration prerequisite.

**Exclusive domain / coverage:** all 36 catalog identities/content; translation exports/types/import manifest, English blank-leaf merge, scoped/root translators/messages, helpers, formatter/clock facade and dependency-light locale metadata. Recommended `use-intl` is evidence, not approval.

- Preserve keys `ca, cn, cr, cs, da, de, de-CH, en-gb, en, el, es, et, fi, fr, he, hr, hu, it, ja, ko, lt, lv, nl, no, pl, pt, pt-br, ro, ru, sk, sl, sv, tr, zh, uk, vi`; explicit conversion is required if identifiers change. Conserve Crowdin markers and seven non-English `board.snapshot.*` extras (L §1).
- Recursively remove blank string leaves, merge English→selected retaining nonblank whitespace/extra keys; preserve nested ICU interpolation/plural/number capabilities and safe rich callback semantics, not naive replacement or unsafe HTML.
- Preserve root/scoped key/namespace safety, callback `stringOrTranslation`, `has`/breadcrumb fallback and consciously retain/replace exported messages/raw/markup functions. Correct import-function-derived breadcrumb key types; no claim strict ICU-argument generation already exists.
- Use immutable catalog/build caching only; explicit per-request translator/formatter instances and safe browser facade expose catalog identity separately from Intl/message-engine identity. No server/Next entrypoint imported by shared schema/browser consumers.
- Deferred chosen-engine acceptance validates all catalogs and distinguishes existing malformed entries from new parser/renderer regressions; representative plural/rich call sites include create-app/docs/status/invite/Assistant links and warnings. Optional generators/compilers/partitioning are not hidden prerequisites.

### I18N-02 — Resolve and switch locale coherently, including first-paint RTL

**Delivers:** guests and users enter the correct configured locale, persist an approved locale choice and switch language/direction without inconsistent provider/document state or unintended draft loss.

**Start blockers:** CORE-01 request/root contract, I18N-01 loader/metadata interface and ADMIN-05 culture projection interface. **Decisions:** D-LOCALE URL/negotiation/cookie/SPA-versus-reload and D-RENDER RTL/Crowdin boundaries. **Integration gates:** endpoint request/cookie host, root provider/document assembly, dashboard/editor draft and cache behavior.

**Exclusive domain / coverage:** locale resolver/persistence/switch coordinator, locale cookie and current-catalog/Intl hooks, HTML lang/dir descriptors and deterministic DirectionProvider initial state; route/body edits stay root/feature-owned.

- Decide explicit prefix/cookie/configured-default/English precedence, no-prefix routes and disabled Accept-Language based on evidence, not assumption. Prefix-free current URLs are capability evidence, not a requirement for legacy redirect adapters under rewrite policy.
- Preserve guest-capable preference and stored `homarr.locale`/one-year/Lax/root-or-base-path behavior or provide approved conversion; invalid/case/encoded inputs/defaults have specified fallback. Onboarding/login exceptions and API/static/robots exclusions belong to endpoint/route policy.
- Switch commits selected messages/resources/provider and HTML lang/dir atomically or uses an approved reload; query/hash/history/cross-tab behavior and unsaved modal/editor/form handling are explicit acceptance decisions, correcting existing lossy navigation only intentionally.
- Hebrew is current RTL locale; matching direction exists before JS and after hydration, changes with provider/document together and never depends solely on post-mount detection. Feature owners verify grids/charts/keyboard/portals rather than claim Mantine mirrors everything.
- Locale-dependent queries/loaders/render variants invalidate separately; races/load failure/no-op same-locale and auth-independent guest behavior have observable pending/retry outcomes, no stale completion reverting newer choice.

### I18N-03 — Format culture, dates and relative time without shared locale races

**Delivers:** dates/numbers/relative labels/table controls match the selected formatting basis on SSR and navigation while preserving user units, week start, timezone and widget options.

**Start blockers:** I18N-01 facade contract and CORE-01 render snapshot. **Decisions:** D-LOCALE message-engine versus Intl mapping; D-RENDER timezone/now/environment corrections. **Integration gates:** root snapshot/cache variants, admin MRT/date consumers and widget Releases/calendar/formatting consumers.

**Exclusive domain / coverage:** formatting helpers and snapshot contract, Day.js locale resource lifecycle, MRT locale import loaders/hook; common relative-refresh adapter. Feature owners port their own calls, including Releases direct formatter/now and Assistant/backup/preview environment formatting.

- Preserve catalog aliases versus Intl (`cn→zh-CN`, `cr→en`, `zh→zh-TW`) and Day.js mappings (`cn→zh-cn`, `zh→zh-tw`, `cr→en-gb`, `no→nb`, `de-CH→de-ch`); message-engine normalization is an explicit visible choice.
- Preserve invalid-date `?`, date-only UTC day, timestamp/widget zone/hour12/seconds, compact numbers and existing SI/binary/decimal byte/bit rounding; week start remains user preference, not locale inference.
- Load/register all mapped Day.js/MRT resources, including custom ca/lt/lv/sl JSON and installed table-fork features. Replace global route-param promise/locale state with per-instance/request ownership, reject stale completion and handle load failure/retry without endless suspension.
- Serialize/restore the exact approved locale/zone/now/culture/catalog revision for server/client/cache hits; mutable formatting/Query/Day.js state is request-isolated. Time refresh is consumer lifecycle, not a frozen global translator.
- Later focused observations cover English/Hebrew/Chinese concurrency, DST/date-only/relative refresh and localized table controls. Raw environment-specific formatting is inventoried and assigned, not falsely declared universally app-localized today (L §§1,4–6).

### I18N-04 — Navigate and filter shared management UI through explicit route contracts

**Delivers:** links, debounced search and pagination work in shared management surfaces with keyboard/native navigation, safe external links and independently invalidated loaders/queries after mutations.

**Start blockers:** CORE-01 navigation/route registration interface, I18N-01 hook contract. **Decisions:** deliberate raw-search/history behavior under complete rewrite. **Integration gates:** at least one ADMIN list and one create/mutate consumer; route registrar types are single-writer inputs.

**Exclusive domain / coverage:** shared Link/Mantine root composition, routed search-input/pagination adapters, navigation/cache mutation outcome interface and dependency-light UI exports. Actual feature routes/forms/modal collections belong to their feature owners.

- Preserve semantic href/new-tab/ref/root props and safe external/native links; do not substitute a fake Next shim that drops replace/scroll/prefetch behavior without explicit redesign.
- Preserve or intentionally redesign 250ms debounce, trim/remove search, page reset, Escape/clear flush, unrelated params and loading; page input handles duplicate/invalid/unsafe/`1e3` deliberately rather than inherit Router JSON-first coercion unnoticed.
- Show bookmarks/back/forward/direct-link/link controls and locale-switch search/hash policy in an integrated admin list with translated labels and RTL keyboard behavior.
- Define mutation completion ordering and affected resources/routes; Query invalidation, Router loader invalidation and backend render revision are separate actions. Never expose arbitrary path-purge RPC or a no-op `revalidatePath` replacement.
- Feature owners port routed hooks, form submit destinations and mutation callers against this interface; root route-tree writer merges descriptors without edit contention.

### I18N-05 — Keep localized validation, modal drafts and notifications request-safe

**Delivers:** a real shared form and stacked confirm flow show localized issues/loading/errors, retain protected drafts and focus, and emit one post-mutation notification without leaking another request's language.

**Start blockers:** I18N-01 translator/types, CORE-01 provider placement interface; no dependency on finished navigation/assets/backend. **Decisions:** any deliberate interaction redesign. **Integration gates:** one ADMIN form plus a feature modal/confirmation consumes the shared primitives and endpoint structured issues.

**Exclusive domain / coverage:** form/validation core, local Zod issue mapping, base custom modal stack/confirm/footer, notification wrapper/styles; not feature form/modal collections or their transport hooks.

- Replace render-time global Zod error-map mutation with request/form-scoped issue mapping, preserving paths/params/explicit messages/transforms and controlled/uncontrolled/blur/caller options; locale-switched errors never bleed between concurrent SSR requests.
- Retain custom stack keepMounted/draft/close interceptor/onClose/focus-current-only/z-index behavior; async-confirm failure leaves dialog open and restores focus correctly in RTL. No unexplained substitution with a different modal system.
- Keep full notification data/icons/colors/pending/success/error contract, one provider/styles and no SSR imperative firing or duplicate hydration/replay notifications.
- Shared feature collections consume owner-provided auth/endpoint/navigation/invalidation callbacks: board name debounce/availability, app create-another, icon picker, media progress, password fields, quick-add/app selection, Docker removal and search media confirmation remain explicit peer obligations.
- Complete an integrated form/confirm demo with real authorized feature mutation later; regressions are limited to critical validation isolation/draft/focus/error behavior, not speculative component snapshots.

### I18N-06 — Render safe branding assets, head and Crowdin live translation

**Delivers:** the target document displays retained branding/theme/head/font assets offline where applicable, bounded local imagery and live Crowdin locale without broken hydration or permissive server image fetching.

**Start blockers:** CORE-01 document/head/CSP/provider descriptors, I18N-01 catalog identity and ADMIN-05 branding projection. **Decisions:** D-RENDER font/image/first-paint/Crowdin ownership. **Integration gates:** root document/asset composition, extended Crowdin consumer and media/image-proxy endpoint policy; no full asset backend rewrite prerequisite.

**Exclusive domain / coverage:** self-hosted font/static asset descriptors, known-image rendering policy, branding metadata/head/script descriptors and Crowdin activation adapter; root writer emits document/CSP/manifest; media/extended own remote/uploads/proxy services.

- Replace actual current three Next Image consumers (logo, about, Kubernetes known local tiles) with approved bounded native/Mantine behavior, preserving dimensions/alt/blank source/fallback; media management already uses Mantine Image (L §3). Vite is not an optimizer.
- Preserve font variable/theme/fallback intent with approved local font assets; do not introduce external Google font requests or change CJK/Hebrew metrics/privacy/offline behavior silently.
- Keep branding/favicon/OpenGraph/title/description/viewport/custom CSS and consistent theme initialization from the public snapshot; matching-build cached HTML references valid assets. Remote input never becomes trusted script/font/fetch configuration.
- Keep `cr` marker identities and live-translation capability; initialize `_jipt` before one JIPT activation, with approved safe hydration/DOM ownership, cleanup and no duplicate handlers. Do not remove live mode because SSR is difficult.
- Root/feature owners preserve first-render-safe React lazy/Suspense/client-only boundaries for board renderers, logs, Assistant, Spotlight, custom-api/anchor-note/notebook and devtools; feature-specific lazy imports are not edited by this asset owner. Later scoped font/head/Crowdin observations remain deferred.

## Exhaustive primary coverage ledgers

### Durable models — exactly 40, structural preservation primary CORE-02

**Interpretation:** CORE-02 is the sole primary ticket for preservation/conversion of each listed durable model, so no table is lost between feature lanes. The separately named **behavior owner** is the primary feature command/UI owner, not a second physical-schema writer. External owners below are seam references requiring coordinator mapping to their proposed keys; they are not invented completed prerequisites. No model counts as feature-complete from CORE-02 alone.

| # | Model | Primary preservation | Primary behavior owner / consumers |
| --- | --- | --- | --- |
| 1 | users | CORE-02 | ADMIN-01 identity/profile; ADMIN-04 preference fields; AUTH provider flows consume. |
| 2 | accounts | CORE-02 | AUTH-03 provider links/tokens. |
| 3 | sessions | CORE-02 | AUTH-01 expiry/renewal/revocation; CORE-06 disabled-provider cleanup. |
| 4 | verificationTokens | CORE-02 | AUTH-01 selected auth adapter; retained data, no invented email recovery prerequisite. |
| 5 | apiKeys | CORE-02 | AUTH-04 issuer/verifier; endpoint OAuth consumes same issuer. |
| 6 | groups | CORE-02 | ADMIN-03; extended initial group setup consumes commands. |
| 7 | groupMembers | CORE-02 | ADMIN-03; AUTH-02/03 invoke reconciliation. |
| 8 | groupPermissions | CORE-02 | ADMIN-03 storage/editing; AUTH-05 expansion/matrix. |
| 9 | invites | CORE-02 | ADMIN-02. |
| 10 | boardUserPermissions | CORE-02 | BOARD-RUNTIME/dashboard ACL command/UI owner; AUTH-05 scoped evaluation. |
| 11 | boardGroupPermissions | CORE-02 | BOARD-RUNTIME/dashboard ACL owner; AUTH-05 scoped evaluation. |
| 12 | integrationUserPermissions | CORE-02 | INTEGRATION-RUNTIME management/ACL owner; AUTH-05 scoped evaluation. |
| 13 | integrationGroupPermissions | CORE-02 | INTEGRATION-RUNTIME management/ACL owner; AUTH-05 scoped evaluation. |
| 14 | boards | CORE-02 | BOARD-RUNTIME/dashboard. |
| 15 | sections | CORE-02 | BOARD-RUNTIME/dashboard. |
| 16 | items | CORE-02 | BOARD-RUNTIME/dashboard; widget/extended bindings consume. |
| 17 | layouts | CORE-02 | BOARD-RUNTIME/dashboard breakpoint/layout role/gutter owner. |
| 18 | itemLayouts | CORE-02 | BOARD-RUNTIME/dashboard placement/resize consistency. |
| 19 | sectionLayouts | CORE-02 | BOARD-RUNTIME/dashboard container consistency. |
| 20 | sectionCollapseStates | CORE-02 | BOARD-RUNTIME/dashboard per-user collapse. |
| 21 | apps | CORE-02 | Dashboard app management/navigation owner; integration references/authorized direct ping. |
| 22 | searchEngines | CORE-02 | Dashboard/search owner; independent create/modify/full policy and templates/bangs. |
| 23 | icons | CORE-02 | ASSETS/icon-library owner; CORE-06 invokes sync service. |
| 24 | iconRepositories | CORE-02 | ASSETS/icon-library owner, transactional repository replacement. |
| 25 | integrations | CORE-02 | INTEGRATION-RUNTIME configuration/management owner. |
| 26 | integrationSecrets | CORE-02 | INTEGRATION-RUNTIME domain redaction/retention; AUTH-05 crypto policy, CORE-07 conversion. |
| 27 | integrationItems | CORE-02 | INTEGRATION-RUNTIME/dashboard binding commands. |
| 28 | customWidgetDefinitions | CORE-02 | Extended Custom JSX v2 definition/source/request/options/template/enabled/creator owner. |
| 29 | customWidgetSecrets | CORE-02 | Extended Custom JSX secret owner; CORE-07 conversion. |
| 30 | legacyCustomWidgetDefinitions | CORE-02 | Extended legacy-content conversion/readability owner; never silently dropped. |
| 31 | legacyCustomWidgetSecrets | CORE-02 | Extended legacy encrypted-content owner; CORE-07 conversion. |
| 32 | widgetSecrets | CORE-02 | WIDGET-RUNTIME/extended widget secret owner; CORE-07 conversion. |
| 33 | assistantConfigurations | CORE-02 | Extended Assistant configuration/provider discovery/key/header owner. |
| 34 | assistantThreads | CORE-02 | Extended Assistant user-owned thread owner. |
| 35 | assistantMessages | CORE-02 | Extended Assistant stored format/content/timestamp/parent owner. |
| 36 | medias | CORE-02 | ASSETS/extended media bytes/creator/upload/delete owner; endpoint delivery policy owner. |
| 37 | serverSettings | CORE-02 | ADMIN-05 family snapshots/editing; CORE-04 private claim; analytics CAS consumer. |
| 38 | onboarding | CORE-02 | Extended onboarding studio previous/current-step/claim transition owner. |
| 39 | trustedCertificateHostnames | CORE-02 | ADMIN-06. |
| 40 | cronJobConfigurations | CORE-02 | CORE-06. |

### Identity capabilities — every A ledger ID has one primary ticket

| ID | Capability | Primary ticket | Explicit peer edge / subordinate branch |
| --- | --- | --- | --- |
| I01 | Enabled provider selection/public options | AUTH-01 | AUTH-02/03 verifiers; disabled-local discrepancy decision. |
| I02 | Local password login | AUTH-01 | ADMIN-01 new-user/password writes. |
| I03 | LDAP | AUTH-02 | ADMIN-03 reconciliation; ADMIN-06 distinct TLS frontier. |
| I04 | OIDC client | AUTH-03 | AUTH-01 session/cookie; ADMIN-06 trust. |
| I05 | Provider/account linking | AUTH-03 | No unverified cross-provider merge. |
| I06 | Database/manual credential session establishment | AUTH-01 | Selected A/B/C integration, not stock Credentials support. |
| I07 | Session read/renew/expire/revoke | AUTH-01 | Endpoint long-lived delivery/dashboard caches consume current authority. |
| I08 | Cookies/CSRF/origins | AUTH-01 | Sole effect/cookie authority; endpoint maps responses. |
| I09 | Post-login profile/group/theme effects | AUTH-03 | AUTH-02 invokes LDAP branch; ADMIN-03 supplies common membership command. |
| I10 | Browser branded login/session/logout | AUTH-01 | Dashboard Query masking; I18N-02 locale stays independent. |
| I11 | Invitations/registration | ADMIN-02 | Credentials-enabled guard/session invite denial. |
| I12 | User/profile/password/recovery | ADMIN-01 | ASSETS avatar input; CLI syntax can change. |
| I13 | Group management/local/external membership | ADMIN-03 | AUTH provider reconciliation consumers. |
| I14 | Global grant inheritance/matrix/presets | AUTH-05 | ADMIN-03 preset/effective preview UI. |
| I15 | Board resource policy | AUTH-05 | Dashboard owns CRUD/ACL UI and filtered repository caller. |
| I16 | Integration query/interact/full policy | AUTH-05 | Integration/endpoint enforce principal filtering before public/native mount. |
| I17 | App/search/media visibility/reachability | AUTH-05 | Dashboard/search/media own specific commands/UI; endpoint owns media HTTP public policy. |
| I18 | API-key administration/verifier | AUTH-04 | Endpoint OAuth consumes issuer, not manual admin-create API. |
| I19 | Surface identity selection | AUTH-04 | AUTH-01 cookie authority; endpoint owns protocol authentication framing. |
| I20 | Separate MCP OAuth authority | AUTH-04 | Endpoint is exclusive flow/state-machine/discovery implementation owner; storage decisions shared. |
| I21 | MCP policy/discovery/error safety | AUTH-04 | Endpoint wire/tool metadata/rate limiting; AUTH-05 dispatch policy. |
| I22 | Setup/no-users/admin/step authorization | AUTH-05 | CORE-04 claim service; extended onboarding claim route/studio/initial user-group transactions. |
| I23 | User preferences/tours | ADMIN-04 | Dashboard home/shortcuts; cookie locale/guest theme separate. |
| I24 | Effective defaults/request contexts | ADMIN-05 | Dashboard authoritative ordered/device home resolver; root assembly. |
| I25 | Eight server-setting families/public/admin UI | ADMIN-05 | Private claim excluded; I18N culture/defaultLocale consumers. |
| I26 | Operational admin reachability | ADMIN-05 | Services/UI: AUTH-04 keys; ADMIN-06 trust; CORE-05 logs/CORE-06 tasks; extended backup/Docker/Kubernetes/Assistant; endpoint help/docs/MCP. |
| I27 | Sensitive application/provider secrets | AUTH-05 | Integration/Assistant/Custom JSX owners keep own domain guards/DTOs; CORE-07 all-family conversion. |
| I28 | Client authorization/cache lifecycle | AUTH-01 | Dashboard/Query/root and endpoint live delivery own integration consumers; resource ACL epoch not global keys alone. |

### Persistence, coordination, lifecycle and file duties — no unassigned state row

| Source capability/duty | Primary ticket | Consumer / acceptance edge |
| --- | --- | --- |
| Physical 40-model/relations/value/constraint conservation | CORE-02 | All exact models above; feature-owner acceptance still required. |
| SQL histories/journals/49+17 assets/seed/five transformations/readiness | CORE-02 | CORE-08 packages; no prototype reseed. |
| SQLite sync/PG async transaction/savepoint/locking and owned connections | CORE-02 | Dashboard roots/layout placement; icon replacement; invitation/group commands. |
| Board roots immediate/FOR UPDATE, local placement/repair serialization | CORE-02 | Dashboard owns transaction-using commands and topology-aware concurrent outcome proof; no local tail claimed distributed. |
| Analytics SQL value-CAS/default settings merge | ADMIN-05 | CORE-06 analytics sends consume; conversion supported by CORE-02. |
| Onboarding SQL winner/hashed claim/four-hour expiry | CORE-04 | AUTH-05 setup guard; extended studio transitions. |
| Latest-value fanout/listener cleanup | CORE-05 | Status/sample/log transport and feature subscribers. |
| Bounded log history/race/dedup | CORE-05 | Endpoint auth/live host; log-only permission. |
| Task execution status/latest/interruption | CORE-06 | CORE-05 transport primitive; durable config is separate. |
| Ping registry/schedule/startup clear/status | CORE-06 | Dashboard direct authorized ping survives; registry retirement needs explicit decision. |
| Shared integration/widget responses/refresh leases | CORE-03 | Integration and widget owners execute/render. |
| Generation invalidation/session deletion/statistics clearing | CORE-03 | Mutating feature owners publish affected resources; CORE-04 session store. |
| Local cache/deadlines/cancellation/late settlement/bounds | CORE-03 | Widget/provider stale policy and authorization-denial handling. |
| Shared outage timeout/no-offline-replay/local fallback | CORE-03 | Does not weaken security-store fail-closed policy. |
| Non-expiring last-good statistics/global-source slots/fencing | CORE-03 | Statistics providers/widgets. |
| 24h update-check/stale/external-connection policy | CORE-03 | About/upgrade UI; not cron registry. |
| Encrypted fingerprinted integration sessions/remaining TTL | CORE-04 | Integration execution; SQL auth sessions separate. |
| Encrypted issued image URL/header mappings/HMAC/24h TTL | CORE-04 | ASSETS image-proxy owner applies SSRF/auth/delivery; not image-body cache. |
| Custom JSX fixed-window rate/concurrency owner leases | CORE-04 | Extended request categories/network/admin/owner policies. |
| Preview encrypted state/revision CAS/journal/evidence | CORE-04 | Extended preview editor/calls/UI. |
| Configuration requests/one claimant/terminal idempotence | CORE-04 | Extended owner/admin handoff workflow. |
| Integration samples/bounded history/live publish | CORE-05 | Dashdot CPU and OPNsense interfaces provider/widget peers. |
| Generic queue export/no discovered caller | CORE-03 | Confirm caller/product retirement; not an existing durable-job/retry promise or permission to invent one. |
| Redis restart/crash/TTL preservation and conversion | CORE-08 | Each CORE-03–05/AUTH-04 service supplies explicit lifetime matrix; RDB != zero-loss, SQL backup excludes it. |
| Three registered jobs and enable/manual/run-on-start controls | CORE-06 | Analytics/icon/ping enumerated; no hidden “remaining jobs.” |
| Disabled-provider SQL-session startup cleanup | CORE-06 | AUTH-01 provider config; decide readiness failure semantics. |
| Refresh/statistics/update-check on-demand resource lifecycle | CORE-08 | CORE-03 owns bodies/bounds, not extra cron jobs. |
| Direct Docker/Beszel upstream streams | CORE-08 | Extended/provider producer plus endpoint transport own actual flow/backpressure; root drain gates release. |
| Ready/start/maintenance/signal/abort/drain/disposal | CORE-08 | All service owners export lifecycle; endpoint listener readiness/reconnect. |
| `_FILE`, configured paths/volume ownership/external DB/Redis/TLS | CORE-08 | No secret browser bundle; configuration syntax may change via approved conversion. |
| CA file security/publication and SQL hostname trust | ADMIN-06 | AUTH-03/provider Fetch; CORE-08 file/connection lifetime. |
| SQLite sensitive backup/bounds/export concurrency/PG backup frontier | CORE-07 | Extended routes/UI; identity before byte handling. |
| Temporary migration/live replacement/writer drain/rollback | CORE-07 | CORE-02/08 maintenance; extended import/onboarding callers. |
| Complete encrypted-store/key compatibility/retained state reconciliation | CORE-07 | AUTH-05 codecs; all exact secret families listed; no integration-only success. |
| Migration/restore rollback matrix/snapshots/prerequisites | CORE-07 | CORE-02 conversion contributes; no automatic binary downgrade claim. |

### Localization/shared frontend — exhaustive capability and import-family assignment

| Capability/family from L | Primary ticket | Consumer / constraint |
| --- | --- | --- |
| 36 catalog identities/English fallback/blank removal/extra keys/Crowdin IDs | I18N-01 | No catalog deletion; board.snapshot reachability remains dashboard reconciliation. |
| Root/scoped translator/messages/rich/raw/markup/has/callback helpers | I18N-01 | Feature rich-links and metadata consumers; consciously chosen API redesign allowed. |
| English-derived keys/types/pure languages/is-supported/translation-object | I18N-01 | Fix breadcrumb key derivation; no fictitious argument generator. |
| Deployment culture default→first visit/request negotiation | I18N-02 | ADMIN-05 storage/default invalidation; endpoint exclusions/onboarding access. |
| URL locale behavior/guest cookie/lifetime/switch/search/hash/cross-tab/drafts | I18N-02 | No legacy prefix bridge requirement absent approved policy; dashboard unsaved work. |
| Catalog/Intl/message-engine identity and metadata | I18N-01 | I18N-02 context and I18N-03 formatting apply chosen aliases. |
| Server translator/metadata/localized API errors/Assistant locale | I18N-01 | Root/admin/endpoint/extended own actual callers; errors retain structured identifiers. |
| ICU interpolation/plurals/number/rich safe React/parser uncertainty | I18N-01 | All-locale chosen-engine observations deferred, existing malformed != migration regression. |
| Native date-only/timestamp/zone/compact/invalid input formats | I18N-03 | Widget/calendar/Releases owners port their calls. |
| Day.js relative time/refresh and SI/binary/decimal bytes/bits | I18N-03 | Preserve units; common adapter and admin/feature consumers. |
| Environment/raw-locale formatting discrepancies | I18N-03 | Admin certificate UI; extended Assistant/backup/preview; decisions before cleanup. |
| Day.js/MRT maps/custom JSON/resources/fork/loading failure/concurrency | I18N-03 | Production import/hydration proof; no global selected locale. |
| Hebrew initial/switch document/provider RTL | I18N-02 | Dashboard/custom CSS/third-party behavior proof owned by corresponding feature. |
| Week start/units/theme culture independence | ADMIN-04 | I18N-03 consumers honor user/widget choice. |
| Crowdin JIPT configuration/order/live behavior/hydration | I18N-06 | Root/extended integration; I18N-01 preserves cr markers. |
| Typed internal/native external Link/root composition | I18N-04 | Route registrar single writer; feature buttons/cards/menus own caller adaptation. |
| Debounced search/page parser/query preservation/navigation | I18N-04 | Admin/dashboard lists; coercion/history redesign explicit. |
| MRT table localization hook | I18N-03 | Admin tables consume; I18N-04 route controls remain separate. |
| Pure UI theme/icons/styles/overlay z-index/export splitting | I18N-05 | Root integrates provider/CSS; known asset descriptors I18N-06. |
| Scoped translated Zod/useZodForm/form options | I18N-05 | Endpoint structured issues; no global z.config locale mutation. |
| Custom modal keepMounted/interceptors/async/focus/confirmation | I18N-05 | Feature modal collections remain feature-owned. |
| Notifications full API/styles/icons/dedup/no SSR effect | I18N-05 | One root placement; caller-translated text. |
| Board-create/app-create form collections | I18N-04 | Dashboard owns full mutation/name availability/create-another behavior; I18N-05 primitives. |
| Icon-picker/upload-media/password collection fields | I18N-05 | ASSETS upload/icon and ADMIN-01/02 own actual guarded callbacks and progress. |
| App selection/quick-add/Docker/search media modal collections | I18N-05 | Dashboard/extended/search owners own transports/content/action guards. |
| Revalidate-path replacement/client-loader/backend revisions | I18N-04 | Each feature owns mutation call sites; CORE-03/ADMIN-05/backend-render peer owns revisions. |
| Public-safe root bootstrap/provider/document composition | CORE-01 | CORE-08 completes production integration; no root edits by peers. |
| Theme first paint/provider snapshot/default script | I18N-06 | ADMIN-04/05 safe values; root writer mounts. |
| Actual local image/logo/about/Kubernetes asset uses | I18N-06 | Feature callers adapted by owner; media management stale fourth-import claim rejected. |
| Remote/uploads/proxy SSRF and media persistence | AUTH-05 | ASSETS/extended/endpoint own domain enforcement; CORE-02 bytes, CORE-04 registration. |
| Local Inter/font variable/glyph fallback/offline/CSP/head/assets | I18N-06 | Root asset manifest/output and matching-build cache. |
| Client-only/lazy board/log/Assistant/Spotlight/widget/devtools boundaries | I18N-06 | Each feature edits its imports; root integrates. No route splitting proof of widget/editor splitting. |
| SSR locale/zone/clock/catalog/culture/cache variants | I18N-03 | Root/dashboard render-cache owner provides varying keys/revisions; no cross-request mutable state. |
| `/client`, pure root, `/languages`, `/server`, `/request` translation families | I18N-01 | No Next server/request config in target graph; all caller ownership above. |
| `/middleware` and old routing package/plugin families | I18N-02 | CORE-08 removes obsolete target glue, no replacement plugin needed by default. |
| `/dayjs` family | I18N-03 | Replaces route-param/global resource loader. |
| Direct next-intl useFormatter/useNow/useLocale/provider imports | I18N-01 | Releases widget, Scalar endpoint frame, root and feature owners use agreed facade. |
| Chosen standalone dependency/dependency catalog/lock integration | CORE-01 | I18N-01 proposes chosen direct dependency; same sole writer via CORE-08. |
| Separate docs/Go Workshop framework boundary | CORE-08 | Outside application runtime replacement; no whole-repo Next removal obligation. |

## Cross-area ownership contracts that must appear in the reconciled graph

- **Endpoint/TRANSPORTS owner:** complete procedure census, Fetch/oRPC/live/MCP/REST hosts, response/error/structured-issue mapping, auth-mode mounting, OAuth state machine/discovery/limits, upload/download/claim transport and localized API callers. AUTH-01/04/05 supply authority/effects, not duplicate hosts. Endpoint scope is not researched again here.
- **Dashboard/BOARD-RUNTIME owner:** board/layout/section/item/ACL transactions and editor/UI, public reads and filtered evidence, apps/search/direct ping, authoritative ordered/device home resolver, header/shortcut visibility, request-safe render cache/revisions and client resource-ACL invalidation. Native policy discrepancy is fixed with AUTH-05, not deferred behind all widgets.
- **Integration/WIDGET-RUNTIME owners:** provider execution/management/ACL/config/secret projections, response-generation mutation hooks, stats/update/sample consumers, Releases formatting/calendar/date/unit callers and Dashdot/OPNsense histories. AUTH-05 does not replace provider-specific network/action guards.
- **Media/ASSETS owner:** media SQL bytes/creator/delete/upload/progress, icons/repositories/search/auth/transactional replacement, image-proxy retrieval/SSRF/public URL policy. CORE-04 supplies encrypted registration lifetime; I18N-06 known-image rendering is not a permissive optimizer. Public media HTTP security requires explicit endpoint ownership.
- **Extended owner:** Assistant configuration/thread/message ownership and encrypted key/headers; all v2/legacy Custom JSX definitions/secrets plus widget secrets, preview/configuration workflow UI; onboarding previous/current-step and initial admin/user/group transitions; backup/import/export routes/UI; Docker/Kubernetes/Beszel direct actions/streams, applicable CLI capabilities and Crowdin interaction. CORE-07 owns archive/file replacement only; identity owns authorization before bytes/decrypt. No duplicate low-level restore implementation.
- **Root writer:** CORE-01 then CORE-08 owns composition/manifests/lock/route registrations/document/CSP/packaging, taking feature descriptors. A stable contract unlocks peers; a production feature cannot claim accepted until its real consumer/authorization/persistence is integrated.

## Source-discrepancy and safety acceptance ownership

| Evidence discrepancy / unsupported assertion | Primary acceptance owner |
| --- | --- |
| SQLite/PG `openSearchInNewTab` defaults differ; fixture PRAGMAs are not production defaults | CORE-02; ADMIN-01/04 decide future defaults. |
| Stock Core Credentials database strategy is unsupported; placeholder only bypasses assertion | AUTH-01 selected request-local maintained bridge/custom boundary/replacement proof. |
| LDAP-only filter retains local credential login despite disabled registration/UI | AUTH-01 provider policy; AUTH-02 enforces selected directory/local distinction. |
| Native integration middleware loads unrelated ACL grants | AUTH-05 filtered every-selector evidence and anonymous/unrelated deny proof before mount. |
| `removeMember` lacks target-provider eligibility check | ADMIN-03 approved symmetric target policy and re-login reconciliation proof. |
| Standalone session reader accepts expired rows; live snapshot/browser timer/global-only cache scope stale | AUTH-01 expiry and consumer invalidation; endpoint/dashboard enforce chosen ongoing latency. |
| Forwarded origin is trusted unconditionally; cookie secure computed pre-rewrite | AUTH-01 approved proxy/trusted-origin/cookie matrix, no open redirect or arbitrary host trust. |
| HTTP password change retains sessions, CLI revokes; last-admin invariant not proven | ADMIN-01 explicit revocation/key-survival/recovery decision and proof. |
| OAuth secret advertisement/verification, absent consent, metadata scope without stored isolation | AUTH-04 authority decision; endpoint actual protocol/schema/storage implementation. |
| OAuth TTL/cap maps process-local/restart-lost | AUTH-04 storage/lifetime decision; endpoint store owner with shared atomics contract. |
| Home target/caller and group desktop/mobile fallback differ; generic settings save weaker | ADMIN-03–05 designated field/command owners with dashboard authoritative resolver. |
| Partial integration-only backup key conversion; restore lacks demonstrated writer drain | CORE-07 every-family conversion plus maintenance/recovery; no unsafe restore approval. |
| Async cron callbacks/no queue/distributed exclusion; disabled→enabled safety not proven | CORE-06 approved overlap/replica/recovery and actual lifecycle acceptance. |
| Generic Nitro storage/tasks/db0 do not establish transaction/CAS/TTL/fanout/drain parity | CORE-02–08 as applicable; no optional platform replacement as prerequisite. |
| Day.js global resource race; render-time global Zod locale mutation | I18N-03 request/per-instance formatting; I18N-05 scoped issue mapping. |
| Locale hook drops search/hash; raw locale differs from Intl engine and environment formatting | I18N-02/03 explicit correction choices and snapshots, not accidental conversion. |
| Non-English catalogs add seven keys; malformed rich/ICU not validated by lexical scan | I18N-01 conservation/parser uncertainty; dashboard resolves snapshot reachability. |
| SSR DirectionProvider starts ltr; first-paint now/zone defaults not deterministic evidence | I18N-02 direction; I18N-03 snapshot; root integration consumes both. |
| Current main app has three Next Image imports, not old four-count evidence | I18N-06 actual caller assignment; no redundant media optimizer. |

## Remaining blockers and granularity review

1. Human decision dependencies above remain grilled, not approved. Particularly topology/storage/auth/locale affect acceptance and conversion, not whether every independent domain port can start.
2. Coordinator must assign actual proposed peer keys to every external owner in these ledgers. **Potential ownership gaps:** reachable board.snapshot feature; public media HTTP delivery policy; auth revocation/resource-ACL epoch and render-cache revisions; exact extended CLI capability partition; OAuth store files versus shared backend atomics. No lost capability is inferred from unknown ownership or unused export.
3. **Potential oversized tickets:** CORE-02 if engine/ORM replacement or broad historical conversion is chosen; CORE-04 if all security stores need a new backend; CORE-07 for cross-engine/cross-key restore; AUTH-01 if full replacement auth is chosen. Split by demonstrated conversion/backend frontier after decisions, retaining stable keys as parent candidates; do not convert these into mandatory full-infrastructure chains. Current scopes assume reusable domain bodies/adapters, not blanket algorithm rewrite.
4. I18N-05 intentionally owns only base validation/modal/notification primitives; collection calls and actual UI forms stay vertical with feature owners. ADMIN-05 owns typed settings/safe projection/navigation, not every operational tool. AUTH-04 owns key/authority contract; endpoint owns OAuth flow implementation. These boundaries prevent 25 tickets from disguising giant feature catch-all batches.
5. The integrated acceptance plan is obligations, not a request to run checks now. Later batch gates exercise scoped migration/security/critical-flow observations on disposable data, Nitro-only build validity and focused lint/typecheck for changed target packages. No broad suites, intermediate full-repo gate, source edits, publishing or container mutation were performed for this draft.

The coordinator should present a reconciled numbered graph for granularity/dependency approval, not mark these tickets runnable for agents before the user approves.
