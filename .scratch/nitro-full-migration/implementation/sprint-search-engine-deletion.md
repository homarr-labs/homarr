# Search engine deletion — frozen unmounted candidate

## Exact exclusive delivery

- `packages/api/src/nitro/routers/search-engine-deletion.ts`
- `packages/api/src/nitro/routers/-search-engine-deletion/resources.ts`
- `packages/api/src/nitro/routers/-search-engine-deletion/helpers.ts`
- `.scratch/nitro-full-migration/implementation/sprint-search-engine-deletion.md`

Only these new files were written. Prior analytics and user-establishment code/handoffs, existing native `search-engine.ts` and `-apps-search/**`, shared API/context/procedure/errors/map/index, Auth/Core/DB/schema/runtime/G3/host, legacy source, manifests/lock and other routers remain frozen for writes. Existing search pending metadata and central accounting are deliberately unchanged. No contribution, mounting or host registration is supplied.

## One source identity / body versus binding

`searchEngine.delete` is the only leaf in `createSearchEngineDeletionProcedures`. Its concrete body is implemented; the same identity remains explicitly dependency-held in `searchEngineDeletionBindingHeldPaths`. Empty local `searchEngineDeletionPendingPaths` means only that no handler body is omitted, not that the original pending row or any real binding is resolved.

Source descriptor: guarded mutation, authenticated permission `search-engine-full-all`, original `byIdSchema`, no explicit output validator, no OpenAPI/MCP metadata, undefined response. `authenticatedProcedure` retains the existing `sourceProcedure` and actual `BackendContext` boundary. Ordering remains demo mutation refusal → authentication → exact permission → input/handler effects under the existing shared procedure behavior. No replacement `admin` check, synthetic principal, extra ID constraint, lookup, NOT_FOUND error, affected-row check or response DTO is added.

`removeSearchEngineWithDefaultsAsync` contains both real statements locally:

1. Update physical `users`, setting only `defaultSearchEngineId: null`, where `eq(users.defaultSearchEngineId, input.id)`.
2. Delete physical `searchEngines`, where `eq(searchEngines.id, input.id)`.

The resource interface supplies only the genuine typed equality operator and a discriminated native database/schema binding for the admitted `context.db`. It accepts no work callback, business controller, generic apply/atomicApply, engine-deletion callback or SQL plan. No tRPC tunnel, fake success, provider call or ambient environment/database import is used.

## Actual source discrepancy and serialization conservation

The checked-out source at `packages/api/src/router/search-engine/search-engine-router.ts:218–229` is two sequential statements, not a transaction, and uses `search-engine-full-all`, not a standalone `admin` policy. It has no select, existence/row-count checks or JSON-serialized preference transformation.

Both physical schemas store the user's default engine in the nullable relational `users.defaultSearchEngineId` foreign-key column, with `onDelete: set null`. The candidate writes actual SQL NULL, not an empty string, undefined, replacement engine ID, encoded JSON null or synthetic default object. The UPDATE WHERE predicate restricts changes to users referring to the requested engine; already-null/unrelated defaults and all other user fields stay unchanged.

`headerPreferences` is the separate serialized preference field and is not read, parsed, merged, rewritten or reserialized by this source leaf. `openSearchInNewTab`, `ddgBangs` and all other user preference fields are likewise untouched. There is no source JSON transformation to port or codec resource to invent.

Server-wide search defaults live separately in SuperJSON `serverSettings.search`. This delete body does not read/update that setting. Its existing lazy stale-default readback/reset belongs to the frozen `getDefaultSearchEngine` leaf and `-apps-search/search-settings.ts`; that behavior is neither duplicated nor moved into deletion. No automatic replacement is chosen.

## Explicitly requested transaction delta

The requested same-session transaction is an intentional addition around the exact two source statements, not a claim that the literal legacy body already had that boundary.

