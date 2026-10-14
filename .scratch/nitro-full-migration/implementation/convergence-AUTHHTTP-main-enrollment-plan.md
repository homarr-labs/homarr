# AUTHHTTP MAIN enrollment — conditional two-file plan

## Disposition and exact authority

**REPORT ONLY. Mounting, source authoring and compiler release remain HOLD.** This report is the sole write: `.scratch/nitro-full-migration/implementation/convergence-AUTHHTTP-main-enrollment-plan.md`. The only prospective product-source lease is:

1. `apps/backend/src/server/runtime-composition/runtime.ts`
2. `apps/backend/src/server/runtime-composition/assembly.ts`

Coordinator supplies Backend4 both source axes ACCEPT and its four checks zero; the publication producer is frozen with fresh `AUTHHTTP-PUBLICATION4-1` Backend/Nitro/contracts/owners compiler checks and focused lint all zero, and Auth-lineage SOURCE ACCEPT. **Independent physical-kernel/shutdown review is still active.** Neither the supplied checks nor lineage acceptance closes that review. Whole-producer SOURCE ACCEPT, fresh required checks zero and independent approval of this enrollment plan must precede any separately granted two-file source lease.

No commands, checks, tests, hash helpers, evaluation, native SQL, configuration/env/data/secrets or nested agents were used. No product source, existing report, comments, casts, dependencies, framework or tests were changed. No constructor invocation, descriptors, application construction, runtime/network/native action or adoption occurred.

## Frozen evidence and caller contract

Coordinator reconciliation: both publication-producer source axes are now terminal ACCEPT, and AUTHHTTP-PUBLICATION4-1 backend/nitro/contracts/owners/focusedlint all0. The earlier active physical-review premise is historical. All authors/reviewers are terminal. The exact two-file enrollment report is received; branch remains rework-hono and AJN-482 remains linked. Current Backend dependencies/exports and runtime/assembly joins were read; the scoped apps TypeScript callsite search found only runtime.ts calling assemblePublicResourceHost. No enrollment source, runtime or compiler release yet.

Read stable runtime.ts and assembly.ts, the accepted Backend4 handoff/finite selector, Phase 3 plan corrections and publication source handoff. For the producer join, read only the necessary frozen contracts and MAIN constructor/validator/returned-member slices. Application physical bodies, MAIN physical publication/shutdown bodies, Auth/native execution bodies and their imports were not re-reviewed.

Actual frozen seams:

- Backend `contracts.ts:63–71`: `AuthHttpConstructionInput` is `{baseUrl: PublicBackendInput["baseUrl"], basePath: "", maximumResponseBytes: number}`; `AuthHttpController extends AuthHttpPublicationProducer` and retains `handle(context: RequestContext): Promise<FetchOutcome>`.
- MAIN `native-main-persistence.ts:780–847,1245–1253`: genuine owner exposes `createAuthHttpController(input)` and `assertAuthHttpController(controller): void`. Validator uses its private controller registry and retained request/issuer/SQLite/currentness closure. Its actual signature takes **only the controller**; do not invent request/runtime parameters or another validator/factory.
- Contracts `contribution.ts:56–79`: producer requires `claimResponsePublication(originalContext, originalCompletedResponse)` and `finishUnclaimedResponsePublication(originalContext, originalCompletedResponse, terminal)`; enrollment is `{kind: "disabled"}` or `{kind: "enrolled", routes, producer}`. ApplicationOptions' optional selection does not make an enrolled producer optional.
- Backend `HostAuthenticationInput:83–92` already discriminates public-only versus authenticated-read and already requires `maximumResponseBytes` on the authenticated branch. `PublicHostConfiguration.baseUrl` has the required origin type; its basePath is a string and must be narrowed to the empty literal at the caller, without a cast or configuration-contract edit.

Earlier Backend4's producer-free controller description and Phase 3's pre-correction claim-time task proposal are historical. Use the actual extended controller and the source handoff's pre-handler reservation protocol. No missing export or new public shape is assumed.

## 1. runtime.ts — one construction at the existing join

Keep the existing capture/readiness/auth-resource/schema sequence (`:78–106`). Within the existing second authenticated-read branch, immediately after genuine Auth request resources and authenticated read resources are available and before the existing fixed-write/RPC assembly:

1. Reject nonempty **captured** `configuration.basePath`. Narrow that same property to `""` before passing it; do not hardcode an empty replacement for a configured prefix, normalize the host again or widen the constructor input.
2. Construct **one** controller through the already acquired `persistence.createAuthHttpController`, with `configuration.baseUrl`, the narrowed captured `configuration.basePath`, and the existing explicit `options.authentication.maximumResponseBytes`. No fallback budget, timeout, clock, issuer, persistence runtime, SQL owner, Auth resources or configuration capture is introduced.
3. Build a frozen array of exactly nine distinct frozen FetchContribution objects for the paths below. Freeze their public access objects as well. Every descriptor has `phase: "auth"`, `descendants: false`, `access: {kind: "public"}`, and **`handle: controller.handle` directly**. No bind, lambda, async forwarding wrapper, callback pair or copy of the controller is permitted. Direct method invocation retains the validated descriptor's common function identity; producer methods are invoked on the actual controller by the existing application protocol.
4. Carry that exact controller, those exact objects and the **same genuine persistence object** into the assembly's required authenticated input described below. Continue using the same `requests` for principal/services, authenticated reads, fixed writes and public RPC authentication. Preserve the existing authenticated RPC/fixed-write construction arguments and sequence relative to one another.

The public-only branch performs no Auth controller construction and supplies no Auth routes. Preserve runtime's existing construction-failure disposal/AggregateError path; do not catch a controller/enrollment error and silently select public-only. The real constructor continues to enforce canonical HTTP(S) origin, origin/provider/cookie/clock agreement, explicit bounded budget, ready epoch/current owner and retained identities. Mounting is not file adoption or domain readiness proof.

## 2. assembly.ts — required discriminated join, then enrollment

### Exact local type refinement

Do not edit global HostAuthenticationInput, Backend contracts or ApplicationOptions. Refactor only assembly's existing inline persistence shape (`:25–32`) into a local generic type, `ResourceHostPersistence<Database, Schema>`, retaining its existing members exactly. Keep `options.persistence` typed by that shape.

Extend **only** assembly's existing authenticated-read variant (`:40–47`) with these required fields:

| Prospective local field | Required type / meaning                                                                                                                         |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `authHttpController`    | Existing frozen `AuthHttpController`                                                                                                            |
| `authHttpRoutes`        | `readonly FetchContribution[]`, exact closed route objects                                                                                      |
| `authHttpOwner`         | `ResourceHostPersistence<Database, Schema> & { assertAuthHttpController(controller: AuthHttpController): void }`, the actual persistence object |

The public-only variant stays `{readonly kind: "public-only"}` and has none of these fields. This is a required discriminated union, **not** three optional fields, an optional guard or a new authentication mode. The owner reference is necessary to keep its required validator within the narrowed authenticated variant without assuming a nested authentication discriminator narrows a sibling persistence union. It introduces no standalone validation callback: runtime passes `authHttpOwner: persistence`, and assembly requires `authentication.authHttpOwner === options.persistence` before invoking that owner's method.

runtime.ts already derives its local assembly authentication type through `Parameters<typeof assemblePublicResourceHost>[0]["authentication"]`; populate the new required fields there. Its external HostAuthenticationInput and public RPC authentication discriminator remain unchanged. Import only the existing exported types needed for this local refinement. Do not broaden public-only callers to require an Auth guard. If an additional authenticated caller needs changes outside these two files, STOP and report its exact required scope rather than use optional fields or expand the lease.

### Mandatory pre-application validation

Keep current persistence/readiness, public RPC/locale, authenticated read and fixed-write validation. Before `createApplication` (`:216`), the authenticated branch must:

1. Require empty captured basePath and exact owner-object identity with options.persistence. Call **`authentication.authHttpOwner.assertAuthHttpController(authentication.authHttpController)`** on that genuine owner. Revalidate at the final assembly join immediately before application construction if intervening construction could reenter; do not substitute readiness flags or copied functions.
2. Require exactly nine route objects, unique path and object identities, the exact closed path-set equality below, frozen descriptors/public access objects, phase auth, explicit descendants false, public access and a callable handler whose identity equals that validated controller's `handle`. Do not accept only equal counts or permit suffixes, prefixes, decoded/encoded aliases, trailing-slash normalization or provider-dependent subsets.
3. Check Auth exact paths against the existing foundation health paths, locale route, authenticated read/fixed-write paths and the public RPC descriptor. Reject duplicate exact handlers and any competing auth-phase or managed Auth handler/catchall. Preserve the existing asset-phase `/api` and other namespace 404 descendants: they are deliberate late fallbacks, not additional Auth handlers. Do not treat those existing ancestor fallbacks as an exact collision or broaden their authority.
4. Preserve current authenticated services wiring (`:128–132`) using the **same requests** created by this owner. Runtime's trusted construction join supplies the same request resources and guarded runtime; the actual owner validator checks its own captured identities, not arbitrary structural request/runtime arguments. Do not pretend that its signature independently compares caller-supplied requests or mint another identity-check API.
5. Derive explicit `AuthHttpPublicationEnrollment` **inside assembly**: authenticated means `{kind: "enrolled", routes: authentication.authHttpRoutes, producer: authentication.authHttpController}`. Producer is the exact validated controller, not an object containing copied publication methods. Public-only means `{kind: "disabled"}` and an empty Auth route array. Missing/invalid authenticated inputs are construction failure, never disabled fallback.
6. Insert each exact Auth route object **once** into public-resources routes, ahead of the existing list; keep all existing entries in their original relative order: authenticated read routes, fixed-write routes, public RPC, locale API, then the existing namespace asset404 entries. Pass the same array's object identities as enrollment routes and pass explicit enrollment to createApplication. No reconstructed descriptor copies between validation, contributions and enrollment.

Application's frozen enrollment validation remains a second mandatory parity check: mode, exact route membership/identity, uniqueness, common handler and mandatory producer. The trusted assembly establishes genuine MAIN provenance and equality to controller.handle; the generic application contract alone cannot establish it. A selected enrolled handler returning pass is a contract fault under the existing producer integration, not permission to fall through.

## Closed surface: nine paths, eight LegacyIssuerHttpAction kinds

Assembly/runtime enroll paths only. The accepted existing selector remains the sole action/method/provider mapper; do not duplicate a second action dispatcher or widen direct-P1 outcomes.

| Exact path                       | Allowed methods / Allow on 405 | Existing legacy action | Provider condition  |
| -------------------------------- | ------------------------------ | ---------------------- | ------------------- |
| `/api/auth/providers`            | GET                            | legacy-providers       | None                |
| `/api/auth/csrf`                 | GET                            | legacy-csrf            | None                |
| `/api/auth/signin`               | GET                            | legacy-signin          | Providerless page   |
| `/api/auth/callback/credentials` | POST                           | legacy-credentials     | credentials enabled |
| `/api/auth/callback/ldap`        | POST                           | legacy-ldap            | ldap enabled        |
| `/api/auth/signin/oidc`          | POST                           | legacy-oidc            | oidc enabled        |
| `/api/auth/callback/oidc`        | GET, POST                      | legacy-oidc            | oidc enabled        |
| `/api/auth/session`              | GET, POST                      | legacy-session         | None                |
| `/api/auth/signout`              | POST                           | legacy-signout         | None                |

All nine descriptors exist regardless of enabled providers. For a genuinely captured known request, wrong method is bodyless405 with exact Allow before body/Core/native work and before provider availability; **GET `/api/auth/signin/oidc` → 405 / Allow POST**, never synthetic POST. Correct method with disabled provider is bodyless404. Unknown `/api/auth` suffixes remain outside this exact set and reach the existing asset404, not Auth/Core/render/catchall. No direct HMAC aliases, expiry/verification endpoints or new paths are added. Preserve original Request/Host/HTTPS/forwarding checks and locale behavior; no path decoding or request/header/body rewrite is introduced.

## Preserve publication and security owners unchanged

This is enrollment, not another physical-kernel/MAIN review. Keep the frozen producer's completed-handler/Response weak records, original context quartet/principal, pre-execution saved operation bounds, configured plus wall-clock checks, joined original signals/resource/MAIN lifetime, pre-handler reservation and unchanged canonical native outcome/acknowledgment. Assembly supplies identities; it does not reconstruct those facts.

Keep the existing application body-retention reader and physical terminal protocol unchanged. No Response clone, extra reader, body buffering, publication callback wrapper, readiness boolean, timer, old-lease check after renewal/logout or anonymous onPrivateResponsePublication registration is added. Published remains the application's recorded bodyless/HEAD/EOF boundary, not remote delivery or native success. Existing held503/local405/404 retain genuine records; uncapturable/unrecorded failures remain the producer's rejection to existing kernel sanitization, not fabricated controller responses.

