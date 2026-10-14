# Source-preserving auth helper preparation

## Outcome and boundaries

**Unmounted candidate helper ports ready for coordinator review; no #09/#10 closure, session backend or production auth-engine selection.** The approved Q11–15 answers, including migration-time logout and current SQLite backup restoration, are consumed from the updated DESIGN/EXECUTION. Earlier Core evidence stays unchanged/read-only; its native Credentials-database incompatibility still requires a separate production disposition, not a barrier to these helper ports.

Exclusive writes are the two new helper directories and this report. Old auth files, manifests, lockfiles, DB/schema exports, policy-worker files, shared registration and roster were not edited. No `.env`, real installation/media, credentials or app data were read; no browser, listener, container, LDAP service or external auth request was used. Nothing was installed, staged or committed.

## Actual source functions reused/ported

| Candidate function                                                  | Real source and preserved behavior                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hashPasswordAsync`, `comparePasswordsAsync`                        | Directly reexport/import the existing pure [`security.ts`](../../../packages/auth/security.ts), not a duplicate password implementation: bcrypt cost 10, native hash verification, no forced rehash or extra password complexity.                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `authorizeWithBasicCredentialsAsync`                                | Adapts the actual [`basic-authorization.ts`](../../../packages/auth/providers/credentials/authorization/basic-authorization.ts) body. `name.toLowerCase()` with **no trim**, lookup constrained to `provider:"credentials"`, missing/null password and mismatch → null, success → existing `{id,name}`. Names remain nullable as in the source row projection.                                                                                                                                                                                                                                                                                                                      |
| `verifyBasicCredentialsAsync`                                       | Adapts actual credentials-provider parsing: reuse public `userSignInSchema.parseAsync(input)` before the verifier. Existing nonempty-string login schema and validation rejection remain; signup normalization/complexity is not substituted.                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `authorizeWithLdapCredentialsAsync`, `createLdapUserFilter`         | Adapt the actual [`ldap-authorization.ts`](../../../packages/auth/providers/credentials/authorization/ldap-authorization.ts) body: service bind; ldapts EqualityFilter escaping plus configured extra filter; exact scope and deduplicated requested username/mail/group-member-user attributes; exactly one user; actual `utf8EmailSchema`; separate user bind using untouched DN; group class/member/extra filter and `cn` projection; lookup by email **and LDAP provider**; reuse existing ID or insert the same six fields (`id,name,email,emailVerified,image:null,provider:"ldap"`). Return the submitted name and group names; no permissions or group grants are invented. |
| `verifyLdapCredentialsAsync`                                        | Reuse actual public `ldapSignInSchema.parseAsync(input)` first, then retain provider-source `.catch(() => null)` for authorization failures. Invalid input still rejects during parsing; this is not a newly invented HTTP/error policy. Public validation keeps the existing forbidden-character regex.                                                                                                                                                                                                                                                                                                                                                                            |
| `LdapClient.bindAsync/searchAsync/disconnectAsync`                  | Adapt the actual [`ldap-client.ts`](../../../packages/auth/providers/credentials/ldap-client.ts): injected transport rather than env singleton; bind forwarding; first-valued attribute/Buffer UTF-8 conversion; original `entry.dn` restored unchanged; unbind forwarding. `createLdapClient(uri)` wraps installed ldapts `new Client({url:uri})` only when called. No client is constructed or connected on module import.                                                                                                                                                                                                                                                        |
| `generateSessionToken`, `expireDateAfter`, `sessionTokenCookieName` | Adapt [`session.ts`](../../../packages/auth/session.ts) and the exact [`common/security.ts`](../../../packages/common/src/security.ts) random-byte codec: **48 random bytes → 96 lowercase hex chars**, `now()+seconds*1000`, `<explicit-prefix>.session-token`. Clock and prefix are caller supplied; no env/default loading. The Next-dependent common/server barrel is not imported.                                                                                                                                                                                                                                                                                             |
| `createCookies`, `writeSessionTokenCookie`                          | Adapt the actual [`configuration.ts`](../../../packages/auth/configuration.ts) cookie map and manual cookie-write payload. Preserve the unprefixed session name, conditional `__Host-` CSRF and `__Secure-` other cookies, exact `.pkce.cooldown` spelling, path `/`, expiry, HttpOnly, Lax and explicitly supplied secure choice. Only stage a cookie through the supplied per-request effect writer; do not create a session row.                                                                                                                                                                                                                                                 |

Existing logging messages/username metadata remain injected rather than constructing the legacy env/logger graph. Existing Core `CredentialsSignin` is reused only as the source verifier error class; neither `Auth` nor `NextAuth` is imported or called.

### Narrow approved cleanup repair

The copied LDAP failure path initially left both created clients open on a wrong-password user bind, as the old body does. The approved #10 obligation requires owned clients to close on failure. A focused test first failed with `closed=[]` instead of `[0,1]`; the port now tracks request-owned clients and attempts unbind in `finally`, retaining the source successful user-then-service disconnect sequence. No successful client is disconnected twice. Cleanup rejection logs a generic warning and does not replace the original denial; there is no login/network retry.

This proves attempted cleanup on **injected protocol fixtures**, not measured ldapts network cleanup. A transport whose operation never settles still needs the host's accepted cancellation/abort integration; no real cancellation/TLS guarantee or certificate policy is claimed here.

## Candidate contracts requiring acceptance before mounting

- `CredentialsIdentityRepository.findUserByName({name,provider:"credentials"})` must perform the actual provider-scoped lookup and return only `{id,name,password}` needed by verification. Helper does not implement SQL, persistence, caller authentication or provider enablement. The adapter must enforce the supplied selector, as the source SQL does.
- `LdapIdentityRepository.findUserByEmail({email,provider:"ldap"})` and `insertUser(NewLdapIdentity)` map the existing lookup/insert semantics. This is an injected **identity** repository, not a session store. No new transactions, uniqueness/linking rules, cross-provider merging or concurrent-create guarantees are added.
- `LdapVerifierResources` takes explicit configuration, repository, logger, `createClient()`, actual source-compatible `createId()` and `now()` clock. Production composition should provide existing `@homarr/common.createId`; tests use disposable deterministic IDs only.
- `LdapConfiguration` maps existing settings directly: `AUTH_LDAP_BIND_DN→bindDistinguishedName`, `AUTH_LDAP_BIND_PASSWORD→bindPassword`, `AUTH_LDAP_BASE→base`, `AUTH_LDAP_SEARCH_SCOPE→searchScope`, `AUTH_LDAP_USERNAME_ATTRIBUTE→usernameAttribute`, `AUTH_LDAP_USER_MAIL_ATTRIBUTE→userMailAttribute`, `AUTH_LDAP_USERNAME_FILTER_EXTRA_ARG→usernameFilterExtraArg`, `AUTH_LDAP_GROUP_CLASS→groupClass`, `AUTH_LDAP_GROUP_MEMBER_ATTRIBUTE→groupMemberAttribute`, `AUTH_LDAP_GROUP_MEMBER_USER_ATTRIBUTE→groupMemberUserAttribute`, `AUTH_LDAP_GROUP_FILTER_EXTRA_ARG→groupFilterExtraArg`. `AUTH_LDAP_URI` is supplied explicitly to `createLdapClient(uri)`. No defaults were changed/selected in this port.
- `SessionCookieEffects.set(name,value,options)` must be request-owned. The currently proposed host accepts serialized response effects, so COMPOSITION needs a reviewed structural-cookie→host-effect adapter that preserves multiple Set-Cookie headers and commit/failure handling. This helper neither serializes headers nor implements a cookie jar, rollback protocol, session minting or renewal.
- `AuthCookieConfiguration` takes explicit existing cookie prefix and secure decision; `expireDateAfter(seconds,now)` takes the actual configured lifetime/clock. No trusted origin, forwarded-header or secure-cookie deployment policy is inferred from requests here.

Provider-enable gating/LDAP-only local dispatch, external group reconciliation, session authority, origin/CSRF/rate limiting, permission expansion, browser/live invalidation and migration-session clearing remain their owning integration work. Existing source behavior is not replaced by a new policy question; these helpers simply do not own those policies.

## Files authored

Under `packages/auth/nitro/verifiers/`:

- `contracts.ts`
- `basic-authorization.ts`
- `ldap-authorization.ts`
- `ldap-client.ts`
- `index.ts`
- `basic-authorization.test.ts`
- `ldap-authorization.test.ts`
- `bunfig.test.toml`
- `tsconfig.check.json`
- `vitest.security.config.ts`

Under `packages/auth/nitro/session-primitives/`:

- `index.ts`
- `session-primitives.test.ts`

This report is `.scratch/nitro-full-migration/implementation/auth-helpers.md`. No other files were authored. Test caches were disabled/redirected into the owned helper directory; no cache output remained. The installed-package graph check used `write:false`, producing no bundle or metadata files.

## Validation executed

Installed versions verified against declared dependencies/source: bcrypt **6.0.0**, ldapts **8.1.8**, Zod **4.4.3**, Core **0.41.3**, TypeScript **7.0.2**, oxlint **1.73.0**, Vitest **4.1.10**, Bun **1.4.2**. Context7 quota exhaustion is already recorded in EXECUTION; existing public schemas and exact installed dependency source/types were used, with no repeated quota call/install/network fallback. ldapts Client/SearchOptions/Entry/EqualityFilter source was inspected before adaptation. Node tooling runtime is **24.16.0**, below the repo's >=24.18.0 target; this is not final target-runtime acceptance.

From `packages/auth/nitro/verifiers/`:

```sh
bun test --no-env-file --no-install --config ./bunfig.test.toml ./basic-authorization.test.ts ./ldap-authorization.test.ts ../session-primitives/session-primitives.test.ts
```

**5 passed, 0 failed**, covering actual local bcrypt/password lookup, provider scoping and no-trim behavior; LDAP escaped literal filters, exact RFC4514/non-ASCII DN, first-valued attributes, scoped identity create/reuse, regex rejection, missing/ambiguous/invalid-email/wrong-password generic denial and attempted client cleanup; random token format, clock/lifetime arithmetic and isolated structured cookie effects. All directory data/transports are synthetic fixtures: **not measured LDAP runtime/login or role policy**.

From repository root:

```sh
node node_modules/vitest/vitest.mjs run --config packages/auth/nitro/verifiers/vitest.security.config.ts --configLoader native
node node_modules/typescript/bin/tsc --project packages/auth/nitro/verifiers/tsconfig.check.json
node node_modules/oxlint/bin/oxlint packages/auth/nitro/verifiers packages/auth/nitro/session-primitives
```

- Existing unchanged `packages/auth/test/security.spec.ts`: **4 passed**, only that file, no global repo test configuration/setup. Vite `envDir:false`, cache disabled and native config loader prevent environment loading/temp configuration bundling.
- Scoped helper typecheck: **exit 0**, strict/noUncheckedIndexedAccess, no emit/incremental output, skipLibCheck. Public schema dependencies are type-resolved; no full-repo typecheck ran.
- Scoped lint: **exit 0, no warnings**.
- Read-only `git diff` of old auth source/manifests: empty.

TDD was vertical: local and LDAP/session helper public regressions were written before their ports; the wrong-password cleanup regression produced a substantive red before the lifecycle repair. Initial Bun invocation ordering and `--tsconfig-override` caused CLI errors/an internal directory-mismatch warning; final commands use the explicit owned Bun config and separate tsc project above. An initial graph inspection needed an esbuild outdir; the corrected in-memory check passed. These were tooling corrections, not auth fallback/retries.

Read-only bundled-import inspection of both new public entrypoints (bcrypt external/native) found **982 source inputs**, reused actual `security.ts`/user/email schemas, and **zero** imports of legacy initializing auth/db/core entrypoints, `next` or `next-auth`. This is graph evidence only, not a production bundle/performance claim. The actual validation/user barrel is retained rather than copying its schemas; COMPOSITION may later arrange narrower equivalent validation exports if necessary.

## COMPOSITION handoff

No additional runtime dependency is required: all runtime imports are already declared in `@homarr/auth` or standard `node:crypto`, and the unchanged pure password module/public validation schemas are reused.

Only COMPOSITION should add/accept these manifest exports when ready:

```json
{
  "./nitro/verifiers": "./nitro/verifiers/index.ts",
  "./nitro/session-primitives": "./nitro/session-primitives/index.ts"
}
```

The candidate source entrypoints currently exist but these package subpaths are **not yet declared/usable as accepted public package imports**. After review, supply real scoped identity repositories, existing settings/ID/logger/clock resources and host cookie-effect adaptation. Do not mount fixture auth, select JWT, bypass Core assertions, treat injected LDAP fixtures as real provider proof or claim SQLite backup restoration from these tests. Production engine/bridge disposition, real persistence/provider/cancellation/session flow and full capability/restore acceptance remain separate work.
