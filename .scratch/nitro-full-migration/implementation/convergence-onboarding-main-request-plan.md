# Onboarding MAIN first-request capture — prospective join plan

## Decision and boundary

**The four-path first-request prerequisite needs an additional real constructor caller.** Its actual path is `apps/backend/src/server/runtime-composition/native-main-persistence.ts`. The public Auth capture exists, but forwarding a capture service alone does not configure that issuer's onboarding policy. Startup also lacks approved onboarding header/cookie/credential limits; supplying those through the actual validated startup path needs separately named `startup-configuration.ts` and `compose.ts` cuts. Do not conceal either prerequisite behind an arbitrary policy parameter.

This is a report-only plan, not a source allocation, SOURCE ACCEPT, check result, runtime/enrollment acceptance or usable setup claim. Auth4 remains frozen; Auth2's private retirement/mode repair is in review. Its public capture, four command handles and disposal ports remain the integration boundary. No private Auth onboarding/SQL-persistence source was read for this plan and no repair is reimplemented here. The repair's acceptance remains a dependency, not a conclusion of this report.

The prior `convergence-onboarding-request-producer-plan.md` supplies the four-path prerequisite. In this checkout its request-contract path is **`packages/contracts/src/request.ts`**, exported as `@homarr/contracts/request`; `apps/backend/src/server/application-contracts/request.ts` is absent. This is a path correction, not permission to create a parallel contract or add another framework.

## Actual source anchors

| Source                                                                | Current fact and required consequence                                                                                                                                                                                                                                                                             |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `application.ts:138–143,190–193,351–405`                              | Original Request, requestId and combined request/application signal exist before `await ready()`. The request disposer is synchronous and open. Capture belongs inside the existing try **before that await**, not inside later principal resolution.                                                             |
| `application.ts:255–273,406–453`                                      | Disposal awaits callbacks, but reports callback failures; denied/404 responses normally defer disposal to response retirement. An onboarding failure needs explicit awaited capture retirement before releasing its failure response, not merely eventual streamed-response cleanup.                              |
| `packages/contracts/src/request.ts:15–36`                             | No synchronous start service or opaque onboarding context carrier exists. Add only those narrow, optional members; existing settings/public-only services must not acquire dummy implementations.                                                                                                                 |
| `runtime-composition/auth.ts:135–205,685–766`                         | Resources retain the real issuer. Existing principal admission creates a wall-only operation inside deferred `trackRead`; it is not original onboarding timing. Leave ordinary/Auth/read/fixed-write admission unchanged.                                                                                         |
| `runtime-composition/assembly.ts:209–213,309–351`                     | Assembly reconstructs the services object explicitly. It must forward the new start member explicitly; adding it to auth resources without forwarding leaves an unreachable producer.                                                                                                                             |
| `runtime-composition/runtime.ts:81–92,110–162`                        | Persistence is made ready and authenticated request resources are awaited before resource-host assembly/Application construction. There is no issuer-before-Application cycle requiring a beforeReady hook.                                                                                                       |
| `runtime-composition/native-main-persistence.ts:579–627,650–660`      | This is the actual issuer constructor caller. It captures construction input, calls `createProductionSqlSessionIssuer(runtime, captured.issuer, …)` and then builds request resources on that issuer and owner lifetime. It currently does not derive/bind an approved same-MAIN onboarding policy.               |
| `compose.ts:19–51`; `startup-configuration.ts:172,200–235`            | Startup carries immutable issuer/body budget, request deadline and demo flags. Compose creates the clock/OIDC resources and forwards those values. The strict startup issuer schema has no onboarding policy/limits field. Spreading input cannot manufacture missing approved limits.                            |
| Auth public `service.ts:102–123,1309–1356,1407–1507`; `index.ts:1–34` | The fixed construction option is `onboarding?: ProductionOnboardingPolicy`. Service captures it with the actual origin/providers/body budget and resolves every public operation through its issuer registration. Public requestConfiguration exposes no full origin guard/secrets or onboarding-policy accessor. |

The existing Backend dependencies already include Auth and contracts. Keep Auth imports in Backend, not in the dependency-light contracts package. No manifest, contribution framework, DB, native implementation or Auth public-surface change is needed for the selected carrier design.

## Prospective lease, with missing resources visible

### Mandatory five-path local producer/caller join

