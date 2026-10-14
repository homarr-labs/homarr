# AW3 — smallest genuine host enrollment plan

## Decision and evidence boundary

**APPROVE the bounded two-file source-allocation plan below. No missing Auth/issuer constructor producer was found.** This is a planning recommendation, not implementation authorization, route enrollment, compiler acceptance, physical proof or runtime PASS. Coordinator/Oracle authorization and any required independent review still precede implementation.

The supplied AW2 atomic five-source plus API-leaf freeze, independently accepted axes, completion-keyed WeakMap repair and fresh Backend/Nitro owners-zero results are premises, not checks reproduced here. All existing source remains frozen. This NEW report is the sole write. Only ordinary source/report reads and searches were used; no commands, checks, tests, builds, import evaluation, native/SQL execution, environment/data/secrets, product writes or nested agents. Neither failed nor successful compiler artifacts were opened, copied, merged or reissued; their separate identities and native-inspection boundary remain intact.

## Constructor availability is not credential availability

The genuine producer chain already exists:

- `apps/backend/src/server/compose.ts:17–52` selects explicit public-only or complete authenticated-read construction, using the existing ID source, clock, exact eleven read policies and configured issuer resources. It does not construct another MAIN.
- `runtime-composition/runtime.ts:80–91` creates and readies the one MAIN, checks captured host/issuer origin agreement, then awaits its real `createAuthenticatedReadResourcesAsync`.
- `native-main-persistence.ts:476–589` retains the SQL issuer and Auth resources, installs required fixed dispatch against that same issuer, and records the actually fulfilled construction result. Construction is single-install and failure drains acquired resources.
- `native-main-persistence.ts:591–637,709–718` exposes the concrete `createFixedWriteRpc(input)`. It requires those retained resources, the fulfilled result identity, same SQLite runtime, current owner and no started Auth cleanup. It supplies its own request/setup tracking to the existing adapter; it takes no caller issuer, runtime, lease or admission flag.
- `auth.ts:600–650` already admits exactly the three literal write requirements alongside the unchanged configured read rules. `fixed-write-rpc.ts:150–335` already returns their real exact POST handlers. They are currently unmounted because runtime/assembly do not consume them.
- `packages/auth/nitro/production-sessions/service.ts:648–696` constructs and privately registers the actual SQL issuer/request reader. `sql-persistence.ts:164–227` and `sql-authority/authority.ts:148–206` provide its genuine owned authority construction. No constructor-time adoption/ready-domain assertion was found in this chain. Configuration/lifetime validation can still reject; no execution established successful construction here.

Do not confuse that last observation with an available authenticated request. AW's credential decoder still requires the genuine ready SQL domain, complete current credential/grants and supported configured provider. Missing/nonready domain is unavailable, not anonymous readiness. `packages/db/runtime.ts:379–461` still holds file-backed first adoption and requires original native fresh ownership; this plan neither invokes nor replaces adoption. The existing MAIN composition does not supply that missing provenance by constructing an issuer.

Thus the next source task is consumption of an existing constructor, not a new Auth producer. A usable authenticated credential/domain remains a genuine activation prerequisite. A fresh file-backed host is not thereby a working authenticated host or login flow.

## Exclusive future source allocation

