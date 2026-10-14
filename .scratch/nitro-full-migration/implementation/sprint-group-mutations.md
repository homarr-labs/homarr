# Frozen Group2 source-only preparation

Exactly two prepared native source bodies, both unconditionally execution-held and unmounted. No accepted procedures/tickets, production authority, COMMIT writer, lifetime readiness or central-count change. Central accepted 91/334 and Q16/Q17/Q18 remain unchanged. Previous Section, Log and initial-Group code/handoffs, existing group/identity factories and shared metadata are untouched.

## Exact inventory and source metadata

| Identity                | Actual source                                                                | Source metadata                                                                                        | Prepared body                                                                                      | Execution                         |
| ----------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- | --------------------------------- |
| `group.savePositions`   | `packages/api/src/router/group.ts:272–294`                                   | Mutation; authenticated global `admin`; guarded demo; no REST/MCP projection or explicit output schema | Actual one-based ordered position updates in native PostgreSQL/synchronous SQLite transactions     | HOLD before input validation/body |
| `group.savePermissions` | `packages/api/src/router/group.ts:295–338`, group-existence helper `440–451` | Mutation; authenticated global `admin`; guarded demo; no REST/MCP projection or explicit output schema | Actual group existence query, stable Set deduplication and transactional delete/conditional insert | HOLD before input validation/body |

`groupMutationsPreparedPaths` lists these two source-body identities. `groupMutationsExecutionHeldPaths` lists both, not accepted or runnable bodies. No other group leaf is returned by the factory; existing group pending/ported metadata is not edited.

## Exact schemas, source errors and effects

- `savePositions` registers the actual injected `groupSavePositionsSchema`, `z.object({ positions: z.array(z.string()) })`: required outer object/array, unknown-key stripping, no defaults, trim, bounds, uniqueness, existence check, reserved-group check or provider restriction. Empty arrays and duplicate/missing IDs remain schema-valid. Result remains `undefined`.
- The source body maps IDs in supplied order to `index + 1`, then starts one native transaction. Each update is sequential; duplicate IDs are updated repeatedly and retain their last supplied position. Missing IDs do not become NOT_FOUND or affected-count errors. Empty input still enters an empty transaction. No sorting, bulk CASE rewrite, renumbering of omitted groups or added query is introduced.
- PostgreSQL source position update retains `.update(schema.groups).set({ position }).where(eq(groups.id, id))`, where the injected `groups` must match the operation's physical schema. Every statement is awaited inside the actual transaction. SQLite uses the source synchronous transaction callback with `.run()` per update, never an async callback or await inside the transaction.
- `savePermissions` registers the actual injected `groupSavePermissionsSchema`, `z.object({ groupId: z.string(), permissions: z.array(zodEnumFromArray(groupPermissionKeys)) })`. Required fields, canonical permission vocabulary, unknown-key stripping, valid empty/duplicate selections and absence of defaults remain unchanged. No implied permission expansion or alternative schema is supplied. Result remains `undefined`.
- Its source precheck is exactly `context.db.query.groups.findFirst({ where: eq(groups.id, input.groupId) })`, without projection, reserved-name or provider test. Missing group throws NOT_FOUND `Group not found` before deduplication/transaction. It does not become an insert-only upsert or an atomic existence check.
- `const permissions = [...new Set(input.permissions)]` preserves first-selected order and removes duplicates only. The body deletes all existing target grants first inside the same transaction. Empty selections return from that transaction callback after deletion; nonempty selections insert only `{ groupId, permission }` rows in stable selected order. No implied children/parents, grant-count restriction, membership rewrite, new session policy or admin-retention rule is invented.
- Source reserved-group/Everyone asymmetries are retained: unlike other group leaves, neither source leaf invokes its reserved-group-name helper. Position updates and permission replacement do not add an Everyone exception, prohibition, automatic member or stronger permission policy. Native constraint/transaction errors retain their original propagation/rollback boundaries; no retry or manufactured successful result is added.

## Unconditional hold and ordering

Factory construction only creates closures and registers canonical schemas; it does not read group rows, build native transactions or execute helper bodies. Both procedures use existing `authenticatedProcedure` source metadata, then append a hold middleware **before** `.input(...)` registration. That middleware always throws SERVICE_UNAVAILABLE with the literal reason:

> Group mutations are held pending authenticated admin, compatible-writer, current-authority-to-COMMIT and lifetime bindings.

Resources expose only the `kind: hold` execution state with this exact reason. There is no ready branch, boolean permission callback, execution flag, environment switch, provided controller result or optional hold bypass.

The source-visible gate order is demo read-only FORBIDDEN `Mutations are disabled in demo mode`, anonymous UNAUTHORIZED, then global-admin FORBIDDEN `Permission denied`. An authorized non-demo call then always reaches the preparation hold, not input validation or business work. No malformed-input BAD_REQUEST, group NOT_FOUND or transaction error is claimed observable through the held factory; those source schemas/error branches remain prepared for independent comparison only.

Installed oRPC beta.43 implementation was inspected read-only: `Builder.use` records the input-schema count at middleware registration; `executeProcedureInternal` validates only schemas introduced before each middleware. The source guards and hold all precede schema registration, so this placement runs them before input parsing without modifying the shared spine or disabling validation. SERVICE_UNAVAILABLE is the installed standard 503 code, not a new permission policy. This is source/API inspection, not an executed ordering test.

## Native resources and outstanding bindings

`GroupMutationsProcedureResources` supplies concrete public type-only signatures for matching physical `groups/groupPermissions`, actual Drizzle `eq`, canonical input schemas and the existing `handleTransactionsAsync` dispatcher. Helper inputs derive from the actual schemas with Zod output types; the handler context is the genuine authenticated BackendContext. Actual SQL and business logic are in this delivery, not injected whole-handler/controller/atomicApply/tRPC callbacks.

The existing dispatcher source and installed driver transaction declarations were inspected without executing or recursively evaluating their runtime graph. It provides PostgreSQL's physical-schema asynchronous branch and SQLite's native synchronous branch. The drafted source callbacks contain no inferred authority/COMMIT guard. The legacy dispatcher signature is not an accepted checked-out-client, writer-lock, lifetime or revocation proof.

Both identities retain missing bindings for real authenticated admin authority, all compatible group/permission/identity writers, transaction-held current authority through actual native COMMIT, matching schema/admission and pending-operation/lifetime settlement. Source prechecks or supplied resource types do not implement those joins. **Removing the hold alone is not activation**: accepted producer protocol, reviewed source/domain joins, explicit assembly and outstanding mandatory validation are required. No GLOCK syntax, G3/Core/Auth/DB method, schema/migration, stronger policy, writer registration or host mount is introduced. The active copied-SQLite/P2 validator graph was not read or captured.

## Exact written files and verification

- `packages/api/src/nitro/routers/group-mutations.ts`
- `packages/api/src/nitro/routers/-group-mutations/resources.ts`
- `packages/api/src/nitro/routers/-group-mutations/helpers.ts`
- `.scratch/nitro-full-migration/implementation/sprint-group-mutations.md`

Three code files only. Declared API/workspace dependencies and installed oRPC 2.0.0-beta.43, Zod 4.4.3, Drizzle 0.45.2 input/middleware/transaction types and physical group table definitions were checked read-only before code. Source comparison only: no lint/typecheck/build/test/format/install commands, new tests, runtime evaluation, Git, nested agents, network/provider/SQL/environment/credential/current-data access, actual listeners/browser/containers or 3100/3200 activity. Final mandatory checks and independent review remain outstanding. Freeze on return; no acceptance or mounting claim.
