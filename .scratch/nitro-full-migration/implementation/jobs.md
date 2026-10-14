# Jobs/status preparation candidate

2026-10-10. Frozen mechanical public-import join for narrow independent review, authorized by Oracle PUBLIC-HOST-JOIN and accepted domain-port review. The accepted lifecycle r3 and independently accepted icon r2 domain/parser/planner/body behavior remain unchanged. Only the five core-runtime module specifiers in the three named consumer files changed; actual SQL execution, legacy icon SQL/atomicApply compatibility and physical backing/storage cutover remain HELD. No host registration, manifest, global registry, schema, migration or listener was changed. Whole #20/#115 remain incomplete and unmounted by this delivery.

## Current frozen public-import delta

Before writing, verified `packages/cron-jobs-core/package.json` already exports `./runtime` as `./src/runtime.ts`, and `packages/cron-jobs/package.json` already declares `@homarr/cron-jobs-core` as `workspace:^0.1.0`. Neither manifest nor the core producer was edited. The public path resolves to exactly the same source and symbol identities as the prior relative path.

All five declarations change only `../../cron-jobs-core/src/runtime` → `@homarr/cron-jobs-core/runtime`:

| Consumer                                  | Declaration / unchanged symbols                          |
| ----------------------------------------- | -------------------------------------------------------- |
| `packages/cron-jobs/src/runtime.ts`       | type import: `JobsRuntimeOptions`, `RuntimeJob`          |
| `packages/cron-jobs/src/runtime.ts`       | value import: `createJobsRuntime`                        |
| `packages/cron-jobs/src/sql.ts`           | type import: `JobConfiguration`, `JobConfigurationStore` |
| `packages/cron-jobs/src/runtime.check.ts` | type import: `JobSchedule`, `JobScheduler`               |
| `packages/cron-jobs/src/runtime.check.ts` | value import: `createJobsRuntime`, `cronerJobScheduler`  |

No import regrouping, new test, fixture/expectation change, scheduler/config/status/SQL/analytics/icon behavior change or backing-port redesign occurred. Reversing exactly these two/one/two replacements in memory reconstructs the three immediately prior SHA-256 fingerprints byte-for-byte; every other byte in these files is identical. The existing icon-only fixture adaptation belongs to accepted icon r2, not this mechanical delta.

Old → current SHA-256:

| Consumer                                  | Immediately prior hash                                                                | Current frozen hash                                                |
| ----------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `packages/cron-jobs/src/runtime.ts`       | `41e4fb40e2d7c084a7090a189e614c82692d0d84f00bdcdc22d564757f2a9761`                    | `0b00e6c31a5d839ec974d4ec5185f25811aaa63a8849714b09c8fb3bd3d7216e` |
| `packages/cron-jobs/src/sql.ts`           | `fd3def52e8a7112488846a4417fa6f93296df30c3d2c2dd028a95868ea421353`                    | `eb3a3d841ff154cc36d1b90decbe062bfea41ae86b44965b8ec77ae046ddcd4e` |
| `packages/cron-jobs/src/runtime.check.ts` | `75ece20aa38cdab6b2a29f1760a6398226fa800dd4ebaf504f336094a62482e7` (accepted icon r2) | `1fb796ee24b2bb72e45c1a492d6d1a6237fae05ae23c542df77985c193d0ccb4` |

The changed files are NOT asserted unchanged. Their current hashes supersede the historical hashes below and the relevant prior consumer hashes in the readonly icon handoff. All 17 frozen icon r2 source/body fingerprints still match `implementation/icons.md`; core runtime still matches `cfdc358b61662c1786d3ad392f87b7728294ae3b1ca8091a1c15530990ece2e1`, and status runtime still matches `3c2b1cf7fb8bc8173b1e6bef4e399d8d68e156f504f399b0f6bf02e36c3919f7`.

### Executed scoped validation

Each command exits 0; typecheck/lint have zero diagnostics and all three affected files pass formatting:

