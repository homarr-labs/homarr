# AW Lease 2 — three fixed RPC leaves, original Auth owner

## Premise and boundary

Oracle planning handoff only. The six-file AW bridge scoped ACCEPT, ping repair and coordinator types0 are supplied premises, not independently reproduced acceptance. All reached source is frozen. Read `convergence-AW-plan.md`, `convergence-AW-implementation.md`, `convergence-AW-ping.md`, `WRITER-RULES.md` and the ordinary producer/consumer files below. The located ping handoff is `convergence-AW-ping.md`; no separate finalping filename was found. This new report is the sole write. No commands, checks, tests, evaluation, product edits, native/SQL/data execution, environment/secret access, network research or nested agents.

Recommend a small producer freeze followed by a consumer freeze, then a separately approved enrollment. Do not reopen AW/D/C1/B/P or the broad migration/adoption design. The accepted bridge supplies fixed dispatch, not a working Auth HTTP flow or permission to activate routes.

## Source facts that constrain the join

- `packages/auth/nitro/production-sessions/service.ts:709–729` already exports the two accepted functions. They resolve `productionSqlIssuers` and the owned SQL registration; keep these signatures unchanged.
- `sql-persistence.ts:247–277` requires dispatch `operation.signal === registration.operation.signal`, and a deadline no greater than the original registration. Backend must pass `association.operation`, not AH's newly joined RPC signal. AW privately joins the admission/lease/owner lifetimes and captures credential evidence itself.
- `sql-persistence.ts:442–531` prepublishes `requestWrites`, preserves actual fixed producer fulfillment/error/ambiguity, and has no post-fulfillment read-current check. No backend evidence getter or settlement getter is needed.
- `apps/backend/src/server/runtime-composition/auth.ts:212–225` owns the outer Principal WeakMap and checks the exact original request/requestId/signal/onDispose quartet. Its current `trackRead` sanitizes errors; `release` currently drains only reads. Fixed dispatch needs a separate path and release obligation.
- `native-main-persistence.ts:107–135` flattens rejection and postchecks fulfillment. Neither this registration nor its guarded `runAsync` is a fixed-write outcome channel.
- `authenticated-rpc.ts:41–99` already prepares the current lease/user, deadline and joined publication signal and registers the one private publication guard. Reuse this helper, `prepareFiniteRpcRequestAsync` and `readFiniteRpcResponseAsync` unchanged. Do not reuse `createAdmittedAuthenticatedRpc` for writes: its eleven-read registry and handler-wide read wrapper are deliberate boundaries.
- `createSetupBackedContext` is exported by `packages/api/src/nitro/resources/-setup-read/index.ts`, not a standalone `resources/setup-read.ts` file. It returns `createBackendContext`'s final frozen context and copied native principal. `authenticatedProcedure` subsequently passes a middleware context copy. Neither copy is the outer Auth Principal.
- `packages/api/src/nitro/routers/app.ts:217–257` supplies the original create descriptor, schemas and six insert fields. `board-mutations.ts:1242–1316` supplies the two replacement inputs/void semantics, but its candidate middleware holds the whole family. Do not instantiate that family or invoke its preauthorization/generic DML bodies.

## Exclusive allocation

Only the following product paths are required for the later implementation. They are not edited by this report.

| Order / owner      | Exact file                                                               | Bounded responsibility                                                                                                                                                                                                                                              |
| ------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Producer           | `apps/backend/src/server/runtime-composition/contracts.ts`               | Backend-private required fixed-dispatch, binding and construction types; derive arguments/results from AW's frozen signatures. No credential/native fields in public host configuration.                                                                            |
| Producer           | `apps/backend/src/server/runtime-composition/native-main-persistence.ts` | Same retained issuer/runtime; separate prepublished fixed-task registration; internal setup-scope/handler drain; concrete `createFixedWriteRpc` construction method.                                                                                                |
| Producer           | `apps/backend/src/server/runtime-composition/auth.ts`                    | Original association → final-context binding → fixed business closures; exact literal write admission; association-owned handler/write drain and retirement. Preserve all current read behavior.                                                                    |
| Consumer           | NEW `packages/api/src/nitro/assembly/fixed-writes.ts`                    | Exactly three request-local procedures, original input/output contracts and sanitized fixed-domain error mapping. No whole App/Board factory.                                                                                                                       |
| Coordinator facade | `packages/api/package.json`                                              | Exactly one subpath `./nitro/assembly/fixed-writes` → `./src/nitro/assembly/fixed-writes.ts`, after factory freeze. Export only `createFixedWriteAssembly` from the new file; infer its resource type with `Parameters`. No barrel/client/DB/Auth export expansion. |
| Consumer           | NEW `apps/backend/src/server/runtime-composition/fixed-write-rpc.ts`     | Exact POST fetch adapters, request-local assembly, finite transport, physical/handler/publication separation. Backend-local module only; no package export.                                                                                                         |
| Enrollment only    | `apps/backend/src/server/runtime-composition/runtime.ts`                 | Invoke the retained persistence owner's concrete constructor after Auth construction; wire the three candidates only under a later approved enrollment. No second issuer/runtime.                                                                                   |
| Enrollment only    | `apps/backend/src/server/runtime-composition/assembly.ts`                | Separate exact three-write route validation alongside, not inside, the exact eleven-read validation; order both before the existing public RPC fallback.                                                                                                            |

