# Convergence K — concrete private target interface

## Disposition and scope

APPROVE the two-stage source plan below: K freezes the catalog/copy producer in exactly NEW `packages/db/main-target-catalog.ts`, `packages/db/copied-runtime-catalog.ts`, `packages/db/migrations/compatibility.ts`, and `packages/db/copied-sqlite.ts`; D subsequently consumes it in its separately allocated `packages/db/runtime.ts` lease. This report is the only write here. No commands, checks, tests, module evaluation, native/SQL/data/environment/secret access or nested agents were used. AW6/Auth/other active source owners are excluded. Concurrent compiler/public-only build work is not a result of this report and supplies no native proof.

The original K plan's missing-assets/config/facade statements are historical. Both credential-free runtime configs and all three root facades already exist. The actual additive assets are published. Do not create another target/adoption module named by an older handshake, duplicate generation configs, package exports, migration assets or journal rewrites.

## Actual accepted asset inputs

Receipt directory: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-credential-assets-d4axMeII/`. Read `published-assets.json`, `published-journals.json`, `snapshot-diff.json`, `summary.json` and the actual published SQL/snapshots/journal tails. Hashes below are recorded receipt values, not newly calculated here.

| Field                           | SQLite                                                             | PostgreSQL                                                         |
| ------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| Complete target journal length  | 51                                                                 | 19                                                                 |
| New tag / index / entry version | `0050_auth_credential_evidence` / 50 / `6`                         | `0018_auth_credential_evidence` / 18 / `7`                         |
| Entry timestamp / breakpoints   | `1791828953283` / true                                             | `1791828953678` / true                                             |
| Published SQL SHA256            | `b521f900b160fb1256790be8e1bda41ce550ca7325bd480544bc969ac62e1108` | `dafe9a445ec5e2aee227912461f405bc6f1ad2835ab1a1306a9c736eec85309d` |
| New snapshot SHA256             | `069e9a6f6143119845d1de74a769b53ca9eded045abe516ebc315087ea0d9703` | `7c9a7c6ad4ca1ba2909f30dca68317a4b7b3ed5744c00c68b614a9f1af24a549` |
| New snapshot ID                 | `1bbbf9bc-e2e6-4dc8-8424-63c7a587aade`                             | `339186a5-6c16-4663-8cbc-1fae725a20e1`                             |
| New snapshot prevId             | `5ae42910-4b43-479e-8397-09d955abe177`                             | `3039bf24-1cc8-46f0-abfb-35c82c6c986e`                             |
| Unchanged runtime anchor        | index 49, `0049_robust_gateway`, original target length 50         | index 17, `0017_ambitious_roughhouse`, original target length 18   |

SQL paths are `packages/db/migrations/sqlite/0050_auth_credential_evidence.sql` and `packages/db/migrations/postgresql/0018_auth_credential_evidence.sql`; snapshots are the corresponding `meta/0050_snapshot.json` and `meta/0018_snapshot.json`. Preserve `runtime-catalog.ts` and its original SQL/snapshot hashes/definitions unchanged. SQLite raw generated SQL hash remains separately recorded as `b516300da59863c8803001c40173e1102b410a88b03ab3d227455f191124dcef`, not the published executable migration identity.

SQLite0050 creates the domain and its explicit namespace unique index, rebuilds `apiKey`/`session`, copies exactly their original three fields plus `NULL,NULL`, renames the replacement tables, and recreates `user_id_idx`. Its generated CHECK qualifiers use `__new_apiKey`/`__new_session`; the snapshot uses final names. PostgreSQL0018 creates the domain with a named UNIQUE constraint and adds the four BIGINT columns/two checks. Neither inserts a domain row or grants adoption provenance. PG identity support is not PG physical/transaction activation.

## Stage K — smallest producer interface

All following exports are DB-internal relative imports only. No package subpath/root facade exposes them. Reuse `CopiedCatalogReader` and `CopiedSqlRow`/`CopiedSqlValue` through type-only imports; do not import the copied native engine at evaluation time.

### NEW `packages/db/main-target-catalog.ts`

Freeze these signatures, with the indicated types; these are prospective declarations, not claims of implemented functions:

```ts
type MainTargetEngine = "sqlite" | "postgresql";

