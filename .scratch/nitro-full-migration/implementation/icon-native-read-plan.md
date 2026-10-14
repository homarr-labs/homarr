# Icons fixed native reads — exact Oracle prerequisite allocation

## Decision NOW

**Propose one new feature-owned source file, `packages/icons/src/native-read.ts`, plus one new source handoff, `implementation/icon-native-read-source.md`. No existing DB/runtime/type/gate amendment is needed for these read shapes.** This is an exact source allocation request, not implementation permission or native acceptance. Both proposed paths were globbed absent. This report's destination was absent on initial discovery and again immediately before writing.

Use the actual full `PersistenceRuntime` captured from the main resource, its existing SQLite `boundedTransactionSync` and PostgreSQL `boundedSnapshotAsync`, and fixed Icons-only SELECTs. Do not extend `runtime-jobs`, expose a SQL executor, allocate another pool, or adapt the historical tRPC/ambient Jobs callers. The missing capability is bounded, detached Icons results and a coherent fixed-query group, not a missing PostgreSQL snapshot primitive.

Ownership basis: current `ROSTER.md:58–120`, latest progress checkpoint and the entire `implementation/icon-consumer-prerequisites.md`. Old broad DB/Persistence leases are closed. Authority source/topic and active F/M implementations were not investigated or allocated. Shared runtime reads were limited to locating its existing read APIs/lifecycle; unrelated operations in those files confer no join approval. Stay in `rework-hono`; no branch/worktree command was used.

## 1. Actual reusable producer and binary boundary

Current `packages/db/runtime.ts:318–375` exposes:

```ts
boundedTransactionSync<T>(
  operation: BoundedTransactionOperation,
  callback: (database: HomarrDatabase) => T,
): T

boundedTransactionAsync<T>(
  operation: BoundedTransactionOperation,
  callback: (database: HomarrDatabasePostgresql) => Promise<T>,
): Promise<T>

boundedSnapshotAsync<T>(
  operation: BoundedTransactionOperation,
  callback: (database: HomarrDatabasePostgresql) => Promise<T>,
): Promise<T>
```

`BoundedTransactionOperation` is exactly `{ signal: AbortSignal; lifetime: AbortSignal; deadlineAt: number }` (`transaction-gate.ts:19–23`). `PersistenceRuntime` is `ReturnType<typeof createPersistenceRuntime>`, has `engine`, and checks its privately owned ready/non-quarantined resource. It tracks admission through native settlement before `leave()`. Maintenance/close abort its separate resource lifetime and await tracked admissions.

- SQLite: `HomarrDatabase = BaseSQLiteDatabase<"sync", Changes, typeof sqliteSchema>`; `database.all<unknown>(query)` is synchronous. The existing gate uses `BEGIN IMMEDIATE`, refuses nested native transactions and async/thenable bodies, observes execution failures, checks remaining budget, owns actual COMMIT/rollback/timeout restoration/quarantine. Reuse that path unchanged; do not introduce a read-only SQLite mode, additional PRAGMA or async SQLite transaction.
- PostgreSQL: `HomarrDatabasePostgresql = NodePgDatabase<typeof pgSchema>`; `await database.execute(query)` yields rows. `boundedSnapshotAsync` selects the resource-owned constant `BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY`. Reuse its existing checkout, pre-BEGIN late-cancellation check, guarded queue/timeouts, scope failure capture/revoke/drain, actual COMMIT fence, ambiguity and cleanup/eviction/quarantine. Ordinary `boundedTransactionAsync` remains plain BEGIN and is not the read-group choice.
- `createDatabaseScope` in Core `scope.ts:120–129` passes Dates, ArrayBuffers and typed-array views through; `:138–185` detaches arrays/records and PostgreSQL row containers. Consequently binary results are **supported**, but an underlying Buffer/view is not copied or byte-budgeted there. The feature reader must validate and copy its admitted binary bytes before leaving the native callback. No Core amendment is needed or proposed.
- Neither `runAsync`/`withDatabaseAsync` nor a ready boolean is a bounded snapshot substitute. No raw `$client`, session, pool, callback-supplied readiness/authority or native-control text is exposed by the proposed Icons producer.

