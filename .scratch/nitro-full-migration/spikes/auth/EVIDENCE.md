# Independent Auth.js Core compatibility spike

## Outcome

**Native Credentials/LDAP → database sessions: DISPROVED for Core 0.41.3 with only actual credentials providers. Existing NextAuth workaround portability without assertion bypass: NOT DEMONSTRATED. No production auth alternative selected.**

The bounded Phase A investigation is executed and ready for coordinator review. This is not completion of #09 or #10, does not depend on #01 acceptance, and does not bypass those tickets' native blockers. All authored files are confined to this directory. No application routes, source packages, manifests, lockfiles, tracker metadata or shared roster were changed.

The stock Core Fetch API is usable, but the allowed configuration fails before authorization, session creation, JWT encoding or sign-in effects. Request-local closure/cookie machinery cannot repair a rejected strategy. No placeholder provider, provider-type mutation, private Core import, `raw` dispatch or `skipCSRFCheck` was used to obtain green login evidence.

## Versions, fixtures and limitations

- Declared dependencies verified in root catalog and `packages/auth/package.json`: `@auth/core` 0.41.3, `@auth/drizzle-adapter` 1.11.3, bcrypt 6.0.0, ldapts 8.1.8. Installed package manifests and actual module resolution agree. Core and bcrypt were executed; Drizzle adapter and ldapts were resolved/version-checked only, not used as production adapters/services.
- Actual runtime: Node **v24.16.0**, Darwin arm64. Repository runtime requirement is **>=24.18.0**: COMPOSITION must provide/revalidate that target runtime later. Bun 1.4.2 is present but was not used to run the harness, avoiding Bun's automatic environment-file loading. No dependency was missing and nothing was installed.
- Fixtures explicitly choose `https://auth-spike.invalid`, `/api/auth`, `trustHost: true`, secure cookies, HttpOnly/Lax/path `/`, named `auth-spike` cookies, maxAge **600 seconds**, updateAge **60 seconds**, and a disposable literal secret. These are test inputs, not approved production defaults or origin/cookie policy.
- Three disposable identities (`local-a`, `local-b`, `ldap-a`) and a bcrypt cost-10 password hash exist only in memory. Local verification lowercases and constrains lookup to fixture `provider=credentials`; it is a source-informed scratch verifier, not an import/execution of Homarr's production database verifier.
- The instrumented adapter stores real fixture rows in Maps, clones row dates, records request IDs and implements create/read/update/delete session behavior. Account-linking paths throw rather than fabricate success. This is **explicitly not production persistence, Drizzle, SQLite/PostgreSQL, transaction or durability proof**.
- LDAP is an injected function that accepts/rejects fixture values and records dispatch. It proves only Core provider dispatch. No ldapts client, LDAP bind/search, network login, group reconciliation, TLS policy or roles were exercised.
- Only in-process Web Requests/Responses were used. There was no listener, browser, container, network auth request, real provider credential, app data, `.env` read or production-mounted fixture authentication. Owned process memory disappears on exit; no service cleanup is needed.

## Public seams and observed behavior

The approved seams are `Auth(Request, config) → Response`, request-local adapter/effect dispatch, and `/api/auth/session`/sign-out responses. Scratch `createAuthFetch` wraps the actual installed public Core API with explicit per-request config and trace/effect buffers. It is not a production interface acceptance artifact.

### 1. Database-strategy constraint

`GET /api/auth/csrf` and separately planned valid local, invalid local and injected-LDAP callback requests all return **500**, no Location, no Set-Cookie, and:

```json
{
  "message": "There was a problem with the server configuration. Check the server logs for more information."
}
```

Logger reports exactly:

```text
UnsupportedStrategy
Signing in with credentials only supported if JWT strategy is enabled. Read more at https://errors.authjs.dev#unsupportedstrategy
```

`authorize`, `callbacks.signIn`, `callbacks.jwt`, adapter operations and LDAP dispatch remain **unreached**. The callback fixtures use a valid same-secret Core-generated CSRF token obtained from the separately labeled JWT diagnostic config; configuration rejection still precedes CSRF/credential evaluation. No automatic fallback/retry was made after rejection.

`credentials-evidence.json` retains exact responses and traces. These failing business outcomes are expected probe assertions, not a working bridge.

### 2. Supported JWT diagnostic, not an approved alternative

