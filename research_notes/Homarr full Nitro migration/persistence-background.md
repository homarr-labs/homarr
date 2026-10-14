# Full Homarr Nitro migration: persistence and background boundaries

Research for [AJN-508](https://linear.app/ajnart/issue/AJN-508/map-full-persistence-and-background-migration-boundaries), inspected 2026-10-10 on `rework-hono`, HEAD `66e2199f9cd1e4026249c3763413988bab8664c4`. Source links refer to this checkout; the uncommitted fixture is separately identified below. This note is the only authored file. No application imports, database queries, real appdata/secret reads, installs, builds, checks, container changes or tracker edits were performed; no nested agents were spawned.

## 1. Scope, authority and conclusion

The live [AJN-482 map](https://linear.app/ajnart/issue/AJN-482/find-the-route-to-a-lightweight-nitro-homarr) authorizes a comprehensive rewrite. Keeping Drizzle, Redis, Croner or tRPC is an optional reuse/control strategy, **not** an imposed architecture. Preserve application capabilities and durable data on existing SQLite and PostgreSQL paths; switching engines is neither required nor assumed. The [shared research contract](../../.scratch/nitro-full-migration/RESEARCH.md) governs this inventory.

The approved experiment uses Nitro `3.0.260903-beta`, direct oRPC `2.0.0-beta.43`, manual TanStack Router SSR and Bun-first scratch SQLite. That is fixture approval, not production approval. [AJN-493](https://linear.app/ajnart/issue/AJN-493) still asks whether production is a strict singleton or supports rolling replicas/cluster workers. A container, an embedded scheduler, or a prototype default does not answer it.

**Recommended seam:** framework-neutral domain repositories, explicit transaction-safe commands, typed coordination/state services, and one lifecycle owner. Nitro hosts their adapters; its database/storage/tasks APIs do not automatically supply Homarr's relational, security, migration, replay or restart guarantees. Endpoint and widget workers can port against reusable services or fixed contracts without waiting for a complete storage rewrite.

The earlier [storage/background research](../Homarr%20Nitro%20migration%20experiment/storage-background.md) supplies detailed source/version evidence. Its Node-first/retain-everything recommendations are historical options, superseded as restrictions by AJN-482. Findings below distinguish current behavior, proposed contracts and unexecuted acceptance.

## 2. Durable-model reconciliation: all 40 exports

[Runtime-selected exports][schema-index], [SQLite schema][sqlite-schema] and [PostgreSQL schema][pg-schema] are the canonical inventory. Relation declarations are additional query metadata, not extra tables. Every group below requires old-data reads, authorized mutations, correct ownership/deletion behavior and restart persistence; domain policy belongs to the corresponding feature/identity owner.

| Model group | Exact exported tables | Target seam and preservation obligation |
| --- | --- | --- |
| Identity and membership (9) | `users`, `accounts`, `sessions`, `verificationTokens`, `apiKeys`, `groups`, `groupMembers`, `groupPermissions`, `invites` | Identity repository; preserve provider/session/token expiry, user preferences/home boards, account links, membership and permissions, invite state, uniqueness and cascades. SQL login sessions are not Redis integration sessions. |
| Resource access (4) | `boardUserPermissions`, `boardGroupPermissions`, `integrationUserPermissions`, `integrationGroupPermissions` | Authorized board/integration repositories; retain user/group joins, compound keys and resource deletion effects. Never expose raw repository reads as an authorization substitute. |
| Dashboard structure (7) | `boards`, `sections`, `items`, `layouts`, `itemLayouts`, `sectionLayouts`, `sectionCollapseStates` | Board commands; preserve presentation/options, parent/container relationships, positions/sizes, breakpoints, roles, gutters, resize sources, per-user collapse state and multi-row consistency. |
| Navigation and icon library (4) | `apps`, `searchEngines`, `icons`, `iconRepositories` | App/search/icon repositories; preserve URLs, ping configuration, integration links, templates/bangs, repository membership and icon identity. Icon synchronization must not leave a partially replaced repository. |
| Integration persistence (3) | `integrations`, `integrationSecrets`, `integrationItems` | Integration repository and secret codec; preserve type/configuration, app references, item bindings, encrypted credential values/kinds and associated access joins. |
| Widget definitions and secrets (5) | `customWidgetDefinitions`, `customWidgetSecrets`, `legacyCustomWidgetDefinitions`, `legacyCustomWidgetSecrets`, `widgetSecrets` | Custom JSX/widget repositories; preserve v2 sources/requests/options/template, creator/enabled state and source-scoped encrypted secrets. Retain legacy physical tables/readability rather than deleting them during the hosting migration. |
| Assistant (3) | `assistantConfigurations`, `assistantThreads`, `assistantMessages` | Assistant repository; preserve provider/model discovery settings, encrypted API key/headers, user-owned threads, timestamps, parent IDs and stored message format/content. |
| Operational durable state (5) | `medias`, `serverSettings`, `onboarding`, `trustedCertificateHostnames`, `cronJobConfigurations` | Media/settings/onboarding/trust/schedule repositories; media bytes live in SQL, settings retain serialized shapes/default merges, onboarding retains previous/current step and claim coordination, trusted names remain separate from CA files, schedules retain enabled/cron edits. |

Physical table/column names, `snake_case` driver mapping, primary/unique/foreign keys, indexes, nullability, timestamps and enum/string values must be retained or explicitly converted. Media is SQLite Buffer BLOB / PostgreSQL `bytea`; settings/item options include SuperJSON, not interchangeable plain JSON. Ciphertext and encryption material are a compatibility boundary. [Schemas][sqlite-schema] [Driver configuration][driver-config]

Existing dialect discrepancy: `users.openSearchInNewTab` defaults to **true in SQLite, false in PostgreSQL**. Preserve existing values and record any deliberate default change; do not silently normalize it or assert that both schemas have identical defaults. [SQLite][sqlite-schema] [PostgreSQL][pg-schema]

The 40 tables are not the entire state surface: migration ledgers, SQL setting-based claims, Redis state, certificate files and runtime-local guards are accounted for separately below. No model may disappear simply because the three-table fixture lacks it.

## 3. SQL correctness, migration history and rollback

### Current source-owned behavior

- The runtime selects direct Drizzle `0.45.2`, `better-sqlite3` `12.11.1` or `pg` `8.22.0` with a `pg.Pool`. PostgreSQL URL and host-based configuration remain supported; MySQL/MariaDB are explicitly rejected. The SQLite factory sets **no explicit WAL, busy-timeout or synchronous PRAGMAs**. Fixture PRAGMAs must not be presented as production defaults. [Factories][db-factories] [DB environment][db-env] [Versions][root-package]
- SQLite transaction callbacks are synchronous; PostgreSQL callbacks are asynchronous. Installed Drizzle's PostgreSQL transaction checks out one Pool client, runs BEGIN/COMMIT/ROLLBACK and releases it in `finally`; better-sqlite3 uses native synchronous transactions/savepoints. The dispatcher and collection helpers deliberately respect that distinction. [Dispatcher][transactions] [Collections][collection] [Installed Drizzle][installed-pg-session] [Driver documentation][better-sqlite-docs] [PG transactions][pg-transactions]
- `ensureGutterRootSectionsAsync` locks the board row `FOR UPDATE` on PostgreSQL and uses an **immediate** SQLite transaction before checking/inserting roots. Board-placement tails and layout-repair promises are process-local serialization, not shared deployment coordination. Port both domain commands and their actual SQL exclusion boundaries. [Board router][board-router] [Placement queries][placement]
- `updateAnalyticsServerSettingAsync` is value-CAS with five retries, preserving concurrent setting updates and analytics metadata. Settings reads merge defaults. Group-position and item/widget loading/placement helpers are reusable query logic, not Next HTTP glue. [Settings queries][settings-query] [Query exports][queries]
- Onboarding's one-owner claim uses SQL `serverSettings["__onboarding_claim"]`, a hashed token, four-hour expiry, conditional deletion and unique-insert winner handling. It is not a Redis preview claim; extracting it must retain atomic winner selection and authorization semantics. [Onboarding claim][onboarding-claim]
- Dialect SQL migrations run before seed and the five custom transformations; startup aborts on failure unless migration is explicitly disabled. There are **49 SQLite SQL files and 17 PostgreSQL SQL files**, with dialect journals. Preserve migration identities/order and existing applied-history recognition, not merely a newly generated current schema. [SQLite migrator][sqlite-migrate] [PG migrator][pg-migrate] [Launcher][launcher]
- Custom transformations cover release providers→options, OPNsense credential-kind changes, app-description display mode, removed widget-only integrations→options, and legacy sections/gutters→containers. Startup is not one globally atomic conversion across SQL, seed and all custom steps, nor evidence of an automatic downgrade. [Custom migration order][custom-migrations]

### Target obligations, not claims about completed work

1. Establish a pre-write migration readiness barrier and one migration owner per database/deployment. Replica-safe startup cannot rely only on every HTTP worker running the same script; coordination/execution packaging is a topology-dependent design choice.
2. Preserve both dialects, SQL parameter binding, conflict/returning behavior, row locks, transactional compound commands, sync-versus-async callback semantics and serialized data decoding. Do not place network awaits inside a synchronous SQLite transaction.
3. Package all migration assets and retain the configured database path. Fresh install, every supported upgrade path, interrupted custom conversion and repeat startup require acceptance against synthetic/copied non-production fixtures.
4. Before a destructive conversion, record the supported old/new binary matrix, stop writers, capture a recoverable SQL snapshot plus encryption/certificate prerequisites, and define rollback to that snapshot. Retained legacy Custom JSX tables help compatibility but do not prove whole-database downgrade safety.
5. If an ORM or engine changes, explicitly map all 40 models plus journals, BLOB/bytea, timestamps/booleans, defaults/collation/constraints and serialized/encrypted values. A facade change does not convert data; an engine switch needs its own export/import and rollback plan.

## 4. State and coordination beyond SQL

[Redis channels][channels] implement SuperJSON payloads, lists, Lua atomics, locks and replay; [client/environment][redis-client] support internal or external Redis and TLS. Classifications below describe behavior that must survive or receive an explicitly approved changed policy. They do not mandate Redis as the target implementation.

| Duty | Current semantics and lifetime | Target service / acceptance boundary |
| --- | --- | --- |
| Latest-value fanout | Store `pubSub:last:<name>` before publishing; new subscribers read latest value. Shared subscription tracker removes unused listeners. | `LatestStateStream`; retain snapshot+live ordering/cleanup. It is not durable replay of every event. [Channels][channels] [Tracker][subscription-tracker] |
| Logs | Redis MULTI LPUSH/LTRIM/PUBLISH, bounded to 5,000 messages. Listener-before-history replay buffers concurrent events and deduplicates IDs. | `LogHistoryStream`; preserve history bound, gap/race handling and `other-view-logs` authorization. [Transport][log-transport] [Router][log-router] |
| Task execution status | Latest running/idle, last execution and success/error; separate from SQL schedule configuration. | `JobStatusStore`; preserve status subscription and decide repair of stale `running` after restart. [Status package][job-status] |
| Ping registry | Redis URL list, startup clear, minute deduplicated ping and result publish. Search found no production registrants/subscribers beyond package/job. | Keep ping capability; product owner decides registry retirement. Actual authorized app ping uses `sendPingRequestAsync` directly, so unused registry is not proof ping is removable. [Ping job][ping-job] [App router][app-router] |
| Integration/widget responses | Shared data/time/fresh/stale envelopes, versioned identity+generation keys; 15-second renewable token-owner leases and fenced writes. | `ResponseCache` + `RefreshLease`; reject obsolete owners/late data, preserve stale/error behavior and configuration-aware keys. [Shared cache][shared-cache] |
| Invalidation | Scoped generation increment/expiry and integration-session deletion use MULTI; full invalidation also clears statistics. Generations expire after 30 days; local reads/pending work bounded to 1,000 with global fallback on overflow. | `InvalidationService`; persist/epoch generations consistently with retained payloads and recover boundedly from outages. SQL mutation and Redis invalidation are not one distributed transaction. [Channels][channels] [Integration handler][integration-handler] |
| Local response cache | 1,000 entries / 100 in-flight per handler; tracks unsettled work, deadline/cancellation, stale-on-error, generation and late settlement. | Reuse handler or reproduce these bounds; generic memoization/SWR does not establish equivalence. [Handler][request-handler] |
| Cache outage behavior | Shared client disables offline replay; 500 ms command timeout / 750 ms operation guard. Failed access falls back to bounded local cache behavior. | Explicit failure mode per service; never queue delayed unsafe writes or reuse this fallback as a security policy. [Shared cache][shared-cache] |
| Statistics snapshots | Stable non-expiring per-integration last-good/error/retry state; local coalescing, 128 pending, four shared refresh slots, 120-second leases, 10-second renewal, 60-second upstream deadline, fenced writes. | `StatisticsSnapshotService`; preserve last-good state and source/global bounds, identity/generation checks and shared-store-unavailable behavior. [Statistics][statistics] |
| Update checker | 24-hour fresh release lookup, separate non-expiring stale value and refresh lock; not one of the registered cron jobs. | `UpdateStateService`; preserve stale fallback and external-connection policy. [Checker][update-checker] |
| Integration sessions | Encrypted configuration-fingerprinted SuperJSON envelopes; optional token-lifetime TTL; invalidated on credential/configuration changes. | `IntegrationSessionStore`; preserve encryption, remaining expiry and mismatch rejection, separate from auth SQL sessions. [Session store][integration-sessions] |
| Image proxy registrations | Encrypted URL/header mapping by random ID and HMAC identity, 24-hour TTL; not cached image bodies. | `ImageRegistrationStore`; preserve issued-URL lifetime, secret isolation and authorization/SSRF boundaries. Restart loss can break already-rendered URLs. [Image proxy][image-proxy] |
| Custom JSX rate/concurrency limits | Lua fixed-window INCR/PTTL; Redis server TIME and expiring sorted-set owner leases. Per-user/item concurrency 4 and per-definition 8, category-specific rates; production fails closed. | `RequestLimiter`; atomic acquire/renew/release, server-clock/expiry semantics and bounds. Local CI/test limiter differs and is not production parity. [Adapter][request-limits] [Domain limiter][domain-limiter] |
| Preview sessions | Ten-minute sessions, encrypted secrets, revision CAS Lua, 50-entry bounded journal and expiring evidence hash. | `PreviewSessionStore`; atomically reject stale edits, preserve owner/revision/expiry/journal/evidence and prevent secret delivery. [Adapter][preview-sessions] |
| Configuration handoff | Ten-minute per-user pending/applying/completed requests and NX PX claim lock. | `ConfigurationRequestStore`; preserve one claimant, user ownership, expiry and idempotent terminal behavior. [Requests][configuration-requests] |
| Integration sample history | Bounded timestamped lists and live publish; default size 15, consumed by Dashdot CPU / OPNsense interface logic. | `SampleHistoryStore`; retain ordering/retention and producer/consumer payloads. [Channels][channels] [Dashdot][dashdot] [OPNsense][opnsense] |
| Generic queue export | JSON-array read/modify/write primitive; no discovered caller, no atomic dequeue or durable job execution protocol. | Not an existing retry/exactly-once guarantee. Retire only after caller/product confirmation; introduce a real queue only for a justified requirement. [Channels][channels] |

Internal Redis uses RDB `save 60 1` under `/appdata/redis`, not every-write AOF. The app restart loop leaves Redis alive; whole-container crash can lose changes since a snapshot. SQL ZIP backup excludes Redis. Therefore “cache” is not a sufficient lifetime classification, and current restart survival is not a zero-loss durability promise. [Redis configuration][redis-config] [Launcher][launcher] [Export][backup-export]

If eliminating Redis, specify each row's restart/expiry/crash policy and convert required snapshots, histories, encrypted mappings and security state to a transactional persistent backend. Preserve remaining TTLs, revisions and identities; quiesce active owners rather than importing a lock as valid ownership. Local maps/buses are sufficient only for an approved true singleton and appropriate disposable state. Same-process async interleaving still requires CAS and fenced writes.

## 5. Background work, fanout and lifecycle

### Complete registered work inventory

| Work | Source behavior | Reusable body / hosting obligations |
| --- | --- | --- |
| Analytics | Hidden weekly job, run-on-start, no manual/custom interval; consent and `NO_EXTERNAL_CONNECTION` gates; analytics SQL CAS/idempotency metadata. | Reuse analytics service or preserve its consent/claim/send semantics. Stop/restart and replicas must not silently duplicate external sends. [Job][analytics-job] [Analytics service][analytics] |
| Icon updater | Weekly, run-on-start; repository fetch and transaction/batched SQL replacement. | Reuse synchronization body; preserve repository boundaries, failure behavior and transactional replacement. [Job][icons-job] |
| Ping | Minute schedule; `beforeStart` clears URL list; respects status policy. | Preserve authorized direct app ping independently of registry choice, plus any retained scheduling/fanout. [Job][ping-job] [App router][app-router] |
| Startup cleanup | Deletes SQL sessions for disabled auth providers before schedule initialization/run-on-start processing; cleanup catches/logs failures. | Reuse cleanup query with identity owner's provider configuration; retain recorded failure semantics or approve a stricter readiness policy. [Startup][task-main] [Cleanup][session-cleanup] |
| On-demand refresh/streams | Statistics, release checks, response refresh, Docker/Beszel upstream streams are not additional registered cron jobs. | Include their abort/deadline/resource ownership in lifecycle; do not lose them by auditing only job registry. [Statistics][statistics] [Checker][update-checker] [Stream routers][docker-router] [Beszel][beszel-router] |

Exactly three jobs are registered in [the current registry][job-registry]. Croner `10.0.1`/JobManager support SQL-backed enable/cron changes, start/stop/manual execution, startup and success/error hooks, and hidden/manual/custom-interval restrictions. The present code invokes async callbacks with `void`; no persisted queue, catch-up/retry execution history or distributed exclusion is proven. Initialization while disabled followed by enabling deserves lifecycle acceptance, not an assertion that every start/control sequence is already safe. [Manager][job-manager] [Core lifecycle][cron-core]

Production already imports tasks and the separate WebSocket listener into the HTTP process. Next instrumentation does not await slow task initialization but exits on its failure; it awaits WebSocket listener readiness. Authoritative packaging runs **Node 24.18.0**, with Bun `1.4.2` as tooling, nginx and internal-or-external Redis. Bun-first fixture behavior does not prove production driver/addon compatibility. [Instrumentation][instrumentation] [Launcher][launcher] [Dockerfile][dockerfile]

Current WebSocket hosting authenticates the session cookie through SQL, creates authorized tRPC context, uses a 30-second heartbeat/5-second pong deadline, sends reconnect on SIGTERM and closes the listener. Cron statuses/logs use Redis replay; Docker logs and authorized Beszel metrics are direct upstream streams, with provider-specific cleanup/backpressure. Board client-cache updating is a separate path, not evidence of server-wide durable board event delivery. [WebSocket][websocket] [Log router][log-router] [Docker][docker-router] [Beszel][beszel-router] [Board updater][board-updater]

**Proposed lifecycle contract:** configure → open owned resources → migrate/verify schema → expose durable readiness → start cleanup/scheduler/services with explicit readiness policy → accept work. Close/maintenance reverses ownership: reject new writes/runs/upgrades, stop schedules, abort/drain in-flight refreshes and streams within bounds, unsubscribe/close transports, then dispose every database/Redis/HTTP resource. Define interrupted status recovery; do not report an interrupted run as success. This is target work, not observed present shutdown behavior.

Inventory non-main connections too: trusted-hostname factories and the proxy settings reader open independent SQLite connections/PG pools. Reuse or consolidate them deliberately; each has one disposal owner. Backup temporary connections and driver prepared statements also need explicit lifetime. [Trust factories][trust-hostnames] [Proxy reader][proxy-reader] [Import][backup-import]

## 6. Files, backups, restore and sensitive configuration

- Preserve `/appdata/db/db.sqlite`, `/appdata/redis` and `/appdata/trusted-certificates` where configured, writable volume ownership/PUID/PGID and `_FILE` secret loading. Packaging changes must preserve external DB/Redis/TLS configuration without reading secrets into browser bundles. [Entrypoint][entrypoint] [Dockerfile][dockerfile] [Environment][common-env]
- Media uploads are SQL bytes; CA files are a distinct file store, trusted-hostname allowlists a distinct SQL store. `ensureCustomRootCertificateAsync` accepts one bounded root CA (64 KiB), validates file names/current validity/self-signing, uses no-follow regular-file reads and a synced temporary file plus hardlink no-overwrite publication. Preserve concurrent same-content/different-content outcomes and filesystem security; no generic KV mount proves this. [Root certificate service][root-certificates]
- SQLite export is admin-only, opens read-only, requests `wal_checkpoint(TRUNCATE)`, uses `VACUUM INTO`, and emits `db.sqlite` plus version/dialect/time metadata **including the encryption key**. Treat the archive as sensitive; it excludes Redis and CA files. The fixed temporary export path and concurrency/failure handling need acceptance, not a blanket “atomic backup” claim. PostgreSQL's supported route remains native tooling, not this SQLite ZIP. [Export][backup-export] [Backup guide][backup-guide]
- Import allows admin or tightly controlled onboarding-claim access, requires SQLite, bounds compressed backup to 256 MiB (multipart overhead separately), DB to 512 MiB, archive to 514 MiB and metadata to 1 MiB. Preview/import transport/auth glue is Next-specific; archive parsing, validation, SQL/custom migration and conversion can become a service. [Import][backup-import] [Backup routes][backup-routes]
- Restore migrates a temporary DB, applies custom conversions, closes it, renames it over the live path, removes WAL/SHM sidecars and exits after 500 ms for restart. Its process-local `restoreInProgress` flag is not multi-replica maintenance; live writers are not demonstrably quiesced/closed by that flag. Target restore requires an exclusive maintenance barrier, writer/stream/job drain, connection disposal, recovery snapshot and post-restore cache/session/generation reconciliation. [Import][backup-import]
- **Concrete key-conversion gap:** `reEncryptSecrets` selects/updates only physical `integrationSecret.value`, and missing-key validation counts only those rows. It does not convert `widgetSecrets`, legacy/v2 `customWidgetSecrets`, or assistant `encryptedApiKey`/`encryptedHeaders`. Preserve the original key or explicitly enumerate and correctly convert all encrypted stores before claiming cross-key restore compatibility. Restoring SQL alone must also account for retained Redis ciphertext/mappings under the old key. [Import][backup-import] [Encrypted schema fields][sqlite-schema]

Rollback must cover the DB image/migration state, encryption key and trust-file prerequisites; restoring a ZIP does not reconstruct every Redis/runtime capability. Define which ephemeral data is invalidated versus preserved and ensure browsers cannot reuse obsolete private artifacts after restore. Backup service ownership is shared with extended features; identity owns authorization, not duplicate low-level file conversion.

## 7. Exact library and fixture evidence

### Versioned primary sources

| Surface | Inspected evidence | Implication for full-product design |
| --- | --- | --- |
| Nitro database | Release `3.0.260903-beta`, commit `0509fb904ec87a0962187af13893b20cfdf2d34f`: [database docs][nitro-database-docs], [runtime][nitro-database-runtime]. Experimental, lazy named db0 connection cache. | No automatic migration/backup manager or registered DB disposal in this module. Explicitly use configured paths/engines; db0 adoption is optional. |
| db0 PostgreSQL/Bun | Published `db0@0.4.1` [PG connector][db0-pg], [Bun connector][db0-bun]. PG uses one lazy `pg.Client`, not Pool; Bun executes native synchronous SQLite behind promises. | Pooling/lifetime and transaction isolation differ from current drivers. Promise-shaped SQL does not prove nonblocking execution or transaction safety. |
| db0/Drizzle | [Integration docs][db0-drizzle-docs] at `be03a5173df0eef15df286f0f296195ed7a0fc56`; [published SQLite integration][db0-drizzle-sqlite]. Targets Drizzle v1 RC, not Homarr `0.45.2`; current casing/relations approach is not a drop-in. | Inspected awaited BEGIN/body/COMMIT on a shared session lacks evident per-transaction exclusion. This is an interleaving risk from source, **not a measured bug**. Single-statement CAS does not settle multi-table transactions. |
| Direct SQLite/PG | [better-sqlite3 v12.11.1][better-sqlite-docs], [node-postgres transaction guidance][pg-transactions], installed Drizzle sessions. | Better-sqlite transactions are synchronous; PG transaction statements must use one checked-out client. Preserve immediate transactions and ownership, regardless of ORM. |
| Bun SQLite | [Bun bun-v1.4.2 docs][bun-sqlite-docs]. Native synchronous transactions; BLOB reads return Uint8Array; SQLite/WAL and statement-close behavior depend on runtime/platform. | Targeted binary/value/transaction/close acceptance is needed on each supported target. This note did not execute it. |
| Nitro storage/cache | Released [storage docs][nitro-storage-docs] use `nitro/storage`/`useStorage`, not newer-main `useKV`; root/cache default memory. [Released cache runtime][nitro-cache-runtime]; [unstorage fs alpha.10][unstorage-fs]. | Restart loses default memory; filesystem `setItem` supplies no TTL handling and no CAS/leases/pubsub guarantee. Generic cache identity/SWR/serialization/bounds must match Homarr; local single-flight is not distributed exclusion. |
| Nitro tasks | Released [task docs][nitro-task-docs], [runtime][nitro-task-runtime]. Static cron mapping/local name coalescing, experimental. | No DB-configured schedule controls/shared owner/durable queue. Inspected first-call lazy-resolution guard race and startup-captured scheduledTime prevent treating it as hard exclusion/authoritative run time. Release does not retain/stop cron handles on close. |
| Nitro shutdown/live | Released [shutdown runtime][nitro-shutdown], [WebSocket docs][nitro-websocket-docs]; published [CrossWS 0.4.15 sync][crossws-sync]. | Close hooks are attachment points, not automatic work drain. Same-listener transport is feasible; optional sync adapters do not supply authorization/replay, and a storage mount does not automatically wire fanout sync. |

Context7 quota failure is recorded in the shared research contract; no repeated quota calls, installs or probes were substituted. Exact release artifacts take precedence over newer-main examples. Lock runtime/dependency versions for implementation and verify compatibility instead of borrowing defaults from unrelated releases.

### Fixture boundary

The [fixture repository][fixture-repository] owns only `fixture_identities`, `fixture_boards`, `fixture_widget_seeds`, sets WAL and a 1,000 ms busy timeout, and performs a conditional expected-revision UPDATE with RETURNING. Its [lifecycle][fixture-lifecycle] explicitly owns readiness/disposal. These are useful seam examples, not Homarr schema, auth, migration, PostgreSQL, backup or multi-table-transaction proof.

The [integration handoff][fixture-handoff] records mounted one-save/one-CONFLICT and playable SSR/widget evidence. Same-image durable restart, final checks and full lifecycle observations remain pending there. This research neither repeats those observations nor promotes them to full-product acceptance; the published fixture/browser/container remain untouched.

## 8. Reuse classifications and framework-neutral contracts

| Classification | Candidate | Boundary |
| --- | --- | --- |
| Reusable source-owned services | Dialect schemas/migrators/queries/collections; integration/session/image codecs; bounded request handlers/statistics; Redis atomic implementations; cron job bodies/Croner group; CA-file validation/publication. | Optional implementation controls. Audit transitive env/global initialization and expose explicit ownership; do not blindly import an application entrypoint into every SSR/API graph. |
| Adapter needed | SQL repositories, coordination state interfaces, JobManager configuration/control, log/status/history publisher/subscriber, environment factories, close hooks, backup archive service. | Retain domain semantics while changing injected resources, lifecycle and transport. Some current services access globals rather than receiving resources. |
| Replacement needed | Next instrumentation/auth/NextResponse backup glue and old tRPC WebSocket listener/client wire plumbing in a direct-oRPC target. | Replace hosting and authorization-context adapters in concert with endpoint/identity owners. Source domain bodies may still be reused. |
| Not reusable as product persistence | Fixture database schema/identity assumptions and single-row board CAS. | Useful demonstrator only. No production copy/reseed or alternate hidden data path. |

Proposed contracts below are semantic interfaces, not prescribed libraries or already-created packages:

| Contract | Required semantics / owner |
| --- | --- |
| `PersistenceRuntime` | Configure/open/migrate/readiness/maintenance/close and engine capability declaration; SQL lifecycle owner holds every connection and migration ledger. |
| Domain repositories + compound commands | Identity/board/integration/media/settings/assistant/widget owners own DTOs and authorized domain behavior; persistence supplies correct dialect operations. A public async command may enclose a synchronous SQLite transaction without promising arbitrary async callbacks inside it. |
| `ResponseCache`, `InvalidationService`, `RefreshLease` | Typed envelopes with observation/fresh/stale times, identity/version/generation; atomic owner-fenced acquire/renew/release/write and bounded outage recovery. Backend errors and stale policy are explicit results. Cache coordination owner. |
| Expiring security stores | Preview revision CAS, request claims, rate windows and concurrency ownership, encrypted session/image mappings; preserve TTL/time/ownership and fail-closed categories. Custom JSX/integration owners define domain policy; coordination owner supplies atomic backend. |
| `StatisticsSnapshotService`, `LatestStateStream`, `LogHistoryStream`, `SampleHistoryStore` | Bounded histories/snapshots, snapshot-to-live race policy, subscriptions with disposal, last-good/error metadata and restart contract. Service owner emits payloads; transport owner authenticates and delivers them. |
| `SchedulerService` / `JobStatusStore` | Registry, durable configuration, enable/cron edits, manual restrictions, run-on-start hooks, execution/status and stop/drain. Background owner chooses explicit overlap/replica/recovery policy rather than claiming existing exactly-once execution. |
| `BackupService` / `MaintenanceCoordinator` | Authorized caller supplied separately; bounded archive handling, complete secret compatibility, exclusive restore, snapshots, writer drain and cache epoch reconciliation. Extended-feature owner handles routes/UI; persistence owns conversion and replacement. |
| `TrustFileStore` / secret configuration | Root-certificate conflict/security semantics, trusted SQL hostname access, server-only key/_FILE loading. Trust/identity policy owner and persistence/file lifecycle owner agree one implementation seam. |

## 9. Independent batches and exclusive ownership

These batches can be demonstrated with synthetic fixtures/adapters. They are a proposed implementation graph, not authorization to start coding. A contract freeze (`P0`) is smaller than a completed service rewrite; workers may use existing implementations behind it.

| Batch | Exclusive write ownership | Independent demonstration | Genuine prerequisites |
| --- | --- | --- | --- |
| P0: contracts and ownership | Coordinator: shared server contracts, capability/lifetime ledger and composition manifest. | Domain workers agree DTO/error/transaction/lifecycle boundaries, with optional adapters. | Reconciled feature/identity/endpoint requirements; does not require final engine decision. |
| P1: durable runtime | Persistence worker: DB drivers/schema exports/migrations/readiness and connection disposal. | Fresh/upgrade/restart paths on synthetic SQLite and PG; existing direct drivers can be controls. | P0 to integrate; engine-specific replacement approval only if taking that optional path. |
| P2: compound domain commands | Respective feature workers: board placement/layout, settings/claim, integration/icon replacement commands. | Concurrent command and rollback outcomes against existing DB adapter. | P0; P1 only for target-runtime end-to-end proof, not initial porting. |
| P3: cache/statistics coordination | Cache worker: handler/shared-cache/statistics/invalidation implementation. | Stale/deadline/bounds/outage/late-write and generation behavior with existing Redis adapter. | P0; topology decision only before claiming shared-backend removal. |
| P4: temporary/security state | Coordination worker: backend atomics; Custom JSX/integration workers: policy/codecs, in separately assigned files. | Preview CAS, one-claim, limiter failure modes and mapping expiry independently of UI/HTTP. | P0; crypto contract from identity; persistent new-backend migration needs P1. |
| P5: scheduler and startup work | Background worker: job bodies/manager/status/control and startup cleanup orchestration. | Three-job restrictions, persisted edits, disabled→enabled, manual/run-on-start, status and stop/drain via existing services. | P0; P1/P3/P4 only for dependencies actually used by each job. AJN-493 gates final replica ownership. |
| P6: fanout service and transport | Background worker: snapshot/history service; endpoint worker: authenticated oRPC/SSE/WS transport, distinct files. | Race-free log/status history plus live delivery; upstream Docker/Beszel cancellation separately. | P0 and identity context for secured transport; no requirement to finish Redis rewrite. |
| P7: backup/trust persistence | Persistence worker: archive/conversion/maintenance/file services; extended/identity workers: route authorization and UI, distinct files. | Cross-key encrypted-store coverage, restore failure/rollback and certificate conflicts on disposable fixtures. | P0; P1 for target restore and lifecycle, crypto contract, maintenance ownership. |
| P8: Nitro composition | Single runtime integrator: Nitro plugins/config/entrypoint, migration packaging and central service/job registrations. | One owned instance shared by SSR/endpoints/timers, readiness/close and restart behavior. | Stable exported contracts and ready adapters, not all optional rewrites. |
| P9: optional backend/runtime elimination | Separately authorized migration owner: Redis conversion, db0/ORM/driver changes or daemon/launcher removal. | Two-dialect compatibility/concurrency, restart-state conversion, rollback and topology-specific fanout. | Human choice, all affected contracts/acceptance, AJN-493 if deleting shared coordination. Never a prerequisite for ordinary endpoint/widget ports. |

Single-writer integration files include schema/index/driver factories, migration SQL/journals/custom ordering, central job registry, shared interfaces, Redis atomic/channel definitions and key namespaces, Nitro bootstrap/plugins/config, environment declarations and launcher/container packaging. The coordination owner supplies shared atomics to both P3 and P4; workers do not independently edit `channel.ts`. Domain workers export modules rather than racing to register them; the integrator merges registration changes. This research modifies none of those files.

Blocking edges: migration-ready database → durable writes/jobs; crypto+ownership contract → secret-state adapters; authenticated context → secured live/backup routes; maintenance drain/disposal → live-file restore; chosen topology+atomic shared backend → shared-coordinator elimination; proven conversion+recoverable snapshot → destructive migration. Runtime hosting does **not** intrinsically depend on changing SQL, Redis, all jobs or every endpoint at once.

## 10. Acceptance gates, open decisions and discovered gaps

No checks in this section were executed for full Homarr. The coordinator should attach each obligation to the feature/endpoint parity ledger rather than infer completion from source inventory.

- **Durable parity:** all 40 models, physical mapping/defaults/constraints, BLOBs/serialized values/encrypted data and both migration histories; fresh install, supported old-data upgrades, interrupted/repeated migration, engine selection and unchanged configured paths.
- **Concurrency:** board-root/layout compound updates and delete effects, analytics CAS/onboarding winner selection, concurrent SQL transactions/savepoints, contention/rollback, invalidation racing credential changes, expired lease owners/late settlement, preview CAS and one-time claims. Include same-process awaits and multi-instance cases when supported.
- **State/limits:** every duty row's TTL/history/bounds, cache outage fallback versus limiter fail-closed, generation overflow/recovery, statistics global/source slots, issued image/session lifetime, sample/log/status snapshot-to-live ordering, security counters across app-only restart and crash.
- **Background/lifecycle:** exactly the existing three jobs and startup cleanup, hidden/manual/custom-interval restrictions, consent/external-connection policy, disabled→enabled, persisted edits, no duplicate schedule registration, chosen overlap/replica policy, interrupted statuses, signal/maintenance drain and all connection/timer/subscription disposal.
- **Restore/files:** sensitive ZIP/auth/size bounds, export contention, every encrypted store under same/different keys, older backup conversions, quiescent replacement with failure rollback, fresh cache/session epochs, PostgreSQL operational backup path, CA safe publication and mounted-volume ownership/_FILE configuration.
- **Live capability:** cron status and permission-filtered log replay, Docker/Beszel direct streams, authorization after reconnect/revocation, bounded backpressure/abort and client protocol parity; direct app ping survives any registry retirement.

Human decisions remain: strict singleton versus replicas/workers (AJN-493); production runtime/driver/ORM and whether db0 is wanted; which Redis-derived state may explicitly cold-start; job overlap/retry/catch-up and migration/restore ownership; compatibility/rollback support window and key-conversion policy. These are not settled by fixture approval. Optional engine switching needs separate evidence and approval.

**Genuine blockers to specific claims:** db0 transaction/Drizzle compatibility blocks calling it a drop-in; unexecuted target driver/value/concurrency acceptance blocks a production Bun/db0 claim; incomplete encrypted-store conversion and absent demonstrated writer drain block safe cross-key/live restore claims; undecided topology/state policies block deleting shared coordination. None blocks finishing this research or independently porting domains behind retained adapters.

**Coverage handoffs:** backup key-conversion/maintenance belongs jointly to extended features, identity and persistence; trusted CA file safety/disposal to identity and runtime packaging; app ping registry retirement to dashboard/background; migration assets, `_FILE`, volume ownership and all-resource shutdown need an explicit runtime integrator. No additional unassigned durable table was found. Generic queue and apparent unconsumed ping exports remain confirmation items, not authorized deletions.

## Sources

[schema-index]: ../../packages/db/schema/index.ts
[sqlite-schema]: ../../packages/db/schema/sqlite.ts
[pg-schema]: ../../packages/db/schema/postgresql.ts
[driver-config]: ../../packages/core/src/infrastructure/db/drivers/index.ts
[db-factories]: ../../packages/core/src/infrastructure/db/drivers/
[db-env]: ../../packages/core/src/infrastructure/db/env.ts
[root-package]: ../../package.json
[transactions]: ../../packages/db/transactions.ts
[collection]: ../../packages/db/collection.ts
[installed-pg-session]: ../../node_modules/drizzle-orm/node-postgres/session.js
[board-router]: ../../packages/api/src/router/board.ts
[placement]: ../../packages/db/queries/widget-placement.ts
[settings-query]: ../../packages/db/queries/server-setting.ts
[queries]: ../../packages/db/queries/index.ts
[onboarding-claim]: ../../packages/api/src/onboarding-claim.ts
[sqlite-migrate]: ../../packages/db/migrations/sqlite/migrate.ts
[pg-migrate]: ../../packages/db/migrations/postgresql/migrate.ts
[custom-migrations]: ../../packages/db/migrations/custom/index.ts
[channels]: ../../packages/redis/src/lib/channel.ts
[redis-client]: ../../packages/core/src/infrastructure/redis/
[subscription-tracker]: ../../packages/redis/src/lib/channel-subscription-tracker.ts
[log-transport]: ../../packages/core/src/infrastructure/logs/transports/redis-transport.ts
[log-router]: ../../packages/api/src/router/log.ts
[job-status]: ../../packages/cron-job-status/src/
[shared-cache]: ../../packages/request-handler/src/lib/shared-cache.ts
[integration-handler]: ../../packages/request-handler/src/lib/integration-request-handler.ts
[request-handler]: ../../packages/request-handler/src/lib/request-handler.ts
[statistics]: ../../packages/request-handler/src/stats.ts
[update-checker]: ../../packages/request-handler/src/update-checker.ts
[integration-sessions]: ../../packages/integrations/src/base/session-store.ts
[image-proxy]: ../../packages/image-proxy/src/index.ts
[request-limits]: ../../packages/api/src/router/custom-widget/request-limits.ts
[domain-limiter]: ../../packages/custom-widgets/src/server/request-limits.ts
[preview-sessions]: ../../packages/api/src/router/custom-widget/preview-sessions.ts
[configuration-requests]: ../../packages/api/src/router/custom-widget/configuration-requests.ts
[dashdot]: ../../packages/integrations/src/dashdot/dashdot-integration.ts
[opnsense]: ../../packages/integrations/src/opnsense/opnsense-integration.ts
[redis-config]: ../../packages/redis/redis.conf
[job-registry]: ../../packages/cron-jobs/src/index.ts
[job-manager]: ../../packages/cron-jobs/src/job-manager.ts
[cron-core]: ../../packages/cron-jobs-core/src/
[analytics-job]: ../../packages/cron-jobs/src/jobs/analytics.ts
[analytics]: ../../packages/analytics/src/send-server-analytics.ts
[icons-job]: ../../packages/cron-jobs/src/jobs/icons-updater.ts
[ping-job]: ../../packages/cron-jobs/src/jobs/ping.ts
[app-router]: ../../packages/api/src/router/widgets/app.ts
[task-main]: ../../apps/tasks/src/main.ts
[session-cleanup]: ../../apps/tasks/src/on-start/session-cleanup.ts
[instrumentation]: ../../apps/nextjs/src/instrumentation-node.ts
[launcher]: ../../scripts/run.sh
[dockerfile]: ../../Dockerfile
[entrypoint]: ../../scripts/entrypoint.sh
[common-env]: ../../packages/core/src/infrastructure/env/index.ts
[websocket]: ../../apps/websocket/src/main.ts
[docker-router]: ../../packages/api/src/router/docker/docker-router.ts
[beszel-router]: ../../packages/api/src/router/widgets/beszel.ts
[board-updater]: ../../packages/boards/src/updater.ts
[trust-hostnames]: ../../packages/core/src/infrastructure/certificates/hostnames/
[root-certificates]: ../../packages/core/src/infrastructure/certificates/files/root-certificate.ts
[proxy-reader]: ../../packages/db/proxy-reader.ts
[backup-export]: ../../apps/nextjs/src/app/api/backup/export/route.ts
[backup-import]: ../../apps/nextjs/src/app/api/backup/import/route.ts
[backup-routes]: ../../apps/nextjs/src/app/api/backup/
[backup-guide]: ../../apps/docs/docs/management/backup.mdx
[fixture-repository]: ../../apps/nitro-experiment/src/server/database/repository.ts
[fixture-lifecycle]: ../../apps/nitro-experiment/src/server/database/lifecycle.ts
[fixture-handoff]: ../../.scratch/nitro-feasibility/worker-notes/integration.md
[nitro-database-docs]: https://github.com/nitrojs/nitro/blob/0509fb904ec87a0962187af13893b20cfdf2d34f/docs/1.docs/50.database.md
[nitro-database-runtime]: https://github.com/nitrojs/nitro/blob/0509fb904ec87a0962187af13893b20cfdf2d34f/src/runtime/internal/database.ts
[nitro-storage-docs]: https://github.com/nitrojs/nitro/blob/0509fb904ec87a0962187af13893b20cfdf2d34f/docs/1.docs/8.storage.md
[nitro-cache-runtime]: https://github.com/nitrojs/nitro/blob/0509fb904ec87a0962187af13893b20cfdf2d34f/src/runtime/internal/cache.ts
[nitro-task-docs]: https://github.com/nitrojs/nitro/blob/0509fb904ec87a0962187af13893b20cfdf2d34f/docs/1.docs/50.tasks.md
[nitro-task-runtime]: https://github.com/nitrojs/nitro/blob/0509fb904ec87a0962187af13893b20cfdf2d34f/src/runtime/internal/task.ts
[nitro-shutdown]: https://github.com/nitrojs/nitro/blob/0509fb904ec87a0962187af13893b20cfdf2d34f/src/runtime/internal/shutdown.ts
[nitro-websocket-docs]: https://github.com/nitrojs/nitro/blob/0509fb904ec87a0962187af13893b20cfdf2d34f/docs/1.docs/50.websocket.md
[db0-pg]: https://unpkg.com/db0@0.4.1/dist/connectors/postgresql.mjs
[db0-bun]: https://unpkg.com/db0@0.4.1/dist/connectors/bun-sqlite.mjs
[db0-drizzle-docs]: https://github.com/unjs/db0/blob/be03a5173df0eef15df286f0f296195ed7a0fc56/docs/3.integrations/drizzle.md
[db0-drizzle-sqlite]: https://unpkg.com/db0@0.4.1/dist/_chunks/sqlite.mjs
[better-sqlite-docs]: https://github.com/WiseLibs/better-sqlite3/blob/v12.11.1/docs/api.md
[pg-transactions]: https://node-postgres.com/features/transactions
[bun-sqlite-docs]: https://github.com/oven-sh/bun/blob/bun-v1.4.2/docs/runtime/sqlite.mdx
[unstorage-fs]: https://unpkg.com/unstorage@2.0.0-alpha.10/dist/drivers/fs.mjs
[crossws-sync]: https://unpkg.com/crossws@0.4.15/dist/sync.mjs