Producer and consumer changes can freeze before enrollment. Until enrollment is approved, leave `runtime.ts`/`assembly.ts` registration unchanged; a callable unmounted constructor is a real source producer, not a placeholder route. These two files are explicitly reserved for the subsequent registration step, not silently authorized by types0.

No changes to accepted `authenticated-rpc.ts`, `public-rpc.ts`, `application.ts`, public `RequestContext`/BackendContext/Principal, shared procedure/error middleware, old App/Board routers, Auth's six files, D/C1/B/P/K, schemas, migrations, host listener/startup, join slots, private SSR/UI or frontend clients. If a required join cannot be represented in the eight named paths, stop for a new allocation; do not deep-import private package leaves or invent an owner.

## Required private interfaces and producers

Names below are the proposed exact Lease 2 interfaces, not claims that they currently exist. Backend-local type exports for cross-file use are not package-public surfaces.

### 1. MAIN fixed dispatch — required at Auth construction

`contracts.ts` defines `MainFixedWriteDispatch` with:

- `dispatchBoardPermissionsAsync(lease, operation, mutation): Promise<void>`; arguments are indices 1/2/3 of `Parameters<typeof dispatchProductionBoardPermissionsAsync>`.
- `dispatchAppCreateAsync(lease, operation, mutation): Promise<AppMutationResult>`; arguments/result derive from `dispatchProductionAppCreateAsync`.

`createAuthenticatedRequestResources` receives a **required** `fixedDispatch: MainFixedWriteDispatch` option in addition to its current issuer/configuration. `createAuthenticatedReadResourcesAsync`'s sole production construction makes this object after acquiring `authIssuer`, closing over that exact issuer and the existing MAIN owner. There is no default implementation, optional fixed owner, backend-user permission callback or caller-supplied runtime.

Both methods use a new private `registerFixedDispatch` in `native-main-persistence.ts`. Prepublish the completion/entry into a separate fixed-task set before deferred invocation or any reentrant close. Check MAIN admission before forwarding; call exactly AW's corresponding exported function with the retained issuer. Capture the underlying AW promise and settle the completion from it, preserving value/error identity. Never postcheck native fulfillment, flatten rejection, or route these methods through `registerOperation`, MAIN `runAsync` or `trackRead`.

`dispose` closes admission first and drains registered setup/handler obligations and fixed tasks before Auth/issuer/helper/native cleanup. Keep primary versus cleanup failures separately. A rejection handled by oRPC still has a retained private physical record; deleting a pending-set member does not erase the record. No new general runtime method, native callback, raw handle or arbitrary SQL facility is returned.

### 2. Auth binding — original outer context is the authority key

`auth.ts` adds a private final-context WeakMap and a binding set per `RequestAssociation`, plus association-owned fixed promises. Its returned **backend-private** resource adds:

`bindFixedWriteBackendAsync(outerContext, finalBackend, preparation, selectedLeaf): Promise<FixedWriteRequestBinding>`

- `outerContext: RequestContext` must resolve through the existing `associationFor`; retain the original Principal and quartet, exact lease and original `association.operation`.
- `finalBackend` is the actual return from this MAIN owner's `createSetupBackedContext`, never its input or a middleware copy.
- `preparation` is the actual locally retained return of `prepareAuthenticatedRpcRequestAsync`; type it with its `Awaited<ReturnType>`, not a synthesized admission DTO. Check its currentness, deadline bounds and exact joined signal against the newly constructed final context. Read the original association's actual current backend user and verify the final frozen user's original profile/provider/expanded permissions against that observation, including the admitted user ID. These checks register a context; they do not authorize SQL.
- `selectedLeaf` is exactly `app.create`, `board.saveUserBoardPermissions` or `board.saveGroupBoardPermissions` and is captured from the adapter's literal route, never request body data.

