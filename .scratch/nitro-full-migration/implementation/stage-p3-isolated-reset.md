# Stage P3 — isolated copied-runtime reset

**Source implementation COMPLETE/FROZEN for independent review.** This is the Oracle-approved two-file P3 lease, not target-50 readiness or restore acceptance. P1/P2 were consumed without regeneration or validator changes. Native execution, compiler checks, fixtures and reopened-output proof remain deferred.

## Exact additive interface and ownership

`createSqliteCopyEngine(...)` adds:

```ts
resetRuntimeAsync(copy: CopiedSqliteDatabase, signal?: AbortSignal): Promise<void>
```

The operation belongs to the engine, not the public copied-database interface. It accepts no epoch, readiness flag, live DB handle, SQL, callback or external-sequencing attestation, and returns no epoch/authority handle. Existing engine configuration, copied resource methods and phase names remain unchanged. The WeakMap must identify this engine's actual resource; the resource must be open and in the existing `ready` phase.

`ready` attests only that this engine's unchanged content-transform runner completed and passed its existing cancellation check. It does **not** attest external ciphertext/rekey/reference checks, logout, whole-runtime maintenance or restore authorization. Their ordering and successful completion remain the separately reviewed restore caller's responsibility.

## Reset gates and atomic work

- Wrong ownership, `copied`/`compatible`/`schema-ready`, conversion, sealing, sealed, disposal, failed or closed resources cannot reset. Both the engine's active transaction scope and Bun's native `inTransaction` flag reject nesting, including a transaction begun through copied SQL. Expired transaction continuations are also rejected.
- An owned ready-phase attempt first invalidates any previous private reset proof. Availability, transaction, cancellation, catalog or reset failures in that attempt clear the proof and enter the existing `failed` phase; the copy cannot subsequently seal or retry reset. Invalid ownership/phase admission retains the existing ownership/phase rejection behavior and does not mutate another resource.
- The existing P2 validator authenticates the exact configured target bundle, complete ledger and runtime catalog before any mutation. Reset requires the accepted current target of 50, not merely a 50-row count. A shorter explicit target is rejected before runtime DML; no tables or schema are fabricated.
- Temporary schema objects are rejected before reset/catalog validation. Otherwise caller SQL could shadow the main ledger/runtime tables used by existing introspection. All reset DML and reset-content observations explicitly name `main`.
- Inside a synchronous native `immediate` transaction, revalidate the catalog and reject foreign keys from non-runtime tables into any runtime table. This prevents imported domain-table definitions admitted by the preserved P2 domain exceptions from causing runtime deletion to cascade into domain data. Runtime's reviewed entry-to-header FK remains permitted. This is a destructive-boundary guard, not a rewrite of the frozen P2 validator or compatibility rules.
- Generate a fresh UUID internally with Node's `randomUUID`; never select, adopt or return the imported epoch. The sole transaction deletes runtime history entries, stream headers, state and meta, then inserts exactly meta ID 1 with the fresh epoch and ID 2 with null. There is no domain-table DML, trigger installation, schema change, reseed or content reserialization.
- Revalidate the exact target/catalog, empty runtime tables and expected meta inside the transaction; check cancellation before callback completion. After native transaction completion, check cancellation and revalidate target/catalog/contents again. Only then retain the epoch privately and return to `ready`.

An in-transaction exception follows the existing synchronous transaction's native rollback path. A postcommit validation/cancellation error does not pretend commit was rolled back: the isolated copy is failed, its reset proof is absent, and existing disposal remains available. No live installation is changed or adopted and no automatic retry is introduced.

## Target-50 sealing and subsequent SQL

The existing `sealAsync()` still requires `ready`, enters `sealing`, authenticates the exact configured target/catalog, and only then performs its existing `VACUUM INTO`/close/bounded byte read.

For target 50, it additionally requires no temporary schema objects, no active/native transaction, a successful engine-owned reset proof, and no non-runtime inbound runtime FKs. It reads at most one presence row from each main runtime state/history table and requires all three empty. A bounded meta observation requires exactly IDs 1/2, ID 1 matching the private reset epoch, and ID 2 null. SQL comparisons return match/null indicators, not the epoch value.