The existing scalar Jobs reader (`runtime-jobs.ts:97–119`) rejects non-null values other than strings/booleans/numbers. Its compiler also lacks the LIKE/EXISTS/media projection/window/UNION vocabulary used below. Its constructor-captured operation lifetime is not a per-request signal. Its ordered snapshot composition is useful precedent, **not** an Icons execution port; compiler/types/reader stay frozen.

### Existing media readers are not the missing native primitive

`runtime-media.ts` exports held mutation algorithms/evidence, not a byte-capable read scope. `runtime-media/sql.ts` has fixed identity/local-repository reads for those mutations, not `readLocalIconMediasAsync`'s payload projection.

`api/src/media-runtime/binary.ts:40–65` is the real anonymous binary algorithm over `MediaBinaryReadLease { db, assertCurrentAsync, releaseAsync }`. It reads `content/contentType` through `lease.db.query.medias.findFirst`; the concrete bounded producer is not supplied there. `response.ts:51–75` copies bytes, optionally sanitizes SVG, and computes the response ETag. It is not a reusable bounded native all-media reader. Leave its Buffer contract, sanitization, SHA256/base64url, headers, 404/304 and held executable descriptor untouched.

## 2. Fixed trusted SELECT catalogue — exact source inputs

The source's `IconReadScope` is exactly `{ dialect: "sqlite" | "postgresql"; queryAsync(statement: IconSqlStatement): Promise<readonly Record<string, unknown>[]> }`; `IconSqlStatement` has `sql: string` and scalar `parameters: readonly (string | number | boolean | null)[]`. **This shape does not authorize executing its SQL string.** The new file matches only the exact finite source strings/parameter shapes below, then constructs its own private Drizzle SQL from trusted literals and bound values. Unknown text, another dialect's marker, changed projections, wrong parameters, added control/SQL or a later query group rejects. No token grammar/general SQL adapter is added.

### A. Name lookup (`auto-icon-searcher.ts:4–20`)

```sql
SELECT i."id", i."name", i."url", i."checksum", i."icon_repository_id" FROM "icon" i INNER JOIN "iconRepository" r ON r."id" = i."icon_repository_id" WHERE i."name" LIKE ? AND (r."slug" <> 'local' OR EXISTS (SELECT 1 FROM "media" m WHERE i."url" = '/api/user-medias/' || m."id")) LIMIT 1
```

PostgreSQL's exact source form substitutes `$1` for `?`. Parameters are exactly one string, produced by the existing domain as `%${name}%`. Keep its literal LIKE wildcard behavior, no escaping/lowercasing/trim/new ORDER BY. Bind the string with Drizzle's parameter mechanism; never interpolate it into SQL text. Result: zero/one row with five strings; return `undefined` only for genuine no row, not failure. Missing local-media URL mappings remain suppressed by the actual EXISTS.

### B. Local bytes (`sql.ts:9–20`)

```sql
SELECT "id", "name", "content", "size" FROM "media"
```

No parameters. Output requires string `id/name`, `content instanceof Uint8Array`, and number `size` that is a nonnegative safe integer. The producer copies exactly the admitted bytes with `new Uint8Array(content)`. Do not base64/hex/stringify the payload or use `size` as the allocation/byte-bound measurement. Preserve `size` independently; existing domain validation does not require it to equal `content.byteLength`.

### C. Stored catalogue (`sql.ts:23–44`, one two-query group)

```sql
SELECT "id", "slug" FROM "iconRepository"
SELECT "id", "name", "url", "checksum", "icon_repository_id" FROM "icon"
```

No parameters. Preserve all rows, IDs, duplicate slugs/URLs/checksums and the domain's literal grouping by repository ID. All projected values are strings. No deduplication, missing-repository repair, normalization, LIMIT-based truncation or new sort is permitted.

### D. Selected references (`sql.ts:83–109`, one two-query group)

