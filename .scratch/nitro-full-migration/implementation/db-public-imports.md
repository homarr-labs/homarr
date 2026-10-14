# DB public imports — seven-file mechanical freeze

2026-10-11. **The exact seven allocated import-only edits are complete and frozen for review.** This is mechanical preparation, not B/D graph, Stage P, G behavioral/standards, P1 or ticket acceptance. Lint, typecheck, build, tests, format and installation are **DEFERRED / outstanding**, not passed by this lane.

## Returned declarations checked before editing

Read `implementation/server-public-ports.md` and the actual Common/DB manifests and target source. The declaration report identifies candidate HEAD `c009cba62d8ffab1d19186e4df62674b616979fd`; this lane ran no Git command and does not independently certify HEAD. Actual Common and DB manifest hashes match that report's narrow returned candidates:

- `packages/common/package.json`: `c88775b0e38b1a8e17750630b7332d8549ca8d646dfb19c29045bd212afc7816`.
- `packages/db/package.json`: `a92b850d2bc0ceecc63e754fbd69f91154e8d516cee44363df8972e566602230`.
- DB already declares `@homarr/common: "workspace:^0.1.0"` and direct `zod: "catalog:"`; neither manifest nor lock was changed here.

| Public port                     | Actual declared target    | Source finding                                                                          |
| ------------------------------- | ------------------------- | --------------------------------------------------------------------------------------- |
| `@homarr/common/number`         | `./src/number.ts`         | Existing `defaultByteUnitSystem = "decimal" as const`                                   |
| `@homarr/common/object`         | `./src/object.ts`         | Existing `objectEntries` and `objectKeys` implementations                               |
| `@homarr/common/id`             | `./src/id.ts`             | Exact `export { createId } from "@paralleldrive/cuid2";`; Common already declares CUID2 |
| `@homarr/common/grid-algorithm` | `./src/grid-algorithm.ts` | Existing `generateResponsiveGridFor`, no imports; algorithm unchanged                   |
| `@homarr/common/error`          | `./src/error.ts`          | Existing `FlattenError` and `extractErrorMessage`; no consumer added here               |
| `@homarr/common/request`        | `./src/request.ts`        | Retains runtime `next/server`; not a selected runtime-safe port and not consumed here   |

All six declared targets exist. **Missing ports for this allocation: none.** The former root resolves through `packages/common/index.ts` → `src/index.ts`, which reexports the same number, object, id and grid files. No target implementation, ID function or algorithm was imported/evaluated. These source observations do not certify the full transitive runtime graph.

## Exact frozen seven-file delta

All paths below are relative to `packages/db/`; every symbol and local binding is retained.

| File                                                           | Only allocated import change                                                                                                                           |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `schema/sqlite.ts`                                             | `defaultByteUnitSystem`: `@homarr/common` → `@homarr/common/number`                                                                                    |
| `schema/postgresql.ts`                                         | `defaultByteUnitSystem`: `@homarr/common` → `@homarr/common/number`                                                                                    |
| `collection.ts`                                                | `objectEntries`: `@homarr/common` → `@homarr/common/object`                                                                                            |
| `migrations/custom/0000_release_widget_provider_to_options.ts` | `createId`: `@homarr/common` → `@homarr/common/id`                                                                                                     |
| `migrations/custom/0004_unify_sections_and_gutters.ts`         | `createId`: `@homarr/common` → `@homarr/common/id`                                                                                                     |
| `queries/widget-placement.ts`                                  | `createId`: `@homarr/common` → `@homarr/common/id`                                                                                                     |
| `migrations/seed.ts`                                           | Split existing `{ createId, generateResponsiveGridFor, objectKeys }` root import into `/id`, `/grid-algorithm`, `/object` imports in that symbol order |

Schema `import type { ByteUnitSystem } from "@homarr/common"` remains untouched. Existing test imports and all other callers remain outside allocation. There are no body, comment, default, field, migration-order, query, ID-generation or algorithm edits. Seed body formatting and the reported historical format failure / seven SuperJSON warnings remain untouched and uncleared; no formatter or diagnostic command was run.

## Reversible source-byte proof

Before editing, read-only Node scripts using only `node:fs` and `node:crypto` hashed actual file bytes. After patching, the comparison required exactly one whole-line allocated replacement per file. Reversing that replacement **in memory only** reproduced each pre-edit SHA-256, including the seed's three-line-to-one-line reversal. No source/runtime package imports, environment file, factory, SQL or filesystem write occurred in those scripts.