```sh
bun --no-env-file run packages/cron-jobs/src/runtime.check.ts
bun --no-env-file x --no-install tsc --noEmit --target ES2024 --module ESNext --moduleResolution Bundler --strict --skipLibCheck --noUncheckedIndexedAccess --types node,bun --jsx preserve packages/cron-jobs/src/runtime.ts packages/cron-jobs/src/sql.ts packages/cron-jobs/src/runtime.check.ts
bun --no-env-file x --no-install oxlint packages/cron-jobs/src/runtime.ts packages/cron-jobs/src/sql.ts packages/cron-jobs/src/runtime.check.ts
bun --no-env-file x --no-install oxfmt --check packages/cron-jobs/src/runtime.ts packages/cron-jobs/src/sql.ts packages/cron-jobs/src/runtime.check.ts
```

```text
PASS iconsUpdater: all six unavailable fails without replacement; external opt-out and empty success remain successful
PASS critical read shutdown: configuration listing and failed multi-key snapshot drain
PASS critical cleanup errors: original subscription failure and all-consumer error drain
PASS source jobs: persisted controls, restrictions, real bodies, keyed freshness, interrupted repair, async disposal and stop/drain
```

All Bun executions used `--no-env-file` and explicit disposable fixture resources. No installer, manifest/core/status/icon producer edit, shared-ledger edit, real DB/provider/network/environment/appdata/credential access, listener/browser/container, Git operation or nested agent was used. The existing check uses injected SQL-result/config/status/effect fixtures, not physical persistence or atomic SQL execution. Legacy `createJobsSqlResources().icons.applySyncAsync` still does not satisfy the reviewed icon service's required `atomicApply` contract; it was not repaired or relabeled. Host/storage/form joins and whole-ticket acceptance remain outside this mechanical freeze.

## Historical r3 cleanup-error corrections and freeze

The sections below preserve earlier r3/r2 evidence and source inventory. Statements about the r3 freeze, its then-relative edges and hashes describe that historical revision, not today's changed consumers or the later accepted icon r2 repair. Current import acceptance/hashes are recorded above; current icon-domain behavior is recorded in the readonly `implementation/icons.md`.

Only `packages/cron-job-status/src/runtime.ts`, `packages/cron-jobs/src/runtime.check.ts`, and this handoff changed from r2. Core scheduling/configuration, Homarr composition, job bodies, profiles, SQL statements/ports and all external registration/manifest/driver files are unchanged. No host consumption is authorized by this freeze.

- Subscription initialization now preserves its original error A even when disposal rejects with cleanup error B. Disposal itself still rejects B; it is not turned into success. B is delivered to the existing server-only `onError(error: unknown): void` callback and retained for final runtime cleanup reporting. Failed consumer disposal remains cached and owned, rather than being removed from the runtime's collection.
- Individual disposal waits for unsubscription, delivery completion and every launched snapshot read using `Promise.allSettled`. Unsubscription and delivery-cleanup errors are retained together; a single cleanup error keeps its original identity, while multiple errors produce a server-only `AggregateError`. Snapshot-read failures remain the subscription's original failure, not invented extra cleanup failures.
- Runtime `disposeAsync` is cached/idempotent and awaits all consumer disposal promises with `Promise.allSettled` before either resolving or rejecting. After all owned settlement, collected cleanup failures produce a server-only `AggregateError`. A failed consumer cannot make shutdown reject before another consumer's read/unsubscription settles. Repeated consumer/runtime disposal returns the same cached promise/result and does not retry an uncertain unsubscription.
- The existing error callback's **signature is unchanged**, but its documented scope now includes cleanup failures, not only async delivery errors. It is a server diagnostic hook, never an SSE/DTO serializer. If it throws, that reporting failure is separately retained for runtime cleanup aggregation without replacing A or B. Automatically initiated cleanup also records its real failure; there is no detached empty rejection handler hiding it. Failed disposal remains rejected and supervised by runtime shutdown.

Two new minimal public regressions were added inside the existing focused check. First: snapshot A plus unsubscribe B must return identical A, report identical B, and retain B for runtime teardown. Second: one consumer's unsubscribe failure must not settle runtime shutdown while a sibling has a pending snapshot read or pending unsubscription; after both settle, shutdown must reject with the collected real failure and preserve idempotent consumer/runtime results. No new job policy, scheduler behavior or icon repair was introduced.

