# Onboarding MAIN C5 — compatibility/construction plan

**Ready for independent current C-plan review, not a source lease or activation.** The full approved wire plan/C–F publication contract remains controlling. This supplement maps C to accepted actual A/B bodies; it does not redesign their SDK/receipt pipeline.

Prospective C scope, under `apps/backend/src/server/runtime-composition/`: existing `contracts.ts`, `auth.ts`, `native-main-persistence.ts`; NEW `onboarding-rpc.ts`, NEW `onboarding-claim.ts`. Author dispatch waits for the active DB writer's freeze/check gate **and** independent approval of this current plan.

## Actual compatibility boundary

| Existing source/port                                                   | C use                                                                                                                                                                                                                  |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API `onboarding-wire` factory/assert/controller                        | Construct/verify one real producer before issuer creation; pass that same original object to Auth's sixth argument. Build controllers only with real A request/frame/ticket/packet/context references.                 |
| A capture/bounds/packet/frame/verifier                                 | Preserve original Request and original wall/monotonic start/budget/deadline/signals. Read/copy no body in MAIN; use the real once-owned packet task/cache. Register context/frame at actual factory birth, not lookup. |
| API `executeAsync` result                                              | Already includes actual source Response, explicit outcome, A publication handle and finite/native/primary/sourceOutcome read. **Do not call A Response registration again or read that consumed Response body.**       |
| A claim preparation/dispatch and distinct GET-CSRF capture/preparation | Actual four-command/native and non-native GET producers; no caller force/TTL/IDs/header manufacturing or new native union arm.                                                                                         |
| A publication read/terminal                                            | Fresh original/observed bounds and native acknowledgement independent of work retirement. Use the genuine reader after retirement, never a MAIN SQL/work currentness predicate.                                        |

Coordinator supplies API both-axis SOURCE ACCEPT after delivery repair (`9e648c7e…`), fresh API/Backend/Nitro three-package type/lint/format 0 at `egamz09r`, and accepted Auth/verifier/publication ports. These are supplied prerequisites, not results reproduced here. Backend already declares API/Auth/DB/contracts; API's wire runtime entry and writes types-only entry exist. No library/dependency/export change outside C is required for those imports.

## 1. Startup and earliest request capture

In `native-main-persistence.ts:672–716`, after the actual retained owner is ready and **before** `createProductionSqlSessionIssuer`, call API `createOnboardingRpcInputProducer()` then `assertOnboardingRpcInputProducer()`. Retain the original object in that owner's construction closure; pass it as the sixth argument and to the authenticated-request resource constructor's narrow onboarding construction resources. No source copy, request-selected producer, router at startup or dummy resources. Keep the actual runtime/issuer association and construction cleanup unchanged.

Keep the existing immutable MAIN policy at `604–610`: original requestDeadlineMs; cookie 16384; credential/response 4096; captured demo flags and the same original clock function. C's wire constructor validates `/rpc`, empty basePath and approved baseUrl against retained issuer/configuration; it does not accept body/response budget overrides or recapture a deadline.

`auth.ts:324–377` remains the actual Application capture-hook producer. Extend its exact descriptor selection to claim GET as well as the existing four POST selections. Private captures become method-correlated: GET has a genuine `ProductionOnboardingCsrfRequest`; POST retains the genuine `ProductionOnboardingRequest`. Carrier command remains `claim` for GET, but private method/handle discrimination prevents GET preparation/dispatch as a native claim. Preserve one capture per original Request, actual requestId/signal/disposer/lifetime, canonical Host/origin and the original carrier registry. No POST bypass flag.

Application already calls that capture before readiness/principal/body work and registers the **actual final RequestContext** at `application.ts:514–523`. C retains `assertApplicationOnboardingRequestContext` and the existing carrier/capture checks; neither a frozen copy nor equal fields become a context. No Application edit is needed for C's capture extension.

### Principal/body/setup prelude — no late budget

The current `auth.ts:866–872` creates a late `now + requestDeadlineMs` admission operation. For genuinely captured onboarding POST requests only, replace that path with the actual A original bounds/signal; all other request/read/Auth paths retain their existing behavior. Recheck original bounds around actual principal/DTO reads; A's original work signal/deadline timer and clock checks remain active. Session-expiry clamps can only tighten, not reset those bounds.

Before those onboarding POST credential reads, run the actual owned preparation/admission once from the private capture:

- RPC: actual `readProductionOnboardingRpcPacketAsync` task; retain its opaque packet. This admits original CSRF/cookie/key/mode and performs the one real body read. The later factory reuses the same returned packet task, not another reader.
- Claim POST: actual `prepareProductionOnboardingClaimAsync` task; retain its opaque prepared handle for the later one native dispatch. It owns mutation admission and empty-body reading; the route must not prepare again.
- GET: use the actual separate CSRF preparation, retaining its finite token/cookie/Response, and resolve a genuine anonymous principal for this non-authenticating read resource. No credential/DB/setup/native admission or fabricated administrator. A still enforces the original GET clock/header/method/Fetch-Site rules.

