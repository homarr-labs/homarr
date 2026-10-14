# CORE — fixed original-birth binding plan

**Closed prospective design for original-reviewer approval, not a source lease.** Resolves the compatibility report's original-birth STOP without accepting late clocks/context DTOs. That report and all freezes remain unchanged. CORE DB final source/static gates remain pending; this plan consumes only its public contract, not active DB repair/body topics. A–F preparatory acceptance does not authorize CORE execution.

## 1. Fixed Auth factory and ports — all NEW / prospective

Declare these server-only types/bodies in existing `production-sessions/sql-persistence.ts`; service resolves its existing private issuer→owner map and index narrowly reexports them. No fourth Auth file is required.

```ts
type CoreConfiguration = Pick<OnboardingCoreReadConfiguration,
  "version" | "dockerEnabled" | "kubernetesEnabled" |
  "workshopApiUrl" | "workshopUrl" | "maximumResponseBytes">;

createProductionOnboardingCoreController(
  issuer: ProductionSqlSessionIssuer,
  configuration: CoreConfiguration,
): ProductionOnboardingCoreController;

assertProductionOnboardingCoreController(
  issuer: ProductionSqlSessionIssuer,
  controller: ProductionOnboardingCoreController,
): void;

interface ProductionOnboardingCoreController {
  captureCurrentStep(request: Request, requestId: string,
    signal: AbortSignal, lifetime: AbortSignal): CoreCurrentStepRequest;
  captureEnvironment(request: Request, requestId: string,
    signal: AbortSignal, lifetime: AbortSignal): CoreEnvironmentRequest;
  closeAsync(): Promise<void>;
}

interface CoreRequest<Selection extends OnboardingCoreReadSelection> {
  admitAsync(): Promise<ProductionSessionRequestUser | null>;
  readOnceAsync(): Promise<Extract<OnboardingCoreReadResult, { selection: Selection }>>;
  assertCurrentAsync(): Promise<void>;
  retireWorkAsync(): Promise<void>;
  closeAsync(): Promise<void>;
}

interface CoreCurrentStepRequest extends CoreRequest<"current-step"> {
  resolveRpcBodyAsync(): Promise<unknown>;
}
type CoreEnvironmentRequest = CoreRequest<"environment">;
```

These are fixed, path-validating handle constructors, **not** register-anyRequest/context/operation setters. They accept no starts/deadline/budget/provider/evidence/admin flag, chosen selection, reader, registrar or assertion callback. `resolveRpcBodyAsync` serves only the original owned bounded packet cache to the SDK; it is not a decoded-input approval. No native evidence/getIssuer/operation getter is exposed.

Factory body resolves actual `productionSqlIssuers`→`owners`→OwnedSql, requires its real ready SQLite runtime and retained onboarding origin/providers/policy, captures complete configuration once, and constructs one frozen controller. Store that exact controller/configuration in a new private **owner-local CORE slot**. Assertion compares that stored identity without consuming it. Repeat/foreign/incomplete construction rejects; it never produces an enabled stub. Keep `createProductionSqlSessionIssuer`'s six arguments and existing wire producer unchanged.

## 2. Actual startup and synchronous source birth

Future MAIN's fixed `createOnboardingCore(configuration)` body runs after its retained `authIssuer`/`authRequests` construction has physically settled, on that same native owner. It calls the exact Auth factory, immediately asserts it, and creates the fixed Backend CORE resources from that controller and its existing owner/issuer/configuration. No supplied controller factory, broad router, second runtime or late public setter.

Application's real prefix currently creates requestId/signal/onDispose and invokes capture before `await ready()` and principal resolution (`application.ts:339–341,468–470,1010–1049`). Add a separate synchronous CORE capture hook there. Its Backend body chooses ONLY exact POST `/rpc/onboard/currentStep` or the later separately enrolled GET `/init` document; unmatched requests return no capture. It calls the corresponding Auth capture method synchronously, without a preceding await.

**The Auth capture method itself samples Date.now/performance.now**, before returning and thus before principal suspension. It creates private original OnboardingOperation fields with budget=min(retained A request policy, captured CORE read policy,10000ms); expiry is original monotonic start+budget and wall deadline cannot exceed original wall start+budget. Owner/root/request signals and lifetimes are captured once. Readiness/admission/body/native calls only decrease those limits; none supplies or resamples starts.

At that same body, validate real Request/method/exact path/canonical retained origin/Host/URL and signals, bound requestId and header/cookie witnesses, and retain original Request.signal, URL/method/headers, selection and captured configuration identity. Reject consumed/locked input and unsupported query/fragment/content shape. POST has original finite2048-byte SDK input with the approved header limits; GET requires genuine absent body. The tracked body producer reads original bytes once under original bounds, never clones/rebuilds the Request or hand-decodes SDK `.json`. Selected RPC input must validate as undefined at the real SDK handler before any CORE native read.

## 3. Honest new local capture records / root scope