**Red:** before production changes, `bun --no-env-file run packages/cron-jobs/src/runtime.check.ts` against r2 exited 1 with both `Cleanup failure must not replace the original subscription error` (B returned instead of A) and `Runtime disposal must not reject while a sibling consumer still owns reads and cleanup` (`true !== false`).

**Green:** after the changes, the same command exits 0 with all three lines:

```text
PASS critical read shutdown: configuration listing and failed multi-key snapshot drain
PASS critical cleanup errors: original subscription failure and all-consumer error drain
PASS source jobs: persisted controls, restrictions, real bodies, keyed freshness, interrupted repair, async disposal and stop/drain
```

Exact final checks, each exit 0; lint/typecheck have zero diagnostics:

```sh
bun --no-env-file run packages/cron-jobs/src/runtime.check.ts
bun --no-env-file x --no-install tsc --noEmit --target ES2024 --module ESNext --moduleResolution Bundler --strict --skipLibCheck --noUncheckedIndexedAccess --types node packages/cron-jobs-core/src/runtime.ts packages/cron-job-status/src/runtime.ts packages/cron-jobs/src/runtime.ts packages/cron-jobs/src/jobs/runtime-bodies.ts packages/cron-jobs/src/sql.ts packages/cron-jobs/src/runtime.check.ts
bun --no-env-file x --no-install oxlint packages/cron-jobs-core/src/runtime.ts packages/cron-job-status/src/runtime.ts packages/cron-jobs/src/runtime.ts packages/cron-jobs/src/jobs/runtime-bodies.ts packages/cron-jobs/src/sql.ts packages/cron-jobs/src/runtime.check.ts
```

No broad suites, repository-wide typecheck, installer, environment/appdata/credential access, actual network/provider effects, browser/container, branch/worktree or staging/commit operation occurred. One intermediate lint check rejected an unsafe finally; the implementation was corrected to explicitly record cleanup failure and then throw the original subscription error. Final scoped checks above pass.

Historical r3 frozen SHA-256 fingerprints of the exact six candidate source files, calculated with Bun `--no-env-file` and built-in `node:crypto` over their bytes; preserved unchanged as historical evidence, not current hashes for later-edited consumers/body/check:

```text
cfdc358b61662c1786d3ad392f87b7728294ae3b1ca8091a1c15530990ece2e1  packages/cron-jobs-core/src/runtime.ts
3c2b1cf7fb8bc8173b1e6bef4e399d8d68e156f504f399b0f6bf02e36c3919f7  packages/cron-job-status/src/runtime.ts
41e4fb40e2d7c084a7090a189e614c82692d0d84f00bdcdc22d564757f2a9761  packages/cron-jobs/src/runtime.ts
e9fb6e7a99d0325aee0a4a0ccf631f458703e8ed9a5b0259ec00c0cd743f8fad  packages/cron-jobs/src/jobs/runtime-bodies.ts
fd3def52e8a7112488846a4417fa6f93296df30c3d2c2dd028a95868ea421353  packages/cron-jobs/src/sql.ts
e0cd4cc055cc377bad55ef6497828045d5d489b64fbbe7df839d6b93045e6fc3  packages/cron-jobs/src/runtime.check.ts
```

This was the r3 freeze for re-review, not #20 completion, accepted host integration or actual SQL execution evidence. Its then-held #115 icon plan was subsequently replaced and reviewed in icon r1/r2; actual atomic apply and the legacy SQL incompatibility remain HELD.

## r2 review corrections and evidence

Only three owned TS files changed from r1: `packages/cron-jobs-core/src/runtime.ts`, `packages/cron-job-status/src/runtime.ts`, and `packages/cron-jobs/src/runtime.check.ts`, plus this handoff. Job bodies, the Homarr factory, SQL statements/ports, source scheduling policies and all manifests/global registrations are unchanged.

