# Stage P1 — source-only infrastructure catalog freeze

2026-10-11. **First P1 source preparation is complete and frozen for independent review, not accepted target readiness.** The user affirmed Oracle's exact lease, accepted/committed G3 at `c009cba62`, restore's affirmative release and COMPOSITION's complete capture release. This lane did not run Git or recertify those prior results. Read `SQL-BACKING-PLAN.md` §§3/8, `STAGE-P-RESTORE-HANDSHAKE.md` and the latest agreed `.slim/deepwork/nitro-full-migration.md` invariants before source work. Broader historical handshake proposals do not extend this lease.

## Exact source/artifact delta

New DB source only:

- `packages/db/schema/runtime/sqlite.ts`
- `packages/db/schema/runtime/postgresql.ts`
- `packages/db/runtime-catalog.ts`
- `packages/db/configs/runtime-sqlite.config.ts`
- `packages/db/configs/runtime-postgresql.config.ts`

Exactly one generated SQL and one generated snapshot per existing physical tree:

- `packages/db/migrations/sqlite/0049_robust_gateway.sql`
- `packages/db/migrations/sqlite/meta/0049_snapshot.json`
- `packages/db/migrations/postgresql/0017_ambitious_roughhouse.sql`
- `packages/db/migrations/postgresql/meta/0017_snapshot.json`

Only existing writes are the appended entry in each engine's `meta/_journal.json`. This new handoff is the sole other checkout write. Existing generation configs, 40 domain schemas, schema index, seven reviewed import edits, seed/queries/collection, copied engine, G3/runtime/gate/Core/drivers, fixtures/tests/restore, consumers/backings, auth/host/policies and manifests/lock remain untouched.

## Exact generated identities — no guessed tags/timestamps

| Engine     | New journal entry                                                                                         | Resulting length | Snapshot identity / previous identity                                           |
| ---------- | --------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------- |
| SQLite     | `idx: 49`, `version: "6"`, `when: 1791712104288`, `tag: "0049_robust_gateway"`, `breakpoints: true`       | 50               | `5ae42910-4b43-479e-8397-09d955abe177` / `9afd1ddb-3537-4b7b-b3a7-957c2b94a437` |
| PostgreSQL | `idx: 17`, `version: "7"`, `when: 1791712152164`, `tag: "0017_ambitious_roughhouse"`, `breakpoints: true` | 18               | `3039bf24-1cc8-46f0-abfb-35c82c6c986e` / `b61f0f83-6729-48c4-b44a-5379c3289ed0` |

All tags, times and snapshot UUIDs above are actual installed-tool outputs. Snapshot UUIDs are schema-history metadata, not an installation epoch. No `--name` override or invented journal identity was supplied.

`runtimeCatalog.version` is `homarr.runtime.sql.v1`. It binds these exact journal identities, source/target lengths, SQL paths and hashes, snapshot identity/version/hash and four engine-specific object definitions. Definitions reference the generated JSON snapshot tables directly, rather than retyping or weakening their columns/CHECKs/PKs/FK/index data. The module imports only those JSON assets; it adds no constructor, validator, catalog consumer, SQL endpoint, reset or resource admission. JSON-module support is already declared in the inherited TypeScript configuration; no config change or compiler run was made.

## Exact four infrastructure tables

There remain **40 domain models**, plus four infrastructure tables; both new snapshots contain 44 tables. Existing domain table objects compare structurally equal to their immediately preceding engine snapshots. No domain/default/reference/serialization/ordering/ID algorithm change was generated.

