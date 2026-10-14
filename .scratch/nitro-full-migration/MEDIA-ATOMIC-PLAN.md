# Media paired atomic mutations — Oracle proposal

2026-10-11. **Planning only; no implementation allocated.** Proposed frontier: the two absent #113 mutations against existing media/icon tables. Accepted media query/helpers/binary algorithms/sanitizer and icon r2/jobs public-import sources remain frozen and unmounted. Stage G failed independent review and is under the corrected DB owner: its implementation was not read, executed, hashed or rebaselined for this plan. Ordinary persistence r3 contracts and the documented bounded-operation proposal types are reference material, not permission to dispatch these mutations.

## 1. Source bindings and invariants

| Binding                                                                       | Required conservation                                                                                                                                                                                                                                       |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/api/src/router/medias/media-router.ts:55–99`                        | Upload requires `media-upload`; validates/prepares all files, inserts one media group, looks up the existing local repository, then optionally inserts one corresponding icon group; returns media IDs in input order.                                      |
| Same source `:101–126`; `nitro/routers/-media/delete-authorization.ts`        | Delete is authenticated, then missing → `NOT_FOUND` (`Media not found`), existing non-owner without `media-full-all` → `FORBIDDEN` (`You don't have permission to delete this media`). No implicit admin grant. Delete media, then exact matching icon URL. |
| `validation/src/media.ts`; `nitro/routers/-media/upload.ts`                   | Untouched FormData/File validation: PNG/JPEG/WebP/GIF/SVG MIME strings; each file ≤ `32 * 1024 * 1024` bytes. Accepted preparation preserves File name/type/size/Buffer, source CUID2 media IDs and authenticated creator.                                  |
| `icons/src/local.ts` → `repositories/local.icon-repository.ts`                | Consume the actual `mapMediaToIcon`, `createLocalImageUrl`, `LOCAL_ICON_REPOSITORY_SLUG`. MD5 hex is over original stored bytes; URL is exactly `/api/user-medias/${id}`; filename and size remain literal.                                                 |
| `db/schema/{sqlite,postgresql}.ts`, their media/icon relations and migrations | Existing physical tables/constraints below; no media→icon FK, unique local slug or unique checksum/URL exists.                                                                                                                                              |

**Gate order:** legacy `trpc.ts` applies read-only demo mutation denial before authentication, then upload permission, then input parsing; the accepted native procedure spine also applies demo before access. Preserve that outer ordering/error precedence. `prepareMediaUploadAsync` separately checks abort, authentication, `media-upload`, demo, then currentness before invoking its body reader, and rechecks around input/byte reads. Retain its defensive ordering too; prove the future host does not eagerly consume multipart before admission. Delete uses the same outer demo/auth/input gates, then the actual selected row and existing authorization helper. Its `byIdSchema` is only `z.string()`: add no trim, wildcard, path repair, UUID requirement or new ID normalization.

Current grants must come from the accepted request authority, not client-supplied flags. Upload ownership is the current actor ID; owner-only listing, opt-in `media-view-all` listing and independent anonymous binary policy are unchanged. A deleted creator yields `creator_id = NULL`, not a grant to another user; such media requires `media-full-all` to delete.

### Existing physical constraints

- `"media"`: `"id"` PK, `"name"`, `"content"`, `"content_type"`, `"size"`, `"created_at"`, nullable `"creator_id"` → `"user"."id"` ON DELETE SET NULL. SQLite content is BLOB/Buffer and creation defaults to `unixepoch()`; PostgreSQL content is bytea/Buffer and creation defaults to `now()`. Omit `created_at` on upload, as source does.
- `"icon"`: `"id"` PK; non-null `"name"`, `"url"`, `"checksum"`, `"icon_repository_id"` → `"iconRepository"."id"` ON DELETE CASCADE. The cascade goes from repository to icons, **not** media to icons. `"iconRepository"` contains `"id"` PK and non-null `"slug"`; slug is not unique.
- SQLite uses text identifiers/names. PostgreSQL IDs/creator/repository IDs are varchar(64), media name varchar(512), icon name varchar(250), repository slug varchar(150). Preserve literal non-ASCII names and engine constraints: no truncation, transliteration, deduplication or new cross-engine filename limit. An icon name accepted by the media column but rejected by PostgreSQL's icon column must roll back the paired write.
- Physical snake-case column names are confirmed by `DB_CASING = "snake_case"` and existing media/icon migrations. Use those bindings, not a parallel schema. SQLite foreign keys remain enabled through accepted r3 setup.

