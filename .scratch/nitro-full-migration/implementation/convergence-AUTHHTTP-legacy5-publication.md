# AUTHHTTP — Auth5 legacy producer source freeze

## Boundary and evidence

The coordinator supplied both Native6 independent SOURCE ACCEPT axes, mapper annotation acceptance, actual AUTHHTTP-NATIVE6-K4-2 backend/nitro/owners/lint zeros, accepted K4 follow-up/pin proof, and both amended Auth Oracle plan approvals for enrollment-plan lines 141–211. These are prerequisites supplied to this author, not reviews/checks repeated here. Earlier red evidence and handoffs remain unchanged.

Auth5 is now source-frozen across exactly `packages/auth/nitro/production-sessions/{service.ts,persistence.ts,sql-persistence.ts,index.ts,adapter.ts}` and this new handoff. The baseline manifest read was `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-auth5-source-7_dihghy/source-before.json`; its before images and recorded hashes were not modified or recomputed. No additional source ownership was needed.

## Actual methods, types and selection

`executeHttpAsync(request, kind, bounds, maximumResponseBytes)` on the existing genuine SQL issuer now selects its issuer-local `prepareLegacyHttpAsync(request, kind, bounds)` for the eight `LegacyIssuerHttpAction` values. `IssuerHttpAction` and `PreparedIssuerOperation.kind` extend their existing five direct kinds; the public production-sessions barrel adds only the safe `LegacyIssuerHttpAction` type. The internal `safeLegacyIssuerHttpAction` predicate enumerates those eight literals, not a prefix/catchall acceptance. No observer, locator, adapter, credential proof or publisher is exported through that barrel.

| Kind                 | Exact method/path                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------ |
| `legacy-providers`   | GET `/api/auth/providers`                                                                  |
| `legacy-csrf`        | GET `/api/auth/csrf`                                                                       |
| `legacy-signin`      | GET `/api/auth/signin` without a provider suffix                                           |
| `legacy-credentials` | POST `/api/auth/callback/credentials`, configured provider only                            |
| `legacy-ldap`        | POST `/api/auth/callback/ldap`, configured provider only                                   |
| `legacy-oidc`        | POST `/api/auth/signin/oidc`; GET/POST `/api/auth/callback/oidc`, configured provider only |
| `legacy-session`     | GET/POST `/api/auth/session`                                                               |
| `legacy-signout`     | POST `/api/auth/signout`                                                                   |

GET `/api/auth/signin/oidc` has the explicit executor-side 405/`Allow: POST` response before scope creation, body reading, Core preparation or native dispatch. Other wrong method/path/action combinations are not passed to Core. No empty-provider path is admitted.

## Core and verification association

Service reads one original bounded byte snapshot through the existing body reader. It validates UTF-8, finite retained form fields, duplicate form/query scalars, and session JSON's top-level keys/duplicates; it then passes the original method, URL, content type, bytes and return-redirect header through the existing canonical-host/forwarding sanitation. Session `data` is not used to change profile, grants or persistence. The existing direct HMAC mutation guard and its cookie namespace remain separate and unchanged.

Core uses `/api/auth`, the existing secret/cookie settings and real configured OIDC/credentials/LDAP definitions. Credential display names retain `Credentials`/`Ldap`. Metadata uses JWT configuration only, no adapter or session/JWT action, and excludes the placeholder. Every database-mode legacy call consistently reuses `EmptyNextAuthProvider`; its network hook fails the private ledger and no selector can choose it. Actual JWT callbacks fail closed. Only public Core, credentials-provider and errors entrypoints were imported; no internal Core implementation, JWT authority or copied crypto was introduced.

Core's CSRF validation precedes credential authorization. The authorize closure runs the bounded existing basic/LDAP verifier and records its actual selected witnesses or staged LDAP user. `callbacks.signIn` requires the exact returned verifier user object and matching selected user/account/provider association, stages one opaque session and critical login effects, then returns the canonical callback URL string. Critical effects run there because the early-return Core seam skips `events.signIn`. OIDC retains its genuine verified account/profile proof, staged adapter and critical event path. LDAP bind/search/disconnect promises remain ledger-tracked; collapsed LDAP null and disconnect failures hold, never become a local credential rejection.