1. `apps/backend/src/server/application.ts` — synchronous ingress invocation, exact context carrier and awaited onboarding retirement on failure.
2. `packages/contracts/src/request.ts` — optional synchronous start contract, four-command selector and opaque identity carrier with a real bound disposal method.
3. `apps/backend/src/server/runtime-composition/auth.ts` — issuer-bound capture producer, private wrapper registrations, exact outer-context lookup and tracked retirement/drain.
4. `apps/backend/src/server/runtime-composition/assembly.ts` — explicit start-service forwarding beside resolvePrincipal/authorize/resolveSetup.
5. **Additional:** `apps/backend/src/server/runtime-composition/native-main-persistence.ts` — construct/capture the same-MAIN onboarding policy before calling the existing issuer constructor; pass its retained identity to request resources, never another owner.

### Actual startup-backed limit prerequisite

If this lease must supply the missing approved limits rather than wait for a separately accepted configuration producer, additionally allocate:

6. `apps/backend/src/server/startup-configuration.ts` — an optional, strict, readonly **limits-only** onboarding configuration with the exact bounded fields required by the fixed exported `ProductionOnboardingPolicy`. It must not accept independent demo mode, request-start time, deadline, provider/origin/secret or budget overrides.
7. `apps/backend/src/server/compose.ts` — construct the optional issuer onboarding policy from those approved limits plus this configuration's existing demo flags and request deadline; carry the existing origin/providers/secrets/body budget/clock unchanged.

Thus four files are insufficient; five close the local producer/caller seam **only when approved limits already arrive**, and the inspected actual startup path needs the two named configuration cuts as well. No numeric limits or uninspected policy-field spellings are invented here. Exact approved limit values and their mapping to the frozen public policy type remain a configuration-review prerequisite. Do not silently substitute the body-byte cap for header/token caps, install writable defaults, or claim an absent configuration is enabled.

No `runtime.ts` edit is required merely to pass the existing optional `issuer.onboarding` through its current construction object. No `contribution.ts` edit is required for the service/carrier design below. Later route mounting/final BackendContext joins may need additional explicitly reviewed files; they are not hidden inside these five/seven cuts.

## Policy ownership before application capture

At the existing MAIN construction capture in `native-main-persistence.ts`, capture/freeze the optional onboarding policy as part of `captured.issuer`, not just the existing shallow spread. When present, validate that its demo flags and request budget match `captured.demo` and `captured.requestDeadlineMs`; reject mismatches rather than choosing the caller's more permissive value. Copy every required approved limit explicitly using the fixed exported policy type. Missing policy leaves the onboarding start service unavailable, without disabling ordinary authentication.

Pass that exact retained policy into `createAuthenticatedRequestResources` in an onboarding-only optional construction member. Do not widen public requestConfiguration into a policy/secret authority channel. MAIN is the checked caller joining the same captured issuer policy and resources; there is no public Auth policy getter to substitute for this join. The Auth constructor still owns its private captured configuration and guard.

Provider order/selection, canonical external origin, cookie policy, CSRF/core secrets, body budget and configured clock come from the same captured issuer; SQL skew/clock resources come from the same captured MAIN SQL configuration. Request resources receive no new secrets. Do not obtain a second policy from environment, an RPC DTO, a handler option, a forwarded header or a setup-read principal.

The repair's exact demo mutation predicate is `demoEnabled && readOnly`, not readOnly alone. MAIN supplies the unchanged flags; it does not work around the frozen Auth defect or introduce a global DB read-only policy. Do not release the join as accepted before the Auth2 repair is independently accepted.

## Explicit eligible descriptors, not mounted routes

Use one closed, frozen **capture-only** descriptor table in `auth.ts`, scoped to the approved same-origin empty-base-path host:

| Selector               | Exact prospective path                  | Method | Descendants |
| ---------------------- | --------------------------------------- | ------ | ----------- |
| `claim`                | `/api/onboarding/claim`                 | `POST` | false       |
| `nextStep`             | `/rpc/onboard/nextStep`                 | `POST` | false       |
| `initUser`             | `/rpc/user/initUser`                    | `POST` | false       |
| `initialExternalGroup` | `/rpc/group/createInitialExternalGroup` | `POST` | false       |

The claim path is the prior source-plan target. RPC paths follow the inspected Backend descriptor convention; this table proposes exact capture eligibility, **not generated-client packet compatibility or current mounting**. The descriptor selects a command, never permission or authority. No descendant/prefix/generic `/rpc` selection, batch packet inspection, body-derived leaf or caller-selected command.

