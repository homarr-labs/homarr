# Convergence K — source freeze

## Frozen scope and interface

Source freeze covers only `packages/db/main-target-catalog.ts`, `packages/db/copied-runtime-catalog.ts`, `packages/db/migrations/compatibility.ts`, `packages/db/copied-sqlite.ts` and this report. `main-target-catalog.ts` is new; the other three existing allocated implementations were amended. No runtime/D/Auth/gate/config/manifest/facade/migration asset was edited. No commands, checks, tests, module evaluation, native/SQL/data/environment/credential access or nested agents were performed. This is not compiler, runtime, preservation or adoption acceptance.

The DB-internal main producer exports exactly these functions:

```ts
readMainTargetBundle(engine: MainTargetEngine, migrationsFolder: string): MainTargetBundle;
assertSqliteMainTarget(reader: CopiedCatalogReader, migrationsFolder: string): void;
```

`MainTargetEngine` is `"sqlite" | "postgresql"`. `MainTargetBundle` has readonly `engine`, `identity`, `migrationCount`, `runtimeAnchorIndex`, and `migrations: readonly MigrationMeta[]`, using the installed Drizzle type. Every returned migration, SQL array, migration array and bundle is frozen and detached. No caller expected DTO, predicate, approving callback, catalog receipt, exported mutable authority registry, native engine import or handle was added. `CopiedCatalogReader` remains unchanged and native/copy imports into the catalog are type-only.

## Accepted assets and roots

Module-owned SQL/snapshot pins were transcribed from the coordinator's current file-only `whole-source-asset-pins.json`. This capture is current source input, not historical or native evidence. Its SQLite0049/PostgreSQL0017 SQL/snapshot pins and entry identities reconcile with unchanged `runtime-catalog.ts`. Its four appended SQL/snapshot hashes and tail entry identities reconcile with `published-assets.json`, `published-journals.json`, K-assets and the published tails.

| Engine     | Complete count | Unchanged anchor                    | Journal SHA256                                                     |
| ---------- | -------------- | ----------------------------------- | ------------------------------------------------------------------ |
| SQLite     | 51             | index49 `0049_robust_gateway`       | `c78cac4ba328f43f5f54079d36da08148a9c7f229d76a9eaa7188fc1d54f5a98` |
| PostgreSQL | 19             | index17 `0017_ambitious_roughhouse` | `d7c64c95aa3804928864ba9a844751b3cc5320c7a4b91c7e1b265938cfa9bf33` |

All 51 SQLite SQL files, 51 SQLite snapshots and the journal, and all 19 PostgreSQL SQL files, 19 PostgreSQL snapshots and the journal are pinned individually. Journal imports are frozen compiled authority, with exact dialect/version/entry shape/value comparison in addition to captured journal byte hashes. Every snapshot checks pinned bytes, version/dialect/id/prevId lineage; original anchor and terminal identities are checked separately. The deterministic bundle identity is SHA256 of authenticated engine, physical-definition version `homarr.main.physical.create.v1`, complete compiled journal, journal pin and complete SQL/snapshot pin arrays. No unexecuted fingerprint value is claimed.

Roots must be explicit absolute regular directories with regular `meta`, an exact SQL/meta inventory, and bounded nonsymlink regular-file reads. File reads use an owned descriptor, a 1MiB bound, an overflow byte, and lossless UTF-8 decoding before hashing. SQL is read/split once per authenticated bundle using the installed migrator's `--> statement-breakpoint` representation, preserving full-byte hash/time/breakpoint identities. There is no `import.meta.url` discovery or second untrusted folder comparison.

The closed packaged root contains only its pinned SQL files and `meta`; `meta` contains only pinned snapshots and `_journal.json`. Existing source folders also contain `migrate.ts`, so they are not these closed packaged roots. Packaging/owning consumers must provide the allocated closed relocated asset root; no excluded packaging or caller was silently changed. Native migrators still reread their folder: host-controlled immutable assets throughout migration are required; authentication before/after does not defeat hostile filesystem replacement.

## SQLite physical coverage

Complete-target admission proves the original ledger CREATE/columns/PK-index and reads all 51 bounded ordered `NOT INDEXED` ledger rows before application catalog checking. Hash/time equality uses safe integer numbers, exact bigint equality or bounded canonical unsigned decimal text, never coercion of unknown values.

The terminal compiled SQLite snapshot owns all application/runtime table and explicit-index definitions. A bounded 64KiB/2048-token CREATE-only matcher splits balanced table bodies into top-level clauses and consumes every declaration. It compares complete column name sets independently of physical declaration ordering, exact storage types/nullability/default presence, inline/composite PK shape, fixed FK clauses, named CHECK expressions and declared collations including nonindexed columns. Only the known Boolean default spellings and outer default-expression parentheses are normalized; literal bytes and function names remain significant. Only the reviewed `__new_apiKey`/`__new_session` CHECK owner qualifiers normalize to their respective final owners.

