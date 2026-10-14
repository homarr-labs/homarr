# Board source-query candidate delivery

Oracle approved `BOARDS-WAVE.md` with the active-Stage-G fixture qualification. This delivery is **nine direct, unmounted query candidates**, not accepted consumption, host exposure or completion of #26–34/#38/#125. Independent source/interface review is still required. The central checkpoint remains **91 reviewed / 243 pending**, and its 334 identities and 26 board tuples were not edited or recounted as implemented by this worker.

## Narrow P2 correction for re-review

Independent SPEC review found one P2 in `board.exists`: catching every ORPC CONFLICT also swallowed a post-read currentness CONFLICT as occupation. The correction changes only `routers/board.ts`, `routers/-boards/access.ts`, the existing deferred `checks/boards.mts` and this handoff. The other eight query bodies, resource/scope contracts and all seventeen absent identities remain unchanged; central 91/243 is unchanged.

`BoardNameConflictError` is an internal ORPC CONFLICT subtype with the original `Board with similar name already exists` message, instantiated only when the actual source case-insensitive comparison finds a non-ignored board. The handler catches only that subtype. SQL/read/lease errors, including ordinary ORPC CONFLICT, propagate unchanged; no assertion error-code restriction or catch-and-recheck was introduced. Existing occupied-name fixture behavior is preserved.

The tiny added deferred regression calls the actual exists factory for `UnoccupiedBoard` in the existing coherent two-board SQL fixture. It injects CONFLICT only at the post-read lease assertion, while subsequent assertions would succeed. It requires rejection with that exact error, exactly three assertions (no final-fence conversion), one actual SELECT, and awaited release through a controlled completion gate. No mock SQL or new fixture graph was constructed, and **this regression was not executed**.

Narrow correction validation, all with env-file loading disabled:

- `bun --no-env-file run node_modules/typescript/bin/tsc -p packages/api/src/nitro/routers/-boards/tsconfig.check.json --pretty false` — final exit 0, no diagnostics; existing explicit board roots and real transitive type closure only. An initial delta diagnostic required explicit generic arguments for the pinned ORPCError subtype; fixed with `ORPCError<"CONFLICT", unknown>`, not a cast/suppression.
- `bun --no-env-file run node_modules/oxlint/bin/oxlint packages/api/src/nitro/routers/board.ts packages/api/src/nitro/routers/-boards/access.ts packages/api/src/nitro/checks/boards.mts` — exit 0, no diagnostics.
- `bun --no-env-file run node_modules/oxfmt/bin/oxfmt --check packages/api/src/nitro/routers/board.ts packages/api/src/nitro/routers/-boards/access.ts packages/api/src/nitro/checks/boards.mts` — pass, exactly three files.
- `shasum -a 256` over those three corrected code/check files — current hashes in the table below; other owned rows retain their original unchanged delivery hashes. No active-owner graph was hashed or rebaselined.

Actual SQLite checks remain held at the current active Core scope / DB runtime / private-gate graph, as corrected below from the historical PG-driver allocation wording. No runtime, pure-helper fixture, database or provider check was run for this correction. This is a frozen minimal source/static-validation delivery for narrow re-review, not nine-query/dual-engine acceptance or permission to consume/mount.

## Owned delivery and exact partition

Only these new files were written:

- `packages/api/src/nitro/routers/board.ts`: `createBoardProcedures`, `createBoardContribution`, literal implemented/pending identities, local source bindings and original REST/MCP projection metadata.
- `packages/api/src/nitro/routers/-boards/resources.ts`: candidate `BoardProcedureResources` / `BoardReadLease` with explicit tables, operators, actual definition functions and schemas.
- `packages/api/src/nitro/routers/-boards/scope.ts`: tracked consumer scope, immutable policy identity, current-principal matching, abort/currentness fences and awaited release/native-read drain.
- `packages/api/src/nitro/routers/-boards/access.ts`: actual source access/context/name/search SQL helpers adapted to the frozen public policy.
- `packages/api/src/nitro/routers/-boards/reads.ts`: actual public/group/summary/settings/ACL SQL bodies and projections.
- `packages/api/src/nitro/routers/-boards/overview.ts`: actual source preview query graph and root/container/item projection.
- `packages/api/src/nitro/routers/-boards/tsconfig.check.json`: explicit owned roots and installed declaration resolution, no new declaration stubs or diagnostic suppression.
- `packages/api/src/nitro/checks/boards.mts`: deferred disposable-fixture seeding and narrow actual-factory SQL/projection/currentness assertions. No top-level invocation, DB construction, live imports of schema/DB/Core or automatic fixture creation.
- This handoff.

**Nine bodies:** `board.exists`, `board.getPublicBoards`, `board.getBoardsForGroup`, `board.getAllBoards`, `board.getManageOverview`, `board.catalog`, `board.search`, `board.getBoardSettings`, `board.getBoardPermissions`.

**Seventeen absent/pending:** `board.createBoard`, `board.duplicateBoard`, `board.renameBoard`, `board.changeBoardVisibility`, `board.deleteBoard`, `board.setHomeBoard`, `board.setMobileHomeBoard`, `board.getHomeBoard`, `board.getBoardByName`, `board.saveLayouts`, `board.resetLayout`, `board.savePartialBoardSettings`, `board.saveBoard`, `board.saveUserBoardPermissions`, `board.saveGroupBoardPermissions`, `board.addItem`, `board.updateItemLayout`.

No held procedure, repair-disabled handler, seed/repair function, mutation service, draft substitute, tRPC caller, separate board catalog/controller, cache, permissive production principal or home algorithm was added. Auth policy/crypto, source routers/access/home/certificate helpers, central map/index/context/procedure/contribution, DB/Core, host/UI and all manifests/dependencies/lockfiles remained read-only.

## Source mapping and retained behavior

| Candidate           | Actual source in `packages/api/src/router/board.ts` | Retained source boundary                                                                                                                                                                                                                                                                                      |
| ------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| exists              | 283–296, 2569–2587                                  | board-create gate; all-board ID/name read; JavaScript case-insensitive comparison; CONFLICT means true. Private occupation is intentionally visible to creator-capable callers. No trimming, LIKE rewrite or name-schema substitution.                                                                        |
| getPublicBoards     | 297–306                                             | Public `isPublic = true`, only ID/name/logo; no invented ordering.                                                                                                                                                                                                                                            |
| getBoardsForGroup   | 307–337                                             | Caller admin; target-ID OR everyone-name group union; actual permission-child expansion; target grants/public fallback, not caller-admin all-board scope. Missing target group does not become NOT_FOUND.                                                                                                     |
| getAllBoards        | 338–392, 2889–2922, 2942–2959                       | Parallel source user-grant/membership/home reads; caller-expanded global view predicate, creator/public/granted IDs and source conditional empty-ID term. Creator email retained. Actual summary output schema strips ACL rows to permission only.                                                            |
| getManageOverview   | 393–655 and access helpers                          | Target-self/admin check before SQL; DB target-group globals, not caller-global view. Source row limits, base-role-first layout, root ordering, nested SQL and geometry retained.                                                                                                                              |
| catalog/search      | 213–280, 656–667                                    | One actual SQL search helper; sequential grant/membership/full-internal-user reads. Caller globals, public/creator/grant predicate, source empty IN term, `%query%` LIKE, name-only ascending order and raw query/fractional-number schema retained. Only home comparisons use the private internal user row. |
| getBoardSettings    | 1223–1281                                           | Protected modify guard before settings SQL; exact fields and seven null-to-empty conversions; actual output schema. Missing/denied both NOT_FOUND `Board not found`. No full-access upgrade or stored-CSS repair.                                                                                             |
| getBoardPermissions | 2143–2214                                           | Protected full guard before ACL SQL; actual parent expansion for instance-wide inherited group globals; source complete board target grants and user email, null-name locale sorting. No added admin gate or membership restriction on authorized detail.                                                     |

