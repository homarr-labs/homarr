# Evening I — App/Icon producer and consumer join

**Ready: reuse the existing bounded Icon scalar reader and real shared AppForm/IconPicker. Missing: App execution bound to the same main runtime and current authority through native COMMIT.** Ordinary source discovery only; no product edit, command, compiler, install, test, runtime/SQL execution, data/env/secret/sealed-capture access, Git or delegation. Exact report path checked absent before creation. Prior report acceptance/validation statements remain historical, not renewed proof.

## Current source, not the older handoff inventory

| Source                                                                                             | Exact usable surface / remaining gap                                                                                                                                                                                                                                                                                                                                         |
| -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/api/src/nitro/routers/app.ts:39–374`                                                     | `createAppProcedures(resources: AppProcedureResources)` and `createAppContribution(resources)` implement ten leaves. Each still uses `context.db`; `runActiveRequest` only checks abort before/after an async body. No current-authority or native transaction resource is required. Do not mount mutations on that basis.                                                   |
| `packages/api/src/nitro/routers/-apps-search/resources.ts:9–26`                                    | Required apps/integrations/items/icons tables, operators, select schema, ID generator and `invalidateIntegrationResponseCacheAsync(integrationId: string): Promise<void>`. Retain the required effect; no optional/no-op fallback.                                                                                                                                           |
| `packages/api/src/nitro/routers/-apps-search/app-access-control.ts:17–70`                          | Authenticated visibility is broad; anonymous visibility comes from real public-board app/bookmarks placement. Denied mixed batches return empty before querying apps. Reuse these rules inside an admitted snapshot, not an invented per-user policy.                                                                                                                        |
| `packages/api/src/nitro/routers/icon.ts:18–59`, `routers/-icons/resources.ts`                      | `createIconProcedures(resources: IconProcedureResources)` / contribution; required `runReadAsync<T>(context: BackendContext, operation: (scope: IconReadScope) => Promise<T>): Promise<T>`. Public `icon.findIcons`, original DTO/schema/error path.                                                                                                                         |
| `packages/icons/src/native-read.ts:396–586`                                                        | Existing `createIconNativeReadSource({ runtime: PersistenceRuntime, lifetime: AbortSignal, limits: IconNativeReadLimits })`; returns `runReadAsync<T>(operation: BoundedTransactionOperation, read: (scope: IconReadScope) => Promise<T>): Promise<T>` and `closeAsync(): Promise<void>`. Public `@homarr/icons/native-read` already declared. No replacement reader needed. |
| `packages/icons/src/search.ts:31–89`                                                               | `findIconsAsync(scope, { searchText?, limitPerGroup }, signal?)` captures picker/count concurrently. Browsing pushes group limit into SQL; nonempty search reads the admitted catalog and ranks with existing Common helpers. Oversized search must fail, not truncate silently.                                                                                             |
| `packages/forms-collection/src/new-app/_form.tsx`, `src/icon-picker/icon-picker.tsx`               | Real resource-injected form/picker, not the old tRPC/Next-bound form described by `expansion-app-ui.md`. Required dirty/submission/current-owner seams already exist; picker accepts `useIcons` and can browse without upload.                                                                                                                                               |
| `apps/nitro/src/features/apps/{context,app-form,selection}.tsx`, `src/source-ui/apps/contracts.ts` | Factory-derived native App client and captured submission ownership exist. Context still creates a two-field feature cache prefix; selection appends a custom key. These do not yet obey the established six-field query scope.                                                                                                                                              |

`@homarr/api` now declares oRPC and exports App/resources; the older missing-edge report is stale for those edges. Its manifest still lacks `./nitro/routers/icon`. `apps/nitro` declares the five earlier App workspace edges and `@orpc/tanstack-query`, but not `@homarr/forms-collection`. Coordinator alone owns declaration/lock/global-assembly changes.

## 1. Ready Icon producer: thin binding, no catalog synchronization

Proposed new file: `packages/api/src/nitro/routers/-icons/native-read-resources.ts`. Preserve the factory/resource signature above. Its construction signature can be exactly:

```ts
createIconProcedureResources(options: {
  readonly source: ReturnType<typeof createIconNativeReadSource>;
  readonly captureOperation: (context: BackendContext) => BoundedTransactionOperation;
  readonly assertCurrent: (context: BackendContext) => void;
}): IconProcedureResources
```

These are required producer dependencies, not default clock/authority functions. R binds them to A/H's actual enrolled request; `captureOperation` supplies the request signal, actual operation lifetime and finite host-owned deadline. A newly invented timeout or `context.signal.throwIfAborted` alone is not currentness. Public anonymous requests remain permitted, but must belong to the current main/request lifetime.

Implementation order: assert current → capture operation → call the existing source with the supplied domain callback → assert current in that callback before/after its awaited read → await the source's native settlement → assert current again before returning. Keep failures rejected through `sourceProcedure`/`toBackendError`; never return `{ icons: [], countIcons: 0 }` on failure. Register one reader at main-resource construction, await its `closeAsync` before closing that same persistence runtime, including dispose-before-publication.

Reuse all five explicit reader limits: pending reads, parameter bytes, aggregate result rows, aggregate result bytes and media bytes. SQLite uses real `boundedTransactionSync`; PostgreSQL uses real `boundedSnapshotAsync`. The reader validates exact scalar statement groups, native metadata/cardinality/bytes and detached rows; it is not a generic `queryAsync` facade. Its read callback must capture both picker/count promises immediately, as the current `findIconsAsync` already does. Do not insert an await between their capture calls or change its collection protocol.

Scope is **persisted browsing/search only**. No Icon fetch resources, trusted certificates, source synchronization, `atomicApply`, job registration, uploads, local-media byte loading or selected-reference traversal is needed. A truly empty persisted catalog is a truthful empty result; populating it is a separate capability. Nonempty search has a whole-catalog budget, not merely `limitPerGroup`; do not claim every catalog size is searchable. Limits bound native delivery/retention and admission, not total SQL scan work; retain the native deadline.

## 2. App producer: genuine missing authority primitive

Existing native App bodies are usable domain logic, **not** a guarded mutation implementation. Frozen middleware checks a principal once. Runtime `runAsync`/`withDatabaseAsync` do not create an App transaction, and bounded transaction operations contain only signal/lifetime/deadline. None alone prevents a permission/session/epoch change between admission and COMMIT. `handleTransactionsAsync` selects a handler; it is not a transaction producer.

Smallest API amendment: retain `createAppProcedures`/contribution names, schemas, descriptors and outputs, but require engine-specific read/mutation execution in `AppProcedureResources`. Proposed exact execution shape (names below are new, not already published):

```ts
type AppReadAccess =
  | { readonly kind: "permission"; readonly permission: "app-modify-all" }
  | { readonly kind: "protected" }
  | { readonly kind: "search" }
  | { readonly kind: "placement"; readonly appIds: readonly string[] };