Validate these pre-final-context calls against the already producer-born private capture/carrier and exact original admission fields; do not pretend the preliminary Pick<RequestContext> is the final registered Application context. Final factory/route use requires the real Application registration afterwards.

**Existing E dependency:** `assembly.ts:209–214` currently always forwards `options.settings.services.resolveSetup`, whose `public-settings.ts:63–69` requests the proxy onboarding step. Expose a narrow C-owned selector for the actual captured signal/requestId association, returning truthful `SetupState {kind: "unavailable"}` for these endpoint contexts (setup metadata was not loaded). In E's already approved assembly path, use that selector before delegating unchanged other requests to settings. The RPC final context still has **real bounded setup methods**, not no-op resources; no favorable setup-state snapshot is invented. This avoids generic unbudgeted setup reads and GET SQL prelude. No RequestServices contract/public-settings edit or arbitrary injected resolver is required; it is an explicit E forwarding condition, not already active behavior.

## 2. Actual backend factory and real scoped resources

The concrete factory remains:

```ts
createOnboardingBackendRequestAsync(
  originalContext: RequestContext,
  selectedCommand: "nextStep" | "initUser" | "initialExternalGroup",
): Promise<OwnedOnboardingBackendRequest>
```

It accepts **no BackendContext, replacement Request, input DTO, clock/budget, SQL/body/permission/assert callback**. Its body:

1. Resolve the actual Application registration and producer-owned capture for the selected exact POST. Verify source/issuer/policy/Request/requestId/signal/disposer/lifetime and command; prepublish the real factory task before asynchronous work.
2. Obtain the same owned packet and original A bounds. For authenticated principals, use the existing private association/current lease and `getCurrentBackendUserAsync` real DTO producer, checking subject/provider and original bounds; anonymous remains anonymous. No caller user/admin DTO or wall-only read bounds are promoted into onboarding provenance.
3. Native owner reserves a **real** setup scope on its retained runtime, with original A signal/bounds checks. Use the existing public `createSetupBackedContext`, `eq`, original configured clock and actual users/onboarding/serverSettings schema. Input Request stays original; final signal is A's actual original operation signal; principal is the genuine private DTO (the existing context factory makes its actual frozen copy). Register effects/disposal through the real outer context.
4. At that factory return point, immediately register the exact final BackendContext in the private onboarding registry, correlated with the original Application context/capture/command/packet/producer/scope. Then call actual A frame creation, retain its exact ticket/packet/context/bounds and invoke its non-consuming verifier. No first-lookup TOFU or arbitrary-context binder.
5. Call the actual verified API controller factory with those references. Retain controller/execution/disposal as owned work; return only the narrow owned request execution/close object. B repeats the accepted A verifier immediately before real private receipt birth. C does not create a receipt or decode a packet itself.

**Scope lifetime is a concrete C body, not an interface-only lease:** the current private fixed-work pattern runs `runtime.runAsync` and fences the actual database/schema (`native-main-persistence.ts:321–343`). Add a separate onboarding-only reservation: publish the scope/ready/release promises before entry, resolve readiness only inside that real callback, and keep the callback open on its actual release promise until controller/guard/read work settles. The async factory must not return a context from an already-ended runAsync callback. The reservation exposes no generic SQL/native callback or Runtime to route callers.

Close stops admission and closes/drains the actual API controller first, then releases/awaits the actual scope. Do not free an active database scope merely because ordinary Auth retirement aborts its work signal. Conversely, no work currentness check after normal retirement should turn a successful completed result into failure by testing that aborted signal. A scope release/leave failure before C handoff abandons any actual returned A publication and preserves acknowledgement/primary/cleanup; no positive output or retry is inferred.

For DB context only, the accepted immutable `0-after.ts` runtime image at `T/nitro-onboarding-native-publication-runtime-repair-source-81602ee70ff16121cd001cbd` was read (`656–667`: callback-scoped runAsync/active/leave). This is the supplied old accepted `680b…` image, **not a pin/check of current DB bytes**. Active `runtime-preservation.ts`, `runtime.ts`, `transaction-gate.ts` were excluded from reads. Additive observer work does not authorize changing Auth configuration; verify compatibility after the DB writer freezes.

## 3. Claim/RPC handlers and exact membership

`onboarding-rpc.ts` produces only three exact POST/public-access FetchContributions, forwarding to the actual owned factory/controller. Never use broad authenticated RPC, fixed-write binding, middleware context, `prepareFiniteRpcRequestAsync`, replacement requests or finite-response rereading. Retain actual B source Response/outcome/publication/native cache association; release setup work before C's final delivery check/reservation.

`onboarding-claim.ts` produces **one** exact `/api/onboarding/claim` contribution with internal GET/POST selection. `FetchContribution` currently matches path, not method: five supported method/path endpoints therefore require **four route objects**, not competing GET/POST objects which would preempt one another. Preserve five exact endpoint descriptors for the distinct publication membership. Unsupported methods/local rejections are not positive A-backed onboarding output or a native command; D's method-specific enrollment must distinguish them rather than fake an Auth handle.