The synchronous service checks method/exact path and the pinned host relationship without body reads. Ineligible requests return undefined without invoking Auth capture. If onboarding is not configured, expose no start service. An available producer must not return undefined after selecting an eligible descriptor and encountering a capture error; fail closed and retire any acquired registration.

GET/HEAD/OPTIONS, onboarding reads, completeSetup, user.register/user.create, ordinary protected writes and all other requests remain on their existing path. In particular the nine direct Auth paths remain exactly `/api/auth/providers`, `/api/auth/csrf`, `/api/auth/signin`, `/api/auth/callback/credentials`, `/api/auth/callback/ldap`, `/api/auth/signin/oidc`, `/api/auth/callback/oidc`, `/api/auth/session`, `/api/auth/signout`, with their existing descriptor identities, controller and publication enrollment. Onboarding claim is not a tenth Auth descriptor.

## Implementable producer → forwarding → ingress → context cuts

### Request contract

Add a four-literal onboarding command type and a readonly carrier interface containing only its command and `disposeAsync(): Promise<void>`. Its object identity is opaque to consumers: no clocks, budgets, tokens, issuer, lease, permissions, principal or prepared values are exposed. Use a private Backend WeakMap registration for authenticity; TypeScript structure or freezing alone does not establish it. A fresh object copying these fields cannot resolve to an Auth handle.

Add optional `RequestServices.captureOnboardingRequest(start)` returning that carrier or undefined **synchronously**, not a promise. Its start input is the original request/requestId/signal/onDispose association plus the exact application root lifetime signal. Add optional `RequestContext.onboardingRequest` of the carrier type, and carry it through the principal-resolution input's existing Pick. Existing services remain valid without no-op methods. There is no arbitrary execute/authorize/body-reader callback.

The disposal method is a concrete closure over the private registration and fixed Auth disposal port, not a caller-provided cleanup attestation or authorization predicate. This keeps contracts free of an Auth dependency and avoids needing a new ApplicationOptions hook or generic lifecycle facility.

### Issuer-bound producer in auth.ts

For an eligible start, synchronously call the **existing** port:

`captureProductionOnboardingRequest(issuer, start.request, start.requestId, start.signal, start.lifetime)`.

Retain the resulting `ProductionOnboardingRequest` privately with the descriptor, exact Request, requestId, outer signal, Request signal, application lifetime, onDispose function, issuer/policy identity and wrapper identity. The opaque Auth registration retains its real owner/issuer lifetime and original clock pair/budget. MAIN does not inspect, copy or mint those timing scalars.

Publish the active wrapper registration before returning it. Keep a weak Request repeat-capture association and an enumerable set of currently active wrappers for shutdown drain; never a strong historical result list. Reject repeated capture under this producer, including after retirement. The real Auth owner independently enforces its own registration.

Implement one cached `disposeAsync` adapter per wrapper. Mark admission/lookup retired synchronously, prepublish its completion in the resource's pending accounting, invoke `disposeProductionOnboardingRequestAsync(issuer, authHandle, originalRequest)`, retain the actual promise, and remove active accounting only after settlement. Preserve the same disposal promise/error on repeated calls. Do not invoke prepare/dispatch during capture or disposal, retry capture, allocate another issuer, refresh clocks or interpret a public disposal rejection as a shared-owner fault. Auth2 owns the distinction between ordinary primary failure and genuine private cleanup failure.

Add a narrow resources lookup such as `getOnboardingRequestCapture(context, expectedCommand)` returning the privately retained opaque Auth request handle only to later Backend integration. It verifies wrapper registration, command, exact Request/requestId/signal/onDispose, application root association and live resource/policy identity. On the first genuine outer-context lookup, register that exact RequestContext identity; subsequent lookups require it. A copied context/carrier, cloned Request, wrong command or retired wrapper fails. This lookup is not native authority or the still-held final BackendContext/input join.

Do not relabel the existing wall-only principal operation as onboarding bounds. Existing resolvePrincipal still performs actual ordinary admission and returns its genuine principal unchanged; onboarding Auth preparation has its own public-port-owned credential/claim admission. The fixed public ports accept no transplanted outer lease or final BackendContext, so do not pretend an existing RequestAssociation has been adopted by them.

`closeAsync` stops new captures, aborts resource admission, initiates retirement for every active wrapper, and awaits their cached actual tasks alongside existing pending/association cleanup. Continue all settlement attempts and preserve failures without rewriting existing non-onboarding release behavior. A readiness failure cannot leave an unconsumed weak handle undrained.

### Explicit assembly forwarding