interface MainTargetBundle {
  readonly engine: MainTargetEngine;
  readonly identity: string;
  readonly migrationCount: number;
  readonly runtimeAnchorIndex: number;
  readonly migrations: readonly MigrationMeta[];
}

readMainTargetBundle(engine: MainTargetEngine, migrationsFolder: string): MainTargetBundle;
assertSqliteMainTarget(reader: CopiedCatalogReader, migrationsFolder: string): void;
```

`MigrationMeta` is the existing installed `drizzle-orm/migrator` type. `readMainTargetBundle` accepts only the complete compiled target for its engine (51/19), authenticates the supplied root, and returns detached immutable bundle data. It is not a receipt, capability or caller-supplied target definition. `assertSqliteMainTarget` internally authenticates that root again, verifies the actual ledger first, reads its entire bounded history, requires all 51 entries, and verifies the complete physical SQLite target. It returns nothing; callers cannot supply expected hashes/schema, a target Boolean, an approving callback or a substitute bundle.

Keep the finite accepted descriptors, snapshot definitions, expected schema signatures and asset pins module-owned. No mutable exported registry. An identity is a deterministic fingerprint of authenticated engine, complete journal entry identities, every SQL/snapshot pin and the accepted physical-definition version; allocate its actual value only from the producer's real inputs. Do not put an invented fingerprint in this report. Do not derive accepted hashes from the folder currently being authenticated.

### Packaged-root and relocation contract

The folder supplied to these functions is the engine-specific packaged migration root, e.g. a relocated deployment's SQLite root containing its SQL and `meta/`. It must be explicit and absolute. It is not a path to a live database. Remove canonical-folder/snapshot discovery through `import.meta.url` from copied catalog admission; compiled JSON imports/constants are the authority, not a second source-tree folder assumed to exist beside the emitted JS.

Authenticate bounded regular-file reads of the journal against the compiled exact dialect/version/entry shapes and values; resolve SQL names only from those fixed accepted tags. Authenticate every consumed SQL and every packaged snapshot against compiled individual pins, including snapshot version/id/prevId lineage and the unchanged runtime anchor. Unknown/missing/changed/overlong assets fail closed; do not treat matching SQL from two untrusted folders as authority. Read/split migration bytes once for the returned bundle using the existing migrator format; retain complete raw-byte hashes and breakpoint semantics.

The new receipts do not contain a full historical per-file pin map or journal-byte hashes. The old handshake's P2 `preservation-before.json` path returned not-found in this read. K/coordinator must use an available accepted prefix map or make an authorized file-only capture/reconciliation before filling those compiled constants. Exact journal structure can be compared with compiled imported journals; any claimed raw journal hash still needs its actual capture. The new four asset hashes alone cannot authenticate the entire prefix. No additional product path is needed: constants belong in `main-target-catalog.ts`.

The actual native migrators reread their folder. Require immutable, host-controlled packaged assets for the duration of migration; before/after authentication is not protection against hostile filesystem replacement. No pathname/inode claim becomes native freshness or writer-closure evidence.

### Complete physical check without a schema framework

Move/reuse the existing bounded tokenizer, ledger checks and column/FK/index reader primitives from `copied-runtime-catalog.ts` inside this new module, with internal imports back only where needed. Keep bounds (64KiB SQL / 2048 tokens, bounded file reads, expected rows plus one); add only vocabulary required by the accepted definitions, notably DEFAULT, UNIQUE, BLOB, SET, TRUE/FALSE. No general SQL interpreter, migration-history replay engine, Drizzle application-schema import or dynamic schema registry.

Use the compiled terminal SQLite snapshot for every application/runtime table, not merely the three Auth-related objects. Its views/enums are empty. Compare actual `main.sqlite_master` objects and prescribed PRAGMAs with closed expected signatures. The tokenizer can split a CREATE TABLE body at top-level commas and match fixed column/PK/FK/CHECK clauses; consume every token and reject unsupported clauses. This small CREATE-only matcher is necessary: whole-string equality against newly rendered snapshot DDL would incorrectly assume historical declaration ordering and ALTER/rebuild spelling.

- Require exactly the expected tables and explicit indexes, the authenticated Drizzle ledger and its exact implicit PK index. Enumerate with a derived object bound plus one. Reject triggers, views, virtual tables, shadow tables, unknown tables/indexes, generated/hidden columns, unsupported table options and unexpected executable clauses. Retain only the existing exact `sqlite_stat1`/`sqlite_stat4` structure exceptions; these are not arbitrary `sqlite_*` exemptions. Check attached/temp schemas according to the owner boundary; reset/seal permit no temp objects.
- Columns: exact name set, declared storage type, nullability, absence/presence and accepted tokens of defaults, PK ordinals, hidden=0 and declared collation. Parse every column declaration, including nonindexed collations; PRAGMAs alone do not cover CHECK/collation semantics. Use actual `cid` by name for index verification, not snapshot-object iteration order: historical ADD COLUMN physically appends columns. Normalize only fixed known representations, such as Boolean defaults and SQLite's outer default-expression parentheses; preserve literal bytes/function names and reject other expressions. No implicit widening from INTEGER to generic numeric affinity.
- PKs: exact ordered column list and required inline integer-rowid versus indexed PK shape. Verify origin/uniqueness/partial flags, expected autoindex ownership and all index terms. Do not assume every table has a PK: `groupPermission` does not. Do not accept arbitrary autoindex names because they share a table prefix.
- FKs: reuse bounded `pragma_foreign_key_list`, grouping by actual id and matching complete ordered multicolumn signatures as a multiset; ids need not follow snapshot insertion order. Exact referenced tables/columns, update/delete actions and MATCH semantics; duplicates/extra rows fail. The existing one-FK guard cannot be applied to `user`, `group`, permission/junction or layout tables, which have multiple FKs.
- Indexes: exact names, table, ordered key terms, unique/origin/partial flags, collation and ascending direction, plus expected rowid auxiliary term for these rowid tables. Verify CREATE INDEX tokens as well as `pragma_index_list`/`pragma_index_xinfo`; reject expression/partial indexes or changed collations/order. Domain namespace uniqueness is the actual explicit SQLite index, not a guessed inline UNIQUE/autoindex.
- CHECKs: exact accepted named expression tokens, balanced structure and complete count, including every domain/credential/runtime check. Normalize only the owning replacement-table qualifier arising from the reviewed rename, and only to its known final owner; never strip arbitrary qualifiers or rewrite Boolean expressions. The original runtime anchor DDL remains independently matched exactly. Reject extra CHECKs and conflict/deferrable/options not represented by accepted physical definitions.
- Ledger: retain exact `__drizzle_migrations` CREATE/columns/PK-index proof before its bounded `NOT INDEXED` ordered row read. Require exact SQL hash/timestamp identities with checked number/bigint/canonical decimal decoding, not `Number(unknown)` coercion. Preserve runtime meta's original two-row representation validation separately from a schema-only count check.

Catalog authentication is structural plus ledger identity, not credential adoption/data reconciliation. It may accept an absent domain row before adoption or preserved initializing/ready metadata without minting authority; C1/D own domain/evidence validation. Do not select, hash, log or return bearer rows as part of this new interface. Missing/invalid schema cannot fall through the current broad CREATE-prefix whitelist.

### `packages/db/migrations/compatibility.ts`

Retain existing entrypoint names/signatures and ordinary nonempty historical-ledger-prefix meaning: `migrationHistoryReadLimit(folder)`, `assertMigrationHistory(rows, folder, engine)` and `assertSqliteMigrationHistory(rows, folder)`. Authenticate the complete packaged root first, derive overflow limits from its compiled accepted inventory, and compare every actual historical row exactly. Add this internal exact-ledger-only counterpart:

```ts
assertCompleteMigrationHistory(
  rows: { hash: unknown; created_at: unknown }[],
  migrationsFolder: string,
  engine: "SQLite" | "PostgreSQL",
): void;
```

It requires exactly 51/19 authenticated entries; it is not physical proof. Shared exact timestamp decoding belongs here or in the new catalog, not another utility package. `migrationHistoryReadLimit` may identify the engine only from a bounded journal dialect matched to a compiled descriptor; the explicit engine assertion still rejects mismatch. PostgreSQL complete-history identity is available, but no PG physical-ready validator is supplied in this phase.

### `packages/db/copied-runtime-catalog.ts`

Keep `CopiedCatalogReader` unchanged. `readCopiedCatalogBundle(folder)` consumes the authenticated complete SQLite bundle; carry its actual identity/count/migrations and original runtime DDL. Locate index49 by its exact tag/version/time/breakpoints/hash, extract runtime CREATE statements there, and authenticate original0049 snapshot definitions. Never extract DDL from0050 or repoint runtime target length to51.

Separate `assertCopiedCatalogPrefix(reader: CopiedCatalogReader, migrationsFolder: string): void` from complete-target checking; replace the old `requireTarget` Boolean at internal call sites. This fixed function reads/authenticates its own bundle, ledger and bounded object enumeration rather than accepting caller-certified objects. Prefix input checks authenticate ledger shape/all rows and the original runtime anchor when present. Historical ledger lengths1–49 forbid runtime/Auth additions; length50 has the exact original four runtime tables and no Auth additions; length51 routes to `assertSqliteMainTarget(reader, migrationsFolder)`. Do not call historical application name/CREATE-prefix admission complete physical proof. If a historical physical shape is not separately authenticated, it remains input compatibility only; reject unsupported executable objects as before.

The accepted input prefix is distinct from an incomplete packaged output root. This phase uses the supplied full51 root for conversion/seal; it does not authenticate arbitrary historical terminal application schemas or silently treat a shortened configured journal as the current target. If explicit historical output/seal support is demanded later, allocate that physical target separately rather than manufacturing a no-op reset/current-ready result.

### `packages/db/copied-sqlite.ts`

Require `createSqliteCopyEngine({ temporaryDirectory, migrationsFolder })` to receive the explicit absolute packaged root; no source-relative fallback. Keep the existing public copy methods and native ownership unchanged; do not add a public reader/handle/catalog receipt. Existing owning callers that omitted the folder need their own consumer allocation, not edits outside K's four files.

The compatible/input phase uses the separate prefix check. After schema migration, after content conversion, inside/before/after reset, and before seal, invoke `assertSqliteMainTarget` on the same copy's owner-local reader. Replace `catalogMigrationCount === runtimeCatalog.sqlite.targetJournalLength` guards with unconditional full-target requirements on current-ready reset/seal; count50 is anchor presence, not complete readiness. Privately pin/recheck the authenticated bundle identity. The returned identity/count cannot replace actual physical checks.

Retain the exact ready-phase, cancellation, immediate-transaction, no-active-outer-transaction, no-temp-object, non-runtime-FK-referrer, failure and same-copy-owned epoch guards. Seal requires complete51, the actual owned reset and exact empty runtime contents before VACUUM/close. Reset DML remains the same four DELETEs plus runtime meta insert; never touch domain namespace/head/phase or session/key evidence, including initializing metadata. Unknown triggers and inbound runtime FKs must be rejected, not bypassed. Conservation/native post-seal proof remains a later check, not asserted from source omission alone. Content-ready/copy-sealed is not Auth-ready or real restore admission.

## Stage D — exact private consumption after K freeze

Only after K freezes the above types/body, D imports `assertSqliteMainTarget` by relative internal path into `packages/db/runtime.ts`. D alone changes this file/config consumption; K does not write runtime/gate/session/schema/Auth/AW bodies. Capture the explicit engine-specific packaged migration root in the existing frozen config; remove D's source-relative folder fallback as its own consumer amendment. No caller predicate, catalog callback, raw handle/reader or approving receipt is added to the runtime API.

D defines one module-private fixed helper `assertCurrentSqliteTarget(current: Extract<Connection, { engine: "sqlite" }>): void`. It creates the existing `CopiedCatalogReader` adapter locally from that exact retained native connection and invokes `assertSqliteMainTarget(reader, capturedMigrationsFolder)`. The adapter cannot escape. Observation must run coherently on the owner connection in an appropriate synchronous native unit; a detached readiness result is never reusable authorization or writer-closure proof.

Exact consumption sites in the currently read runtime:

1. `migrateSchemaAsync` (263–304): authenticate the packaged root before migrator dispatch, retain historical input ledger checking for existing resources, and call the complete SQLite physical check after migration before publishing `schema-ready`. Existing-resource prefix acceptance does not create adoption provenance. PG may authenticate19 assets/history, not report new physical acceptance.
2. `migrateContentAsync` (305–322): recheck complete SQLite target after original initialization/custom transformations and before `phase = "ready"`; preserve initializer restrictions and error/cleanup behavior.
3. `checkReadinessAsync` (496–510): replace SQLite's `SELECT 1`-only observation with the private complete-target check under actual active-work/lifetime ownership. A failure cannot authorize later work; D must invalidate/quarantine the actual resource as its existing failure policy requires. This is main schema readiness, not a favorable Auth/adoption result. PG's existing health behavior must not be relabeled a complete physical-target certificate.
4. `adoptAuthCredentialsAsync`/its existing `runUnit` (379–462,414–422): invoke the fixed catalog check on the same retained SQLite connection inside each existing bounded immediate unit before the fixed C1 initialization/batch statements. Check again before returning ordinary-ready. Keep prepublished maintenance/adoption tasks, the separate lifetime, finite operation deadline, physical drain, settled progress and ambiguous-COMMIT quarantine intact. Where fixed writers rely on target enforcement, their same native unit must perform the same fixed check, not consume the external readiness Boolean.

Do not alter the fresh owner test (native retained fresh `:memory:` only), file-backed rejection, existing/restart provenance hold or domain/evidence allocation semantics. K assets/catalog do not create a pre-append authority producer. No marker insertion, namespace/head reseed, caller-minted evidence, generic COMMIT or restore activation is allocated by this interface.

## Material implementation gates and handoff

- No missing generated asset/config/facade blocks this producer. Complete compiled historical pins still require actual available capture; the new receipts alone and the unavailable old TEMP map are insufficient. Do not report historical evidence unavailable as native state loss.
- Current helpers materially assume runtime-only shape: one FK, ordered snapshot columns, primitive default equality and BINARY runtime indexes. Reusing them unchanged for all tables would reject valid targets or miss physical enforcement. The bounded CREATE-only matcher and explicit PRAGMA generalizations above are required, not an optional big-framework redesign.
- Rename-normalized credential CHECK spelling, historical column/default representations and actual implicit-index metadata need focused authorized synthetic/native validation later. This report cannot prove how a real SQLite engine records them. A mismatch must fail and be resolved against actual accepted artifacts, not relaxed into prefix acceptance.
- Final runtime/copy owning callers must supply immutable packaged roots. K's producer and D's consumer are separate freezes; a compiler success before D joins does not mean readiness is wired. No excluded caller edit is hidden in K's lease.
- PG physical/transaction admission, file-backed/existing/restart adoption, writer closure, generic COMMIT, Auth HTTP publication and real restore remain held. No user authorization question or extra generation request is needed to proceed with ordinary source work within the approved scopes.

K returns exact private types/functions, compiled asset identities, tokenizer/physical coverage and the four-file source freeze. D then returns its separately reviewed runtime consumer freeze. Coordinator owns focused lint/type checks and any explicitly authorized synthetic/native checks after reached writers freeze; none ran here.
