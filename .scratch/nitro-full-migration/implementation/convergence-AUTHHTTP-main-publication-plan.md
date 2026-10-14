# AUTHHTTP Phase 3 — MAIN publication gate investigation

## Decision and authority boundary

**HOLD mounting and the stronger outer-body claim.** The existing application already supplies the physical body-retention/cancellation machinery. It does **not** supply a usable Auth HTTP publication producer carrying the original request deadline and MAIN/request-resource lifetime into that machinery. Reuse the loop, not the private authenticated registration or its old-lease guard. No separate stream framework, body serializer, listener, Auth Core instance or new timer is justified.

This is a report-only investigation. Its sole write is this new report. Backend4 remains the sole active product writer of `apps/backend/src/server/runtime-composition/{contracts.ts,auth.ts,native-main-persistence.ts,auth-http.ts}`; their bodies and imports reached through them were not read. Their interfaces below come from the immutable consumer/enrollment plans and remain prospective until Backend4 freezes, independent source review accepts them, and its fresh required checks succeed. No source lease, mounting, runtime, data or network action is authorized here.

Coordinator-supplied premises: Auth5, Native6, K4 and D2 source axes accepted; fresh `D2-AUTHHTTP-LEGACY5-2` backend/nitro/owners/focused-lint all exited zero. These results were not reproduced. Native Auth/App execution, file-backed credential adoption and K validator behavior remain unproved. Earlier active-Auth prerequisites in the consumer report are historical; Backend4 is currently active and dormant, not called or mounted.

No commands/checks/tests/hash helpers/evaluation/native SQL, config/env/data/secret bodies or nested agents were used. Targeted source searches returned some unrelated previews; no test bodies were opened. No production readiness or activation claim follows.

## Actual stable seams

| Source                                                 | Relevant actual behavior                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/contracts/src/request.ts:15–35`              | RequestContext has exact request/requestId/signal/principal/onDispose and **only** `onPrivateResponsePublication`; RequestServices has principal/setup/authorization producers, no Auth HTTP publication producer. Principal is anonymous or authenticated subject, not a supplied lease/user.                                                                                        |
| `packages/contracts/src/contribution.ts:3–28`          | Phase ordering is auth → rpc → api → stream → binary → asset. FetchContribution has phase/path/descendants/access/handle; FetchOutcome is pass or response. ApplicationOptions has contributions/services/render/reportError, no separate public-body guard binding.                                                                                                                  |
| `apps/backend/src/server/application.ts:36–78,149–203` | One application request signal joins incoming request and application lifetime. The real resolver runs before route dispatch; its returned principal is frozen and placed in the same context. Private registration requires authenticated principal, pre-response/pre-disposal timing and a single guard.                                                                            |
| `application.ts:121–146,277–294`                       | respond owns the Response before its first check, finalizes headers/body, checks again, retains the body, checks before returning, then transfers ownership. finalize reconstructs Response wrappers, adds no-store/nosniff and retains status/statusText/body/header values; controller object identity is therefore not transport object identity. HEAD discards the original body. |
| `application.ts:296–388`                               | retainRequest owns one reader, pending read/publication and reader.closed; highWaterMark is zero. It checks publication after each read, before enqueue/EOF, and retains physical cancellation/settlement before releasing the reader and disposing the request. It accepts an internal checker, but the only producer wired to that checker is private registration.                 |
| `application.ts:80–119,219–267`                        | Catch discards the owned response and awaits retained termination before sanitized error/disposal. Request disposal is idempotent, reverse-order and finishes the application active record. Shutdown aborts application lifetime, drains active requests, then disposes contributions.                                                                                               |
| `runtime-composition/authenticated-rpc.ts:41–98`       | Private preparation gets the real old lease, clamps its stored expiry, creates a fresh timer, and repeatedly obtains that exact lease through getRequestLeaseAsync. This is legitimate for its existing private read contract, not Auth renewal/logout/anonymous publication.                                                                                                         |
| `runtime-composition/runtime.ts:78–135,182–204`        | One ready persistence owner creates one Auth request resource, then fixed/read RPC on that same resource/schema. Authentication is passed to the assembler. There is currently no Auth HTTP controller call or enrollment.                                                                                                                                                            |
| `runtime-composition/assembly.ts:51–135,216–239`       | The assembler checks ready SQLite MAIN and exact RPC/culture descriptors, forwards that Auth resource's actual resolver/authorize services, and puts protected exact read/write routes before the public RPC contribution. Namespace 404 guards are asset-phase, after auth/rpc/api.                                                                                                  |
| `apps/backend/src/server/compose.ts:17–57`             | Actual compose.ts is under `src/server`, **not** `runtime-composition`. It constructs the existing authentication input and passes it to createPublicHostRuntime; a later controller join can use the existing origin/budget/input without changing compose or adding a configuration flag.                                                                                           |
| `runtime-composition/public-rpc.ts:14,57–86,119–149`   | Public product RPC membership is exactly serverSettings.getCulture/getBranding. The descendant descriptor internally admits only those exact paths. Authenticated requests use the existing private preparation. No Auth endpoint is an additional anonymous RPC leaf. Foundation health is a separate preexisting contribution.                                                      |

The consumer plan `:33–61,63–101` supplies original anonymous/authenticated HTTP captures, saved bounds, retirement-safe synchronous `assertHttpRequestCurrent`, genuine MAIN `createAuthHttpController`, real executor/outcome retention and abandoned-response drains. Enrollment `:114–139,207,209` explicitly leaves outer publication and Phase 3 mounting held. None of these prospective APIs was verified against the active Backend4 bodies.

## Why finite output alone is insufficient for the stronger claim

An accepted issuer's released finite Response can be handed to today's generic retainRequest **for request/application abort, physical reader cancellation and outer disposal**. That is useful and must be reused. It does not extend the saved Auth deadline or request-resource lifetime:

1. respond/retainRequest's generic signal is only request + application lifetime unless the private hook was registered. It contains neither saved issuer/request deadline nor MAIN/Auth-resource lifetime automatically.
2. With no private guard, assertPrivatePublication checks only that generic signal. No saved deadline, configured/wall-clock check or exact MAIN capture validation is performed on later chunks.
3. Auth's publisher timer is consumed on finite return according to enrollment `:137`; finite materialization is not evidence of a still-live deadline signal. A slow consumer can read finite bytes after the original deadline or owner retirement.
4. Anonymous Auth actions cannot legitimately register private publication. Authenticated renew/logout can retire their old lease intentionally, so reusing the RPC lease checker incorrectly rejects valid committed results. Scope-release abort is also not original request expiry.
5. A new wrapper stream inside the controller would alter its required same-Response handoff, duplicate reader ownership, and still place its last check **before** the outer application's asynchronous publication step. It cannot prove the final outer enqueue boundary. A Response clone/rebuffer is not the missing authority.

Therefore a separately reviewed bounded producer is necessary **only for the stronger original-bounds-through-outer-publication guarantee**, not because a new transport/body module is intrinsically necessary. Existing source cannot establish that guarantee today. The private hook must remain unchanged for private RPC/SSR.

“Through publication” must be specified precisely: reject before Response handoff and every application-controlled chunk/EOF publication when original clocks/bounds are invalid; cancel on existing request/application/owner abort; physically settle acquired work. With no surviving deadline-abort producer and no new timer, this cannot promise proactive wall-clock termination of an entirely idle, unpulled body at deadline. Do not silently claim that stronger property. If it is mandatory, keep HOLD and obtain separate authorization for an actual original-deadline signal producer; do not reset the budget, repurpose an issuer-scope signal or invent a timer in this cut. Nor does an application stream guard prove already-buffered network bytes can be retracted.

## Exact missing producer and smallest prospective source cut

**Missing producer:** a same-MAIN, single-consumption claim of the exact completed Auth controller response, yielding an original-capture-bound publication check/lifetime and recording outer physical settlement without rewriting the real native outcome. Its implementation must be inside the genuine MAIN owner, not an injected issuer/currentness callback or caller-authored guard.

Recommend the existing deep **application construction/result seam**, not a new RequestContext registration property. The application knows which actual route produced which Response and already owns the final body loop. No anonymous handler should obtain a general registration power. RequestContext and its private hook can stay unchanged.

Prospective producer lease, **after Backend4 final freeze/review/fresh checks and separate authorization**, is exactly:

| File                                                                     | Bounded purpose                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/backend/src/server/runtime-composition/contracts.ts`               | Extend only the internal genuine AuthHttpController contract with its owner-bound response-publication claim and owner validation shape. Do not expose structural issuer/SQL authority or public grants.                                                                                                                                                               |
| `apps/backend/src/server/runtime-composition/native-main-persistence.ts` | Produce that claim from the actual completion/response records retained by this owner; enforce the exact controller registration and record publication/cancellation failures and physical terminal settlement separately from nativeOutcome. No change to action/native dispatch, adopter, Auth construction or ready state.                                          |
| `packages/contracts/src/contribution.ts`                                 | Add an explicit discriminated application publication enrollment binding: disabled versus MAIN-Auth-HTTP enrollment of exact selected route identities and a **required** genuine producer in that mode. No optional guard callback whose absence silently permits enrolled Auth output. No principal/access/FetchOutcome widening and no new RequestContext property. |
| `apps/backend/src/server/application.ts`                                 | Consume the selected route/result binding in respond and the existing retainRequest checker/termination seam; join the real owner lifetime and make the original-bounds check at final handoff/enqueue/EOF. Keep private registration semantics and the existing generic path intact. No replacement transport or broad refactor.                                      |