| Table                           | Generated contract                                                                                                                                                                                                                                                                        |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `homarr_runtime_meta`           | `id INTEGER PRIMARY KEY NOT NULL`; nullable identity-text `epoch`; `homarr_runtime_meta_identity_check` permits only `(id = 1 AND epoch IS NOT NULL) OR (id = 2 AND epoch IS NULL)`                                                                                                       |
| `homarr_runtime_state`          | Non-null identity-text `epoch`, `key`; non-null TEXT `value`; nullable `expires_at_ms` REAL / DOUBLE PRECISION; PK `(epoch,key)`; sole explicit nonunique index `homarr_runtime_state_expiry_idx` on `(epoch,expires_at_ms,key)`                                                          |
| `homarr_runtime_history_stream` | Non-null identity-text `epoch`, `kind`, `name`; non-null INTEGER / BIGINT `head_sequence`; PK `(epoch,kind,name)`; `homarr_runtime_history_stream_kind_check` restricts kind to `log`/`sample`; `homarr_runtime_history_stream_sequence_check` requires head `>= 0`                       |
| `homarr_runtime_history_entry`  | Same non-null stream identity; non-null INTEGER / BIGINT `sequence`; non-null TEXT `payload`; PK `(epoch,kind,name,sequence)`; `homarr_runtime_history_entry_sequence_check` requires sequence `> 0`; exact composite FK to header `(epoch,kind,name)`, DELETE CASCADE / UPDATE NO ACTION |

Every identity-text column, including meta epoch, explicitly uses SQLite `text COLLATE BINARY` / PostgreSQL `text COLLATE "C"`. The unchanged payloads remain TEXT, not JSON/JSONB. Expiry remains nullable floating-point milliseconds, with no rounding or new default. PostgreSQL sequence schema builders use `{ mode: "bigint" }`, not lossy JS-number decoding. No sequence reader/adapter is implemented here; later SQLite/native decoding and overflow enforcement still require their own reviewed join.

Generated SQLite composite PKs and FK are unnamed in physical DDL even though snapshots retain Drizzle's labels. The catalog records their physical names as null. PostgreSQL composite PKs are explicitly named `homarr_runtime_state_pk`, `homarr_runtime_history_stream_pk`, `homarr_runtime_history_entry_pk`; meta's inline PK has the conventional `homarr_runtime_meta_pkey` name. PostgreSQL FK is named `homarr_runtime_history_entry_stream_fk` and references `public.homarr_runtime_history_stream`. These are DDL-derived descriptions, not live introspection results. No explicit index beyond the state expiry index, view, trigger, sequence object, sidecar or new domain family was added. Native implicit PK-index handling remains a later catalog-consumer review concern, not a license to accept arbitrary indexes.

### Sole authorized handwritten SQL suffix

Kit emitted DDL only. Its complete raw SQL remains byte-for-byte the prefix of each final new SQL asset; the only handwritten SQL is one appended statement-breakpoint and one INSERT containing exactly two rows:

```sql
INSERT INTO "homarr_runtime_meta" ("id", "epoch")
VALUES (1, 'homarr-runtime:uninitialized:v1'), (2, NULL);
```

SQLite uses the generator's backtick quoting for the same identifiers. Reserved sentinel **`homarr-runtime:uninitialized:v1`** is also exported as `runtimeUninitializedEpoch` and recorded in catalog `initialMetaRows`. It is deliberately not an installation UUID. No default seed change, runtime initialization, token generation, reset or SQL execution occurred; the rows exist only as source in these new migration suffixes. Future installation-epoch initialization remains separately allocated.

## Installed generator/API/config provenance

DB already declares catalog-managed `drizzle-kit` and `drizzle-orm`; installed package metadata and actual `bun.lock` pins are **Kit 0.31.10 / ORM 0.45.2**. No dependency was added, installed or upgraded. Read the installed `Config` declarations, table/column/customType/CHECK/FK/bigint declarations, and Kit's actual serializers/CREATE converters, `prepareGenerateConfig`, `prepare*MigrationSnapshot` and `writeResult` paths before generation. Custom column `dataType` strings are retained in snapshots; SQLite CREATE emits them directly and PostgreSQL's native-text branch preserves the collation clause. No unsupported guessed `collate()` API or handwritten collation DDL was used.