The source guard at `router/board/board-access.ts:16–75` preserves authenticated membership subquery versus anonymous empty-group predicate and current-user ACL SQL. It passes actual ID-bearing evidence to frozen `decideBoardAccess`; guard group IDs come only from the membership-filtered relation query, not arbitrary supplied ACL IDs. Search policy group IDs come from its actual current-user membership read. No permission inheritance matrix is copied into this package.

Summary and settings outputs are schema-parsed inside the lease before the final fence, and retain oRPC output contracts. Invalid outputs fail internally without putting raw result/validation contents into a public error. The frozen backend error adapter remains the protocol owner.

### Nested preview projection

Overview selects the source first layout and all empty roots, then parallel root item/child section layouts over the source aggregate IN sets, one additional item query for container IDs, and app ID/iconUrl lookup. It retains x/y ≥ 0, positive dimensions, y < preview row limit, 12/default and 48/full behavior. It does not add recursive traversal, correlated predicates, right-edge clipping, different layout normalization or repair.

First roots per source lane, source lane widths, root/visible-container membership, null preview when no layout, serialized item options, malformed-app-options icon omission, and the **nested `layouts[].item.{kind,options}` and `layouts[].section.{kind}` values are retained**, not reduced to flattened descriptors. Overview creator does not include email. Summary creator and full-authority ACL user email are intentionally present. Source overview assumes coherent stored relationships; aggregate IN-set reads are not proof against malformed cross-board references. Stored visible item options/CSS/URLs remain source user-controlled data, not executable instructions or a credential DTO.

## Candidate resource and ownership boundaries

`BoardProcedureResources` supplies existing functions/schemas via `typeof` public type-only signatures from `@homarr/definitions`, `@homarr/validation/board` and `@homarr/validation/common`, and table/operator types from `@homarr/db` / `@homarr/db/schema`. Runtime source imports are installed oRPC/Zod/SuperJSON, accepted local backend spine and frozen `@homarr/auth/nitro/policy`. No broad definitions/validation/Common-server/DB/schema runtime barrel is imported by the factory. Broad pure-function/schema producer graphs still require composition review; declared type compatibility is not graph acceptance.

The new lease must be independently accepted and produced from real current authority and ordinary tracked persistence admission. It supplies a current immutable principal, matched database/schema/operators, `assertCurrentAsync` and awaited `releaseAsync`. Consumer checks request/principal kind and authenticated ID, snapshots expanded permissions, rechecks named permission/protected/target gates against the lease identity, and fences before every read, after every read await and after output projection. Parallel reads remain source parallel reads; when one fails, outstanding tracked promises settle before release. Late acquisition enters finally and is released. Abort does not claim physical SQL cancellation.

The producer must keep admission alive for the whole operation through release; returning a DB handle after a `withDatabaseAsync` scope has ended is invalid. Currentness must fail closed on revocation, deletion or membership/permission changes. A consumer assertion or fixture identity is not an implemented authority store, Q16 decision, session verifier or zero-latency HTTP/SSR invalidation guarantee. Same admission is **not MVCC/read-transaction isolation** across the source separate SELECTs. No new Stage-G methods, asynchronous Bun SQLite transactions, sessions/client internals or backing interface changes are used.

No cache resource is consumed. No request/private SSR cache or warm-catalog/editor invalidation semantics are claimed. Frozen `createHomeTargetResolver` and React/RSC `board-server.ts` were not replaced or imported. Both full-board Q identities remain absent because `getFullBoardWithWhereAsync` performs protected-layout repair writes. A later accepted repair plan, full projection and source home error-boundary join are required; no absence of repair on one fixture promotes those queries. All fifteen mutations require exact concrete authority/precondition/atomic-write/cleanup/invalidation plans, separately from approved atomic-draft domain work.

