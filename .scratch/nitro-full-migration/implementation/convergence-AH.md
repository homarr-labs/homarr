# Convergence AH — enroll genuine authenticated reads now

## Decision

The next product tranche can mount the existing same-owner Auth request bridge and exactly eleven native read RPCs. Construct the issuer **inside the already-owned native persistence closure**, after migrations/content/epoch readiness, and return only the existing request adapter. Do not expose a raw runtime getter, create another connection or authority, or wait for login publication to implement this read join.

This is a proposed source implementation scope, not an implemented or runtime-verified enrollment. Local/LDAP/OIDC issuance, renewal/logout HTTP success, protected domain writes, private SSR and subscriptions remain separate held work. A fresh installation with no genuine credential rows does not become usable for authenticated reads merely by mounting them: genuine login/onboarding issuance is the next writer tranche, not something to fake with a demo principal.

Only this new report is written. Ordinary source and the requested `evening-A-auth.md` / `evening-A-read-implementation.md` were read. No product edits, commands, lint/typecheck/tests, application execution, native/SQL access, credentials/config-file contents, environment/real-data access, live calls, SDK-internal re-audit or nested agents occurred. The interrupted empty patch invocation returned a transport error; the target was still absent immediately before this actual add.

## Current source, not historical blockers

| Exact file                                                                                   | Current fact                                                                                                                                                                                                                             |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/backend/src/server/host.ts:21-28` and `compose.ts:9-17`                                | The actual lazy host now calls `composeApplication`, which calls `createPublicHostRuntime`. The evening report's foundation-only-host blocker is obsolete. `host.ts` already coalesces startup/disposal.                                 |
| `apps/backend/src/server/runtime-composition/runtime.ts:71-75`                               | Constructs one `createNativeMainPersistenceResourcesAsync`, awaits readiness, then obtains the schema through its admitted `runAsync`.                                                                                                   |
| `apps/backend/src/server/runtime-composition/native-main-persistence.ts:216-235,267,361-405` | The same native owner initializes the SQL epoch before reporting ready. Its actual `PersistenceRuntime` remains closure-private; the returned facade has only engine/phase/run/readiness. This facade cannot satisfy the issuer factory. |
| `packages/contracts/src/request.ts:1`                                                        | Authenticated principal is now `{kind:"authenticated", subject:string}`. No fabricated `sessionRevision` remains.                                                                                                                        |
| `apps/backend/src/server/application.ts:88-106`                                              | Validates then freezes the **returned object itself**, not a spread copy. Preserve this exact identity.                                                                                                                                  |
| `apps/backend/src/server/runtime-composition/auth.ts:68-74,125,212-225,288-290`              | The accepted bridge exists but is not mounted. It binds the original frozen principal to its genuine request association/lease in a private WeakMap.                                                                                     |
| `packages/auth/nitro/production-sessions/index.ts` and `packages/auth/package.json:19`       | The factory, request pins, projected reader/profile functions and types already have a public server leaf. No new authority export is needed.                                                                                            |
| `packages/api/src/nitro/assembly/authenticated-read.ts` and `native-read-resources.ts`       | Concrete eleven-leaf contribution and actual SQLite resource factory already exist and have package exports. Reuse these; do not reconstruct whole family routers in Backend.                                                            |
| `apps/backend/src/server/runtime-composition/public-settings.ts:58-74` and `assembly.ts:166` | Enrolled request services still resolve anonymous and deny protected requirements. This is the service merge to replace, retaining the actual setup resolver.                                                                            |

`runtimeJoinSlots` is a static descriptive inventory, not the runtime authorization mechanism. It still says authenticated-principal is unjoined; a future source mount should update that narrowly without claiming physical proof or clearing other holds.

## Actual issuer factory and startup inputs

Public import: `@homarr/auth/nitro/production-sessions`.

```ts
createProductionSqlSessionIssuer(
  runtime: PersistenceRuntime,
  configuration: ProductionSessionIssuerConfiguration,
  sqlConfiguration: AuthSessionSqlConfiguration,
  ldap: ProductionSessionLdapResources,
  requestApiKeys: ProductionSessionApiKeyConfiguration,
): Promise<ProductionSqlSessionIssuer>
```

This is the existing factory at `packages/auth/nitro/production-sessions/service.ts:644-680`, not a suggested new API. It creates its own one private SQL authority/producer from the supplied full runtime, registers the returned issuer in `productionSqlIssuers`, and closes its SQL owner on construction failure. The issuer does not own or close MAIN's physical runtime.

The exact required configuration is:

- `ProductionSessionIssuerConfiguration` (`service.ts:67-75`): `origin`, `coreSecret`, `maxAgeSeconds`, `updateAgeSeconds`, `providers`, `oidc` or null, `bodyBudget`.
- `origin` (`production-sessions/origin.ts:6-12`): `externalBaseUrl`, `cookies:{prefix,useSecureCookies}`, `csrfSecret`, `csrfLifetimeSeconds`, `now`.
- `bodyBudget` (`production-sessions/bounded-body.ts:5-7`): `maximumBytes`.
- `AuthSessionSqlConfiguration` (`packages/db/runtime-auth-session/contracts.ts:89-95`): `lifetime`, `maximumSnapshotRows`, `sessionMaxAgeMs`, `maximumAbsoluteClockSkewMs`, `now`.
- API keys: exactly `{type:"disabled"}` or `{type:"approved-stored-bcrypt-reader"}`. This is an explicit resource-owner decision, not inferred from a row count or enabled provider names.
- `ProductionSessionLdapResources`: null, or actual `{configuration, createClient, createId}`. `configuration` is `LdapConfiguration` from `@homarr/auth/nitro/verifiers`, with bind distinguished name/password, base/scope and username/mail/group attributes and optional filters. The public verifier leaf exports the real `createLdapClient(uri)`; it constructs `LdapClient(new Client({url:uri}))`, not a stub. Client construction stays lazy until genuine LDAP verification.
- OIDC configuration is the real `IssuerOidcConfiguration` structurally required by the factory: `name`, `issuer`, `clientId`, `clientSecret`, `tokenEndpointAuthMethod`, `scope`, `redirectUri`, `redirectProxyUrl`, `forceUserinfo`, `dangerousAccountLinking`, `dangerousCredentialsLinking`, `nameAttribute`, `groupsAttribute`, `groupsLocalManagement`, and real `fetch`. Backend need not deep-import that non-exported type; derive `NonNullable<ProductionSessionIssuerConfiguration["oidc"]>`.

Capture one `now` reference, normally `Date.now`, and pass that identical function into issuer origin and SQL configuration. Enforced pairing is `sessionMaxAgeMs === maxAgeSeconds * 1000` (`sql-persistence.ts:397-404`). Use the real MAIN lifetime for SQL and adapter; never a standalone permanently-live signal. Provider arrays must be nonempty, valid and duplicate-free; enabled LDAP requires actual LDAP resources, enabled OIDC requires actual OIDC configuration. Do not quietly drop a configured provider to make startup pass.

The current startup loader (`apps/backend/src/server/startup-configuration.ts`) has **no Auth configuration or secrets/resource construction at all**. `packages/auth/env.ts` describes existing product provider/cookie/session-duration settings, but reading/importing the legacy Auth configuration is not a ready native startup factory; it brings legacy environment/Next/global DB behavior. The native factory requires explicit core/CSRF secret inputs and update age/budgets/skew. Those must be supplied by the actual server-private startup configuration and validated, not generated placeholders or an invented already-existing key authority. No real values were accessed here.

Smallest startup amendment: add an explicit discriminated public-only/authenticated-read configuration to the existing private startup input; parse the actual server-only issuer settings, LDAP/OIDC descriptors, API-key mode, demo settings, request deadline, row/body budgets and product build version. Keep functions (`now`, real `fetch`, `createLdapClient`, `createId`) out of serialized configuration; construct them in `compose.ts`. Keep secret-bearing Auth configuration **outside** `PublicHostConfiguration`, the returned host configuration and render/hydration payload. Pin its external origin to `configuration.host.baseUrl`. Preserve real retained key ownership; do not recycle the data-encryption key as core/CSRF material.

`NativeReadResourcesInput.createId` is genuinely required even though its selected reads do not call it. Reuse `createId` from `@homarr/common`, not a throwing/no-op ID factory. Backend currently lacks a direct `@homarr/common` dependency; add that one workspace declaration if this import is adopted. The existing `providers()` callback returns captured real `{enabled, oidcGroupsLocalManagement}`. `version` must come from actual build/startup metadata, not Backend's `0.0.0` package version used as a product-version substitute. None of these callbacks grants write authority.

## Smallest single-native-owner construction

Proposed new method on the existing native MAIN result, **not an existing API**:

```ts
createAuthenticatedReadResourcesAsync(input: {
  readonly issuer: ProductionSessionIssuerConfiguration;
  readonly sql: Omit<AuthSessionSqlConfiguration, "lifetime">;
  readonly ldap: ProductionSessionLdapResources;
  readonly apiKeys: ProductionSessionApiKeyConfiguration;
  readonly requestDeadlineMs: number;
  readonly demo: AuthenticatedRequestConfiguration["demo"];
  readonly readAccess: AuthenticatedRequestConfiguration["readAccess"];
}): Promise<AuthenticatedRequestResources>
```

Implement it in `apps/backend/src/server/runtime-composition/native-main-persistence.ts` using the closure's actual `runtime`, lifetime and initialization signal after `assertCurrent()`. Its essential construction calls are:

```ts
const issuer = await createProductionSqlSessionIssuer(
  runtime,
  input.issuer,
  { ...input.sql, lifetime: ownerLifetime },
  input.ldap,
  input.apiKeys,
);
const requests = createAuthenticatedRequestResources({
  issuer,
  configuration: {
    ...issuer.requestConfiguration,
    lifetime: ownerLifetime,
    requestDeadlineMs: input.requestDeadlineMs,
    demo: input.demo,
    readAccess: input.readAccess,
  },
});
```

Here `ownerLifetime` is captured from MAIN's own lifetime and real initialization signal. `runtime` must be narrowed by real readiness/acquisition checks; no cast of the guarded facade. Retain both objects privately as soon as acquired. Return only `requests`, which exposes the existing Auth-bound read services/accessors; do not return the issuer's prepare/persist methods or full native runtime.

Integrate construction into the native owner's existing operation/cleanup machinery rather than inventing a resource framework:

1. Publish a single-construction/pending gate and register its actual settlement promise before deferred dispatch. Reject concurrent/repeated installation rather than creating two issuers. Capture immutable configuration before asynchronous work.
2. Keep acquisition settlement separate from caller-facing final currentness checks. If shutdown wins after the factory returns, the acquired issuer must already be privately retained for cleanup; a rejected outward promise must not lose it.
3. On adapter construction failure, attempt adapter cleanup if acquired and issuer cleanup, retain primary plus cleanup errors, and let the runtime constructor's existing outer catch retire MAIN. Do not call `dispose()` from inside a registered task that MAIN disposal is awaiting.
4. Extend the existing cleanup obligations to close/drain request adapter first, issuer second, then existing helper/proxy/runtime. Attempt every obligation despite preceding errors; preserve the existing coalesced `dispose()` promise and closed/close-failed distinction.
5. MAIN publishes its closing gate/abort before awaiting actual initialization/construction/native-operation settlement. Application shutdown already stops dispatch and drains actual requests first. Issuer/adapter close must settle real admission/profile/bcrypt tasks, not merely observe abort. MAIN remains the sole physical close owner.

In `runtime.ts`, call this method immediately after `await persistence.ready(options.startupSignal)` and before dependent RPC construction/assembly. The existing guarded runtime stays unchanged for settings/RPC reads. No DB/authority/schema changes or raw getter are needed.

## Exact request admission and eleven-leaf enrollment

Merge services explicitly in `assembly.ts`:

```ts
const services: RequestServices = {
  resolvePrincipal: requests.services.resolvePrincipal,
  authorize: requests.services.authorize,
  resolveSetup: options.settings.services.resolveSetup,
};
```

Do not spread settings last and accidentally restore anonymous resolution. Preserve `application.ts`'s exact principal object and original request/requestId/signal/onDispose references. `requests.getCurrentBackendUserAsync(context)` and `getRequestLeaseAsync(context)` reject copied principals and mismatched context associations. Never look up a lease by subject, deserialize it, or independently authenticate a second time.

The existing bridge selects present `ApiKey` before the configured opaque cookie (`auth.ts:253-261`); malformed/rejected/disabled keys do not fall back to a cookie. Duplicate-cookie parsing fails. Joined duplicate API-key values fail the existing selected-reader validation rather than authorizing via the cookie. Missing credentials can be anonymous; malformed, unavailable or noncurrent authority cannot become authenticated. Real permissions come from the original expanded lease identity, and current user/profile comes from the same issuer's bounded exact-credential join. Opaque work is clamped to stored host expiry; API keys gain no invented expiry.

Construct existing native resources using the same physical schema obtained from MAIN:

```ts
const reads = createAuthenticatedReadAssembly(
  createNativeReadResources({ schema, version, createId, providers }),
);
```

Use exports `@homarr/api/nitro/assembly/authenticated-read` and `@homarr/api/nitro/assembly/native-read-resources`. `reads` is the existing contribution `{revision,id,router,leaves}`, not a bare router. Mount only `reads.router` and validate the exact `authenticatedReadLeaves` set, metadata path, query kind, guarded-demo marker and actual protected/permission policy. Whole router-family factory returns contain writes; the assembly already excludes them.

| Native leaf / exact HTTP suffix under `hostPath(configuration,"/rpc")` | Exact outer Auth read rule and retained inner policy                                               |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `info.getInfo` / `/info/getInfo`                                       | `action:"read", resource:"info.getInfo", policy:{kind:"authenticated"}`                            |
| `serverSettings.getAll` / `/serverSettings/getAll`                     | `global-permission:"admin"`                                                                        |
| `serverSettings.getBoardSettings` / `/serverSettings/getBoardSettings` | `global-permission:"admin"`                                                                        |
| `user.getPreferences` / `/user/getPreferences`                         | authenticated; preserve actual self/admin target check in `routers/-identity/preferences.ts:24-27` |
| `user.getTourStatus` / `/user/getTourStatus`                           | authenticated; actual selected user query                                                          |
| `group.getAll` / `/group/getAll`                                       | `global-permission:"admin"`                                                                        |
| `group.getPaginated` / `/group/getPaginated`                           | `global-permission:"admin"`                                                                        |
| `group.getById` / `/group/getById`                                     | `global-permission:"admin"`                                                                        |
| `group.selectable` / `/group/selectable`                               | authenticated; permissions included only when actual source admin condition permits                |
| `group.search` / `/group/search`                                       | `global-permission:"admin"`                                                                        |
| `apiKeys.getAll` / `/apiKeys/getAll`                                   | `global-permission:"admin"`; existing projection excludes stored key hash                          |

These eleven resources are the complete exact readAccess mapping; there is no namespace wildcard. Proposed `authenticated-rpc.ts` creates eleven exact `FetchContribution`s with `phase:"rpc"`, `descendants:false`, protected action/resource above, and one existing `RPCHandler(reads.router,{allowMethods:["POST"]})`. Use the already-established `public-rpc.ts` handler/prefix pattern, not a tRPC bridge or SDK adapter rewrite. Request path must match its exact leaf; unknown paths/mutations/subpaths never enter the private handler. Unknown requirements deny. Native procedure middleware still enforces its real policies; outer authentication is not permission to skip them.

Register these exact routes **before** the current broad public RPC contribution at the same phase. `createApplication` authorizes before handler invocation; registering a protected descendants-wide `/rpc` contribution would deny health and public settings even when its handler intends to pass. Likewise the existing public adapter returns 404 for unmatched requests, so placing private routes after it makes them unreachable. Keep only two public source leaves and the separate public health handler; no anonymous private namespace is introduced.

### Native BackendContext and finite output

For a selected private request:

1. Obtain the genuine current user and original lease from `requests` using the unchanged outer context. Join request and lease lifetime for finite private work, while keeping the original outer signal for Auth association/authorization calls.
2. Use guarded MAIN `runAsync(async (database, admittedSchema) => ...)`; require `admittedSchema === schema`. Do not export/store the admitted DB outside that operation or describe it as the raw physical connection.
3. Reuse `createSetupBackedContext` from `@homarr/api/nitro/resources/setup-read` (actual source `packages/api/src/nitro/resources/-setup-read/context.ts`). It accepts an authenticated native principal `{kind:"authenticated",user}` without any revision. `SetupReadAdmission` is `{database,schema,signal,assertCurrent}`; input signal must exactly equal this admission signal. Supply the actual request, base URL, demo, effect/onDispose forwarding and real `{operators:{eq},now}` setup resources. This synchronous fence is **not** async credential currentness.
4. Let existing native policies and SQL execute. Await the RPC response body to a finite representation inside the admitted operation, with cancellation and actual reader settlement on abort/failure. Set `active=false` only in its finalizer, as the existing public adapter does. Do not mount streams or retain live native queries behind a returned response.
5. Reassert Auth currentness through the existing `requests.getRequestLeaseAsync(context)` immediately before releasing finite private output; check MAIN and signals again after actual scoped SQL settlement. That accessor uses the private original bounded operation; do not invent a longer deadline or release the returned lease yourself. Request disposal owns release.
6. For final delivery, the application currently only checks request/application cancellation (`application.ts:71-81,224-290`), not credential lifetime/currentness. A narrow private-response publication check and lease-linked cancellation are required if claiming that stronger boundary. Add a request-local callback/signal hook to the existing response path, or keep the tranche's claim explicitly at finite RPC serialization/enrollment until it is joined. No generic response framework, fake revision or polling claim is needed. Deadline-aware finite body cancellation must not treat cancellation as physical completion. No claim of human/client receipt, cross-process instant revocation or atomic DB+HTTP delivery follows.

`createBackendContext` copies its **native** user principal internally; that is fine only because the Auth WeakMap remains keyed by the unchanged outer `RequestContext.principal`. Never hand the copied native principal back to Auth accessors. Preserve the real full user projection; no hardcoded color scheme, empty permission list or provider substitution.

## Public compatibility and ordinary self-hosting

Do not conceal these current guards when turning on global genuine principal resolution:

- `public-rpc.ts:116-118` rejects authenticated outer principals, and creates only anonymous native input. To keep the two public settings reads working for signed-in clients, give that exact public adapter the real request-user accessor and construct actual anonymous/authenticated native input according to the outer principal. Restrict matching to its exact two accepted paths and preserve its two-leaf validation; an unmatched path must pass before touching native SQL. Do not force an authenticated outer request to anonymous or widen its registry. `PublicBackendInput` currently allows only anonymous; use the existing native `SetupBackedContextInput` contract or a precisely typed union for this amendment, not a cast.
- `public-culture.ts:67,109-112` deliberately rejects private rendering and emits an anonymous public preparation. Leave private SSR held or implement it in its separately owned renderer tranche. Do not call it with a forged anonymous context merely to avoid the guard. Its guest locale mutation also rejects authenticated principals at lines153-154; do not silently present it as authenticated preference persistence.
- Current startup is a **fresh loopback harness**, not normal production configuration: literal `127.0.0.1`, HTTP loopback origin, empty base path, fresh-only DB, existing-file refusal, private POSIX ownership checks and trusted-origin-equals-listener check (`startup-configuration.ts:13-18,124-156,178-188,229-250`). Actual `captureHostConfiguration` already accepts canonical HTTP(S) origins, normalized base paths and fresh/existing SQLite. Separate the explicit safe fresh mode from normal server startup rather than keeping fresh loopback/Darwin-like ownership semantics as product prerequisites.
- Normal deployment must permit an explicit bind hostname independently of canonical external HTTP(S) origin, existing supported SQLite path and migration assets, with platform-appropriate file security. No Cloudflare/tunnel is required. Preserve trusted-origin/Host validation: a reverse proxy must supply the configured canonical host/request URL; do not derive authority from arbitrary forwarded headers. `apps/backend/server/entry.ts` currently serves HTTP via the existing Bun entry, with `trustProxy:false`; external HTTPS can terminate at the normal user's reverse proxy. Listener binding is explicitly not application readiness.
- `public-culture.ts:138-140` also imposes loopback for guest locale mutations. Its normal-server amendment can rely on the already-present explicit canonical origin/SameSite/content/body validation instead of a loopback hostname whitelist; this does not authorize protected writes or private rendering.
- Issuer OIDC routes are hardcoded to `/api/auth` and exact callback/proxy paths (`service.ts:205-209,389-392,451,465`). Read RPC routing can use MAIN's existing basePath. Actual Auth HTTP lifecycle with a nonempty basePath needs a separate real issuer route amendment; do not spoof incoming URLs or advertise that it already works.

## Exact proposed product write scope

No paths in this table were edited by AH.

| File                                                                           | Smallest allocated change                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/backend/src/server/runtime-composition/native-main-persistence.ts`       | One owner-private Auth construction method, retained issuer/adapter acquisition, construction drain and adapter→issuer→MAIN cleanup. Keep existing guarded runtime, epoch initialization and coalesced disposal.                            |
| `apps/backend/src/server/runtime-composition/contracts.ts`                     | Server-private authenticated-read construction/startup types derived from the actual exported Auth contracts. Do not embed secrets in `PublicHostConfiguration`.                                                                            |
| `apps/backend/src/server/runtime-composition/runtime.ts`                       | Construct Auth after ready, create existing native eleven-leaf resources/contribution from same schema, build finite routes, pass genuine request services/resources to assembly.                                                           |
| New `apps/backend/src/server/runtime-composition/authenticated-rpc.ts`         | Exact eleven query route enrollment, metadata/policy validation, real native BackendContext/setup, finite serialization/currentness/cancellation. One concrete adapter; no new wrapper framework.                                           |
| `apps/backend/src/server/runtime-composition/assembly.ts`                      | Exact service merge, private routes before broad public handler/404 sentinels, dependent ownership/readiness and error propagation. No public descendants-wide protected fallback.                                                          |
| `apps/backend/src/server/runtime-composition/public-rpc.ts`                    | Preserve exactly two public leaves; early exact matching/pass and actual authenticated public BackendContext input instead of rejecting valid signed-in reads.                                                                              |
| `apps/backend/src/server/startup-configuration.ts` and `compose.ts`            | Genuine private Auth configuration/resources and build version; retain a separately explicit fresh mode and support ordinary self-host bind/origin/existing paths. No legacy global Auth/DB import.                                         |
| `apps/backend/package.json`                                                    | Only missing direct `@homarr/common` workspace dependency if using its existing CUID2 factory. Existing Auth/API/DB/oRPC/verifier exports cover the rest. Coordinator owns any resulting lock update.                                       |
| `apps/backend/src/server/runtime-composition/join-slots.ts`                    | Narrow source-enrollment description; do not clear writer/private-SSR/physical-production holds.                                                                                                                                            |
| `packages/contracts/src/request.ts` / `apps/backend/src/server/application.ts` | Only if final private-response delivery gating is implemented: request-local prepublication/currentness and cancellation signal, preserving original principal, drain and coalesced disposal. No revision/identity-copy changes are needed. |
| `apps/backend/src/server/runtime-composition/public-culture.ts`                | Separate normal-server guest-locale hostname restriction removal if normal deployment is part of the same allocation; no anonymous downgrade/private SSR shortcut.                                                                          |

