# E2 — real retained-owner enrollment compatibility plan

**Closed two-file source plan for review, not an authoring grant, execution or activation.** Only prospective `apps/backend/src/server/runtime-composition/runtime.ts` and `assembly.ts`. The approved producer plan's E phase and full C–F/publication contract govern; all other products remain frozen.

Supplied accepted prerequisites: Application `6e065986…`, native owner `40282cdf…`, backend contracts `7c300226…`, neutral contribution `1915b46b…`; security/lifecycle Fetch-scope SOURCE ACCEPT and fresh three-root type/lint/format-zero `34aum_8k`. Accepted C2/Auth/API/DB stay protected. These are prerequisites, not E source/runtime results.

## Actual call chain and ports

`composeApplication` selects existing public-only/authenticated-read profile and forwards its real version/providers/demo/clock/auth construction into `createPublicHostRuntime`. Runtime already obtains one native persistence owner (`81`), awaits its readiness (`84`), obtains the actual retained issuer/request resources (`91`), reads that owner's schema (`93`) and creates authenticated native-read resources/assembly plus Auth HTTP/fixed writes (`100–143`). Public settings/culture/closed two-leaf RPC are then constructed before `assemblePublicResourceHost` (`228`). No new startup/profile/default-Next switch is needed.

Existing real ports:

```ts
persistence.createOnboardingWire({ path: "/rpc", basePath: "", baseUrl }): OwnedOnboardingWireController
persistence.assertOnboardingWireController(controller): void
controller.routes / controller.endpoints / controller.publication
controller.closeAsync(): Promise<void>
requests.getOnboardingSetupState({ signal, requestId }): SetupState | undefined
createApplication({ contributions, services, authHttpPublication, onboardingPublication, ... })
```

The C constructor rejects repeat construction, wrong path/basePath/origin, missing retained issuer/request/source identity and wrong owner state. Its actual private setup-scope construction resources already exist on authenticated-request creation; the real final setup context is intentionally per-request, not a startup dummy. D's native assertion resolves the constructor-born controller/route/descriptor/producer registration. D's neutral enrollment is already an actual Application option and its producer is the same C object, not a facade/DTO.

## Exact runtime.ts cut

In the existing authenticated-read branch, **after actual read assembly/Auth HTTP/fixed-write construction and before assigning its final assembly authentication object** (current `137–144`), construct exactly one controller with literal `/rpc`, literal empty basePath and the captured `configuration.baseUrl`. Preserve the existing empty-basePath/origin guards; do not derive inputs from a request/query, normalize into a replacement origin or add policy/body/response budget overrides. Assert it immediately through the same `persistence` object.

Retain that actual controller in a construction-owned local slot for failure cleanup. Include it as a **required** `onboardingController` field of the authenticated assembly variant; keep `authHttpOwner: persistence` as the same owner for both assertions. Public-only construction creates no controller and stays genuinely disabled. No optional type-only field, readiness marker, new issuer/runtime/source producer or Core/broad RPC delegate can substitute for this call.

Real schema/read/setup factories, original startup/owner signals and immutable MAIN policy remain those already captured by the retained owner. Later settings/culture/public RPC construction remains unchanged. Existing version/provider/meta and closed-contribution constructors continue receiving their original resources; onboarding is not spread into their routers or fingerprints.

## Exact assembly.ts cut

Extend only this file's local authenticated options variant with required `onboardingController: OwnedOnboardingWireController`; extend its existing owner intersection with the already-defined `assertOnboardingWireController` port. No additional backend/shared contract file is required. Import existing neutral enrollment/controller types from existing declared package/local entries.

Alongside the current Auth setup (`87–217`), use disabled onboarding enrollment for public-only and, in authenticated mode:

- Preserve `authHttpOwner === options.persistence`, captured empty basePath and all existing Auth/read/fixed-write checks. Call that same owner's onboarding assertion on the actual required controller.
- Build an own-data enrolled object with **the exact** `controller.routes`, `controller.endpoints`, `controller.publication` references—no clones, wrappers, field setters or alternate producer. Verify four frozen exact/public route objects and the closed five unique supported descriptors against the actual controller; reject exact collisions with foundation/culture/Auth/read/fixed-write paths. Do not change any existing handler identity/list.
- Before `createApplication` (beside current Auth identity recheck at `298–309`), reassert the retained controller and enrollment reference equality. A structurally similar controller/enrollment is not permission.

