# AUTHHTTP Backend4 — conditional dormant consumer contract

**Allocation: `apps/backend/src/server/runtime-composition/{contracts.ts,auth.ts,native-main-persistence.ts,auth-http.ts}` only; the first three exist, auth-http.ts is prospective. No source-author release.** Only this report was created. The enrollment report remains unchanged. Auth repair is the sole active writer of production-sessions/service.ts and sql-persistence.ts: neither body nor imports reached through those bodies were inspected here. No commands/checks/tests/hash helpers/evaluation, native SQL, configuration/env/data/secrets, nested agents, comments/casts, dependencies or framework work occurred.

Coordinator premises, not reproduced checks: Auth5 original reviews HOLD on three unique P2 findings plus four typing/two lint failures; both bounded two-file repair plans approved, author repair ACTIVE. D2 both source axes/helper follow-up accepted, shared checks still red pending Auth repair. **Backend4 cannot receive a source lease until final Auth freeze, independent reviews and fresh required checks are all zero.** No Auth/Backend source acceptance or runtime/native/adoption/App/data authority is inferred from this plan.

## Stable evidence and exact boundary

- Enrollment plan `:114–139,155–163,207,209` supplies the dormant four-file seam, repaired method table and prerequisite → Native6 → Auth5 → Backend4 gates. Its older controller-side form/envelope suggestions are superseded by issuer-owned legacy Core preparation.
- Stable `packages/auth/nitro/production-sessions/persistence.ts:166–230` defines eight LegacyIssuerHttpAction members, includes them in PreparedIssuerOperation.kind/IssuerHttpAction, and defines IssuerPublicationOutcome. `index.ts:16–23` actually exports those types. Its service/SQL re-exports were not followed. The method body and inferred ProductionSqlSessionIssuer implementation remain unverified during repair; the required frozen method contract is below, not a claim about mutable source.
- `auth.ts:175–180,270–282,520–598,658–680` owns authenticated principal associations, exact outer-context checks and resolver admission. Anonymous resolution currently retains **no** association. `native-main-persistence.ts:476–588` constructs/retains the genuine issuer and request resources once; `:591–637` supplies the existing same-MAIN fixed-write constructor join.
- Task patterns: `native-main-persistence.ts:166–208` registers completion records before deferred invocation; `fixed-write-rpc.ts:18–79,113–144,188–329` separates underlying/output/cancellation outcomes; `authenticated-rpc.ts:41–98,101–168` shows physical stream settlement but its preparation binds the old authenticated lease. Copy neither its lease-dependent publication guard nor its new timer into Auth HTTP.
- Actual `@homarr/contracts/request` RequestContext has request/requestId/signal/principal/onDispose and onPrivateResponsePublication; principal is anonymous or authenticated **subject**, not a supplied user/lease. Actual `@homarr/contracts/contribution` FetchOutcome is only pass or response. Existing Backend dependencies already include Auth/contracts; no manifest change.

Never edit runtime.ts, assembly.ts, compose.ts, application.ts, startup, barrels, host wiring, UI/renderers or the existing RPC implementations. The returned controller has no route descriptors, readiness hook, mounting side effect or new listener. Future Phase 3 enrollment is a separate held lease.

## Prospective signatures and imports

In contracts.ts add internal construction/controller types:

```ts
interface AuthHttpConstructionInput {
  readonly baseUrl: PublicBackendInput["baseUrl"];
  readonly basePath: "";
  readonly maximumResponseBytes: number;
}

interface AuthHttpController {
  handle(context: RequestContext): Promise<FetchOutcome>;
}
```

Add to the real AuthenticatedRequestResources result in auth.ts:

```ts
getHttpRequestBounds(context: RequestContext): IssuerOperationBounds
admitHttpRequestAsync(context: RequestContext): Promise<void>
assertHttpRequestCurrent(context: RequestContext): void
```

Add to the genuine MAIN result in native-main-persistence.ts:

```ts
createAuthHttpController(input: AuthHttpConstructionInput): AuthHttpController
```

MAIN privately invokes its retained issuer's required frozen interface **`executeHttpAsync(request: Request, kind: IssuerHttpAction, bounds: IssuerOperationBounds, maximumResponseBytes: number): Promise<IssuerPublicationOutcome>`**. Controller selection is strictly LegacyIssuerHttpAction; no direct renew/logout/credentials/ldap/oidc kind can enter this consumer. The public outcome's broader kind/output union is checked, not cast or silently narrowed. Type imports come from `@homarr/auth/nitro/production-sessions`, `@homarr/contracts/request`, `@homarr/contracts/contribution` and local contracts. Derive private executor argument/result types from ProductionSqlSessionIssuer's frozen method where appropriate; no authored shadow issuer interface pretending the repair compiled.

