# Cron Jobs router sprint: frozen unmounted draft

## Exclusive files

- `packages/api/src/nitro/routers/cron-jobs.ts`
- `packages/api/src/nitro/routers/-cron-jobs/resources.ts`
- `packages/api/src/nitro/routers/-cron-jobs/helpers.ts`
- `.scratch/nitro-full-migration/implementation/sprint-cron-jobs.md`

No shared context/procedure/errors/map/index/contribution, manifest/lock, legacy router, DB/Core/Auth, scheduler/status/state/SQL/job-body or host source was written. This draft is not registered, exported through a package manifest, mounted or accepted. Source inspection only; lint/typecheck/build/test/format/install and all execution-based verification are deferred.

## Source leaf inventory and local bodies

`createCronJobsProcedures(resources)` produces these exact source identities. `cronJobsImplementedPaths` is a local body inventory, not an acceptance ledger or delivery claim.

| Identity                            | Source input and return                                              | Genuine resource operation                                                                             |
| ----------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `cronJobs.triggerJob`               | Registry-name enum; resolves undefined                               | `HomarrJobsRuntime.triggerAsync(name)`                                                                 |
| `cronJobs.startJob`                 | Registry-name enum; resolves undefined                               | `HomarrJobsRuntime.startAsync(name)`                                                                   |
| `cronJobs.stopJob`                  | Registry-name enum; returns undefined                                | `HomarrJobsRuntime.stop(name)`                                                                         |
| `cronJobs.updateJobInterval`        | `{ name: registry-name enum, cron: z.string() }`; resolves undefined | `HomarrJobsRuntime.updateIntervalAsync(name, cron)`                                                    |
| `cronJobs.disableJob`               | Registry-name enum; resolves undefined                               | `HomarrJobsRuntime.disableAsync(name)`                                                                 |
| `cronJobs.enableJob`                | Registry-name enum; resolves undefined                               | `HomarrJobsRuntime.enableAsync(name)`                                                                  |
| `cronJobs.getJobs`                  | No input/output validator in source; ordered job projection          | `HomarrJobsRuntime.getAllAsync()`                                                                      |
| `cronJobs.subscribeToStatusUpdates` | No input/output validator in source; stream of source status values  | `createJobStatusRuntime(...).subscribeAsync(names, listener, onError)` through the local demand bridge |

Every identity has a local unmounted body; every identity remains dependency-held for real exposure. No identity is replaced by a pending-success stub, generic operation controller, legacy caller or tRPC tunnel.

## Precise resource boundary

`CronJobsProcedureResources.jobs` is the actual exported `HomarrJobsRuntime` type, not a new job-manager interface. `status` is `ReturnType<typeof createJobStatusRuntime>` from the accepted public status runtime subpath. These are injected existing instances; this lane constructs neither service, no schedules, backing, SQL connection or job effects. The logger is a type-only `Pick<ILogger, "info">` from Core, with no logging/environment initialization imported at runtime.

The runtime owns configuration, timers, lifecycle readiness, serialized controls, pending listings, manual executions, run cancellation, status begin/finish and drain. The API does not invoke `initializeAsync`, `startAllAsync`, `runEffectAsync`, `stopAsync` or status-runtime disposal, nor tie an accepted manual job's lifetime to a requesting HTTP client's lifetime. The same host-owned jobs instance must also serve the analytics lane; this draft does not manufacture a second analytics service.

## Source comparison

Compared the complete `packages/api/src/router/cron-jobs.ts` and `packages/cron-jobs/src/job-manager.ts`, legacy job-group/creator, job declarations/expressions, status publisher/channel source, and current accepted runtime/core/status/SQL/body source plus `implementation/jobs.md`.

- All management leaves use `authenticatedProcedure` with `admin`, `demo: "guarded"` and their exact mutation/query/subscription kinds. The existing frozen base preserves demo-mutation denial before authentication and permission checks, then input validation/handler execution. No extra projection metadata exists in the source; no REST/MCP metadata or output validators are added.
- Names come from the supplied genuine runtime's `getKeys()`, matching the source registry enum and subscription set, including hidden `analytics`. Factory-time reads only inspect that registry. The accepted Homarr registry preserves insertion order `analytics`, `iconsUpdater`, `ping`.
- Cron input stays an unconstrained string at the API boundary. Defaults remain solely in the accepted runtime: weekly Monday `0 0 * * 1` for analytics/icons, minute `* * * * *` for ping, source restriction flags, hidden analytics, run-on-start and ping before-start. No invented timezone or cron normalization is added.
- Controls retain process pause/start versus durable enable/disable distinctions, manual prohibition, missing-handle manual no-op, run-on-start on explicit starts, enabled interval replacement resume, and caught/logged callback failures. Existing error strings for missing job, prohibited manual execution and prohibited custom intervals remain owned by the accepted runtime and flow through the frozen backend error mapping. Outer interval/enable/disable management log messages and success ordering remain from `JobManager`.
- `getJobs` retains exactly `name`, `cron`, `preventManualExecution`, `preventCustomInterval`, `isEnabled`, filters hidden jobs, uses stored cron/enabled values with source defaults, and preserves registry order. It does not expose run/revision/owner state, add sorting, synthesize status or query execution history.
- Configuration persistence stays inside the accepted `JobConfigurationStore`. Its existing SQL reads the same physical `cron_job_configuration` name/cron/enabled fields with no ordering clause. Existing patch/upsert SQL changes only supplied fields, preserves the name key and fills missing fields from the source defaults. SQLite/PostgreSQL schema declarations were read, not used to open a connection. No competing SQL adapter or configuration cache is introduced here.

