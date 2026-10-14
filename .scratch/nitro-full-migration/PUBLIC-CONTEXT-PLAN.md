# Optional D: genuine read-only native context

2026-10-11. Planning only; this note is the sole write. Certificate six, home type cleanup, localization, context/procedure, accepted steps, Auth policy, legacy claims/schema, G and host sources stay frozen. No implementation, commands, checks, database access, network, environment/credentials, installs, manifests/lock, listeners/browser/containers, Git or agents were used. No ticket closure or mounting approval follows.

## Selection and actual source

D remains optional: only native `serverSettings.getCulture` and `serverSettings.getBranding`, anonymous and real SQLite-backed. Its missing mandatory setup resources are a producer seam, not a requirement to decide Q16, finish private sessions, or complete UI/editor/onboarding features. B/C can proceed independently under their own accepted gates.

- `packages/api/src/onboarding-claim.ts:21–76`: actual cookie extraction, stored claim parser, SHA256/timing-safe verification and claim-only read gate. The issuance/renewal/deletion paths at 78–117 are excluded.
- `packages/api/src/onboarding-step.ts`: reexports normalization through `router/onboard/onboard-queries.ts`, whose runtime Auth/provider and schema imports also reach transition/write logic. Do not import this barrel into the native server graph.
- `packages/api/src/router/onboard/onboard-queries.ts:14–21,31–35`: original read/fallback/normalization comparator; provider-dependent next-step decisions are outside this adapter.
- Accepted `packages/api/src/nitro/routers/-settings-setup/steps.ts`: reuse its actual `getOnboardingOrFallback` and normalization unchanged, rather than injecting a final onboarding query callback.
- Setup-backed `packages/api/src/nitro/context.ts`: genuine mandatory `BackendSetupResources`, request/effect/disposal fields, discriminated principal and immutable `createBackendContext`; no substitute public context or weakened optional setup fields.

## Source-exact read behavior

1. Cookie name remains `homarr-onboarding-claim`. Split on semicolons, use the first equals separator, trim name/encoded value, and accept the first matching name. Empty value or failed decode returns undefined immediately, including before any later duplicate; preserve decoded content without new normalization.
2. Claim-only access first executes `db.query.users.findFirst({columns:{id:true}})`. An existing user denies and short-circuits; otherwise missing/empty token denies without a claim-row lookup. That is source-computed absence, never a fabricated constant because D does not use claims.
3. For a present token, read `serverSettings` by actual `eq(settingKey, "__onboarding_claim")`. Parse JSON as `unknown`; equivalent guards require a lowercase 64-hex hash and numeric safe-integer `expiresAt`, ignore extra properties, and return invalid on malformed content. Do not add positivity, token-format or TTL rules.
4. Retain `expiresAt <= now` rejection, nonempty token, SHA256 UTF-8 token hash, equal Buffer lengths and actual `timingSafeEqual`. Sample the source clock at callback entry, before the users read, matching the original default-argument timing. No issuance, renewal, random token, writes, cleanup or claim cache.
5. The read gate does **not** test onboarding `finish`; that predicate belongs to excluded issuance. Do not add it as a repair. `currentStep(db)` separately returns the accepted reader's `.current`.
6. Missing onboarding row yields `start`; `user/group/setup/finish` pass through, `settings/integrations` become `setup`, all other/null/undefined steps become `start`. Truthy previous-step normalization remains the accepted reader's behavior. Real SQL failures propagate; they are not denial/default/healthy setup substitutes.

## Future producer allocation and typed ports

After oracle authorization, reserve only NEW `packages/api/src/nitro/resources/-setup-read/**` for the API owner; no writes are granted by this plan.

| Proposed file                         | Concrete responsibility                                                                                                              |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `resources.ts`                        | Read-only `SetupReadAdmission`, `SetupReadResources` and `SetupBackedContextInput` types, borrowing frozen BackendContext types.     |
| `claims.ts`                           | Source-owned cookie/parser/hash/expiry read algorithm above, with actual SQL locally visible, not a whole-service callback.          |
| `context.ts`                          | `createSetupReadResources` builds both real mandatory callbacks; `createSetupBackedContext` calls the frozen actual context creator. |
| `index.ts`                            | Named exports of those two factories and three resource/input types only; no legacy claim or aggregate router exports.               |
| `checks.mts` / scoped compiler config | Only the conditional critical proof below, after G/public graph review; no tests are added now.                                      |

`SetupReadAdmission` borrows `database: BackendContext["db"]`, the matching physical `users/onboarding/serverSettings` schema slice, request signal and a synchronous currentness fence. That fence must represent the actual tracked callback lifetime plus foundation cancellation, not a no-op, auth decision or MVCC claim. Bind only a narrowed SQLite handle from accepted `withDatabaseAsync`; no PostgreSQL-to-SQLite assertion.

`SetupReadResources` supplies typed actual `eq` and a required `now(): number` clock primitive, normally Date.now. Adapter SQL stays inside the two callbacks; no injected `hasUsers`, `isValidClaim`, `getCurrentStep` or finished-controller result. The callback's supplied DB must equal the bound admitted DB; reject foreign/expired use. Fence before each new SQL read and before publishing its result, while awaiting already-started SQL settlement.

Proposed signatures only: `createSetupReadResources(admission: SetupReadAdmission, resources: SetupReadResources): BackendSetupResources` and `createSetupBackedContext(input: SetupBackedContextInput, admission: SetupReadAdmission, resources: SetupReadResources): BackendContext`. Both contexts and callbacks are borrowed admission-local values, not retainable application resources.