`FixedWriteRequestBinding` has exactly:

- `saveBoardPermissionsAsync(mutation: BoardPermissionsMutation): Promise<void>`;
- `createAppAsync(mutation: AppMutation): Promise<AppMutationResult>`;
- `runHandlerAsync(handle: () => Promise<Response>): Promise<Response>`.

The last method is a host-private transport lifetime obligation, not a native/SQL callback or authorizing receipt. It prepublishes the actual handler/finite-body task, permits only one invocation, and scopes the dispatch closures to that active handler. Do not expose a caller-written settlement flag or result-as-authority object.

Before forwarding either mutation, re-resolve `associationFor` on the retained outer context and the final-context WeakMap entry. Require the same binding/association, no release/close, original demo mutation allowance, active handler, matching selected leaf/kind, and no previous fixed dispatch claim. Check preparation admission before forwarding, then pass **the original association lease and operation** to `fixedDispatch`. Claim/prepublish before invocation, copy business input, and retain the actual forwarded promise independently of handler output. Do not pass `finalBackend.signal` or `preparation.signal` as AW's operation signal.

The closures contain no public credential evidence, lease getter, new deadline, native runtime or backend permission DTO authorization. Existing middleware permission checks remain admission semantics; B/P transaction-local policy remains the SQL authority.

Release first closes new binding/dispatch admission. Drain actual handler/write tasks and cancellation obligations, then release the lease and retire bindings. Register the binding disposer on the original `outerContext.onDispose`, not the inactive setup callback after scope exit. Keep bindings until owned output consumption/cancellation triggers application disposal; do not retire at the route's successful `finally`. Handler drain must not wait for the same `onDispose` callback that is awaiting it. Association/owner shutdown retains cleanup faults without rewriting fixed settlement.

### 3. MAIN-owned adapter construction

`contracts.ts` defines `FixedWriteRpcConstructionInput` with required `path`, `baseUrl`, `createId`, `maximumRequestBytes`, `maximumResponseBytes`, using the existing path/origin/function/budget types. No caller issuer, runtime, schema/evidence, success flag or readiness flag.

`native-main-persistence.ts` adds backend-private `createFixedWriteRpc(input): readonly FetchContribution[]`. Require the already constructed retained `authRequests`/`authIssuer` and current MAIN; fail closed if they are absent. This method calls `createAdmittedFixedWriteRpc` from the new local adapter, providing only that owner's retained resources and internal setup-scope access. It does not construct Auth again.

For setup, a private `runFixedWriteSetupScopeAsync` uses the **captured native runtime's** ordinary `runAsync` solely to provide the real database/schema to `createSetupBackedContext`. Its prepublished task also drains on MAIN close. This helper is not returned to callers or exported as a new database callback API. The new adapter receives it only through the private construction closure; no request can supply it.

Keep the setup admission active through handler/finite serialization and revoke it on actual scope settlement. This scope is not a mutation transaction or fixed-result channel. Fixed dispatch has its own MAIN/Auth/AW completion and is never run through the old guarded read wrapper. If ordinary scope cleanup or post-handler currentness fails after a fixed fulfillment, record that separately and withhold response; do not convert the captured fulfillment into a native rejection.

## Three-leaf API consumer, without a broad router

`fixed-writes.ts` implements `createFixedWriteAssembly(finalContext: BackendContext, resources)`; the required resources are `createId`, `saveBoardPermissionsAsync` and `createAppAsync` with the types above. Return `defineBackendContribution` with revision `homarr.backend.source-port.v2`, ID `homarr.fixed-writes.source-port.v2`, router branches containing only the three methods and those exact three leaves.

Use existing `sourceProcedure` with the original authenticated/protected-or-permission descriptors, adding a request-local context-identity middleware before the handler. `sourceProcedure` performs the original auth/demo/permission/error behavior without replacing the context; require `context === finalContext`. There is no need for authenticated user type narrowing because handlers consume only validated business input and captured closures. Do not compare an `authenticatedProcedure` middleware copy with the registered final context, cast it back, or edit shared middleware to brand copies.

