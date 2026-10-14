# K4 finite physical repair — source freeze

## Outcome and actual writes

Frozen under the coordinator's supplied Oracle source-repair APPROVE (`ses_ece745d66ffe8YruU1v89Wrgqk`). This is source publication, not K source ACCEPT, validator execution, runtime PASS, production/adoption admission or populated-row proof.

Actual touched paths:

- `packages/db/main-target-catalog.ts`
- NEW `.scratch/nitro-full-migration/implementation/convergence-K-physical-repair-publication.md`

The other three allocated files were not changed: `packages/db/copied-runtime-catalog.ts`, `packages/db/migrations/compatibility.ts`, `packages/db/copied-sqlite.ts`. No internal consumer amendment was necessary. COPY1's captured-once roots/signature/body remain untouched. No runtime.ts, Native6/Auth session source, schema, snapshot, journal, historical SQL, fixture, export, manifest, backing store or configuration was edited.

Read the complete native reconciliation, frozen prospective history reconciliation, latest `.slim/deepwork/nitro-full-migration.md` checkpoint, writer rules, nearest DB dependency manifest and the four-file before-image inventory at `TEMP/nitro-k4-source-repair-89ey398f/source-before.json`. No commands, checks, lint/typecheck, hash helper/calculation, builds, tests, module evaluation, native/SQL execution, environment/configuration/data/secret access or nested agents were performed. No dependency or comment was added.

## Authority and exact pin repair

Only the malformed compiled SQLite0030 snapshot pin changed, to:

`42267f940cd3b2c1b81da89756ac2166386a5b58f0baa99ea86e99673054ecd0`

This is the accepted `whole-source-asset-pins.json` value at lines699–701, size53343, transcribed without rehashing or deriving authority from a candidate. The immutable capture authority identified by the coordinator remains `a675179f6c33bf71c4fc4318da73299e2345eaa4a49b90854260fb9fe9c8d868`. All other compiled asset pins remain unchanged. No asset was published/replaced. Snapshot IDs still use their existing exact string-chain checks; no UUID gate,0036 exception, pin change or lineage relaxation was added.

## One detached/frozen physical descriptor

The terminal snapshot's table definitions are structurally cloned into module-private data. Existing FK logical identifiers remain internal matching keys, not allowances for named physical constraints. FK descriptors now require `form: "table" | "inline"` and `match: "NONE"`. All ordinary FK descriptors have table form; exactly the approved integration reference has inline form. The completed table array, nested definitions and finite override map are recursively frozen; the snapshot itself is not rewritten.

Exactly four ordered composite-PK overrides were applied:

| Owner                       | Physical PK order                    |
| --------------------------- | ------------------------------------ |
| boardUserPermission         | board_id, permission, user_id        |
| integration_item            | integration_id, item_id              |
| integrationGroupPermissions | group_id, integration_id, permission |
| integrationUserPermission   | integration_id, permission, user_id  |

The same frozen table definitions feed `primaryColumns`, table-PK CREATE matching, per-column PK ordinals, exact object/PK-autoindex inventories and ordered index xinfo terms with measured name→CID mappings. There is no separate DDL-only override or candidate-derived whitelist.

For `integration.app_id`, descriptor construction requires the sole existing app reference, exact `app_id→app(id)` terms, nullable TEXT/non-PK column and absence of a default. Its fixed effective update/delete actions are NO ACTION, MATCH NONE, and its physical form is unnamed inline. Owning column consumption accepts only the exact `REFERENCES app(id)` tail, with omitted action clauses as in immutable0034. It requires that tail once, consumes the matching expected FK once, and removes its internal key from the table-clause inventory. Missing/duplicate inline clauses, explicit additional actions, named inline constraints and extra/substitute standalone FKs cannot satisfy this descriptor. Complete PRAGMA FK groups independently require the same frozen terms/actions/MATCH signature.

All source PK/FKs must now be physically unnamed: table-PK and standalone-FK matching require no `CONSTRAINT` prefix; column suffix matching admits none. Snapshot logical PK/FK names are no longer promoted to physical name allowances. Named CHECKs and explicit index names retain their existing exact checks.

## Fingerprint recipe and unchanged type contract

The existing private interface is unchanged:

