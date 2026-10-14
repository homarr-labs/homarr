# Frozen section sprint delivery

Unmounted source preparation only. One native oRPC handler body is present; no production binding, accepted ticket, mounted leaf or central-count increment is claimed. Central 91/334 acceptance remains unchanged.

## Exact leaf inventory

| Identity                  | Source                                                    | Kind/access/demo               | Body                                 | Binding status                                                                                                                                                        |
| ------------------------- | --------------------------------------------------------- | ------------------------------ | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `section.changeCollapsed` | `packages/api/src/router/section/section-router.ts:13–71` | Mutation / protected / guarded | Present in `createSectionProcedures` | Held for genuine authenticated BackendContext, tracked database admission and matching physical schema/operator/schema-definition producer; no host assembly supplied |

There are no other section source leaves or absent section bodies. `sectionImplementedPaths` identifies the prepared body only; `sectionPendingPaths` tracks absent bodies, not production readiness.

## Source conservation

- Exact input remains `z.object({ sectionId: z.string(), collapsed: z.boolean() })`: no intersection, default, trimming, length bound, strictness change or output schema. Success remains `undefined` for both branches.
- Existing `authenticatedProcedure` retains the source protected middleware and guarded demo behavior: read-only demo mutation rejection precedes authentication and handler SQL. Identity comes exclusively from `context.principal.user.id`, never a caller-provided/default principal.
- One actual `query.sections.findFirst` retains the ID equality and related collapse-state filter for the current user; no column projection, sorting, layout transformation or additional ownership lookup is introduced.
- Error order is missing section → non-container kind → SuperJSON parsing → options `safeParse` / collapsibility check. NOT_FOUND remains `Section not found id=${input.sectionId}`; both BAD_REQUEST branches remain `Section cannot be collapsed id=${input.sectionId}`. Malformed serialized options are not caught or silently replaced.
- The actual canonical `containerSectionOptionsSchema` and `emptySuperJSON` are injected via public type-only signatures, preserving all recorded option defaults and validation. SuperJSON parsing returns `unknown` until schema validation.
- Zero related collapse states inserts exactly section ID, authenticated user ID and requested collapsed state, then returns. Existing state updates only collapsed, scoped by section ID AND authenticated user ID. No upsert, retry, extra transaction, lock, invalidation, editor write or result callback replaces the source read-then-write behavior. Existing concurrent-insert failure behavior is unchanged.
- Source invokes no board helper or external source-query helper. `router/board/board-access.ts` and `router/board.ts:getFullBoardWithWhereAsync` were inspected read-only to distinguish board access/layout repair from this personal preference leaf. No board-view/modify/full permission is added where the section source has none.

## Files written

- `packages/api/src/nitro/routers/section.ts`
- `packages/api/src/nitro/routers/-sections/resources.ts`
- `.scratch/nitro-full-migration/implementation/sprint-section.md`

Two code files; the allowed helper file was unnecessary and is not created. Resources contain only concrete table/operator/definition/schema signatures. Handler contains actual SQL and business logic against BackendContext; no tRPC caller, controller-result callback, fake atomic resource or ambient DB/Auth/Core/schema value import.

## Gates and verification

Factory remains unmounted and unexported by shared barrels/manifests. Real authority and persistence/resource production remain composition holds. This personal collapse-state write does not produce an atomic full-board draft: that existing producer hold is unchanged, and no direct production board editor writes or repair-disabled full-board query were introduced. Accepted nine board source-query bodies and their read-only oracles, board helpers, DB schema and Stage G remain untouched.

Declared dependencies were verified in `packages/api/package.json`; installed declarations/package versions consulted were oRPC server `2.0.0-beta.43`, Zod `4.4.3`, SuperJSON `2.2.6` and Drizzle `0.45.2`. Installed oRPC input/handler context signatures, SuperJSON unknown parse signature and Drizzle relational/insert/update declarations support the existing source/local-factory syntax. Dependency inspection was read-only, not execution.

Source comparison only: no lint, typecheck, build, test, format, install, new test, SQL execution, environment/credential/current-data access, network/provider call, Git call, nested agent, listener, browser or container action. Static and runtime validation remain deferred; no equivalence-test pass or acceptance is asserted. Delivery freezes after this handoff.