This is router-level source correspondence through the explicitly requested accepted services, not a claim that those services are byte-equivalent to the raw legacy implementation. Their already-recorded differences remain unchanged: validation occurs before interval persistence/old-handle replacement; enable can create a handle omitted during disabled initialization; readiness/drain and interrupted-run ownership are fenced; status listener-before-snapshot and monotonic revision reconciliation replace the legacy unrevisioned channel race; the shared icon service retains its separately accepted repair. Legacy select-then-update/insert is not copied over the accepted patch/upsert, and old configuration debug logging is not a new API-owned SQL algorithm.

## Status transport and cleanup

The helper uses the pinned native oRPC `AsyncIteratorClass`, not an Observable, fake status engine or new backing. It subscribes to all source registry names through the accepted status runtime. That runtime performs physical listener attachment before snapshots, per-key revision rejection/coalescing, owner/run completion fencing and all pending-read/delivery cleanup. Revision/owner/run envelopes are used only internally; the iterator emits exactly `name`, `status`, `lastExecutionTimestamp`, `lastExecutionStatus` with source values and units.

The demand bridge holds a single delivered record and awaits consumption; the accepted service owns the bounded keyed latest-record reconciliation while the consumer is slow. No unbounded event history or second revision map is added. Setup awaits actual subscription/snapshot completion before logging the unchanged connection message and returning the iterator. No status data is fabricated when a snapshot is absent.

Request disposal is registered before attachment. Request abort, iterator return/throw and terminal iteration share one retained disposal promise. Closing releases a blocked consumer-delivery handoff before awaiting the genuine returned async unsubscribe, preventing delivery/unsubscribe circular waiting. Pending registration and snapshot completion stay owned by the accepted runtime; closing does not claim physical cleanup until that promise settles. The request abort hook is removed on disposal. Cleanup failures remain rejected in the registered request disposer; accepted status-runtime cleanup failures remain owned by its runtime disposal/error hook.

When setup/iteration already has an error, secondary cleanup rejection is deliberately not substituted for that primary error. The retained request disposer still rejects, and the accepted status runtime's error hook/cleanup-failure collection still owns physical cleanup failure. Normal iterator cancellation does not swallow cleanup rejection. Post-handler stream errors use the frozen backend error conversion because normal handler middleware cannot wrap later iterator pulls.

## Binding holds

- **Physical configuration SQL:** a reviewed DB-backed configuration store/SQL adapter using the migrated authoritative data directory, correct driver transaction/session rules and maintenance/drain admission. Structural types and reading source SQL are not physical backing evidence.
- **Status backing:** authoritative atomic keyed mutations, retained monotonic revisions, persist-before-publish, attachment-confirmed subscriptions and actual awaited listener removal. No Redis/KV substitute or in-memory production backing is supplied.
- **Coherent current authority:** genuine request principal/admin/demo authority, compatible request lifetime, the same authoritative DB as the injected jobs configuration, and the same status instance used by jobs begin/finish. These structural resource fields do not prove provenance, writer fencing or current authorization.
- **Lifecycle/transport:** configure/migrate/readiness and exclusive runtime ownership; host-owned initialize/start; drain active jobs; abort/dispose stream consumers and await their physical cleanup; then dispose status/backing/SQL. Same-listener framing, reconnect reconciliation, real backpressure and response-body lifetime remain host joins. No host shutdown or stream-disconnect demonstration was executed.
- **Job effect resources:** real cancellable analytics/ping/icon adapters and the accepted atomic/current-authority icon boundary. The legacy jobs SQL icon writer does not satisfy that boundary and is not relabeled here.
- **Composition/review:** named factory/resource export and routing registration, source metadata reconciliation and required lint/typecheck/targeted verification remain outside this exclusive lease.

## Dependency and pinned API inspection

API already declares `@orpc/server`, Zod, Core, cron-jobs and cron-job-status. The public `cron-jobs/runtime` and `cron-job-status/runtime` exports were verified in their manifests. API does not directly declare cron-jobs-core, so no direct core import is added; the accepted jobs runtime's declared core dependency owns scheduler/control internals.

Read installed `@orpc/server` **2.0.0-beta.43** builder/handler/re-export declarations, its exported `AsyncIteratorClass` implementation in `@standard-server/shared`, and the pinned client serializer's async-iterator detection. Return/throw perform asynchronous cleanup even when a next pull is pending. No output schema is needed to turn an inferred iterator into RPC stream data, preserving the source's absence of output validation. Installed Zod **4.4.3** accepts the runtime's typed name array in `z.enum`. Croner **10.0.1** declarations confirm trigger/pause/resume/permanent-stop semantics consumed by the untouched accepted scheduler. ES2024 project libraries supply `Promise.withResolvers`/`PromiseWithResolvers`.

No network/docs-provider call, credentials/environment/current-data read, SQL/provider execution, job/service start, listener/browser/container action, Git operation, nested agent, validation command or test addition occurred. Frozen for coordinator review; no acceptance or production-readiness claim.
