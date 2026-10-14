# Frozen initial external group draft

One unmounted native oRPC source-body candidate. No accepted ticket, mounted procedure, mutation writer registration, current-authority readiness, production SQL or central-count increment. Central accepted 91/334 remains unchanged. Previous section/log deliveries and existing group/identity ports remain frozen and unmodified.

## Exact owned inventory

| Identity                           | Actual source                                                                                          | Kind/access/demo                             | Body                                                                             | Binding hold                                                                                                                                           |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `group.createInitialExternalGroup` | `packages/api/src/router/group.ts:178–223`, name helper `407–418`, `packages/db/queries/group.ts:6–12` | Mutation / onboarding step `group` / guarded | `createGroupEstablishmentProcedures` and concrete source SQL/transaction helpers | Real empty-user/claim/step/current-authority admission through actual native COMMIT; matching physical schema/operators/ID/dispatcher/schema resources |

Only this identity is exposed by the new factory. No existing group identity is copied into its router object. Implemented-path metadata denotes a prepared body, not production readiness; pending-path metadata denotes absent owned bodies only. Existing frozen group pending/ported metadata is not edited or reconciled here.

## Source conservation

- Input is the actual injected `groupCreateSchema`: trimmed string, min 1/max 64, exact reserved-name check and message `'everyone' is a reserved group name`, normal object stripping. There is no added provider/group lookup, case normalization, default, intersection, output schema, REST/MCP metadata or ID response. Successful output remains `undefined`.
- Existing `sourceProcedure` receives `onboardingStep: group` and guarded mutation metadata. Source order remains demo read-only rejection first; authenticated admin bypasses only the claim gate, not the step gate; otherwise real claim-only access requires no users plus a valid claim; then the actual normalized current step must be `group`. Existing errors remain FORBIDDEN `Mutations are disabled in demo mode`, `This onboarding session is not claimed.` and `Step denied`. No blanket authenticated/admin-only gate or fake claim boolean is introduced.
- The source `onboarding-claim.ts:69–75` users-first check and claim hash/expiry logic, `onboard/onboard-queries.ts` normalization/provider step selection, `auth/providers/check-provider.ts` and `auth/events.ts` external membership/default-everyone behavior were inspected read-only. Their runtime globals are not imported into this factory.
- This source mutation itself does **not** verify OIDC/LDAP group existence, call an external provider, read provider configuration, create a user, synchronize membership, assign an owner, or add everyone/root membership. Provider selection occurs in the preceding onboarding workflow; external membership synchronization/everyone assignment occurs on sign-in. Therefore no asynchronous provider phase or fabricated default-membership effect is added to this transaction.
- Actual duplicate-name SQL remains `findFirst` with `and(like(groups.name, `${name}`), not(eq(groups.id, ignoreId ?? "")))`; no wildcard escaping, lowercased equality or reservation substitute changes source LIKE behavior. A match throws CONFLICT `Found group with similar name` before max-position selection or ID creation.
- Actual source max-position helper is inlined as `select({ value: max(groups.position) }).from(groups).then(result => result[0]?.value ?? 1)`, using the injected physical matching group table. Empty/null result yields 1, so the new row position is 2 on an empty table. No changed fallback, locking, sorting or uniqueness policy.
- ID comes from the injected actual public `createId` signature after both reads and before transaction dispatch. Group row contains only `{ id, name, position: maxPosition + 1 }`; owner/home/default membership fields remain absent.
- Both source transaction bodies first update **all rows matching step `group`**, setting `previousStep: group` and `step: setup`. They do not add an onboarding ID predicate. Exactly one affected row is required: PostgreSQL uses `rowCount ?? 0`, SQLite uses `.run().changes`. Any other count throws CONFLICT `The initial external group was already created.` before group/grant insertion.
- Group insertion follows the conditional transition, then exactly one `{ groupId, permission: admin }` permission insertion. Source rollback boundaries and constraint errors are retained; no permission expansion, automatic memberships, owner setting, retry, claim deletion, cache effect or fallback success is added.

## Concrete resources and transaction hold

Resources use only public type-only signatures: matching `groups/groupPermissions/onboarding` physical tables, `and/eq/like/max/not`, actual `groupCreateSchema`, public `createId`, and the existing public `handleTransactionsAsync` dispatcher. SQL/business logic is written here, not supplied by a controller/atomicApply/tRPC callback.

The actual dispatcher source in `packages/db/transactions.ts` selects PostgreSQL's real schema and asynchronous transaction branch, otherwise the source synchronous SQLite branch. The prepared PostgreSQL body awaits statements on its transaction; SQLite's callback is not async and executes only synchronous `.run()` calls. No Bun async-transaction shortcut or new DB/Core/GLOCK protocol is introduced. No dispatcher or callback was executed or registered.

These source transaction callbacks alone **do not implement** a mutation-authority-to-native-COMMIT writer. Existing BackendContext setup calls are consumer contracts, not an accepted producer for no-users/claim/current-step predicates under a real mutation admission. The source onboarding-row CAS prevents a double transition but cannot by itself prove claim expiry, empty-user exclusion, session/provider authority/currentness or pre-COMMIT cancellation. Those exact writer joins remain unimplemented binding holds; this factory must not be mounted or connected to production writes on the strength of a supplied dispatcher signature. No locks, epochs, tables, setup sentinel or GLOCK syntax are invented, and Q16/OIDC/LDAP authority choice is not made.

## Exact written files and source-only verification

- `packages/api/src/nitro/routers/group-establishment.ts`
- `packages/api/src/nitro/routers/-group-establishment/resources.ts`
- `packages/api/src/nitro/routers/-group-establishment/helpers.ts`
- `.scratch/nitro-full-migration/implementation/sprint-group-establishment.md`

Three code files. Dependencies/public ports were verified in existing API/Common/DB/validation manifests and source; installed oRPC server 2.0.0-beta.43, Zod 4.4.3 and Drizzle 0.45.2 declarations were consulted, including native PostgreSQL versus synchronous SQLite transaction callback signatures. Existing legacy group-onboarding regression was read for source expectations, not run or modified.

Source comparison only. No lint/typecheck/build/test/format/install command, new tests, nested agent, Git/network/provider/SQL/environment/credential/current-data access, real listener/browser/container action, host registration or modification of shared API context/procedure/errors/map/index/barrels/manifests/lock, legacy/frozen group/identity/other routers, Auth/Core/DB/schema/state/G3 occurred. Static/runtime validation and independent review remain outstanding. Freeze on return.