Only genuine basic-verifier null followed by Core's typed `CredentialsSignin` records `core-negative-credentials`. Typed `MissingCSRF` before any verification/effects records `core-negative-csrf`; the actual Core `MissingCSRF` error URL or POST/session 400 null is retained. Every other Core logger error fails the ledger. HTTP status alone does not establish successful verification or absence.

## Native effects and publication

`observeIssuerSessionAsync` associates a genuine Native6 `observeSessionForIssuerAsync` handle with the same `OwnedScope`, exact original observation signal/deadline and, for active records, its actual lease and lease operation. Rechecks call `recheckOwnedSessionObservationAsync`; scope disposal calls `releaseOwnedSessionObservationAsync`. Missing cookies still take the real ready-domain/clock observation; unavailable is not absence. Expiry margin holds. The adapter returns only the selected record/token, retains the pre-update session object and stages `expire-session` with the exact expired observation rather than creating a policy lease or principal.

- Login uses the existing establish producer/mapping and fresh genuine reader, native version/grant/profile reconciliation and bounded finite output. Credential early-return has no provisional session cookie; OIDC's staged cookie must match the confirmed session. Only then are the native session/color-scheme cookies installed.
- Due session uses Core's actual staged new expiry through the renewal-only producer. Native acknowledgment is recorded before mapping/output/auth/cleanup failures. Fresh real lease, profile and grants are reconciled under the old original request/session deadline; the retired old lease is not used to reauthorize publication.
- No-due session has zero effects and owner observation rechecks before/after output. Core's recorded browser expiry is validated and retained without changing the stored authorization deadline.
- Session JSON is exactly `{expires,user:{id,name,email,image,colorScheme,permissions}}`, with original nullable profile and native expanded permissions. DTO expiry remains the selected old stored expiry; due renewal's native expiry and the Core browser cookie's expiry are validated separately. No token, password, evidence or extra adapter/user data is serialized.
- Expired session/signout requires the exact private `expire-session` observation/locator and Native6 `expireOwnedSessionAsync` confirmation, including Native6 cleanup. Live signout uses `revokeOwnedSessionAsync` with the actual scope lease operation's signal. Genuine absent session/signout is zero-effect and rechecked, not a null-unavailable shortcut.

The existing private proposal/completion WeakMaps bind the original Request, action, genuine issuer/SQL owner/scope, observation, selected proofs/effects, typed classification, bounded Core Response, original publication bounds and single consumption. Legacy native dispositions have a private expiry association; confirmed-settlement-failed and ambiguous states stay distinct. The legacy branch never maps expiry through establishment or widens renewal.

Finite publication validates Core's CSRF/callback/PKCE/state/nonce cookies, session-cookie lineage and exact DTO/redirect shapes, rejects unknown/chunked/unexpected cookies, bounds response bytes/headers, and preserves Core's actual `{url}` envelope bytes. Legacy clean-cookie/null output requires the matching confirmed disposition or positively settled absence. Direct P1 output/cookie semantics remain on their existing branch.

Body/Core/verifier/network and response bodies physically settle; the legacy OIDC fetch uses the bounded operation signal and retained network responses are drained. Native acknowledgments, fresh leases, observation resources, scope tasks and native fences settle before publication/disposal. Scope reads track actual work, not their HTTP/completion consumer; Native6 settlement never waits on that outer consumer. Intentional scope-release abort is separate from the saved original publication bounds.

## Review and execution holds

No commands/checks/hash helpers/lint/builds/tests/evaluation/native SQL/environment/configuration/data/secret operations, documentation-quota retries, installations or nested agents were run. No comments, casts, `any`, tests, dependencies, helper framework or additional source files were added. Existing auth dependencies, sibling patterns and common utilities were read; installed Core source and approved research were read-only references.