Do not change PrincipalResolver, Auth resource/service ownership, request/procedure operation, private RPC authorization, private publication hooks or the existing two anonymous RPC settings leaves. Public Auth descriptor access means admission to the genuine controller/Core protocol, not permission to execute arbitrary protected procedures or a fake anonymous credential grant. Existing dispatch phase order stays auth → rpc → api → stream → binary → asset; no stream/binary contribution or fallback is added. Existing disposal/lifecycle order and physical reservation drains are inherited, not replaced by assembly guards or new awaits.

## Prospective source/check envelope — RECONSTRUCTED, not released

Coordinator disposition: both independent enrollment plan axes APPROVED with no findings (Auth/request/wire/caller ses_ece04cd30ffenH0qfet0WLe9YW; route/enrollment/owner/publication/lifecycle ses_ece745d66ffe8YruU1v89Wrgqk). Coordinator now releases only runtime.ts and assembly.ts plus named source-publication handoff. Two before-images are preserved at TEMP/nitro-auth-enrollment-source-d3wh2c78/source-before.json; accepted producer/Auth/Native6/K4/D2 and Backend capture/selector pins reauthenticated, five producer exits reread0. This permits source enrollment, not evaluation of the constructor, application startup, compiler, native/adoption or data work. Source freeze, independent reviews and fresh mounted-source checks remain mandatory.

The exact source cut is runtime.ts plus assembly.ts only, with the constructor join, local required union, owner validation, frozen exact descriptors and explicit enrollment above. No product-source work is authorized by this report.

Required sequence:

1. Physical-kernel/shutdown source review becomes terminal ACCEPT; reconcile whole publication-producer SOURCE ACCEPT with Auth-lineage acceptance and fresh required all-zero checks on the unchanged producer pins. An active/withheld review remains HOLD regardless of previous green checks.
2. Independent enrollment-plan review approves both the original Auth/request/wire/provenance join and exact mode/membership/owner/publication binding. Any correction stays report-only until separately authorized.
3. Coordinator separately grants exactly the two source files. Author freezes those mounted source changes and supplies an exact source handoff; no runtime constructor invocation, listener/adoption or native validation is included in the author lease.
4. Coordinator separately runs fresh checks against that final mounted-source freeze. **RECONSTRUCTED scope envelope:** Backend compiler; Nitro caller/compiler surface; shared contracts compiler; Auth/SQL/DB owner compiler surface; focused lint of exactly runtime.ts and assembly.ts. This carries forward the supplied producer check dimensions, not their result. Exact executable commands/package selectors are not present in the read handoffs and are not invented here; coordinator must pin its actual existing check recipe before execution. No check was run or check permission inferred in this session.
5. Two independent mounted-source reviews plus all required fresh checks zero are required before the final mounted-source/compiler acceptance envelope can be released. It must identify the exact two-file freeze, unchanged producer/source pins, actual checked scopes and results, and outstanding runtime/data holds. Previous producer zeros cannot be reused as mounted-source zeros. No compiler release before mounted-source freeze **and** fresh checks zero; no runtime/native release follows from compiler acceptance.

If any missing export, type incompatibility, external authenticated caller, physical defect, nonempty configured basePath, unexpected collision or producer prerequisite requires another file, **STOP before touching it**. Record the exact prerequisite and request an amended scoped plan/lease; no compose/config/bootstrap fallback, cast, optional guard, hidden application edit or global authentication-contract widening is permitted.

## Unchanged holds

compose/startup/host/entry/UI/barrels/Auth/DB/request/contracts/private RPCs, application.ts and native-main-persistence.ts are outside this prospective lease. No credential/file adoption or provenance acceptance, SQL/bootstrap migration, account/hash/grant/data mutation, actual Auth execution, K validator, boot, App/private SSR/admin/all-procedure/client/session/logout proof, browser/network/runtime or production-data acceptance is claimed. Retain next-auth/react and the accepted finite wire without a UI redesign.

Preserve ordinary portable self-hosting in one artifact/listener, original Host/request/HTTPS/locale and authenticated empty-basePath constraints, without mandatory Docker/Cloudflare/tunnels or new listener/default secret. All prior real-data, default3100/3200, control and artifact holds remain in force. A mounted-source/compiler result alone must not clear any of them.
