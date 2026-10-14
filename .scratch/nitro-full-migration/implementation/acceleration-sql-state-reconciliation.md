# SQL state reconciliation — retained comparison and narrow fixes

## Released scope

The new user lease approves reconciliation and two source fixes only. The other state-preparation writer's lease is revoked and the current files are frozen for this work. This is not an original-port rewrite or selection of an implementation winner. Actual writes in this reconciliation are only `packages/db/runtime-state.ts` and this reconciliation handoff. Both helper variants and the original `acceleration-sql-state.md` evidence remain in place.

## Retained baseline recovered before editing

The conversation retains this session's successful Add File patch for the original `packages/db/runtime-state.ts`, plus its two helper Add File patches. The original entrypoint is not currently available as a separate on-disk baseline. Its retained source inventory is:

- Imports: `node:crypto` UUID generation, Drizzle `sql`/`SQL`, existing DB driver/runtime/catalog types, and this session's `runtime-state/sql.ts` and `runtime-state/types.ts`.
- Public entrypoints: `initializeRuntimeEpochAsync`, `createRuntimeStateSqlBacking`, and inferred `RuntimeStateSqlBacking`; structural `StateOperation`, `StateCondition`, `StateWrite`, `StateMutation`, `StateSnapshot`, and related option/error exports came from `types.ts`.
- Private initialization/admission helpers: `assertDuration`, `assertEpoch`, `createOperation`, `decodeMeta`; sentinel-only UUID installation used the existing G3 bounded transactions.
- Mutation planning: `snapshotValues`, `expiryFromTtl`, `incrementCounter`, `PreparedWrite`, `prepareWrites`; the factory captured registrations/limits and supplied `copyKeys`, `copyMutation`, native snapshot readers, locked-row decoders, epoch/mutex checks, ordered write compilation, and final condition-expiry checks.
- The original factory returned `epoch`, `readAsync`, `mutateAsync`, and resource-local `closeAsync`; the close path aborted a resource controller and awaited tracked operations without closing the main persistence runtime.
- The original PostgreSQL mutation path included a positive-condition preflight snapshot and a conservative host/monotonic deadline clamp derived from SQL remaining expiry, then rejected an authoritative expiring condition with no admissible preflight or a shorter expiry. That attempted design is retained evidence, not a proven COMMIT-expiry solution or a design adopted by this reconciliation.
- The successful original Add File patch constructed post-write results from the validated transaction-local plan. A later attempted patch to add physical post-write reads and further tighten the preflight was refused because the entrypoint had already changed; those edits did not land through that patch.

The previous collision read found a replacement entrypoint importing `contracts.ts`, `statements.ts`, and `validation.ts`. It exposed `initializeRuntimeStateEpochAsync` and a backing with `readAsync`/`mutateAsync`. Current source has subsequently gained byte-bounded SQL projections, physical post-write reads/effect comparison, and mutation observation-byte accounting. The tool reads establish these differences but do not identify every writer, edit timestamp, or complete intervening lineage. No checksum or whole-byte identity claim is made.

## Preserved variant comparison

| Concern                                             | This session's retained variant                                     | Current frozen variant being narrowly fixed                                                        |
| --------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Helper files                                        | `runtime-state/sql.ts`, `runtime-state/types.ts`                    | `runtime-state/contracts.ts`, `runtime-state/statements.ts`, `runtime-state/validation.ts`         |
| Initialization name                                 | `initializeRuntimeEpochAsync`                                       | `initializeRuntimeStateEpochAsync`                                                                 |
| Exact registration kind                             | `exact`                                                             | `key`                                                                                              |
| Key limits                                          | `maxReadKeys`, `maxDistinctKeys`, configurable `parameterChunkSize` | `maxKeys`, fixed 128-key chunks                                                                    |
| Byte limits                                         | `maxInputBytes`, `maxOutputBytes`, per-key/value limits             | Separate `maxInputBytes`, `maxObservationBytes`, `maxSnapshotBytes`, per-key/value limits          |
| Public resource lifetime                            | Captured external lifetime plus resource-local controller/close     | Captured external lifetime; main runtime owns native drain/close                                   |
| PostgreSQL table references                         | Fixed unqualified runtime identifiers                               | Fixed `public`-qualified runtime identifiers                                                       |
| Applied expiring-condition handling before this fix | Unproven conservative preflight/deadline design                     | Final SQL-clock check before callback return, insufficient to fence later async scope/native drain |