## Validation performed and held

Installed dependencies were verified before implementation in `packages/api/package.json`: oRPC server/client **2.0.0-beta.43**, Zod **4.4.3**, SuperJSON **2.2.6**, existing Drizzle and workspace public ports. Per EXECUTION's exhausted Context7/no-network instruction, pinned installed first-party declarations were consulted (`@orpc/server/dist/index.d.mts`, `superjson/dist/index.d.ts`, Zod package/v4 entrypoints), alongside accepted sibling source factories; no fetch, install or newer beta API was substituted.

Every executed Bun command used `--no-env-file`:

| Check                                                                    | Exact command                                                                                                                                                                        | Result                                                                  |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| TypeScript, owned explicit roots plus their real transitive type closure | `bun --no-env-file run node_modules/typescript/bin/tsc -p packages/api/src/nitro/routers/-boards/tsconfig.check.json --pretty false`                                                 | Final pass, exit 0, no diagnostics.                                     |
| Lint, only owned code/config directory and check                         | `bun --no-env-file run node_modules/oxlint/bin/oxlint packages/api/src/nitro/routers/board.ts packages/api/src/nitro/routers/-boards packages/api/src/nitro/checks/boards.mts`       | Final pass, exit 0, no diagnostics.                                     |
| Format check, only owned paths                                           | `bun --no-env-file run node_modules/oxfmt/bin/oxfmt --check packages/api/src/nitro/routers/board.ts packages/api/src/nitro/routers/-boards packages/api/src/nitro/checks/boards.mts` | Pass, 8 files.                                                          |
| Actual SQLite SQL/projection/denial/currentness                          | **Not invoked**                                                                                                                                                                      | Held at the runtime graph stop below. No database was opened or seeded. |
| Actual PostgreSQL SQL                                                    | **Not invoked**                                                                                                                                                                      | No PG allocation; unverified.                                           |

Initial owned lint identified an unused destructured table and three style warnings; these were fixed. Initial typecheck reported ten **transitive** diagnostics: five missing `bun:sqlite` declarations and five installed `@homarr/node-unifi` declaration/implicit-parameter errors. The owned config now explicitly loads installed Node/Bun types and resolves the already installed `@types/node-unifi` via its real path, correcting the inherited `${configDir}`-relative declaration resolution. No external file was changed, error ignored, `any` stub introduced or diagnostic filtered. Final typecheck includes the real transitive closure; it is type-only evidence for the bytes observed during that command, not a runtime freeze certificate for active owners.

### Exact SQLite stop edge

The required public runtime fixture schema entrypoint is `@homarr/db/schema` → `packages/db/schema/index.ts` → value import of `createSchema` from `@homarr/core/infrastructure/db` → `packages/core/src/infrastructure/db/index.ts` → value re-export `createDatabaseScope` from `./scope`. The **current active Stage-G correction** owns Core `scope.ts`, DB `runtime.ts`, the private gate and their regressions. The public DB root also reaches that runtime/gate graph. The original fixture qualification described the historical PostgreSQL-driver allocation as active; the owner now confirms that driver was actually unchanged. This corrects the attribution, not the execution hold: the public fixture graph still reaches active scope/runtime code. A schema export declaration does not remove that evaluated ESM graph. No active bytes were rebaselined to establish this correction.

No active runtime/gate/PG file was evaluated, hashed or rebaselined for fixture readiness. No private cross-workspace import, deep private schema path, mock SQL or new export bypass was used. Even the candidate fixture seeds/assertions therefore stay unexecuted until the exact public graph is frozen and independently accepted. TypeScript reading those files for types is not runtime evaluation or stability proof.

The deferred check accepts a **real** tracked disposable database and matching public resource producer plus a real query logger, never a cast fake DB. Its seed helper uses actual source insert builders for two users, visible/hidden boards, a view grant/membership, root/container geometry and serialized app options. It must run only in an explicitly fresh owned SQLite fixture with the actual relation schema; no automatic migrations/defaults/bootstrap are invoked by this module. SQL logger expectations count only fixture read statements, not separately issued authority/provider probes. The actual host/fixture initializer is not supplied or claimed accepted here.

