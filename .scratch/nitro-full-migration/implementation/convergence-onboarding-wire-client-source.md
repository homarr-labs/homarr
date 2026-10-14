# Onboarding wire F4 — four-file preparatory source freeze

## Outcome and scope

**F4's constructed browser transports are authored and frozen for coordinator checks and independent SDK/security/lifecycle review. Not SOURCE ACCEPT, installed onboarding, browser/runtime proof or activation.** The compatibility plan, installer plan and controlling `convergence-onboarding-wire-client-local-settlement-amendment.md` govern. Coordinator supplies their independent PLAN APPROVE and accepted frozen A/B/DB/C/D/E prerequisites; `824yfw0d` and the earlier `basprbah`/`34aum_8k` remain prerequisite generations, not checks of these F bytes.

Exactly four product paths changed:

1. NEW `apps/nitro/src/client/onboarding-writes.ts`
2. `apps/nitro/src/features/onboarding/claim.ts`
3. `apps/nitro/src/features/onboarding/types.ts`
4. `apps/nitro/src/features/onboarding/index.ts`

All root/router/studio/account/Query/navigation/read/projection/source UI/SSR/route/manifest/schema/backend/Auth/API/DB files remain protected. No constructor is called by an app entry or route, and no accountActions/claimTransport/environment/readiness flag is enabled.

## Actual public preparation surface