## 2. Upload group: preparation and exact atomic unit

**Unit proposed for Oracle acceptance:** one existing upload invocation's media group plus its optional corresponding icon group, on one transaction. Source is not a per-file write loop: it buffers the entire validated group, performs one media INSERT, then a separate icon INSERT. Its partial behavior is that icon lookup/insert failure can leave the complete media group committed. Pairing those existing group operations repairs that gap; introducing per-file commits would introduce new partial-upload behavior. No transaction spans separate requests. Oracle must explicitly accept this unit before allocation.

Outside the transaction, preserve `prepareMediaUploadAsync` and input order: authority/demo/permission checks precede body reading; validate the whole File group before `arrayBuffer`; capture original bytes and source media IDs; call the reviewed mapping helper to prepare MD5/name/URL fields. All FormData, Buffer construction, hashing, network/body work and asynchronous authority acquisition finish before SQLite enters its transaction. The File schema supplies a per-file bound, not a request-total/count/concurrency budget; host ingestion/scheduling acceptance remains a separate HOLD. Do not invent a new total limit.

Empty groups have no source array minimum, but the installed SQLite/PostgreSQL Drizzle `values([])` builders reject `values() must be called with at least one value`. Preserve no-write failure rather than silently introducing successful `[]`; no validator redesign is proposed. Source media IDs are CUID2; identical bytes are not deduplicated. Icon IDs are independent CUID2 values generated in input order only when the local repository branch is present; this synchronous source primitive may run in that branch, while all byte/hash work stays outside.

### DB-owner SQL sequence

The DB owner proposes a concrete feature adapter, provisionally `packages/db/private-media.ts`, with fixed upload/delete operations over its **existing main connection/pool**. This path and names are proposals, not exports or current authority. Upload input is trusted prepared rows and mapped icon fields, not caller SQL or an opaque sync callback. Bind all values; use SQLite `?` or PostgreSQL `$n` and actual BLOB/bytea encoding.

1. Admit a current, migrated, writable operation using the real resource owner and accepted authority/operation fence. SQLite: begin an immediate synchronous native transaction. PostgreSQL: check out one existing-pool client, then BEGIN; await every statement on that same client.
2. Preserve the first source operation:

   ```sql
   INSERT INTO "media" ("id", "creator_id", "content", "size", "content_type", "name")
   VALUES (<bound row 1>), ... , (<bound row N>);
   ```

   Require N affected rows (SQLite native `changes`, PostgreSQL rowCount), no conflict-ignore/upsert/replacement. Parameter-bound chunking, if required and separately reviewed, remains within this same atomic group, never per-file commits or a new request-size policy.

3. Preserve optional shared-repository selection:

   ```sql
   SELECT "id" FROM "iconRepository" WHERE "slug" = <bound 'local'> LIMIT 1;
   ```

   PostgreSQL adds `FOR SHARE` to hold the chosen row against update/delete until commit; SQLite's admitted immediate write transaction excludes a competing writer. No ORDER BY, uniqueness assumption, auto-creation, ON CONFLICT(slug) or removal of duplicate local repositories. Source chooses one matching existing row; do not distribute icons across all duplicates.

4. No selected row means the source media-only branch (`registerLocalIcon = false`), with zero icon writes. A selected row means `registerLocalIcon = true` for this group: every media gets its exact mapped icon and the same selected repository ID:

   ```sql
   INSERT INTO "icon" ("id", "checksum", "name", "url", "icon_repository_id")
   VALUES (<bound mapped row 1>), ... , (<bound mapped row N>);
   ```

   Require N affected rows. This is an internal branch, not a new public input field. Once true, failure/lost repository/stale authority cannot downgrade to a media-only success. A proposal carrying a preselected repository must validate that exact ID and slug or reject; it cannot silently pick a replacement. For the source lookup branch, an absent-row observation may legitimately commit media-only even if another transaction creates a local repository later; no phantom-lock/new uniqueness policy is inferred.

5. Finish all statements, perform the accepted native pre-COMMIT fence described below, then dispatch the actual commit. On confirmed commit return media IDs in input order. Any pre-dispatch SQL/count/constraint/authority/abort failure rolls back the entire paired group, including earlier chunks.

## 3. Delete: selected identity, authorized CAS, paired cleanup

Prepare outside the write transaction through a tracked, current read admission: select only `id`, `creator_id` by exact ID, then call `assertMediaDeletionAuthorized` with the current principal. This preserves source existence/grant errors and keeps the authorization algorithm in API. Produce a private trusted plan containing exact expected identity/creator and the current authority admission, never a client-asserted deletion permission. There is no public delete-all/group command.

