# SQL jobs acceleration — source freeze

## Owned implementation

New files only:

- `packages/db/runtime-jobs.ts`
- `packages/db/runtime-jobs/compiler.ts`
- `packages/db/runtime-jobs/types.ts`
- This handoff.

`createRuntimeJobsSqlPort({ runtime, epoch, lifetime, limits })` captures the existing main `PersistenceRuntime`, its dialect, an initialized epoch, the host backing lifetime, and explicit positive admission/operation/statement/parameter/result limits. State remains the sole epoch initializer. No ambient database, separate pool, schema change, domain import, scheduler, provider, token, listener, or import-time initialization is introduced.

The returned structural interface matches frozen `packages/cron-jobs/src/sql.ts`'s `JobsSqlPort`: `dialect`, `queryAsync(statement)`, and `executeTransactionAsync(statements)`. It adds `querySnapshotAsync(statements): Promise<readonly (readonly Record<string, unknown>[])[]>`. No consumer or package export was changed; package subpath publication and consumer structural validation are coordinator joins.

## Source behavior and binding

The compiler recognizes the exact frozen cron configuration upsert/patch variants, server-setting reads and serialized-value CAS, analytics counts/groupings, repository/icon reads, ordered icon deletion/insertion batches, and parameterized provider-session deletion with `RETURNING`. Domain codecs, five-attempt settings CAS, defaults, icon planning, downloads, analytics delivery, provider selection, and status ownership remain outside DB.

Lexical scanning distinguishes dialect placeholders from quoted identifiers, doubled-quote string literals, PostgreSQL dollar-quoted literals, line comments, and block comments. PostgreSQL numbered slots can repeat or appear out of order; every supplied slot must be used and every reference bound. SQLite accepts bare sequential `?`, not numbered/named variants. Wrong-dialect, malformed, missing, unused, multi-statement, unterminated, unsupported, and non-source grammar is rejected. Nested SQLite comments and backslash quote escapes are intentionally unsupported. A terminal semicolon is accepted only when followed by whitespace.

Comments are discarded. Identifiers must belong to the closed source catalog. SQL emission reconstructs grammar using fixed keyword/symbol constants and validated `sql.identifier` chunks; placeholders and supported literal values become bound chunks. `sql.raw` receives only internal constant-map values, never caller SQL slices or parameter contents. Repeated PostgreSQL slots are re-emitted as separate native bindings carrying the same captured value. Expanded binding counts and bound-value bytes are accounted for before native admission.

`queryAsync` preserves native named rows, including DML `RETURNING`. `executeTransactionAsync` executes sequentially in one transaction and returns one native `changes` (SQLite) or `rowCount` (PostgreSQL) count per statement in original order. The initial icon deletion count is not synthesized from row length. Invalid native metadata, SQL failure, cancellation, and limit failures inside a writer transaction reject and roll back before the accepted commit gate; dispatched-COMMIT ambiguity propagates unchanged and is never retried.

## Native ownership and lifetime

All single queries and effect batches use the frozen G3 `boundedTransactionSync`/`boundedTransactionAsync` ports. PostgreSQL locks epoch row 1 `FOR SHARE` before source statements. SQLite uses synchronous native `.all`/`.run` executions only, under G3's native `BEGIN IMMEDIATE`, zero busy-timeout scope, restoration, final commit fence, and quarantine semantics. The operation budget includes compilation and uses both host wall time and monotonic elapsed time; the remaining budget is handed to G3 immediately before admission. Every dispatched statement is awaited (PostgreSQL) or synchronously completed (SQLite), with checks after waits. Pending admissions are rejected at the configured cap rather than accumulated in a new queue.

SQLite snapshot batches also use G3 synchronously and execute SELECTs only. They therefore take the conservative `BEGIN IMMEDIATE` admission lock, not a deferred-reader optimization. PostgreSQL snapshot batches use the main runtime's tracked database scope and Drizzle's real single-checkout transaction with `isolationLevel: "repeatable read"` and `accessMode: "read only"`. The epoch SELECT and every batch SELECT share that snapshot; no row lock or `FOR UPDATE` is requested. Transaction-local statement/lock timeouts are recomputed from the remaining budget and all execution/transaction promises are awaited.

Successful result rows are detached primitive records. Row/byte limits reject rather than truncate; they are checked after native materialization and do not claim a streaming-driver memory ceiling. The constructor lifetime is the only consumer-provided signal: the frozen jobs methods do not carry per-run cancellation, and this port does not invent it. Native settlement, not a racing timer rejection, owns admission release.

## Holds before mounting

1. **PostgreSQL read-only transaction lifecycle remains HOLD.** The frozen bounded G3 port has no isolation/access-mode configuration and rejects `SET TRANSACTION`; it cannot honestly host the repeatable-read read-only branch. The existing ordinary Drizzle transaction has the known checkout/BEGIN-before-cleanup-try limitation in `node-postgres/session.js:180–194`. Cancellation while awaiting checkout cannot currently prevent its subsequent read-only BEGIN, BEGIN failure can leak checkout, and its native read-only COMMIT is not G3-fenced. This branch is a genuine tracked native snapshot implementation, not acceptance of those lifecycle gaps. Do not mount PostgreSQL snapshot consumption until the runtime owner releases and reviews a configured bounded snapshot/transaction seam. No frozen runtime, gate, Core driver, or shared client was modified to hide this gap.
2. Frozen jobs consumers still issue independent `Promise.all(queryAsync(...))` calls for analytics and repository reads. Those calls are not made consistent by implementing the port. The newly allocated jobs owner must assemble the existing 30 analytics statements and two icon-read statements into concrete snapshot batches, retaining existing decoding outside SQL ownership.
3. Host admission limits, initialized epoch supply, maintenance lifetime abort/drain/rebind, package exports, and production assembly require coordinator acceptance. No implicit defaults or mounting approval is supplied here.
4. Native compiler/binding corpus, disposable SQLite batch rollback/effect/snapshot/contention cases, and isolated PostgreSQL checkout/BEGIN/rollback/release/cancellation/repeatable-read proof are deferred. G3's prior proof is not new jobs proof. Per-run cancellation and provider/auth policy remain separate held decisions.

## Static evidence and unchanged boundaries

Declared dependencies and installed Drizzle 0.45.2 / pg 8.22.0 source/types were inspected, including SQL chunks, SQLite named `.all` versus array `.get`, native `.run().changes`, PostgreSQL `.rows/.rowCount`, and transaction configuration. Context7 was attempted once and returned its monthly quota error; no install or substitute dependency was used.

Owned-file oxlint and scoped TypeScript checks passed with zero diagnostics. An initial compiler-API invocation was unavailable because installed TypeScript 7 exposes its version rather than the old root compiler API; the actual scoped `tsc` invocation passed instead. No tests, build, format, SQL execution, providers, credentials/environment inspection, listeners, containers, Git operations, nested agents, existing consumers, manifests, locks, exports, migrations, or mutable peer backings were used or changed. Full integrated/user validation remains deferred.