| Export                                                | Actual responsibility                                                                                                                                                                                                  |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createOnboardingCsrfOwner(lifetime)`                 | Captures genuine browser origin and caller-supplied root AbortSignal; creates one private cache/generation/task/drain owner. Construction sends nothing.                                                               |
| `createOwnerBoundOnboardingClaim(owner)`              | Requires the actual constructed owner and returns a separate `(signal) => Promise<ClaimResult>` callable using real GET CSRF and one claim POST.                                                                       |
| `createOnboardingWriteBrowserClient(endpoint, owner)` | Requires that same actual owner, browser-only same-origin exact `/rpc` and creates real RPCLink/createORPCClient with server-derived OnboardingWriteClient.                                                            |
| `createOnboardingWriteQueryUtils(client)`             | Exposes generated root `.key()` and the three generated mutationOptions/mutationKey pairs only; retry is forced false and custom mutation keys reject. No query/input-key surface is exposed.                          |
| `createOnboardingClient(reads, writes)`               | Explicitly composes the supplied currentStep/capability/discovery/testIntegration method references and actual generated nextStep/user/group writes. It does not generate a fictional mounted read client from a link. |

`OnboardingClient` user/group and nextStep members derive from the types-only `@homarr/api/nitro/assembly/onboarding-writes` export. Read methods remain a structural consumed seam for actual supplied references, not evidence of mounted resources. There is no completeSetup member, fake handler, broad router, no-op environment or source presentation replacement. Existing OnboardingProps/component/navigation signatures and hold copy are unchanged.

## Frozen callable compatibility and actual claim mapping

The existing **`claimOnboarding(signal)` function body is byte-preserved** and still exported from claim.ts. Frozen studio still imports/calls that old uninstalled function; it has **not** been silently changed to a default owner, stub, fallback or module singleton. Its historical POST behavior is not claimed as CSRF integration. The separately reviewed studio/root caller lease is still required to inject the new bound callable.

The new callable parses the actual frozen C mapping: 200 issued/active with positive safe future expiry → ready; 423 locked with validated expiry → locked; 403 administrator_required → signIn; 409 finished → finished. Other/malformed/500 onboarding_unavailable bodies become error, not guessed business results, rollback or resend permission. It returns only the existing ClaimResult union, never token/cookie JSON. Error/signIn/finished results reset cache usability through an awaited local owner reset after that claim call has settled; reset sends no GET or POST.

Source basis remains C `onboarding-claim.ts:createOnboardingClaimResponse`, native `claimResult`, and Auth's actual CSRF Response/claim output. Those protected source files were conserved, not rewritten. Browser Set-Cookie application and D's physical terminal are not asserted by the parser or a copied header object.

## Actual cache, task and reservation bodies

- Owner state, canonical origin, generation controller, cached token, one pending GET record, consumer count, reservation count and pending tasks live in the constructor closure. The only module registry is a **weak constructor-identity set**: no default owner, global token/cache or public registration setter. Copied/structural owners cannot be adopted by the new factories; this local identity check is not server permission evidence.
- Genuine GET is exact `/api/onboarding/claim`, GET/no body, same-origin credentials, redirect:error and no-store. The task is published before native fetch invocation. Its actual response body is read once under a 65,536-byte local bound, fatal UTF-8/HTTP JSON validation and the exact one-field `{token}` shape. Token validation requires 64 lowercase hex characters, one period and a canonical positive safe future integer expiry, bounded to the actual server header limit. No configured TTL, HMAC, nonce or permission is invented.
- One GET task is shared by separately counted consumers. A consumer abort retires only its wait; only the last departed consumer aborts unfinished GET work. The genuine GET remains owned until fetch/read/cancellation/reader.closed/release settle. Stale/aborted generations cannot adopt cache output. No timeout, retry or Promise.race is used to declare physical completion.
- SDK-call admission publishes its owner completion before invoking the actual SDK continuation. The new link constructs a unique private context object and directly associates it with the actual call in its lexical WeakMap. The SDK's option copies preserve that context reference through headers and fetch. No call is identified by signal/path/input/token or a caller DTO, and no cross-module registry setter exists.
- Async headers obtains and **reserves** the live cached token before returning it. All reserved-not-yet-sent and sent calls exclude cookie-changing refresh. Expiry/failure erases cache usability without clearing those reservations. A new explicit unsent intent may wait for old reservations to drain and then perform one new GET; it never resends an earlier mutation.
- Actual fetch resolves the same context/call, checks root+caller signal, generation/origin, exact closed POST path, single-send guard, expiry and unchanged `x-homarr-csrf-token`. It forwards the SDK init/body with same-origin credentials, redirect:error and no-store. No Cookie/Host/Origin/Fetch-Site manufacture, original Request reconstruction, custom serializer or RPC packet parsing occurs.
- The actual returned POST Response is read once through the real bounded reader, with tracked read/cancel/closed/release work. A finite byte copy preserving status/statusText/headers and genuine body-nullness is handed to the SDK; only the SDK decodes RPC JSON/none. Compatible json/none response interpretation is constrained without selecting packet.json or fabricating void. Claim parses only its separate HTTP JSON copy. No Response.clone or second original-body read is used.
- Reservation release follows the actual entire SDK/claim continuation, local nested-task drain and any genuine unused-copy cancellation, **not header fulfillment alone**. Reader.closed and cancellation are awaited before lock release. Cleanup failure remains a held owner; unresolved local tasks retain the drain/barrier rather than being cleared by finally, waiter abort or timeout.
- Reset/disposal synchronously stops admission and erases cache usability, aborts the current generation/GET and waits all genuine local work. Reset can reopen only after local settlement with a live unchanged browser origin/root; disposal is permanent/idempotent. The installer must retain and await these real completions before same-origin replacement; F4 supplies no installer or cross-document coordination.

`serverOutcome` becomes and remains **unknown** when POST transport is attempted; reset does not erase that evidence. Neither fulfilled SDK decode nor rejected/aborted fetch establishes native COMMIT, rollback, server ACK or socket closure. Per the controlling amendment, later new explicit non-mutating refresh may proceed once **local** work has actually settled, without waiting for unobservable server acknowledgement. There is no automatic mutation retry/resend, implicit claim reacquisition, force/new nonce substitution or new facts endpoint.

## SDK/dependency basis and retained source intent

Before reuse, current Nitro/API manifests and installed public pinned declarations/source were read: oRPC client/server/query 2.0.0-beta.43, Query 5.101.2 and existing API dependency are already declared. The link uses public RPCLink headers/fetch/whole-call interceptor ports (`client/dist/adapters/standard/index.d.mts`, `adapters/fetch/index.d.mts`, `shared/client.BjbdW5Rj.d.mts`). Installed `client.Bstqyaro.mjs` establishes the context-bearing encode→transport→decode sequence; TanStack's real bound mutation methods come from its installed utilities. No transitive SDK product import, new dependency, server runtime factory import or docs/Context7 retry was used.

Actual nextStep input remains server-derived z.void; the default SDK preserves undefined/no-body and owns user/group packet serialization. Stable generated mutation keys/root key contain no input/CSRF/password/token fields. No source QueryClient, password cache, hydration, typed-router path or navigation policy is altered. Account/group continue their existing component-owned direct calls, schema-parsed raw intents, pending/generation/abort/claim checks and sign-in/reload recovery. Existing undefined versus explicit empty email and provider semantics stay in their accepted source schemas/server owners.

## Private immutable source evidence

Directory: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-onboarding-wire-client-source-ab297b682b284b659602ff42`.

