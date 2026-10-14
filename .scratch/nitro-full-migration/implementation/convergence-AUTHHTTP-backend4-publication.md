# AUTHHTTP Backend4 — source publication / freeze

**Authored and frozen for coordinator fresh checks and two independent source reviews; no source acceptance claimed.** Exact source allocation:

1. `apps/backend/src/server/runtime-composition/contracts.ts` — AuthHttpConstructionInput / AuthHttpController types.
2. `apps/backend/src/server/runtime-composition/auth.ts` — owner-private HTTP captures, original bounds, one-shot preflight and retirement-safe last check.
3. `apps/backend/src/server/runtime-composition/native-main-persistence.ts` — exclusive dormant constructor, genuine owner closure, completion/outcome/cancellation records and shutdown drain.
4. `apps/backend/src/server/runtime-composition/auth-http.ts` — new internal finite selector, legacy outcome classifier and abandoned-response cancellation helper.

Only these four source files and this new publication report were written. The existing plans were not changed. Supplied before-image artifact: `TEMP/nitro-auth-backend4-source-bmoj5j5l/source-before.json`; prior absence of auth-http.ts was also confirmed by a targeted read. No before-image/hash comparison or commands/checks/lint/typecheck/tests/build/evaluation/native SQL/configuration/env/data/secrets/nested agents occurred. No comments, casts, any, non-null assertions, dependencies, framework or tests were added. Common's public helper inventory and relevant behavior were inspected first; its bounded JSON reader is not an unchanged-response cancellation utility and was not imported.

Coordinator supplied the two scoped plan approvals, Auth5 repair both source axes ACCEPT plus fresh `D2-AUTHHTTP-LEGACY5-2` Backend/Nitro/owners/focused-lint all zero, and D2 both axes/helper acceptance. Those are prerequisites supplied for this source lease, not checks repeated or new acceptance established here. Frozen issuer method/retained factory slices were read; Auth/DB sources were not changed.

## Actual signatures and dormant boundary

```ts
createAuthHttpController(input: AuthHttpConstructionInput): AuthHttpController
getHttpRequestBounds(context: RequestContext): IssuerOperationBounds
admitHttpRequestAsync(context: RequestContext): Promise<void>
assertHttpRequestCurrent(context: RequestContext): void
```

AuthHttpConstructionInput is exactly `{baseUrl: PublicBackendInput["baseUrl"], basePath: "", maximumResponseBytes: number}`. The returned frozen controller exposes only `handle(context: RequestContext): Promise<FetchOutcome>`. MAIN's private closure calls its retained genuine issuer's `executeHttpAsync(originalRequest, selectedLegacyAction, savedBounds, capturedMaximumResponseBytes)` once. IssuerHttpAction is the existing broader producer union; the selector accepts only actual exported LegacyIssuerHttpAction members. No caller-supplied issuer/execute/readiness/SQL/lease capability or second public controller factory exists.

No constructor invocation, route descriptor or mounting was added. runtime.ts, assembly.ts, compose.ts, application.ts, startup, barrels/host, UI/renderers, RPC files, Auth modules, DB, manifests and package exports remain outside the lease and untouched.

## Exact nine paths / eight legacy actions

| Path                             | Allowed methods / Allow on 405 | Action / configured provider          |
| -------------------------------- | ------------------------------ | ------------------------------------- |
| `/api/auth/providers`            | GET                            | legacy-providers                      |
| `/api/auth/csrf`                 | GET                            | legacy-csrf                           |
| `/api/auth/signin`               | GET                            | legacy-signin, providerless path only |
| `/api/auth/callback/credentials` | POST                           | legacy-credentials / credentials      |
| `/api/auth/callback/ldap`        | POST                           | legacy-ldap / ldap                    |
| `/api/auth/signin/oidc`          | **POST only**                  | legacy-oidc / oidc                    |
| `/api/auth/callback/oidc`        | GET, POST                      | legacy-oidc / oidc                    |
| `/api/auth/session`              | GET, POST                      | legacy-session                        |
| `/api/auth/signout`              | POST                           | legacy-signout                        |