The stored proof is not sufficient by itself: **every seal rereads actual main-database state**. Later copied SQL that adds runtime data, changes/deletes meta, changes the ledger/catalog, introduces temporary shadows or unsafe inbound runtime references fails sealing before output. A failed seal clears the proof and follows the existing `failed` path; it does not delete offending rows or repair schema to manufacture acceptance. The copy is unavailable to public SQL while reset uses existing `migrating`, and while sealing uses existing `sealing`; there is no await inside reset's native transaction.

## Explicit old-49 support

The authenticated target length is recorded privately only after the unchanged P2 catalog validator succeeds; it is not supplied by a caller. Explicit old-49 and existing shorter historical targets retain their previous migration/content/seal path, without forced reset, runtime creation or new target-50 seal conditions. Calling reset on an owned ready old-49 resource honestly rejects the unsupported target, performs no runtime DML, and fails that attempted copy. Callers preserving an explicit old target must not request reset.

## Source preservation and provenance

Exclusive writes: `packages/db/copied-sqlite.ts` and this handoff. No P2 validator, P1 asset/schema/config/migration, compatibility helper, ordinary runtime/G3/Core/driver, fixture/test, backup/controller/consumer, backing, manifest/export or host file was changed. No active peer implementation was consumed.

The before capture contains only the leased copied-source bytes and its hash:

`/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/stage-p3-reset-NslsAH/`

Retained files: `copied-sqlite-before.ts`, `before.json`, `source-comparison.json`. The previous P2 preservation manifest was reused, not recaptured. File-only comparison found all **216 existing frozen anchors plus the P2 validator and P2 handoff unchanged**. Reversing only P3's imports/private metadata/helpers, seal additions and new engine method in memory restores the entire accepted P2 copied-source byte hash. No checkout source was reverted.

| Source boundary                           | SHA-256                                                            |
| ----------------------------------------- | ------------------------------------------------------------------ |
| Accepted P2 `copied-sqlite.ts`, before P3 | `1383afc9834fd43030750187c67fc88228cb5fa1310c15c75451d914c9a3d477` |
| Frozen P3 `copied-sqlite.ts`              | `463eed48c6bbcd0b0d0b1c6981c382a1418372247ea8f5cb2f0d21a1c18d92c9` |
| Unchanged P2 `copied-runtime-catalog.ts`  | `a10bff35360c5efe3cee7f0ea3ce313fd945c5787ad0620a0acb401e8eb0ba02` |

Existing DB dependencies were checked. Installed Bun SQLite declarations document the native `inTransaction` boolean and transaction methods; installed Drizzle Bun session code implements the synchronous native transaction and `immediate` selection. Installed Node crypto declarations provide `randomUUID`. No dependency/install, new driver API guess, or library-specific uncertainty requiring network documentation was introduced. Existing unsafe migration cast was retained byte-for-byte; no new cast, `any` or code comment was added.

## Remaining review and integration gates

No SQL/runtime/app evaluation, tests, lint/typecheck/build/format/install or other executable validation, graph recapture, generation, environment/credential/current-data access, network/provider/browser/listener/container/shared-service action, Git or nested agent was performed. Evidence uses file bytes/text and crypto only.

Independent P3 source review and required final compiler/lint/native proofs remain outstanding: current-50 reset/seal, explicit old-49 behavior, wrong-phase/ownership/nesting, cancellation/rollback/postcommit failure, later copied-SQL tampering, temporary shadow/inbound FK rejection, domain/ciphertext/media/reference preservation, snapshot close and reopened output. Signal observations do not interrupt synchronous native work or bound its duration; an already dispatched native commit can have an ambiguous outcome. A failed isolated copy is not readiness or rollback evidence.

The separately allocated restore join must place reset after the real crypto/reference/content/logout sequence, preserve controller/recovery/disposal behavior, and validate reopened output before any live adoption. Whole-runtime maintenance, authenticated apply/recovery, final packaged/frozen graph currentness, epoch rebind and real restart/read/write proof remain separate gates. No caller wiring, output activation, ticket closure, target-50 readiness or restoration claim is made here.
