# Remaining board source procedures — frozen, unmounted HOLD candidates

## Execution decision

Do not execute or mount these candidates. Genuine current authority, policy-to-COMMIT, media/style policy, request-owned cancellation/draining, and the whole-board atomic domain-draft producer are not ready. The resource type contains only `execution.kind: "hold"`, with no ready branch, commit callback, or invented producer. Every candidate runs an unconditional `PRECONDITION_FAILED` HOLD middleware after the existing source demo/auth/global-permission middleware and before input validation or handler execution. Cancellation is checked before that HOLD. The additional HOLD is deliberately not a legacy business error or a claim of runnable source equivalence.

`createBoardMutationProcedures` contains real native oRPC bodies and concrete source SQL/preparation algorithms, not an accepted executable mutation surface. Existing `BackendContext.db` and actual driver transaction signatures are used without a new database interface. The SQL statements, narrow resource declarations, local serialization maps, and source permission projection do not supply current-authority leases, a policy-to-COMMIT interval, complete atomic repair/content/grant/media invariants, or request ownership. Removing the HOLD alone would not satisfy those missing prerequisites.

## Remaining leaf inventory

Each identity below has a native body prepared and remains binding-held by the execution decision above.

| Identity                          | Source access               | Prepared body                                                                                                                                                              |
| --------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `board.createBoard`               | board-create                | Board/root/Mobile/Base inserts in driver-native transaction, exact ID order, creator home selection                                                                        |
| `board.duplicateBoard`            | board-create, source view   | Unique-name check, raw board/style/content read, Custom Widget/integration validation, complete layout/section/item/collapse/integration ID remapping and copy             |
| `board.renameBoard`               | protected, full             | Case-insensitive name-conflict check and name update                                                                                                                       |
| `board.changeBoardVisibility`     | protected, full             | Instance desktop/mobile home restriction and visibility update                                                                                                             |
| `board.deleteBoard`               | protected, full             | Source board delete, leaving actual schema cascade behavior to persistence                                                                                                 |
| `board.setHomeBoard`              | protected, view             | Current user's desktop home update                                                                                                                                         |
| `board.setMobileHomeBoard`        | protected, view             | Current user's mobile home update                                                                                                                                          |
| `board.getHomeBoard`              | public, resolved board view | Full user/group/everyone/server/device home selection and full board read with protected-layout repair                                                                     |
| `board.getBoardByName`            | public, named board view    | SQL uppercase lookup and full board read with protected-layout repair                                                                                                      |
| `board.saveLayouts`               | protected, modify           | Gutter roots, repair-enabled board read, role/error checks, resize history, Base/gutter projection, new IDs, update/remove rows, sorted response                           |
| `board.resetLayout`               | protected, modify           | Exact target/Base checks, projection, resize-source clear, target position replacement                                                                                     |
| `board.savePartialBoardSettings`  | protected, modify           | Exact supplied nullable/optional media, title, appearance, custom CSS, and behavior fields                                                                                 |
| `board.saveBoard`                 | protected, modify           | Repair-enabled content read; widget/integration/Custom Widget/timetable validation; native section/item/layout/integration insert/update/delete sequence                   |
| `board.saveUserBoardPermissions`  | protected, full             | Delete then replace user grants, including empty grant list                                                                                                                |
| `board.saveGroupBoardPermissions` | protected, full             | Delete then replace group grants, including empty grant list                                                                                                               |
| `board.addItem`                   | protected, modify           | Integration/Custom Widget/timetable checks, source per-board placement serialization, main-root selection, first available positions, real item/layout/integration inserts |
| `board.updateItemLayout`          | protected, modify           | Source serialized item/section/layout lookup, bounds and collision errors in source order, scoped layout update                                                            |

No accepted `board.ts` identity is duplicated. The existing accepted board router/helpers and the frozen location draft were not edited. No contribution, router registration, shared map, context, procedure, error, package, lockfile, legacy source, DB, Core, Auth, host, or other lane was changed.

## Source-equivalence notes

