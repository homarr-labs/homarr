# EXPANSION-35 — Media SQL source freeze

Source-only paired mutation algorithms are implemented. **EXECUTION remains unconditional HOLD**, not merely API mounting HOLD. This handoff does not accept a runtime graph, register procedures, change a conservation count or complete #113/#115.

## Exclusive delta

- `packages/db/runtime-media.ts`
- `packages/db/runtime-media/contracts.ts`
- `packages/db/runtime-media/sql.ts`
- `packages/db/runtime-media/mutations.ts`
- This handoff.

Frozen G3/runtime/gate, P1 assets, P2/copied engine, physical schemas/migrations, Auth, API, media/icon sources, peer backings, shared declarations and lockfiles were not changed. Mutable peer implementations were not consumed. Read the expansion common contract, accepted G3/runtime and P1 handoffs, MEDIA-ATOMIC-PLAN, AUTHORITY-COMMIT-PLAN, frozen source preparation/deletion helpers, original media mutation and local-icon mapping, and existing schema bindings.

## Actual boundary

`createMediaSqlRuntime(runtime, source)` returns only:

```ts
uploadMediaAsync(operation: BoundedTransactionOperation, rows: readonly PreparedMediaUploadRow[]): Promise<string[]>;
deleteMediaAsync(operation: BoundedTransactionOperation, selection: MediaDeleteSelection): Promise<void>;
```

Both methods first call the unconditional throwing `requireMediaSqlExecution()`. Every invocation rejects with `MediaSqlExecutionHeldError`, code `MEDIA_SQL_EXECUTION_HELD`, before examining inputs/operation properties, invoking source helpers, allocating IDs, admitting a runtime operation or executing SQL. Construction only retains its two arguments. There is no readiness callback, boolean permit, activation flag, caller SQL/transaction-body port, authority assertion or exported ungated mutation function. The concrete execution routines are module-private. Internal exported SQL helpers construct fixed statements; they do not execute them.

`MediaLocalIconSource` is a structural source-helper binding, **not authority**. Future composition must pass the three exact frozen exports from `@homarr/icons/local`: `mapMediaToIcon`, `createLocalImageUrl`, `LOCAL_ICON_REPOSITORY_SLUG`. It must verify that concrete identity/graph; a structurally matching substitute is not certified. This keeps the DB package from importing undeclared Icons or depending on API/Auth application internals. No source MD5/URL helper was duplicated. `createId` is the existing declared `@homarr/common/id` public export.

Prepared uploads contain already-authenticated creator IDs and source media IDs, original Buffer bytes, literal names/MIME/size. The adapter does not originate authentication or validate FormData/File. A delete selection is the exact ID/nullable creator previously read and authorized using the frozen API helper; **a supplied selection is not an authorization proof**. These structural inputs are unusable while the unconditional HOLD remains.

## Implemented private algorithms

### Entire upload invocation

1. Reject an empty group without a transaction, preserving `values() must be called with at least one value` rather than successful `[]`.
2. Snapshot the original row fields and copy Buffer bytes without transforms. Invoke the actual mapped-icon source helper for checksum/name/URL before entering SQL. No hashing, body reads or asynchronous preparation occurs inside SQLite.
3. Enter one existing-runtime G3 bounded transaction. Execute one parameter-bound group INSERT into the existing `media` columns, omitting `created_at`, and require exactly N native affected rows.
4. Query `iconRepository` by the literal source local slug with `LIMIT 1` and no ordering. PostgreSQL adds `FOR SHARE`. No selected row is the media-only branch. An empty repository ID, if physically present, remains a selected ID, not absence.
5. Only in the selected branch, allocate independent source CUID2 icon IDs in input order, retaining every allocated ID in operation-local evidence. Insert the whole mapped icon group against that exact repository and require exactly N native affected rows. No fallback after branch failure, alternative repository, repository creation, upsert, deduplication, name truncation or uniqueness repair.
6. Return source media IDs in input order only after the runtime returns successful settlement.

There is no chunking/new count or request-total policy. Engine parameter/column constraints reject through the existing native transaction; no per-file commit or cross-engine name limit is invented. PostgreSQL icon-name constraints remain stricter than its media-name column, so an icon constraint failure must roll back the earlier media group.

### One selected deletion

1. Snapshot the exact selection, retaining nullable creator, and derive its exact source local URL outside SQL. Do not normalize IDs.
2. Read exact `media.id`/`creator_id` inside the same transaction, adding PostgreSQL `FOR UPDATE`. Validate native row shape and reconfirm exact identity and null-safe creator equality. Missing becomes private `MEDIA_NOT_FOUND` with source message `Media not found`; changed creator becomes `MEDIA_CREATOR_CHANGED`, not implicit reauthorization or success.
3. DELETE the exact media identity with a creator CAS and require exactly one affected row. SQLite uses the source equality-or-both-null predicate. PostgreSQL uses equivalent `IS NOT DISTINCT FROM`, allowing parameter typing from the column rather than introducing an untyped parameter used only by `IS NULL`.
4. DELETE **all** `icon` rows whose URL equals the exact source URL. Require a valid nonnegative native affected count, but allow zero through many. No repository/slug restriction, LIKE/prefix match, checksum sibling cleanup, repository delete or surviving-media URL rebind.
5. Preserve the source void success result only after runtime settlement.

