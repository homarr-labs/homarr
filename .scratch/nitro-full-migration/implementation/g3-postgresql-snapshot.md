# G3 — fixed-purpose bounded PostgreSQL snapshot

**Source implementation COMPLETE/FROZEN for independent producer review.** Only `packages/db/runtime.ts`, `packages/db/transaction-gate.ts` and this handoff were edited. No commands or executable validation were run. This does not accept jobs consumers, native snapshot behavior or full-runtime readiness.

## Additive public interface

The existing `PersistenceRuntime` producer adds:

```ts
boundedSnapshotAsync<T>(
  operation: BoundedTransactionOperation,
  callback: (database: HomarrDatabasePostgresql) => Promise<T>,
): Promise<T>
```

`BoundedTransactionOperation` is unchanged: request signal, backing lifetime and finite absolute deadline. The callback receives the existing typed scoped PostgreSQL database, not a pool/client/session/control handle. No public isolation/mode, BEGIN text, raw-client or SQL-control argument was added.

The method requires the existing ready, non-quarantined resource and rejects SQLite before admission/checkouts. It increments the existing active counter, passes the same shared configuration, resource lifetime and quarantine owner to the gate, awaits complete settlement, and leaves admission in the existing `finally`. Maintenance and close therefore track this operation through the same lifetime/idle-drain path as bounded writes.

## One shared G3 ownership implementation

The existing PostgreSQL bounded body was moved under the private `createBoundedPostgresTransaction` factory. Its private selector can only be one of two resource-owned constants:

- Ordinary `boundedPostgresTransactionAsync`: exact `BEGIN`.
- New internal `boundedPostgresSnapshotAsync`: exact `BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY`.

Each exported gate entrypoint is the async function returned by that same factory; there is no extra async wrapper, separate transaction implementation or ordinary Drizzle transaction delegation. The callback/operation arguments cannot select or replace the BEGIN statement. The gate helper remains an internal relative import of the runtime; no package manifest/export change was made.

The only executable change within the existing PostgreSQL ownership body is replacing the literal `client.query("BEGIN")` argument with the private selected constant. All other G3 statements and ordering remain in the one shared body, including:

- Wall-clock plus monotonic remaining budget, three lifetime/signal checks, finite deadline validation and remaining transaction-local lock/statement timeouts.
- Awaited native checkout retained in runtime admission. A cancellation/deadline observed after late checkout is checked before BEGIN; no detached acquisition, naked timeout race or retry was introduced.
- Error listener/client-side `query_timeout` refusal, pre-BEGIN check, `beginAttempted`, native BEGIN completion, `begun`, and post-BEGIN check. BEGIN failure keeps the existing eviction path.
- Guarded native statement queue, underlying scoped execution failure capture, first-failure retention, scope revocation and actual scope/queue drain, including caught/recovered callback failures.
- Existing final failure check and gate immediately before actual COMMIT dispatch, dispatch flag, native COMMIT await and postcommit check. Read-only does not skip COMMIT or ambiguity handling.
- Existing rollback, end/eviction, listener removal, release/eviction fallback, cleanup-error aggregation, resource quarantine and `TransactionCommitAmbiguousError` classification.

The scope still opts into the existing Core `onFailure` observation exactly as before. No Core behavior or execution facade was edited. Nested savepoint/transaction-control classification and all existing callback lifetime rules are unchanged. PostgreSQL is requested to enforce native read-only semantics; no guessed JavaScript read-only/write simulator was substituted. The API is not an authorization or arbitrary-callback side-effect sandbox.

## Ordinary path and SQLite preservation

`boundedTransactionAsync` retains its original public signature, ready/engine guard, active admission, configuration/lifetime/quarantine arguments and finally-leave behavior. Its gate entrypoint selects the exact old plain BEGIN constant; no isolation/access-mode/default/deferrable override, extra SET TRANSACTION, pool setting or new SQL was added to bounded writes.

The transaction-gate changes are limited to two private constants, the private factory wrapping the existing PostgreSQL body, its BEGIN argument, and the two fixed entrypoint definitions. That body is reindented under the factory; this is source preservation of lifecycle logic, not a byte-identical whole-file claim or behavioral proof. Runtime changes are limited to the gate import expansion and the new method. The existing ordinary `transactionAsync` was not used as a snapshot shortcut or changed.

SQLite's bounded transaction implementation, synchronous runtime API and busy-timeout restoration are untouched. The new method rejects SQLite; it does not change SQLite modes, PRAGMAs or globals. Existing jobs SQLite snapshot composition remains for its owner. No jobs/state/history consumer was read or rewritten; PostgreSQL positive-expiring-condition mutation refusal is unrelated and remains intact.

## Scoped before evidence and API provenance

Both leased source files were read in full before editing; their original source is retained in this session's read record. Existing historical before digests are available in the previously retained P2 preservation manifest:

`/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/stage-p2-catalog-EBJvL2/preservation-before.json`

| Historical source anchor          | Retained pre-edit digest                                           |
| --------------------------------- | ------------------------------------------------------------------ |
| `packages/db/runtime.ts`          | `07d93bba2965428d88a0255f2e4f38bad4ee193974a41ba87b3e9f5e9f86e630` |
| `packages/db/transaction-gate.ts` | `745d2f5e81c396d744f40307c8683d60226068c2c763fbb3cba49a1d4d17fd8e` |

These are retained historical anchors, **not newly computed current hashes**. No new filesystem-copy/hash command, graph capture, Git diff or automated preservation comparison was run under this command-free lease. Post-edit source inspection confirmed the fixed constants, unchanged ordinary runtime method and shared G3 lifecycle body; fresh whole-file byte/delta proof remains a later authorized review/validation task.

DB already declares Drizzle and pg. Installed package metadata is Drizzle ORM `0.45.2` and pg `8.22.0`. Installed pg pool/query/release declarations, Drizzle PostgreSQL transaction config declarations and `getTransactionConfigSQL` implementation were read; they provide the `repeatable read` and `read only` syntax used in the fixed BEGIN. The installed ordinary NodePgSession transaction was also inspected as evidence of why it is not an acceptable ownership substitute: checkout/BEGIN precede its cleanup try and its commit is not this G3 fence. No new library/API, dependency/install, cast, `any`, comment or test was introduced. Existing casts remain unchanged.

## Remaining holds

No commands/checks, lint/typecheck/build/install/format/tests, runtime/SQL evaluation, browser/network/provider/environment/credential/current-data access, Git or nested agent was performed. Core/driver/schema/catalog/P3/copied sources, state/history/jobs consumers, manifests and tests remain outside this lease and were not edited. No peer graph/currentness capture was undertaken.

Independent producer source review precedes a separately authorized jobs consumer rewrite. Analytics thirty-statement and icon two-read batching/joins remain unimplemented here. No consumer fallback was weakened or snapshot HOLD cleared by this producer change alone.

Required later proof includes compiler/lint and relevant existing G3 regressions plus real PostgreSQL repeatable multi-statement observations under competing commits, native permanent-write rejection, caught/detached failure capture, late checkout cancellation without BEGIN, BEGIN failure release/eviction, queued cancellation/deadline behavior, actual COMMIT fence/ambiguity, cleanup faults/quarantine and tracked close. SQLite regression/parity, producer-consumer types, batching, packaged currentness and whole-runtime integrated proof remain outstanding. No new tests were requested or created in this source phase.

Read-only does not make native I/O interruptible, hard-bound checkout/drain duration, eliminate already-dispatched COMMIT ambiguity or repair unrelated expiring-condition mutation semantics. This is a frozen source producer delta, not a new full/native pass or target/restore acceptance.