- Valid uppercase `ALICE` with the disposable bcrypt password returns **302** to `https://auth-spike.invalid/after-login`; the subsequent session response has `user.id=local-a`.
- Wrong password, unknown name, directory-owned name on the local provider and empty input all return **302** to `/auth/login?error=CredentialsSignin&code=credentials`, no login cookie, and logger `CredentialsSignin`.
- Injected LDAP valid/invalid values dispatch to that verifier and produce success/generic failure respectively. This does not prove real LDAP authentication.
- Credential callback with invalid CSRF returns `/auth/login?error=MissingCSRF`; authorization is not called. `trustHost:false` produces **500 / UntrustedHost**. These are fixture checks, not a trusted-proxy resolver/security review.
- Valid callback has **three separate Set-Cookie headers**: Core callback URL, Core encrypted JWT session, and one request-local synthetic theme effect. Exactly one session cookie is emitted. HttpOnly/Secure/Lax/path/expiry attributes are retained.
- `X-Auth-Return-Redirect: 1` yields **200** JSON `{ "url": "https://auth-spike.invalid/after-login" }`, retains Location and the same three separate Set-Cookie headers.
- Eight logins enter an authorization barrier together (seven local, one injected LDAP). Eight distinct encrypted session tokens, correct subsequent user IDs and matching theme effects show no request-local identity/effect leakage in this diagnostic. **Zero adapter calls and zero database sessions** are created by native JWT credentials login.

This validates Fetch/CSRF/cookie/request-local mechanics only. JWT success is not opaque database-session support and does not approve abandoning database revocation or changing production session strategy.

### 3. Late failures and cleanup limitations

- Injected `events.signIn` failure logs **EventError** with cause `Injected late sign-in event failure`, but Core **swallows it**. The response still redirects successfully, contains the JWT session cookie, and that cookie reads as authenticated. Authentication is **not rolled back**.
- The scratch wrapper can discard its own staged theme effect after a logged error. One focused red→green test proves precisely that small buffering behavior, while explicitly asserting Core's session cookie remains. The logger-error latch is diagnostic instrumentation, **not an accepted production success/rollback protocol**.
- Injected JWT encoding failure after successful authorization/signIn logs **CallbackRouteError**, redirects to `/auth/login?error=Configuration`, and returns **no Set-Cookie**. No database session existed, so this cannot prove database-row rollback.
- Repeating that planned failure scenario with an existing fixture session leaves the **incoming session cookie unchanged**; Core does not revoke it. This is not an automatic retry of a rejected login or a production cleanup decision.
- Credentials-database late creation/failure cleanup is **UNVERIFIED/unreachable** under the allowed native configuration. There is no evidence of a created credentials database row/token being safely cleaned after failure, and no such guarantee should be inferred from the effect-buffer test.

### 4. Database reader/renewal/sign-out, separate diagnostic process

`database-evidence.json` runs in a fresh process with **no credentials configured**, providers `[]`, and rows explicitly seeded via the instrumented adapter. This is a session-lifecycle diagnostic, not a login config or production fixture-auth service.

- Concurrent reads of two distinct rows return the correct user/token and **200**, with `Cache-Control: private, no-cache, no-store`. Each response retains three separate cookies (CSRF, callback URL, session).
- Fresh row does not invoke updateSession; due row invokes it once and extends its stored expiry. Request IDs isolate adapter instrumentation and cookie output.
- **Renewal projection caveat:** Core passes the pre-update row to callbacks.session and ignores updateSession's returned row. Our projection consequently returns the old expiry while the persisted row and cookie expiry are renewed. `renewalProjection` records both exact timestamps. Session snapshot/timer semantics need an explicit accepted contract, not an assumption that returned expiry already reflects renewal.
- Expired row is deleted and returns JSON `null` plus session-cookie `Max-Age=0`. Missing/revoked rows likewise return `null` and clear the cookie.
- Successful CSRF-protected sign-out deletes the row, clears the cookie and returns **302** to `/signed-out`. A later read using its old token is anonymous.
- Late session event failure logs **EventError** yet still returns an authenticated body, renewed cookie and already-renewed row.
- Late session callback failure logs **SessionTokenError**, returns **200/null**, emits no session cookie, but **retains the prior updateSession renewal**. Core is not a transaction/rollback boundary.
- Late sign-out event failure logs **EventError**, but the row remains deleted and the cookie is cleared.
- Invalid CSRF on `POST /session` returns **400/null**, logs **MissingCSRF**, and emits no cookie.