| Leaf                              | Original contract                                                                                                          | Fixed mapping / result                                                                                                                                                                                                  |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `board.saveUserBoardPermissions`  | mutation, protected, demo guarded; `boardSavePermissionsSchema`                                                            | `kind: "replace-user"`, `boardId: input.entityId`, detached original `principalId`/`permission` list; actual void success.                                                                                              |
| `board.saveGroupBoardPermissions` | mutation, protected, demo guarded; same schema                                                                             | `kind: "replace-group"`, same mapping; actual void success.                                                                                                                                                             |
| `app.create`                      | mutation, permission `app-create`, demo guarded; `appManageSchema`; `z.object({ appId: z.string() }).and(selectAppSchema)` | Generate exactly one ID after original admission/input validation. Copy `id`, `name`, `description`, `iconUrl`, `href`, `pingUrl`; preserve empty ping → null. Dispatch `kind: "create"`; use the actual native result. |

Import schemas through existing `@homarr/validation/board`, `@homarr/validation/app`, `@homarr/db/validationSchemas`; types/errors through the accepted DB App/Board facades. API/Backend manifests already declare the relevant workspace packages and existing oRPC/Zod libraries; no dependency addition is needed. This plan uses observed source patterns, not a new library API implementation.

**App output join is concrete and required:** both actual App schemas have exactly the six fields, with nullable description/href/ping and no hidden timestamps/default columns. `AppMutationResult` nevertheless declares optional description/ping because it is insert-shaped, and P returns `{ appId, ...insertValues }`, not a selected row. Original `appManageSchema` supplies explicit nullable description/ping. Validate the actual result with the unchanged intersection and return the parsed result after physical fulfillment; do not rely on the broad result type, invent null/defaults or perform an extra row read. Output failure is handler settlement failure after an acknowledged native write, not rollback. If coordinator validation exposes a real incompatible producer contract, hold this leaf and allocate the actual producer/consumer repair rather than weakening output.

Map only known sanitized errors in the new factory after the binding has retained the original rejection: Board `NOT_FOUND` → original masked `NOT_FOUND`/"Board not found", `BAD_REQUEST` and `PRECONDITION_FAILED` retain their codes; App `AppMutationPermissionError` → original `FORBIDDEN`/"Permission denied". App precondition/unrecognized native failures remain sanitized internal errors under existing `toBackendError`. Do not expose SQL details or suppress duplicate/FK errors. Preserve existing App projection metadata on the concrete create leaf without enabling an additional OpenAPI/MCP transport.

## Fetch adapters, fences and physical acknowledgment

`fixed-write-rpc.ts` constructs exactly three literal routes under the existing `/rpc` base: `/app/create`, `/board/saveUserBoardPermissions`, `/board/saveGroupBoardPermissions`. Each is phase `rpc`, `descendants: false`, protected `action: "write"`, exact source resource, and POST-only (405 with `Allow: POST` otherwise). No mutation is classified as a read or reachable via the descendant public fallback.

The adapter's order is required:

1. Prepare once with AH's existing `prepareAuthenticatedRpcRequestAsync`, preserving its single `onPrivateResponsePublication` registration, actual lease/user checks, timer, original host-bound deadline and joined publication signal.
2. Prepublish owned handler/setup work before entering the genuine same-owner setup scope. Construct the final context with the original Request, preparation signal/principal, captured demo/origin and existing setup `eq`/clock resources. Bind the returned final context through Auth before any RPC handler runs.
3. Construct the request-local three-leaf assembly from the final context and this binding's closures. Validate revision/ID/leaves/unique descriptors/no lazy routes and exact access/kind/demo for all three. Use the existing RPC handler POST pattern and finite request helper; never pass the unbounded transport Request to the handler.
4. Execute handler and finite response read within `binding.runHandlerAsync`. Capture a matched response before reading so failure can cancel it; unmatched selection fails closed. Keep handler/output failures separate from fixed dispatch. No detached promise, abort race or early response may stand in for physical completion.
5. Await physical fixed completion and handler/finite serialization. Recheck real preparation currentness before returning the finite response. On any fault cancel/drain readers, cancellation and closed promises using the existing helper behavior; preserve primary and cleanup faults. The unchanged application performs further private checks before headers/body publication and every owned body pull, retaining cleanup until consumption/cancellation.