1. **Configuration listing drain:** `getAllAsync` now uses the existing serialized control mechanism. Its configuration read remains owned until settlement, so `stopAsync` cannot resolve and permit SQL disposal while that read is pending. A listing queued after shutdown fails its existing readiness guard without reading SQL. There is no new task queue, retry or scheduling policy.
2. **Failed multi-key snapshot drain:** subscriptions retain each launched snapshot-read promise. Disposal awaits `Promise.allSettled(snapshotReads)`, not a first-rejection aggregate. Initial snapshot delivery still awaits `Promise.all(snapshotReads)` and returns the original subscription failure after cleanup; neither a failed sibling nor abort/shutdown permits disposal ahead of remaining reads.
3. **Two focused public critical regressions:** the existing check now holds an actual public configuration-listing read while stopping the runtime, and holds one public subscription snapshot while another rejects and the status runtime is disposed. Both require shutdown to remain pending until the held read settles; the status case additionally requires listener removal, no delivery and the identical original error object. All gates are fresh injected promises; no timers, network or real database resources are used. These tests isolate lifecycle ownership; the existing check continues to exercise all three actual adapted job bodies.

Red evidence: `bun --no-env-file run packages/cron-jobs/src/runtime.check.ts` against unchanged r1 runtimes exited 1 with both assertions: `Job shutdown must wait for an in-flight configuration listing` and `Status disposal must wait for every snapshot read after a sibling rejects` (`true !== false`). The first green attempt timed out because the regression awaited a newly queued listing rejection before releasing the held earlier listing; the fixture was corrected to await that rejection after release, without changing the ownership assertions or adding production scope.

Final green evidence: the same command exits 0 with `PASS critical read shutdown: configuration listing and failed multi-key snapshot drain` and the existing source-jobs PASS. Scoped Bun `--no-env-file` typecheck and lint on exactly the six owned TS files also pass, zero diagnostics. No full-repository checks or broad tests were run. This revision is frozen pending re-review, not mounting or ticket closure.

## Delivered source

