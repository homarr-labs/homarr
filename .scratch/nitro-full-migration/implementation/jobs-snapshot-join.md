# Jobs PostgreSQL snapshot join — source freeze

**Minimal consumer delta COMPLETE/FROZEN for independent source review. Not executable acceptance.** This lease changed only `packages/db/runtime-jobs.ts` and this exact handoff. The prior accepted compiler, native ordered effects, helpers, and SQLite composition were not reopened.

## Frozen producer authority

The join uses the reviewed producer declaration in `packages/db/runtime.ts:311–330` and `implementation/g3-postgresql-snapshot.md`:

```ts
boundedSnapshotAsync<T>(
  operation: BoundedTransactionOperation,
  callback: (database: HomarrDatabasePostgresql) => Promise<T>,
): Promise<T>
```

The existing operation type and inferred guarded PostgreSQL callback are used directly. No dependency declaration, mutable manifest/lock field, new library, cast, `any`, mode selector, raw client, or SQL-control escape was introduced. The producer alone owns its fixed repeatable-read/read-only BEGIN, checkout, remaining-budget timeouts, statement tracking, final COMMIT fence, rollback, cleanup, ambiguity, quarantine, and runtime admission/drain.

## Exact consumer delta

- Remove the now-unused Drizzle `SQL` type import.
- Replace only the PostgreSQL `querySnapshotAsync` ordinary `withDatabaseAsync`/Drizzle `transaction` branch with `await runtime.boundedSnapshotAsync(budget.operation(), async (database) => ...)`.
- Remove the duplicated `set_config` execution helper, ordinary resource-engine check, and consumer transaction isolation/access-mode configuration.
- Make the captured-epoch SELECT the first callback query, without `FOR SHARE` or `FOR UPDATE`; check the budget before and after its awaited execution, then validate the captured epoch.
- Await every compiled SELECT sequentially in its original order, with budget checks before and after execution. Preserve the existing shared result reader, scalar validation, detached materialization, total row/byte caps, row-set ordering, and final callback check.
- Await complete G3 settlement before the existing post-completion budget check and result return. Preserve the existing `finally`-owned `budget.finish()` on every success/failure path. No retry or alternate execution path is added.

There remains exactly one `beginOperation()` for the entire snapshot, covering compilation, admission, epoch validation, all SELECTs and completion. The PostgreSQL branch calls `budget.operation()` once; per-step checks do not mint new deadlines or reset the budget. Native or dispatched-COMMIT ambiguity errors propagate unchanged rather than becoming a fabricated success, rollback assertion, or retry.

## Retained source comparison

The complete pre-edit `packages/db/runtime-jobs.ts` was retained in this session's first read, and the complete post-edit source was inspected after the patch. Manual comparison confines the source delta to the removed import and the PostgreSQL snapshot branch described above. The original file had 279 lines; the inspected result has 265 lines. These are source inspection anchors, not fresh digests or executable proof.

The constructor/limits, captured lifetime/epoch, operation budget helper, batch compilation, result reader, epoch helpers, bounded writer runner, `queryAsync`, `executeTransactionAsync`, SQLite snapshot block, post-snapshot check, and final admission-release block retain their source content. The SQLite snapshot still uses its existing synchronous `boundedTransactionSync` path. Compiler/types files, runtime/G3, schema/catalog, state/P3/Core, package manifests/lock, cron consumers, icons and analytics were not edited. Mutable declaration-writer fields were not consulted as authority.

This source join supersedes the old ordinary-PostgreSQL-snapshot implementation described in `implementation/acceleration-sql-jobs.md`; that historical handoff was not edited under this lease. Removing the ordinary transaction delegation is not, by itself, a new native snapshot or whole-runtime acceptance result.

## Remaining holds

- Independent review of this exact producer-consumer source join and later authorized lint/typecheck/producer-consumer compatibility validation.
- Real PostgreSQL multi-statement repeatability under competing commits, native read-only enforcement, captured-epoch mismatch rejection, and statement/result order and cap behavior, including empty batches.
- Late-checkout cancellation without BEGIN, cancellation/deadline at queued statements and the actual COMMIT fence, BEGIN failure cleanup, caught/detached failure capture, ambiguity propagation, cleanup faults/quarantine, and maintenance/close tracking through actual native settlement.
- Relevant existing G3 writer regressions, SQLite parity/regressions, and unchanged native ordered effect behavior after integrated validation.
- Separately owned consumer batching: analytics thirty-statement and icon two-read joins remain unmodified here. Independent `queryAsync` calls are still not a shared snapshot. Consumer per-run signal/budget decisions, host assembly, declaration/export currentness and production mounting remain outside this lease.

No commands/checks, lint/typecheck/build/install/format/tests, runtime evaluation, SQL, network/providers, environment/current-data/credential access, listeners, Git, or nested agents were performed in this lease. No new tests or comments were added. Prior static results belong to the earlier implementation and are not presented as validation of this delta. Native I/O is not claimed interruptible or hard-time-bounded; already-dispatched COMMIT ambiguity remains the producer's recorded limitation.