```ts
readMainTargetBundle(engine: MainTargetEngine, migrationsFolder: string): MainTargetBundle;
assertSqliteMainTarget(reader: CopiedCatalogReader, migrationsFolder: string): void;
```

`MainTargetEngine` remains `"sqlite" | "postgresql"`. `MainTargetBundle` retains readonly `engine`, `identity`, `migrationCount`, `runtimeAnchorIndex` and `migrations: readonly MigrationMeta[]`. No physical descriptor, approving callback, expected DTO, raw reader/handle or receipt was exposed to callers.

Identity is the existing SHA256 function over `JSON.stringify` of the ordered fields `{ engine, version, physicalDefinition, journal, journalPin, sqlPins, snapshotPins }`. Version is now `homarr.main.physical.create.v2`. For SQLite, `physicalDefinition` is the frozen full physical table descriptor, exact ledger descriptor and finite representation contract: unnamed PK/FKs, sole owning inline reference/omitted NO ACTION, existing boolean/default-parenthesis rules, two owning CHECK qualifier rewrites, BINARY/ascending/single-rowid index terms, existing asset/SQL/token bounds and the two bounded statistics structures. For PostgreSQL this field is null: its complete19 identity remains asset/history-only, not physical admission. The fingerprint binds source-owned physical semantics and all existing journal/asset pins, not native candidate metadata. No fingerprint/result-hash value was calculated or invented in this lane.

## Preserved boundaries and handoff

The existing COLLATE type-prefix consumer was left unchanged. All nine explicit BINARY fields, including nonindexed runtime-meta epoch, remain represented exactly; no explicit collation elsewhere was enabled. Literal defaults, function names, all nine named CHECKs, retained historical fields, exact objects/indices/hidden-column negatives, bounded optional statistics, complete51 ledger, nullable SERIAL ledger PK, canonical timestamp decoding and original0049 runtime-anchor token proof remain. Prefix input compatibility stays separate from complete physical-target checking. Runtime-meta's two-row representation query remains present and unexecuted here.

Reset ownership stays exactly the original four runtime tables, excluding ledger, domain/evidence and application data. Required absolute closed immutable packaged roots, no-create ownership, same-copy seal/reset epoch, cancellation, native transaction/currentness and drain/quarantine guards were not amended.

The supplied accepted standalone SQLite3.53.2 experiment and reconciliation cover45 target tables plus ledger,103 objects,14 explicit/43 implicit indexes,nine CHECKs/nine explicit BINARY fields and51 ledger identities. Its clean strict close/481 finalized statements and independent RESULT/post-stop proof are separate evidence: they do not mean this repaired K validator or its runtime-meta row check ran, or establish row preservation/adoption.

Coordinator should wait for this K4 freeze and the disjoint Native6 author freeze, then perform fresh focused lint/type checks and independent source/native-boundary reviews. K validator invocation and D runtime consumption remain separately held. No D/Auth5/Backend4 allocation, PG physical/transaction admission, pre-append provenance, file-backed/restart/restore adoption, writer-closure proof, generic COMMIT, Auth/provider activation or real-data/production action is released by this publication.

## Exact two-line narrowing repair — source freeze

Under the coordinator-supplied asset/root identity reviewer's PLAN APPROVED (`ses_ecdbbf2e0ffeXETP1cfcu4VNqA`), only `packages/db/main-target-catalog.ts` lines403–404 were replaced: `tables.find((table) => table.name === "integration") ?? reject()` now establishes the required integration value, followed by the unchanged sole-FK count rejection without the redundant missing-value branch. The existing callback, owner string and rejection function remain; no helper, error, comment, cast or assertion was introduced.

Actual writes in this mechanical lease are only those two source lines and this appended publication section. All descriptors, defaults, negative checks, fingerprint recipe, pins, assets, roots, exports, other three allocated source files and COPY1 remain untouched. The accepted `TEMP/nitro-k4-source-repair-89ey398f/source-after-and-pin-proof.json` baseline evidence was not overwritten. No Auth or Native6 file was touched.

This freeze is ready for independent review and the coordinator's fresh four checks; their outcomes are not claimed here. No commands, checks, hash helpers, lint, builds, evaluation, tests, native/SQL execution, environment/configuration/data/secret access or nested agents were performed. The separate Auth mapper/header findings remain outside this lease. No D author, native/runtime invocation, adoption or activation release follows.