These are proposed semantic interfaces, not implemented APIs or claimed frozen exports. The exact typed producer return must be settled by the independent plan gate before any source writer receives this cut. Do **not** manufacture an optional `onPublish` field or accept `{signal, assertCurrent}` from arbitrary anonymous handlers as evidence of MAIN lineage.

Required producer/caller checks:

- MAIN privately registers the exact controller it constructs; a synchronous owner validator rejects any structural imitation, foreign owner, duplicate construction or changed/closing retained request/issuer/runtime identity. Assembly must validate against **that persistence owner**, not just check function names or flags.
- A publication claim takes the exact original context and exact controller-returned Response before finalize wraps it. It matches a real, physically completed handler record, exact capture/quartet, finite selected action, immutable canonical outcome and exact response identity. It claims once; repeated, cloned, mismatched, pending, cancelled or unregistered output fails closed.
- Real local 405/disabled-provider 404/held sanitized output must be classified from the real handler record, not mistaken for released native output or used to forge a release. Bodyless local responses need no invented native outcome. Known selected Auth output cannot fall back to disabled/generic mode after claim failure.
- The application construction binding selects the actual frozen route descriptor objects/handler identities. It is lifecycle plumbing from the trusted composition join, **not** a global structural permission grant. A shaped contribution cannot mint a MAIN receipt: the real producer's private registrations are authoritative. Generic public handlers cannot install guards, replace the producer or select a principal.
- The claim closes over the original saved bounds, real request-resource lifetime and MAIN lifetime. Check original request/signal/principal/onDispose identity, retirement, original deadline against both existing clocks and retained owner identities. Never fetch the old lease, readUser, reauthorize, renew bounds or re-resolve principal after execution.
- Initial stale/API-key admission remains Backend4/issuer's responsibility. This producer does not turn unavailable-domain anonymous resolution into absent-session success, grant access, clear adoption or perform another native action.
- Retain the actual returned native outcome before any mapping/finalization/publication failure. Publication and physical cancellation outcomes are additional private discriminated records; confirmed/ambiguous/confirmed-settlement-failed remain unchanged. No retry, rollback or bad-password inference from transport failure.

No changes to `auth.ts`/`auth-http.ts` are presently justified by the immutable prospective contract: saved bounds plus retirement-safe currentness are already its intended producers. If Backend4's accepted frozen interface cannot retain/use these through request disposal, stop and request an exact amended lease; do not consume active source or improvise new capture APIs. No source cut is allocated by this report.

## Body handoff and cycle-free physical ownership

1. Complete issuer work, canonical native settlement, finite response production and abandoned-response cancellation in the existing real handler task. Backend4's finite handoff remains its boundary; the handler must not await outer body/disposal.
2. At application respond, take response ownership **before** claiming/checking publication so any claim/finalize failure is physically discardable by the existing catch path. Claim the actual completed record before wrapping; do not drain/reconstruct its finite bytes or append new cookies.
3. Preserve async private checks for their existing callers. For Auth's new mode, also perform its original-bounds **synchronous final check after the last await** immediately before returned Response handoff and each enqueue/EOF. A deadline check only before an await does not prove that boundary. Join only existing real request/application/owner-resource signals; add no timer or lease-scope signal.
4. Retain one physical reader and the existing pending-read/pending-publication/reader.closed/cancellation tasks. Errors/cancel/shutdown settle them and release the lock. Retain physical rejection separately; do not turn allSettled into a successful publication claim. An already locked/used controller output is a producer fault, not permission to compete for its reader.
5. If MAIN tracks a publication-completion task, register it before callbacks can reenter. It covers **physical reader/check/cancellation settlement only**, never outer onDispose or MAIN.close. Resolve/reject and record its terminal state on every path, including cancellation rejection, **before** awaiting request disposal. No task waits on its own completion record.
6. Application body finish settles physical work, records that terminal publication state, then runs existing request disposal. Auth capture retirement is synchronous and its disposer must not await the publication task it retires. MAIN close aborts admission/lifetime first, then drains real execution/cancellation/publication tasks before requests → issuer → helper/native cleanup. Application shutdown aborts and drains active bodies before contribution disposal. Concurrent owner/application close must also work through the real owner signal, not depend on future network pulls.

This ordering avoids controller→body→onDispose→Auth release→controller and MAIN.close→publication→MAIN.close cycles. It preserves original context during publication without preserving a retired credential's authority. The current kernel can supply the physical loop; its new exact producer and terminal-before-dispose integration still require source and contained runtime evidence.

## Separate later MAIN mounting cut

Only after producer acceptance, separately authorize **`apps/backend/src/server/runtime-composition/{runtime.ts,assembly.ts}`** for the existing MAIN callsite/enrollment. `src/server/compose.ts`, host, entry, startup, barrels, UI, schemas, environment/config/defaults and private RPC implementations need no presently justified edit.