**Authority stays in MAIN:** create the frozen controller.handle closure there over the actual issuer/requests/runtime and registered work. New auth-http.ts owns its finite selector, pure legacy-outcome classification and physical abandoned-response cancellation helper; it does not accept a caller-supplied issuer, native database, arbitrary execute/currentness/readiness callback or structural authority object. These helpers are internal modules, not barrel exports/public publishers. contracts.ts describes shape, not an authority credential. No optional replacement resources or second factory for an imitation issuer.

## auth.ts: original outer association, not another principal authority

At the existing resolver's sole operation creation (`:538–544`), retain a private HTTP capture for each **actual returned frozen principal**, anonymous or authenticated. Store the exact captured Request/requestId/signal/onDispose quartet, original frozen resolver operation, private resource lifetime, original credential channel (ApiKey header present versus cookie/none), effective deadline, associated authenticated record when present, and HTTP claimed/retired state. Keep this separately in an owner-local WeakMap keyed by that principal, with active captures retained for close/retirement. Do not substitute a clone, public context/user structure or new principal resolver.

For anonymous, save that original operation/deadline instead of discarding it at `:558–561`; register disposal retirement before returning and reject reentrant disposal/failed registration. For authenticated, use the exact association.operation signal/deadline after its existing stored hostDeadlineAt clamp (`:564–588`), while retaining the original operation for provenance. Bounds.lifetime is the captured resource lifetime, **not old lease.lifetime**. Preserve existing principal/read/fixed-write behavior; capture publication retirement is tied to outer disposal/resource close, not issuer scope teardown or successful session invalidation.

getHttpRequestBounds validates owner registration, exact returned principal and quartet, channel, open/retired state, saved finite deadline, original signal/request/resource lifetime and both configured/wall clocks. Before dispatch an authenticated capture must still match its real association and not already be releasing/invalidated. Return the saved signal/lifetime/deadline; never recompute now + requestDeadlineMs, extend to renewed expiry or create a fresh timer. API-key captures are rejected even when API-key admission returned anonymous; presence of ApiKey cannot be turned into fake anonymous browser admission.

admitHttpRequestAsync claims once, retaining its actual preflight task in Auth's pending set before forwarding. For authenticated browser captures, verify the real opaque-session lease is current using its original association.operation; after the await repeat exact capture/association/clock checks. Reject API-key leases/channels, stale authenticated leases, changed/releasing associations and failed admission. No catch-to-anonymous path. Genuine resolver anonymous is **not** proof of missing versus expired session or a ready credential domain: only the issuer's accepted observation/expiry producer may classify that. No credential-domain read/adoption workaround is introduced in Backend.

assertHttpRequestCurrent is the post-execution publication check: validate the same HTTP capture/quartet, retirement, original signals/lifetime, saved effective deadline and MAIN ownership, but **do not** call associationFor/getRequestLeaseAsync/readUser/old lease.assertCurrentAsync. Renewal/logout can legitimately retire that old lease. It never grants permission or substitutes for issuer settlement. Outer onDispose marks captures retired synchronously; resource close retires all captures and aborts their existing lifetime. Cleanup registration must not await the HTTP task it retires; keep HTTP task drains in MAIN, not a self-dependent old-lease release obligation.

## MAIN constructor: exact retained owner join

Mirror `createFixedWriteRpc:591–618`, adding an exclusive synchronous construction claim before any possible reentry. Require ready/current MAIN (`assertCurrent`, initialized helper/epoch, un-aborted startup/owner lifetime), completed Auth construction with **authConstructionResult === authRequests**, retained authIssuer, acquired runtime.engine === sqlite, and no started auth-requests/auth-issuer cleanup. Capture those exact identities once. Every request/preflight/last check revalidates the same retained identities and request resource lifetime/HTTP capture; no reopening, read-style wrapper, second SQL owner or async readiness flag. A failed/duplicate constructor claim is not automatically retried.

Capture and validate input once: basePath exactly empty; baseUrl a concrete canonical HTTP(S) origin without credentials/path/query/hash, exactly requests.configuration.externalOrigin and issuer.requestConfiguration.externalOrigin; positive safe explicit maximumResponseBytes within the accepted issuer budget contract. Use captured requests.configuration.providers, cookies, now and request deadline; validate their existing pinned agreement with issuer configuration, not caller-provided replacements. Body budget/native SQL bounds remain inside the issuer's existing frozen construction; controller does not receive a native handle or parse forms. Construction does not test or adopt a credential domain. Hold actual file-backed adoption exactly as before.