```sql
SELECT "icon_url" AS "url" FROM "app" UNION ALL SELECT "icon_url" FROM "search_engine" UNION ALL SELECT "logo_image_url" FROM "board" UNION ALL SELECT "favicon_image_url" FROM "board" UNION ALL SELECT "background_image_url" FROM "board" UNION ALL SELECT "icon_url" FROM "custom_widget_definition" UNION ALL SELECT "icon_url" FROM "custom_widget_v2_definition"
SELECT "value" FROM "serverSetting" WHERE "setting_key" = 'branding' UNION ALL SELECT "options" FROM "item" UNION ALL SELECT "advanced_options" FROM "item" UNION ALL SELECT "options" FROM "section" WHERE "options" IS NOT NULL UNION ALL SELECT "display_config" FROM "custom_widget_definition" UNION ALL SELECT "options" FROM "custom_widget_v2_definition"
```

No parameters. Direct URLs retain null/string values; serialized values must be strings, including the existing rejection of unexpected null serialized rows. Do not parse/repair/reserialize stored values in DB. Keep the domain's real `IconReferenceCodec { decode(value: string): unknown; maximumSerializedBytes: number; maximumValueNodes: number }`, source SuperJSON decode and Map/Set/Date/binary traversal behavior; native bounds complement, not replace, its serialized-byte/node checks.

### E. Actual public picker (`search.ts:31–89`, one two-query group)

The report must include this actual consumer, not just Jobs and auto-lookup. Its fixed base is:

```sql
SELECT r."id" AS "repository_id", r."slug", i."id", i."name", i."url", ROW_NUMBER() OVER (PARTITION BY r."id" ORDER BY CASE WHEN i."name" LIKE '%.svg' THEN 0 ELSE 1 END, i."name") AS "group_position" FROM "iconRepository" r LEFT JOIN "icon" i ON i."icon_repository_id" = r."id" AND (r."slug" <> 'local' OR EXISTS (SELECT 1 FROM "media" m WHERE i."url" = '/api/user-medias/' || m."id"))
```

Its two exact source query variants are `WITH ranked_icons AS (<that base>) SELECT "repository_id", "slug", "id", "name", "url" FROM ranked_icons WHERE "group_position" <= ? ORDER BY CASE WHEN "slug" = 'local' THEN 0 ELSE 1 END, "slug", "group_position"` and the same string **without** the WHERE clause. PostgreSQL substitutes `$1`; the unfiltered variant has no parameter. Both pair with exactly `SELECT count(*) AS "count" FROM "icon"`.

The bounded variant must carry `group_position` privately and retain the original final ORDER BY, then strip that private field. Preserve local-first/SVG/name order, empty repository LEFT-JOIN rows, total count over all icons (not just surviving local mappings), and the domain's fuzzy ranking/slicing after nonempty search. The existing validator permits finite `limitPerGroup` between 1 and 500, not only integers; do not accidentally add an integer-only API rule. Count may be the driver's decimal string or number; validate as a nonnegative safe count without precision loss, as the domain does. The joined row's icon fields may be null for an empty repository; repository ID/slug stay strings.

## 3. Concrete feature API and the async-SQLite join

Proposed new-file exports, using existing public package dependencies:

```ts
interface IconNativeReadLimits {
  readonly maxPendingReads: number;
  readonly maxParameterBytes: number;
  readonly maxResultRows: number;
  readonly maxResultBytes: number;
  readonly maxMediaBytes: number;
}

createIconNativeReadSource(options: {
  readonly runtime: PersistenceRuntime;
  readonly lifetime: AbortSignal;
  readonly limits: IconNativeReadLimits;
}): {
  runReadAsync<T>(
    operation: BoundedTransactionOperation,
    read: (scope: IconReadScope) => Promise<T>,
  ): Promise<T>;
  closeAsync(): Promise<void>;
}
```

These are a proposed fixed feature factory/result, not current exports. Import `sql` and types through the existing `@homarr/db` root, `BoundedTransactionOperation` through already-published `@homarr/db/runtime`, and Icons types via local source. Icons already depends on DB; DB does **not** depend on Icons. Thus `packages/icons/src/native-read.ts` is the deepest owner and avoids adding a DB→Icons edge, second public generic scope or duplicate domain models. No new library/dependency is needed.