DB-owner sequence, same native transaction ownership as upload:

1. SELECT `"id", "creator_id" FROM "media" WHERE "id" = <bound id>`; PostgreSQL adds `FOR UPDATE`, SQLite uses the immediate transaction. Reconfirm the preauthorized creator using null-safe identity comparison. Missing now is NOT_FOUND; changed ownership/expired authority rejects before writes for safe API mapping, not silent reauthorization or retry. A null creator is valid evidence only when the source helper already authorized the full-all principal.
2. Delete the selected row with an explicit identity fence:

   ```sql
   DELETE FROM "media" WHERE "id" = <bound id>
     AND ("creator_id" = <bound expected creator>
          OR ("creator_id" IS NULL AND <bound expected creator> IS NULL));
   ```

   Require exactly one affected media row. A zero-row race is not success and does not authorize cleanup of an unrelated row. Raw row/grant evidence is server-private.

3. Preserve source URL cleanup, inside the **same** transaction:

   ```sql
   DELETE FROM "icon" WHERE "url" = <bound createLocalImageUrl(id)>;
   ```

   Zero through many icon rows is valid: source URL is not unique. Equality, not LIKE/prefix, removes all exact local-URL mappings, including misplaced matching rows under a non-local repository. Adding a slug filter would narrow source semantics. Never delete repository rows, unrelated external URLs, checksum siblings or same-content media with a different ID. No repository cascade is invoked.

4. Apply the real native pre-COMMIT fence and commit. Failure in cleanup/count/fence rolls back both deletes. Confirmed success retains the source void response.

This explicitly implements #113's approved atomic local-icon cleanup instead of source's two independent writes. App/board/branding/options store URL strings, not media/icon foreign keys: preserve those strings and all other IDs, ciphertext and serialized fields byte-for-byte. Authorized deletion intentionally makes that exact selected URL unavailable/404; it does not silently point it at a same-MD5 surviving upload, clear unrelated selections or allocate replacement IDs. Upload stores original SVG too; the accepted binary algorithm sanitizes only for serving before SHA256/base64url ETag, independently of the original-byte local MD5. Binary grant policy, sanitizer profiles, cache/security headers and names stay unchanged.

## 4. Commit frontier, ambiguity and effect handling

Accepted ordinary r3 provides tracked readiness/admission/drain, SQLite `transactionSync` and PostgreSQL `transactionAsync`; it is **not** a coupled current-policy/cancellation commit fence. The documented proposal `BoundedTransactionOperation { signal, lifetime, deadlineAt }` and bounded sync/async signatures likewise do not establish acceptance. Read/file/body leases and `assertCurrentAsync` shapes are candidates, not proof of production authority.

Execution requires corrected Stage G acceptance **and** a reviewed binding of current actor/grants/demo, storage generation/ownership, maintenance/close and operation lifetime/deadline to the actual commit dispatcher. A policy refresh awaited earlier or a callback returning `true` cannot satisfy this. If the accepted native gate cannot couple policy revision to commit dispatch, this precondition is unsupported: leave both mutations absent and request that exact owner join.

- SQLite's transaction body is entirely synchronous: no await, async callback, body read, hashing or foreign connection. The DB owner must validate the real operation/authority fence at the native commit boundary, not merely in a wrapper before a callback whose internals commit later.
- PostgreSQL owns BEGIN, all awaited SQL, completion/drain and final COMMIT on one checked-out client. There must be no intervening await/queued native command between the final effective fence and actual COMMIT dispatch. Keep authorization revision coordinated across that interval; do not claim SQL atomically protects a separate policy store.
- Before actual dispatch: observed abort/revocation/deadline/maintenance invalidation causes rollback and no publication. Rollback/cleanup must be attempted through owner cleanup paths even after application cancellation. Await native settlement; evict uncertain/broken clients rather than returning them healthy. A JS timeout is not driver completion.
- After dispatch: cancellation/disconnect/transport error can make commit **ambiguous**, not definitely rolled back. Native positive acknowledgement means committed, even if request delivery, release, invalidation or later effects fail. Cleanup errors do not erase that phase; retain safe internal outcome metadata and report honestly through the accepted error boundary without credentials/SQL parameter/cause echo.
- No automatic retry, new IDs, ON CONFLICT workaround or compensating delete. Retain available generated IDs, chosen repository/icon IDs and expected bytes/metadata in the owned operation result for reconciliation. Once the accepted resource is usable, reconcile exact IDs/media bytes/metadata and icon rows on one consistent read scope. All expected upload rows present can establish current durable state; absent/partial/conflicting evidence requires owner investigation. Delete absence alone cannot prove which actor committed it. Lost receipt/process lifetime means outcome may remain unknown; no new journal/sidecar/table is allocated to manufacture certainty.
- Run only approved post-durability invalidation/notifications. A post-commit effect failure is a committed mutation with failed follow-up, not safe-to-reupload/delete-again certainty and not a claim that no write happened. Keep public upload IDs/delete void contracts; any new public retry/outcome protocol requires separate Oracle review.