## Finite selector: eight actions, original Request

| Exact pathname                             | Methods / wrong-method Allow | Legacy action / provider condition         |
| ------------------------------------------ | ---------------------------- | ------------------------------------------ |
| `/api/auth/providers`                      | GET / GET                    | legacy-providers                           |
| `/api/auth/csrf`                           | GET / GET                    | legacy-csrf                                |
| `/api/auth/signin` without provider suffix | GET / GET                    | legacy-signin                              |
| `/api/auth/callback/credentials`           | POST / POST                  | legacy-credentials, credentials configured |
| `/api/auth/callback/ldap`                  | POST / POST                  | legacy-ldap, ldap configured               |
| `/api/auth/signin/oidc`                    | **POST only / POST**         | legacy-oidc, oidc configured               |
| `/api/auth/callback/oidc`                  | GET, POST / GET, POST        | legacy-oidc, oidc configured               |
| `/api/auth/session`                        | GET, POST / GET, POST        | legacy-session                             |
| `/api/auth/signout`                        | POST / POST                  | legacy-signout                             |

Unknown pathname → pass, never an arbitrary Core action or namespace match. No suffix/trailing-slash/encoded-provider normalization; query and callback fields stay on the original Request. Known wrong method → bodyless 405 with exact Allow **before body reading, Core preparation or native action**; specifically GET OIDC signin is not a handshake and is never converted to POST. Method selection precedes provider gating. For a correct method on a disabled provider, return bodyless **404**, no executor/body/native work; no fake default provider or fallthrough to another provider. Non-provider metadata/session/signout are not disabled merely because OIDC is absent. For admitted actions, pass the exact original Request object once, saved original bounds and captured response budget to the genuine issuer. Backend neither instantiates Core nor rewrites CSRF/forms/cookies/return-redirect envelopes.

## Completion ownership, output and shutdown

For each known request, MAIN registers a completion-keyed private record and adds its complete handler task to a strong pending set **before** callbacks/abort registration/deferred forwarding can reenter. Tie it to the exact capture/context/selected action and reject repeated handle/dispatch consumption. Keep discriminated executor state (not-forwarded/pending/fulfilled actual outcome/rejected), returned response ownership, mapping/currentness failure and physical cancellation outcome separate. Do not use `registerOperation:136–163`: it loses the original outcome behind a post-currentness check and removes its task before that check. Follow fixed-task registration discipline, not its early pending deletion for a complete HTTP handler.

Before invoking issuer.executeHttpAsync, complete real Auth HTTP admission and final owner/bounds checks. Retain the **actual underlying executor promise** and its canonical returned IssuerPublicationOutcome immediately on fulfillment, before any mapping, response inspection, cancellation or currentness check. Retain outcome.kind/settlement/held state/criticalStage privately unchanged. Backend cannot observe a hidden native acknowledgment and must not invent one: confirmed/ambiguous producer classifications come only from that returned outcome. Later controller failure is recorded alongside it, never overwriting a confirmed commit into bad-password/rollback/not-dispatched or launching a retry.

Mapping, after checking outcome.kind equals selected Legacy action:

- released + output.type=response → the **same finite Response object**, unchanged status/statusText/body/Location/multiple Set-Cookie headers. No clone, byte drain/reconstruction, reserialization of `{url}`, extra cookie effect or forced stored/browser expiry equality. Finite auth/budget proof is the frozen accepted producer's responsibility; before that proof is accepted this consumer remains unallocatable.
- held → bodyless sanitized 503, no profile/cookie/raw error; never null 200, credential rejection or rollback. Preserve distinctions privately.
- rejected-verification or released session-cookie-expiry → legacy contract mismatch, sanitized 503; direct-P1 mappings are not part of this controller. Mismatched kind likewise fails closed. If an unexpected released response exists, retain and physically cancel it before returning failure.

For abandoned/withheld released responses, register a cancellation record before invoking cancellation, keep the handler pending, await actual cancellation/reader closure and release any acquired lock. The helper neither competes with a locked/bodyUsed response nor creates an untracked background cancellation; unexpected locked/consumed output is a retained producer/cleanup contract fault. Retain cancellation rejection privately; no raw reason on the wire. No extra body parser/finite-response serializer is needed. Successfully returned output is explicitly handed to the outer transport; do not cancel or await its body/outer disposal to finish the controller task.