interface AppNativeBodies<Value> {
  sqlite(
    database: HomarrDatabase,
    schema: typeof sqliteSchema,
    principal: BackendPrincipal,
  ): Value;
  postgresql(
    database: HomarrDatabasePostgresql,
    schema: typeof postgresqlSchema,
    principal: BackendPrincipal,
  ): Promise<Value>;
}

interface AppNativeExecution {
  runReadAsync<Value>(
    context: BackendContext,
    access: AppReadAccess,
    bodies: AppNativeBodies<Value>,
  ): Promise<Value>;
  runMutationAsync<Value>(
    context: AuthenticatedBackendContext,
    permission: "app-create" | "app-modify-all" | "app-full-all",
    bodies: AppNativeBodies<Value>,
  ): Promise<Value>;
}
```

The implementation belongs at the existing A/P/R same-owner join, **not** an opaque `createApp/updateApp` service callback. SQL stays in API helpers. SQLite bodies use real synchronous execution and return detached values, never promises; PostgreSQL bodies use the actual checked-out transaction and its own schema. Do not cast PG to `BackendContext.db`/SQLite tables or pass today's async resolver wholesale into SQLite. The current main configuration is SQLite-only; a genuine SQLite first join must be labeled as such, not both-engine acceptance.

Native invariant P must supply: enroll the actual A-issued request/credential and runtime epoch before resource access; validate the current source grant before domain SQL/logging; retain the compatible-writer lock/guard through all statements and native COMMIT; validate deadline/expiry/currentness at the native dispatch fence; revoke handles and drain real operations before release. Authority-changing writers and restore/maintenance must participate. A pre/post callback or abort flag is not that lock. Existing gate logging calls the configured logger before its statement gate check; the amended authority check must precede logging, not add a post-log check. This is the genuine missing primitive, not permission to implement another DB facade in I.

| Leaf/body              | Implementation requirement                                                                                                                                                                      |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getPaginated`, `all`  | Current modify-all grant before count/list, preserving ordering/search/page semantics. Count/page share admitted read ownership.                                                                |
| `search`, `selectable` | Search uses actual current app-modify-all OR board-modify-all; selectable remains authentication-only and retains its six-field DTO.                                                            |
| `byId`, `byIds`        | Same snapshot for placement authorization and App reads; preserve NOT_FOUND masking and all-or-nothing anonymous batches.                                                                       |
| `create`               | Source ID and normalized fields; one guarded insert; publish original `{ appId, id, name, description, iconUrl, href, pingUrl }` only after confirmed settlement.                               |
| `createMany`           | All values/IDs prepared, all required lookups settled, one guarded bulk insert. Preserve explicit/suggested/default precedence and omitted ping field. No independently committed per-app loop. |
| `update`               | Found/read + write + linked-ID capture in the guarded transaction; retain NOT_FOUND and changed-href-only invalidation.                                                                         |
| `delete`               | Linked-ID capture before guarded delete; preserve real FK effects. No fabricated cascade/reference repair.                                                                                      |

