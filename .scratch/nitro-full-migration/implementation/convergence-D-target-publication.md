# D2 — retained SQLite target consumer source freeze

## Disposition and exact writes

D2 SOURCE author work is frozen in exactly:

- `packages/db/runtime.ts`
- `packages/db/runtime.spec.ts`, solely the three authorized constructor literal root fields
- This new publication report

Release was supplied after K4/Native6 source acceptance and fresh `AUTHHTTP-NATIVE6-K4-2` checks, under Oracle `ece745`'s explicit-parameter refinements. Those preceding acceptances are coordinator-provided context, not new results of this author. Before-images are recorded in `TEMP/nitro-d2-source-jq4nm_pq/source-before.json`; no new hashes were computed.

No commands, check/hash helpers, lint, build, tests, module/application evaluation, native SQL, runtime configuration/environment/data/secret access or nested agents ran. No tests, assertions, fixture imports/constants/timeouts, dependencies, comments, casts or non-null assertions were added. Existing casts remain unchanged. K4 producer, transaction gate, Native6 contracts/session/authority sources, concurrent Auth5 production-session bodies, Backend, adapters, copy, assets/schema and facades were not written. Frozen K interfaces and the installed native statement declarations were read without evaluation.

## Required packaged-root capture

Both `PersistenceConfig` engine branches now require `migrationsFolder: string`. Runtime construction reads the supplied folder property once before validation/opening, requires a nonempty absolute string, captures engine/logger, and reconstructs the private frozen engine-specific configuration. PostgreSQL connection options remain detached/frozen. There is no input spread that rereads the root getter, and no source/import-meta/cwd/env fallback or fabricated default. The obsolete runtime `fileURLToPath` import is removed; fixture URL expressions remain fixture-only.

`migrateSchemaAsync` authenticates the selected engine's complete packaged root through the actual frozen `readMainTargetBundle` from `./main-target-catalog` before either native migrator dispatch. Historical input checks and the migrator use that same captured root. Every subsequent SQLite target assertion supplies that same root to frozen `assertSqliteMainTarget`, which authenticates it again internally. Immutable host-controlled packaging remains required across the migrator's reread; this consumer adds no filesystem-replacement guarantee or bundle receipt authority.

PostgreSQL retains its original historical input and health behavior. Full root/ledger identity is not PG physical target or transaction-admission proof. Historical prefix compatibility is not current complete-target readiness or pre-append adoption provenance.

## Actual private helper contract

The private assertion now has explicit parameters, rather than mutable ambient assertion context:

```ts
assertCurrentSqliteTarget(
  current: Extract<Connection, { engine: "sqlite" }>,
  expectedPhase: PersistencePhase,
  operation: BoundedTransactionOperation,
  ownerLifetime: AbortSignal,
  timing: TargetOperationTiming,
): void;
```

`TargetOperationTiming` preserves its original monotonic `startedAt` and finite `budget`, with a private `lastObservedAt` to reject backwards/nonfinite monotonic readings. Operation/resource signals, finite wall/monotonic clocks, the smaller of absolute and original elapsed budgets, exact retained connection, expected phase and actual positive active ownership are checked privately. The assertion additionally requires that same client's actual native transaction to be active.

The owner-local adapter implements the unchanged `CopiedCatalogReader.all(query, values?)` and `iterate(query, values?)` protocols. It uses fresh uncached `prepare` statements on the retained client; only K's fixed metadata queries reach it. No reader, native handle, SQL callback, target predicate, accepted Boolean or receipt is returned or accepted through a new public API. No tokenizer/schema/SQL framework, second connection/pool or nested transaction is introduced. The generic gate's statement whitelist is unchanged.

Raw reader statements bypass the ORM logger, so their private guards execute before preparation, after preparation/before execution, after native return and after cleanup. Iteration additionally guards creation, every `next`, resumption after a yield, and early-return cleanup. Iterator return and statement finalization run even when a guard fails. All owned statements are finalized before favorable assertion return; primary and cleanup failures are retained together rather than silently replaced. Local guard-error identities distinguish cancellation/deadline/owner guard failures from genuine K/native rejection, including when iterator cleanup also fails.

Fixed unit configuration uses the existing ORM logger seam only for private operation/owner/timing checks, not SQL/parameter logging. Adoption's generator driver also checks around generator advancement/native execution. Concrete App/Board/C1 bodies and their evidence/policy inputs remain unchanged.

## Finite policy and exact placements

Only standalone post-schema, post-content and SQLite readiness observations mint a fresh private operation signal with the private `30_000` ms policy: epoch `Date.now() + 30_000`, original finite monotonic elapsed cap, captured ordinary owner lifetime, no timer/public option. This budget covers the observation, not earlier migration/initializer work. It is never refreshed per query, object, cleanup or COMMIT. Synchronous native execution is not claimed hard-preemptible.

| Placement                                      | Actual unit and publication boundary                                                                                                                                                                                                                                                                                                     |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| After SQLite schema migration                  | New synchronous bounded immediate observation on the retained client before `schema-ready`; one active count spans its actual settlement/cleanup.                                                                                                                                                                                        |
| After original initializer/custom content work | Same bounded standalone observation before `ready`, after prerequisite scoped work settles; one active count spans the observation.                                                                                                                                                                                                      |
| SQLite readiness                               | Replaces `SELECT 1` inside the existing active-count try/finally with a bounded immediate complete-target observation. The public readiness object remains diagnostics only.                                                                                                                                                             |
| Fixed Board/App                                | Assertion is first inside each existing native immediate callback, before its concrete body. Original captured/clamped operation and resource lifetime are retained; original timing guards also fence body statements and result publication. No extra active count or nested unit.                                                     |
| Adoption initialization/every batch            | Assertion precedes the original generator inside each existing immediate unit. One timing capture occurs before scheduling/drain and is retained across yields/units. Original operation/deadline and distinct retained adoption lifetime are used throughout. Settled progress is assigned only after the unit and final guards settle. |
| Adoption final publication                     | A final bounded immediate target observation uses that same original operation/timing/adoption lifetime, not a new 30-second operation or the aborted ordinary lifetime. Exact owner/phase/signals/timing are rechecked before clearing the owner, replacing ordinary lifetime or publishing ready.                                      |