`SetupBackedContextInput` uses frozen `BackendRequestResources` plus `BackendContext["principal"]`, `["deviceType"]`, `["demo"]` and a required `baseUrl: NonNullable<BackendContext["baseUrl"]>` from trusted configuration. Derive the claim token with the source cookie parser; install the real setup callbacks and admitted DB through `createBackendContext`. Request/signal and effect/onDispose delegates come from actual foundation RequestContext, never successful placeholders. No SQL, schema, claim/hash or callbacks enter bootstrap payloads.

For D alone, supply `{kind:"anonymous"}`, explicit disabled demo config, source-optional `deviceType: undefined` and explicitly trusted configured baseUrl, not forwarding headers or a Next user-agent parser. Keep the full frozen BackendPrincipal union usable for a later genuinely selected private account; foundation subject/sessionRevision alone cannot fabricate its API user/permissions. Reading a claim cookie is not session verification or cross-origin/CSRF authorization.

## Exact public/type joins, not declarations now

- COMPOSITION, after producer review: `@homarr/api/nitro/resources/setup-read` -> `src/nitro/resources/-setup-read/index.ts`; selected `@homarr/api/nitro/context` -> `src/nitro/context.ts` and `/nitro/contribution` -> `src/nitro/contribution.ts`. Reuse already declared `/nitro/routers/server-settings` and `/nitro/helpers/settings`. Expose `/nitro/helpers/steps` only if a genuine separate consumer needs it; internal same-package reuse needs no extra export.
- Persistence producer/COMPOSITION supply reviewed public runtime/driver types, actual tracked SQLite database/schema, SQL assets/readiness and matching operators. API already declares DB/definitions/auth, oRPC, SuperJSON and development Drizzle; Node crypto adds no library. No new CLI/framework/dependency or wildcard export is proposed.
- Exact compile-time hold: frozen context imports `Session` type-only from `@homarr/auth`, whose root contains next/headers, NextAuth augmentation and configuration/session edges. Erasure prevents runtime evaluation of that import, not transitive type compilation. Do not import the root at runtime or rebuild the context to bypass it.
- Minimal proposed Auth-owner boundary, subject to separate allocation/review: `packages/auth/nitro/context-types.ts`, declared as `@homarr/auth/nitro/context-types`, exports **only** `SessionUser` equivalent to current `DefaultSession["user"] & {id:string; permissions:GroupPermissionKey[]; colorScheme:ColorScheme}`. Dependencies are type-only existing `@auth/core/types` and definitions; no next-auth/root/augmentation/provider/session code or new engine.
- Only a subsequently authorized context type-edge substitution may consume that SessionUser in the existing Omit/Readonly/permission expressions. Prove bidirectional equivalence with the current augmented user type before acceptance. Context/Auth sources remain frozen now; an unused new export alone does not close the current edge. G owners retain exact metadata/DB/common type-closure ownership; no graph rescan or diagnostic suppression was performed here.

## Whole-handler admission and lifecycle

COMPOSITION's future `apps/nitro/src/server/public-rpc.ts` owns the bracket: accepted persistence admission -> SQLite narrowing/matching resources -> borrowed genuine BackendContext -> entire native Fetch/RPCHandler await -> both source SQL reads and output serialization -> revoke/settle admission. `resolveContext` must not return a Database from an already completed `runAsync`.

Construct the two-leaf contribution from the actual settings factory; keep other procedures absent and retain descriptor/path conservation. A per-admission Fetch adapter may capture this borrowed context only during that handler call. Return serialized public response data, never a DB/builder/execute closure. Prove no deferred response-body SQL; if serialization is deferred, keep admission until materialization or hold D. One tracked admission is lifetime tracking, not a transaction/MVCC snapshot.

Foundation owns body cancellation, disposers, abort/stale-result/effect fences and shutdown draining before persistence close. Request disposal cannot restart SQL with an expired context; begun SQL must settle before close/file cleanup. Keep source POST/405, absent-leaf 404, foundation health and anonymous protected-slot denial. No setup/claim routes, extra identities, OpenAPI/MCP publication or private provider execution is allocated.

## Conditional proof and release

Only after G's exact frozen review, producer returns and selected public server runtime/type graph closure, propose a fresh owned real on-disk SQLite resource with actual migrations/initialization, never current data or mocks-as-SQL-proof:

1. Invoke only the two actual native leaves through the admission-wrapped handler; compare current SQL culture/branding source projections, unknown/private-path absence and method behavior. Record source hashes unchanged and truthful users/onboarding state, not a completed-setup claim.
2. Directly exercise the real read-only callbacks, without adding routes: no user + absent/malformed/expired/mismatched claim denies; a matching unexpired stored hash permits, existing user denies; duplicate/malformed cookie and exact expiry boundary follow source. Verify legacy/missing/current step normalization and SQL-error propagation.
3. Verify foreign/revoked DB rejection, cancellation/currentness fences, no private payload/claim leak, serialization before release, deferred-body prohibition and body/error/disposal/shutdown settlement. Controlled primitive clock/lifecycle hooks are not substitutes for the real SQL engine or production auth evidence.
4. Run only authorized scoped lint/typecheck and these critical fixtures with `--no-env-file`, then independent review; no broad suite, live provider or listener/browser experiment is needed for this producer proof.

D is conditionally ready when these exact producer/context/graph/lifetime gates return; unrelated UI/editor work and fully completed private current-session features are not prerequisites. Q16, actual private authentication/session/CSRF/origin policy, claim issuance/transitions, PG execution and full onboarding/UI workflows remain future holds. Neither this plan nor a green two-read proof clears those holds or changes 3100/3200/3210.
