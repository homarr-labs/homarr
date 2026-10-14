# Remaining DB/Auth type flow: mechanical owner plan

## Disposition and authority

**PLAN ONLY; coordinator Oracle approval is required before any product author release.** This lane writes only this new report. No product file, config, frozen asset, compiler capture, runtime envelope or historical receipt was changed. No commands, checks, hashes, compilation, evaluation, tests, SQL execution, engine operations, private configuration/data access, network access or nested agents were performed. Reading checked-in migration SQL below is source inspection, not SQL execution or physical database observation.

Coordinator premises: the shared type-base change is authored and frozen; seven focused checks are active; the synthetic bootstrap reader is terminal; the current runtime-capture reviewer reads its TEMP envelope. This report neither reopens those readers nor treats their work as current product-source validation. Their outcomes are not asserted here.

Wait for the seven fresh check results before releasing a source writer. The baseline is historical, not the current diagnostic inventory. Its actual records are under `TEMP/nitro-convergence-type-baseline-yqp3yq3v/records`, where TEMP is `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode`.

## Observed contracts and causes

| Baseline diagnostic                                      | Actual source/declaration evidence                                                                                                                                                                                                                                                                                          | Owner disposition                                                                                                                                                                                                                      |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DB `runtime.ts:340`, TS18048                             | `packages/db/runtime.ts:328` permits an uninitialized cleanup iterator; assignment at :336 precedes the checked loop and `.next()` at :340. The baseline also lacks `bun:sqlite` declarations. Installed `bun-types/sqlite.d.ts:666` declares `iterate(...params): IterableIterator<ReturnType>`, not an optional iterator. | First let genuine Bun visibility repair the assignment's source type. Do not assume this diagnostic survives. If it remains on the same source, use the narrowly specified stable iterator capture below.                              |
| Auth `nitro/critical-writers/runtime.ts:66`, TS2322      | `CriticalWriterCandidateAdmission.state` at :14–18 requires `phase: CriticalWriterCandidatePhase` and `revocation: "live"                                                                                                                                                                                                   | "revoked"`; the getter at :66 returns an inferred mutable object and its conditional literals widen to `string`.                                                                                                                       | Annotate the existing getter's return with the existing indexed state type. No state/abort/dispatch change. |
| DB `test/schema.spec.ts:46–47`, TS2344                   | Both directions identify precisely `authCredentialDomain.id.hasDefault`: SQLite `true`, PostgreSQL `false`. The existing test compares selected column configuration, not merely selected row data.                                                                                                                         | Genuine engine-specific metadata difference, not evidence for adding a SQL default. A narrowly approved normalization of this single test-view attribute is sufficient; otherwise retain the diagnostic as an explicit policy blocker. |
| DB `runtime.spec.ts:1407`, implicit `any` binding `name` | The same historical log has missing `bun:test`, `bun:sqlite` and Bun globals.                                                                                                                                                                                                                                               | No test-name edit in this plan. Inspect the fresh visibility result first; any surviving diagnostic needs its own authentic binding/source investigation.                                                                              |

The current runtime cleanup at `packages/db/runtime.ts:358` is **`iterator?.return?.()`**, not a `typeof iterator?.return` guard. Do not apply a hypothetical guard repair to this observed source or conflate :340's loop receiver with a cleanup receiver diagnostic.

## Physical schema and singleton semantics

The actual builders are SQLite `int().notNull().primaryKey()` (`schema/sqlite.ts:58`) and PostgreSQL `integer().notNull().primaryKey()` (`schema/postgresql.ts:67`). Neither supplies `.default`, `$defaultFn`, identity or serial construction.

Installed Drizzle declarations explain the exact asymmetry:

- `node_modules/drizzle-orm/sqlite-core/columns/integer.d.ts:12–19` supplies `primaryKeyHasDefault: true` and returns `IsPrimaryKey<HasDefault<NotNull<this>>>`; `int` is the `integer` alias at :108.
- `node_modules/drizzle-orm/column-builder.d.ts:220–225` documents SQLite's implicit integer-primary-key allocation and conditionally adds `HasDefault` only for a builder carrying that flag.
- PostgreSQL's plain integer builder inherits the ordinary primary-key path (`pg-core/columns/integer.d.ts`, `int.common.d.ts`, `common.d.ts`). Its separate identity methods are not called here. `MakeColumnConfig` preserves the resulting `hasDefault` literal (`column-builder.d.ts:44–46`).

This ORM insertion-availability flag is not equivalent to an explicit SQL `DEFAULT`, nor to SQLite's explicit `AUTOINCREMENT` keyword. The source physical contract agrees:

