# Preservation transfer / erasure — two-file repair plan

**Ready for plan review; source lease remains held.** This addresses representation reviewer `ses_ec8728a20ffeDCs0JRdCRsvVrJ`'s two P2 findings against the frozen `bxl3v1_p` producer. Coordinator reports 25/type/lint/format0 at `v74wt2bu`; those results are premises, not reproduced here. Native/timing review is still active and may add findings. Do not edit its source, the source handoff, or MAIN's separate readiness amendment until reviews/plans reconcile.

Prospective scope is **only** `packages/db/runtime-preservation.ts` and `packages/db/runtime.ts`. Gate/shared unit, shared K/catalog, SQL/assets, contracts, manifests, Auth/API/MAIN and other files stay unchanged. This report is the only new write; no commands/hash/stat/checks/evaluation/import/test/SQL/native/Engine/network/private-config/data access or nested agents occurred.

## P2-1 — resource guard before initial K materializes ledger values

Current seam: `runtime.ts`'s `captureSqlitePreservationAsync` fixed native callback first calls `assertCurrentSqliteTarget` (current line780). Shared K subsequently executes `SELECT hash, created_at ... LIMIT migrationCount+1` in `main-target-catalog.ts`; complete-record metadata preflight currently follows it. A resource-ready DB can have its ledger changed before this new capture. Prior readiness is not a payload-size witness.

Add an internal-only module export, imported **only** by this runtime method, prospectively:

```ts
assertSqlitePreservationLedgerTransferBounds(
  client: Database,
  clock: SqlitePreservationClock,
  assertCurrent: () => void,
  quarantine: (reason: unknown) => void,
): void
```

Do not reexport it through `@homarr/db/runtime`; its client/guards are supplied by the actual retained runtime, not a proof/RPC caller. Body uses the existing private `collectRows` native iterator/finalization path, with its check composed from original clock, actual runtime currentness/activity/lifetime and `client.inTransaction`.

Inside the **already entered same bounded native unit**, before the first K call:

1. Check original bounds/currentness; read/authenticate the fixed migration bundle from the captured root under before/after checks. Require its SQLite complete-target count51; keep this same actual bundle identity through capture and final recheck. This is source-bundle authentication, not ledger acceptance.
2. Execute one fixed **scalar-only** ledger probe with native `typeof(hash)` and `length(CAST(hash AS BLOB))`, plus the minimal additional scalar fields below. No hash/id/created-at value, BLOB payload, `SELECT *`, substring, truncation, native pointer, supplied reader or replacement expected hash crosses into JS. No WHERE clause filters out bad rows.
3. Iterate at most **52** rows (51+1). Observe/reject the overflow witness rather than dropping it. Apply the approved TEXT/value/row/aggregate limits to actually observed scalar sizes, reject NULL/non-TEXT hash storage before K transfers it, and check original bounds around prepare, every step/visit and finalization. Count guards do not authenticate the ledger: unchanged K must still require **exactly51 actual rows**, their exact pinned hashes/timestamps and physical target. Under-count cannot become accepted through a placeholder or assumed old readiness.
4. Only after scalar guard and its physical cleanup succeed, call the unchanged first `assertCurrentSqliteTarget`, then the real record producer, then unchanged second K/identity/currentness checks. Do not change `boundedSqlitePreservationObservation` or any existing COMMIT/publication checks.

**One additional covered payload is real:** shared K also transfers ledger `created_at`, whose NUMERIC affinity can store oversized nonnumeric TEXT/BLOB before K rejects it. Hash-only guarding leaves that escape. Include its native storage plus scalar representation length: NULL0, INTEGER native CAST-TEXT length, REAL8, TEXT BLOB-cast byte length and BLOB length. Apply existing 1MiB TEXT/16MiB BLOB, encoded row and 64MiB aggregate bounds to the two K-transferred ledger fields, including fixed framing overhead; unknown storage rejects. These are resource guards only—do not replace K's timestamp comparison/type handling or coerce/truncate the value. Ledger `id` is not transferred by this K history read; its complete-record guard remains in the existing metadata pass.

No other business-record payload is transferred by the inspected K queries: runtime-meta epoch is queried as storage/null facts, not its value. `sqlite_master` DDL/names and pragma defaults/index/FK names are **catalog metadata**, outside the approved physical-table-plus-ledger record projection. Their unchanged K physical/profile validation is not advertised as a new before-materialization guarantee. If review demands a separate catalog-transfer fence, return that exact requirement for policy/lease review; do not introduce a generic catalog reader, new cap or shared-K edit under this repair.

