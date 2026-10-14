# Convergence K — bounded migration/catalog handoff plan

Planning freeze only. The only write is this new report. Read `WRITER-RULES.md`, frozen `convergence-BP.md`, `convergence-B.md`, `convergence-P.md`, `convergence-C1.md`, the requested catalog/copy/compatibility source, current journals, migration filenames, current terminal assets and DB manifests/configs. D's active runtime/gate/session/schema bodies were not read or modified. No product changes, commands, checks, tests, import evaluation, generation, native/SQL/data execution, secrets, live calls, nested agents or sealed-evidence updates. No acceptance or activation is asserted.

## Present identities, not next allocations

Paths below are repository-relative. Both terminal SQL files and snapshots exist; directory listings contain no later migration/snapshot assets.

| Fact                                  | SQLite                                                  | PostgreSQL                                                        |
| ------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------- |
| Journal                               | `packages/db/migrations/sqlite/meta/_journal.json`      | `packages/db/migrations/postgresql/meta/_journal.json`            |
| Journal version / dialect             | `6` / `sqlite`                                          | `7` / `postgresql`                                                |
| Present entries                       | 50, indices 0–49                                        | 18, indices 0–17                                                  |
| Terminal tag                          | `0049_robust_gateway`                                   | `0017_ambitious_roughhouse`                                       |
| Terminal timestamp                    | `1791712104288`                                         | `1791712152164`                                                   |
| Terminal SQL                          | `packages/db/migrations/sqlite/0049_robust_gateway.sql` | `packages/db/migrations/postgresql/0017_ambitious_roughhouse.sql` |
| Terminal snapshot                     | `packages/db/migrations/sqlite/meta/0049_snapshot.json` | `packages/db/migrations/postgresql/meta/0017_snapshot.json`       |
| Snapshot ID                           | `5ae42910-4b43-479e-8397-09d955abe177`                  | `3039bf24-1cc8-46f0-abfb-35c82c6c986e`                            |
| Snapshot prevId                       | `9afd1ddb-3537-4b7b-b3a7-957c2b94a437`                  | `b61f0f83-6729-48c4-b44a-5379c3289ed0`                            |
| Runtime anchor source → target length | 49 → 50                                                 | 17 → 18                                                           |

`packages/db/runtime-catalog.ts` already binds these exact terminal migrations/snapshots. Its stored SQL/snapshot hashes are recorded constants, not recomputed or independently accepted here:

| Recorded hash    | SQLite                                                             | PostgreSQL                                                         |
| ---------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| SQL SHA-256      | `29d003efc340625e9539d5a133508cb98e6e66342934d295855577074643141e` | `5ca45b95e8d355064a2cd0317c7c5f56b2aab2cc4868fdb2ca32564b5ee81529` |
| Snapshot SHA-256 | `c34fa23c8b1caa400ce0e2082d715cffefba05a5078e4b904512ed0835bd17f1` | `402debe006db3382d23f1077727396d1c13050633d6f247c5d92f6d491ccf81f` |

`packages/db/main-target-catalog.ts` does not exist in the current path search. It is a proposed new K destination, not an existing authority surface. No next tag, filename, index allocation, timestamp, snapshot UUID, fingerprint or final target count is assigned by this plan. Appending assets must not rename, regenerate or reseal the existing anchor.

## Frozen additive requirements; D still owns their schema

`convergence-C1.md:23–34,57–70` fixes:

- `homarr_auth_credential_domain`: singleton `id = 1`, `namespace`, `head_sequence`, `phase` (`initializing` / `ready`). Namespace is canonical lowercase UUIDv4. Head is SQLite INTEGER / PostgreSQL BIGINT, nonnegative checked signed64.
- Existing `session` and `apiKey`: additive `auth_lifetime_sequence` and `auth_write_sequence`, same INTEGER/BIGINT storage; both NULL only before enrollment. Assigned evidence satisfies positive `lifetime <= write <= head`; all sequence exchange uses canonical decimal TEXT/checked BigInt, not JS-number conversion.
- Namespace belongs to the enduring singleton. C1 specifies no per-credential namespace column; K must not invent one from the phrase “namespace/lifetime/write evidence.”
- Exact original session token/user/expiry and key ID/hash/user, actor/provider and original account/profile/membership/grant/FK values remain unchanged. Allocation, explicit initialization, enrollment and ready finalization are C1/D's internal same-native-unit workflow, not migration-time credential rewriting.

