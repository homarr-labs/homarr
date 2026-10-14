# Bounded source consumer joins

## Confirmed frozen prerequisites

- `packages/db/runtime-jobs/types.ts` already exposes `querySnapshotAsync(statements)` with the same structural SQL statement/value types as `packages/cron-jobs/src/sql.ts`. Its reviewed consumer uses one captured budget/epoch and the reviewed PostgreSQL bounded snapshot. SQLite remains unchanged. Source reviews are not fresh native proof.
- Frozen A10 identifies exactly30 analytics statements (culture, board,21 counts,6 grouped reads, board-item counts) and2 icon statements, currently separate queries. SQL consent/CAS/configuration/mutations stay outside the read batch.
- P3's reviewed `createSqliteCopyEngine().resetRuntimeAsync(copy, signal?)` is WeakMap-owned, requires open ready content and exact target50, clears only4 runtime tables and installs fresh engine-owned metadata. Target50 seal requires reset; explicit DB-engine old49 remains supported without reset.
- `packages/api/src/backup-runtime/index.ts` prepares migration/rekey/content/target validation/board choice/logout and then seals, but its `BackupEngine` contract currently omits the genuine reset. The default current-target preparation can therefore fail seal. The actual factory assignment in `sqlite.ts` already binds the genuine engine, so no callback/controller adapter is needed.

## Proposed disjoint phase for Oracle

Oracle approved both exact source-only leases. J1 source owner ses_ed8ecb98bffehzj4jPUYcZ2xiZ; J2 source owner ses_ed8ecb9d0ffed4lMVxDLgjKWlC. Both must enumerate required existing fixture forwarders before editing them; no new tests. Reviews follow freeze, and native evidence stays outstanding.

### J1 cron SQL read batching

J1 returned and review confirmed the30/2 batches preserve the source reads. It is not compilation-ready: existing `runtime.check.ts:81-106` constructs a configuration-only fake SQL port without the now-required snapshot method; it uses only `sqlResources.configuration`, not either batch. There is no genuine snapshot delegate in that fixture. Proposed minimal amendment for Oracle: extract the unchanged configuration-store body into an exported capability-narrow `createJobConfigurationSqlStore` accepting only `Pick<JobsSqlPort, "dialect" | "queryAsync">`; the full production factory reuses that store and retains required snapshots. The existing check constructs that real source configuration store instead of pretending its fixture supplies snapshots. Exact writes: sql.ts configuration extraction, runtime.check.ts constructor/use only, and J1 handoff. No optional snapshot, independent-query fake, missing-method throw shim, new tests or assertion change.

Only `packages/cron-jobs/src/sql.ts`, necessary existing fixture forwarders if the required port shape changes (enumerate before edits), and `implementation/cron-snapshot-consumer.md`. Add the exact required `querySnapshotAsync` port method, prepare the existing30 and2 statements in preserved order, await one native result batch for each operation, then use unchanged decoding/default merging/materialization. No fallback to independent reads, new snapshot engine, resets of batch budgets, mutation/CAS changes or icon atomicApply relabelling. DB producer/compiler/runtime/jobs remain frozen. Consumer type change and remaining host adapters must be reported, not silently replaced by Promise.all mocks.

### J2 preparation reset placement

Only `packages/api/src/backup-runtime/contracts.ts`, the preparation reset call in `index.ts`, direct engine assignment in `sqlite.ts` only if needed, exact existing fixture engine forwarders required by the new method, and `implementation/restore-reset-consumer.md`. Require the genuine reset operation in the server-only engine contract and await it after target checks/selected-board validation/copy logout, before seal; preserve cancellation, cleanup and errors. No runtime SQL issued by the API consumer, invented epoch, generic reset callback, live resource mutation or new restore/apply authority. Old49 DB-engine support remains unchanged; compatibility of explicitly old49 API consumers must be identified rather than silently broken. Inspection/export behavior stays unchanged. The separate apply path remains maintenance-unavailable even after copy reset is joined; stale reset-unavailable labels must be recorded and precisely scoped before changing them.

Both scopes are source preparation only. No source lease before Oracle approval; no speculative tests or runtime/provider/current-data calls. Final integrated lint/typecheck, existing focused consumer/reset/conservation/native checks and authorized restore/read-write/restart proof remain required after convergence.