- In runtime.ts's existing authenticated branch, after `createAuthenticatedReadResourcesAsync` and before passing authentication to assembly, construct **one** controller through that same persistence owner with captured canonical configuration.baseUrl, **basePath exactly empty**, and the existing explicit authentication.maximumResponseBytes. Retain the same requests/issuer/runtime/procedure-operation lineage; no parallel issuer/factory/Core/Next owner, asynchronous ready flag or second listener. Verify the accepted frozen constructor/publication APIs first.
- Extend assembly's authenticated enrollment only. Owner-validate the exact controller and required publication producer. Bind actual principal/authorize services from the same requests as today; do not substitute a resolver, clone the context, set setup ready or pass a synthetic user/lease.
- Install exact `phase: "auth"`, `descendants: false`, `access: {kind: "public"}` descriptors bound to that **same controller.handle**, with the required publication enrollment. Public access here permits legitimate Auth admission/CSRF processing; it does not make protected RPC public. Validate closed path/handler set, uniqueness/collisions and mode/producer parity before createApplication. Do not mount a descendant `/api/auth` handler or accept arbitrary supplied descriptor callbacks.
- application.ts already resolves the genuine principal first and sorts auth before rpc/api/asset. Exact Auth descriptors therefore run before public RPC and namespace 404 without changing their precedence or introducing anonymous procedure leaves. Unknown Auth suffixes remain held by existing namespace 404. Wrong methods are handled by the finite controller before body/Core/native work.

**Eight action kinds mean nine exact path descriptors**, because legacy-oidc owns two paths. Do not omit an OIDC path to satisfy the inaccurate phrase “eight paths”:

| Exact path                       | Methods   | Legacy kind/provider                        |
| -------------------------------- | --------- | ------------------------------------------- |
| `/api/auth/providers`            | GET       | legacy-providers                            |
| `/api/auth/csrf`                 | GET       | legacy-csrf                                 |
| `/api/auth/signin`               | GET       | legacy-signin                               |
| `/api/auth/callback/credentials` | POST      | legacy-credentials / configured credentials |
| `/api/auth/callback/ldap`        | POST      | legacy-ldap / configured LDAP               |
| `/api/auth/signin/oidc`          | POST only | legacy-oidc / configured OIDC               |
| `/api/auth/callback/oidc`        | GET, POST | legacy-oidc / configured OIDC               |
| `/api/auth/session`              | GET, POST | legacy-session                              |
| `/api/auth/signout`              | POST      | legacy-signout                              |

GET OIDC signin remains 405/Allow POST, not a synthetic handshake. Correct method with disabled provider is bodyless 404. No suffix/slash/encoded-provider normalization, empty-provider endpoint, direct JSON/P1 alias or new anonymous RPC leaf. The existing two settings leaves, protected read/fixed-write policy checks and their private publication hook remain unchanged.

## Existing transport/host guards to preserve

The actual chain is `apps/backend/server/entry.ts:23–27` → public-origin ingress → nitro.fetch → `apps/nitro/src/entry-server.tsx:10–15` → fetchApplication → compose/runtime/assembly → application.fetch. `host.ts:12–46` initializes once and waits for actual application.ready; `:50–63` aborts startup and disposes the resulting application. Entry `:41–42` explicitly does **not** equate listener bound with readiness; `:47–52` initiates application/server/Nitro close concurrently. These bodies contain no separate Auth original-deadline publication hook.

Keep `public-origin-ingress.ts:10–46` unchanged: reject native `_url` override, require exact nonempty public Host without whitespace/comma/control characters, native HTTP origin/authority match, no userinfo/hash, preserve the original native Request object, apply only the existing canonical HTTPS URL override when configured, strip all Forwarded/X-Forwarded headers, and return that same request. Do not reconstruct a new Request to bypass these checks or trust proxy headers. No `originalRequest` contract property was found in the actual inspected handoff; preserve its identity semantics rather than inventing one.

Keep captured canonical HTTP(S) origin validation in `configuration.ts:5–16`; Auth enrollment additionally requires empty basePath, despite the generic host's normalized-base-path support. Preserve exact host/origin agreement across captured host, requests and genuine issuer, original query/body/method, existing provider callback/CSRF guards, private authority and status/Location/multiple Set-Cookie semantics. finalize's existing security headers remain in force; successful controller Response identity does not mean bypassing transport finalization.

## Required acceptance gates; all still separate

1. **Backend4 freeze:** writer announces final source freeze; independent owner/completion/outcome and Auth-capture/wire reviews plus fresh required compiler/focused lint checks accept the actual four-file controller. No reading/consumption/checks against its active intermediate source.
2. **Producer plan gate:** independently accept the exact response-claim/provenance contract, final synchronous boundaries, physical terminal-before-dispose ordering, explicit application enrollment mode and the no-timer guarantee limitation. Only then issue the bounded four-file producer source lease above. It remains dormant: no runtime.ts/assembly.ts calls/descriptors.
3. **Producer source gate:** independent original-bounds/authority and transport/shutdown reviews; fresh affected backend/nitro/contracts/owner compiler checks and focused lint zero, as separately authorized. Frozen source acceptance is not runtime success. No new tests are authorized here.
4. **Separate MAIN mounting gate:** authorize runtime.ts/assembly.ts only after actual accepted signatures are available; independently review exact nine-path/eight-action set, same-owner identity, phase/public-router precedence, required guard mode, public membership/private hook preservation and unchanged host ingress. Fresh relevant compiler/focused lint checks follow under that lease.
5. **Contained runtime proof gate:** separately authorize the concrete runtime/data/network surface. Prove original Request/context identity and deadline (including a delayed consumer), request/MAIN/application abort, released finite bytes/multiple cookies, bodyless/HEAD cleanup, physical cancel rejection/locked-body handling, renewal/logout without old-lease reread, pre/post-commit failure preserving nativeOutcome, all active task drains and concurrent close without self-wait. Auth actions need actual native issuer/domain behavior; source checks do not prove them. App behavior and K validator proof remain separate, not swept into publication acceptance.
6. **File-backed adoption/data gate:** actual file-backed first credential adoption/provenance is still held; `:memory:` native verification is not production file acceptance. Existing-path/portable startup syntax, successful constructor syntax, listener binding or SQL readiness do not clear it. Do not force ready, compare a flag, bootstrap another DB, adopt/reset data, replace hashes/grants/accounts or invent a memory result. Obtain explicit separate authorization before accessing a real/copy database, starting a listener, executing native mutations, contacting LDAP/OIDC or changing any runtime/state flag. User data must remain preserved.

**Recommendation to coordinator:** keep Backend4 on finite dormant handoff; accept this report as identification of the next gate, not its approval. Review/release the original-bounds publication producer first, then separately review/release MAIN enrollment, then separately authorize contained native/runtime/adoption/App/K proof. Ordinary portable self-hosting in one artifact/listener remains the goal; no mandatory Docker/Cloudflare/tunnel, broad framework changes or permission shortcut is proposed.

## Oracle refinement — exact conditional typed protocol

This append replaces the earlier deliberately unsettled typed-return paragraph (`:60`) with the following **proposed exact contract**, not an implemented/exported interface. Backend4 is still ACTIVE: none of its four mutable files or imports reached through them was inspected. Only the stable application/request/contribution contracts and the existing report were reread. The append is the only write; no commands/checks/runtime/data/network action or source lease occurred. All preceding holds remain.

### Small transport types, no new request authority