Anonymous originals cannot inhabit requestLeases. Add one owner-local `Set<OwnedCoreCapture>` to OwnedSql's CORE slot for actual handles/drain; each handle method closes over its own record. Factory/capture bodies alone add records, physical admission assigns the existing lease-registration reference, and terminal close removes them. Records contain original witnesses/clock, selection/config reference, admission/body/read/currentness tasks, first failure/distinct cleanup, optional genuine lease registration and cached close. This is **new request provenance**, not a duplicate credential registry or evidence setter. No global handle map is necessary.

Backend similarly needs an owner-local carrier→capture association plus active captures for root disposal. Only its synchronous hook constructs/inserts the record. It retains the exact Auth handle, Application prefix objects, same issuer/controller/owner, actual admitted principal/profile and eventual factory-created final context; it contains no independent credential proof. Matching requestId/signal alone never creates/adopts a record.

**Explicit additional root lease required:** `packages/contracts/src/request.ts` adds a separate neutral CORE carrier/disposer field and capture hook; `apps/backend/src/server/application.ts` registers CORE originals/final RequestContext objects at their actual birth. Do not widen OnboardingRequestCommand or attach CORE to the write carrier. Reuse the existing Application root membership and `applicationOnboardingContexts` association machinery with a separately discriminated CORE registration, preserving the original wire assertion path/conditions. The new nonconsuming `assertApplicationOnboardingCoreRequestContext(context, carrier)` resolves that existing actual-object registration and checks root membership/lifetime, Request/Request.signal, signal/requestId/onDispose, carrier and retirement. It exposes no register/bind function.

`assembly.ts` must actually forward the separate hook and CORE principal/setup handling to createApplication; a type-only option is insufficient. These root/caller files are **additional named future scope**, not concealed inside Auth3/Backend4. They need reviewer approval and separate leases before authoring. No contribution/publication contract change is needed merely for this birth hook, and no route/document is mounted by it.

## 4. Admission from that original, not principal-as-evidence

Capture parses original credentials under retained cookie/origin policy: combined Cookie16384 preparse, single-cookie duplicate/decode rejection, claim512 and existing session/API bounds. Empty/malformed/duplicate/presented credentials fail, not absence. Store a private discriminant from the **actual header/cookie observation**: no credential, opaque session or API key; incompatible simultaneous presentation rejects.

`admitAsync` publishes its cached task before invocation. For a presented credential it calls existing projected admission with the capture's original signal/decreasing deadline, obtains the real lease, and immediately retains the existing requestLeases registration reference created by that admission. Verify locator/identity/signal/deadline/provider and `captureOwnedCredential === registration.evidence`; obtain the existing projected user profile only for real principal representation. Auth handle, not Backend, owns/releases this lease. Its read/currentness work uses existing authority algorithms and owner task sets, not a second Backend-created admission.

An anonymous admission result after any presented credential is an error. Only observed absence returns null and later creates DB `{kind: "anonymous", claimToken}`; no ready credential domain/key is invented for it. Claim/no-users permission is determined inside DB. No mutation admission, CSRF issuance/check, claim renewal, native-write frame, adoption, fake administrator or invalid-credential fallback.

Backend's CORE-only principal branch resolves the exact carrier/capture and awaits this cached admission. It constructs/stores the actual principal at that source and returns it to Application; ordinary resolvePrincipal/read/Auth branches are untouched. CORE-only setup metadata avoids an unrelated ordinary setup SQL read and returns truthful unavailable metadata, never setup permission. Root RequestContext principal must be that exact stored principal.

## 5. Genuine final context and one fixed consumer

In NEW Backend `runtime-composition/onboarding-core.ts`, the request factory first resolves its own carrier registration, calls the actual Application CORE assertion, and verifies exact original Request/signal/requestId/onDispose/principal and same retained issuer/owner/controller/configuration. It then **constructs** the final CORE context and request-bound SDK handler together, retaining the returned context object on the capture before handing it to the SDK. No caller-supplied context is registered or rebound.

Use a narrow, real CORE context defined in the prospective API CORE assembly, carrying actual request/signal/principal/demo and the fixed read reference; do not fabricate BackendContext.db/setup methods. The API currentStep contribution has only the source public/query/demo descriptor, actual SDK undefined-input validation, existing pure normalization and equivalent source access/error mapping. Its CORE adapter must preserve the factory-born context identity (middleware-free fixed handler, with source guards/error translation invoked inside it); the existing middleware-bearing sourceProcedure must not clone a context and then gain authority by matching fields. No broad legacy router/probe/discovery factory is constructed. The separately planned legacy factory extraction remains source-equivalent.

The actual handler checks `context === capture.finalContext` and the exact original/root/owner binding before invoking a closure holding ONLY that capture's `readOnceAsync`. There is no public `read(context, operation)` API. Auth checks its live record/configuration/registration, awaits real currentness, chooses authority from the retained source observation, and calls actual `value.runtime.readOnboardingCoreAsync(originalBoundOperation, savedSelection, privateAuthority, savedConfiguration)`. Initial native read is single-use/cached per handle, including rejection; repeated callers get the same physical result/task, not another baseline.

## 6. Settlement, detachment and later publication