- PostgreSQL: one awaited native `binding.db.transaction`, both statements awaited in order on its supplied `transaction` object. There are no pool-level writes, parallel statements or work executed on another connection. Installed NodePgSession uses one checked-out session for the callback and awaits COMMIT before returning, rolling back on failure.
- SQLite: one native synchronous `binding.db.transaction` with a non-async callback and both statements executed with `.run()` in source order. No awaits, provider preparation, Promise-returning transaction callback or unsafe async Bun transaction occurs inside it.
- Errors are not caught or converted into successful deletion. Genuine native failures reach the existing shared error mapping. Missing engines and zero affected rows remain non-errors because the source has no row check. If engine deletion fails, the requested transaction now rolls back the preceding default reset; this failure atomicity is the authorized difference from legacy partial writes.
- No transaction isolation option, native lock protocol, retry, extra query, new schema, driver, claim policy or lifecycle implementation is added.

## Precise unmounted binding holds

1. **Principal/authority:** supply the real authenticated principal with source-effective `search-engine-full-all` permission. The existing middleware guard is not evidence that its permission/authority remains current through COMMIT; the reviewed authority-to-COMMIT producer is still required.
2. **Matching admitted native database:** `nativeDatabase(context.db)` must return the genuine SQLite or PostgreSQL native database and matching physical `users`/`searchEngines` schema for that same admitted authority, not another database or synthetic handle. The type union is a candidate primitive contract, not an approved producer or proof of identity/lifetime.
3. **Checked-out transaction / COMMIT lifetime:** the real writer must own both statements on the same native transaction/connection until commit or rollback settles and must retain admission/resources until that settlement. Native transaction methods must execute their real statements and propagate commit/rollback failures. No broad executor or fake deletion acknowledgement is supplied here.
4. **Existing coordination remains held:** this lane does not implement the authority/native-writer lifetime join, G3, writer admission, resource revocation, driver assembly, locks or host consumption. The concrete body cannot be mounted merely because its SQL sequence is present or its primitive types match.

## Conserved source / API inventory

- `packages/api/src/router/search-engine/search-engine-router.ts`: exact delete permission, schema, two statements, absence of output/metadata/row checks; distinct default-engine readback behavior.
- `packages/api/src/nitro/routers/search-engine.ts` and `-apps-search/resources.ts`, `-apps-search/search-settings.ts`: eight frozen native leaves, pending deletion record, existing admitted-request/settings conventions; no edits.
- `packages/api/src/trpc.ts`, `packages/api/src/nitro/procedure.ts`, `packages/api/src/nitro/context.ts`: actual demo/auth/permission and native context contracts.
- `packages/validation/src/common.ts`: unchanged `{ id: z.string() }`, with no new minimum/default.
- `packages/db/driver.ts`, `packages/db/schema/index.ts`, `packages/db/schema/sqlite.ts`, `packages/db/schema/postgresql.ts`, `packages/db/transactions.ts`: genuine public native types/schema, nullable default and physical constraints, sync/async transaction distinction.
- `packages/api/src/router/user/preferences.ts`: confirms the default engine is a separate relational field and serialized header preferences are a different field, not called or rewritten by deletion.

Verified API dependencies and public DB/validation exports before implementation. Inspected installed oRPC handler/input APIs, Drizzle native SQLite transaction/run and PostgreSQL single-session awaited transaction/COMMIT/rollback APIs. No dependencies or manifests were changed.

A read-only normalized source comparison reported MATCH for the PostgreSQL two-statement body, SQLite two-statement body, exact source permission, and input/absent-output-validator combination. Normalization substitutes only the native transaction receiver, argument name, explicit SQLite `.run()` and whitespace/trailing commas. The transaction wrapper is separately disclosed above rather than normalized into a claim of unchanged legacy atomicity.

No lint, typecheck, build, test, format, install or new tests were run/created. No nested agents, Git, network, provider calls, SQL execution, environment/credentials/current-data access, listeners, browser, containers or preserved-port operations occurred. Source is frozen on return; validation and real producer review remain deferred. No mounting or acceptance is claimed.