**One finite group per `runReadAsync`, no async transaction trick:** every inspected current reader launches all its one/two SQL promises before its first await. `getIconForName`/local media launch one; catalogue/references/picker launch their pair immediately through `Promise.allSettled`. The existing service's inline selected-reference wrapper also immediately invokes that reader. This permits the following concrete construction:

1. Admit/count the task and capture operation signals/deadline/limits before invoking the domain function. Create a private collecting `IconReadScope` whose `queryAsync` only captures one of the exact catalogue requests, copies its parameters and returns an owned deferred row promise. Attach rejection observation immediately. Do not execute caller text.
2. Invoke `read(scope)` once, observe its result/rejection immediately, and **close collection immediately when that invocation returns its Promise**, before any await. Match the captured group to exactly A, B, C, D or either E variant. Empty, incomplete, duplicate, mixed-purpose, wrong-order or delayed/sequential SQL groups reject; a new use case requires an exact owner amendment, not a general fallback. Domain callbacks do not receive native handles or certify admission/success/authority.
3. On SQLite, execute the captured fixed group synchronously inside one existing `runtime.boundedTransactionSync(operation, database => ...)`. The function passed to that runtime returns only detached rowsets, never a Promise. On PostgreSQL, execute the same group sequentially inside one existing `runtime.boundedSnapshotAsync(operation, async database => ...)`. Do not run two independent transactions for C/D/E and call them a snapshot.
4. Validate/budget/detach every row inside that native callback. A validation/oversize error rejects the whole group before its callback can return successfully. Await the runtime's **complete** COMMIT/cleanup settlement before resolving any captured query promise. On failure reject all query promises, revoke the Icons scope, and await all owned native/consumer promises; preserve original errors/ambiguity rather than return empty rows.
5. Allow the existing domain continuations to parse/group/decode already-detached rows, then revoke the scope and await the domain task/owned deferred promises on every outcome. A retained scope cannot launch later SQL. A private first-failure latch prevents a callback that catches a rejected query or a late unsupported query from manufacturing source success. A post-native domain error remains an error, not a rollback claim. No extra native transaction is launched for a continuation.

This is deliberately a feature-specific delayed group, not a general query framework/compiler. It uses only the actual current call pattern. If the future source implementation cannot preserve that synchronous collection/complete-settlement contract using the frozen signatures, STOP for owner review; do not hold a synchronous SQLite transaction across a Promise, preload every media BLOB for unrelated reads, or quietly split the group.

## 4. Real row/byte bounds before payload materialization

All limits are explicit positive safe integers, copied/frozen at construction; validate safe `maxResultRows + 1` and safe aggregate/concurrency arithmetic. **No numeric production defaults are supplied by this report.** Fetch `maximumIndexBytes`, reference `maximumSerializedBytes` and upload's 32 MiB per-file bound are distinct contracts, not an authorized native total-byte budget. The host must select actual native read/concurrency/parameter limits before mounting.

Charge aggregate rows/returned payload bytes across the entire captured group, not independently per SELECT. UTF-8 strings, actual binary `byteLength`, numeric representations and fixed result-key overhead count; null has a fixed charge. Apply `maxMediaBytes` to actual content bytes, not `media.size`. Parameter UTF-8 bytes are checked before native dispatch. No truncation, pagination-as-success, skipped oversized media, empty-feed replacement or schema repair.

**A post-`.all()` byte check alone is insufficient.** Use fixed SQL-bound payload suppression/metadata with a client row ceiling. PostgreSQL text size is `octet_length(convert_to(<fixed text column>, 'UTF8'))`, not an assumption about server encoding; content uses `octet_length("content")`. SQLite needs a conservative text bound `3 * length(CAST(<fixed text column> AS BLOB))` unless the frozen main-resource owner has already established UTF-8 database encoding: plain BLOB-cast length alone is not an exact UTF-8 byte measure for every supported database encoding. Do not add a PRAGMA/encoding conversion or silently assume encoding. The conservative multiplier also avoids text-character length's embedded-NUL problem; admission may reject an oversized conservative bound, never return truncated success. Content uses `length("content")`. Source nulls have zero payload length but retain nullability/row/key charges. For native integer representations use fixed dialect casts to text and the same safe text accounting; preserve the original returned value/type for domain validation. Always verify actual detached UTF-8/binary bytes too.

