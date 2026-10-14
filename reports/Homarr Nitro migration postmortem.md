# Homarr Nitro migration: stopped experiment and lessons

**Stopped by the user on October 14, 2026. No verified, runnable current-source Homarr replacement was delivered.**

Parent issue: [AJN-482 — Find the route to a lightweight Nitro Homarr](https://linear.app/ajnart/issue/AJN-482/find-the-route-to-a-lightweight-nitro-homarr).

**Archival follow-up:** the user subsequently requested committing and pushing the complete checkout work, including `.scratch` and `.slim` records. That snapshot is on `docs/nitro-migration-postmortem`; the [handoff prompt](Homarr%20Nitro%20migration%20handoff%20prompt.md) maps its contents. This expands preservation, not migration or runtime authorization. Statements below about the documentation-only commit describe the initial commit `0240e5cfd`, before that follow-up.

## Bottom line

The user describes roughly five days of work without the server they needed. The agent produced substantial research, extracted source, contracts, reviews and validation records, but failed to turn them into a maintained application that the user could start and test. A small earlier fixture did run; it was not the full migration and must not be presented as its delivery.

The main failure was execution and sequencing, not a demonstrated impossibility of the selected stack. I let process replace progress: increasingly elaborate ownership, publication and evidence machinery became prerequisites to basic integration. I failed to preserve the requested playable milestone, delayed real application feedback, and continued generating narrowly accepted modules while the runnable path remained incomplete. The user's safety requirements did not require this outcome; choosing an isolated, synthetic development path earlier was my responsibility.

This document preserves the chosen direction, actual findings, limits and lessons. It does **not** restart the experiment, approve the unfinished implementation, authorize real-data migration, or provide a verified launch command. The documentation commit excludes application source, configuration, migrations, binaries and private runtime evidence; existing uncommitted experiment work stays in the checkout.

## 1. The path we chose

The investigation started by comparing hosting, rendering, storage and transport options. The user then approved a full rewrite with direct reuse/adaptation of Homarr's real domain and UI behavior, rather than retaining every old framework interface or replacing the product with a miniature demo.

### Selected architecture

| Area                      | Chosen direction                                                                                            | Important boundary                                                                                                                                                               |
| ------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Application host/build    | Nitro v3, with `apps/backend` owning server composition and lifecycle                                       | One application authority and one listener; not a second server per feature. The inspected application pin is `nitro@3.0.260903-beta`.                                           |
| Frontend                  | Vite + React, in `apps/nitro`                                                                               | Explicit server rendering, document assets, bootstrap and browser hydration; Vite alone does not replace Next App Router.                                                        |
| Navigation                | TanStack Router file routes and manual SSR                                                                  | Not TanStack Start. Route params, search state, loaders and navigation remain typed.                                                                                             |
| Browser/server procedures | Direct oRPC, pinned to `2.0.0-beta.43`, with TanStack Query                                                 | Real SDK validation, encoding, generated options/keys and cancellation; not hand-written imitation RPC.                                                                          |
| HTTP/API surfaces         | Explicit protocol handlers and curated REST/MCP catalogs                                                    | Auth, OAuth, uploads, backup, Assistant and MCP retain their own protocol requirements. Internal procedures are not automatically public tools.                                  |
| Relational storage        | Drizzle with direct drivers; SQLite default, PostgreSQL optional                                            | Bun SQLite was the selected SQLite candidate. PostgreSQL transactions require an owned checked-out pool client. db0 was not selected for the transaction-sensitive path.         |
| Redis removal             | Nitro storage/KV where suitable for disposable caches; SQL for durable/security state                       | KV is not a replacement for transactions, claims, counters, revocation or restart-safe history.                                                                                  |
| Authentication            | Auth.js Core for actual OIDC; Homarr-owned local/LDAP establishment of opaque SQL sessions                  | Preserve bcrypt hashes, provider identities, groups, current permissions and revocation; no silent JWT conversion or placeholder-provider bypass.                                |
| Live delivery             | HTTP/SSE on the same listener for logs, task status and live widgets                                        | Assistant UI-message streams, MCP and upstream Docker/Beszel protocols are separate contracts.                                                                                   |
| UI                        | Retain Mantine and recognizable Homarr dashboard/editor interactions                                        | Reuse real components and domain logic; replace framework/transport glue.                                                                                                        |
| Localization              | Standalone `use-intl` behind the translation facade                                                         | Preserve all 36 catalogs, fallback, rich messages, plurals, locale/RTL and explicit formatting state.                                                                            |
| Board editing             | One coherent draft covering layouts, sections, items and widget options                                     | Save commits the whole draft; Discard must not leave hidden immediate durable writes.                                                                                            |
| Deployment                | Strict singleton: one active backend per data directory; one relocatable artifact                           | Ordinary self-hosted servers remain the target. No mandatory Cloudflare, tunnels, Docker or Mac-specific configuration. Overlapping replicas/cluster workers were not supported. |
| Migration                 | Import copied legacy content, including a current SQLite backup, without touching the original installation | Preserve all durable content through explicit conversion. A migration-time logout was permitted; losing accounts, passwords or permissions was not.                              |

Hono and Elysia were investigated, but neither became the selected application authority. The historical branch name `rework-hono` does not describe the final selected stack. The separate documentation site and Go/PocketBase Workshop service were outside replacement scope; Homarr-facing Workshop capabilities were not.

External URLs, API shapes, CLI syntax and serialized formats could change deliberately. That freedom was **not** permission to drop capabilities or reinterpret durable content. Later instructions explicitly favored adapting existing services, algorithms, bounds and defaults, with separately approved behavior/security repairs.

Additional approved repairs included principal-scoped Integration/Widget grants, rather than allowing another user's grants to authorize the caller, and target-only custom HTTPS CA overrides without weakening proxy trust or hostname checks.

### Product scope that the fixture did not cover

The source inventories reconciled 61 page entries, 334 application procedures, 52 curated REST selections, 133 static MCP candidates, 40 durable models, 89 integration identities, 69 widget kinds, 372 direct widget options and 25 option-input types. These are coverage inventories, not proof of working replacement features or mandatory identical target names.

The approved implementation breakdown contained 125 local tickets. Linear's issue limit led to local ticket files; these numbers were not invented Linear IDs. Approval of the breakdown did not mean the tickets were complete.

## 2. What actually happened

| Stage                                            | What was produced                                                                                                                                                        | What remained missing                                                                                                                                             |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| October 10: research and feasibility             | Versioned stack research; eight product inventories; bounded SQL, auth and localization investigations; a small mounted Nitro fixture with HTTP/browser observations     | Full Homarr behavior, production auth, full-model restore, runtime parity and fair footprint comparison.                                                          |
| October 10–11: full migration decisions          | The 125-ticket plan, resolved state/database/editor/transport choices, source reuse direction, and later split OIDC/local-session architecture                           | A continuously integrated replacement application.                                                                                                                |
| October 11–13: broad source work and convergence | Large-scale package/API/UI extraction, parallel feature work, compiler repairs, packaging work, source reviews and increasingly detailed ownership/publication contracts | Feature activation and the real startup-to-browser path lagged behind the extracted code.                                                                         |
| October 13: contained native progress            | Historical compiler/static packaging receipts, synthetic schema observations and one independently accepted empty-memory native runtime invocation                       | Current application boot, populated data continuity, private UI, file-backed restart and PostgreSQL/Node parity.                                                  |
| October 14: onboarding/CORE joins and stop       | Reviewed onboarding write preparation and CORE DB/Auth source; an API author was cancelled and a configuration-plan review was cancelled                                 | Actual CORE backend/root/configuration/publication/SSR installation, usable `/init`, complete setup and a verified local launch. The user stopped the experiment. |

This is a reconstruction from the conversation and retained records, not measured time accounting. There is no reliable per-stage hours, token-cost or financial ledger in this archive.

### Evidence that is worth keeping, without overstating it

- **Earlier fixture:** the October 10 handoff records populated public/private fixture HTML, coherent bootstrap/hydration, real typed calls, authorized warm-cache denial, stale widget behavior, revision-conflict handling, and browser saves without changing the build. Its two-board synthetic model and fixture identity selection were not production Homarr authentication or full persistence.
- **Compatibility probes:** direct-driver transaction behavior, Auth.js failure behavior and standalone localization were actually exercised within their documented small fixtures. Their negative findings were useful architectural evidence.
- **Compiler/build work:** historical frozen generations reached successful scoped typechecks and a full candidate compiler result. Static inspections covered shared host ownership, assets, migration files and relocation/dependency closure. Those receipts do not validate later source changes or a running app.
- **Focused Fetch checks:** one existing in-process test file exposed incorrect aggregation of a sole HEAD cancellation error; the narrow fix passed its 10 existing cases. That was not socket, database or browser acceptance.
- **Native schema observation:** one synthetic SQLite metadata migration observed 103 schema objects, 46 tables and 51 ledger rows, with retained statements finalized and closure recorded. Product admission remained withheld; observing metadata did not prove unchanged epochs or populated-content preservation.
- **Empty-memory native result:** one historical invocation received independent acceptance for initialization/readiness, schema/history validation, epoch and an empty credential-domain path, plus namespace-derived owned closure. It covered its frozen 435-input generation, not the later DB/Auth/API sources or the product. Detailed child/raw transport evidence and stronger resource guarantees remained limited.
- **Source acceptance:** integration lifecycle, admin reads/SSE, backup preparation, media/icon bridges, all 69 widget definitions/manifests, onboarding A–F preparation, preservation observer and CORE DB/Auth received scoped reviews. Source acceptance means the reviewed code had the stated properties; it does not mean those features were installed or used successfully.

The last recorded procedure acceptance remained **91/334**. A specific widget activation ledger remained **0/9**; that is not a claim that there were only nine widget kinds, or that all 69 kinds had functioning replacement consumers. Approximate progress percentages in old notes were estimates, not release evidence.

### Why “just start the app” still failed

The latest investigation did not launch a server. Startup configuration required the canonical packaged `server/index.mjs` position and exactly one `--homarr-host-config=` argument. The ordinary Vite dev entry did not supply that verified initialization path. Dev also targeted protected port 3200 and enabled route generation; the saved later preview artifact was absent. No current launch URL was established.

The dirty checkout's root `dev`, `build` and `start` scripts point at Nitro, but that is not proof those commands work. The earlier port-3100 fixture is historical evidence, not a substitute for starting the current migration, and its current availability was not reverified for this documentation task.

This exposed a basic delivery failure: the production-oriented startup contract had no maintained ordinary development companion. Local manual testing had become dependent on unfinished production integration.

## 3. What went wrong and what consumed the effort

### Horizontal progress replaced a runnable vertical slice

Many routers, definitions, views and factories were extracted before their real registering caller, request context, configuration and browser consumer existed. “Prepared,” “source accepted,” “compiled,” “enrolled” and “runtime proven” became a long chain with little user-visible progress. Even the small onboarding flow was split across Auth, DB, API, MAIN, publication, enrollment, browser preparation, CORE reads, configuration, SSR and installation.

**Lesson:** keep a walking application working while replacing one complete user flow at a time. A factory with no real caller is preparation, not a delivered feature.

### Review became recursive project infrastructure

The records repeatedly show plan → plan review → narrow file lease → source freeze → two source reviews → scoped checks → repair plan → repair review → new freeze/checks/review. The same machinery was applied to type annotations, control-character checks and formatter-stable callbacks as to security and durable writes. By the final CORE stages, substantial parallel capacity coexisted with just one product writer or none.

Some reviews found real defects: unrelated-principal grants, premature freeze checks, stranded abandonment, incorrect cleanup classification, raw clock validation and malformed native TEXT handling. The mistake was not caring about correctness; it was treating every repair as a reason to suspend the integration path and create another planning layer.

**Lesson:** reserve heavyweight independent review for concrete security, data-loss and ambiguous-write boundaries. Batch ordinary compiler/style repairs within an owned change and then validate the actual joined flow. A report-only task needs a specific decision and stopping condition.

### Safety controls grew into a second system

Contained native checks accumulated supervisors, immutable manifests, once-locks, read/write receipts, launcher contracts, inode/mode checks, process/namespace closure evidence and repeated source/compiled/output reviews. Several attempts failed before native application work: Docker metadata omissions or null representations, an `argv0` mismatch, padded resource-limit output, cached environment/inventory assumptions and a historical non-UUID snapshot ID.

These failures were often about the harness's assumptions, not Homarr. Preserving failed evidence was correct. Allowing harness implementation to dominate the migration was not.

**Lesson:** separate build, harmless synthetic development and destructive/real-data operations. Establish the smallest reusable isolation envelope first. Add a safeguard only when it addresses a concrete hazard, without weakening real-data, no-replay or authorization boundaries.

### Parallelism did not remove the integration bottleneck

Exclusive ownership reduced edit collisions, and coverage ledgers helped avoid missing features. However, central composition, registries, manifests, exports, shared contexts and validation became a serial dependency. More workers produced more ports and handoffs than the composition owner could join. The latest cap was 32 workers/reviewers; the cap was permission, not a useful team-size target.

**Lesson:** parallelize independently consumable user flows after a small runnable foundation. Keep integration capacity reserved, avoid concurrent edits to shared contracts, and use smaller batches than the integrator can actually finish.

### Frozen snapshots protected claims but postponed feedback

Multiple historical generations had their own green checks or accepted artifacts. Later Auth/DB/API changes invalidated current-green claims, yet fresh joins still waited through long freeze cycles before runtime feedback. Errors that a basic development launch could have revealed stayed hidden behind static preparation.

**Lesson:** a pass belongs to its exact inputs, but provenance should not prevent a short feedback loop. Verify the current joined app regularly; retain old receipts as historical evidence, not as substitutes for present execution.

### Process language hid the distance to the user's goal

The progress and roster accumulated dense reverse-chronological shorthand, session IDs, hashes and repeated “held” clauses. Some top entries became stale after cancellation. Estimated percentages and many “ACCEPT” labels were hard to reconcile with “no app to test.” The record was precise in places but poor at explaining practical readiness.

**Lesson:** lead every milestone update with the current URL/command, working user flows, concrete blocker and next runnable increment. Keep a small current status table separate from immutable history. Do not make the user parse an evidence ledger to discover that nothing is running.

### Work was not consolidated into useful completed deliverables

Extensive source changes remained uncommitted at shutdown, including cancelled work without a completed handoff. The experiment could not offer a reliable current runnable checkpoint or a straightforward reviewable product increment.

**Lesson:** finish, demonstrate and checkpoint bounded increments instead of accumulating a repository-sized dirty rewrite. Commit only owned, completed scope; never stage another owner's unfinished work indiscriminately. More skills, agents or instructions would not by themselves fix this failure.

## 4. Technical findings worth carrying forward

### 4.1 Verify the installed artifact, not the framework label

- Nitro v3 beta, current main/nightly and Nitro v2 differ materially. Released v3 uses `nitro/storage`/`useStorage`; newer main's KV/cache APIs and defaults were not interchangeable with the selected beta.
- The named Nitro TanStack “SSR” example was CSR: empty root plus `createRoot`, without a server renderer/dehydration. Its name was not proof of manual Router SSR support.
- A mounted Fetch framework does not remove Nitro's outer lifecycle. Middleware in a fallback server entry can miss separately matched routes; a nested 404 can consume page-renderer fallthrough.
- Context7 quota failures were recorded. Installed source/declarations and versioned first-party artifacts supplied the missing evidence; repeated quota calls would not have helped.
- Declared, installed and locked dependencies can disagree. The inventories found an AI SDK version mismatch and an oRPC Zod-converter peer mismatch. Package-export restrictions can also make `require.resolve('package/package.json')` fail even when the package is installed.

**Carry forward:** lock a coherent small stack and verify its public exports and actual import graph before expanding the migration. Historical versions here are evidence, not recommendations to keep using those versions indefinitely.

### 4.2 Bundling can duplicate the application authority

The fixture's intermediate Vite SSR build initially compiled a second session map, so HTTP login and private SSR used different authorities. The working correction externalized original server source in the intermediate SSR stage, kept absolute external IDs and let the final Nitro build own the shared server graph. Later full builds also failed to resolve external workspace/router imports from isolated output directories.

React, Router, Query, Mantine and other stateful libraries needed deliberate single ownership/deduplication. CLI/native-addon closure was separate: a successful browser/server compile did not ensure bcrypt and its platform files resolved from the emitted CLI coordinate. The actual CLI output was `cli/cli.cjs`, not an assumed `cli/index.mjs`.

**Carry forward:** prove one host/session/database owner across SSR and API, and inspect the complete emitted artifact from outside the checkout. Native addons require exact OS/architecture/libc/runtime checks; a package's presence is not proof it loads.

### 4.3 Auth.js Fetch support did not solve Credentials database sessions

The Core `0.41.3` probe rejected actual Credentials/LDAP providers with database sessions as `UnsupportedStrategy`, before verification or adapter writes. Existing NextAuth used a placeholder OAuth provider plus manual opaque-session/JWT-encode glue; that was not stock supported database-Credentials behavior.

The probe also observed swallowed late sign-in event failures, renewal persisting before a later callback failure, renewal projection using the pre-update expiry, and module-scoped Credentials assertion state affecting a later configuration in the same process. A per-request config did not isolate all library internals. JWT diagnostic success did not prove opaque database-session support. The auth probe's Node `24.16.0` was below the declared `24.18.0` target.

**Carry forward:** retain the selected split: real Auth.js OIDC and a bounded Homarr local/LDAP SQL-session service. Keep one session authority and current authorization, transaction-aware critical effects, trusted origin/CSRF, separate `Set-Cookie` headers and explicit failure cleanup. The public Session DTO stays `{expires,user:{id,name,email,image,colorScheme,permissions}}`; no invented session-version property.

### 4.4 Transaction ownership matters more than promise-shaped APIs

Direct Drizzle/Bun SQLite and checked-out PostgreSQL clients passed bounded rollback/savepoint/value tests. An async SQLite transaction callback was unsafe: work committed before its awaited continuation, and late writes survived rejection. PostgreSQL statements within a transaction must use the same checked-out client, not independent pool queries.

Pinned db0 `0.4.1` used shared sessions that allowed logical callers' transactions to interfere. Retained prepared statements could operate after wrapper disposal; its Drizzle integration failed against `0.45.2`. These were bounded observations, not universal statements about all future versions.

**Carry forward:** synchronous SQLite transaction bodies, explicit PostgreSQL client ownership, no escaped statement/transaction handles, and shutdown that drains real work before closing resources. A timeout or aborted outer promise does not prove the native operation stopped. Keep ambiguous COMMIT outcomes quarantined rather than claiming rollback or retrying them.

Credential sequences remained SQL INTEGER/BIGINT with canonical decimal TEXT reads/binds and checked signed-64-bit arithmetic; coercing them through JavaScript numbers could lose identity. First-adoption provenance was verified only for native fresh `:memory:` ownership, not for a file based on its pathname.

### 4.5 Migration metadata and data preservation are different proofs

Preserve actual historical SQL files, journal order, timestamps and custom transformations, not just a newly generated terminal schema. The work generated SQLite `0050` and PostgreSQL `0018` assets, but runtime anchors still pointed at `0049`/`0017` in relevant historical checks. A metadata migration could pass without validating the complete target/admission path. Resetting an epoch is not proof that an epoch stayed unchanged.

A historical snapshot had a non-UUID ID; unique/continuous actual lineage mattered more than a guessed UUID rule. Bun `1.4.2`'s probed `create:false` combination could still create an absent file; explicit `readwrite:true` rejected the absent file in that probe. Open-mode behavior needed execution, not inference from option names.

Exact-record preservation must retain NULL/type distinctions, duplicate records, BLOBs, serialized values and relationships. JavaScript text can already contain replacement characters from driver decoding; `isWellFormed()` cannot certify the original bytes. The CORE source repair used bounded native type/length checks, BLOB-cast selected TEXT and fatal decoding for the observed encoding. Current Bun UTF-16/fatal-decoder behavior was still unmeasured.

**Carry forward:** distinguish schema/history authentication, empty initialization, populated pre/post equality, restart continuity and live replacement. The preservation observer was source-accepted, but no completed populated capture/baseline/installer/restart proof followed.

### 4.6 Cache data and HTML, never authorization

Widget query-cache reuse is not stored HTML reuse. Mutable boards cannot depend on per-board application rebuilds. Cached HTML must travel with the exact loader/Query snapshot, locale, time, geometry and document inputs that produced it; newer data can refresh after matching hydration, not silently replace the bootstrap under old markup.

Authorization must run on every private HTML/bootstrap/widget-cache delivery, including hits. Board ID or global permission keys alone cannot represent personalized content or every resource ACL change. Request-local router/Query/session state cannot become shared cache state. Session/logout/permission changes must mask or clear private browser state before showing another identity.

Actual fixture integration caught two mundane failures: Nitro's virtual assets object contained a non-DTO `merge` function, and the installed Router encoded the root match as `__root__\0`. Guessing the serialized shape broke populated pages or hydration.

**Carry forward:** separate immutable assets, render artifacts, backend widget values and browser Query state. Use explicit revisions/generations and authorized projections. Include stale/error semantics and observation time; a reset cache timestamp does not establish fresh upstream data.

### 4.7 Typed RPC still needs real execution and consumers

oRPC's RPC handler, REST handler and OpenAPI generator are separate jobs. Schema security metadata does not execute policy, and inferred output types are not runtime output validation. Existing durable SuperJSON encodings are independent of choosing a different RPC serializer.

Generated Query options/keys must be used consistently by loaders, consumers, refresh and invalidation. The old tRPC key layout cannot be assumed for oRPC. RPC defaults also mattered: the fixture's GET readiness request to a POST RPC route returned 404.

The later exact-context design found that SDK middleware can clone/merge context. Its narrow CORE handler therefore required a genuine constructor-born context and real codec decode before the bound read, rather than casts or fabricated `BackendContext` fields. This was a constraint of that security design, not a reason to invent a general context-registration framework for every feature.

**Carry forward:** use actual public SDK handlers and source guards/error mapping. Auth owns the bounded original body cache; API owns SDK execution. Do not replace missing callers with DTOs, authority booleans, registration callbacks or hand-made packets. A generated client that is never installed is not a working browser flow.

### 4.8 Most UI is reusable, but its dependency and state seams are real

Shared barrels can transitively import Next, server environment, auth or DB code even when a component has no direct Next import. Separate browser-safe definitions/types/presentation from server execution; replacing application imports alone is insufficient.

Preserve nested board geometry, responsive layouts, portals, advanced-focus state, lazy editors, custom modal stacks, focus, draft recovery and source-specific query inputs. Widget definitions/option schemas are not renderer activation. Browser-only editors/Custom JSX/video lifecycles must not be pulled into SSR merely because Vite supports it. Preserve valid `false`, `0` and empty-string options through nullish, not falsy, defaults.

Source reviews found genuine interaction defects, including server-normalized app values being compared against raw form data and stale async pending-state reads. Compiler success alone did not clear these user-visible paths.

Router search parsing also differs from old raw-string schemas: `?edit=true`/`?page=2` can become boolean/number. Preserve or deliberately normalize query strings, duplicate params, modifiers/new tabs, replace/back behavior and meaningful unrelated state. There was only one discovered `"use server"` revalidation wrapper; domain mutations already lived in API procedures.

**Carry forward:** adapt the actual interaction, not just its JSX or route name. Verify one real view/edit/error flow before extracting the entire UI graph.

### 4.9 Localization needs explicit request state, not global locale mutation

Standalone `use-intl@4.13.1` exercised all 36 unchanged catalogs and concurrent explicit translation/provider snapshots. It found 28 existing ICU parse failures; these were not rewritten or treated as migration-induced defects. Blank-leaf fallback, extra non-English keys and development/production missing-values behavior were material differences.

Day.js/global Zod/locale resource state could leak or race across SSR requests. Catalog identity and normalized Intl locale were not always the same (`cn`, `zh`, `cr`). Server translation probes did not establish browser hydration, RTL switching, dynamic imports or complete DST/formatting behavior.

**Carry forward:** request-owned locale/timezone/now, immutable catalog caching and per-instance formatting. Keep source diagnostics visible and distinguish an existing malformed translation from a new framework regression.

### 4.10 Live delivery and cleanup have separate observation boundaries

Constructing a Response, reaching Fetch body EOF, completing a socket writer and the client receiving/using bytes are different events. No verified per-response writer/finish hook was found for the inspected `srvx/bun` surface. A conditional Node `ServerResponse` bridge was investigated but not approved or runtime-proved; its request URL representation also conflicted with strict ingress assumptions.

The browser can wait for its own SDK/body/cancellation tasks, not unknowable server acknowledgement after a failed POST. The preparatory browser design was corrected to retain server UNKNOWN evidence and prohibit automatic mutation replay without requiring an impossible acknowledgement.

Reader cleanup can surface the same terminal error through `read`, `closed` and `cancel`; distinguish a replay of one primary failure from a genuinely distinct cancellation/release error. Always attempt applicable cleanup, preserve body-first failure and distinct causes, and drain actual tasks rather than treating `Promise.race` as settlement. Publish owned task completions before work can run, avoid self-await during retirement, and separate work retirement from response-delivery lifetime.

**Carry forward:** use original decreasing budgets and real failure/close evidence. A cancelled request does not undo a committed write. Do not fabricate socket guarantees or a client receipt, renew deadlines during handoff, or automatically resend ambiguous effects.

### 4.11 Backups, secrets and provider capabilities cannot be simplified by name

A current SQLite backup is more than a few tables. Preserve all 40 durable models, references, passwords/API-key hashes, linked identities, boards/options, media bytes, Assistant history/configuration and Custom Widget legacy/secret state. Existing backup re-encryption of integration secrets did not establish complete Assistant/Custom Widget cross-key conversion. Archives can include the encryption key and require confidential handling.

SQL backups did not automatically include Redis state or CA files. Redis held encrypted sessions/image mappings, histories, claims, rate/concurrency controls and generations, not just disposable responses. Its removal requires a duty-by-duty lifetime/atomicity conversion. Singleton deployment still has concurrent requests.

Integration identities, native clients, Stats projections and generic HTTP eligibility are different catalogs. An HTTP 200 can contain a provider failure; empty/unavailable/unsupported must not become fake zeros. Authorize the exact principal/resource/action before decryption. Native board-derived read access is not permission for arbitrary upstream GETs or controls. Configuration flags describe configuration, not a successful capability probe; missing inputs must not become invented disabled-service results.

**Carry forward:** reuse these source-owned policies, codecs and clients. Prove copied populated content and encrypted families before any production cutover. Real credentials, real restore and live provider actions still need separate authorization.

## 5. Performance conclusions we can honestly keep

There is **no fair, full-Homarr RAM, image-size, speed or DX comparison proving the selected stack better**. Framework microbenchmarks and a small fixture cannot establish whole-product savings. The shipping baseline was Node with embedded task/WebSocket work plus nginx and configured Redis, not simply “several separate JS servers”; removing auxiliaries must be accounted for separately.

One historical October 10 warm fixture sample recorded:

| Observation                   | Historical value   | Limit                                                                              |
| ----------------------------- | ------------------ | ---------------------------------------------------------------------------------- |
| Total cgroup memory           | 95.465–103.984 MiB | Includes cache, healthchecks and transient observers; uncontrolled human workload. |
| Bun PID1 RSS                  | 65.703–67.078 MiB  | Not total deployment memory or a Node comparison.                                  |
| Local uncompressed image size | 227.059 MiB        | Not compressed pull bytes; authoritative compressed size was unavailable.          |

Keep these as exploratory observations only. Useful-board completion, errors, correct effects, restart and stream behavior must match before timing. Separate cold/warm states, application/container/deployment memory, compressed/unpacked image size, and build/development/runtime costs. Bun tooling success does not establish production Node or native-platform parity. No numerical product budget or savings claim should be invented from these records.

## 6. A smaller approach if a new experiment is explicitly requested

This is advice, not an active plan or authorization to continue.

1. **Deliver the development entry first.** One isolated command, one unprotected loopback port, synthetic data and an actual current URL. Prove the same root/configuration owner serves a page and a real DB-backed API call. Keep production packaging separate, with an explicit companion development configuration path.
2. **Join one real identity/onboarding flow.** Mount genuine CORE reads and setup/session behavior with the selected auth architecture. Do not advertise a usable installer until `/init`, the browser caller and the required transitions actually work. Never invent an admin to make a page render.
3. **Complete one board slice.** Public/private viewing, two representative widgets, coherent hydration, a real atomic draft save, failure/conflict recovery, logout isolation and synthetic restart. Preserve a demonstrable checkpoint while expanding.
4. **Add vertical feature batches.** Each needs its service, actual registration, generated client, UI and focused validation. Use a small number of owners and a dedicated integrator; increase parallelism only when useful joins keep pace.
5. **Prove copied data and packaging separately.** Validate full backup/crypto preservation and target runtime/platform behavior on disposable authorized copies before restore/cutover. Do not treat empty-memory initialization as populated migration acceptance.
6. **Measure only comparable systems.** Decide what improvement is worth the rewrite once a representative running slice exists. If progress again becomes reports without a URL or user flow, stop and reduce scope rather than adding another review layer.

Keep the worthwhile safeguards: no real-data access by default, no discarded foreign changes, no secret-bearing output, no automatic ambiguous-write replay, truthful validation scope and permission checks. Remove unnecessary orchestration, not those guarantees. No new global skills, prompts, agents or configuration were created by this retrospective.

## 7. Shutdown state and preservation boundaries

- The experiment is stopped. No migration implementation, server launch, native replay, restore or production cutover is authorized by this document.
- The latest CORE API author and configuration-plan reviewer were cancelled. API source may be partial; no completed handoff/freeze/check/acceptance should be inferred. The five-file configuration proposal lacked its completed independent review and implementation allocation.
- Remaining joins included real CORE Application/Backend birth and configuration propagation, SDK caller/publication, document/SSR delivery, enrollment and the Nitro installer. `completeSetup`, optional discovery/probes and broad feature activation remained incomplete.
- Current-source login/renew/logout, private UI, relocation, shutdown/browser joins, populated pre/post preservation, sealed-file installation, restart, PostgreSQL and Node `24.18.0` parity were not demonstrated as an integrated product.
- Preserve all uncommitted source, the protected port-3100 fixture and port-3200 output, original failures and private historical evidence. Do not reset locks, overwrite receipts, reseed preserved fixtures, silently substitute the old app, or interpret stale roster entries as active work.
- The historical native attempt `native-runtime-driver-t_05t8qe-matplan01` is consumed. Its result is not a reusable execution grant; it must not be replayed or re-observed automatically. The earlier approved Bun image acquisition was also consumed, not standing permission for more acquisition.
- Original installations and credentials were outside scope. Future real restore or production cutover requires separate explicit authorization.

## 8. Archive and evidence pointers

The Markdown research below is preserved with this document. It contains date-specific proposals, open questions and historical instructions. **This stopped-state retrospective supersedes its current-status language; do not resume work from an old handoff.** Links into `.scratch`, `node_modules`, temporary evidence or uncommitted migration source are provenance pointers, not a promise that those materials are included in the documentation commit or reproducible from it.

### Historical synthesis

- [Initial migration investigation](Homarr%20Nitro%20migration%20experiment.md): hosting alternatives, rendering/state duties and fair measurement design.
- [Fresh Nitro v3 stack investigation](Homarr%20Nitro%20v3%20stack%20choices.md): direct oRPC, optional Elysia, manual Router SSR and the bounded feasibility proposal.

### Initial research

- [Nitro runtime and router comparison](../research_notes/Homarr%20Nitro%20migration%20experiment/nitro-runtime.md)
- [Dashboard rendering and cache safety](../research_notes/Homarr%20Nitro%20migration%20experiment/dashboard-rendering.md)
- [Persistence, cache and background work](../research_notes/Homarr%20Nitro%20migration%20experiment/storage-background.md)
- [API/auth migration](../research_notes/Homarr%20Nitro%20migration%20experiment/api-auth-migration.md)
- [Performance and packaging methodology](../research_notes/Homarr%20Nitro%20migration%20experiment/performance-packaging.md)
- [Exact oRPC/Elysia investigation](../research_notes/Homarr%20Nitro%20v3%20stack%20choices/orpc-elysia.md)
- [TanStack rendering investigation](../research_notes/Homarr%20Nitro%20v3%20stack%20choices/tanstack-rendering.md)

### Full-product inventories

- [Dashboard and navigation](../research_notes/Homarr%20full%20Nitro%20migration/dashboard-navigation.md)
- [Endpoints and transports](../research_notes/Homarr%20full%20Nitro%20migration/endpoints-transports.md)
- [Identity and administration](../research_notes/Homarr%20full%20Nitro%20migration/identity-administration.md)
- [Integrations/providers](../research_notes/Homarr%20full%20Nitro%20migration/integrations.md)
- [Widgets/options/consumers](../research_notes/Homarr%20full%20Nitro%20migration/widgets.md)
- [Persistence and background boundaries](../research_notes/Homarr%20full%20Nitro%20migration/persistence-background.md)
- [Localization and shared UI](../research_notes/Homarr%20full%20Nitro%20migration/localization-ui.md)
- [Assistant, Custom JSX, Workshop, onboarding, media, backup and operations](../research_notes/Homarr%20full%20Nitro%20migration/extended-features.md)

### Local execution records consulted, not included in this commit

- `.scratch/nitro-full-migration/DESIGN.md` and `PROPOSAL.md`: approved choices, their chronology and the 125-ticket scope.
- `.scratch/nitro-full-migration/spikes/{auth,sql}/EVIDENCE.md` and `spikes/i18n/REPORT.md`: actual bounded compatibility observations and their limits.
- `.scratch/nitro-feasibility/worker-notes/integration.md`: historical fixture HTTP/browser results, provenance and exploratory measurements.
- `.scratch/nitro-full-migration/CONVERGENCE-VALIDATION.md`: exact scoped compiler/style/build/native receipts, including corrected failure counts.
- `.scratch/nitro-full-migration/implementation/convergence-native-memory-execution-renewed-result.md`: the consumed historical native invocation and evidence limits; later independent acceptance is recorded in progress history.
- `.scratch/nitro-full-migration/implementation/convergence-onboarding-core-{api-compatibility,original-birth,configuration}-plan.md`: the final incomplete cross-package joins.
- `.slim/deepwork/nitro-full-migration.md`, `.scratch/nitro-full-migration/ROSTER.md` and the final conversation cancellation checkpoint: progress history. The conversation's terminal cancellations override stale active entries.

**The reusable conclusion:** preserve Homarr's real behavior and data, but prove the selected stack through a small, continuously runnable application. Thorough preparation is useful only when it accelerates that delivery; it is not a replacement for it.
