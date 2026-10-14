# K history — finite descriptor scope approval

## Decision and release boundary

**APPROVE the prospective finite expansion to all four historical PK orders and the existing integration inline FK exception, through one coherent module-owned expected physical descriptor.** The three newly identified PK orders need no further scope approval if implemented exactly as below. This is source-history authority approval, not physical-target ACCEPT or an edit release.

Choose the existing capture-before-implementation gate: obtain the full bounded native metadata comparison and resolve every unexplained difference before the coordinator explicitly releases the frozen K four-file owner. Current K source ACCEPT remains **WITHHELD**, those product files remain frozen, and D remains unallocated. No manufactured native PASS substitutes for missing observations.

Only this report was written. Read the entire240-line `convergence-K-history-reconciliation.md`, the earlier Oracle plan, the relevant SQL0000/0004/0034 clauses, current snapshot PK/FK/collation excerpts and current column/table matcher. A scoped SQL text search corroborated that the four table names occur only in their original CREATE declarations. Did not repeat the full51-file audit or independently rehash assets. No commands, checks/tests, compilation/evaluation, native/SQL execution, environment/data/secret access, other writes or nested agents occurred.

## Verified finite semantic authority

The full-history report supplies the last-definition audit and complete inventory. Direct clause reads corroborate these exact replacements:

| Exact owner                   | Approved physical signature                                                                                    | Immutable source clause                                                     |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `boardUserPermission`         | Unnamed standalone PK `(board_id, permission, user_id)`                                                        | `packages/db/migrations/sqlite/0000_talented_ben_parker.sql:38`             |
| `integration_item`            | Unnamed standalone PK `(integration_id, item_id)`                                                              | Same SQL0000:102                                                            |
| `integrationGroupPermissions` | Unnamed standalone PK `(group_id, integration_id, permission)`                                                 | `packages/db/migrations/sqlite/0004_peaceful_red_ghost.sql:5`               |
| `integrationUserPermission`   | Unnamed standalone PK `(integration_id, permission, user_id)`                                                  | Same SQL0004:14                                                             |
| `integration.app_id`          | Nullable TEXT/no default; exactly one unnamed inline `REFERENCES app(id)`; update/delete NO ACTION, MATCH NONE | `packages/db/migrations/sqlite/0034_add_app_reference_to_integration.sql:1` |

Source0000/0004 declarations retain their other columns and cascading FKs unchanged. Source0034 omits action clauses; its fixed SQLite default actions are not the terminal snapshot's delete SET NULL. The current snapshot's four logical PK orders differ from the table above. They are not alternative physical orders to accept. No later definition was found for these four tables in the scoped search; the full-history report records the complete subsequent-history audit.

Accepted source identities, transcribed from the existing capture/history report rather than recomputed here:

- SQL0000: `c6fd51d50bbe0a63eaab178e83dc81b202a9b6eb5fe714abfb8a1c19a45b7a44`.
- SQL0004: `a380540721b601bee0317d30272a23cf8d4a8955413d4d8ec6232ca516097e05`.
- SQL0034: `54300d3a35b8a832d98d5c810e1712bf9d776290a678fa92db303affab1963ae`.

These five semantic differences form the complete **source-reconciled exception scope**, not an asserted exhaustive native representation-difference set. Native discrepancies outside it remain unresolved until separately reviewed.

## One descriptor, every enforcing consumer

Build one private, detached, deeply immutable physical descriptor for the45 expected SQLite tables, retaining the pinned0050 snapshot as the closed baseline and applying only the exact four PK replacements and integration FK form/action replacement above. Internal fixed object construction is allowed; runtime SQL interpretation, historical migration replay, a mutable registry or candidate-supplied descriptor is not. Do not mutate the imported snapshot or its bytes. All replacements are literal module-owned expectations bound to reviewed source history before any candidate observation.

Use that same descriptor throughout:

1. **DDL:** exact ordered standalone PK tokens and their source-owned unnamed form. Logical snapshot constraint names do not mint new allowed physical names. Do not keep both snapshot and historical PK orders as accepted variants.
2. **Table xinfo:** PK ordinals follow the approved order for each of the four tables. Column CID remains the measured name-to-CID mapping; neither PK order nor terminal JSON insertion order becomes a physical column-order requirement.
3. **Index proof:** implicit PK index ownership/name/origin/uniqueness/partial flags, ordered key terms and rowid auxiliary metadata must use those same PK orders. Do not add another index to satisfy the discarded snapshot order. All14 explicit index definitions remain unchanged.
4. **Integration FK:** consume the inline clause on `integration.app_id` exactly once, matching only `app(id)` without invented action clauses or a physical constraint name. Account for this consumed reference in the same expected FK set; reject a missing, duplicate, extra, conflicting or standalone substitute clause. Independently match the complete PRAGMA FK signature with both actions NO ACTION and MATCH NONE. A generic `REFERENCES` whitelist is not approved.
5. **Whole catalog and identity:** object inventory, derived bounds and every assertion see the same closed descriptor. Bind the revised internal physical-definition version and its fixed semantic expectations into the deterministic target identity; do not fabricate an evaluated fingerprint or continue treating the obsolete physical definition as unchanged. Public/private entrypoint signatures and packaged-root contracts stay stable.