Append a separate, real `RuntimeContribution` for this one controller to Application's existing contribution sequence, with its actual route array and `dispose` invoking that controller's actual `closeAsync`. No invented `ready` callback. Preserve all existing contributions and their relative order; placing this contribution after public-resources makes reverse disposal close onboarding **before** the persistence/Auth/native contribution. D's dispatcher, not contribution-order coincidence, owns reserved-path selection.

Pass the enrolled/disabled value as `onboardingPublication` to the **actual** `createApplication` call (`310–354`), beside unchanged Auth9 enrollment. This field plus actual routes/lifecycle contribution is the concrete join; constructing/exporting a controller without either forward is not enrollment.

## Setup metadata, membership and fallback

Replace only authenticated `services.resolveSetup` forwarding (`213`) with a method that first calls the actual captured request resources' `getOnboardingSetupState(context)`. If it returns a state, return that exact truthful unavailable state in a Promise. If it returns undefined, call the original settings resolver unchanged. A capture/currentness exception propagates; it must not fall through to generic SQL. Do not mint favorable setup state, register signal/requestId tuples or recapture a deadline.

Application already captures the original request before principal/setup and calls setup after real principal resolution. GET therefore uses its genuine CSRF preparation/anonymous principal and this unavailable selector without the proxy onboarding-step SQL. RPC still obtains real bounded setup methods from C's actual per-request factory. Non-onboarding settings, principal, read/Auth policies and public-only resolution remain unchanged.

Membership remains four route objects/five method paths: one GET/POST claim route and three POST RPC routes. D Application validates identity occurrence once and exact method descriptors, selects the enrolled exact path before broad `/rpc`/asset fallbacks, and admits unsupported HEAD/methods only as C's local generic 405—not A-positive/cookie authority. Preserve existing broad fallback objects; never add a competing GET route or mount legacy onboarding procedures.

The public registry still contains only getCulture/getBranding with its existing source revision/id/meta/policy validation. Authenticated read profile/meta constructors and twelve read requirements, Auth9 and three fixed writers are unchanged. Do not edit `join-slots.ts`'s historical metadata, broaden legacy procedure lists or alter count 91/completeSetup.

## Lifetime, failure and drain

The native owner already retains the one C controller and prepublishes its once-only close completion. Application's actual active-request drain precedes reverse contribution disposal; the new contribution then joins C handlers/scopes/publication reservations through `closeAsync`, before existing persistence disposal closes authenticated resources/issuer/native. Parent native close may call that same controller again; it returns its cached completion rather than rerunning cleanup/native operations. No second owner/controller or asynchronous detached disposer is introduced.

For runtime construction failure after controller birth—including later public-resource construction or assembly/Application validation—prepublish an observed construction-cleanup completion **before invocation**. Its owned async body attempts/awaits actual controller close first, then always attempts/awaits actual `persistence.dispose`, even if close failed. Preserve the original construction error and direct distinct cleanup failures/cause; observe callback-forwarding rejection. The slot is an actually created controller only; absence means no fictitious close. Existing native construction failure remains responsible for resources it created before returning persistence.

Do not wait a cleanup task on its own construction/close completion, race an abort against physical settlement, renew the startup/epoch/request budget or infer successful native cleanup from Promise fulfillment. All cleanup and publication results retain current C/D failure/UNKNOWN/no-resend classification. No external publication guard is replaced with the normally aborted A work signal.

## Closed scope / remaining authority

Current ports suffice for these two real bodies: no additional contracts/caller/helper/dependency is required. Existing backend manifest already declares contracts/API/Auth/DB and the current public ports were read. This plan does not allocate a source writer or overlapping preservation/transport edits.

Once separately leased/authored, E code can connect the optional native-profile construction path; enrollment source is still not an application boot, real-data access, transport launch or default Next behavior change. F installation/generated-client/browser CSRF/welcome UI and unsupported onboarding stages remain separate. Claim mapping branches are unchanged by current D's assertion/type cuts; conditional F mappings are not runtime proof.

Socket write-head/finish/error/close/client receipt remain held on the missing adapter-owned producer/entry lease. Fetch EOF is not socket proof; native/FS/runtime/oracle permission and completeSetup stay held. Historical native generations/checks are not transferred to E.

Only this NEW report patch and dedicated frozen source/interface/manifest reads occurred. No product edit, command/hash/stat/check/evaluation/import/test, SQL/native/Engine, network/private configuration/data, nested agent, dependency or actor permission. All earlier plans, reports, counts and source bytes remain unchanged.