The following types belong in the prospective `packages/contracts/src/contribution.ts` cut. RequestContext, RequestServices, AccessRequirement and the private publication hook stay unchanged. The handle is opaque **by actual MAIN registration**, not a TypeScript assertion/brand masquerading as runtime authority. Its methods close over its exact private record and reject a foreign/unregistered/rebound handle. A structurally similar object is not a registered MAIN handle.

```ts
export type AuthHttpPublicationCause =
  | { readonly kind: "error"; readonly error: unknown }
  | { readonly kind: "cancel"; readonly reason: unknown };

export interface AuthHttpSettlementFailure {
  readonly stage: "read" | "publication" | "reader-closed" | "release-lock";
  readonly error: unknown;
}

export type AuthHttpPublicationTerminal =
  | {
      readonly kind: "published";
      readonly boundary: "bodyless" | "head" | "eof";
    }
  | { readonly kind: "abandoned"; readonly cause: AuthHttpPublicationCause }
  | {
      readonly kind: "cancel-failed";
      readonly cause: AuthHttpPublicationCause;
      readonly cancellationError: unknown;
      readonly otherFailures: readonly AuthHttpSettlementFailure[];
    }
  | {
      readonly kind: "settlement-failed";
      readonly cause: AuthHttpPublicationCause;
      readonly failures: readonly [
        AuthHttpSettlementFailure,
        ...AuthHttpSettlementFailure[],
      ];
    };

export type AuthHttpPublicationAbandonment = Exclude<
  AuthHttpPublicationTerminal,
  { readonly kind: "published" }
>;

export interface AuthHttpPublicationHandle {
  readonly lifetime: AbortSignal;
  assertCurrent(): void;
  finish(terminal: AuthHttpPublicationTerminal): void;
}

export interface AuthHttpPublicationProducer {
  claimResponsePublication(
    originalContext: RequestContext,
    originalCompletedResponse: Response,
  ): AuthHttpPublicationHandle;
  finishUnclaimedResponsePublication(
    originalContext: RequestContext,
    originalCompletedResponse: Response,
    terminal: AuthHttpPublicationAbandonment,
  ): void;
}

export type AuthHttpPublicationEnrollment =
  | { readonly kind: "disabled" }
  | {
      readonly kind: "enrolled";
      readonly routes: readonly FetchContribution[];
      readonly producer: AuthHttpPublicationProducer;
    };
```

The only ApplicationOptions addition is **`readonly authHttpPublication?: AuthHttpPublicationEnrollment`**. Optionality is solely backward-compatible **enrollment selection**, never an optional publication guard: absent means disabled. Enrolled requires both the actual route identities and both producer methods; a missing/invalid producer is construction failure, not fallback. This leaves existing non-Auth application consumers and fixtures unchanged; no broad caller/test edits are allocated.

For disabled/absent mode, reject construction if a contribution claims `phase: "auth"` or an exact/descendant `/api/auth` route; reject a root-descendant route that could act as an Auth catchall. Existing generic `/api` asset-phase namespace 404 remains allowed: it is not an Auth controller enrollment. Enabled mode validates exactly the nine closed Auth route paths already recorded above, phase auth, descendants false, public access, unique actual descriptor membership in contributions and one common handle identity; any other auth-phase or Auth namespace handler is rejected. Mounting additionally requires empty basePath. Generic render/namespace error handling does not become an Auth producer. This reserved-surface check prevents adding an Auth handler while omitting the mode; it does not authorize broad private routing or alter unknown-suffix 404 behavior.

At runtime the application selects enrolled publication by **the actual descriptor that returned the result**, not pathname alone and not a callback supplied by the response. It retains that descriptor/context/result before respond. Selected enrolled handlers must return their actual registered response for known exact paths; pass on such a descriptor is a contract fault, not permission to reach a generic handler. Authorization denial or handler throw is an application-generated failure, not a controller-completed Response to claim. These failures are disposed through the existing sanitized error path without manufacturing a receipt/native result.

The optional mode cannot mint MAIN provenance: at the later trusted assembly join, the genuine persistence owner validator establishes the exact producer/controller and descriptor handle identity. The application's structural type is only routing/lifecycle plumbing. No anonymous handler receives an install/registration method; no global fake principal, permission, lease or ready grant is added.

### Exact prospective MAIN/controller methods

The internal controller contract in `runtime-composition/contracts.ts` becomes:

```ts
interface AuthHttpController extends AuthHttpPublicationProducer {
  handle(context: RequestContext): Promise<FetchOutcome>;
}
```

The genuine persistence result adds **`assertAuthHttpController(controller: AuthHttpController): void`** alongside its existing prospective `createAuthHttpController(input): AuthHttpController`. This is a real owner method in native-main-persistence.ts, not a supplied validation callback. It validates the exact privately registered controller, exact retained requests/issuer/SQLite runtime identities, ready/current owner and absent cleanup at construction/enrollment. Its acceptance does not grant request permission or adopt a credential domain.

Later runtime constructs exactly one controller; later assembly calls that owner's validator, binds every exact Auth descriptor directly to `controller.handle`, and supplies **`producer: controller`**, not a copy or alternate pair of functions. Application construction checks common route.handle identity; assembly checks equality to that validated controller.handle. The closed enrolled route objects are the same objects actually inserted in contributions. No body/header/Response clone, new stream layer, new timer or second issuer factory is proposed.

### Owner records and atomic claim/unwind

There are three distinct private facts: **actual underlying native acknowledgment/outcome**, **completed controller/returned-response ownership**, and **outer physical publication terminal**. The publisher cannot infer native acknowledgment not returned by the actual executor. Keep its genuine canonical outcome unchanged, including held/ambiguous/confirmed/confirmed-settlement-failed. No handle exposes or replaces that outcome.

The handler record discriminates at least actual `issuer-released-response`, actual `local-rejection` (wrong-method 405 or disabled-provider 404), and actual `held-response` (sanitized 503 retaining its genuine issuer outcome). It includes the exact context/capture, selected path/action, physically settled handler task and exact original returned Response. Cancelled/discarded issuer output is **not** a returned released response. Local bodyless output has no invented issuer/native success. The local-negative path needs the original resolver capture for outer lifetime/deadline only; it must not claim credential admission or bypass the finite selector's method/provider order. If the accepted Backend4 record cannot supply this distinction/capture, stop for the amended scope gate below.

Each genuine handle has a private WeakMap record tying it to that exact completed handler/response/capture and owner. Its lifetime is the existing MAIN plus request-resource lifetime, joined without a timer; application joins it with request/application lifetime. assertCurrent synchronously checks the original captured quartet/principal, saved effective resolver/request deadline against configured and wall clocks, original operation signals, resource retirement and retained owner identities. It uses **no old lease/current-user reread, renewed deadline, issuer-scope-release signal or ApiKey admission fallback**. Captured authenticated expiry clamps remain original after renewal/logout. Constructor readiness and request permission are not supplied by this check.

Claim is synchronous and single-use. Separate immutable lineage validation from currentness:

1. Before registering publication, establish that the exact response/context belongs to a real completed unclaimed handler on this controller. Reject foreign/cloned/pending/cancelled/repeated output. Allocate/freeze the handle and deferred terminal completion, capture the actual existing lifetime signals and prepare its record **before** invoking any caller/currentness function or attaching any abort listener. The genuine claim does not run a final currentness check after registration; application will run handle.assertCurrent after receiving/storing it.
2. Store the private handle/handler association and strong pending terminal task before making the handle observable or allowing application abort registration/checks to reenter. Return the frozen handle without another fallible external callback. A completed valid response may still be claimed while its original bounds/owner have just aborted, solely so the application can settle abandonment; assertCurrent then rejects publication. Claim is not a post-close constructor/readiness bypass.
3. If internal registration fails before return, keep its exact deferred/partial-registration record on the already retained handler in a **claim-unwind** state and retain the thrown error privately. No receipt was exposed; do not retry, resolve it as published or forget a strong pending task. Application's mandatory finishUnclaimedResponsePublication closes that same partial task **after physical discard/drain**, rather than creating a replacement receipt/task. If nothing was registered, it records the real handler's abandonment without inventing a task. Allocation/lineage rejection before any real record exists creates no MAIN publication task.
4. respond assigns ownedResponse and original response/context provenance **before calling claim**. If claim throws, existing owned-response discard is awaited and its actual errors classified; then call the required producer's finishUnclaimedResponsePublication with those original identities and the non-published terminal, before request disposal. This method validates a real unclaimed/claim-unwind handler and cannot close an already exposed claim. Unknown/foreign result rejection has no MAIN receipt to close; retain/report that producer fault and cancel only actually owned, available output. Never compete with a foreign locked reader or call it physically drained without evidence.
5. Immediately store a successfully returned handle in request-local publication state **before validating/checking it or registering abort listeners**. If subsequent mode/handle validation, signal joining, finalization or check fails, the kernel still has the receipt and must call its finish after actual discard/drain. If returned shape validation itself fails, invoke finishUnclaimedResponsePublication to unwind the genuine producer's never-usable delivery record; permit this narrowly marked delivery-fault state only, not arbitrary reclamation of a previously handed-off handle. A genuine producer's frozen handle shape is fixed; invalid delivery is a producer contract fault and keeps mounting held. Never fall back to the generic/private path.

finishUnclaimedResponsePublication is the one small required registration-unwind seam, not an optional replacement guard. Its only authority is the real retained unclaimed/unusable-delivery record. It cannot release bytes, fabricate an outcome, reclaim another application's live reader or finish with published.

### Terminal meaning and exactly-once finish

- **published/bodyless:** an authorized bodyless Response's final application handoff decision, after all preceding async work and the last synchronous bounds check. Includes genuine local 405/404 and genuine held bodyless 503, without asserting native success.
- **published/head:** that same bounded no-body handoff decision **after** actual original-body cancellation/drain/lock release succeeded. HEAD remains selector-dependent; it does not imply an issuer action was admitted. No premature published terminal merely because finalize omitted the body.
- **published/eof:** the returned body's actual EOF, after read/publication work and reader.closed physically settled, the lock was released and a final synchronous check immediately preceded successful outer controller.close. Header/Response handoff alone is not full-body published. Published is an application boundary, not measured delivery to the remote peer.
- **abandoned:** error, cancellation, abort or withheld/discarded result with physical acquired work settled and no settlement failure. Retain the original error/cancel reason, including a finalize or bounds failure. Cancellation may be a successful physical abandonment without being successful publication.
- **cancel-failed:** actual cancellation rejection; retain its error separately and all other physical failures. Never use a fulfilled allSettled call as a success classification. The original trigger stays in cause, separate from the cancellation rejection and canonical native outcome.
- **settlement-failed:** no cancellation rejection, but at least one real read/publication/reader.closed/lock-release failure. Preserve the nonempty failure list and original trigger. A producer-owned output unexpectedly already locked/used remains a retained physical contract fault, not a published terminal or an invented completed drain.

Receipt finish is **synchronous**, owner-recorded and validates its exact handle registration; it performs no native work, clocks/permission reread, dispose, close or await. The first valid terminal is frozen/recorded privately and resolves the registered completion with that **discriminated terminal**, not a boolean/void “publication succeeded”. Strong pending means awaiting physical terminal, not success. The application still reports/errors with the actual original/cancellation AggregateError where needed; a failed terminal cannot be returned as a successful guard. Completion removal happens only with recording/settlement, never at response claim or header handoff.

The kernel's finish-once state supplies the same stored terminal object on repeated finish paths. The owner permits an idempotent repeat of **that same terminal identity**; a different terminal after recording is a contract fault and cannot overwrite it. record/finish does not recheck currentness: it must remain callable after original signal/deadline/owner expiry to close real work. Its deferred completion is never awaited by finish itself, request disposal, an Auth retirement callback or an issuer cleanup scope. NativeOutcome remains private/unchanged after failed publication.

### Precise existing-loop integration and every early path

The current `respond:121–146`, bodyless `retainRequest:304–306` and EOF `pull:369–372` dispose too early for this protocol: they await disposal before bodyless return/outer EOF close. Preserve those private/generic consumers' semantics; add only the enrolled branch in this existing loop. Do not introduce a second stream/fetch/body wrapper. Its one existing reader, pending read/publication, reader.closed, retainedTermination and idempotent cleanup remain the physical primitives.

1. **Before retainRequest:** take ownership → claim/store receipt → existing private async checks, if applicable → finalization → original HEAD discard/drain, if applicable. On any failure, await actual owned-response cancellation and acquired work, combine cancellation/settlement errors without losing the trigger, finish the claimed or unclaimed record, then dispose. A failed finalize still has the original owned Response; a claim failure never erases it.
2. **During retainRequest construction:** once a reader is acquired, make its physical finish reachable to the kernel before readerClosed/listener/stream/wrapper construction can fail or abort can reenter. Any setup failure goes through that physical finish, even if no returned wrapper exists. Do not overwrite ownership with a wrapper until its cancellation path is retained. No acquired reader may be orphaned by getReader-success/later-construction failure.
3. **Final returned-body handoff:** after the existing last await/private check, run the receipt's synchronous assertCurrent and signal check immediately before committing Response ownership to the caller. No intervening await. If this fails after retainRequest constructed but before its Response was returned, physically cancel that retained reader/stream through the registered finish, finish as abandonment/failure, then dispose. A retained-but-never-returned body is not published.
4. **Bodyless/HEAD handoff:** complete every awaited private check and HEAD cancellation first, then final synchronous original-bounds/signal check, record published/bodyless or head, and commit/return the Response without a subsequent awaited disposal or bounds check. Start the existing idempotent request disposal only after that commitment, under its retained cleanup/application-active accounting; do not await it on the handoff path. Terminal is recorded before onDispose starts. Application shutdown still drains active disposal, and disposal failures are reported, not retroactively rewritten into native rollback. No background untracked cancellation is introduced. This branch is needed because rechecking after awaited onDispose would test an intentionally retired capture.
5. **Chunk pull:** await the real reader.read and existing private async check; retain those task results/errors. Immediately after the last await, check original bounds/signal synchronously and enqueue in that same continuation. Existing private async checking remains unchanged. Any thrown enqueue or check enters physical abandonment; neither body finiteness nor a prior successful handoff suppresses the check.
6. **EOF:** finish the physical read/check/reader.closed settlement and release its lock **without** awaiting request disposal. After those awaits, synchronously check original bounds/signal and close the outer stream in that same continuation; record published/eof before disposal. If the final check/close fails or an abort wins while draining, retain the failure, error the outer stream and record abandoned/settlement-failed/cancel-failed after physical settlement, then dispose. No original-bounds check occurs after disposal. The existing await-finish-then-close order cannot simply be reused if finish includes disposal.
7. **Abort/cancel/read/private-check/error/discard:** one physical-drain promise is registered before reentry. It owns reader cancellation, pending reads/checks and reader.closed, collects actual outcomes, releases the lock, records a failure/non-published terminal, then disposes. Consumer cancel before EOF is abandoned even after some bytes were emitted; publication is not atomic network delivery. If a cancel rejects, collect/drain all acquired tasks anyway and record cancel-failed before disposal. No drain promise includes the current pull/finish/receipt completion itself; private async check tasks are separate from the pull consuming them.
8. **HEAD cancellation failure or bodyless final-check failure:** finish non-published with the real root/cancellation evidence before disposal; never create a published/head or bodyless record. **Local 405/404/503** still claim their real completed handler record; no body reader/native acknowledgment is invented. **Kernel sanitized fallback** after an enrolled failure is not claimed as that original completed response, and cannot convert its failed receipt into published.