In `assembly.ts`'s authenticated services reconstruction, forward `authentication.requests.services.captureOnboardingRequest` explicitly. Preserve the existing resolvePrincipal/authorize/resolveSetup members and the public-only branch. Forward the actual retained function, not a stub or late async proxy. Do not add onboarding routes to `public-resources`, change Auth publication enrollment or invent mounted onboarding handlers in this cut.

### Application first synchronous instruction sequence

Keep the existing requestId, combined signal and disposer machinery. Inside the existing request try, before `await ready()` or resolvePrincipal/setup/authorize/route handling:

1. Invoke the optional synchronous start service once with the **original** Request, requestId, combined signal, onDispose and `lifetime.signal`.
2. Retain its returned carrier before any operation that could throw. Immediately register its real cached disposal adapter with `onDispose`; registration failure must still retire the retained carrier in catch.
3. Check abort/readiness through the existing path, then pass the exact carrier into principal resolution and the eventual RequestContext without object-spreading/cloning the carrier or substituting the Request.

The synchronous URL/descriptor checks and Auth call occur on the initial handle stack; no intervening promise, ready wait, body read, authority/password work or oRPC decode. Clock sampling happens **inside Auth capture once**, not in Application. Preserve original wall/monotonic/budget mapping through later work; no `Date.now()` deadline DTO or `performance.now()` reconstruction at admission/handler/dispatch.

Use a small local cached `retireOnboardingRequestAsync` helper backed by the carrier's real disposal method. Register that helper as the normal disposer and explicitly await it on onboarding early failure. It must preserve/report the primary failure and actual disposal failure separately, never make a command failure into successful cleanup/rollback evidence. This is request-local handling, not a new generic response/publication framework.

## Failure and retirement obligations

| Boundary                                                                         | Required actual settlement                                                                                                                                                                                                                                                            |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Capture throws after acquiring a registration, or callback registration throws   | Producer/application retains and starts the real cached retirement immediately; track its promise even though the public start call is synchronous. Catch awaits the retained retirement where available; resource close also drains it. Never return an eligible uncaptured context. |
| ready, resolvePrincipal, resolveSetup or authorization throws                    | Existing catch preserves the primary error, awaits capture retirement and ordinary request disposal before releasing the finite error response. Capture was registered before the failed await.                                                                                       |
| Authorization returns deny                                                       | Explicitly await capture retirement before `respond(ACCESS_DENIED)` for captured requests. Ordinary denied requests keep existing behavior. Eventual failure-response EOF is not the first opportunity to retire the handle.                                                          |
| Selected handler passes/unmatched route or terminal 404                          | Retire an unused captured handle before releasing the rejection. Do not let the generic RPC/asset fallback turn a selected onboarding request into an ordinary writer. Current absence of mounted onboarding handlers remains a transport hold.                                       |
| Later body/decode/schema/handler failure throws or is translated into a response | Its future adapter must await the same cached retirement before translating/releasing failure. Application catch cannot observe an exception swallowed by oRPC. This is an explicit adapter obligation, not a claim that today's generic decoder satisfies it.                        |
| Request/root abort, shutdown, unconsumed capture                                 | Auth's captured signals invalidate admission; wrapper and resource close await the actual retained preparation/native/retirement work. Normal onDispose uses the same adapter. Do not delete accounting at a deadline-race winner.                                                    |
| Confirmed/ambiguous native outcome followed by failure                           | Preserve Auth's retained classification and actual disposal rejection; never infer rollback, safe retry or an owner cleanup defect from that outward rejection. Publication remains separately held.                                                                                  |

Keep existing response cancellation/retention and the nine Auth publication bodies unchanged except the narrow captured-onboarding failure branches above. On success, normal request disposal may use the wrapper, but **this does not establish onboarding response publication/abandonment correctness**. A future transport lease must pin physical response retirement and committed outcomes before any success is enrolled.

## Actual ports and remaining holds

The only ingress port is the synchronous five-argument `captureProductionOnboardingRequest`; disposal is `disposeProductionOnboardingRequestAsync(issuer, requestHandle, originalRequest)`. The fixed future command pairings are:

| Command              | Existing preparation                         | Existing dispatch                             |
| -------------------- | -------------------------------------------- | --------------------------------------------- |
| claim                | `prepareProductionOnboardingClaimAsync`      | `dispatchProductionOnboardingClaimAsync`      |
| nextStep             | `prepareProductionOnboardNextStepAsync`      | `dispatchProductionOnboardNextStepAsync`      |
| initUser             | `prepareProductionOnboardingInitUserAsync`   | `dispatchProductionOnboardingInitUserAsync`   |
| initialExternalGroup | `prepareProductionInitialExternalGroupAsync` | `dispatchProductionInitialExternalGroupAsync` |