Both variants remain physically present. `sql.ts`/`types.ts` are not imported by the current entrypoint and their APIs are not changed or adopted here. The retained original Add File contents are evidence in this conversation, not a claim that a byte-identical original entrypoint was recovered on disk. This comparison preserves the unresolved lineage instead of overwriting files to manufacture one.

## Pre-fix evidence and authorized changes

### P2: snapshot observation budget

Before this fix, `decodeRows` accumulates `textBytes(row.key) + textBytes(row.value)` across observed mutation rows and refuses `bytes > limits.maxObservationBytes`. `decodeSnapshot` validates individual values and calls `snapshot`, which applies `maxSnapshotBytes`, but lacks the independent aggregate observation check.

The authorized change adds the same key-plus-value accounting for each decoded non-null snapshot value, before inserting that row into the observation map. Missing/expired values remain absent observation rows, consistent with mutation decoding; the separate final snapshot budget still accounts for requested keys and returned values. No ceiling is merged, renamed, or relaxed.

### P1: PostgreSQL expiring-condition containment

Before this fix, the PostgreSQL path obtains `prepared = prepareMutation(...)`, returns failed conditions unchanged, performs ordered DML and physical result reads, then checks `prepared.expiry` against one fresh SQL clock before callback return. That observation cannot fence the subsequent asynchronous scope/native drain and G3 COMMIT dispatch.

The authorized containment rejects a would-apply PostgreSQL mutation with `prepared.expiry !== null` after the existing failed-condition return and before the first DML statement. `conditionExpiry` only collects original row expiries for non-null conditions; therefore null/NX conditions and positive matched conditions on persistent rows remain eligible, and positive TTLs on newly written values are not themselves prohibited. An expired original row is already logically absent at the authoritative observation. Refreshing or deleting the original owner cannot bypass the refusal. Empty-write mutations that would apply on such a fence are refused too.

The PostgreSQL final-clock block is removed rather than retained as a misleading fence. SQLite's original synchronous path and its expiry check remain untouched. Existing PostgreSQL non-expiring behavior, condition-failed results, structural APIs, and G3 failure/ambiguity propagation are retained without a new retry path.

## Verification boundary

Existing declared Drizzle 0.45.2 dependencies and installed `.all/.execute`/SQL API evidence were already read in this session. These fixes introduce no library API or dependency. No documentation/network request is needed or made during this network-prohibited reconciliation.

Only dedicated source reads and patches are permitted here. No runtime evaluation, native SQL, provider/network calls, current data/credentials/environment access, listener, Git, nested agent, test, lint, typecheck, build, install, or format command is run. The original handoff's broader claims are preserved evidence, not acceptance inherited by this reconciliation.

## Frozen result and remaining limits

Retained inventory and frozen-source comparison were recorded before code edits. The narrow source patch is applied and its affected functions were read back with the dedicated file-read tool:

- `packages/db/runtime-state.ts:102,120–121` now accumulates decoded non-null key/value bytes and refuses observations above `maxObservationBytes`, separately from the unchanged per-value and final snapshot caps.
- `packages/db/runtime-state.ts:247–253` preserves the existing failed-condition return, then rejects a prepared PostgreSQL mutation with an original expiring positive condition before entering its DML loop.
- The PostgreSQL final SQL-clock block was removed. The readback retains SQLite's original condition-expiry block at `packages/db/runtime-state.ts:215–218`.

No initialization/factory/structural API replacement, helper-variant edit/deletion/adoption, G3/runtime/Core/catalog/schema/export/manifest change, or other owner write was made. Both helper variants are preserved; no original entrypoint baseline was recreated, and complete overwritten-source lineage remains unresolved. The earlier handoff was not rewritten to hide its pre-containment claims.

These are source observations, not executed regression or whole-byte proof. No check commands or runtime evaluation ran. PostgreSQL state lease renewal/release/publication operations that depend on matched expiring positive conditions are deliberately unavailable through this backing until a separately approved native COMMIT fence exists. Non-expiring matched conditions and null/NX conditions remain on the existing path; writes with positive TTL do not imply a matched positive condition and are not prohibited by this containment. No retry or alternative SQL lane is introduced.

This reconciliation is frozen for coordinator review and deferred validation. It does not confer runtime backing, authorization, COMMIT-expiry, or security acceptance. Native drain/ambiguity constraints and all host mounting/authority decisions remain held.