### 5. Installed Core assertion state is not request-local

`contamination-evidence.json` records **200/null** for a providerless database session reader in a fresh process, then configures a Credentials JWT provider for `/providers`. The otherwise-identical database reader subsequently returns **500 / UnsupportedStrategy**.

Installed `assert.js` keeps `hasCredentials` at module scope and never resets it. It observes credentials from the earlier config; a later empty provider array is considered credentials-only. Merely making `AuthConfig` per request does not isolate this internal configuration state. Fresh subprocesses above avoid conflating the separate diagnostics; process separation is **not proposed as a production bypass**. A future Core-OIDC/custom-login option must assess its actual production provider/config topology.

## Existing NextAuth workaround assessment

Read-only inspected `packages/auth/configuration.ts`, `adapter.ts`, `callbacks.ts`, `events.ts`, `session.ts`, the credential provider/basic verifier/filter/empty provider, and the Next auth route. No production module was imported, because those graphs instantiate environment/database/Next dependencies.

Current Homarr configuration:

1. Uses `strategy:"database"` and manually creates a session during credentials/LDAP `callbacks.signIn`.
2. Writes its session through `next/headers.cookies()`, then custom JWT encode reads that cookie and returns its opaque token; decode returns null.
3. Always retains `EmptyNextAuthProvider`, an OAuth placeholder explicitly documented in its source as necessary to evade the credentials-only database restriction.
4. Runs group/profile/theme effects in `events.signIn` after credentials JWT encoding. Core catches event failures, so throwing there is not a rollback guarantee.

The installed callback always follows the JWT path for Credentials after signIn regardless of the configured database strategy. The placeholder changes the assertion predicate; it does **not** supply native database credentials support. Moving Next cookie access into a request-local closure could reproduce token transport mechanics only **after** passing this unsupported-strategy gate. Replacing the placeholder with a fake OAuth/provider-type mutation is outside approval and was not attempted. No port of this workaround without an unapproved assertion bypass has been established.

The production Next route also rewrites arbitrary forwarded origin while computing secure-cookie choice before rewriting; the spike did not copy or approve it. Existing raw session helper lacks an expiry check; it was inspected, not reused as the diagnostic session reader.

## Bounded candidate options requiring a new decision

1. **Core for actual OIDC + a Homarr-owned local/LDAP opaque-session establishment service.** Avoid Core Credentials database login entirely. Reuse existing bcrypt/verifier policy and one shared database-session authority. Requires explicit trusted-origin/CSRF/rate-limit/error contracts, transaction-aware login/group effects, session/cookie reader/renewal/sign-out behavior and supported database acceptance. Do not use private Core CSRF functions or disable checks. This is an option, not implemented/selected here.
2. **An explicitly supported upstream Core change/version, if available and separately verified.** No installation or upstream support guarantee was made. A release-specific workaround using a real OIDC provider would still not prove Credentials-native database support; placeholder/type bypass remains unapproved. Any maintained nonstandard bridge needs explicit approval and failure/rollback review.
3. **A named version-pinned alternative auth stack.** None was investigated or chosen. Require demonstrated preservation of provider-scoped identities/linking, LDAP/local policy, bcrypt hashes, opaque database sessions/revocation, cookies, durable content and migration/rollback. Website branding or this diagnostic JWT success is not approval.

## Production decisions/contracts still held

- Q11 concrete persistence/adapter/transactions; Q12 content migration mode; Q13 board draft; Q14 live topology; Q15 continuity versus one-time re-login remain unchanged.
- Trusted origin/proxy allowlist, TLS/local secure-cookie rules and actual cookie names/options are not selected.
- LDAP-only direct local-login disablement policy, real LDAP verifier/cleanup/group/TLS behavior and role/resource policy are not proven.
- Accepted principal/session projection, request-local effect commit/rollback contract, session snapshot expiry/renewal, browser invalidation, permission refresh and live-session revocation latency still need owner review.
- Critical post-login reconciliation cannot rely on throw-from-event as a transaction boundary. Decide how failure affects session issuance, retained incoming sessions and partial identity/group/session writes.
- Real SQLite/PostgreSQL adapter/schema and target Node >=24.18.0/Nitro composition acceptance remain unverified; no auth interface is production-ready from this spike alone.

## Validation and exact written paths

All files below are under `.scratch/nitro-full-migration/spikes/auth/`:

- `fixtures.ts`, `adapter.ts`, `auth-fetch.ts`, `probe.mts`, `auth-fetch.test.mts`, `tsconfig.json`, `EVIDENCE.md`.
- `credentials-evidence.json`, `database-evidence.json`, `contamination-evidence.json` and each corresponding `*-stderr.txt`.
- `tdd-red.txt` (first observed native event-swallowing surprise), `tdd-red-cookie.txt` (true cookie-buffer regression red), `tdd-green.txt`, `typecheck.txt`, `lint.txt`.

Commands run from the repository root, without environment loading, installation or broad checks:

```sh
node .scratch/nitro-full-migration/spikes/auth/probe.mts credentials > .scratch/nitro-full-migration/spikes/auth/credentials-evidence.json 2> .scratch/nitro-full-migration/spikes/auth/credentials-stderr.txt
node .scratch/nitro-full-migration/spikes/auth/probe.mts database > .scratch/nitro-full-migration/spikes/auth/database-evidence.json 2> .scratch/nitro-full-migration/spikes/auth/database-stderr.txt
node .scratch/nitro-full-migration/spikes/auth/probe.mts contamination > .scratch/nitro-full-migration/spikes/auth/contamination-evidence.json 2> .scratch/nitro-full-migration/spikes/auth/contamination-stderr.txt
node --test .scratch/nitro-full-migration/spikes/auth/auth-fetch.test.mts > .scratch/nitro-full-migration/spikes/auth/tdd-green.txt 2>&1
node node_modules/typescript/bin/tsc --project .scratch/nitro-full-migration/spikes/auth/tsconfig.json > .scratch/nitro-full-migration/spikes/auth/typecheck.txt 2>&1
node node_modules/oxlint/bin/oxlint --no-ignore .scratch/nitro-full-migration/spikes/auth > .scratch/nitro-full-migration/spikes/auth/lint.txt 2>&1
```

Final executed results: **all three probe modes exit 0**, **focused test 1 passed / 0 failed**, **scoped typecheck exit 0**, **scoped lint exit 0 with no warnings**. The evidence assertions hold; native database credentials **still fail**. Typecheck uses installed TypeScript 7.0.2 with skipLibCheck (only harness checked); lint uses oxlint 1.73.0 and explicitly includes ignored scratch paths. Empty typecheck/lint output files record successful silent checks. Node emits a harmless typeless-package module-detection warning for scratch `.ts` imports; no package manifest was changed to silence it.

## Authoritative citations

Read on 2026-10-10. Context7 quota exhaustion was already freshly recorded by COMPOSITION/EXECUTION; no repeat quota call was made.

- [Auth.js Credentials reference](https://authjs.dev/reference/core/providers/credentials): Credentials users are not automatically persisted and JWT sessions are required. [Core reference](https://authjs.dev/reference/core): public Fetch API, advanced cookie overrides, trustHost responsibility. Moving docs supplement, not override, installed code.
- Core **0.41.3** [entrypoint](../../../../node_modules/@auth/core/index.js#L66), [strategy assertion and module flags](../../../../node_modules/@auth/core/lib/utils/assert.js#L15), [credentials callback](../../../../node_modules/@auth/core/lib/actions/callback/index.js#L227), [event error wrapper](../../../../node_modules/@auth/core/lib/init.js#L138), [session lifecycle](../../../../node_modules/@auth/core/lib/actions/session.js#L65), [sign-out](../../../../node_modules/@auth/core/lib/actions/signout.js#L9), [Set-Cookie append](../../../../node_modules/@auth/core/lib/utils/web.js#L53). Runtime-source SHA-256 digests accompany every final evidence JSON.
- [Current workaround](../../../../packages/auth/configuration.ts#L73), [placeholder](../../../../packages/auth/providers/empty/empty-provider.ts), [filter](../../../../packages/auth/providers/filter-providers.ts), [adapter](../../../../packages/auth/adapter.ts), [sign-in events](../../../../packages/auth/events.ts), [raw helper](../../../../packages/auth/session.ts), [Next route origin rewrite](../../../../apps/nextjs/src/app/api/auth/%5B...nextauth%5D/route.ts).
- [Approved #09](../../issues/09-local-login-and-production-sessions.md), [EXECUTION Phase A](../../EXECUTION.md), [DESIGN choices/holds](../../DESIGN.md), [identity research §§1/3/5](../../../../research_notes/Homarr%20full%20Nitro%20migration/identity-administration.md).