Each preparation takes issuer, opaque request handle and exact original Request; each dispatcher takes issuer, its corresponding prepared handle and that same Request. There is no generic command dispatcher, decoded-input setter, final-context binder or lease-adoption port in the inspected public surface. Use the actual command-correlated types rather than widening/casting a union into a dispatcher. This lease does not call these functions or grant their execution.

Remaining explicit holds:

- Auth2 repair approval/source freeze and independent successor source review; no private repair details or cleanup authority move to MAIN.
- Approved constructor policy/limit supply and exact startup mapping; absent policy is unavailable, not writable by default.
- Real claim CSRF GET/POST/client propagation and selected exact transport descriptors/handlers. No server-synthesized POST CSRF header.
- Original body ownership and actual oRPC wire decode: frozen Auth source owns canonical raw JSON, not a guessed generated envelope. No clone/decode/rebuild of Request or decoded DTO passed as provenance.
- Exact final BackendContext, selected leaf, prepared handle and source-input association. The outer RequestContext carrier closes only ingress lineage; no current public port proves that later join.
- API factories, bounded output, physical response publication/abandonment, route/runtime enrollment, native execution and usable first-user/sign-in/external-provider flow.
- completeSetup remains entirely deferred; no placeholder, command arm, plan, mounting or acceptance-counter change.

UI3 active legacy paths are disjoint. No product source, private configuration/data, commands, hashes, metadata/stat checks, compiler/lint/evaluation/tests, network, SQL/Engine or nested agents were used. The only write is this new report; prior frozen reports/source and all historical acceptance controls remain unchanged.

## Controlling amendment — server-owned policy, exactly five source paths

**Yes: the actual MAIN constructor supports deriving the policy internally, without Startup/compose changes.** This amendment controls wherever the original plan required startup-supplied limits, seven paths, optional MAIN enablement or unavailable policy-field spellings. The original plan above remains historical and intact. The coordinator's three literal limits below are a **new proposed server-owned policy for independent review**, not measured existing defaults or newly accepted runtime behavior.

### Exact public policy and source evidence

The frozen original Auth source artifact `nitro-onboarding-owned-request-source-6724efd4def2f92c673a30bf/0-after.ts:50–57` declares exactly:

```ts
interface ProductionOnboardingPolicy {
  readonly demoEnabled: boolean;
  readonly readOnly: boolean;
  readonly requestBudgetMs: number;
  readonly maximumCookieBytes: number;
  readonly maximumCredentialBytes: number;
  readonly maximumResponseBytes: number;
}
```

Its policy capture at `111–122` requires boolean flags and positive finite supported limits: request budget at most `2_147_483_647`, cookie bytes at most `65_536`, credential bytes at most `4096`, and response bytes at most `Math.min(constants.MAX_LENGTH, 65_536)`. The header witness independently enforces its fixed existing `65_536` byte cap at `156–161`. **There is no missing maximumHeaderBytes policy/startup field.** Leave that Auth behavior unchanged.

Inspected construction supports the amendment:

- `runtime-composition/contracts.ts:73–81` already types `issuer` as the public `ProductionSessionIssuerConfiguration`; public `service.ts:102–110` already permits `issuer.onboarding`. No new member in runtime-composition/contracts.ts is necessary.
- `native-main-persistence.ts:588–610` is the synchronous same-MAIN input-capture cut before deferred construction. At `621–627` it passes that captured issuer configuration to the actual Auth constructor; at `650–660` it builds request resources from the resulting exact issuer and the same owner lifetime.
- `compose.ts:38–50` already supplies the issuer, demo flags and requestDeadlineMs. `startup-configuration.ts:125,172,217–219` already validates requestDeadlineMs in `1…2_147_483_647`, body bytes and both boolean demo flags. Its strict issuer schema need not accept a field derived **after** startup parsing, inside MAIN.
- `runtime.ts:81–92` already awaits ready persistence and these authenticated resources before Application assembly. Neither an additional runtime caller nor a new initialization hook is required.

No actual type/schema mismatch forces a sixth or seventh file. The new local request-resources construction member belongs to the already leased `auth.ts`, not to the external startup schema. Existing types are evidence of implementability, not compiler evidence.