Both new configs have only a type-only Kit import, explicit `dialect`, `casing: "snake_case"` matching the existing constant, two exact schema paths and an output path. No credentials, DB/Core root import, DB environment import, `with-env` wrapper or broad schema-directory scan. Inputs are that engine's **existing** `schema/{engine}.ts` plus **new** `schema/runtime/{engine}.ts`; `schema/index.ts` is not used. Existing domain sources still use their real definition/header defaults and pure Core certificate-schema leaf; they were not replaced by a fake isolated domain schema.

Owned generation directory retained for review:

```text
/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/stage-p1-catalog-NusRDW
```

It contains exact copies of each old physical migration tree, copied new config bytes and symlinks to exact original engine schema files/new runtime schema modules and existing dependencies. No installation data, fixture DB, credentials or environment file. Existing assets were compared before copying back **only** the two new SQL/snapshots and generated journal suffixes. Raw generated SQL is retained separately as `sqlite-generated.sql` / `postgresql-generated.sql`.

Exactly two source-generation calls completed, each exit 0 and reporting 44 tables. From that owned directory, replacing `<engine>` with `sqlite`, then `postgresql`:

```text
env -i PATH=<explicit-current-PATH>
HOME=<owned-directory>/home
TMPDIR=/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode
DOTENV_CONFIG_PATH=/dev/null
bun --no-env-file ./node_modules/drizzle-kit/bin.cjs generate
--config=./configs/runtime-<engine>.config.ts
```

The shown lines describe one command per engine, not separate shell commands. Bun automatic environment loading is disabled; bundled Kit dotenv is directed to empty `/dev/null`, never a checkout/user `.env`. Only source metadata serialization runs; no migrate/push/studio/live SQL, native DB/client/runtime factory, network/provider, browser/listener/container/shared-service or Git operation. No generation was repeated after the server restart.

## Honest append-only comparison correction

The first publish guard **failed before any destination copy** because Kit's journal writer omitted the preexisting final newline. Both journals' old entries and all old SQL/snapshots were unchanged; the sole serialization difference was EOF newline. The patch tool restored that newline in the owned journal copies without changing generated metadata. A second guard then proved removing exactly the appended entry and its comma reproduces each original journal byte hash. This is preservation of existing journal formatting, not a journal identity/old-asset repair. No unsafe import, old SQL/snapshot rewrite, unrelated ALTER/DROP or unrepresentable invariant was encountered; no out-of-scope repair was made.

## Frozen source and artifact hashes

SHA-256; DB-relative paths below:

| Path                                                  | Frozen hash                                                        |
| ----------------------------------------------------- | ------------------------------------------------------------------ |
| `schema/runtime/sqlite.ts`                            | `6a771a2a4ee7b7d130ee79939055123ef6295bfb884cc9bd2e410fc78e3aee67` |
| `schema/runtime/postgresql.ts`                        | `c855bfff2ae9cc86e4d965ff90555899746a9cbeec8ad820a9257a82ab572e6b` |
| `runtime-catalog.ts`                                  | `7fb9b289a79c8e03117791726ad0492a09a49baeb034081eaeb8b37499533189` |
| `configs/runtime-sqlite.config.ts`                    | `8545a5d85f29ede88c89e7e91bb9fad9196b6302bd3aeba133e269b3f712e8b4` |
| `configs/runtime-postgresql.config.ts`                | `2e8c6725940a672591d69e59054b05c912a108e16f9342214adac9faa823cbd8` |
| `migrations/sqlite/0049_robust_gateway.sql`           | `29d003efc340625e9539d5a133508cb98e6e66342934d295855577074643141e` |
| `migrations/sqlite/meta/0049_snapshot.json`           | `c34fa23c8b1caa400ce0e2082d715cffefba05a5078e4b904512ed0835bd17f1` |
| `migrations/sqlite/meta/_journal.json`                | `bb9edfcef60d7dc7973231db6162cc609a91abaa2c0f3cdef3450daea1eef199` |
| `migrations/postgresql/0017_ambitious_roughhouse.sql` | `5ca45b95e8d355064a2cd0317c7c5f56b2aab2cc4868fdb2ca32564b5ee81529` |
| `migrations/postgresql/meta/0017_snapshot.json`       | `402debe006db3382d23f1077727396d1c13050633d6f247c5d92f6d491ccf81f` |
| `migrations/postgresql/meta/_journal.json`            | `4ba3535ad15b1eafced43a066e2de1809031a75e7b4b68a8a1e29294e5427fd1` |