No independent DDL-only, xinfo-only, index-only or action-only workaround is approved. No schema supplied by a caller, mutable expected table, candidate-metadata projection, permissive fallback, acceptance callback or arbitrary legacy-column exemption is introduced.

## Correction to the earlier COLLATE diagnosis

**Retract the claimed current runtime COLLATE rejection in `convergence-K-reconciliation-plan.md:15`.** The current0050 snapshot encodes `text COLLATE BINARY` in all nine owning runtime column type strings. `assertColumnDdl:510–512` tokenizes and consumes the entire expected type prefix before entering its suffix loop; lack of a suffix COLLATE branch does not establish the previously claimed rejection for these actual descriptors.

Do **not** add a COLLATE parser branch, change those type strings or broaden normalization in this finite repair. Preserve owner-specific explicit BINARY proof for history entry/stream `epoch,kind,name`, runtime meta `epoch`, runtime state `epoch,key`, including nonindexed columns, and the independent exact0049 anchor token match. Preserve index collation checks. An actually observed collation/representation failure would need evidence and a new bounded amendment; this source correction does not assert native success.

The retained-column omission claims are already corrected: `icon.url`/`checksum`, `custom_widget_v2_definition.template`, `search_engine.description`/`url_template` exist in the current snapshot. Preserve them exactly; no duplicate addition, snapshot rewrite or removal is licensed.

## Closed invariants and pin repair

All45 table/column sets, types/nullability/defaults, ordinary/hidden status, the14 explicit indexes and9 named CHECKs remain closed as specified by the full-history report. Outside the five exact semantic replacements, do not change accepted PK/FK signatures or forms, constraint names, defaults/literal contents, check expressions, collations, index order, implicit-index inventory or unsupported-clause rejection. Preserve exact ledger structure/full51 ordered history, statistics exceptions, original runtime-meta representation checks and overflow limits. Source inventory counts are expectations, not measured results.

The separate0030 pin repair remains required: use exactly **`42267f940cd3b2c1b81da89756ac2166386a5b58f0baa99ea86e99673054ecd0`** from the accepted `whole-source-asset-pins.json`. Validate the other compiled pins against that existing authority; do not recapture different assets to make the constants pass. No pin or product edit was made here.

All SQL, snapshots, journals, prior capture/receipts and published assets remain untouched. Runtime0049 retains its original index49 identity/DDL/snapshot; credential0050 remains the separate complete tail50. No new migration, history rewrite, shortened target, public export, schema framework or raw SQL execution loop is authorized.

## Required gate and preserved holds

Coordinator reports the metadata host launcher failed `asset_path` preflight before container/native execution because of its hyphen pattern. Treat this as **no native observation available**, not a migration failure, schema mismatch or attempted native PASS. Launcher repair is under a separate Oracle allocation; this report changes neither launcher/control nor execution/retry authority, paths, manifests or containment. No workaround, wider mount or relaxed pin proof is licensed here.

Before implementation release, the separately authorized capture must authenticate the immutable full asset copy and produce complete untruncated metadata/closure evidence under the existing envelope. Compare every record with the source-fixed full-history table: all45 tables, actual ledger,14 explicit indexes, complete PK autoindexes,9 checks,9 explicit runtime BINARY fields, defaults/FKs/hidden fields and full51 ledger identities. Native recording/rename representations remain observations to reconcile, not authority to infer new expectations. Any unexplained semantic difference, asset mismatch, truncation, missing closure or failed native migration keeps release held; obtain further Oracle disposition rather than expanding the descriptor silently.

If that comparison fits this approved finite scope, coordinator may separately release the existing owner for `packages/db/main-target-catalog.ts`, `packages/db/copied-runtime-catalog.ts`, `packages/db/migrations/compatibility.ts`, `packages/db/copied-sqlite.ts`, with repairs concentrated in the first file. This report does not itself release those files. Subsequent source review and focused coordinator lint/type validation remain required. Metadata capture does not execute the repaired validator or observe its runtime-meta row check, and cannot alone clear physical source ACCEPT or populated preservation.

Preserve prefix-versus-complete-target checks, immutable explicit roots, copy identity/reset/seal/currentness/lifetime/closure safeguards and four-runtime-table-only reset ownership. Domain/evidence/adoption semantics stay unchanged. Backup `migrationsFolder` diagnostics and production closed-root packaging/config are separate held joins. D consumer allocation, app boot, private credential/adoption/activation, PG physical/transaction admission, pre-append provenance, file-backed/existing/restart authority, populated conservation, writer closure, generic COMMIT, Auth HTTP/provider publication and real restore remain held.