### Approved candidate values and ownership

Derive this single frozen object in MAIN's existing synchronous construction capture:

```ts
const onboardingPolicy: ProductionOnboardingPolicy = Object.freeze({
  demoEnabled: capturedDemo.enabled,
  readOnly: capturedDemo.readOnly,
  requestBudgetMs: capturedRequestDeadlineMs,
  maximumCookieBytes: 16_384,
  maximumCredentialBytes: 4096,
  maximumResponseBytes: 4096,
});
```

`capturedDemo` is the one frozen snapshot of the existing input demo flags; `capturedRequestDeadlineMs` is the one validated snapshot of the existing input requestDeadlineMs. Those exact snapshots also populate `captured.demo` and `captured.requestDeadlineMs`. Validate them synchronously in this constructor, including the Auth budget cap, rather than relying solely on the later request-resource validator or permitting direct construction callers to bypass the startup checks. No request clock is sampled here: requestBudgetMs is construction policy, not a reconstructed request start.

The three limits fit the frozen constructor caps. Their presence does not assert practical adequacy or approval: review them as explicit new source-owned limits. The `4096` response cap applies to onboarding Auth's finite output, not the existing separate general/Auth-HTTP maximumResponseBytes startup option. Neither cap overrides the other or changes ordinary handlers.

Always derive this policy for the actual authenticated MAIN resources. Absence of incoming `input.issuer.onboarding` is normal and **does not disable onboarding capture**. The public-only MAIN branch still has no authenticated resources. This is not a writable default: both demo flags retain their actual captured values, the real Auth/DB mode predicates and authority checks still apply, and `demoEnabled && readOnly` still rejects onboarding mutation under the separately reviewed Auth2 repair. No policy flag is forced false.

If a direct typed construction caller supplies `input.issuer.onboarding`, snapshot/validate its six own data fields during the same synchronous capture and compare **every field** with the derived server-owned policy. Reject any differing flag, budget or limit through the existing construction failure path. Reject accessor/malformed policy fields rather than treating getter results as policy evidence. An exactly matching candidate may be tolerated, but discard its object identity and use only the internally derived object. Do not silently overwrite an inconsistent policy, accept a subset with defaults, or let the caller select different limits. No incoming object becomes the owner of policy.

### Exact five-file authoring cuts

1. **`apps/backend/src/server/runtime-composition/native-main-persistence.ts`:** import `ProductionOnboardingPolicy` through the already available public Auth index. In the existing capture try, snapshot/validate demo and budget, derive the frozen policy above, reject a conflicting incoming policy, and set `captured.issuer.onboarding` explicitly after the issuer spread. Preserve the exact existing origin/cookie/provider/OIDC/secret/bodyBudget/SQL clock/skew resources and their capture semantics. Retain the captured type locally as `AuthenticatedReadConstructionInput & { readonly issuer: ProductionSessionIssuerConfiguration & { readonly onboarding: ProductionOnboardingPolicy } }` so the deferred constructor knows policy is present without a cast or assertion. Pass `captured.issuer` to the existing issuer constructor, then pass **that same `captured.issuer.onboarding` object** in the new local `onboardingPolicy` option to `createAuthenticatedRequestResources`. No new pool/runtime/issuer or policy reload.
2. **`apps/backend/src/server/runtime-composition/auth.ts`:** add the required readonly `onboardingPolicy: ProductionOnboardingPolicy` member to this function's local options. Retain its exact identity in the private producer; check its flags/budget against the already captured request configuration and its fixed three limits against the reviewed constants. Do not copy/rederive it as a second MAIN policy, expose it through RequestContext or add a public issuer policy getter. Install the real synchronous capture service for these authenticated MAIN resources; no missing-optional-policy disable branch. Keep the earlier exact descriptor/private wrapper/retirement/close design and ordinary admission paths unchanged.
3. **`apps/backend/src/server/runtime-composition/assembly.ts`:** explicitly forward that actual synchronous service in the existing authenticated services object, alongside unchanged resolvePrincipal/authorize/resolveSetup. No dummy implementation in public-only mode, route mounting or Auth publication change.
4. **`apps/backend/src/server/application.ts`:** retain the original synchronous pre-ready capture sequence and exact Request/requestId/signal/application-root lifetime/onDispose carrier join. Register its real disposer before any readiness/body/decode work; await the same cached retirement on ready/principal/setup/authorization/decode failure or denied/unmatched rejection, as already specified above. No late clocks, cloned Request or synthetic principal.
5. **`packages/contracts/src/request.ts`:** retain the narrow optional start service, four selectors, opaque identity carrier and bound real disposal method from the original plan. No policy/timing DTO, Auth dependency, body-reader/permission callback or new framework.