Native6, K4/COPY1, D2's runtime/fixtures, origin/body/session primitives/verifiers/placeholder, other barrels/manifests/schema, Backend/client, frozen compiled artifacts and all other lanes were not changed by this author. This source freeze is ready for independent authority and native HTTP review and separately authorized coordinator fresh checks. It is not SOURCE ACCEPT, fresh zero, working login, adoption, runtime activation, mounting, App proof or production PASS. Backend4/MAIN enrollment and every adoption/activation hold remain in force.

## Exact two-file repair freeze

Read `convergence-AUTHHTTP-legacy5-repair-plan.md` and the recorded review/release checkpoint in `.slim/deepwork/nitro-full-migration.md`. Both terminal repair-plan approvals (Core/wire/type `ses_ece04cd30ffenH0qfet0WLe9YW`, native-publication/physical-cleanup `ses_ecde97a6bffeX8t16q9PVdb2uy`) are recorded prerequisites, not independent source acceptance of this repair. The immutable Auth5 `source-after.json` manifest was read at the existing TEMP baseline directory; its `*-after.ts` images, hashes, diffs and all prior evidence were not overwritten or recomputed.

Applied only the released source deltas:

- `service.ts`: ordinary POST same-origin checking now removes only the `!credentials` exemption. Credentials/LDAP callbacks receive that guard before scope/body/Core/native work; the verified OIDC callback exception remains.
- `service.ts`: removes only the already-excluded post-observation expiry-margin comparison and the impossible margin disjunct in the signout missing-observation check. The actual owner observation seam's margin hold is unchanged.
- `service.ts`: wraps the unchanged managed OIDC fetch and async-denying placeholder fetch with `Object.assign`, attaching the same local synchronous `denyPreconnect` function that throws `IssuerStagingError` without ambient network/preconnect. Managed fetch inputs are explicitly `Parameters<typeof fetch>[0]` and optional `Parameters<typeof fetch>[1]`. Existing fetch bodies, combined signals, ledger/scope/task ownership and the OIDC interface remain unchanged.
- `service.ts`: moves the original unretained `Promise.allSettled` body into one local async helper before the preparation try, capturing the same owner/scope/ledger/current response/network-response set. The original finally awaits it only when `!retained`. Actual tasks still drain concurrently, network faults precede preparation faults, preparation error values are rethrown unchanged, and finally/early-return failure precedence is preserved.
- `sql-persistence.ts`: after genuine legacy fresh admission, derives a fresh bounded operation with that same admission signal and `Math.min(originalDeadline, current.validity.hostDeadlineAt)` for stored-session leases, retaining the original deadline otherwise. The existing publication clamp decreases its deadline. Both fresh-result checks and both fresh-current checks now use this bounded operation; original proposal/scope/native bounds and confirmation-before-mapping remain unchanged.
- `sql-persistence.ts`: restores `publication.stage = "auth-check"` immediately after awaited finite legacy output, before the subsequent current/credential/profile checks.

These two product files and this append are now frozen for independent two-axis source rereview and coordinator fresh backend/nitro/owners/lint checks. The current `D2-AUTHHTTP-LEGACY5-1` all-one receipts remain preserved; no fresh result is claimed. D's accepted iterator follow-up/final byte proof was not edited or revalidated.

No commands/checks/hash helpers/lint/builds/evaluation/native SQL/environment/configuration/data/secret operations, docs retries or nested agents ran. No tests/comments/dependencies/casts/`any`/nonnull assertions/new framework or unrelated warning changes were added. The other Auth3, accepted Native6/D2/K4/COPY1, Backend, gates, manifests, exports, fixtures, assets and all other source remain untouched by this repair. P1's direct HMAC behavior and the legacy parser/CSRF/Core methods/cookies/DTO/effects/native acknowledgment/outcome contracts were not refactored. Backend4/MAIN/new compiler/native/runtime/adoption/data actions remain held; this is source freeze, not runtime Auth success or production PASS.
