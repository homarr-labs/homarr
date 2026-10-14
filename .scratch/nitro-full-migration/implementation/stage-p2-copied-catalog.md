# Stage P2 — copied SQLite catalog admission

**Source preparation COMPLETE/FROZEN for independent review.** Oracle-approved consumer-only lease; P1 remains accepted and unchanged. Compiler/native behavior, fixtures and reopened-output proof remain outstanding. This is not target-50 readiness, restore acceptance or permission to adopt an imported epoch.

## Exact ownership and source changes

- `packages/db/copied-sqlite.ts`: consumes the validator, pins the authenticated configured-bundle identity to its owned copy, and adds read-only preflight/target revalidation at existing resource phases.
- New `packages/db/copied-runtime-catalog.ts`: authenticates configured journal/SQL identities and validates the untrusted ledger object, bounded ledger prefix and exact runtime catalog.
- This handoff only. No manifest/export, dependency, ordinary runtime/G3/Core/driver, P1/schema/migration/config, compatibility-helper, domain, fixture/test, backup/restore or host edits.

The existing public copied-resource methods, signatures and phases remain unchanged. No reset operation, epoch generation/adoption, schema repair or object/row deletion was added. Existing ciphertext/reference/content ordering remains with its existing owner; all five custom transformations are unchanged.

## Configured bundle and historical compatibility

Every admission/revalidation rereads the configured bundle rather than trusting its entry count. Journal top-level shape and each entry's exact index, version, timestamp, tag and breakpoints must match the packaged journal prefix. Each configured SQL hash, timestamp and breakpoints must match the corresponding packaged migration. Unknown extra suffixes, changed identities and empty/overlong bundles are rejected.

The packaged complete bundle must have the accepted 50 entries; its final identity is bound to `runtimeCatalog.sqlite.migration`, including final SQL SHA-256. The snapshot path/hash comes from that same catalog. Runtime table definitions reference the reviewed JSON definitions through `runtimeCatalog`, and expected runtime DDL tokens are read from the hash-authenticated final SQL, not from independently handwritten runtime DDL.

| Configured target                                     | Input ledger                                     | Admission / resulting target                                                                      |
| ----------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| Existing exact nonempty historical prefix, at most 49 | Exact nonempty prefix no longer than that bundle | Runtime objects forbidden; existing prefix window retained; migrate only to the configured target |
| Explicit exact old-49 bundle                          | Exact nonempty prefix through 49                 | Runtime objects forbidden; remains 49, never forced to 50                                         |
| Accepted current-50 bundle                            | Exact nonempty prefix through 49                 | Runtime objects forbidden before migration; require exact 50 and runtime catalog afterward        |
| Accepted current-50 bundle                            | Exact 50 identities                              | All four exact runtime tables and required physical indexes/meta shape must already exist         |

There is no acceptance of a 50-row ledger solely because its length is 50. An input newer than its configured target is rejected. Original old SQL/snapshot bytes and 49/17 migration prefixes are untouched; current journals remain 50/18. Historical admission is not new proof that every old content fixture succeeds.

## Read-only validation boundary

The existing streaming whole-object enumeration still rejects triggers, views and unknown objects. Existing domain table/index, genuine internal-index and exact SQLite statistics exceptions are preserved. Runtime-associated objects are separated before these permissive domain-index rules; arbitrary indexes on runtime tables cannot use the domain exception.

Before reading ledger rows, require the installed Drizzle ledger's real table DDL and bounded column/PK-index/FK shape. The ledger DDL contract was read from installed `drizzle-orm/sqlite-core/dialect.js`; it is not a fake runtime catalog. Existing non-runtime index exceptions remain intact. Ledger rows are read `NOT INDEXED`, sorted by `created_at`, with configured length + 1 as the materialization bound. Each hash/timestamp is compared to the already-authenticated bundle, without numeric-string coercion or another compatibility-helper file read.

At exact 50, enforce the catalog-derived eight runtime schema objects: four tables, one expiry index and three composite-PK autoindexes. Bounded `table_xinfo`, `index_list`, `index_xinfo` and `foreign_key_list` observations check column order/type/nullability/default/hidden/PK position, index identity/origin/uniqueness/partialness/key order/direction/collation/rowid tail, and the exact composite history FK/update/delete actions. SQLite's meta integer PK has no separate autoindex; SQLite's physical PK/FK labels remain unnamed, as recorded by P1.