`native-main-persistence.ts` remains the only additional caller beyond the prior four-path prerequisite. `startup-configuration.ts`, `compose.ts`, `runtime.ts`, `runtime-composition/contracts.ts`, all Auth files, dependencies and env/settings schemas receive **no changes** under this amended lease. There are no new user flags, configuration switches or settings. The original request-contract path correction remains valid.

“Identical policy” means the same derived frozen MAIN object is passed to both construction calls. The unchanged public Auth constructor deliberately captures/copies the policy into its private issuer configuration (`service.ts:1318–1329,1346–1354`); do not falsely claim reference equality with that inaccessible private copy. Same-MAIN construction, exact values and retained issuer/runtime identity establish the producer join. No new Auth getter or private registry access is needed.

### Unchanged capture/disposal obligations and holds

The actual ingress remains `captureProductionOnboardingRequest(issuer, originalRequest, requestId, signal, applicationLifetime)` **synchronously before await ready/body/oRPC decode**. It retains the original clocks and immutable construction budget privately once. The application/resources wrapper still retains exact outer identity and uses `disposeProductionOnboardingRequestAsync(issuer, opaqueHandle, originalRequest)` for real cached, awaited retirement; no no-op callbacks, new clocks, copied authority or public cleanup-fault heuristic.

Only the four explicit onboarding POST descriptors are eligible. Other ordinary/Auth/read/write paths and the nine direct Auth descriptor identities remain unchanged. Deriving a normal MAIN feature policy does not mount a route, authorize a command or establish response publication.

The startup-limit/missing-option holds above are replaced by **independent review of these three new server-owned limits and the five-file source plan**. Auth2 repair/source acceptance remains a separate prerequisite. Real transport/CSRF propagation, canonical original-body versus generated oRPC packet join, swallowed decode-failure retirement, exact final BackendContext/leaf/input binding, mounted handlers, physical publication/abandonment, native execution and enrollment all remain **HOLD**. completeSetup remains entirely deferred. No acceptance counter or legacy UI3 path changes.

This amendment used only immutable Backend configuration/type/caller source, the unchanged Auth public service, and the frozen original Auth artifact for exact public-policy/cap evidence. It did not read the mutable Auth private files. Only this report was appended; no product edits, commands, hashes/checks, compiler/evaluation/tests, SQL/Engine/network, private configuration/data or nested agents were used.

## Controlling P1 amendment — Application owns context registration

**Ready for narrow rereview by `ses_eca5fc894ffeP2TR4ZaIlDr80j`.** Coordinator reports that reviewer approves the five-file lease and server-owned limits, with the sole P1 being first-lookup context trust-on-first-use in the original plan at line 97. This amendment replaces that first-admit rule only; the original plan and prior amendment remain intact as history. No source approval or compiler result is inferred. Coordinator now reports Auth2/UI1 source-frozen, with independent compiler review upcoming; their private source and review work remain disjoint.

### One private producer, no public registration surface

In the already leased `apps/backend/src/server/application.ts`, introduce a **module-private `WeakMap<RequestContext, ApplicationOnboardingContextRegistration>`**. Its keys are the actual context objects constructed by this Application. Its values retain private Application ownership/root identity, the original request-start association and exact carrier identity, plus private live/retired state. Do not expose the map, its records, owner/root token, an enumeration API or any registration function.

The private root owner is created inside `createApplication` from that Application's existing lifetime. Each registered entry retains that same root identity and exact `lifetime.signal`; it is not supplied by a handler, carrier, lookup or Auth service. Retain the original Request and `request.signal`, combined request signal, requestId and onDispose function from the original local handle variables, together with the carrier returned by the synchronous ingress call. These are the same references used for first capture, not fields copied from a proposed external context.

Immediately after constructing the actual `const context: RequestContext = { … }` at the current `application.ts:405` boundary, **synchronously insert that context and its private registration before URL dispatch, `context.authorize`, route handlers or render**. Insert only when this request has its genuine retained onboarding carrier and has not entered retirement/disposal. Use the local retained carrier for the entry and require `context.onboardingRequest` to be that exact object. No intervening await, callback or external consumer may choose which context gets registered.