The finite selector checks wrong method before provider availability: bodyless 405 with exact Allow, including GET OIDC initiation → Allow POST, without body/Core/native invocation. A correct method for a disabled provider produces bodyless 404. Unknown paths pass. Owned-context/currentness failures remain sanitized failures, not fabricated anonymous admission. Backend never reads/reconstructs forms, instantiates Core, converts GET to POST, rewrites headers/CSRF/cookies or serializes redirect envelopes.

## Owner / lifetime / outcome invariants

- The actual frozen anonymous and authenticated resolver principals receive private captures of the exact Request/requestId/signal/onDispose quartet, original resolver operation, saved effective deadline, credential channel and private Auth resource lifetime. Anonymous keeps the original deadline; authenticated keeps the existing stored-expiry clamp. Bounds use the original operation signal and private lifetime, not old lease.lifetime; no new timer or now-plus-timeout calculation was added.
- Capture registration publishes ownership before onDispose registration. Immediate callback, failed registration and owner close retire it; authenticated association release retires its HTTP capture before release work. API-key-present resolution is rejected for HTTP even if anonymous; a currently added ApiKey header is also rejected. Forged principals/quartets, stale/releasing authenticated associations and failed preflight cannot become anonymous.
- Preflight context/capture consumption is single-shot. Its completion/pending record is registered before deferred native lease currentness checking, using the original association signal/deadline only before issuer execution. Post-execution checking validates the same outer capture, original signals/lifetime/deadline and MAIN identities; it never reads/asserts the retired old lease or profile after renew/logout/issuer scope cleanup. Genuine anonymous resolution does not prove session absence or domain readiness; that remains issuer-owned observation authority.
- MAIN claims constructor ownership before input getters/currentness can reenter. It requires ready helper/epoch, the acquired SQLite runtime, authConstructionResult === authRequests, retained issuer and no Auth cleanup; every request repeats identity/lifetime checks. Canonical concrete HTTP(S) origin/empty host basePath and providers/cookies/clock agreement are checked. The explicit positive safe response budget is bounded by node:buffer MAX_LENGTH and MAX_STRING_LENGTH. No default secret, adoption attempt or additional SQL owner is introduced.
- Completion-keyed records and the strong complete-handler pending set are published before request getters/disposal/deferred execution can reenter. Preflight and executor underlying promises/settlements remain separate. The actual fulfilled IssuerPublicationOutcome is retained before output mapping/currentness/cancellation errors; its confirmed/ambiguous/held classification is never overwritten or converted into rollback/password rejection. No automatic retry or lossy registerOperation wrapper is used.
- Matching legacy released/type=response hands off the **same finite Response object**, preserving body/status/statusText/Location/multiple cookies. Held produces bodyless 503. Direct-P1 verification/expiry outputs or mismatched kind are contract failures, bodyless 503; unexpected released responses are retained and canceled, never treated as legacy success or held-to-null. Raw producer/fault contents stay private.

## Physical cancellation / close / handoff

Abandoned-response cancellation gets its own registered completion/outcome record before invocation. It awaits actual reader cancellation and reader.closed, then releases the lock. Unexpected bodyUsed/locked output is a retained cleanup fault, not a competing/untracked consumer; cancellation rejection is retained and propagates into MAIN cleanup failure. Complete handler work stays strongly pending until execution, mapping/final checks and abandoned-response cancellation settlement finish; skipped tasks are explicitly settled without invocation.

MAIN close stops new admission through existing state/lifetime, drains registered HTTP work before Auth requests → issuer → helper/native cleanup, and lets already registered jobs finish/fail/cancel despite closed currentness. There is no await on MAIN.close, outer onDispose/publication/body, or a task's own completion. Successful output is explicitly marked handed-off and is neither canceled nor body/disposal-awaited by the controller.

**The four-file guarantee ends at the last original-bounds/current-owner check and finite controller handoff.** Through-outer-body publication requires its separately held Phase 3 publication/transport producer; no anonymous onPrivateResponsePublication hack, old RPC lease guard or application edit was added. Mounting, native execution/adoption, file provenance, K validator, boot/App/runtime/production-data acceptance remain held. No claim of functioning client or product-data acceptance follows from this source publication. The ordinary portable one-artifact/listener target and preservation of accounts/hashes/grants/data remain unchanged.