The present terminal snapshots contain only the original three columns in each credential table. SQLite `session` has TEXT `session_token` PK, TEXT `user_id`, INTEGER `expires`; PostgreSQL has VARCHAR(512) `session_token` PK, VARCHAR(64) `user_id`, TIMESTAMP `expires`. SQLite `apiKey` has TEXT `id` PK/TEXT `api_key`/TEXT `user_id`; PostgreSQL uses VARCHAR(64) `id` PK/TEXT `api_key`/VARCHAR(64) `user_id`. Both retain cascading user FKs and the session `user_id_idx`. Neither terminal snapshot includes the additive evidence or domain table.

D must freeze the exact two schema declarations, storage mappings, constraints, indexes/defaults and migration/adoption boundary before generation. K must not supply a duplicate schema or guess physical constraint names. A schema migration must not seed a ready domain, reset a head/namespace, enroll/reassign credentials or treat absent metadata as first-adoption permission. C1's explicit initialization/adoption owner remains required.

## Why the current tail assumption must change

`packages/db/copied-runtime-catalog.ts:169–263` currently:

1. Bounds canonical/configured journals by `runtimeCatalog.sqlite.targetJournalLength` and compares every entry with the imported journal.
2. Requires canonical length and its last entry to equal the runtime anchor, and compares `canonical.at(-1)` with the anchor SQL hash.
3. Builds runtime DDL from that last migration and verifies the original anchor snapshot hash.
4. Validates configured migration hashes/timestamps/breakpoints against the canonical prefix and returns its own bundle identity.

Appending an Auth migration without this join makes the canonical journal exceed the old bound and moves the last entry away from the anchor. Merely increasing the runtime target length or substituting the new tail would break the anchor's meaning and DDL extraction.

`assertCopiedRuntimeCatalog` separately authenticates the ledger shape, exact prefix hashes/timestamps and runtime objects/columns/PKs/FKs/indexes/meta row representations. Prefixes ending before the anchor require no runtime objects; the present anchor requires the exact four-table runtime catalog. This is not whole-application schema authentication. `copied-sqlite.ts:91–165` otherwise permits recognized application table/index objects by schema names and broad CREATE prefixes. The new domain must not be trusted merely because D exports a table with that name.

`packages/db/migrations/compatibility.ts` checks only a nonempty bounded migration-history prefix, comparing hashes and timestamps; `migrationHistoryReadLimit` derives its overflow limit from packaged migration files. It does not establish a complete terminal target or authenticate physical Auth/application definitions. Preserve prefix compatibility as a separate check; require a distinct exact-target check for current main readiness.

## One K source phase after D freezes

Coordinator allocates these boundaries exclusively; all are planned, not changed here:

1. **Generated additive assets:** append outputs under `packages/db/migrations/sqlite/` and `packages/db/migrations/postgresql/`, their new `meta/` snapshots, and the two existing `_journal.json` files. Allocate exact new filenames only from actual generator output. Preserve every prior entry and asset. Confirm new snapshot predecessor IDs equal the current terminal IDs above; do not hand-invent the new IDs.
2. **New `packages/db/main-target-catalog.ts`:** bind each accepted complete terminal target to its actual journal, generated SQL/snapshot identities, supported engine/schema and physical definitions. Derive target lengths from authenticated assets, not an assumed single increment. Retain the independent original runtime anchor. Bind all supported main-target tables/columns/defaults/nullability/keys/FKs/indexes/checks/collations and reject unexpected executable objects rather than authenticating only the new domain or four runtime tables. Metadata alone is not physical-schema proof; readiness must actually invoke the complete target authenticator through D's frozen private seam. Do not claim support for arbitrary historical physical schemas from a matching ledger prefix.
3. **`packages/db/copied-runtime-catalog.ts`:** authenticate the full packaged target/prefix bundle independently from the runtime anchor. Locate the anchor by its exact recorded index/tag/version/timestamp/breakpoints/hash, not `at(-1)`. Build runtime DDL from that anchor and retain its original snapshot/hash. Distinguish pre-anchor, anchor-present and accepted additive-target shapes explicitly; any newly supported physical shape must be authenticated. Require the entire accepted target after migration/seal, not merely runtime-anchor presence. Preserve configured/canonical bundle identity checks and overflow rejection.
4. **`packages/db/migrations/compatibility.ts`:** retain ordinary historical-prefix checking and overflow bounds; add/reuse a separate complete-target requirement backed by the new catalog. No caller boolean or row count alone certifies schema/adoption. Exact new helper signatures wait for D's private integration contract.
5. **`packages/db/copied-sqlite.ts`:** use the complete copied target for migration/seal readiness, while keeping legacy runtime reset ownership restricted to the original four runtime tables. Replace reset/seal guards that currently confuse `catalogMigrationCount === runtimeCatalog.sqlite.targetJournalLength` with the complete current target. A post-anchor target must not accidentally bypass reset, temporary-object, transaction, referrer or seal checks.
6. **Root facades/exports only after D private-contract freeze:** proposed `packages/db/runtime-board.ts`, `packages/db/runtime-app.ts`, `packages/db/runtime-auth-credential.ts`, with only necessary amendments to `packages/db/package.json`. B/P contracts/statements and C1 validation/statements remain frozen producer inputs. Export only D-approved fixed types/surfaces; do not expose raw readers, private allocator/initialization/adoption composers, arbitrary maintenance callbacks, credential selectors or unsettled authority receipts. Current package exports include `./runtime`, `./runtime-state`, `./runtime-auth-session`, `./copied-sqlite`, but not these three proposed subpaths. D alone changes runtime/gate/session/schema bodies and wires their private calls.