There is no first-lookup insertion, structural-match admission or externally supplied final context. A structurally identical object, frozen copy, proxy or cloned Request is not a WeakMap key created by this producer and must fail. Freezing alone is not provenance. Registration records must not be reconstructed from carrier fields or accepted merely because Request/requestId/signal/onDispose happen to compare equal.

### Sole narrow assertion export

Export only this new provenance assertion from `application.ts`, using the existing prospective carrier type binding:

```ts
export function assertApplicationOnboardingRequestContext(
  context: RequestContext,
  carrier: NonNullable<RequestContext["onboardingRequest"]>,
): void;
```

Its implementation is synchronous and read-only: retrieve the private entry by the **actual `context` object**, reject absent/retired/disposal-started ownership, and validate:

- entry carrier is the exact supplied carrier and the actual context's onboardingRequest;
- entry belongs to its privately retained Application root/request state, with the exact original application lifetime signal still live;
- context Request, requestId, combined signal and onDispose still equal their private original references/values;
- the original Request's signal still equals the retained Request signal, and original Request/combined/application signals are not aborted;
- the private request state has not retired or begun disposal.

The private root/request links come from Application construction and ingress, never from caller fields. No root argument, carrier-provided liveness predicate, generic validation callback or public setter is accepted. The assertion returns no registry record, Auth handle, clock, permission or policy; failure throws a bounded provenance-unavailable error. It does not register, freeze, copy or admit its arguments, and it is not native authority or final BackendContext approval.

### Lookup order and retirement

In the already leased `runtime-composition/auth.ts`, import `assertApplicationOnboardingRequestContext` directly from `../application`. In `getOnboardingRequestCapture(context, expectedCommand)`, first require the existing typed carrier and call this assertion **before reading the producer's private wrapper/opaque-handle registration**. Only after the assertion succeeds may lookup validate its existing issuer/policy/command/original-request associations and return the retained opaque handle. Delete the proposed first-lookup context-registration behavior entirely; auth.ts never chooses, inserts or adopts an outer RequestContext.

Any later relookup uses the same assertion and original registered context. If future asynchronous transport integration crosses an await, it must revalidate the original context and producer state before using the handle; no cached assertion is a timeless authority grant. That integration remains separately held.

Application marks the private request/context state retired **synchronously at the start of its existing cached onboarding retirement helper**, before awaiting the actual Auth disposal promise. Ordinary request disposal also invalidates any registered onboarding entry at disposal start. Root abort invalidates all entries through the retained root signal. Remove the context key when its actual request disposal completes, without retaining a strong historical context list; the private retired state already prevents use throughout pending cleanup. No public delete/invalidate setter is added.

The real cached Auth disposal, pending accounting and primary/cleanup/native-outcome handling remain unchanged. Failure before context construction still awaits the genuine captured request's retirement even though no context entry was ever created. Registration failure is handled by the existing awaited failure-disposal path. Failure/deny/decode/unmatched responses cannot preserve a live entry merely because their response body has not reached EOF.

### Unchanged lease, policy and holds

All required bodies remain within the same five paths: `application.ts`, `packages/contracts/src/request.ts`, `runtime-composition/auth.ts`, `runtime-composition/assembly.ts`, and `runtime-composition/native-main-persistence.ts`. The readonly carrier/start/disposal ports remain unchanged; only the necessary carrier type binding for the assertion uses the already planned request contract. No sixth file, public registration setter, Auth export/private-source change or generic lifecycle framework is needed. `application.ts` imports only contracts, so this direct auth.ts assertion import does not require Application to import authenticated runtime composition.

The source-owned policy remains cookie bytes **16,384**, credential bytes **4096**, onboarding response bytes **4096**, with actual captured demo flags and request budget. Capture remains synchronous on the original Request before `await ready`, body work or oRPC decode; original clock mapping and genuine cached failure disposal are unchanged. Eligibility remains only the four explicit POST descriptors; ordinary/Auth/read/write paths and nine Auth descriptor identities remain unchanged.

This closes the planned outer-context TOFU gap only. Wire/oRPC body provenance, exact final BackendContext/input/leaf binding, API bodies, mounting, physical response publication/abandonment, completeSetup, native/runtime acceptance and enrollment remain **HOLD**. The assertion must not be presented as satisfying any of those joins.

Only this report was appended after source reads. No product edits, commands/checks/hashes, evaluation/compiler/tests, SQL/Engine/network, private configuration/data, mutable Auth private-file reads or nested agents occurred. Prior history and frozen Auth2/UI1 work remain unchanged.