## 5. Local-icon concurrency and separate sync hold

Reserve only media plus its exact local-icon insert/delete operations. The frozen shared icon planner records expected repositories, selected URLs and missing-local URLs, but legacy jobs `applySyncAsync` remains checksum/all-delete SQL without the required atomicApply authority/reference/CAS contract. This plan neither wraps that method nor redesigns/activates all-source synchronization.

Because icons have no FK to media, a stale sync could reinsert a mapping after deletion or delete a newly uploaded mapping. For first media execution, keep physical all-source sync/legacy writer unmounted and obtain DB-owner admission covering every enabled local-icon writer. If another such writer is already enabled outside that authority, stop. A later sync cutover needs its own accepted transaction-time catalog/reference/media validation and coordinated local mutation admission; an API lease or repository FK alone does not solve stale-plan races. No extra pool, schema, lock table, sidecar or Stage P catalog is proposed.

## 6. Future allocation and minimal execution gates

**No allocation is released by this file.** After Oracle accepts the upload group, exact deletion semantics/error mapping and authority fence, and the corrected DB owner releases an accepted Stage G/frozen existing-schema runtime graph:

- **DB owner exclusively:** proposed `packages/db/private-media.ts` and one explicitly assigned DB-private critical check. Implement the concrete engine-discriminated SQL/row-count/identity/commit-outcome operations above using existing owned resources. Only that owner may integrate actual commit dispatch; ordinary r3 SQL/physical tables/migrations/catalogs/restore families remain unchanged. A needed export is a separate COMPOSITION decision, not implicit manifest authority.
- **API owner separately:** existing `nitro/routers/media.ts`, `routers/-media/resources.ts`, `upload.ts`, `delete-authorization.ts` and existing `checks/media.mts`, only as precisely allocated. Reuse preparation/authorization, connect the accepted feature adapter and register the exact two source identities with conserved metadata/output. Leave listing, binary/sanitizer and frozen icons/jobs untouched. No whole-service atomicApply callback stands in for SQL.
- **Host/authority owner separately:** untouched File/FormData ingestion with reviewed body scheduling/total-resource budget, real request/body lifetime and accepted policy-to-native commit binding. These are prerequisites, not no-op callbacks attached by API.

Future proof is narrow and real on disposable SQLite and PostgreSQL, **after** those gates; no mock SQL, wide role/MIME matrix or live installation:

1. A two-file group with non-ASCII names and exact binary bytes; existing local repository yields two exact MD5/URL/independent-ID mappings. One no-local-repository case proves media-only behavior without repository creation. A targeted PostgreSQL 251-character icon-name failure demonstrates rollback without truncation or schema repair.
2. Inject a real second-group/icon-statement constraint failure after media INSERT; assert no rows from the attempted group survive. For delete, fail cleanup after media DELETE and assert media plus mappings survive. Check real affected-row counts on both engines.
3. Denied upload before body read and source missing/non-owner delete errors without writes; owner/full-all source helper evidence is retained rather than expanded into a policy matrix.
4. Exact local URL duplicates plus an unrelated external icon and same-byte/different-ID media: authorized deletion removes only target media/matching mappings, preserves repository rows and other selected URL/serialized/ciphertext fields, and never rebinds the removed URL.
5. Deterministic abort/policy change held immediately before actual native COMMIT causes rollback; post-dispatch uncertainty is reported/reconciled without retries, while confirmed commit followed by effect failure remains durable. A late operation cannot escape maintenance/drain admission.

Completion criteria: real both-engine atomic rollback and dispatch evidence; existing media/helper/sanitizer and relevant icon checks unchanged in behavior; frozen schema/relations/migration/restore catalog graph still conserved; no new tables or current data accessed. Any unmet precondition stays an explicit HOLD. This document is the sole saved change; no commands, tests, DB/runtime execution, network, environment/credential access, listener/container/browser, manifest/lock/install, Git operation or nested agent was used to produce it. #113, #115 and #20 remain incomplete.