A concrete local-media bounded shape (SQLite form; all `?` are producer-owned bound budgets) is:

```sql
WITH icon_media_source AS (
  SELECT "id", "name", "content", "size",
    3 * length(CAST("id" AS BLOB)) + 3 * length(CAST("name" AS BLOB))
      + length("content") + 3 * length(CAST("size" AS BLOB)) AS "__payload_bytes",
    length("content") AS "__media_bytes"
  FROM "media"
), icon_media_budget AS (
  SELECT *, count(*) OVER () AS "__rows",
    sum("__payload_bytes") OVER () AS "__bytes",
    max("__media_bytes") OVER () AS "__max_media"
  FROM icon_media_source
)
SELECT
  CASE WHEN "__rows" <= ? AND "__bytes" <= ? AND "__max_media" <= ? THEN "id" END AS "id",
  CASE WHEN "__rows" <= ? AND "__bytes" <= ? AND "__max_media" <= ? THEN "name" END AS "name",
  CASE WHEN "__rows" <= ? AND "__bytes" <= ? AND "__max_media" <= ? THEN "content" END AS "content",
  CASE WHEN "__rows" <= ? AND "__bytes" <= ? AND "__max_media" <= ? THEN "size" END AS "size",
  "__rows", "__bytes", "__max_media"
FROM icon_media_budget
LIMIT ?
```

The byte threshold is the remaining aggregate budget **after reserving bounded key/null/record charges**, not blindly `maxResultBytes`. Final LIMIT is at most remaining rows + 1, never a completeness policy. PostgreSQL uses the same fixed window/CASE shape with its explicit UTF-8 text/raw bytea expressions and Drizzle `$n` bindings. The zero-row case genuinely yields no rows. Oversize metadata causes rejection, never an interpretation of suppressed nulls as source values. SQLite integer-overflow/unsafe arithmetic and PostgreSQL unsafe/invalid aggregate counts reject; no lossy Number conversion or guessed zero. SQLite's conservative text accounting is an admission upper bound, not claimed exact payload equality; decoded bytes must not exceed it or the actual remaining cap.

Use corresponding **private, statically projected** variants for each catalogue entry. Their whole-result count/byte windows precede the outer bounded projection, so payloads are suppressed if the complete source result exceeds either remaining budget. For A, keep original LIMIT 1 in the inner source; do not repeat a separate preflight selector whose unspecified first row might differ. For E, carry and finally order by the original private group position. Direct URL/serialized UNION branches keep their original column aliases/nulls and UNION ALL. Count's one scalar row is not an unbounded payload query. This avoids a metadata-then-unbounded-BLOB second SELECT or a cursor/new driver API.

Decode unknown native rows with exact per-entry allowed fields and private metadata; reject unsupported fields/types, invalid totals, suppression, excess rows, invalid native size/count or payload disagreement. Remove only the producer's metadata. Copy each accepted content view with its exact offset/length respected by `new Uint8Array(content)`; do not freeze a live driver Buffer or return a sliced shared backing allocation. Charge and validate before copying. No bigint/Date/BLOB→string widening is added to the domain interface.

These are source-ready fixed SQL construction requirements, **not native proof**. SQL/driver internal workspace, row-wrapper overhead and simultaneous driver-plus-detached copies are not bounded by logical payload bytes alone. Reserve concurrency against both native and detached payloads; `maxPendingReads` remains active through consumer settlement. Hard server-memory limits, interruptibility and native timing are not claimed. If native bounding requires a cursor/raw-client/gate change, stop and request a separate exact primitive allocation rather than weakening the bounds.

## 5. Genuine lifetime/deadline and actual consumer usability