Both routines reuse `boundedTransactionSync`/`boundedTransactionAsync`, not ordinary transactions or new native handles/pools. Accepted G3 owns SQLite BEGIN IMMEDIATE, synchronous callback/COMMIT/ROLLBACK and PostgreSQL existing-pool checkout, BEGIN, drain, native COMMIT/ROLLBACK, awaited release/eviction/quarantine. Every PostgreSQL feature statement is explicitly awaited on its guarded transaction. SQLite feature bodies use only synchronous `.run()` and `.all()`. A feature SQL/count/CAS/decoder error escapes the callback and invokes G3 whole-unit rollback/cleanup; no error is swallowed to allow COMMIT.

## Outcome conservation

Private `MediaSqlMutationError` keeps the native cause and a discriminated outcome:

- `ambiguous` when G3 returns `TransactionCommitAmbiguousError`, including its conservative classification of a successful native COMMIT followed by cleanup failure.
- `commit-not-dispatched` for other failures from the exact frozen bounded runtime. This **does not claim successful rollback or successful resource cleanup**; native cleanup causes remain retained.

Both forbid automatic retry. Upload evidence retains original media IDs/bytes/metadata plus unobserved/absent/selected repository state and every allocated icon ID/field. Delete evidence retains exact selected identity/nullable creator/URL. Evidence/cause are server-private, not error-response/log DTOs; future API mapping must never serialize them or echo raw native causes. There is no new journal, retry token, reconciliation write, ID regeneration or compensating delete.

This lane does not implement reconciliation reads or post-durability effects. Future owner-held consistent reads may examine these exact witnesses; delete absence alone cannot prove the committing actor. Lost process-local receipt can remain unknown. The adapter publishes no invalidation/notification before durability and does not relabel a later response/effect failure as rolled back.

## Critical binding HOLD — cannot be cleared by source completion

The private callbacks currently contain media SQL only. They **do not** lock/revalidate actor, actual credential witness, memberships/group parents/grants, source demo mode or authority expiry. G3 covers owned cancellation/lifetime/deadline/native dispatch, not those facts. Passing a principal, permission array, ordinary runtime, source-helper object or earlier successful read cannot clear this missing join.

Before any execution, a separately accepted owner join must acquire/revalidate authentic authority **inside these same native transactions before the first media write**, preserve its locks through root COMMIT, coordinate effective validity/deadline and real pinned mode/storage lifetime at actual dispatch, and cover **every compatible enabled authority and local-icon writer**. PostgreSQL requires accepted parent-lock ordering/current isolation; SQLite requires synchronous locked reads after BEGIN IMMEDIATE. Legacy icon/all-source sync stays unmounted unless its own transaction-time reference/CAS/writer protocol is accepted. An authority callback after preparation or a ready callback returning true is specifically insufficient. Q16's genuine reader and host body/resource admission remain independent holds.

The unconditional gate must not simply be removed on acceptance of another module's structural interface. Sequential composition requires exact authority/writer/source/error/outcome joins and independent real native/race/rollback proof under a new explicit allocation. Frozen Auth/API/G3 are not reopened by this handoff.

## Coordinator declarations / deferred validation

No new dependency is necessary in DB: it already declares Drizzle, Common, pg and native SQLite support. If a reviewed package entrypoint is later warranted, coordinator alone may add `"./runtime-media": "./runtime-media.ts"` to `packages/db/package.json`; no such export was written. The coordinator-owned consumer must bind the already-existing declared Icons source entrypoint and source API preparation/deletion predicates. That declaration/binding is not activation or actor provenance.

Context7 resolution was attempted and returned `Monthly quota reached`. API references were then read from installed Drizzle 0.45.2 SQL/declarations/Bun-SQLite/node-postgres implementations, installed pg Buffer binding source and the existing Common/CUID2 public declaration. Raw Bun `.get()` returns positional data for unselected fields; this implementation deliberately uses `.all()` for object-shaped rows. Buffer is explicitly bound as a SQL parameter, preserving native BLOB/bytea handling rather than converting it to text/base64/JSON.

**Not run:** native SQL, lint, typecheck, tests, build, install, format commands or new tests. No credentials, environment/current data, providers, listeners, browser/containers, Git operations or nested agents were accessed. Source inspection and scoped patch writes only. Final lint/typecheck and narrowly approved existing native/rollback/authority-race checks are mandatory after source freeze and sequential integration; this return supplies no compiler, live engine, acceptance or mounting evidence.