For enrolled mode, retainedTermination denotes the physical drain boundary; receipt terminal is recorded on **both** success and failure before disposeRequest. The existing cleanup promise separately owns request disposal and resolves the application active record. Normal pending publication tasks remain MAIN-owned until their physical terminal; no handler/executor waits for outer body/disposal, no terminal recorder awaits the publication completion it resolves, and no release callback waits for the task it retires. MAIN close aborts existing owner lifetime first, drains physical registered work, then cleans Auth/native resources. Its abort listener can complete an idle body without a new deadline timer; proactive idle **deadline** expiry is still not guaranteed.

### Conditional allocation remains four producer files, then two mount files

The exact producer source cut remains `packages/contracts/src/contribution.ts`, `apps/backend/src/server/application.ts`, and `apps/backend/src/server/runtime-composition/{contracts.ts,native-main-persistence.ts}`. No request-contract/Auth capture/controller-selector edit, new module, dependency, test, cast, comment, timer or configuration flag is requested. The producer remains dormant: it adds no runtime call, descriptors or listener. After its own independent source review/fresh required checks, a **separate** runtime.ts/assembly.ts mounting lease constructs/owner-validates the one controller, enrolls the exact nine descriptors/eight actions and supplies the required producer mode.

**Stop flag after Backend4 freeze:** verify its accepted captured original bounds/currentness survive finite execution until request disposal, its handler records retain exact context/Response/local-negative distinctions and its owner lifetime abort reaches the prospective producer. If any is absent or closes at execute completion, this four-file cut is not silently sufficient: request an exact amended capture/record lease and renewed plan review; do not assume extra unimplemented exports, read active bodies, reset the budget or clear the hold.

This refinement is ready for **conditional Oracle plan review**, contingent on Backend4 final freeze, independent source acceptance and fresh required checks zero before interface consumption/source release. It is not acceptance of the producer, mounting, client/App/K validator, native Auth execution, file adoption, runtime state or data/network authority. Preserve all host/original-Request/private-security guards and preceding adoption holds. No additional execution permission is inferred.

### Narrowing clarifications for the exact refinement

Coordinator prerequisite reconciliation: Backend4 is now final-frozen, both independent source axes ACCEPTED and fresh AUTHHTTP-BACKEND4-1 backend/nitro/owners/focusedlint all0. Former active-Backend premises are historical. Actual getHttpRequestBounds performs pre-execution association validation; it must not be called after renewal/logout to reconstruct publication bounds. Actual MAIN records retain selection, mapped returned response and canonical executor settlement, but do not yet store bounds/context as explicit fields or retain the returned controller as an owner-validated publication producer. Those are prospective MAIN changes in this four-file producer cut, not existing public guarantees. Original bounds/lifetime for all publishable returned responses must be captured while genuine pre-execution admission is still valid; later checks use the existing retirement-safe assertHttpRequestCurrent.

Plan review must settle the precise handoff/claim versus owner-close registration boundary: completed Backend handler work leaves its strong pending set at fulfillment, whereas the proposed publication task is first registered on later claim. No claim that MAIN close already drains future unregistered publication work is accepted. Review against actual shutdown/reentry ordering and specify the smallest cycle-free reservation/registration refinement if needed, keeping the handler independent of outer-body settlement. No source allocation follows from this recorded inquiry.

**Default compatibility:** the reserved-surface check above must not ban every unrelated `phase: "auth"` contribution. Absent/disabled mode remains today's generic application path for consumers without a managed `/api/auth` handler. Reject exact/descendant handlers for that managed namespace without enrollment; keep existing non-Auth phase-auth behavior and generic namespace 404 unchanged. The later Homarr assembly additionally enforces no other Auth namespace/root catchall and exactly its validated controller descriptors. A non-Auth caller's unrelated routing is not a reason to require an enrollment producer or edit fixtures. No broad compatibility result has been checked here; separately authorized compiler/source gates must reject an unexpectedly wider change, not widen this lease.

**Unusable delivery unwind:** privately discriminate publication registration as `claim-unwind`, `awaiting-first-check`, `checking`, or terminal. After successful atomic claim return it is awaiting-first-check. The first real handle.assertCurrent marks checking **before** any fallible original-bounds check; that check's failure is finished through the stored genuine handle, not the unclaimed method. finishUnclaimedResponsePublication accepts only an actual unclaimed completed record, claim-unwind, or awaiting-first-check delivery fault for the exact original context/Response. It cannot reclaim a checking/returned-body claim. The kernel invokes its first check only after retaining/validating the handle and before attaching abort callbacks/retaining a reader; therefore malformed delivery has no acquired reader or entered publication guard and can be physically discarded and unwound through that required method. After first-check entry, every genuine failure path uses handle.finish. No fabricated replacement handle, public state flag, optional cleanup callback or retry is involved.

Registration/terminal state is the owner's private bookkeeping, **not** a readiness flag or new credential grant. Failure-terminal inputs record what the real kernel physically observed; owner identity checking does not magically verify a caller's claimed cancellation. Actual producer source review and contained physical-drain proof remain mandatory before mounting/behavior acceptance.

## Physical Oracle P1 correction — reserve before handler fulfillment

Coordinator disposition: both amended plan reviews are terminal APPROVE. Physical Oracle `ses_ece745d66ffe8YruU1v89Wrgqk` closes P1 at plan level; lineage reviewer `ses_ece04cd30ffenH0qfet0WLe9YW` explicitly accepts uncapturable/unrecorded admission failures rejecting to the existing kernel sanitized500/499, not unbound controller503. Normally captured405/404 and genuine held503 remain unchanged. Coordinator releases only the exact four dormant producer files and named source-publication handoff, with before-images at `TEMP/nitro-auth-publication-source-n2p1epy2/source-before.json`. No mounting/calls/runtime/native/data authority is released; source freeze/reviews/fresh checks remain mandatory.

**Supersedes the claim-time completion allocation in `:232–234` and the registration-race inquiry in `:280`.** Coordinator reports both Phase 3 plan reviews terminal: Auth-lineage/original-bounds/application binding conditionally APPROVED for the exact four-file producer scope; physical/shutdown Oracle `ece745` WITHHELD on this single P1. Backend4 is now final-frozen, both source axes ACCEPTED and fresh `AUTHHTTP-BACKEND4-1` backend/nitro/owners/focused-lint all zero, as supplied, not rerun here. Targeted frozen MAIN/Auth/controller-contract/selector/cancellation bodies were read to ground this correction. Only this report was appended; no implementation/check/runtime/data/network authority is granted.