Retain required integration cache invalidation after confirmed commit, using the captured actual integration IDs even if presentation/request cancellation is then observed. If invalidation fails after commit, that is a committed-write/effect failure, not rollback or permission to rerun the App write. P/R must preserve nonretryable dispatched-COMMIT ambiguity; middleware may keep the existing sanitized error response, but internal settlement must not turn ambiguity into a safe retry. Never publish success before native settlement or suppress effect failure.

Bulk Icon lookup is a separate semantic edge: API `-apps-search/icons.ts` currently uses ordinary name-LIKE `db.query.icons.findFirst`; Icons' `getIconForName(scope, name)` additionally excludes missing local media. Do not silently swap them and change bulk semantics. Keep the existing actual App lookup in the engine-specific transaction for this tranche. The fixed standalone Icon lookup is reusable later only with an explicit decision on that local-media rule and snapshot placement; do not nest its independent SQLite transaction inside an App transaction.

## 3. Ready forms/client adoption after real producer enrollment

R/coordinator must add real `app` and `icon` factories to `packages/api/src/nitro/assembly/index.ts` and required assembly resources; `assembly/client.ts` then derives their client types automatically. Keep the factory-derived `NativeAppClient`; derive Icon client/results likewise, never handwrite transport DTOs. Today the assembly has neither namespace.

Use `apps/nitro/src/query/{types,scope}.ts` unchanged as the owner mechanism. Its six required fields are `cacheLifetimeId`, `clientCacheId`, `principalCacheId`, `permissionRevision`, `boardCacheId`, `boardRevision`. Supply the actual admitted scope to App feature context and native form bindings; use its generated `orpc.app`/`orpc.icon` keys, owning QueryClient, retire/drain and currentness. Do not rebuild a two-field prefix, append selector IDs/versions to keys or add a new cache framework. `AppSelection`'s custom `queryKey` is rejected by this scope. Replace that read-generation strategy with cancellation/settlement of the old generated-key read and a genuinely fresh read after confirmed creation, retaining a local captured continuation generation; do not merely remove the suffix and accidentally reuse the old in-flight result.

Proposed new `apps/nitro/src/features/apps/form-client.tsx` adapts the existing shared form to `SourceAppFormComponent`. It supplies required `iconPickerProps`, `isCurrentOwner`, actual dirty notification and the captured submission predicate; awaits the original handler and gates resets/navigation/close to that exact originating owner. `IconPickerResources.useIcons` uses `scope.orpc.icon.findIcons.queryOptions` with the real input/enabled/placeholder settings and abort-forwarding generated query function. Map actual query status/data/refetch to `IconPickerQuery`; failures remain visible/retryable reads, not empty data. Set `canUpload: false` and omit upload for this read-only capability, rather than synthesize an upload callback.