Second K observes the same bounded ledger within the genuine BEGIN IMMEDIATE unit: this new observer performs no business DML, no caller callback can rewrite it, and owner/unit checks remain mandatory. The scalar guard proves only resource eligibility, never K validity, adoption provenance or preservation.

## P2-2 — erase the actual native-returned row views

Current seam: `runtime-preservation.ts#collectRows` calls `check()` after `iterator.next()` before retaining/cleaning its returned row (current lines416–419). `rowFrame/readCell` erase only detached owned copies. Raw `v*` and identity-probe Uint8Arrays can therefore survive a successful row or a post-step/visitor failure.

Add a **nonexported** helper beside `collectRows`, prospectively:

```ts
eraseNativeReturnedRow(
  row: unknown,
  retainCleanupFailure: (cause: unknown) => void,
  quarantine: (cause: unknown) => void,
): void
```

Only `collectRows` passes the actual `step.value` obtained from this native client's iterator. It must never accept caller buffers, recursively walk causes/graphs, invoke arbitrary getters, wipe encoder copies instead of originals, or modify ordinary/shared K iterators. Reflect only this object's own property keys/descriptors; for every own **data** property whose value is a Uint8Array (including Buffer), invoke the native Uint8Array fill primitive on that **original view**, not a copied subarray. Cover all property names, including unprocessed cells and identity-probe views, not merely whichever `v*` cells a visitor reached.

Required per-step sequencing:

1. Keep existing pre-next original/current-unit check and native-next error classification.
2. Immediately retain actual returned `step.value` after `.next()`—**before** the post-next clock/currentness check.
3. Enclose post-next check, done/yield handling, `ownRecord`, visitor and post-visitor check in a per-row try/catch/finally. Retain any body/check/validation failure **before** entering erasure cleanup, so a wipe fault cannot become the apparent primary.
4. Unconditionally run erasure finally, without a clock/budget/abort gate that could skip it. Catch descriptor/view-fill failures individually, continue other discoverable own views, retain original cleanup causes and quarantine those cleanup faults. If key enumeration itself fails, retain/quarantine that failure and still run outer iterator/statement cleanup; do not claim inaccessible views were erased.
5. Stop further row admission after any retained fault, then perform existing outer `iterator.return`, statement finalization and final original-clock cleanup regardless. Aggregate only once at the existing `collectRows` exit, preserving the first body cause, later erasure/return/finalization/check causes and actual quarantine classification. Do not throw a nested per-row AggregateError and recount it as a new native step fault. A pure cap/body/abort rejection is not itself a native erasure fault.

Successful payload visits finish their detached row encoding before originals are wiped; no retained encoded frame may share the raw row's buffer. Existing owned-copy/frame cleanup remains. Metadata-only probes return small primitives and have no raw Uint8Array payload to erase, but use the same finally path. If native `.next()` throws before yielding an accessible row, only iterator/statement/native cleanup can be claimed—not erasure of hidden engine/VM allocations. No GC deletion, RSS reduction or runtime proof is asserted.

## Minimal acceptance cases — later separately authorized validation

| Case                                                                                 | Required repaired behavior                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Ready DB's ledger hash becomes oversized before capture                              | Same-unit scalar probe observes actual TEXT byte length and stops before first K hash transfer; cleanup settles, no handle, no retry/repair. Prior readiness is irrelevant.                                                                      |
| Ready DB's ledger `created_at` becomes oversized TEXT/BLOB, or ledger gains row52    | Additional scalar size/overflow witness stops K payload transfer without filtering/substitution; exact ledger authority remains unchanged K.                                                                                                     |
| Payload is yielded, then post-next check/ownRecord/visitor/post-visitor check throws | Retained original row reaches erasure finally; every discoverable native Uint8Array own-data view is wiped, including cells never processed. First cause remains primary; erasure faults do not skip other wipes/return/finalize.                |
| Successful payload capture                                                           | Actual raw views are erased after detached encoding, then normal statement/unit settlement and postguards permit producer-born handle publication. Exact bytes/multiplicity/caps remain unchanged; counts/hashes do not substitute for equality. |

**Handoff:** reconcile this plan with pending native/timing findings, then request the two-file repair lease and fresh exact-byte review/check allocation. No source, old handoff/pins, shared native semantics or MAIN files were changed. No new dependency/file/framework/test/comment/cast/suppression, fixture, initialization/adoption, filesystem install, runtime/restart or cutover permission is proposed.