- Input/output declarations and complete OpenAPI/MCP method/path/summary/description strings were compared against the remaining legacy leaves using read-only source extraction; no differences were reported. Schemas are the actual declared source schema types, including the save-item intersection, defaults, responsive-layout refinements, permission array structure, and extended partial-settings input. No output schemas or metadata were invented for leaves that have none.
- Inline business error messages and their order were compared per leaf. Source body ordering is retained: view before duplication name checks; board checks before widget checks; integration existence before use permission before widget-kind compatibility; target/layout/section lookup before bounds before collision. The protective execution HOLD necessarily prevents those body paths from being observed until a reviewed domain binding exists.
- Create retains its lack of a name-conflict check. Duplication retains the source name check, copied board properties, custom-authoring gate, generated Mobile behavior, complete collapse-state/content IDs, original non-null ID remapping assumptions, and cleared resize history. No grant copying, repaired permission check, sanitization shortcut, fallback dataset, or invented response was added.
- Full-board reads retain creator/grant projection, user collapse state, SuperJSON options and advanced options, kind-union/shared-item intersection, invalid-item warning/skip, invalid-section error, optional resize history, and breakpoint order. Repair retains the exact detection conditions, coalesced repair promise, one re-read with repair disabled only after actual repair, zero/one/multiple-layout normalization, generated positions, and inserts. It is not a repair-disabled read port.
- The source seed helper's `dynamic` section predicate is intentionally preserved even though current layout projection uses `container`. Home-group selection retains both non-null predicates, everyone ordering, mobile fallback, and server settings. Source oddities are not fixed.
- Base/gutter resizing retains actual `getLayoutResizeSource`, `generateResponsiveGridFor`, and `serializeLayoutResizeSource` primitives, root ordering/remapping, disappearing gutters moving into main, projected nested content, and resize-source update behavior. Gutter insertion retains PostgreSQL board row locking and SQLite immediate transactions.
- Source per-board placement tails and protected-layout repair maps are real, factory-owned promise maps with source release/delete algorithms. They are not result caches, cross-process locks, current-authority proofs, or a full-draft commit mechanism. Future binding must own their lifetime/domain consistently; factory-local ownership is not a claim of legacy process-global or production cross-runtime concurrency equivalence.
- Source board and integration permission projections are implemented directly over the genuine backend principal and the actual source SQL grant filters, including source empty-string/group-filter behavior. No synthetic tRPC session, identity, authority certificate, or new security-policy decision is introduced. Their correctness is still conditional on the missing current-authority/commit interval.
- Timetable change validation retains unchanged/default URL shortcuts, invalid previous-option handling, exact hostname exclusions and IPv4/IPv6 subnet lists, real typed `lookup` with `all`/`verbatim`, address filtering, and source errors. DNS is only a binding-held primitive and was not called. The URL normalizer/default must be the actual source exports.
- Partial settings retain source nullable transforms, supplied-only updates and unmodified custom CSS/media values; whole-board policy-to-COMMIT is still missing. Source SQL cascades and source settings defaults remain persistence/configuration bindings, not invented cleanup/effect/cache services. These leaves do not call a source query cache or add a TTL/invalidation callback.

## Dependency/signature reads and scope gap

Read legacy `router/board.ts`, its board/integration/custom-placement/timetable helpers, `db/collection.ts`, native driver transaction dispatch, full protected-layout seed/projection helpers, server-setting getter, permission projections, common grid/resize/record/ID primitives, definitions, and called validation schemas. Verified API dependency declarations and installed oRPC 2.0.0-beta.43 builder/context/input/output/handler/middleware signatures, Zod 4.4.3 source behavior/signatures, SuperJSON 2.2.6 parse/stringify signatures, and Drizzle 0.45.2 native PostgreSQL/SQLite transaction/insert/row-lock signatures. No dependency was introduced.

Binding-held primitives are the real physical source tables/operators, source driver transaction dispatcher, source schemas/definitions/common primitives, actual board settings/defaults read, real logger, and source timetable URL/DNS primitives. The resource interface does not pretend to implement the missing full-board draft producer. Native source transaction islands remain visible in prepared bodies; reads, repair, validation, home selection, and content/grant writes are not magically made one atomic authority-preserving domain commit by those islands.

Validation remains deferred. No lint, typecheck, build, test, formatting, install, or test-generation command was invoked. Only source reads, read-only text comparison, and allowed patches were performed. No procedure, SQL, DNS/provider/network, environment/current-data/credential, Git, nested agent, listener/browser/container, or port 3100/3200 action was performed. No runtime acceptance, production mounting, or accepted-count claim is made.

## Exact exclusive files

- `packages/api/src/nitro/routers/board-mutations.ts`
- `packages/api/src/nitro/routers/-board-mutations/resources.ts`
- `packages/api/src/nitro/routers/-board-mutations/helpers.ts`
- `.scratch/nitro-full-migration/implementation/sprint-board-mutations.md`

Frozen on return. Coordinator owns any later integration, authority/atomic-draft producer review, and validation.