One captured `deadlineAt` covers collection, native checkout/group/drain and domain settlement. The producer adds wall-plus-monotonic checks around collection/decoding/delivery, retaining the original remaining budget rather than resetting it per query. Native G3 independently checks the same absolute deadline/signals. Combine the source's owner lifetime/closing signal with the supplied operation lifetime; the main runtime supplies its own separate maintenance/closing lifetime. No guessed timeout, timer-race SQL abandonment, per-query renewed epoch/budget or retry.

Track/publish the feature task before reentrant domain code. `closeAsync` publishes its shared close promise before abort, rejects new admission synchronously and awaits all owned reads/consumers. It closes only this feature source, never main persistence/trust/shared resources. Request cleanup releases/aborts/drains only its owned operation. Native failure, checkout delay, BEGIN failure, queued cancellation, drain and dispatched-COMMIT ambiguity remain the existing runtime's responsibility and observable errors, not a success justified by read-only SQL. Synchronous SQLite work remains noninterruptible; no hard wall-time promise is introduced.

Usability with actual resource signatures:

- `IconProcedureResources.runReadAsync<T>(context: BackendContext, operation: (scope: IconReadScope) => Promise<T>): Promise<T>` maps to `source.runReadAsync(theGenuinelyOwnedOperation, operation)`. Existing `icon.findIcons` starts its real two-query group; shared auto-lookup starts A. Actual `BackendContext` contains `request/signal/onDispose/db/principal`, **no issued deadline/lifetime/admission**. Request owner must privately bind the real context to those facts before any query; context shape or readiness callback cannot fabricate them.
- `IconSynchronizationServiceResources.runReadAsync<T>(operation: (scope: IconReadScope) => Promise<T>, signal?: AbortSignal): Promise<T>` maps to the same producer with the actual job-owned operation. `service.ts:17–31` already supplies `LocalIconResources.readMediasAsync` and catalogue/reference delegates. Do not rebuild the service or inspect function identity to guess purposes; exact SQL group collection determines the fixed read shape.
- `JobRunContext` is exactly `{ signal, clock }`; `createHomarrJobsRuntime` passes the actual per-run signal to `updateIconsAsync`. A genuine job owner must capture one run deadline/lifetime and privately associate that signal with it. `expectedMaximumDurationInMillis` is informational, not an issued deadline. An omitted/unknown signal must not silently become the application lifetime or start a fresh budget. The required host binding is held, not a new public generic injection port.

The target Apps `createMany` remains its existing ordered async lookup loop followed by one insert. A later shared-domain join performs one A read admission per needed lookup under the same genuine request lifetime/deadline, without wrapping the whole sequential loop in this one-group scope or claiming the later insert belongs to its read-only transaction. Input/default/supplied-icon precedence and generated-ID order remain the Apps owner's responsibility; no legacy route or new bulk-create implementation is requested.

The source factory captures the full runtime privately; its returned source can be recorded in a module-private WeakMap against that exact runtime/lifetime and does not expose them. Composition must construct it from its own actual main-runtime variable and retain it privately. This association can attest only which object the feature captured: **structural TypeScript, WeakMap membership, phase, or a factory name cannot prove authentic host/request/job authority**. No fake receipt/currentness callback is part of the interface. Pre-read grant/public-policy/credential/logging/resource admission must be provided and reviewed by their real owners before source use; authority topic is excluded here.

Current host `createMainPersistenceResources` really constructs/opens/migrates/checks its SQLite resource and returns `{ runtime, proxyReader, contribution, assertCurrent, closeAsync }`. But its `MainPersistenceRuntime` in `runtime-composition/contracts.ts:28–34` is a narrowed interface containing only open/migrate/readiness/close/runAsync; it does not type-expose bounded methods. **Do not cast that narrowed value to full `PersistenceRuntime`.** Later 01 must retain the actual full concrete runtime at its factory composition boundary (or publish an exact bounded-method projection there with the same actual instance). This is a host typing/construction amendment, not a missing DB public/native method, and no host edit is requested in the new-only producer phase.

## 6. Conservation and the exact later mutation overlap

