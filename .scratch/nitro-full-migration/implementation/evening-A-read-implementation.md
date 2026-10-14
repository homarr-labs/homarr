# Evening A — read admission source freeze

**Implemented and frozen for independent review; no static/runtime checks executed.** Only the approved four product paths changed:

- `packages/auth/nitro/production-sessions/service.ts`
- `packages/auth/nitro/production-sessions/sql-persistence.ts`
- New `packages/auth/nitro/production-sessions/index.ts`
- New `apps/backend/src/server/runtime-composition/auth.ts`

This new report was absent at initial and immediate prepatch checks. No manifests/contracts/assembly/host/DB/authority/policy/peer sources were written. No commands, compiler/lint/build/install/tests/native/SQL/runtime/data/environment/credentials/sealed capture/Git/delegation/Context7 activity occurred. Coordinator owns checks after shared-source freeze. 91/334 and all publication/write/stream holds are unchanged.

## Fixed P/H construction contract

Public Auth leaf: `@homarr/auth/nitro/production-sessions` (coordinator already declared its package export).

`createProductionSqlSessionIssuer(runtime: PersistenceRuntime, configuration: ProductionSessionIssuerConfiguration, sqlConfiguration: AuthSessionSqlConfiguration, ldap: ProductionSessionLdapResources, requestApiKeys: ProductionSessionApiKeyConfiguration)` still constructs its single existing private SQL owner and authority/producer. Its inferred return now has exported type `ProductionSqlSessionIssuer` and a frozen, secret-free `requestConfiguration`:

```ts
interface ProductionSessionRequestConfiguration {
  readonly externalOrigin: string;
  readonly cookies: Readonly<AuthCookieConfiguration>;
  readonly providers: readonly SupportedAuthProvider[];
  readonly now: () => number;
}
```

The configuration is captured from the same actual issuer inputs, not Backend opinion. `now` is the identical function reference required by existing SQL/issuer validation. Origin is canonical URL origin. Core/CSRF/provider secrets are not returned. Existing prepare/persist/discard/close methods and all held persistence outcomes remain intact.

`createAuthenticatedRequestResources({ issuer: ProductionSqlSessionIssuer, configuration: AuthenticatedRequestConfiguration })` is exported from the new Backend `auth.ts`, not mounted anywhere. `AuthenticatedRequestConfiguration` extends the above exact origin/cookie/provider/clock pins and requires:

```ts
readonly lifetime: AbortSignal;
readonly requestDeadlineMs: number;
readonly demo: { readonly enabled: boolean; readonly readOnly: boolean };
readonly readAccess: readonly AuthenticatedReadAccess[];
```

Each access rule has **exact** `action: "read"`, a nonempty token-like `resource`, and either `{kind:"authenticated"}` or `{kind:"global-permission", permission:GroupPermissionKey}`. Duplicate resources, unknown permission keys, invalid rules or mismatching issuer pins reject construction. No boolean authorization callback or wildcard rule exists. Other action/resource pairs deny.

P must supply the actual full already-owned native runtime, not the public guarded facade or a second DB. H must supply that resource's real lifetime and actual demo/deadline configuration, then use the genuine returned issuer and `issuer.requestConfiguration` to construct the adapter. The adapter returns:

- `configuration`: captured read configuration.
- `services: Pick<RequestServices, "resolvePrincipal" | "authorize">`; H must explicitly retain/merge the actual setup resolver.
- `getCurrentBackendUserAsync(context: RequestContext): Promise<ProductionSessionRequestUser>`.
- `getRequestLeaseAsync(context: RequestContext): Promise<SqlAuthorityReadLease>`.
- `closeAsync(): Promise<void>`: closes/drains only this adapter, **not** the supplied issuer or MAIN resource.

H disposal order is adapter drain, genuine issuer drain, then MAIN retirement, with actual failures retained and all obligations attempted. Never close the adapter/owner from inside work that its close is awaiting. No RuntimeContribution/routes/listener/SSR enrollment is introduced by A.

## Genuine lease and profile association

The existing projected request reader now records leases only after its own actual same-owner `authority.reader` admission returns authenticated. Its private per-owner WeakMap retains the original frozen identity, captured admission signal/deadline and exact private credential selector. It accepts no supplied admission DTO or registration callback. Another owner's lease, fabricated object or issuer-scope lease not admitted through this projection cannot access the new profile function. Released/invalidated/retired/expired leases reject through original lifetime/currentness plus owner closing gates.