Full runtime table/index DDL must match the authenticated generated token sequence. Token kinds distinguish identifiers from string literals; only whitespace, keyword/type case and equivalent supported identifier quotes normalize. CHECK expressions, literal values, collations, constraint labels and all remaining syntax must match. Comments, unsupported tokens, changed/reordered expressions, extra clauses, defaults, virtual/generated columns, foreign keys, indexes or objects are rejected rather than semantically guessed. DDL tokenization is bounded to 65,536 characters / 2,048 tokens; source assets are bounded to 1 MiB. PRAGMA result bounds come from the catalog plus an overflow row.

Meta reads require exactly IDs 1/2 with row 1 a non-null text epoch and row 2 null. The epoch itself is not returned, compared to an installation identity, adopted or used as authority. No state/history rows are scanned, cleared, reserialized or changed by validation. The accepted sentinel is not a fresh installation UUID.

## Existing phase behavior

| Operation               | Added observation before phase advancement / output                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `assertCompatibleAsync` | Authenticate configured bundle, ledger object/prefix and stage-appropriate catalog; pin bundle identity; only then `compatible` |
| `migrateSchemaAsync`    | Revalidate before existing native migration; revalidate exact configured target/catalog afterward; only then `schema-ready`     |
| `migrateContentAsync`   | Revalidate exact target before the unchanged five-transform runner; existing cancellation/ready behavior retained               |
| `sealAsync`             | Revalidate exact target/catalog before existing `VACUUM INTO`, close and byte read                                              |

Checks inside `migrating`/`sealing` use a private owned reader, not a newly exposed raw handle or public phase bypass. Copy ownership, transaction lifetime, size bounds, disposal and existing failure handling remain unchanged. Compatibility rejection retains the existing copied-phase behavior; migration/content/seal rejection follows the existing failed-phase path. No failed copy is repaired into acceptance, and no automatic migration retry was added.

## Preservation evidence and frozen hashes

Owned evidence: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/stage-p2-catalog-EBJvL2/`.

`preservation-before.json`, `copied-sqlite-before.ts`, `preservation-after.json`, `freeze-comparison.json` and `copied-source-reversal.json` retain file-only evidence. All **216 captured frozen anchors** are unchanged, including DB/P1 assets, compatibility helper, Core DB sources, backup sources and lockfile. SHA-256 of `JSON.stringify` of the original sorted path-to-hash object remains `82aa735c0ea2b38dd53793920a7ca03dd756a774c47b8cef2bab39ea84044414`.

The moved domain/index/statistics rule block compares exactly after reversing only indentation, `copy` to private `reader`, and the new runtime-object separation. In-memory reversal of the intended copied-engine additions restores the complete original file hash `5ec3eff15753c331489250adf8a0a8443bdf62b150c8083be699c67d8b304b08`; the compatibility guards also compare unchanged. No original file was rewritten by those comparisons.

| Frozen source                           | SHA-256                                                            |
| --------------------------------------- | ------------------------------------------------------------------ |
| `packages/db/copied-sqlite.ts`          | `1383afc9834fd43030750187c67fc88228cb5fa1310c15c75451d914c9a3d477` |
| `packages/db/copied-runtime-catalog.ts` | `a10bff35360c5efe3cee7f0ea3ce313fd945c5787ad0620a0acb401e8eb0ba02` |

DB already declares Drizzle/Bun types. Installed migrator implementation/declarations and synchronous migration-ledger DDL were read before using the APIs. No dependency, install or new library was introduced; no library-specific API uncertainty required network documentation discovery.

## Limits and remaining holds

No lint/typecheck/build/test/format/install, generation, SQL/runtime execution, app-module/hash evaluation, mutable graph capture, environment/credentials/current-data access, network/provider/browser/listener/container/shared-service, Git or nested-agent action was performed. Evidence is source/file/JSON/crypto comparison only, not compiler or behavioral proof.

The packaged/configured migration filesystem is a trusted immutable host input; pre/post checks do not establish protection against hostile concurrent local filesystem replacement during the native migrator's own rereads. Bounds limit materialized rows/tokens, not native execution time; the existing whole-schema enumeration remains streaming. Equivalent but unfamiliar DDL is intentionally rejected. This does not establish arbitrary domain schema/data validity, runtime row-content validity, reopened output, export privacy, or live restore safety.

Required next gates: independent P2 source review; separately authorized compiler/lint/format and real old-49/current-50/historical native fixtures, failure/reopen proof and final frozen graphs. Reset/fresh epoch, backing/restore wiring and host integration remain outside this lease. Imported runtime values remain input data, not trusted runtime state. Central 91/334, mount 0 and Q16/Q17/Q18 are unchanged; no ticket or target-readiness acceptance is claimed.