Main-schema PRAGMAs use expected rows plus one: table xinfo checks hidden=0 and maps actual cids by name; FK rows are grouped by bounded actual id/seq and matched as a complete ordered-signature multiset; index lists and xinfo check exact names/origin/uniqueness/partial flags, ordered keys, ascending/BINARY terms, actual cids and the rowid auxiliary term. Tables without PKs remain without PKs. Integer-rowid PKs and exact `_1` indexed PK ownership are distinguished. CREATE INDEX tokens are checked independently. Domain namespace uniqueness is its published explicit unique index.

Whole `main.sqlite_master` enumeration is derived from expected tables/indexes/implicit PK indexes plus two precise statistics exceptions and an overflow row. Unknown tables/indexes, arbitrary autoindexes, triggers/views/virtual/shadow objects, generated/hidden columns, expression/partial indexes, extra CHECKs, unsupported constraints/options and extra schemas/temp objects fail. Only exact `sqlite_stat1`/`sqlite_stat4` CREATE/column structures without indexes/FKs are exceptions. Original runtime0049 CREATE statements remain independently token-matched, and runtime meta retains its original two-row text/null representation proof rather than a mere row count. No credential rows are selected, returned or hashed. An absent Auth domain row is not adoption approval; existing initializing/ready domain contents are not changed by structural checking.

## Prefix, copy and reset joins

`readCopiedCatalogBundle(folder)` consumes the full authenticated SQLite51 bundle and extracts only unchanged index49 runtime DDL, never0050. `assertCopiedCatalogPrefix(reader, folder)` authenticates its own root, ledger/history and bounded objects: nonempty lengths1–49 forbid runtime/Auth additions; length50 proves the original four runtime tables/indices/meta representation without Auth additions; length51 invokes the complete physical validator. Historical application CREATE/name admission remains input compatibility, explicitly not complete physical proof. Shortened packaged output roots are rejected rather than treated as historical ready/sealable targets.

Compatibility retains `migrationHistoryReadLimit(folder)`, `assertMigrationHistory(rows, folder, engine)` and `assertSqliteMigrationHistory(rows, folder)`. The first identifies only a bounded journal dialect before complete authentication; explicit assertions reject engine mismatch and compare every actual prefix row. New internal `assertCompleteMigrationHistory(rows, folder, engine): void` requires exactly51/19 and proves ledger identity only. PostgreSQL has no physical-ready certificate in this phase.

`createSqliteCopyEngine({ temporaryDirectory, migrationsFolder })` now requires both absolute folders and pins the authenticated bundle privately. Input compatibility uses the owner-local prefix reader. Full target is rechecked after schema migration, before/after content conversion, before/inside/after reset and before seal on the same retained native copy. The former count50 readiness/reset/seal guards are gone. The native migrator wrapper uses the installed Drizzle constructor on the same retained client instead of a type cast; no new native connection or public reader is created.

Ready phase, immediate reset transaction, cancellation, no outer transaction/temp objects, inbound non-runtime FK rejection, same-copy reset epoch, failure quarantine and disposal/conversion exclusion remain. Reset still deletes only history entry, history stream, state and meta, then reinserts the original two runtime-meta rows with its new owned epoch. Domain namespace/head/phase and both credential evidence families are untouched, including initializing metadata. Seal requires the complete target, owned reset and exact empty runtime contents before VACUUM/close. These source conditions do not claim post-seal conservation/native proof or Auth-ready/restore admission.

## Separate consumer and acceptance holds

- D alone must consume the frozen producer in `packages/db/runtime.ts` with its explicitly captured packaged root and same-native synchronous checks at schema/content/readiness/adoption/writer sites. K did not wire D.
- `packages/api/src/backup-runtime/sqlite.ts` still declares optional `SqliteBackupConfiguration.migrationsFolder`; its engine call therefore needs a separately allocated required-folder amendment. `packages/api/src/backup-runtime/nitro-join/contracts.ts` inherits that optional shape, and `nitro-join/service.ts` passes it unchanged. These are named consumer/type holds, not silently repaired here.
- Docker currently copies the source migrations directory wholesale, including nonasset migration entrypoints. A separately allocated closed-root packaging/config join is required for this strict packaged-root contract. Existing shortened-root fixture callers are not current-target acceptance evidence and were not changed.
- Coordinator owns post-freeze lint/type checks and any expressly authorized synthetic/native validation. Transcribed pins, actual rename CHECK recording, default spellings, historical physical column positions and implicit-index metadata still require those checks; no acceptance is inferred from this source freeze.
- PG physical/transaction acceptance, file-backed/existing/restart adoption, pre-append provenance, writer closure, generic COMMIT, Auth HTTP publication, real restore and provider activation remain held. No assets or account authority were minted.