Original media columns are SQLite BLOB/Buffer plus timestamp-mode `createdAt`, and PostgreSQL bytea/Buffer plus timestamp-mode Date. The four-column Icons byte read does not select or rewrite dates/creator/contentType. No ID, name, URL, size, bytes, timestamp, schema, ciphertext, bcrypt or serialized reference is changed. `mapMediaToIcon` continues MD5 over original bytes, literal file name/size and exact `/api/user-medias/${id}`. Same-byte/different-ID rows remain distinct. Serving's SVG sanitizer/ETag are not applied to local MD5 source data.

Native read failure rejects the group, never produces successful empty data. Retain the existing LocalIconRepository's deliberate unavailable-source catch/report behavior for a non-abort failed read; do not bypass it or label unavailable as successful empty local feed. Preserve no-external opt-out, all-six-unavailable rejection before replacement reads, genuinely successful empty upstream feeds, partial-source row preservation, selected URL protection and original error precedence. API read errors propagate; no fallback to the old helper/ambient DB.

Readshape overlap needed later by `IconAtomicApplyResources.applyAsync(plan, { signal?, assertCurrentAuthorityAsync, noExternalConnection }): Promise<{ deletedIcons: number }>` is precisely catalogue C, selected references D and actual media identity/existence from A/B. The plan carries `expectedRepositories`, `protectedUrls`, `missingLocalUrls`, exact deletion/insertion IDs/rows. A later native writer must revalidate those facts transaction-time against the same main runtime and coordinated enabled media/local-icon/sync writers. These detached read results are not freshness/through-COMMIT authority or a reason to reuse the read-only transaction as a write transaction.

`MEDIA-ATOMIC-PLAN`'s accepted paired group/exact-URL deletion and current held media algorithms remain separate. This report does not design atomicApply, all writers, row locks, credentials, authority-to-COMMIT, native outcomes/reconciliation or activation. Stop if the proposed reader is asked to write/lock/adopt epochs, bless a stale replacement, enable an uncoordinated writer or close a shared runtime.

## 7. Exact next write/declaration inventory

**Oracle source request:**

| Owner                                | Exact proposed write                                                                    | Scope                                                                                                                                                                                                                                             |
| ------------------------------------ | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Renewed original read producer owner | `packages/icons/src/native-read.ts` (new, absent)                                       | Factory/limits; exact Icons catalogue matching; private bound SELECT variants; unknown-result validation/byte detachment; one-group collection; existing bounded runtime delegation; feature task/lifetime/drain. No export/index/consumer edits. |
| Same owner                           | `.scratch/nitro-full-migration/implementation/icon-native-read-source.md` (new, absent) | Exact signatures/group/SQL/budget inventory, source delta/dependency pins, focused static results or explicit reached-owner hold; no native acceptance.                                                                                           |

No `packages/db/**` file needs writing. All DB/Core/driver/schema/catalog/P3/state/history/jobs/manifests/tests and current Icons domain sources/index remain frozen. An additive DB fixed method is **not** required for byte transport; extending Core typed-array behavior, adding native cursor/output caps, changing G3 gating, adding SQLite mode/PRAGMA or weakening cleanup would be a separate security/native-budget allocation requiring approval, not contingent permission in this request.

**Exact publication request to 01 after source freeze/review:** add only `"./native-read": "./src/native-read.ts"` to `packages/icons/package.json` exports, with no dependency/lock change. The target must exist and its reviewed pin/public resolution must be checked before publication. Existing `@homarr/db/runtime` already publishes the operation/runtime type; the DB root already reexports Drizzle `sql`/types and `PersistenceRuntime`, so no DB export is requested. Do not expand `icons/index.ts` to acquire unrelated implementations.

Separate later 01 host enumeration uses actual `apps/backend/src/server/runtime-composition/{persistence,contracts,runtime,join-slots}.ts` ownership; those are dependency locations, **not** a source write allocation here. It must name the actual full main-runtime capture, selected limits, application disposal, admitted request/job operation owners and existing public resource/service factories before requesting exact consumer/host paths. Existing Core HTTP-resource publication/trust/fetch construction from the prerequisites report remains its separate 01 join, not a DB read dependency or permission granted here. No changes to legacy app/tRPC/ambient Jobs are proposed.