| File                                                      | Only approved responsibility                                                                                                                                               |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/backend/src/server/runtime-composition/runtime.ts`  | Call the existing retained MAIN constructor after actual Auth construction; pass its exact three contributions separately to assembly.                                     |
| `apps/backend/src/server/runtime-composition/assembly.ts` | Require a separate internal fixed-write collection on the authenticated branch, validate the finite exact route set, and place it before the existing public RPC fallback. |

No producer amendment is required. Keep `auth.ts`, `contracts.ts`, `native-main-persistence.ts`, `fixed-write-rpc.ts`, the API fixed factory/export, AH helpers, application, startup/compose/host, join slots, generated/browser/expansion contracts and all DB/Auth producers unchanged. No manifest, barrel, dependency, general router, public configuration flag, credential/evidence surface, framework, client or cache-key addition.

If later review finds a genuine missing constructor/admission producer, STOP this consumer allocation. Identify its exact producer and failed prerequisite for a new allocation; never introduce a fake issuer, optional owner, throwing placeholder adapter, fallback backend or success DTO. Current ordinary source does not demonstrate such a missing constructor.

## 1. Runtime consumer

Inside the existing `options.authentication.kind === "authenticated-read"` branch, only after `requests` was obtained by awaiting MAIN construction:

1. Preserve the existing native read resources, read assembly and `createAdmittedAuthenticatedRpc` call unchanged.
2. Obtain `fixedWrites` from **this** `persistence.createFixedWriteRpc` with exactly:

   | Required argument      | Existing trusted source                                                         |
   | ---------------------- | ------------------------------------------------------------------------------- |
   | `path`                 | `hostPath(configuration, "/rpc")`                                               |
   | `baseUrl`              | `configuration.baseUrl` captured at runtime entry                               |
   | `createId`             | `options.authentication.createId`, already supplied by real startup composition |
   | `maximumRequestBytes`  | `options.authentication.construction.issuer.bodyBudget.maximumBytes`            |
   | `maximumResponseBytes` | `options.authentication.maximumResponseBytes`                                   |

3. Supply `requests`, the unchanged read `rpc` and the constructor's actual `fixedWrites` on the internal authenticated assembly branch. Keep `rpcAuthentication` pointing at the same `requests` and budgets for signed-in use of the two public leaves.
4. Retain the existing final MAIN assertion and catch/await `persistence.dispose()` construction-failure path, including aggregate cleanup failure.

There is one fixed-constructor call per authenticated host composition, not one per request or one per read/write scope. It constructs routes, not another issuer/native owner and not a native write. Do not import/call `createAdmittedFixedWriteRpc` directly from runtime, inject substitute tracking callbacks, bind a BackendContext at startup, or instantiate the full App/Board/expansion families.

The public-only branch makes **neither** Auth construction nor fixed-constructor call. Its existing anonymous services, exact two public source leaves, culture/health/locale behavior and held private namespaces remain unchanged. Import presence is not a claim that a constructor was instantiated.

Configured Auth construction or fixed-constructor rejection propagates through the existing cleanup/error path. Do not catch it into a silently downgraded public host or an empty write array. If Auth is not legitimately configured/available for enrollment, explicitly select the existing public-only composition and report only that enrollment. Do not report three mounted actions, unsupported-200 placeholders or authenticated availability.

## 2. Assembly consumer and finite enrollment validation

Extend only the internal authenticated branch of `assemblePublicResourceHost`'s options with **required** `fixedWrites: readonly FetchContribution[]`. Do not rename `authenticated-read`, widen `HostAuthenticationInput`, add a public enrollment toggle or extend `authenticatedRpcReadAccess`.

As already reserved by AW Lease 2, an explicit zero collection denotes no fixed enrollment for an independently assembled read-only host. Any nonzero collection must contain exactly the following three routes. The actual runtime consumer above must supply the real constructor's three, never zero on failure. No optional property/default conceals absent constructor output.

| Source identity                   | Exact suffix under captured `/rpc` | Action  | Source business policy                                                               |
| --------------------------------- | ---------------------------------- | ------- | ------------------------------------------------------------------------------------ |
| `app.create`                      | `/app/create`                      | `write` | mutation; guarded demo mode; authenticated plus `app-create`                         |
| `board.saveUserBoardPermissions`  | `/board/saveUserBoardPermissions`  | `write` | mutation; guarded demo mode; authenticated; B owns transaction-local Board authority |
| `board.saveGroupBoardPermissions` | `/board/saveGroupBoardPermissions` | `write` | mutation; guarded demo mode; authenticated; B owns transaction-local Board authority |

Validate each actual contribution against the captured base path: phase `rpc`, `descendants === false`, exact path, protected access, `action === "write"`, exact matching resource and genuine callable handler. Require exact cardinality/unique paths/unique resources and complete one-to-one membership; reject duplicates, unknown entries, path/resource mismatches, read classification and collisions with enrolled exact read/foundation routes. The finite three-identity allowlist belongs locally to assembly; no exported general permission/router registry is needed. Reuse the unchanged eleven-read validation rather than duplicating or broadening it.

Keep Auth's actual `resolvePrincipal`/`authorize` and settings' actual `resolveSetup` services. Compose the route sequence in the existing resource contribution as unchanged authenticated reads, validated fixed writes, `options.rpc`, locale commit and original held-namespace 404 fallbacks. Preserve the independent exact foundation health routes. The public descendant adapter intentionally overlaps the `/rpc` prefix; this is not an exact route collision. It must remain after private exact routes, with its original two-path membership check before parsing or SQL.

Do not wrap the three handlers or reconstruct their context. Assembly's route checks prove enrollment descriptors only. The frozen adapter's request-local `validateAssembly` (`fixed-write-rpc.ts:82–110,269–283`) remains the required original API revision/identity/three-leaf/no-lazy/mutation/demo/App-permission/Board-protected source-policy validation **before** any business handler. Do not move it after input parsing/dispatch, substitute Fetch descriptors for source-policy proof, or construct another read/write scope merely to validate a query.

## Exact request and publication path stays owned

`fetchApplication` → existing composed host → existing `createApplication.fetch` creates the final outer RequestContext once. Application retains the actual resolved frozen Principal and original request/requestId/signal/onDispose quartet. It authorizes the selected exact Fetch route before calling it. Auth's original principal WeakMap resolves that same association; no cloned outer context/principal or middleware copy supplies authority.

For a selected fixed POST, the unchanged adapter:

1. Registers actual finite request work in MAIN and calls AH's `prepareAuthenticatedRpcRequestAsync` once. The real association lease, original bounds, current user, joined signal and timer produce the one existing `onPrivateResponsePublication` guard.
2. Uses MAIN's genuine native setup scope to call `createSetupBackedContext` with the original Request and actual preparation. Auth binds the **returned final frozen BackendContext** to that original outer association/preparation and selected literal leaf. The copied native user principal is checked, not substituted as outer authority.
3. Builds the narrow API assembly from the binding closures, validates source policy, bounds the actual request body and dispatches only the selected exact path. One binding/handler and at most one selected dispatch are allowed; parsing a valid query cannot instantiate all writer/read scopes or mount all source families.
4. Passes the original association lease and operation, including original `association.operation.signal`, through MAIN/AW's retained issuer dispatch. Do not pass the preparation's newly joined signal as AW's operation signal or forward native results through guarded read `runAsync`/`trackRead`.
5. Awaits actual handler/write and finite output/cancellation settlement, performs the existing preparation/currentness checks, and returns the real finite Response for publication by the original application guard.

Application retains unchanged guard checks before header finalization/return and each owned body enqueue, cancellation and outer disposal. No second guard, outer publication waiter, receipt, credential-success flag or fence bypass is added. Source enrollment does not clear Auth HTTP's independent publication hold: existing issuer outcomes remain `publication: "held"` and its publisher remains unavailable. Login/renew/logout/provider callbacks are not mounted, and App's projection metadata does not activate another OpenAPI/MCP endpoint.

## Drain and settlement — no new cycle

- Keep `FetchContribution` as a handler descriptor, not a new disposable owner. There is no finite-adapter disposer to add at host scope. Existing helpers own reader locks, pending reads, cancellation/closed tasks and per-request timer/listener retirement.
- MAIN's actual `runRequestAsync` tracks preparation through finite output and post-scope failure cancellation; its setup task retains real scope work and its dispatch task retains the actual AW promise. Completion-keyed `fixedRecords` stays weak, with the strong pending `fixedTasks` retaining actual work until settlement.
- Auth's handler/write completions remain association-owned. Release closes admission, drains those actual obligations and reads, then releases the original lease and retires bindings. Binding retirement remains on original outer disposal, not successful route return.
- Application shutdown aborts its lifetime, drains retained outer requests and then disposes the existing MAIN contribution. MAIN closes admission/aborts its lifetime, drains actual construction/read/request/setup/fixed obligations, then closes Auth resources → issuer → helper/native resources with existing cleanup retention.
- Handler/setup/request/native tasks **never await outer body consumption, original onDispose completion, association release or MAIN close**. They can settle and return the finite response before application publication/body lifetime ends; outer disposal can then release the lease. Do not add a host publication cycle or a second MAIN drain.

Native fulfillment/error/actual `TransactionCommitAmbiguousError` remains recorded before handler output/publication failures. Lost output, parse/serialization/currentness/cleanup failure does not erase fulfillment, prove rollback, authorize retry/regenerate an ID or fabricate client receipt. Real ambiguity remains nonretryable; quarantine stays intact.

## Finite surface and unchanged holds

After an authorized source implementation, accurately describe only: **two public anonymous source RPC leaves**, the existing **eleven authenticated read leaves**, and **three configured-auth exact fixed-write routes**. These are source enrollment counts, not demonstrated successful requests. Existing foundation health and guest locale are separate, not extra source-family acceptance.

Public-only keeps exactly `serverSettings.getCulture` and `serverSettings.getBranding`; private/unknown RPC paths pass through that two-leaf selector to existing 404 holds. Anonymous access to enrolled protected routes remains 401, actual Auth policy denial remains 403, admitted wrong methods retain the original POST/405 behavior, and genuine faults retain existing sanitized failure handling—not unsupported success responses. Private rendering still fails its original public-culture guard; signed-in guest locale still rejects rather than being made anonymously successful.

Do not modify generated public/browser/expansion contracts, hydrate credentials, invent clients/cache keys or infer availability from a broad type/port map. In particular, no assertion that all 334 catalogued source leaves or untested families are accepted/mounted follows. Broad Integration/Widget/CustomWidget/App/Board assemblies and optional substitute resources are not needed for this join. Existing join-slot holds remain descriptive and unchanged; no new all-writer-ready or production-listener flag is issued.

Continue to HOLD file-backed first adoption, existing-file/restart/restore provenance and fresh native-owner prerequisites; K/D target physical/whole-target authority remains WITHHELD. Generic COMMIT/plain credential DELETE, all-enabled writer conservation, full Auth HTTP/provider/login publication, private SSR/UI, PostgreSQL writes and normal production-host origin/base-path/startup support remain outstanding. `startup-configuration.ts:275–410` still permits only its explicit loopback, empty-base-path, fresh-file startup and refuses existing paths. Passing captured `hostPath` into the constructor preserves its source contract; it does not certify production/base-path deployment.

## Handoff gate

Authorize only the two consumer files, freeze their exact delta, and obtain the required Oracle/independent source review before any separately authorized focused validation. Review the public-only nonconstruction branch, actual constructor input origins/budgets, zero-versus-three distinction, exact ordering/policies, original context/association/signal identity, no read-wrapper fixed dispatch, and acyclic finite/native/publication cleanup. No tests or checks were run or requested by this report; no new test files are proposed.

**Outcome: APPROVE two-file source allocation; genuine constructors are present, authenticated activation prerequisites remain held, and no runtime PASS or newly mounted route is fabricated.**