Leave `packages/auth/nitro/production-sessions/{service,sql-persistence,persistence}.ts`, Auth SQL authority and native API router bodies unchanged for this read mount. Existing API/Auth exports already exist; no new authority export, migration or SDK-internal work is necessary. `runtime-composition/index.ts` need change only if the coordinator deliberately exposes the new Backend-private adapter; internal direct imports do not require a barrel export.

## Explicit read versus HTTP-success lifecycle boundary

**Can ship next:** actual credential-bearing HTTP request admission using existing stored opaque sessions/API keys; real user/permissions; eleven finite query RPCs with exact policies, same MAIN resource, revocation/currentness and genuine request/owner drains. No second authority or native connection. After source implementation, coordinator owns focused validation and isolated synthetic credential provisioning; AH performed none.

**Cannot claim by enrollment:** local/LDAP/OIDC login success/cookie, due/not-due renewal success, logout success/cookie clearing, native protected writer authority, usable fresh-install login, private SSR or subscriptions. `IssuerPersistenceOutcome.publication` is still always `"held"` (`sql-persistence.ts:93-102,829,933`); `publishPreparedIssuerOperation` still always throws (`persistence.ts:198-200`). Keep those endpoints unmounted or return an explicit unavailable result without dispatching preparations/native writes. Do not spend a login mutation and then pretend its held outcome is a normal HTTP success.

The next bounded writer tranche is the real owner-private commit/publication lifecycle described in `evening-A-auth.md`, not relabeling outcomes: actual establish witnesses and login effects; due-renewal newly admitted lease rather than stale previous-expiry lease; separate no-write not-due completion; genuine logout fence/drain/deletion and matching cookie expiry; actual LDAP/OIDC protocol/body/disconnect settlement; retained ambiguity without retry/compensation; compatible authority/grant/validity through native COMMIT where required. Pure OIDC provider/CSRF/redirect preparations also lack a general publishable completion branch today. Existing prepared response objects are not publication authority.

When those routes are genuinely enabled, the exact owned Auth lifecycle endpoints must let their issuer perform its own admission rather than acquire an outer generic lease that renewal/logout invalidates. That narrow transport exception is not needed for this read-only tranche and must not become an anonymous `/api/auth/**` capability. Existing write/COMMIT holds remain authoritative until their actual join exists.

Move directly from this concrete construction/enrollment allocation to source implementation, then scoped validation, then the actual issuance/publication tranche. Do not create another research-only wrapper lane or claim a working fresh product from an unmounted read bridge.