Private records distinguish `not-forwarded`, `forwarded/pending`, `fulfilled`, `rejected` and `ambiguous`, plus independent handler/publication/cleanup outcomes. Record actual fulfillment or original `TransactionCommitAmbiguousError` **before** oRPC error conversion/output validation. `instanceof TransactionCommitAmbiguousError` comes from the existing `@homarr/db/runtime` export; do not classify by a DTO/code string or an aborted signal. AW's finer native-invocation phases remain private there: forwarding its promise does not prove COMMIT was reached. Ordinary rejection does not independently prove rollback.

Physical fulfillment acknowledges the producer write even if output validation, deadline/currentness, scope cleanup, body cancellation or publication subsequently fails. Preserve that acknowledgment internally and withhold success output when the fence fails. Do not retry, regenerate an App ID, claim rollback, or fabricate client receipt. Actual ambiguous COMMIT remains ambiguity/nonretryable and the native quarantine is not cleared. A transport 500/499 or lost body after fulfillment is not a newly ambiguous COMMIT; database settlement and client receipt are not atomic.

## Admission and enrollment without widening reads

`auth.ts` may recognize only the three fixed literal `write` requirements in addition to its unchanged configured eleven read rules. Reuse the exact principal/signal association lookup and authentic current user read; apply `enforceMutationMode(..., "mutation")`, `requireAuthenticated`, and App's original `requireGlobalPermission(..., "app-create")`. Board ownership/full-grant decisions remain inside B. No wildcard action/resource table, structural credential authority or permissions taken from request input. Recognizing a literal requirement does not itself mount a route.

At separately approved enrollment, `runtime.ts` calls the retained owner's `createFixedWriteRpc` using its already captured origin/path/ID source and existing issuer request-body/response budgets. `assembly.ts`'s internal authenticated branch gains a **required separate** `fixedWrites: readonly FetchContribution[]`: zero means no enrolled fixed routes; otherwise require exactly the three validated routes, no duplicates/collisions. Do not extend `authenticatedRpcReadAccess`, rename the authentication mode, or claim new join-slot readiness. Mount the exact reads and the accepted exact writes before `options.rpc`; keep its culture/branding-only public registry unchanged. There is no host-controlled credential/adoption bypass or fabricated enrollment success flag.

## Mountable versus held

- **Unchanged source enrollment:** the eleven authenticated reads (`info.getInfo`, `serverSettings.getAll`, `serverSettings.getBoardSettings`, `user.getPreferences`, `user.getTourStatus`, `group.getAll`, `group.getPaginated`, `group.getById`, `group.selectable`, `group.search`, `apiKeys.getAll`) and their original policies/finite/private publication semantics. Only `serverSettings.getCulture` and `serverSettings.getBranding` stay anonymous source RPC leaves; existing foundation health/locale behavior is not reclassified.
- **Exactly three new candidates once genuine prerequisites and enrollment exist:** `app.create`, `board.saveUserBoardPermissions`, `board.saveGroupBoardPermissions`, through the narrow assembly and original owned AW dispatch only. They require a truly ready credential domain, authentic current credential and same MAIN/Auth owner, accepted physical B/P producers, the final-context join, full handler/native/output disposal, and preserved publication fences. Passing types does not supply any of these.
- **Explicitly held:** all other App mutations, all other Board candidates/read-repair queries, broad App/Board family enrollment, identity/provider/account/membership/global-grant/Board-parent writers, generic COMMIT and generic credential DELETE, PostgreSQL writes/activation, and any other unallocated source leaf. Do not instantiate candidates merely to select two methods.
- **K/D holds unchanged:** K whole-target additive schema/journals/snapshots/catalog authentication is not cleared here. D's verified fresh native-memory provenance does not authorize fresh files, existing files, restart/restore or pre-append adoption. No caller mode/empty singleton/schema phase substitutes for native ownership.
- **Publication/product holds unchanged:** Auth login/renew/logout HTTP success and cookies remain held; `IssuerPersistenceOutcome.publication: "held"` and the throwing publisher remain. Renew-not-due is not a success loophole. Private SSR/UI, normal startup/onboarding and all-enabled writer closure remain separate prerequisites. Three source adapters cannot establish a working sign-in or whole-product readiness.

## Oracle decision requested

Approve the three-file backend producer allocation first, freezing required same-owner dispatch/binding/task-drain types; then the two new consumer files and the single coordinator API subpath. Reserve `runtime.ts`/`assembly.ts` for explicit later enrollment. Require a handoff showing the original operation signal, final-context WeakMap join, actual App output parse, pre-sanitization physical records and disposal order. This is a bounded source plan, not compiler/runtime/native acceptance or authorization to run checks, touch data or activate routes.