### Actual frozen evidence and reconciled stop flags

- `native-main-persistence.ts:79–126` retains actual handler/preflight/executor task settlement, and stores an executor's real fulfilled value **before** resolving its completion. Preserve that canonical IssuerPublicationOutcome/native classification; do not replace it with a body result or infer an unreturned acknowledgment.
- `:90–101,154–156,789–805` has completion-keyed records plus a context WeakMap and strong handler tasks. The record has selection, native released `response`, `mapped` FetchOutcome, failure/publication/retirement fields, but no explicit saved context/bounds, returned-response reservation or retained controller-validation registry. Those additions belong in the prospective **MAIN file**, not assumed existing exports.
- `:834–841` gets original bounds before preflight/execution and retains a released issuer Response; `:851–860` selects the mapped output, possibly cancels that issuer Response and replaces it with bodyless 503. Local 405/404 and held 503 need not be `record.response`. **Reserve `record.mapped.response`, after its final selection, not blindly `record.response`.** The executor settlement remains canonical even if the returned mapped response differs.
- `:861–875` finishes skipped-task bookkeeping before execute fulfills; `runAuthHttpTask:119–121` then resolves handler completion, and `:871–873` removes its strong task. `closeOwnedResources:351–365` presently awaits handlers and proceeds immediately to requests → issuer → helper/native cleanup. Therefore a completion first created at a later application claim misses shutdown's producer boundary.
- `auth.ts:341–370,685–757` records genuine anonymous/authenticated original resolver bounds and retires them on outer disposal. `:374–408,826–833` verifies exact quartet/principal/browser channel and distinguishes admission from retirement-safe publication: **getHttpRequestBounds validates the old association; call it before execution, not after renew/logout.** assertHttpRequestCurrent checks the registered original capture/signals/clocks, not the old lease. `:249–268,859–872` retires captures on actual association release/resource close, not merely when execute returns. This resolves the previous capture-export stop flag for the proposed outer check without authorizing runtime renewal/logout proof.
- MAIN `dispose:398–409` synchronously marks closing and aborts its actual lifetime before starting drains. The producer must join this same lifetime with the already captured request-resource lifetime; waiting until Auth cleanup aborts resources is too late when reservations intentionally hold cleanup.

### Same exact public protocol; one private reservation

Keep the exact previously proposed AuthHttpPublicationHandle, AuthHttpPublicationProducer, terminal discriminants, required enrolled producer, default-disabled compatibility, owner validator and all private-hook/security boundaries unchanged. No extra public API is needed. **Claim attaches a registered handle to an existing reservation; it never creates another terminal completion or strong pending task.** finish and finishUnclaimedResponsePublication settle that same reservation.

The following is the prospective small **MAIN-private** record, not an added contracts/request export or fake grant:

```ts
interface AuthHttpPublicationReservation {
  readonly context: RequestContext;
  readonly response: Response;
  readonly bounds: IssuerOperationBounds;
  readonly lifetime: AbortSignal;
  readonly completion: PromiseWithResolvers<AuthHttpPublicationTerminal>;
  phase:
    | { readonly kind: "reserved" }
    | { readonly kind: "claim-unwind"; readonly error: unknown }
    | {
        readonly kind: "awaiting-first-check";
        readonly handle: AuthHttpPublicationHandle;
      }
    | { readonly kind: "checking"; readonly handle: AuthHttpPublicationHandle }
    | {
        readonly kind: "terminal";
        readonly terminal: AuthHttpPublicationTerminal;
      };
}
```

Attach this reservation to the existing actual AuthHttpRecord; retain its original context and original pre-execution bounds there. Privately associate the final returned Response with that same record/reservation and maintain a strong set of **reservation completion promises**. Keep the existing completion/context WeakMaps and real executor/preflight records. Register the genuine frozen controller on this owner for assertAuthHttpController. Handle WeakMap entries point to the reservation, not a second task. Structural field shape is not runtime provenance; owner/controller/context/Response/handle registration is authoritative.

Capture existing genuine bounds for every potentially returned known-path output **before** any admitted action can renew/logout/invalidate its old lease. The pure finite method/provider selector still precedes body/Core/native work. For local 405/404, use the existing getHttpRequestBounds before any action; do not run native/executor work or fabricate credential acknowledgment. For held/error 503 after preflight/execution, reuse that same saved capture/bounds even if currentness has since failed: the reservation permits physical abandonment, not permission to publish after expiry. No getter after execution, new deadline, old-lease lookup, principal clone, ApiKey fallback or new capture API.

**Exact admission-edge stop condition:** the frozen `:787–788` shortcut can return an unrecorded bodyless 503 for closing/non-ready/repeated context, and failures before the bounds capture can reach `:859`. Neither is evidence of original bounds or a registered handler output. In the proposed producer cut, do not hand a selected Auth Response from those branches to the enrolled kernel without a real record/reservation. If genuine bounds cannot be captured before action, fail the handler without returning an Auth controller Response; the existing kernel owns its sanitized failure/disposal, with no invented native result or reservation. Repeated context cannot allocate a replacement record/response/reservation. This is a fail-closed producer-delivery requirement, not a new principal/admission rule. **Flag for Oracle:** sanitization/HTTP behavior at these already-unavailable admission edges may differ from today's unregistered controller 503; it is not silently covered by the earlier lineage approval. If preservation of that exact 503 while lacking genuine bounds is required, keep HOLD rather than authorize a fake capture or extra Auth export. All normally captured local/held outputs retain their finite mapping.

### Minimal reservation point, outside fallback/remapping

For the actual response that will leave a registered handler, the ordering is:

1. Register the real handler task/context record before deferred forwarding as today, and save the genuine original bounds before preflight/execution. Retain the actual underlying native executor result and all cancellation failures privately.
2. Choose the final mapped Response. Complete original finite checks, skipped preflight/executor bookkeeping and **all owner-side physical cleanup for discarded outputs**. If an issuer Response was withheld/cancelled and mapped to 503, finish that cleanup first; the final 503 is the only response to reserve. Unknown-path pass has no returned Response reservation and remains unmounted by exact descriptors.
3. **After that final choice/checks/physical handler cleanup, but before `record.handler.completion.resolve(finalMappedOutcome)`**, allocate exactly one terminal deferred and attach its reservation to the actual record/final returned Response with the saved bounds/lifetime. Add its completion to the strong reservation set before any callback, abort listener or reentry can observe the handoff. Freeze/capture lifecycle objects before observation. No reservation currentness guard can manufacture admission; expired/closing captured output may only proceed to kernel abandonment.
4. Only after successful registration may the handler fulfill with that exact final mapped Response. The handler does **not** await the reservation/body/request disposal. Native/preflight/handler completion remains independent of outer publication. The reservation outlives strong handler removal, whether still unclaimed, claim-unwind or claimed.

The narrow source location is the **handler-only finalization wrapper around execute**, after execute's existing catch/finally has produced its final mapping and completed its cleanup, and before the handler task's existing fulfillment resolver. Do not put reservation creation inside the existing catch's remapping region, or alter generic runAuthHttpTask for preflight/executor calls. Otherwise reservation failure could be swallowed into another response and another reservation, or inadvertently change native-result retention. A handler-specific wrapper in this same MAIN file suffices; no new module/API/framework is requested.