Prepared assertions cover protected/target denial before sensitive SQL, one guard SELECT for denied/missing settings/ACL, inherited private-name occupation for board-create, public projection, permission-only summaries with intended email, hidden-board exclusion in a coherent nested graph, serialized nested options/container relation and icon preservation, default row-limit exclusion, private internal user non-disclosure, and controlled post-read/final currentness loss/abort with awaited release. The narrow P2 regression additionally uses an unoccupied fixture name and a one-shot post-read lease CONFLICT; a later fence would succeed, but the handler must reject that exact lease error without reaching the final fence, and settlement must await the controlled release gate. These are **unexecuted assertions**, not passed tests, live revocation proof, arbitrary malformed-row defense or 26-feature parity. Controlled failure injection wraps an actual lease/query, not a permissive production authority or SQL row callback.

## Frozen owned bytes for independent review

SHA-256 obtained with `shasum -a 256` over only the eight owned code/config/check files; no active-owner graph hash is included. This table records delivery bytes, **not acceptance of any runtime fixture graph**. Handoff itself is excluded from its own hash table.

| Path, relative to `packages/api/src/nitro/` | SHA-256                                                            |
| ------------------------------------------- | ------------------------------------------------------------------ |
| `routers/board.ts`                          | `f87ffd0a83d2d7c022a3adbc02dd982f63553b236ea6526ea2ab931067050ccd` |
| `routers/-boards/resources.ts`              | `d320a0529acc6a8a8c2b0b2f79492de0deb8ca8990bd8afd7cd01db439191b5f` |
| `routers/-boards/scope.ts`                  | `b6207c47b1dfcda06ef0b8f759df408abc72db2d6ec9cb412c41673231443973` |
| `routers/-boards/access.ts`                 | `dd4716f965131f117dbe25c2391ba6cd9f513442c614b6600774b21696c3afc8` |
| `routers/-boards/reads.ts`                  | `0852d8d32dd1aac7c4d00734507345eb78671ee179d5efe931dd0c72be9483a6` |
| `routers/-boards/overview.ts`               | `c0d2f863645e4b4d21febde88c4134b90f5a4195e2c682515418bf2facaa78bf` |
| `routers/-boards/tsconfig.check.json`       | `c12ef2fe1aa5c9bb9f24cafbafd6101a1306e5a1a3ff65a65940b140a4dadc17` |
| `checks/boards.mts`                         | `576d6049fc648a3a23bebc81da3815e033239119f634dd7b40ec785269878976` |

## Remaining acceptance and stop lines

1. Independent review of these exact nine bodies, source asymmetries/projections and candidate lease/schema/function seams before consumption; COMPOSITION alone decides public exports, host assembly and central conservation changes.
2. Accepted frozen clean public runtime/fixture graph, actual tracked admission and current-authority producer; execute the deferred bounded SQL check only after those prerequisites. SQLite and PostgreSQL execution are both currently unverified.
3. Real dual-engine relational SQL, native read settlement/admission behavior, freshness/revocation and malformed-data limits remain actual integration gates, not typecheck claims.
4. Full-read protected-layout repair and fifteen mutation domains, cleanup/invalidation and the atomic draft/save/layout/item/permission/create/duplicate flows remain absent. Infrastructure G proof is not their domain plan.
5. UI theme/viewer/cache/editor/controllers, real auth-engine/session policy Q16, private SSR and protocol mounting remain excluded; no ticket or whole migration completion is claimed.

No environment files, current appdata/backup/credentials, provider/network, listener/browser/container, preserved 3100/3200/3210, installer, Git mutation, tracker or nested-agent work occurred. Files remain uncommitted candidate delivery for independent review.