Raw generated SQL hashes before the sole initialization suffix:

- SQLite: `ea24d0f5cc3737531835c7b778b5c2250981dad9d0f14fb9f32e7f924d81d870`.
- PostgreSQL: `1dd401528dd05ba9afb4571e292588a28929e71ba3ea56c83a124c6b7b5ff107`.

Preservation scripts use only Node filesystem/crypto/path builtins and JSON/file bytes; they never import the new catalog, schema/runtime packages, factories or environment modules. Initial manifest has 203 files; excluding the two deliberately appended journals leaves **201 unchanged source/asset anchors**, including every preexisting DB file, Core DB source/drivers, Core certificate schema leaves, Common manifest/ID/grid source and lock. SHA-256 of `JSON.stringify(sorted [path, fileSHA256] pairs)` for those unchanged anchors:

`0408dff49da9fbe8d01e3748891fa508f9f6673ce30d4e376f1aa76ca8b62aef`

| Preserved set                                        | Count / condition                                           | Preservation hash                                                  |
| ---------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------ |
| Existing SQLite physical files excluding journal     | 99, including all 49 SQL and 49 old snapshots               | `0aea54d9089b5d93ce274c8fd05e1aa63bbc54e19e32f603933ba22c101b1a6c` |
| Existing PostgreSQL physical files excluding journal | 35, including all 17 SQL and 17 old snapshots               | `5ba3a9202f44b959a78a5e81a43aa453ec425349777246377c3ee5090642a990` |
| Original SQLite journal = reverse of new entry       | Every prior identity/order/timestamp/tag and byte preserved | `1e1c870479702832a6bf4388984ef6a157defb604cca46e88f3294ec13495d73` |
| Original PostgreSQL journal = reverse of new entry   | Every prior identity/order/timestamp/tag and byte preserved | `85af936fb485f957a98d12fcdc36d04a2bba6621c3c61190b19e404fdb52f67a` |

Each new snapshot has exactly four added table objects; all 40 preceding domain table definitions and all top-level metadata except snapshot `id`/`prevId`/`tables` compare equal. No `_meta`, internal, view, enum, sequence, policy or other top-level drift. Canonically sorted JSON hashes of the four new table objects, using their exact snapshot keys:

- SQLite: `f5bb4c1b842005743ef575e20b390c1cc8388d6acbf1beb820a19fb860d4397a`.
- PostgreSQL: `1c8c420a79af1994c63d5e2a851add7ed34a72f90e19f16aa236d7db3eee6039`.

Retained evidence: `preservation-before.json`, `generation-before-initialization.json`, raw SQL files, `published-artifacts.json`, `freeze-comparison.json` and owned migration copies. No subprocess or graph capture remains active from this lane.

## Unvalidated holds / next boundary

**DEFERRED:** lint, typecheck, build, tests, format and installation were not run. Successful generation and file/JSON comparisons are source-production evidence only, not compiler/native SQL/constraint/migration execution or product validation. Existing seed format failure and historical SuperJSON warnings remain uncleared. Independent P1 source/catalog/initialization review and required final validation remain mandatory.

No copied-engine catalog consumer/reset/fixture/restore/backing or host join is implemented. Accepted source-49 catalog/fixture evidence and frozen copied-engine behavior are not reinterpreted as target-50 readiness; a separate reviewed consumer/reset/old-49/new-50 fixture allocation is still required. Final B/C/D/schema/copy/asset graphs may be captured only against this frozen DB result and must be separately accepted. No runtime data authority, auth COMMIT, production host, maintenance/recovery, ticket, central 334/52/133/91 or Q16/Q17 status is changed or claimed complete. Return now without polling or spawning reviewers/agents from this lane.