- `migrations/sqlite/0050_auth_credential_evidence.sql:1–8` and `migrations/postgresql/0018_auth_credential_evidence.sql:1–9` both declare the singleton `id` as `integer PRIMARY KEY NOT NULL`, with `CHECK id = 1`, and no explicit default. SQLite has no `AUTOINCREMENT` clause; PostgreSQL has no sequence/identity/default clause.
- Terminal source snapshots agree: SQLite `0050_snapshot.json:481–490` has integer, primary key, not null, `autoincrement: false`, and no `default`; PostgreSQL `0018_snapshot.json:489–498` has integer, primary key, not null, and no `default`/identity.
- `runtime-auth-credential/statements.ts:172–187` explicitly inserts `id = 1` in the original initialization SQL. The domain is not initialized by omitting an ID or trusting an ORM-generated value. `validation.ts:89–97` rejects decoded IDs other than the exact text `"1"`. Domain-lock SQL at `runtime-auth-session/statements.ts:160–175` requires ID 1 and rejects other/NULL domain rows.
- `main-target-catalog.ts:619–625` requires explicit default-clause presence to match snapshot presence; :715–718 requires a null physical `dflt_value` when the snapshot has no default. These are existing source rules, not fresh native results. Do not change them to follow an ORM type flag.

No builder/DDL inconsistency was found in these source facts. Selected numeric ID data can legitimately match while inferred insert optionality differs across engines. The test must not advertise universal raw column-config or insert-model equivalence after normalization. Its existing Buffer and foreign-key representation normalizations establish the comparison-view pattern, but **do not constitute prior approval of a default exception**; Oracle must approve this exact new exception. If Oracle requires literal raw `hasDefault` parity, retain a named schema-test-policy blocker rather than altering production schema or SQL.

## Exact prospective product leases

There are at most three product files, with independent owner reasons. There is no joint schema/runtime authority, framework, callback helper, dependency addition or test-file creation.

### A — Auth literal annotation: one file

Lease **`packages/auth/nitro/critical-writers/runtime.ts`** only. Change only the getter signature:

```ts
get state(): CriticalWriterCandidateAdmission["state"] {
```

Keep its returned object and the original `bounded.lifetime.aborted || bounded.signal.aborted ? "revoked" : "live"` expression byte-for-byte. This reuses the actual readonly phase/revocation contract and contextually types its literals; it does not invent or widen a state union. Do not add `as const`, casts, a helper, a cached state object, new conditionals or a different abort calculation. Keep admission/execution/revoke/release/close bodies, single-use transitions, `hold`, remaining joins, lifetime association and error handling unchanged.

### B — DB loop flow: zero files if visibility clears it; otherwise one file

Conditional lease **`packages/db/runtime.ts`**, only after a fresh TS18048 is confirmed on the same loop. Replace the assignment at :336 with:

```ts
const activeIterator: IterableIterator<CopiedSqlRow> = statement.iterate(
  ...values,
);
iterator = activeIterator;
```

Change only that loop's step expression to:

```ts
const step = activeIterator.next();
```

The genuine declaration supplies a nonoptional iterator. The const is the same iterator identity already assigned for cleanup, not an invented fallback or a skipped read. Acquisition remains inside the same `try`, between the same checks; cleanup receives the acquired iterator before the next check can throw. If acquisition throws, the cleanup binding remains undefined exactly as before. Preserve every check, loop/yield/done branch, operation budget, guard-failure distinction, error collection, quarantine, cleanup order and `throwCleanupFailure` rule. Never substitute `iterator?.next()`, `continue`, a presence-return bypass, a default iterator, a non-null assertion or a cast.

Leave **`iterator?.return?.()` unchanged**. It keeps its receiver and optional-call failure behavior; a `typeof` replacement could silently skip a noncallable return property that the current optional call would reject. Do not extract and invoke a return method unbound. If the coordinator supplies a different, freshly captured body whose original cleanup is `typeof iterator?.return === "function"`, that is a new source premise requiring renewed Oracle review: genuine receiver presence must be proved, and any extracted callable must be invoked with its original iterator receiver using `.call(receiver)`. This plan does not authorize that different cleanup cut or its altered failure semantics.

### C — Existing DB schema comparison view: one file, policy approval required

Lease **`packages/db/test/schema.spec.ts`** only. In the existing `FixedSqliteConfig` property mapping, replace only the mapped property's value type with this exact, single-cell rule:

```ts
[property in Exclude<keyof SqliteConfig[key][column], "dataType" | "data">]:
  [key, column, property] extends ["authCredentialDomain", "id", "hasDefault"]
    ? SqliteConfig[key][column][property] extends true
      ? false
      : "Unexpected SQLite INTEGER PRIMARY KEY hasDefault"
    : SqliteConfig[key][column][property];
```

This canonicalizes only the known SQLite implicit integer-primary-key flag to the PostgreSQL/no-explicit-default comparison literal. The unexpected-raw-flag marker ensures a changed SQLite raw flag does not also silently pass as canonical false. PostgreSQL's actual value remains unmodified, so changing it to true still fails both existing equalities. No production type is changed or weakened to `boolean`; no global `hasDefault` omission is introduced.