There is **never** an early reservation for the native Response followed by an unregistered replacement 503. If a later pre-handoff fault makes the final choice unusable, retain that exact fault and physically cancel/drain the currently owned final output, settle its one existing partial/reserved completion as abandonment/failure, and reject handler delivery. Do not manufacture a second returned response, retry execution or transfer an already settled reservation to another response. This rule avoids orphaning the first reservation during remapping.

### Registration failure before handoff is owner-owned cleanup

If deferred/record/WeakMap/strong-set registration fails before handler fulfillment, retain any partial reservation and primary error in that real handler record. **Do not return an unregistered Response**, and do not rely solely on a future finishUnclaimed call: the application may never receive the original Response.

The handler-specific finalization failure path must, while that output is genuinely still owned before handoff, use the existing registered cancellation helper/task discipline to physically cancel/drain the **final mapped output** (not only a stale native `record.response`), await all acquired work/lock release, preserve the original and cancellation/settlement errors, and settle any allocated reservation completion with the matching non-published terminal. Then reject/finish handler failure. This is the existing owner cancellation responsibility extended to the actual still-owned final response, not a second reader after handoff. A bodyless output requires no invented cancel/native task. If no deferred was allocated, record the real failure without inventing a completion.

Any partial promise that entered the strong set is settled before this failure handler ends; none is deleted unrecorded, resolved as published or orphaned awaiting a kernel that never received it. Canonical executor/native outcome is unchanged. Actual cancellation/cleanup rejection stays in private failure aggregation; handler rejection and later close cannot present it as a successful publication merely because pending promises have settled. No new response fallback/retry occurs after reservation failure.

### Claim/unclaimed finish consume that already-existing reservation

- Claim verifies this exact controller, original context/final Response, physically fulfilled real handler, reservation registration and phase. It prepares/freezes one handle and binds it to that reservation's WeakMap entry. It does **not** allocate another deferred, extend bounds or add work after close's reservation snapshot.
- If handle attachment fails, keep the same reservation in claim-unwind with its real error. Application already owns the original output before claim; it physically discards/drains and calls required finishUnclaimedResponsePublication, which settles that same existing reservation. No replacement task or fake successful guard is created.
- If owner lifetime has aborted/currentness has ended **after handoff was committed**, the kernel may still claim this genuine existing unclaimed reservation **only for abandonment**. Immutable owner/record identity validation remains; publication currentness fails. Store the handle before the first check/listener can reenter, then discard/drain and finish through it. Finishing remains usable after abort; no constructor/readiness/credential admission is reopened.
- Unclaimed finish handles the same reserved/claim-unwind/unusable-before-first-check record after real physical discard. It cannot finish checking/handed-to-consumer work, reclaim another caller's lock or resolve published. Claimed finish retains the existing first-terminal identity/idempotence rules and records terminal before request disposal. Neither method waits on its completion, MAIN.close, handler or outer onDispose.
- MAIN does **not** read/cancel the reserved Response on close merely because it is unclaimed. Once handler delivery transfers response ownership, only the genuine kernel's existing reader/cancel path settles it. The producer's close waits its already registered reservation. The actual awaited route.handle continuation, not a newly invented deferred-after-close callback, performs claim/discard/finish. A kernel that never consumes an admitted handoff cannot be called safely closed by silently dropping the reservation.

### Exact close ordering and late-handler coverage

At MAIN.dispose, keep existing synchronous closing/admission denial and actual lifetime.abort. Drain genuine initializations/operations/fixed work as already required, then:

1. **Await the actual Auth HTTP handler completions** registered before close. Since new handler admission is closed first, no fresh legitimate handler can begin. Existing handlers may still finish mapping/cancellation and register their final reservations while this drain waits.
2. **Only after handler completion drain**, snapshot/drain the strong publication reservations. Every successful handler response registered its reservation before its completion resolved; every pre-handoff registration failure settled its partial reservation before failing the handler. Thus the post-handler reservation snapshot includes all still-pending handoffs, including ones produced during handler shutdown. Claim merely attaches and cannot create an unseen future promise.
3. Retain terminal failure classifications/cancellation errors in private cleanup accounting, not just Promise.allSettled fulfillment. Then, and only then, run existing Auth requests → issuer → helper/native cleanup. Preserve primary plus cleanup errors and real nativeOutcome on failure. Any reservation left pending prevents claiming Auth cleanup/closed success.

The kernel's publication signal must include the **same actual MAIN lifetime** already captured in the reservation, alongside request/application and genuine request-resource lifetime. If close wins before kernel registration, its first check sees the already aborted signal and abandons; if it wins after registration, the existing bodyloop abort listener physically finishes even an unpulled body. This is an existing owner abort, **not** a deadline timer or a proactive idle-deadline guarantee. MAIN creates no competing reader, byte buffer, stream or delayed publication callback to paper over the race.

Publication terminal is recorded after physical reader/cancel/check settlement and before outer onDispose as previously specified. No handler/executor/reservation recorder waits for request disposal; request-resource retirement callbacks do not await the task they retire; MAIN.close only waits the separate terminal reservation, whose synchronous finish does not await close or itself. Application active/cleanup accounting remains independent. These rules remove the close-versus-late-claim race without creating a handler→publication→disposal→handler/close cycle.

### Rereview boundary and material-change flags

The exact four producer files remain contribution.ts, application.ts, and runtime-composition/{contracts.ts,native-main-persistence.ts}; request.ts/private hook, Auth capture exports, selector, origin guards and the later two-file mounting cut are unchanged. The public typed protocol/provenance/required enrolled producer stays as conditionally reviewed. The **material physical correction** is ownership/time of completion allocation: final-response reservation **before handler resolve**, handler-then-reservation close drain, and producer-owned pre-handoff registration-failure cleanup. These replace the withheld claim-time allocation; physical Oracle must explicitly rereview them. The unavailable/unrecorded-response edge described above is additionally flagged for lineage/sanitization reconciliation; do not infer blanket approval of that behavioral edge from unchanged type signatures.

This append is ready for bounded physical Oracle rereview, not acceptance/source release. Earlier Auth-lineage approval can stand for its unchanged types/capture/identity/control boundary, subject to the flagged admission-edge reconciliation. Future writer still needs separate producer authorization, frozen source review/fresh required checks, then separate runtime.ts/assembly.ts enrollment and independently authorized contained runtime/native/adoption/App/K/data/network proof. No check run, source allocation, mounting, production readiness or adoption hold is cleared here.

**Concrete ownership-marker reconciliation:** frozen MAIN sets `record.publication = "handed-off"` at `:853` before execute finally/handler resolution, while cancelOutputAsync `:770` skips cancellation for that marker. In the prospective cut, that marker must not suppress producer cleanup of an output whose reservation registration failed **before actual handler delivery**. Defer the real Response ownership-transfer marker to the successful reserved handler fulfillment boundary; retain the final mapped response as still owner-owned until then. Pre-handoff failure uses the existing physical cancellation helper on that exact final response with registered task/error retention. After fulfillment the owner must never reacquire/cancel it; kernel claim/discard/finish alone settles its existing reservation. No new public flag/API or competing post-handoff reader is introduced.