Created mode 0700; every manifest/source image/diff/absence record created exclusive mode 0600. Authorized bounded Python `-I -S -B` file/hash/difflib I/O recorded the new-path absence, all four before/after associations and **67 protected source associations with empty diffs**. No product patch follows the after capture. Legacy claim-function preservation is recorded in after.json.

| Leased source                | Before SHA-256 / absence                                           | Frozen after SHA-256                                               | Bytes / lines |
| ---------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ | ------------- |
| client/onboarding-writes.ts  | absent                                                             | `8ddd3215ee4e1e7f240c6832144dd5f9b5f00e85447ff130e414af35f73f8255` | 4150 / 101    |
| features/onboarding/claim.ts | `768db447c9eca1b70e254d5a4acf4a70a1d963e7b9c2865b2495d8fc1068e7af` | `5fab4da56f5c879da12b2be0ed1ddc0f40de03923ada88ee5003e8a8fe29e37b` | 18293 / 558   |
| features/onboarding/types.ts | `91ec0d6ac0408e44c18205d4fa4df414958bdd41c87e016520fbd955a9323179` | `eac42f1595811125399a41c80160396c32f00b6d9b8dc93880b26faf811cf809` | 9600 / 258    |
| features/onboarding/index.ts | `6907f202770110f19843c683c9779286522e81d39fb9836ce18b967ed0d37424` | `969961d000e5c20995658a028ef193f2149efe4e6866d8d234e2162db4cfb5cd` | 782 / 16      |

Protected manifests include studio/account/native-read/setup/controllers, root/router/entries/Query/navigation/source bridge/read links/SSR/render/tree/package/schema sources, backend E2 runtime/assembly, C5 Auth/native/claim/RPC/contracts, D Application/contribution, Auth four production-session files, API two wire modules/procedure/manifest, and DB runtime/runtime-preservation/transaction-gate. Complete individual pins/images/diffs are in before.json/after.json; no active report was captured as immutable authority.

## Next gates / no activation

Coordinator owns fresh focused Nitro type/lint/format checks against this freeze; independent reviewers own SDK/security and lifecycle acceptance. No compiler/style-zero, executed concurrency/cancellation case or browser evidence is claimed by source authorship.

The actual root/studio injection, refcounted installer/replacement scope, genuine environment/read/source-export/bootstrap producers, Query owner/navigation composition and admitted `/init` route remain separate held leases. Welcome nextStep action, completeSetup, source presentation imports/declarations and all visual/copy/SSR/root changes remain unmodified. Existing old claim caller is still uninstalled; these exports alone mint no root, readiness or usable onboarding.

Only the four leased product patches, two authorized source-capture commands and this NEW report were written. No author-invoked compiler/lint/formatter/check suite, application evaluation/imports/tests, SQL/native/Engine, network/Context7 retries, private configuration/data, nested agents, commit/push, browser/runtime action or mandatory Cloudflare/Docker/adapter switch occurred. Source review/checks and every installation/activation/runtime hold remain with the coordinator.