Publish admission/body/read/currentness completions to the capture and existing owner requestReads/pending BEFORE scheduling actual work; observe forwarding failures. Use runProjectedRequestRead/projectedRequestBounds and existing requestLeases, retaining actual underlying native completion until settlement. After native return and lease currentness, verify the same registration/evidence/provider/owner/configuration/root/context and original Request witnesses; native domain/epoch checks remain DB's fixed responsibility. Tighten only with returned deadlineAt/monotonicExpiresAt/lastMonotonicAt under the original mapping/nonregression; never treat bounds as authority.

Returned projection stays detached and finite, with no attached handle/runtime/credential/context/error graph. Store its private delivery association on the actual request capture; any later detached-result producer uses weak owner/capture references plus bounded original result/config/clock witnesses, not a strong retired SQL graph. Cleared/retired ownership fails closed; missing evidence never becomes a redacted successful result.

`retireWorkAsync` stops only work and joins its physical tasks. Delivery has a separate original request/root/owner signal and monotonically tightened bounds, not the stopped work controller. Lease/capture supervision survives until the later real response terminal; only `closeAsync` completes terminal release. Future native delivery re-observation, if required, uses the same original starts/config/credential/claim and compares the retained result, never a fresh budget/baseline or mutation replay. This guard design is not yet an anonymous publication enrollment or proof that clock checks alone authorize bytes. Existing authenticated onPrivateResponsePublication remains authenticated-only.

Close completion is stored/observed before invocation; stop admission of new work, drain all published physical work, attempt body cancellation/closed/release/detach and genuine lease release, then retire/remove capture. Attempt all applicable cleanup despite earlier failures; preserve original primary and direct distinct cleanup causes/nonretryability/ambiguity. Owner shutdown stops/drains CORE captures before closing its authority/native ownership. A read never awaits a retire that drains that read; retirement may await reads, not vice versa. No self-await, Promise.race-as-drain, detached cleanup or automatic retry.

## 7. Complete configuration source and exact phased files

Captured version originates from real startup `authentication.build.version` through compose/runtime; Docker/Kubernetes flags and website/Workshop URL inputs must be added to genuine startup schema/capture, not ambient reads or disabled guesses. After declaring `@homarr/workshop` in `apps/backend/package.json`, use public `@homarr/workshop/schema:resolveHomarrUrlConfig` once on those genuine values; map `workshopWebUrl` to DB `workshopUrl`. Preserve source defaults only at actual configuration resolution, never from setup/principal failure. Bound/freeze resolved values before MAIN construction.

Native MAIN's factory requires complete configuration and matching captured origin/build/host response limit; Auth privately supplies retained providers, origin, maximumSnapshotRows, skew, now and owner lifetime. None is a per-call override. Config flags describe environment only and cannot authorize native access. Incomplete input stops the future configuration-source stage; it does not yield an enabled controller or fabricated negative availability. SQLite only; no MySQL/PostgreSQL branch or invented cookies.

Future phased leases, all requiring original-reviewer approval first:

- **Auth3:** existing `packages/auth/nitro/production-sessions/{sql-persistence.ts,service.ts,index.ts}` for fixed factory/handles/types, explicitly new owner-local CORE captures and owner close join. No persistence.ts/onboarding.ts edit, new module, global registry or duplicate credential registry needed.
- **Backend4:** NEW `apps/backend/src/server/runtime-composition/onboarding-core.ts`; existing `auth.ts`, `native-main-persistence.ts`, `contracts.ts` for real CORE capture/admission/final-context/owner factory, beside unchanged wire.
- **Configuration/dependency/callers:** `apps/backend/src/server/startup-configuration.ts`, `compose.ts`, runtime-composition `configuration.ts`, `runtime.ts`, and `apps/backend/package.json`; actual complete configuration propagation and MAIN factory call, not optional authority callbacks.
- **Original-root/forwarding scope addition:** `packages/contracts/src/request.ts`, `apps/backend/src/server/application.ts`, runtime-composition `assembly.ts`, as specified above. Reviewer must approve these real extra edges rather than assume existing wire carriers cover CORE.
- **API:** the previously planned CORE currentStep factory/assembly/browser-contracts/normalization/export files; narrow actual CORE context/handler policy work belongs that separate source lease. Document/SSR/root endpoint enrollment/publication and UI/installer remain later reviewed delivery leases, not placeholder controllers now.

No irreducible external capability is missing for this **source binding design**. Required gates are original-reviewer approval of the explicit scopes, DB final acceptance/fresh checks, then coordinator's staged author releases. Auth9/five wire/twelve reads/three writes, sixth issuer argument, cache/native publication/signals and count91 remain unchanged. Runtime/native/SSR/enrollment/transport/installer/FS/data/restore/cutover/probes/PostgreSQL and completeSetup remain held; source enrollment is not boot or client receipt.

Only dedicated immutable source/public-interface/report reads and this NEW plan patch occurred. No product edit, command/hash/stat/check/evaluation/import/test, SQL/native/Engine/network/private configuration/data or nested agent. The original compatibility report, active DB repair topic and prior freezes/receipts were not modified.