GET forwards the exact prepared A token/cookie Response and registers it through A **before** ordinary disposal can clear its positive CSRF Response association. POST consumes the actual cached claim preparation once, calls the fixed actual dispatcher once, and maps only its confirmed source result: issued/active 200 with actual cookie; locked 423/expiry; forbidden 403 administrator_required; finished 409/claim-cookie expiry. Use approved cookie policy, not forwarded protocol. Native ambiguity/known-commit settlement failure is a recorded failure, never one of those guessed business statuses or resend permission.

Claim response/error serialization, A registration/read, cancellation/abandonment and disposal are prepublished/drained actual tasks. Do not create a second nonce, manufacture a POST CSRF header, call completion logic or interpret API error packets by status. Existing A/B primary identity/cleanup/native-ack classification is retained.

## 4. C-to-D handoff: actual producer, not magical new contract

Retained native owner adds:

```ts
createOnboardingWire(input: {
  readonly path: "/rpc";
  readonly basePath: "";
  readonly baseUrl: `${string}://${string}`;
}): OwnedOnboardingWireController
```

The closed controller contains four real route objects, five supported endpoint descriptors, owned request/response records, shutdown/drain and a **separate onboarding publication producer**. Construction verifies actual retained issuer/request resources/original API producer; no mounting occurs. Register each completed source/result-to-wire-Response association privately in the actual handler before return. A wire Response may wrap only A's finite retained bytes; keep the consumed source Response separately for actual A read/settle calls.

C `contracts.ts` declares the internal producer's concrete claim/read/async-finish/abandon ports. Claim lookup takes actual original RequestContext plus exact returned wire Response and resolves the producer-born record; no public response/context/input setter. Live header/head/bodyless/EOF checks use actual A publication read with the original source Response; terminal work awaits actual A settle/abandon and typed result. Detached per-response handles retain finite references/weak issuer-context identity, not the retired database scope/controller or a bound Runtime. Native owner retains issuer until reservations settle.

**Actual public contract gap, already assigned to D:** today's `packages/contracts/src/contribution.ts` exposes only the nine-path Auth enrollment and synchronous `finish`; Application's anonymous-private guard is also incompatible. D must add the separately typed, method-aware onboarding enrollment/async terminal boundary and finite-cache forwarding in its approved contracts/Application/native-owner paths. C does not extend/relabel the existing Auth producer, relax its guard or fabricate a type-only producer as implementation. E must then actually call/forward/enroll this controller; F supplies genuine CSRF/generated-client propagation. Existing D/E/F file lists need no additional path for the identified compatibility details.

Shutdown order is actual handlers/controllers and read/setup work → real scope release and finite-response reservations/abandonment/terminal tasks → authenticated request resources → Auth issuer → existing helper/native cleanup. No task waits its own completion. Ordinary request failure remains distinct from genuine cleanup; terminal mappings are cleared only after underlying work settles. Post-retirement publication must not call MAIN readiness/SQL/work guards or reconstruct expiry/budget: it reads the accepted A/native detached evidence. Already delivered bytes remain D's physical responsibility, not proof that a commit may be replayed.

## Exact C cuts and remaining authority

| Path                         | Actual prospective body                                                                                                                                                                                                                                                                |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `contracts.ts`               | Narrow constructor/owned request/setup reservation/result/publication-producer types and exact method/path membership; no caller SQL/body/policy callbacks.                                                                                                                            |
| `auth.ts`                    | Distinct GET capture; original-budget onboarding-only principal/preparation path and owned setup-metadata selector; actual Application capture lookup, real DTO/context factory registration and frame/ticket/controller join. Preserve other request policies/read/write memberships. |
| `native-main-persistence.ts` | API factory/assert before Auth sixth argument; real setup reservations/task ownership; retained `createOnboardingWire`, actual separate producer/response records/drains and correct cleanup ordering. Preserve immutable policy and existing Auth9 controller.                        |
| NEW `onboarding-rpc.ts`      | Three concrete exact route handlers, factory/controller execution and actual finite outcome/reservation handoff; no SDK reimplementation.                                                                                                                                              |
| NEW `onboarding-claim.ts`    | One concrete method-discriminating GET/POST route, real cached preparations/fixed dispatch/result mapping/A finite ownership; no completion or replay.                                                                                                                                 |

The existing A/B public ports and callback-scoped runtime mechanism suffice for these C bodies; no additional A/B/DB helper/dependency or fake setup producer is needed. The setup scope handshake, endpoint-method routing, onboarding-aware metadata forwarding and real D contract/enrollment are explicit requirements, not currently authored producers. C authoring remains held pending DB freeze/check and independent current plan approval.

Only dedicated immutable source/interface/manifest reads and this NEW report patch occurred. No product edits, commands/hashes/stat/checks, evaluation/imports/tests, SQL/native/Engine, network/private configuration/data, nested agents, libraries/dependencies or runtime/FS/fixture/data permissions were used/granted. No current protected-DB unchanged-pin claim is made while its writer is active. Historical one-empty native memory acceptance belongs to the consumed old generation, not current MAIN boot or this plan. All old controls/checks/artifacts/counts/holds remain unchanged; completeSetup and activation remain held.