### Later focused static validation only

For a separately approved source phase, enumerate/freeze actual reached deps first and stop before any mutable/unaccepted/excluded input. Minimum: oxlint on the single new source; no-emit strict types using genuine installed Node/Bun/Drizzle declarations and actual workspace/public resolutions; full signature assignability of this factory, both bounded runtime callbacks, `IconReadScope`, `LocalIconResources`, `IconProcedureResources` and service `runReadAsync`; static exact source-string/parameter/group/result inventory against the frozen domain inputs. Native metadata strings and numeric/byte fields must be narrowed from unknown, not cast. Preserve original configs/roots/exports; a historical whole-DB failure or mirror-layout shim is not current source proof. No new tests, native SQL/checks, provider/host/browser/build or production mount are proposed under this phase.

## 8. Recorded pins and raw-evidence limits

These are copied **recorded** hashes, not fresh current digests or graph certificates. Icons pins come from accepted `implementation/icons.md:177–197` and the prerequisite report; the DB/Core values are recorded dependency-table references found in existing handoffs. No authority implementation/evidence was investigated to produce this plan. Coordinator must reconcile the then-current independently accepted packet before source consumption; historical G3 pre-snapshot digests do not pin today's full runtime.

| Dependency                                                        | Recorded SHA-256                                                   |
| ----------------------------------------------------------------- | ------------------------------------------------------------------ |
| `packages/db/runtime.ts` (later recorded dependency pin)          | `565edbf507067b3ef7373689c71715d99ad6a866be9e5f05a88978f7dabdd768` |
| `packages/db/transaction-gate.ts` (later recorded dependency pin) | `fcc02392e17a7162396422829be513e7951ea415a539394d72b2b6754b598c88` |
| Core `src/infrastructure/db/scope.ts`                             | `3ad2a7c13b3905700f02b7c05947772b4be3a9065d7625014ad3599de81bd3fc` |
| `packages/icons/src/resources.ts`                                 | `be67f7595abe42ed4bb350433be3598afcfba52afc2fe96b5041787c58028954` |
| `packages/icons/src/auto-icon-searcher.ts`                        | `179324bfbde4e133374aaf474828049f42a38eac3370a4f970493335ec25b431` |
| `packages/icons/src/sql.ts`                                       | `2d535c856f3f46bd9d46c0f7238f2ff226219b89df53af5f4e70195738acb7c4` |
| `packages/icons/src/search.ts`                                    | `c07a12db808e66bd683336774be718b620e0127d57b1a3faf51749e30382280e` |
| `packages/icons/src/service.ts`                                   | `ae051dd58abb7c6e889fd23404cd4bcf823edea9cd674b3c7b4e1f180801fbf8` |
| `packages/icons/src/repositories/local.icon-repository.ts`        | `57c3f59c01b0d421d464495215cdf95e787357d650108b596ea3650fa71d4a77` |
| `packages/api/src/nitro/routers/-icons/resources.ts`              | `09efac21b1843e7cd76ea16323a6b7a95d90d8794e3238aeaebd68e088401470` |

Evidence here is raw source/declaration/manifest reads, targeted content searches and pathname globs only. Installed Drizzle `0.45.2`/pg `8.22.0`, SQL/Param declarations, synchronous Bun `.all()` and NodePg raw result paths were inspected; no library API was inferred from an invented primitive. No applicable concrete all-media byte-reader pin was found because that producer is absent. No fresh hash, byte-comparison, current graph, lint/types, module evaluation, SQL or native result is claimed.

**Only this new report was written.** No DB/product/contracts/manifests/lock/config/tests/old handoffs/evidence/captures were changed. No commands/checks/hashes, runtime/native SQL/tests, network/providers/browser/listeners/installs, environment/credentials/current appdata, Git, children or worktrees were used. Protected3100/3200/live3210/`-g` and all retained evidence are untouched. No acceptance/count/publication/native/COMMIT/host/private/read-admission gate clears. Return this exact new-only source/publication proposal to Oracle; real host admission and native mutation remain separately held.