The final synchronous check uses captured original request/publication bounds and exact MAIN/capture identities. If it fails, cancel/drain any retained released response first, then finish sanitized failure. No renewed deadline, new timer, old-lease re-read or fresh permission check following successful renew/logout/scope close. Do not register anonymous responses through onPrivateResponsePublication or reuse the RPC guard requiring the retired old lease. **This four-file contract stops at finite controller handoff:** the earlier enrollment report `:137` already records that P1 does not expose an outer-body publication guard. Requiring a stronger through-outer-body guarantee needs a separately approved publication/transport producer; do not fabricate one or edit application.ts to force readiness here. That remains a Phase 3 enrollment prerequisite, not a claimed Backend4 guarantee.

Task leaves the strong pending set only after underlying execution, mapping/last checks and every abandoned-response cancellation have physically settled. At MAIN close, reject new admission/constructor use first via the existing owner lifetime; then drain registered HTTP handler/executor/cancellation tasks alongside existing work **before** auth-requests → auth-issuer → helper (or proxy/runtime fallback) cleanup (`native-main-persistence.ts:286–330`). Already registered tasks must still finish/cancel after close makes currentness false. No task awaits MAIN.dispose/close, outer onDispose, body publication, or its own completion. No resource-release callback waits on the consuming HTTP task; no publication/shutdown cycle.

## Exact missing seams and release decision

### Coordinator prerequisite reconciliation

Both Backend4 plan axes are terminal APPROVE: Auth-request capture/selector/client-wire and MAIN ownership/completion/outcomes/physical shutdown. Coordinator releases the exact dormant four-file source boundary only, with before-images at `TEMP/nitro-auth-backend4-source-bmoj5j5l/source-before.json`; prospective auth-http.ts was confirmed absent. Auth5/Native6/K4/D2 accepted pins reauthenticated unchanged. No route registration, controller invocation, outer-body guard, mounting, native/runtime/data action or production admission is released.

The initial active-Auth premises above are historical. Auth repair is now frozen; both Core/wire and native-publication repair reviews returned SOURCE ACCEPT, and fresh `D2-AUTHHTTP-LEGACY5-2` backend/nitro/owners/focusedlint all exited0. Auth3 companions and accepted Native6/K4/D2 pins remain unchanged. D2's two source axes and iterator follow-up also accepted. No client/native/runtime/adoption behavior is thereby proven.

The actual frozen producer signature at `sql-persistence.ts:751–756` is `executeHttpAsync(request: Request, kind: IssuerHttpAction, inputBounds: IssuerOperationBounds, maximumResponseBytes: number): Promise<IssuerPublicationOutcome>`, retained on the genuine owner at `service.ts:1305–1319`. Its response budget is a positive safe integer bounded by both `node:buffer` maximum length constants. `apps/backend/package.json` already declares Auth/contracts/common and the existing dependencies; no package change is needed. These prerequisites are recorded before independent Backend plan review, not a controller source lease or mounting approval.

All currently missing **Backend** producers fit the four-file lease: (1) anonymous+authenticated owner HTTP capture/bounds, asynchronous preflight and retirement-safe last check in auth.ts; (2) internal input/controller types and actual Legacy narrowing in contracts.ts; (3) genuine same-MAIN dormant constructor, completion records/pending drains and handle closure in native-main-persistence.ts; (4) finite path/method/provider selector, outcome classifier and physical abandoned-response cancellation in new auth-http.ts. No extra Auth export is currently missing for the action/outcome/bounds types; stable index/persistence already supply them. The repaired issuer's exact execute method, all finite legacy output proofs and independent fresh typing/lint zero remain **unverified producer prerequisites**, not assumed from an export or supplied repaired-plan approval.

**Oracle-ready recommendation: approve this bounded dormant Backend4 plan only conditionally; keep source frozen until the active Auth repair is final-frozen, independently accepted and required fresh checks zero, then separately authorize these four files.** No tests/source/comments/casts/dependencies were created here. Public anonymous RPC membership remains exactly the existing two settings leaves. No Auth/Core/native/adoption/mounting/runtime/App/data acceptance, file-provenance workaround, new endpoint/secret/crypto/schema, default or permission authority follows. Preserve data/accounts/hashes/grants and the target of ordinary portable self-hosting in one artifact/listener; no mandatory Docker/Cloudflare/tunnel or UI redesign. Unrelated D2/comparator/compiler/metadata lanes remain independent.