Public Auth read function is `readProductionSessionRequestUserAsync(issuer, lease, operation): Promise<ProductionSessionRequestUser>`. It resolves the issuer's original private owner and accepts only that owner's projected-admission registration. Under the captured full runtime it:

1. Clamps work to original admission deadline and real opaque host expiry; joins actual owner/original admission/lease lifetimes.
2. Awaits the genuine lease's currentness assertion.
3. Executes one bounded profile SELECT joining the **actual exact credential row** to its admitted user. Opaque selection matches token/user/original stored expiry; API-key selection matches actual key ID/user, with the original reader's hash/provider witness revalidation on either side.
4. Requires exactly one representable row, actual nullable name/email/image, valid normalized `auto|light|dark`, and actual `credentials|ldap|oidc`. Repeated projections must preserve the privately recorded provider.
5. Awaits genuine currentness again before publishing an immutable user with **actual expanded lease permissions**, never an empty/fabricated grant list.

`ProductionSessionRequestUser` contains `id`, nullable `name/email/image`, `colorScheme`, `provider`, and readonly real `permissions`. No password/hash/key/token/account secret or raw native SQL error is returned. The provider-to-credential association is established by exact joined row plus genuine before/after witness assertions; no new revision, atomic multi-query snapshot, historical/ABA or through-COMMIT guarantee is claimed.

Owner request read/admission tasks are registered before deferred dispatch. Owner close publishes its gate, captures those actual promises before abort, and waits their real all-settled completion alongside existing authority/scope/producer cleanup. Abort/expiry is not treated as physical settlement. Read-operation rejection remains its caller's result; completed read rejection alone is not misreported as resource-cleanup failure. Backend request release additionally waits its own started profile promises plus actual lease release. Direct raw lease release does not invent ownership of separate SQL profile work; the SQL owner still owns/drains that work.

## Backend boundary

- Request URL origin and optional Host must match pinned origin; forwarded headers do not select origin/configuration.
- Exactly one admission branch: present legacy `ApiKey` selects its existing strict `id.token` reader; otherwise configured session cookie selects opaque reader. Present malformed/rejected API key never falls back to cookies. No Bearer/JWT/new expiry interpretation exists. Existing cookie parser rejects duplicates/bad decoding. Legacy API-key-first precedence is preserved; its old fallback-on-rejected-key behavior is intentionally not copied, as this approved read tranche requires one selected credential.
- Actual request/application/main-adapter signals and finite safe deadline are captured. Opaque work is clamped to actual host expiry; API keys have no invented expiry.
- Lease release is registered with actual request `onDispose` **before awaiting profile projection**. Registration/projection failure performs idempotent awaited cleanup. Original primary and cleanup failures are retained privately behind sanitized error objects; no raw causes or credential values are exposed.
- Frozen returned principal object is the private WeakMap key. Accessors require matching original request/requestId/signal/disposer references as well as that exact object; a copied principal with the same subject is not authority. Application's coordinator-owned same-object freezing change is required.
- Authorization rereads genuine user/currentness and runs actual authenticated/global-permission/demo query policies for exact configured read pairs. Unknown actions/resources, foreign principals, failed provider/currentness or wrong request signal deny. Resource-specific board/integration policy and protected native mutation authority remain R/P responsibilities, not replaced by this envelope.
- Shared close gate/release promises publish before abort/reentry, actual read promises drain, no timer substitutes for native completion, and caller-owned issuer/DB are not closed here.

## Review and deferred checks

Independent review should focus on same-owner registration, exact credential/profile/provider association, no late principal/profile after release/close, task-registration-before-dispatch, request release/profile drains, reentrant close, malformed-key nonfallback, actual user/permission DTO compatibility, sanitized primary+cleanup retention and no publication/COMMIT widening. There are no new casts, `any`, comments or tests.

After all reached source inputs freeze, coordinator runs focused lint and target types with complete diagnostics. Only then use fresh synthetic SQL to exercise opaque/key admission, actual profile/provider/null/color/grants, foreign/fabricated/released leases, key replacement during bcrypt, expiry/deadline clamps, failed disposer registration, late native profile completion and real shutdown/restart. No success in those checks enables HTTP login/logout/renew publication, protected writes or streams automatically. Their existing held paths remain unchanged.