Keep the existing test registration, both selected-row-model comparisons, both column-config comparisons, Buffer treatment, all remaining property keys and runtime uniqueness/PK/FK assertions unchanged. No new test, test runner invocation, runtime fixture or callback is needed. Do not add casts, `any`, suppressions, non-null assertions, comments or new exclusions; the file's pre-existing unrelated constructs are not cleanup scope.

This comparison cannot distinguish an explicit SQLite default newly added to the same integer-PK builder from its existing implicit `hasDefault: true`. It is not physical-default proof. Approval is bounded to the inspected unchanged builders and the existing no-explicit-default physical policy above; any builder/SQL/default provenance change reopens that policy review. Never silently add `.default(1)`, `$defaultFn`, default SQL, serial/identity, or mutate canonical catalog/snapshot/journal/pins to force PASS. A discovered genuine builder/SQL mismatch is a blocker for its schema owner, not a repair under this lease.

## Release sequence and future focused validation

1. Coordinator collects the already-active seven visibility checks, with their new source/config association. Preserve their receipts and the older baseline. Partition surviving diagnostics by owner before releasing A/B/C. B is omitted if its diagnostic vanished; omit any other no-longer-needed cut rather than spending its lease speculatively.
2. Independent coordinator Oracle reviews the exact conditional file set, iterator receiver/cleanup argument and single-cell schema policy. Only explicit approval releases the corresponding writer. Product author captures the exact approved before-image and returns its exact delta/freeze; this report is not that capture.
3. After writer freeze and independent source review, coordinator runs existing compiler-only full-workspace checks for **DB and Auth**. Retain all existing compiler roots, including `runtime.spec.ts` and `test/schema.spec.ts`; no temporary pruned program, ambient stub, config relaxation or diagnostic suppression. Auth is an additional required closure check, not one of the seven visibility sentinels.
4. Reuse the baseline invocation shape, with coordinator-owned clean environment/receipt allocation and the installed compiler, once per named workspace:

```text
/Users/ajnart/.local/share/mise/installs/bun/1.4.2/bin/bun --no-env-file run <checkout>/node_modules/typescript/bin/tsc --noEmit --incremental false --pretty false -p <checkout>/<workspace>/tsconfig.json
```

Use each workspace's original cwd. The required affected programs are `packages/db` and `packages/auth`. Reassociate/recheck the existing seven sentinels as needed for the now-changed imported closure: `packages/core`, `packages/ui`, `packages/db`, `packages/boards`, `packages/custom-widgets`, `apps/backend`, `apps/nitro`. An earlier active result that predates product edits cannot become a post-edit closure result merely because the config is the same. 5. Run installed existing oxlint on **only the actually released product paths**, from the unchanged repository lint-policy cwd, retaining genuine policy and a fresh receipt:

```text
/Users/ajnart/.local/share/mise/installs/bun/1.4.2/bin/bun --no-env-file run <checkout>/node_modules/oxlint/bin/oxlint <absolute leased product paths>
```

The installed manifest names this executable `bin/oxlint`; existing DB/Auth lint scripts are `oxlint`. Do not use the broad root Turbo lint/test/build pipeline for this mechanical cut. Required successful lint expectation is exit 0 with no introduced diagnostics; retain unrelated existing warnings rather than churning them. Existing formatter verification, if coordinator requires it, is separately captured and scoped to these paths. 6. Expected **conditional** result: the :340 iterator diagnostic, Auth state-widening diagnostic, and both singleton-default comparison diagnostics disappear; no missing Bun declarations/globals remain from the separately implemented visibility repair; no new cleanup, library or ambient regressions appear. DB/Auth exit 0 is required if these exhaust their fresh errors, not claimed in advance. A remaining `name` binding diagnostic or newly exposed source error stays red with its authentic owner; do not disguise it with annotations before seeing the focused result. Remaining API/UI/consumer reds retain their own owners, and seven focused successes cannot certify the whole baseline or entire migration green.

No unit/E2E tests, application/fixture execution, SQL/native checks, real restore, package installation, engine/context operations or broad compiler/build attempt is authorized by this report. Future checks above are coordinator gates, not actions performed by this read-only lane.

## Provenance and acceptance limits

Existing K/D source acceptance and historical compiler/native captures continue to describe their original bytes and original bounds/ambiguity/physical-settlement semantics. A changes type-only source bytes; C changes only a test comparison type; B, if needed, introduces a local capture while preserving the same native call/receiver/control behavior. Type erasure or equivalent behavior does not establish exact source identity.

The coordinator must preserve original before-images, retain separately associated after-source/check evidence, and bind any future compiler output to the actual new source/config/import closure. No fifth-artifact relabeling, historical output replacement, forced success, regenerated frozen asset or inherited current-source/native PASS follows. No K/D target/provenance, critical-writer hold, ambiguity/retry, bootstrap, publication or runtime activation condition is relaxed. A source approval and green focused lint/typecheck remain static evidence only.