Keep source Mantine fields, IconPicker keyboard/group/ranking behavior, ping clearing, dirty draft and imperative `Promise<boolean>`. The existing wrappers already retain unknown/confirmed/reconcileheld/settled creation outcomes; native `features/apps/app-form.tsx` currently uses ordinary mutation failure and does not itself retain an unknown outcome to block a second create. Adoption must retain a real acknowledgement/unknown disposition rather than treat every error as safely resubmittable. Reconciliation retry reuses the captured confirmed result and never calls the producer again. UI retirement suppresses presentation, not required reconciliation/effects.

W consumes these bindings for actual single/multi selectors, quick-add, bookmarks and embedded App editor controls. Returning selected Apps is not Board placement; Board mutation admission remains P/R's dependency. No ping/health/integration detection, automatic URL probe, favorite endpoint or upload capability is invented. Shared translation/Link/modal ownership remains the existing W/U composition seam, not an I framework rewrite.

## Exclusive prospective write map / dependencies

| Owner                | Exact proposed paths / deliverable                                                                                                                                                                                                                                                                                                                                         |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I                    | New `packages/api/src/nitro/routers/-icons/native-read-resources.ts`; amend `routers/-apps-search/resources.ts`, `routers/app.ts`, `routers/-apps-search/app-access-control.ts`; new `routers/-apps-search/native-execution.ts` for genuine SQLite/PG SQL bodies. Existing `packages/icons/src/native-read.ts`, parsers/sync and original App/cron callers stay unchanged. |
| I, serialized with W | New `apps/nitro/src/features/apps/form-client.tsx`; amend App `context.tsx`, `app-form.tsx`, `selection.tsx`, `index.ts` and `src/source-ui/apps/contracts.ts` for real scope/form binding. Keep shared form/picker sources unchanged unless an independently identified integration defect needs reassignment.                                                            |
| A                    | Supply actual captured authenticated principal, current authority/request registration and retirement; not caller-supplied booleans. No A host/auth implementation researched or allocated here.                                                                                                                                                                           |
| P                    | Amend existing `packages/db/runtime.ts` / `transaction-gate.ts` at its owned authority-before-log/native-COMMIT seam, bound to A's actual issuer and participating durable writers. Pair bodies above reuse its native gates. No I persistence/epoch implementation.                                                                                                       |
| R                    | Own `packages/api/src/nitro/assembly/{index,resources}.ts` joins and genuine request-resource construction; retain current setup/demo/effect/error contracts. Accept required App/Icon dependencies, no fallback resources.                                                                                                                                                |
| H                    | Construct the reader/execution binding inside the existing main owner in `apps/backend/src/server/runtime-composition/native-main-persistence.ts`; enroll close/drain before publication and persistence close. Do not create a second runtime or export a raw global DB.                                                                                                  |
| W                    | Consume real App form/selector/IconPicker bindings and actual native modal-layer ownership; coordinate the App-context/selection write boundary before assigning writers.                                                                                                                                                                                                  |
| Coordinator only     | API Icon subpath declaration, Nitro forms workspace edge and any required native engine/schema public type declarations; lock/manifests/global assembly/status/validation. Existing API oRPC dependency is already present.                                                                                                                                                |

**Startable after allocation:** Icon adapter and source-preserving form adapter/signature work; native App SQL-body split against agreed A/P execution contract. **Not ready to mount:** App mutation authority through COMMIT, actual private consumer enrollment or PostgreSQL App context unification. No feature/91-of334 increment follows from this report.

Documentation cross-check: Context7 returned its existing monthly-quota failure; no repeated lookup, installation or CLI attempt. Official [Drizzle transactions](https://orm.drizzle.team/docs/transactions) and [inserts](https://orm.drizzle.team/docs/insert) confirm native transaction grouping and parameterized multi-row insertion. Their current v1-oriented examples do not override this checkout's driver/gate types or establish through-COMMIT authority; no version upgrade is proposed.