| Source                                          | Exact functions/contracts                                                                                                                                                                                      |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/cron-jobs-core/src/runtime.ts`        | `createJobsRuntime`, `cronerJobScheduler`; `JobClock`, `JobConfigurationStore`, `RuntimeJob`, `JobRunContext`, `JobStatusLifecycle`, `JobScheduler`, `JobsRuntimeOptions`, `JobsLifecycleState`                |
| `packages/cron-job-status/src/runtime.ts`       | `createJobStatusRuntime`; `RuntimeTaskStatus`, `JobStatusRecord`, `JobStatusBacking`, `JobStatusRuntimeOptions`                                                                                                |
| `packages/cron-jobs/src/jobs/runtime-bodies.ts` | `createAnalyticsJobService`, `updateIconsAsync`, `clearPingUrlsAsync`, `pingUrlsAsync`, `cleanupDisabledProviderSessionsAsync`, `AnalyticsExternalConnectionsDisabledError`; effect/resource/SQL-plan payloads |
| `packages/cron-jobs/src/runtime.ts`             | `createHomarrJobsRuntime`, `HomarrJobsRuntime`, `HomarrJobName`, `HomarrJobsResources`; exactly analytics/iconsUpdater/ping                                                                                    |
| `packages/cron-jobs/src/sql.ts`                 | `createJobsSqlResources`; `JobsSqlPort`, `JobSqlStatement`, `JobSqlValue`, `JobsSettingsCodec`                                                                                                                 |
| `packages/cron-jobs/src/runtime.check.ts`       | One explicitly executed critical lifecycle/status check using the actual adapted bodies and fresh injected resource fixtures                                                                                   |

These candidates are not miniature jobs made from caller-supplied task callbacks. The actual analytic snapshot assembly, icon reconciliation, ping loop and provider-session cleanup semantics were adapted from source; only resources, SQL execution/transactions, configuration, clocks and effects are supplied by the host. SQL text preserves the existing physical table/column names and uses bound parameters for both dialects. No models/defaults are recreated or seeded.

## Exact source coverage

- `src/jobs/analytics.ts`: Monday weekly `0 0 * * 1`, run-on-start, hidden, no manual execution, no custom interval and NO_EXTERNAL_CONNECTION gate.
- `packages/analytics/src/send-server-analytics.ts` and `snapshot-properties.ts`: both consent checks, seven-day due calculation, stable instance-ID CAS, all 21 counts and six grouped/deduplicated breakdowns, board-size buckets, count-zero omission, deterministic per-period snapshot UUID, no person profile/GeoIP, capture+flush effect, success metadata update, failed/disabled/skipped/sent results, process-local pending-send coalescing. `collectSnapshotAsync` is backed by actual SQL queries in `sql.ts`, not an omitted aggregation callback.
- `packages/api/src/router/analytics.ts`: `sendAnalyticsAsync` retains the separate action's external-connection precondition and `{status}` response; the adapter must still require admin. It uses the same service instance as the job. Both direct service/action calls are owned effects and participate in stop/drain.
- `src/jobs/icons-updater.ts`: Monday weekly/run-on-start/10-second warning threshold, external gate, successful repository filtering, retained checksums and IDs, inserted IDs/URLs/names, missing repositories, deletion-first transactional replacement and source-equivalent N-way batches of at most 5,000 icons. `IconSyncPlan` and its SQL implementation are pending #115 review, not #115 acceptance.
- `src/jobs/ping.ts`: minute schedule, registry clear before each start, forceDisableStatus gate, URL deduplication, Promise.allSettled semantics, success/error result publish. Abort-aware resources are injected; the authorized direct app-ping capability is untouched.
- `apps/tasks/src/on-start/session-cleanup.ts`: disabled credentials/oidc/ldap SQL user-provider membership removes only associated SQL login sessions. Integration sessions are unrelated. The original catch/log/continue-on-cleanup-failure startup policy is retained.
- `src/job-manager.ts`, core `creator.ts`/`group.ts`: durable enable/disable/cron patches, list hiding and restriction flags, manual/start/stop controls, task initialization, beforeStart/runOnStart, status hooks and duration warning. Disabled-initialization→enable now creates the missing handle, and concurrent duplicate initialization creates handles only once.

## Lifecycle and scheduling semantics

Construction only configures; imports and factories create no schedules and run no effects. The host must configure/open/migrate first and supply `assertReadyAsync` that asserts migrated resources plus exclusive singleton ownership of the data directory. This is resource readiness, not an assertion that the entire HTTP app has started. `initializeAsync` checks readiness, performs cleanup, repairs interrupted status, reads durable configuration and creates paused schedules. `startAllAsync` performs beforeStart/runOnStart and resumes them. Those calls return their real async completion and failures.

Runtime controls: `initializeAsync`, `startAllAsync`, `startAsync(name)`, `stop(name)`, `triggerAsync(name)`, `enableAsync(name)`, `disableAsync(name)`, `updateIntervalAsync(name, expression)`, `getAllAsync`, `getKeys`, `getState`, `runEffectAsync`, `stopAsync`. The eight API identities map to the six named controls, list, and the separate status stream. Permission enforcement and direct-oRPC/SSE adapters belong to #04/#120/#124 and are not supplied here.

`stopAsync` immediately rejects new work, permanently stops timers, signals active executions/owned manual effects, awaits pending controls including configuration listings and all tracked settlements, then becomes stopped. It is idempotent. Only after that promise resolves may the host dispose status consumers/backing and SQL resources. Cancellation-capable fetch/ping/analytics effects must honor the supplied signal; an adapter that ignores cancellation can delay drain. There is deliberately no invented timeout that closes SQL under an unsettled run. A shutdown deadline/budget is host-owned and must report failure rather than claim completed drain. Restart uses fresh runtime/status instances with the retained config/backing, not a stopped Cron handle.

Preserved source policies:

- Runs may overlap: Croner protect remains off. No retry, catch-up, durable execution queue or exactly-once promise is introduced. Run-on-start happens on every explicit start as in source, not once per database lifetime.
- Start/stop are process schedule controls, distinct from durable enabled state. An already-created handle may be manually triggered or explicitly started after disable; a job disabled at initialization has no handle until enable. This source distinction is retained. Interval replacement resumes an enabled schedule even if it was temporarily stopped, matching source.
- Callback errors are logged/statused, not converted into a retry queue. Analytics returning `failed` was already a completed callback, so the scheduler retains that behavior instead of inventing different result semantics.
- Cleanup failures log and continue, matching source. Owner/resource-readiness, config-loading and status-repair failures prevent startup. Invalid interval syntax is checked before a durable edit or old-handle replacement.
- Croner uses its native wall-clock/timezone scheduling. Injected clocks cover status/analytics timestamps and elapsed measurements; deterministic tests inject the scheduler as well. Production clocks must agree with the host wall-clock. No timezone default is invented.

## Status and async consumer disposal

`createJobStatusRuntime` exposes `getAsync`, `repairInterruptedAsync`, `beginAsync`, `finishAsync`, `subscribeAsync`, `disposeAsync`. Public status values retain name/running-or-idle/last-execution timestamp/success-or-error-or-null. The envelope adds per-key monotonic revision, owner ID and run ID for freshness and fencing, not execution history.

`JobStatusBacking` is a precise candidate contract for #03/#02, not an in-memory production backend:

- `getAsync(name)` reads the retained keyed record.
- `updateAsync(name, reducer)` atomically reads/mutates one key; null reducer result is no write/no publication. Non-null changes allocate a monotonically increasing revision, persist before publication and return the stored record. Revisions may not reset while previous records/consumers survive. The reducer must be called against the authoritative latest record in a serialized/transactional mutation, not outside a later non-atomic KV set. Backing outages must reject, not synthesize a successful write. Records/versions require the agreed retained-state lifetime.
- `subscribeAsync(names, callback)` resolves only once the listener is attached, and returns `() => Promise<void>` which resolves only after actual listener removal. The callback receives complete recorded envelopes; it must not mutate them.

The service attaches listeners before snapshot reads, reconciles by per-key revision and coalesces at most one pending latest value per allowed job. Async consumer delivery is serialized and bounded by job-key count, not an unbounded event queue. Older snapshots and older-run completions cannot overwrite newer state. Status remains a latest-run value, not a fabricated count of every overlapping run. A fresh owner repairs a previous owner's running status to idle/error while preserving the old start timestamp, never to success. This is the explicitly safe interrupted-status/freshness repair; it does not replay the task or assert its external side effect did not happen.

Subscription disposal waits for pending attachment, every individual snapshot read even after another read rejects, async unsubscription and in-flight delivery. Runtime disposal also awaits every consumer already being disposed before reporting collected cleanup failures. Listener failure ends delivery and attempts backing-listener disposal; failed cleanup is reported through the server-only error hook, remains rejected/owned, and is not evidence of successful listener removal. An SSE adapter must provide abort-aware delivery/backpressure, await the returned disposal on disconnect, and use revision/key reconciliation on reconnect. Authorization, SSE framing and the same Nitro listener are host-owned; no WebSocket or extra listener was added.

## Missing accepted resource contracts

No reviewed physical persistence or common-state export was available when this candidate was written; no competing implementation was made.

1. **#02 `JobsSqlPort`:** `dialect: sqlite|postgresql`, `queryAsync({sql, parameters}) -> readonly Record<string, unknown>[]`, and `executeTransactionAsync(statements) -> readonly {affectedRows:number}[]`. The statements transaction must execute wholly synchronously inside Bun SQLite's transaction callback; PostgreSQL must await every statement on one checked-out client and rollback/release correctly. Do not implement this as async callbacks inside native SQLite transactions or statements on unrelated pooled sessions. Calls must reject after maintenance/drain/close; the host owns the connection and migration barrier. This adapter has not been exercised against SQLite/PostgreSQL.
2. **#02/#17 settings codec:** actual SuperJSON encode/decode and source defaults. The injected fixture uses plain JSON only for disposable test values; it does not prove SuperJSON backup compatibility. The analytics adapter retains unknown serialized row fields and source's five-attempt value-CAS updates.
3. **#03 status backing:** atomic mutation/monotonic retained revision/listen-after-persist/real async disposal above. No generic KV is claimed to satisfy these requirements, and no extra physical status schema was created.
4. **#03 ping:** source registry clear/get-all and result publish adapters with the agreed Redis-free lifetime. The registry was not retired or converted to a new job queue.
5. **#17/#18/#40/#115:** explicit analytics consent/property inputs, disabled-provider configuration, safe/cancellable transport for capture+flush/icons/ping, and accepted icon-sync adapter. Effects were fixtures only; none contacted an upstream.
6. **COMPOSITION/#04/#120/#124:** review candidate signatures, enforce admin on all eight task operations/manual analytics, mount a same-listener keyed SSE adapter, and order resource readiness/start/drain/disposal. No routes or new contributions were registered.

## Historical r3 required review finding

The destructive no-success planner behavior described here was subsequently repaired by the authorized #115 icon lane and accepted at icon r2. This paragraph preserves the original finding; it is not a claim that the current shared icon planner/body still deletes all icons. The legacy SQL writer remains incompatible and held.

The existing icon body uses `or(...[])` when there are no successful groups. Drizzle then supplies an undefined deletion condition, which deletes every icon; failed but still-listed repositories remain. The candidate makes that exact source behavior explicit as `deleteIcons: {kind: "all"}` rather than hiding it behind a generic sync callback. **Icon synchronization is HELD and must not mount in this state.** #115's explicit failure/cancellation criterion forbids clearing valid user selections and authorizes the later #115 owner to repair this behavior; that repair is not this lane's r2 scope. The source-equivalent transaction plan must also remain atomic on both engines.

Analytics process-local coalescing, value-CAS settings updates and deterministic provider event UUIDs are not a durable send claim or an exactly-once guarantee across crash/restore. A successful send followed by metadata-write failure can be retried with the same period UUID. No new idempotency policy was invented.

## Historical r3 manifest/export handoff

This records export discovery at r3. The current authorized cleanup verified the accepted core runtime export/dependency already present and replaced only its five consumer import specifiers; no manifests or other edges were changed in this delivery.

COMPOSITION owns all manifests. No dependency was added: core already declares Croner 10.0.1, and Bun/node:crypto/node:assert are runtime/built-in facilities. Installed `node_modules/croner/README.md` and `dist/croner.d.ts` verified paused creation, Cron/ISO expression validation, async callbacks, protect=false, pause/resume/permanent stop and unnamed-instance ownership. Context7 is known quota-exhausted and was not retried.

Proposed new export paths, not yet declared/accepted:

- `@homarr/cron-jobs-core/runtime` → `./src/runtime.ts`
- `@homarr/cron-job-status/runtime` → `./src/runtime.ts`
- `@homarr/cron-jobs/runtime` → `./src/runtime.ts`
- `@homarr/cron-jobs/sql` → `./src/sql.ts`
- `@homarr/cron-jobs/runtime-bodies` → `./src/jobs/runtime-bodies.ts` if #115/#17 need direct resource/body types

Until those are accepted, the candidate uses explicit relative source edges between the owned subsystem files rather than falsely claiming undeclared exports work. COMPOSITION must replace the cross-package runtime/type edges with the accepted public subpaths before final integration. No existing root/global `jobGroup`/`jobRegistry` registration or package manifest was modified, and the host must not import those legacy roots into this candidate's graph.

## Executed validation

All executions used Bun `--no-env-file` and explicit fixtures. No installer, broad repository check, Docker/container/browser session, environment-file read, live SQL, ping request, icon fetch/download, real analytics send or paid provider was used.

- `bun --no-env-file run packages/cron-jobs/src/runtime.check.ts`: PASS. Checks cold configured/no schedules, duplicate initialization, cleanup-before-start, exactly three names/Monday/minute defaults, hidden/manual/custom restrictions, interrupted error repair preserving timestamp, source-default/custom row preservation, disabled-init→enable, invalid expression pre-write rejection, old timer disposal, real icon reconciliation with preserved IDs/checksums, real analytic properties/success metadata/due skipping/precondition, keyed initial/live race, older-run completion fencing, awaited async listener disposal, real ping deduplication and stop/abort/drain with no late publish.
- Scoped `bun --no-env-file x --no-install tsc --noEmit --target ES2024 --module ESNext --moduleResolution Bundler --strict --skipLibCheck --noUncheckedIndexedAccess --types node` on core/status runtime, jobs runtime/sql/check (which includes runtime bodies): PASS.
- Scoped `bun --no-env-file x --no-install oxlint` on the six changed TS files: PASS, zero diagnostics.
- Scoped `bun --no-env-file x --no-install oxfmt --check` on those files: PASS.

The critical check uses injected config/status/SQL-result fixtures, not executed SQLite/PostgreSQL statements, migration/backup acceptance or live transport testing. Full persistent restart, both-driver transactional execution, current SQLite backup restoration, actual SSR/admin UI and same-listener SSE acceptance remain future integrated gates. No ticket or predecessor is marked complete by this delivery.