Post-schema/content observations add exactly their own active increment/finally leave. Readiness and fixed writers retain their existing single count. Adoption retains its existing count across its whole drained maintenance task, including final observation. `leave` occurs only after actual native return and statement/gate cleanup. Existing maintenance/adoption task prepublication before synchronous abort, closed ordinary admission across batches/yields, close's captured task plus active-work drain, and cleanup aggregation remain intact.

## Cancellation, rejection and COMMIT classification

- Definite pre-COMMIT guard/abort/deadline failures do not become target rejection or blanket business-error quarantine. Adoption preserves prior settled progress under its same private owner for an explicit resume; there is no automatic retry or per-batch deadline renewal.
- Genuine K physical/native target rejection quarantines the resource and propagates its real error. Native iterator/statement cleanup faults quarantine while preserving primary plus cleanup failures. Unrelated App/Board/C1 business failures and ordinary PG health failures are not newly quarantined.
- Existing gate rollback/busy-timeout-restoration/cleanup quarantine is preserved. Gate COMMIT-dispatch ambiguity remains nonretryable.
- After a successful gate return, original-timing/owner/signal guards run before any unit result escapes. Any failure there is explicitly `TransactionCommitAmbiguousError`, quarantined and nonretryable, not a resumable pre-COMMIT failure. Adoption publication's final post-unit guard uses the same classification.
- Failure never yields favorable SQLite target readiness or releases failed adoption admission. Abort delivery is not physical completion; native return, statement finalization, gate cleanup and actual active/task drain remain necessary.

## Exactly three existing fixture additions

At the original source-before locations, only these fields were added; multiline literal layout does not add fixture behavior:

1. Line 318, PostgreSQL main fixture: `migrationsFolder: fileURLToPath(new URL("./migrations/postgresql", import.meta.url))`.
2. Line 440, SQLite cancellation fixture: `migrationsFolder: fileURLToPath(new URL("./migrations/sqlite", import.meta.url))`.
3. Line 520, SQLite busy/competing-connections fixture: `migrationsFolder: migrationFolder`, using its already-declared matching SQLite constant.

No earlier fixture references the later SQLite constant; PostgreSQL receives its own dialect root. Required field presence is not a fixture success, physical acceptance or production fallback.

## Preserved holds / coordinator handoff

Fresh credential ownership remains exclusively the exact retained newly created native `:memory:` resource with original empty-schema verification. File-backed adoption rejects before owner/maintenance creation; existing-resource/pre-append and restart provenance remain held. Catalog/root/ready metadata cannot mint that proof. No domain/head/evidence seed, allocation, reset or fabricated authority was added; existing four-runtime-table reset ownership is unchanged. Native6 branch-local allocator/session semantics and generic Auth session writer enforcement are not amended by this consumer.

K's runtime-meta guard still requires its unchanged two migration-inserted representations. This author neither seeds/replaces those rows nor proves them natively. Schema/currentness, domain readiness, input-prefix compatibility and provenance remain distinct.

This is the exact D2 consumer **source freeze for independent review**, not a review/check PASS. Coordinator owns subsequent checks only after both D2 and the concurrent Auth5 writer freeze and independent source review. No K-validator/PG-physical/boot/adoption/App PASS, runtime mounting/activation, writer closure, Auth HTTP publication, real restore or protected publication is asserted.

## Oracle-approved mechanical iterator followup — source freeze

After coordinator-reported acceptance of both D2 source axes, Oracle `ece745` released only the private reader iterator change in `packages/db/runtime.ts`. Added iterator-local `throwCleanupFailure` immediately after the existing `readFailed`/`cleanupErrors` declarations, capturing those same mutable values and retaining the exact condition and thrown first cleanup error. Replaced only the original explicit throw condition at the end of the existing `finally` with `throwCleanupFailure()`, still inside that `finally` after its final guard.

Primary-error priority and external iterator `return` cleanup failure propagation are preserved. No guard, iterator return, statement finalization, cleanup, quarantine, aggregation or evidence wrapper was moved or removed. Every other source line, including the three `runtime.spec.ts` root fields and gate/K/Native6/Auth5 sources, is outside this followup and unchanged by it. Accepted `01-after.ts`, pins and diff artifacts in `TEMP/nitro-d2-source-jq4nm_pq` were not overwritten.

No commands, checks/hash helpers, lint, build, tests, evaluation, native SQL, environment/configuration/data/secret access, dependencies, comments, casts or nested agents were used. The reported shared `D2-AUTHHTTP-LEGACY5-1` red result remains historical evidence: four Auth service-header type diagnostics and D378/Auth845/Auth847 lint diagnostics; this mechanical source edit does not claim that any fresh check is green.

Exact followup freeze: one iterator-local closure and one call-site replacement in `runtime.ts`, plus this appended record. Independent rereview follows; fresh shared checks wait for Auth source reviews/repairs and all writer freezes. No additional D2/native K/PG physical/adoption/App acceptance or activation is asserted.