| File                                                           | Before = reverse SHA-256                                           | Frozen after SHA-256                                               |
| -------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `schema/sqlite.ts`                                             | `e4c1e4bda519fb61bdfbb4390a4db787d86fade96209df44a806325b6315e090` | `5d4cd3295f4154e27e981f9f9c749cf90a770143fb267f2d5a04a598d434b5dd` |
| `schema/postgresql.ts`                                         | `c8ec5717b63c130470878cb267942594db0f068f4a00018dd152efac4d7aa408` | `d936a9c1d397d6b4c65c2bfd848d46b0c54ff6f081390ccc3e124e13a45b9119` |
| `collection.ts`                                                | `4e9f385ceef46978fd7a69b62402dc2789d44ef6ccc0a11a22c50496d5311157` | `eef64d9e27d94bf0888decf47a2def8f87717d759f90147d72c913a124e79d49` |
| `migrations/custom/0000_release_widget_provider_to_options.ts` | `72ceba1e172b2eefdf809a620967a785b84ff22e74d6e36cce2ebda73234e9ee` | `69c82d2c1b3a48f8aacdaf568bb80c50cfa6a5b6baed22bb0430a372c5a80133` |
| `migrations/custom/0004_unify_sections_and_gutters.ts`         | `eee0e75a9f4d89cb4b8e692edc435ba2fa8887457e64ec4ea9b1b282b82385b0` | `b934fbb1ac1fe5765e39e7d9831f5dd9b28f984eadfe8cbdaea21ff35881cf23` |
| `queries/widget-placement.ts`                                  | `78a7cd4142693b1a2586b7197c7f0c840b5feabb7071fa81a76d160ad5a6bc8c` | `e91e876f9c4f4285540cc94b7dd79dc2934d54127785ae2e7ae9c640769da042` |
| `migrations/seed.ts`                                           | `93b4cc115087f551e78f1290cb6d4eacb178edc1546f46a9a69b3dee167f84bd` | `022b9ab9e779875f4ccde5e8a45e14af81c1fd87585d9db579a2734fd557faff` |

This is the explicit **source-byte exception** for schema/custom-migration/algorithm callers: whole-file hashes change solely at the approved import declarations. Every other source byte is preserved, including all 40 domain model definitions, defaults, ordering, serialized-value handling and caller bodies. The target functions/constants remain identical source exports. This establishes mechanical source equivalence, not newly executed runtime parity; older raw-source aggregate hashes must not be asserted unchanged across these seven intentional edits.

## Frozen preservation evidence

The other **180 regular files under `packages/db`** are unchanged across the edits. Traversal excludes `node_modules` and `.turbo`; paths are sorted; aggregate encoding is SHA-256 of `JSON.stringify(paths.map(path => [path, SHA256(fileBytes)]))`. Before and after aggregate:

`fd872230cde7c16ca400e941ac91898a5e8e6c4048765c42985dfd42c0c47f65`

That preserved set includes DB manifest, copied SQLite engine, G3 runtime/private gate/existing regression, all other migrations and schemas, and query files outside allocation. Physical migration trees were separately hashed with the same encoding:

| Preserved physical tree | Regular files | Journal identities | Before = after aggregate                                           |
| ----------------------- | ------------- | ------------------ | ------------------------------------------------------------------ |
| `migrations/sqlite`     | 100           | 49                 | `a8ce4a165bae33222f5c615c156605204557ae535ea4e81319ace48658b4dfce` |
| `migrations/postgresql` | 36            | 17                 | `7539bd9820f30eec92c1a4f099501da98cc7f2da05a155f03779f244d445e1c5` |

Thus original SQL, journals and snapshots remain byte-identical; no append-only migration, generated SQL or physical schema was added. Additional before/after guards preserve Common manifest, both Common root reexport files, all six checked target sources, `bun.lock`, and Core `scope.ts`. The target ID and grid hashes still match COMPOSITION's returned source identities:

- Common `src/id.ts`: `db2df2b4d25b565375c4fdd1d47a7ee25749c15dcfa9b3317ce46d997bbf4372`.
- Common `src/grid-algorithm.ts`: `e439feb31aa287924386b743e458bfddf8edf24dbc188954e65b7a9bd3a53ab6`.
- Core G3 `scope.ts`: `3ad2a7c13b3905700f02b7c05947772b4be3a9065d7625014ad3599de81bd3fc`.

## Return and stop line

Only the seven existing source files and this new handoff were written, using the patch tool. No copied-SQLite/G3/Core/header/policy/manifest/lock/central API/other-owner edits; no SQL generation, provider/network/env/credentials/current data, factory/runtime evaluation, listener/browser/container, Git, nested agents or polling. Preserved 3100/3200 resources were not touched.

**Validation remains outstanding:** no lint, typecheck, build, test, format or install command was run. This handoff's successful source comparisons do not replace those checks. Review this exact seven-import freeze before any Stage P allocation; subsequent full-migration validation and exact final runtime graph evidence belong to separately authorized owners. Nothing here clears B/D graph holds, P1s, G reviews, host/restore parity or tickets.