### Preserve copy reset semantics, not Auth metadata loss

The existing reset uses one immediate transaction, deletes `homarr_runtime_history_entry`, `homarr_runtime_history_stream`, `homarr_runtime_state`, `homarr_runtime_meta` in that order, and inserts meta `(1, newly owned UUID epoch), (2, NULL)`. It requires converted ready content, no active outer transaction or temporary objects, authenticated catalog, no non-runtime FK referrers, and verifies empty runtime contents plus owned epoch before recording reset success. Seal rechecks those conditions before its snapshot operation.

Keep that four-table operation unchanged in meaning. Do not widen the `homarr_runtime_` object/reset family to include `homarr_auth_credential_domain`, and do not delete/reset/rotate/reseed domain namespace/head/phase or credential lifetime/write evidence. Authenticate the added target explicitly and preserve existing domain/evidence, including an initializing phase; an old image newly receiving additive NULL evidence is not automatically adopted. If approved D constraints introduce a prohibited runtime referrer, retain rejection and resolve the design with D, not by bypassing the guard. A copied runtime epoch reset is not durable Auth reconciliation, and preserving a valid restored domain still does not prevent bearer resurrection. Real restore/replacement activation stays held.

## Minimal authoritative asset generation, later only

Declared tooling is already present: DB depends on `drizzle-kit` and `drizzle-orm`; root catalog pins `0.31.10` and `0.45.2`. DB declares `migration:sqlite:generate` and `migration:postgresql:generate`, each using `drizzle-kit generate` with its corresponding `packages/db/configs/{sqlite,postgresql}.config.ts`. Both configs use `schema: "./schema"`, engine-specific output folders and `DB_CASING`, whose actual value is `snake_case`.

Do not invoke those scripts in this task: they run `with-env`, which loads `../../.env`; the configs import `dbEnv` and include connection credentials. Nor is import evaluation permitted here. No tooling/documentation API behavior is assumed verified beyond these local declarations.

After D's schema freeze, request separate coordinator authorization for local artifact generation. The smallest proposed source preparation is two credential-free generation-only configs (new paths to allocate), using the existing installed `drizzle-kit`, literal dialect/casing, an explicit frozen engine schema entry and the existing engine output folder. No `dbEnv`, `.env` wrapper, connection credentials or new dependency. Coordinator must first verify the frozen schema entry is import-safe and the installed generator supports this configuration; if it imports forbidden runtime/native/data code, stop rather than evaluate it. Use ordinary generate only, never migrate/push/drop/seed/custom-run or application execution. No installs.

Capture actual SQL/journal/new-snapshot outputs and their identities only after that authorized generation. Review the diff for additive-only Auth changes and unchanged original credential/runtime definitions; unexpected renames, reconstruction or unrelated drift block catalog sealing. Preserve any required preservation edits explicitly and record generated versus final SQL identities separately, as the existing runtime catalog already does. Do not fabricate Drizzle metadata or resnapshot existing sealed evidence to unblock K. If generation remains prohibited, catalog sealing and final exact asset allocation remain blocked even after D freezes.

## Start/finish gate

Start when D supplies frozen schema paths/constraints and a private catalog/readiness contract, plus its facade allowlist. B/P/C1 producer reports are already frozen inputs, not permission to inspect D's active bodies. Authoritative generated assets are additionally required before K can seal target identities; no guessed next count or path substitutes for them.

Finish with one source handoff listing actual generated paths/identities, exact new catalog/compatibility/copy changes and root exports, and remaining D/Auth/host/writer-closure dependencies. Coordinator owns focused lint/type checks after reached writers freeze. SQLite is the first producer target; PostgreSQL migration/catalog metadata does not clear its separate transaction/lock/admission hold. This phase does not mount Board/App, enable generic COMMIT, activate adoption/restore or assert compiler/runtime/procedure acceptance.
