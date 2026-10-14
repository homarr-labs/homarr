# Onboarding2 — actual handler and canonical account producer plan

## Decision

**No existing closed native setup producer can truthfully complete both handlers in a 2–5-file patch.** The concrete blocker is missing fixed onboarding transaction/authority dispatch, not an unknowable native FD requirement. Implement that body, then its real request producer and handlers in separately frozen small leases. Do not release an interface-only patch or change implemented-path arrays first.

This report is the sole write. Inspection used current public repository source, manifests, numbered tickets, DESIGN/CONTRACTS and the latest `.slim` checkpoint. No commands, checks, hashes, evaluation/imports, compilation, tests, SQL execution, Engine/container calls, private configuration/environment/data/secrets, network/documentation requests or nested agents occurred. `packages/auth/nitro/critical-writers/runtime.ts` was deliberately not read: its contextual getter annotation is concurrently allocated. Its eventual exact type must be checked after freeze; adjacent contracts/SQL suffice to reject its use as an existing executable setup writer.

Keep the native file-first-adoption guard unchanged. A future genuinely initialized, seeded, empty-adopted memory runtime and native snapshot can supply setup state plus a ready domain, **not a user/password/session**. This source tranche is disjoint from that future initialization/export experiment and does not authorize it.

## 1. Current executable boundaries, not historical descriptions

| Evidence                                                                                                                  | Actual consequence                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tickets `109-setup-claim-account-group-and-completion.md:13–22`, `110-discovery-and-atomic-setup-board-planning.md:13–22` | #109 owns claim/step orchestration; #110 owns input→plan/atomic setup orchestration. #13/#15 retain canonical account/group construction. #02 owns physical SQL/runtime changes; COMPOSITION owns shared enrollment/exports.                                                                                                                                                                                                  |
| `api/src/nitro/routers/onboard.ts:18–35`                                                                                  | Four implemented source procedures, two pending. No nextStep/completeSetup handler here.                                                                                                                                                                                                                                                                                                                                      |
| `onboard-transitions.ts:18–47`                                                                                            | Two prepared identities; `onboardTransitionsImplementedPaths = []`; builders have no `.handler`.                                                                                                                                                                                                                                                                                                                              |
| `-onboard-transitions/helpers.ts:47–63,798–823`                                                                           | Current nextStep preparation preserves two normalized reads, first-read welcome precondition, second-read no-op and credentials/no-user→user, LDAP/OIDC→group, otherwise setup precedence. **Current paired SQL already has raw previous-step equality and exactly-one-row CAS.** The older sprint report's unconditional-update statement is historical, not today's body. CAS alone still does not prove current authority. |
| Same file `825–947,950–end`                                                                                               | Prepared completeSetup SQL already performs setup→finish CAS, app/integration/secret/board/layout/section/item/reference/settings/Everyone-home writes and claim deletion. It needs an owned transaction and current-authority producer; it is not a handler or a commit service.                                                                                                                                             |
| `api/src/nitro/procedure.ts:53–81`, `resources/-setup-read/context.ts:50–70`                                              | Demo/read middleware, users-first claim checks and current-step reads are genuine **read** guards. They do not authorize arbitrary subsequent `context.db` writes or keep those facts true at COMMIT.                                                                                                                                                                                                                         |
| `db/runtime.ts:609–678,783–815`                                                                                           | Fixed native App/Board commands and Auth-session commands exist. There is no onboarding/init-user/initial-group native command. Generic bounded callbacks are resource internals, not a public setup write capability.                                                                                                                                                                                                        |
| `auth/nitro/production-sessions/sql-persistence.ts:1226–1315`                                                             | Private `dispatchRequestWrite` captures the actual registered request lease/evidence, original decreasing bounds, tracked underlying task and ambiguous outcome. Its only exported domain dispatches are Board replacement and App creation.                                                                                                                                                                                  |
| `backend/.../contracts.ts:16–39`, `auth.ts:540–620`, `native-main-persistence.ts:579–650,694–739`                         | The final-context binding and MAIN dispatch admit exactly those three fixed leaves. MAIN retains raw runtime privately. Adding an onboarding procedure to a generic registry cannot acquire this missing authority.                                                                                                                                                                                                           |
| `auth/nitro/critical-writers/{contracts.ts,sqlite.ts,postgresql.ts}`                                                      | Four candidate kinds cover grant/group and sign-in membership effects, **not setup establishment**. Both driver entrypoints invoke `requireCriticalWriterExecutionJoin`. Reuse their parent-lock/current-membership algorithms, not their hold deletion or candidate actor IDs as authority.                                                                                                                                  |

`CONTRACTS.md:20` and `DESIGN.md:82–86` settle Q16/Q17/Q18: real Auth.js OIDC plus owned local/LDAP SQL sessions without JWT; target-only CA override while proxy retains approved instance anchors; principal-scoped Integration/Widget grants. The implementation/resource/native evidence is missing, not these decisions. Do not reinstate foreign-user grants or report these questions unanswered.

## 2. Full canonical producer call: account is a separate writer

The exact local flow is:

1. Genuine bounded request obtains/retains setup claim through `/api/onboarding/claim`.
2. `onboard.nextStep()` commits start→user when credentials are enabled and there are no users.
3. **`user.initUser(userInitSchema)`** constructs the first credentials user, admin group, admin permission and membership, then user→group if LDAP/OIDC is enabled, otherwise user→setup.
4. Actual credentials sign-in establishes the real opaque SQL session and Everyone membership through the existing issuer/Core credentials bridge. Claim-only access deliberately ceases once a user exists; it cannot stand in for the resulting administrator session.
5. When selected, **`group.createInitialExternalGroup(groupCreateSchema)`** performs group→setup plus the initial external admin group/permission. For external-only setup, real configured LDAP/OIDC login later creates/links the external user/account and reconciles group/Everyone membership using the existing Auth-session producer.
6. `onboard.completeSetup(onboardingCompleteSetupSchema)` commits selected plan→finish and removes the claim. Finish/home navigation uses the committed settings/board and actual session, not inserted finished metadata.

Source account construction is `api/src/nitro/routers/user-establishment.ts:29–49` and `-user-establishment/helpers.ts:45–68`, matching legacy `api/src/router/user.ts:69–115`. `hashPasswordAsync(password)` is `bcrypt.hash(password, 10)` (`auth/security.ts:3–5`). User `provider` retains the physical credentials default; the local producer does **not** fabricate an OAuth `account` row. Group creator/position and provider precedence remain canonical. Move its unsafe ordinary transaction join onto the new fixed native command, preserving the business construction, not invoking the old helper and assuming its transaction becomes authorized.

External-group source is `group-establishment.ts:17–24` and `-group-establishment/helpers.ts:30–69`: similar-name check, ID/max-position construction, exactly-one group-step transition, group insert and admin permission. Preserve the source absence of a fabricated owner/membership. Revalidate name/position under the owned write unit, not only before it.

**completeSetup has no username/password fields.** `validation/src/onboarding.ts:71–112` contains server/board/selections/integrations/apps/Docker/widgets only. Its prepared candidate contains encrypted plan material and `sourceOutput`, never an account input. Do not derive an account from it or assume the seed supplies one: `db/migrations/seed.ts:39–60` seeds a user only in demo mode.

The legacy Next account UI invokes initUser then real credentials signIn with name/password/redirect:false (`onboarding/src/account.tsx:61–82`), retaining login recovery on failure. The migrated Nitro UI currently requests manual sign-in because account actions/sign-in are held (`apps/nitro/.../account.tsx:98–135`). Preserve the existing Next functionality/default navigation; these holds cannot be silently relabeled accepted. No literal `defaultNext` symbol was found in the inspected source searches.

`user.register` is the separate invite-backed writer (`user-establishment.ts:51–74`), **not first-user setup**. Full-app registration and its distinct tenth Auth HTTP path remain required later, with their own canonical writer/publication/enrollment lease. The currently frozen nine Auth descriptors (`backend/.../auth-http.ts:21–55`) stay byte/identity unchanged in phase 1. Neither the onboarding claim endpoint nor initUser counts as that tenth Auth path.

## 3. Exact reusable contracts and concrete resource gaps

Existing signatures/resources to consume, not replace with booleans:

```ts
prepareOnboardNextStepSourceBody(resources, context): Promise<OnboardNextStepSourceCandidate>
prepareOnboardCompleteSetupSourceBody(resources, context, input)
writeOnboardNextStepSqliteSourceBody(transaction, resources, candidate)
writeOnboardNextStepPostgresqlSourceBody(transaction, resources, candidate)
writeOnboardCompleteSetupSqliteSourceBody(transaction, resources, candidate)
writeOnboardCompleteSetupPostgresqlSourceBody(transaction, resources, candidate)
dispatchProductionAppCreateAsync(issuer, lease, operation, mutation): Promise<AppMutationResult>
dispatchProductionBoardPermissionsAsync(issuer, lease, operation, mutation): Promise<void>
readNativeCredentialPolicySync(database, credential, configuration): NativeCredentialPolicy
readNativeCredentialPolicyAsync(database, credential, configuration): Promise<NativeCredentialPolicy>
authCredentialDomainLockStatements(engine): Generator<SQL, AuthCredentialDomain, readonly unknown[]>
allocateAuthCredentialSequenceStatements(engine, namespace): Generator<SQL, AuthCredentialDomain, readonly unknown[]>
```

The last four reside in DB-owned adjacent credential/session statements. They are not guessed public Auth APIs. Domain locking validates ready/native signed64 representation; PostgreSQL takes the singleton FOR UPDATE lock. Credential allocation uses canonical signed64 TEXT decode/native INTEGER or BIGINT binds and head CAS, never JS-number sequence arithmetic or manual domain/head inserts. New local user/group rows alone are not credential rows and should not allocate fake session sequences. The later real sign-in continues to allocate session lifetime/write sequences through `runtime-auth-session/statements.ts:408–448`.

`OnboardTransitionPreparationResources` (`-onboard-transitions/resources.ts:32–43`) needs actual physical schema/operators, createId, enabled-provider choice, logger.warn, four server-setting reads, Docker discovery, connection-test/MissingSecretError semantics and encryption. The concrete binding must supply them from admitted owners:

- Capture providers from the **same** immutable issuer configuration, not legacy `auth/server` environment access. Pin demo/readOnly and provider lifetime through COMMIT. Preserve credentials precedence and the existing LDAP/OIDC group choice.
- Bind `createSecretCodec(approvedEncryptionKey)` from `auth/nitro/policy/crypto.ts:20–33`; its AES-256-CBC random-IV/`ciphertext.iv` format matches source and rejects zero keys. Do not bind the ambient `common/src/encryption.ts:3–9` fallback-zero implementation. No default secret/key is authorized.
- The typed legacy `testConnectionAsync` imports ambient decryptor/logger/factory (`api/src/router/integration/integration-test-connection.ts:1–9`). Injecting that exact import is **not** a closed Nitro producer. Adapt preparation to the actual owned integration-client factory plus codec, preserving required/optional secret-option selection, MissingSecretError and warn-but-continue connection-failure behavior. `-settings-setup/integration-test.ts:10–63` already supplies the draft-only client-resource pattern, but does not cover existing-secret recovery by itself.
- Docker discovery and provider/client I/O stay outside SQL, with the original operation signal/deadline and physical retirement. Existing-resource reads/testing must use current principal-scoped grants under Q18; setup claim is not all-access to existing integrations. Admin authority is freshly checked in the commit unit. Q17 applies to selected real network clients; don't replace them with success callbacks.
- Supply real logger and real setting defaults/merge/serialization from existing owners. No empty logger, all-permission repository, fake client, generic router or caller-supplied SQL/apply callback.

API currently exports onboard and setup-read, but not onboard-transitions/group-establishment (`api/package.json:28–51`). Auth's production-session barrel exports only the two existing fixed dispatches. DB can export new fixed command types through its already-public `./runtime` entrypoint; do not deep-import API code into DB/Auth or give MAIN's public runtime arbitrary write callbacks. Later export amendments belong COMPOSITION, separately from the first source lease and the concurrent invite three-file lease.

## 4. Transaction body the new producer must actually implement

### Admission and request ownership

Create an issuer/SQL-owner-private setup request association from the **original actual Request**, request identity, signal/lifetime/deadline, captured origin/cookie policy, pinned demo/providers and admitted MAIN owner. Store the association privately; a structurally copied principal/claim/lease/plan cannot invoke it. For admin capture the genuine existing SQL-authority lease/evidence by the established `dispatchRequestWrite` lineage. For anonymous setup, capture the real request cookie token and finite original bounds, not a synthetic SQL-user lease.

Use the actual issuer origin guard (`production-sessions/origin.ts:44–114`): canonical origin/host, POST, exact Origin, cross-site rejection, HMAC cookie/header CSRF and expiry. Single-cookie parsing must reject duplicate/malformed setup cookies; the older setup-read parser takes the first cookie and is not sufficient as mutation admission. Bound cookie/token bytes before hashing. Request/CSRF/claim expiry tightens the original deadline, never creates a new budget; retain final clock checks as well as abort signals.

**Existing wire gap:** Nitro `features/onboarding/claim.ts:16–22` posts without CSRF, and Backend currently has no selected claim route. Legacy Next's route checks only Fetch-Site and derives Secure from forwarded protocol; neither is the required new producer. The issuer already exposes `prepareCsrfCookie(request)` (`service.ts:274`) for its HMAC guard. A concrete #109 transport can expose a bounded GET on the onboarding claim resource for this token/cookie, then require it on claim POST and onboarding RPCs. This is a proposed separately reviewed onboarding wire addition, not an existing route or a reinterpretation of Core's `/api/auth/csrf` token. The client must send the actual issued header; no server-generated POST header/CSRF, no guard weakening to make today's client pass. The frozen nine Auth routes need not change.

### One native unit

1. Use SQLite `boundedSqliteTransaction`'s real **BEGIN IMMEDIATE**, same target/K checks and resource lifetime. For PostgreSQL add a **fixed setup admission** alongside existing Auth establishment: real READ COMMITTED verification, credential-domain singleton lock, then compatible table/parent locks before predicates. Empty `SELECT user FOR UPDATE` cannot serialize no-users. Reuse domain-first order and the existing user/account/group/groupMember establishment locks (`transaction-gate.ts:345–371`), plus required permission/setup/claim/plan locks in a reviewed deterministic order. No second pool, async SQLite callback or nested transaction.
2. Read the ready credential domain; do not initialize/adopt it here. For admin reacquire current credential/user/provider/grants using the native credential-policy reader and applicable parent locks. For claim access read no-users and the exact stored `__onboarding_claim` hash/value/expiry in this unit, verify the retained token with source SHA-256/timing-safe equality and current checked SQL/host/config clocks. Claim access stays narrow; no ordinary admin permission is minted by admission.
3. Require writable pinned mode, current owner/operation and exact physical onboarding singleton/id/raw step witness. Preserve normalized middleware compatibility but do not silently repair raw legacy `settings`/`integrations`: current completion SQL still requires raw `setup`. Missing/invalid durable rows are unavailable/conflict, not permission to insert a fallback row.
4. For nextStep rederive provider/no-user choice under the locks, preserving first-read precondition/second-read no-op where compatible. Perform id+raw-step CAS and exactly-one count for a real transition; refuse a stale prepared next-step choice. Preserve void output. Finished installation never reopens, even for admin.
5. For initUser require credentials enabled, user step, no-users for the first-user branch and genuine claim/admin admission. Recheck username uniqueness and max-position; insert canonical user/hash, group/owner/admin permission/membership and user→group/setup CAS together. Hash/IDs are generated by the real source service outside SQL and kept in its private operation; do not accept a remote password hash or remote prepared user DTO as the canonical source producer.
6. For initial external group require group step/current authority and source provider selection; recheck similar name/max-position, then atomic group-step CAS/group/admin-permission writes. Actual external user/account/session creation remains the real provider login producer, not this command.
7. For completeSetup bind the prepared plan to this same final-context/request/leaf and original owner. After network preparation, lock/re-read and compare all relevant existing-board/layout/section/item/reference, integration/secret/app selection and settings witnesses. No guessed revision or shallow plan tag: stale plans must conflict or be rebuilt from the locked observations without repeating provider/network effects. Then perform source setup→finish CAS **and every prepared write and claim deletion in this one unit**, preserving existing board identity/content and source stable IDs/output.
8. Final in-unit gate, immediately before returning to native COMMIT: recheck current credential validity/admin where applicable, original mode/owner/bounds, checked clocks and retained claim expiry/ownership. An operation's own initUser insertion, step change or claim deletion must not be mistaken for foreign invalidation: compare expected post-state and retained locked pre-claim witness; don't demand literal no-users/setup/claim-row existence after deliberately changing them. For a claim-only completion with no account creation, no-users must still hold. Require the exact claim deletion/expected result, not deletion of an unrelated replacement claim.
9. The transaction gate checks decreasing original bounds at actual COMMIT dispatch and settles physical statements/scope/tail/cleanup. If final credential-expiry enforcement needs a tighter gate, add it inside the fixed setup wrapper from the privately captured credential/claim deadline; don't expose a caller `assertAuthorized` callback. Only confirmed successful settlement may return void/sourceOutput. A post-COMMIT publication failure is not rollback or safe retry.

Paired completeSetup business SQL should be relocated/reused under DB ownership as fixed statements with typed physical row values, not duplicated as a second planner. DB must not import `@homarr/api`; keep plan derivation in #110's API helper and encode an explicit fixed plan DTO with comparison witnesses. No arbitrary table names, SQL strings, generic command list or callable bodies. SourceOutput alone is publishable; encrypted candidate/input/internal witnesses are not RPC results.

Keep all other compatible credential/account/user/grant/setup/claim/restore writers unmounted unless they use the same lock/validity conventions. In PostgreSQL the current Auth establishment table locks/domain order provide a concrete reusable basis, not proof that every enabled writer already participates. Do not clear `CriticalWriterExecutionHeldError` globally to obtain setup.

## 5. Exact source leases and truthful phase boundaries

### Phase 1 prerequisite: four DB-owned files, real fixed body, no handler claim

Propose this **specific body implementation** for #02 review, not a completed closed-product release:

1. NEW `packages/db/runtime-onboarding/contracts.ts`: fixed claim/next-step/init-user/initial-group/complete-setup command union, typed row plans/comparison witnesses, finite limits and safe outcomes. Authenticated versus claim evidence remains explicit; no `transactionPredicatesVerified`, generic SQL operation/callback or fake authenticated principal.
2. NEW `packages/db/runtime-onboarding/statements.ts`: real paired predicate/CAS/claim/account-group/plan/final-gate execution. Port the existing paired setup SQL into this owner; reuse ready-domain lock, native policy readers and signed64 allocator only where an actual credential row requires it. Implement both driver bodies, not signatures or unreachable wrappers.
3. `packages/db/runtime.ts`: new fixed `onboardingMutationAsync(operation, mutation, authority, configuration)` analogous to App/Board/session methods, actual capture/admission/active accounting, SQLite target checks, same connection/owner lifetime, quarantine and settlement. Re-export its types at existing `@homarr/db/runtime`; leave open/adoption/schema/migrations/epoch/snapshot behavior unchanged.
4. `packages/db/transaction-gate.ts`: fixed PostgreSQL setup admission/lock sequence plus bounded fixed setup executor, preserving existing App/Board/Auth callers and ambiguity/cleanup behavior. No new public arbitrary-callback API.

Proposed DB signature (not present today):

```ts
onboardingMutationAsync(
  operation: BoundedTransactionOperation,
  mutation: OnboardingMutation,
  authority: OnboardingNativeAuthority,
  configuration: OnboardingSqlConfiguration,
): Promise<OnboardingMutationResult>
```

`OnboardingNativeAuthority` is low-level captured native admin evidence or bounded request-claim evidence, **not independently trusted DTO authorization**. Only the next Auth owner producer may mint/dispatch the actual admitted association. The DB unit still verifies stored authority/predicates; these four files alone must not mark either RPC implemented, mounted or safe. If the reviewed body needs another file, return the exact additional lease rather than hiding it or enlarging phase 1. This is implementable source work while native file/readiness experiments stay held, not permission to execute it now.

### Next Auth lease: five files, actual owned security producer

- NEW `packages/auth/nitro/production-sessions/onboarding.ts`: private setup operation/request/plan registrations, original bounds/origin/CSRF/single-cookie admission, pinned provider/mode, single consumption and complete task settlement. The canonical account hash uses existing `@homarr/auth/security` logic, not new cryptography.
- `packages/auth/nitro/production-sessions/sql-persistence.ts`: retain this producer on the same actual `OwnedSql`/runtime; capture existing admin evidence through real registered authority, track anonymous claim operations without creating a user lease, call the fixed DB method, retain confirmed/ambiguous/post-confirmation outcomes and drain before owner close.
- `packages/auth/nitro/production-sessions/service.ts`: resolve the existing `productionSqlIssuers` WeakMap and captured issuer origin/providers; expose only exact preparation/fixed dispatch for the retained owner, never caller runtime/issuer callbacks.
- `packages/auth/nitro/production-sessions/index.ts`: narrowly export actual producer/operation types and dispatch entrypoints after implementation.
- `packages/auth/nitro/production-sessions/persistence.ts`: retain explicit setup-operation lifecycle/outcome/finite publication association if shared issuer publication is used; do not alter the accepted nine legacy action semantics.

Required new contract shape: prepare an opaque operation from actual Request/original bounds and exact selected setup leaf; dispatch fixed nextStep/initUser/group/completeSetup once using that registered operation. A completeSetup plan is a private registered handle, not a user-submitted candidate. No body callback in these public signatures. Fresh source review must confirm the exact owner/lifetime association before any handler lease consumes it.

Concrete proposed signatures for that review, **not existing callable exports**:

```ts
prepareProductionOnboardingRequestAsync(
  issuer: ProductionSqlSessionIssuer,
  request: Request,
  leaf: "onboard.nextStep" | "onboard.completeSetup" | "user.initUser" | "group.createInitialExternalGroup",
  bounds: IssuerOperationBounds,
): Promise<PreparedOnboardingRequest>
dispatchProductionOnboardNextStepAsync(
  issuer: ProductionSqlSessionIssuer,
  operation: PreparedOnboardingRequest,
): Promise<void>
dispatchProductionOnboardCompleteSetupAsync(
  issuer: ProductionSqlSessionIssuer,
  operation: PreparedOnboardingRequest,
  plan: PreparedOnboardingPlan,
): Promise<OnboardingSetupOutput>
```

The first method must actually register/validate request ownership, CSRF, selected leaf and original bounds; the dispatch methods resolve that exact registration and retained same-owner runtime. `PreparedOnboardingPlan` needs a genuine source-plan registration joined to the same operation/final context, with the encoded fixed DTO and comparison witnesses retained privately. That registration is another required implementation body inside the named Auth/API lease, not something a cast/brand can supply. If its concrete registration cannot establish this lineage, keep completeSetup held and return that exact gap instead of accepting a remote candidate or adding an arbitrary preparation callback.

### Then API handler lease: three files, complete both Onboarding2 source leaves

- `packages/api/src/nitro/routers/onboard-transitions.ts`: add `createOnboardTransitionProcedures(finalContext, resources)` with **real `.handler`** calls to preparation + the privately bound fixed dispatch; enforce exact final-context identity. nextStep returns void; completeSetup returns only original sourceOutput after confirmed commit. Update implemented/pending arrays only with those bodies; retain separate binding/mount/native acceptance status.
- `packages/api/src/nitro/routers/-onboard-transitions/resources.ts`: concrete typed request-bound dispatch/owned codec/client/settings/discovery inputs; remove transaction-database injection as the activation mechanism. This is not where request/credential authority is invented.
- `packages/api/src/nitro/routers/-onboard-transitions/helpers.ts`: keep canonical planner/IDs/layout/setting/output behavior, adapt owned client/codec inputs, encode typed fixed plan plus locked comparison witnesses and delegate relocated paired SQL rather than leave competing write implementations. Preserve current nextStep CAS and genuine preparation errors.

`onboard.ts`'s stale pending list needs a **separate explicit one-file integration lease** once the two factories are joined, not a silent fourth API file. It must consume only the two accepted transition bodies alongside its existing four leaves.

### Account/group closure and MAIN enrollment are additional, indispensable leases

- Account/group exact source lease: `user-establishment.ts`, `-user-establishment/helpers.ts`, `-user-establishment/resources.ts`, `-group-establishment/helpers.ts`, `-group-establishment/resources.ts`. Replace only initUser/initial-group write coupling with the fixed producer, preserving canonical algorithms. Leave register/create and their independent binding holds unchanged. Group factory already has a real handler and need not be gratuitously rewritten.
- MAIN exact backing lease: `apps/backend/src/server/runtime-composition/{contracts.ts,auth.ts,native-main-persistence.ts}` plus NEW `onboarding-rpc.ts` and NEW `onboarding-claim.ts`. Actual anonymous/admin request association, final context, bounded finite RPC/claim output and fixed native calls; register underlying preparation/provider/DB/output/disposal tasks before forwarding. New factories must be called from the retained MAIN owner, not left unreachable.
- COMPOSITION subsequently names its exact `runtime.ts`/`assembly.ts` callers and required API export declaration. Do not modify the concurrently allocated native-read-resources/authenticated-read/authenticated-rpc invite files. Closed membership is exactly Onboarding2 plus claim HTTP and the separately bound initUser/initial-group leaves, not an all-mutation router. Required real logger/codec/client/discovery inputs may need an additional named composition resource file/declaration; that unresolved resource binding is a blocker, not permission for stubs.
- The onboarding CSRF GET/claim POST and client header propagation require an explicit #109 UI/transport lease before claiming application usability. No source lease above authorizes changing UI, startup inputs, real secrets or runtime initialization. Existing configured Next source functionality remains untouched.

**Smallest honest outcome:** first implement the four-file fixed native body; then the owned request producer and three-file actual handler join. There is no present two-file safe “attach `.handler`” shortcut. Full canonical synthetic setup also requires initUser/group and real sign-in/transport enrollment; merely completing Onboarding2 cannot supply a login account.

## 6. Freeze, validation and failure policy

Before each writer release, coordinator captures current exact before-images, checks exclusive leases and resolves the active Auth type-only freeze. Preserve all historical source pins, 142 migration assets, schemas/DDL/SQL history, old artifacts/evidence, initialization controls and 91/334. No overwrite/relabeling of old compiler/native results.

After each freeze, allocate fresh **focused noEmit typechecks and scoped lint** for changed DB/Auth/API and imported Backend/Nitro ownership profiles using current installed types/config; inspect exact changed exported contracts and driver-specific types. These are future coordinator checks, not performed here and not permission to run broad suites, build artifacts, schema generation, imports, SQL or initialization. Do not transfer old zero checks to changed source. No new tests are proposed; any later expressly requested native claim-race/expired-claim/no-user race/wrong-step/rollback/duplicate-completion/first-user/login regression needs its own disposable-installation and finite execution allocation.

Every timeout/abort stops admission, not underlying work accounting. Preserve `TransactionCommitAmbiguousError`, `retryable:false`, quarantined owner, no automatic retry/reset/second owner; do not return ordinary conflict implying retry after ambiguous COMMIT. Retain primary and cleanup/native settlement outcomes, including a confirmed commit followed by output failure. Drain real integration/Docker work, body readers, SQL tail, transaction cleanup, Auth scope/leases and handler/publication work **before** closing issuer/runtime. If a client API cannot physically retire under original bounds, identify that concrete client primitive gap; timer expiry is not drain proof.

Acceptance remains split: real handler source, actual resources/security binding, exact enrollment, native commit/physical settlement, and application login/setup/finish behavior. File adoption, memory→snapshot initialization, full registration/tenth Auth path, restore and production cutover remain separately held—not permanent blockers to authoring the missing fixed setup body.

## 7. Ready phase-1 amendment — independent P1/P2 findings incorporated

**Ready for independent plan rereview, not implementation acceptance.** This append controls the future phase-1 lease where it narrows sections 4–5; all prior report text/evidence remains historical and untouched. The lease is exactly NEW `packages/db/runtime-onboarding/contracts.ts`, NEW `packages/db/runtime-onboarding/statements.ts`, `packages/db/runtime.ts`, and `packages/db/transaction-gate.ts`. Implement exactly four real commands: claim, nextStep, initUser, initialExternalGroup. **Defer completeSetup entirely:** no command/result union arm, placeholder DTO, stub handler, implementation-array change, or relocation of completion SQL in phase 1. Other UI/runtime authors remain disjoint; this report does not allocate a DB writer. Preserve counters **91/3340/9**, frozen Auth descriptors, current source K, and all 142 immutable migration assets.

### Source facts fixing the two review defects

| Current public source, freshly read                                                                                                                                            | Required amendment                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/api/src/onboarding-claim.ts:7–38,78–117`                                                                                                                             | Claim acquisition has no prior-claim requirement. Its order is finish, users/force, matching active token, other unexpired lock, replacement/issuance. Cookie `homarr-onboarding-claim`; setting `__onboarding_claim`; JSON `{hash,expiresAt}`; SHA-256 lower-case 64-hex hash; random 32-byte base64url token; four-hour TTL. Preserve these values, not the old delete/insert race or caller-overridable TTL/now/force. |
| `apps/nextjs/src/app/api/onboarding/claim/route.ts:19–33`; `packages/api/src/nitro/procedure.ts:53–81`; `resources/-setup-read/context.ts:50–69`                               | Public policy allows admin or claim-plus-no-users for setup mutations, but acquisition must also admit a real bounded anonymous request. Legacy force derives from admin permission, not request input. Read middleware is not transaction authorization.                                                                                                                                                                 |
| `packages/db/transaction-gate.ts:19–23,80–94`                                                                                                                                  | Today's operation contains only signal/lifetime/wall deadline. `createGate` captures a new `performance.now()` start and wall-derived budget at each entry; it cannot retain the producer's original elapsed budget or discover the body's stored expiry. Do not claim this existing type/gate already solves P2.                                                                                                         |
| Same file `206–228,345–385`                                                                                                                                                    | SQLite really uses BEGIN IMMEDIATE. PostgreSQL Auth establishment verifies READ COMMITTED, locks the ready domain, then user/account/group/groupMember tables. SQLite revokes scope before its final gate; PostgreSQL revokes/settles scope and awaits tail before its gate and COMMIT. Put setup's new final check at those actual dispatch points, not only at callback return.                                         |
| `packages/db/runtime.ts:102–130,152–168,258–269,609–678,686–698,783–815`                                                                                                       | Target timing also recaptures a budget. Existing App/Board are SQLite-only; Auth has its distinct wrapper. New setup must retain original timing without changing those callers or enabling file-backed first adoption.                                                                                                                                                                                                   |
| `packages/db/runtime-auth-credential/{contracts.ts:21–46,statements.ts:89–161,validation.ts:175–189,192–293}`                                                                  | Native policy checks stored domain/namespace/sequence pair, user/provider, session/API-key locator, expiry, bounded memberships/grants and checked SQL/configured/wall clocks. Compose its actual private generator; require current `admin`, not an asserted principal or callback. Session host deadline must not exceed stored expiry minus allowed skew.                                                              |
| `packages/api/src/nitro/routers/user-establishment.ts:36–49`; `-user-establishment/helpers.ts:45–68`; `packages/auth/security.ts:3–5`; `packages/definitions/src/group.ts:1–2` | Real source password hashing is bcrypt cost 10, outside the DB unit. Preserve user source values, credentials provider, `credentials-admin`, owner, permission and membership; next step is group for LDAP/OIDC, otherwise setup. No OAuth account/session is manufactured.                                                                                                                                               |
| `packages/api/src/nitro/routers/-group-establishment/helpers.ts:12–69`; `-onboard-transitions/helpers.ts:47–63,798–823`                                                        | Initial external group checks source LIKE-name semantics and max-position, has no invented owner/member, and advances group→setup. nextStep preserves first welcome precondition and second-read no-op/provider precedence. Existing transition WHERE checks raw step, not full id/previous-step equality; add the explicit full observed witness, do not describe today's SQL as already doing that.                     |

Physical names are taken from both `packages/db/schema/{sqlite,postgresql}.ts`, not plural TypeScript exports: `user`, `account`, `session`, `apiKey`, `group`, `groupMember`, `groupPermission`, `onboarding`, `serverSetting`. Raw fields include `previous_step`, `setting_key`, `owner_id`, `group_id`, `user_id`, `session_token`, `auth_lifetime_sequence`, `auth_write_sequence`; domain `homarr_auth_credential_domain.head_sequence`. Schemas show `user.provider` defaults to credentials, group position is SQLite integer/PostgreSQL smallint, and onboarding has a primary id but no schema-enforced singleton (`sqlite.ts:94–219,521–524,617–621`; `postgresql.ts:100–225,524–527,612–616`). Read all onboarding rows with a limit of two, require exactly one valid row, and compare its actual id/raw step/nullable previous step. No assumed singleton id, missing-row fallback, normalization repair or schema change.

### Exact proposed phase-1 public types and fixed entrypoint

These are a proposed contract, **not existing exports or independently trusted authorization**. `NativeCredentialEvidence`, `NativeCredentialPolicyConfiguration` and `SupportedAuthProvider` mean the existing repository types. The future Auth-private producer must capture a fresh original clock pair at real request admission, register the exact request/leaf/owner, retain these values through hashing/queueing, and dispatch once; a DTO/brand alone proves none of that. That producer remains held outside the four DB files.

```ts
interface OnboardingOperation {
  readonly signal: AbortSignal;
  readonly lifetime: AbortSignal;
  readonly deadlineAt: number;
  readonly originalWallStartedAt: number;
  readonly originalMonotonicStartedAt: number;
  readonly originalBudgetMs: number;
  readonly originalMonotonicExpiresAt: number;
}

interface OnboardingSqlConfiguration extends NativeCredentialPolicyConfiguration {
  readonly demoEnabled: boolean;
  readonly readOnly: boolean;
  readonly enabledProviders: readonly SupportedAuthProvider[];
}

type OnboardingRetainedAuthority =
  | { readonly kind: "stored-admin"; readonly credential: NativeCredentialEvidence }
  | { readonly kind: "stored-claim"; readonly token: string };

type OnboardingClaimAuthority =
  | { readonly kind: "claim-request"; readonly currentToken: string | null }
  | {
      readonly kind: "stored-admin";
      readonly credential: NativeCredentialEvidence;
      readonly currentToken: string | null;
    };

interface OnboardingStepWitness {
  readonly id: string;
  readonly step: string;
  readonly previousStep: string | null;
}

type OnboardingInvocation =
  | {
      readonly kind: "claim";
      readonly authority: OnboardingClaimAuthority;
    }
  | {
      readonly kind: "nextStep";
      readonly authority: OnboardingRetainedAuthority;
      readonly firstRead: OnboardingStepWitness;
    }
  | {
      readonly kind: "initUser";
      readonly authority: OnboardingRetainedAuthority;
      readonly userRow: {
        readonly id: string;
        readonly name: string;
        readonly email: string | null;
        readonly password: string;
      };
      readonly groupId: string;
    }
  | {
      readonly kind: "initialExternalGroup";
      readonly authority: OnboardingRetainedAuthority;
      readonly groupId: string;
      readonly name: string;
    };

type OnboardingClaimResult =
  | { readonly status: "issued" | "active"; readonly token: string; readonly expiresAt: number }
  | { readonly status: "locked"; readonly expiresAt: number }
  | { readonly status: "finished" | "forbidden" };

interface OnboardingResults {
  readonly claim: OnboardingClaimResult;
  readonly nextStep: void;
  readonly initUser: void;
  readonly initialExternalGroup: void;
}

onboardingMutationAsync<K extends OnboardingInvocation["kind"]>(
  operation: OnboardingOperation,
  invocation: Extract<OnboardingInvocation, { readonly kind: K }>,
  configuration: OnboardingSqlConfiguration,
): Promise<OnboardingResults[K]>
```

The discriminated invocation makes `claim-request` exclusive to claim. It cannot reach nextStep/initUser/group or become a generic anonymous write arm. There is no caller force flag, next-step override, TTL, SQL, runtime, hash callback, authorization predicate, exported expiry setter, arbitrary generator or generic DB operation. The password field is the **real future producer's retained source hash**, never wire input or evidence that a caller-provided hash is canonical. Configuration is copied from the retained immutable issuer, not public RPC options; its existing checked clock function is a clock resource, not a permission callback. Capture bounded own-data properties into private immutable rows, reject accessors/invalid limits, cap token bytes/IDs/names/hash/row counts, validate finite clocks and provider values, and require writable mode. Runtime active accounting, same connection/owner lifetime, target/K checks, quarantine, physical settlement and `leave()` are mandatory bodies, not type brands.

The canonical optional email remains nullable: the future private producer maps only omitted `undefined` to SQL `null`, preserving an explicitly supplied empty string. Both fixed driver bodies bind this exact nullable value without a new default or normalization.

### One selected statement program, both actual driver runners

`statements.ts` owns one fixed onboarding generator selected by the captured invocation. It composes `authCredentialDomainLockStatements` and, for admin, `nativeCredentialPolicyStatements` from the existing DB-private files. Runners execute actual SQLite `database.all<unknown>(sql)` or PostgreSQL `(await database.execute(sql)).rows`; they decode bounded own-data rows and explicit aliases, not `.run().changes` on PostgreSQL or a guessed execution shape. Every single-row write uses `RETURNING` and verifies one returned row; absence-preserving reads/writes verify zero or the exact expected collection size. Use `IS` on SQLite / `IS NOT DISTINCT FROM` on PostgreSQL for nullable witnesses. No source/API import into DB and no alternative caller-selected statement list.

1. **Begin/admit:** SQLite BEGIN IMMEDIATE on the retained checked ready target; PostgreSQL BEGIN, READ COMMITTED verification, ready-domain FOR UPDATE lock **before** tables or parents. In PG take SHARE ROW EXCLUSIVE table locks in this exact common-prefix order: `user`, `account`, `group`, `groupMember`, then `groupPermission`, `session`, `apiKey`, `onboarding`, `serverSetting`. The first four match Auth establishment at `transaction-gate.ts:358–371`; later locks protect membership/grants, credential rows, setup singleton and claim-row absence. Then lock admin's user and bounded group parents in the existing deterministic order (`runtime-authority/locks.ts:3–6`), and read native policy. Ready phase/namespace/signed64 decoding is reused, not domain adoption/head insertion/allocation. No user/account/session write in these commands allocates a fake credential sequence.
2. **Observe:** select singleton onboarding as `id,step,previous_step AS "previousStep"` (limit two), `EXISTS(SELECT 1 FROM "user") AS "hasUsers"`, claim `setting_key AS "settingKey",value` (limit two), and checked SQL clock aliased `observed_now`. Reuse the actual SQLite julianday-ms / PostgreSQL clock_timestamp-ms expressions at `runtime-auth-credential/statements.ts:116–118`; validate with `requireAuthCredentialClock`. Read native current admin permission under the same locks. A stored-claim mutation requires no-users plus canonical parsed hash/expiry/token match now. `claim-request` requires no-users for acquisition, **not** a preexisting row/token. Non-admin with users returns forbidden for claim and denies other mutations.
3. **Claim branch, in exact order:** finished→`finished` without reopening; users without fresh stored admin→`forbidden`; matching unexpired current token→`active` with original token/expiry, **without renewal**; other unexpired claim with no fresh admin→`locked`; otherwise issue. Fresh admin alone supplies force semantics even with users or another active claim; matching-token active still precedes force replacement. Invalid/malformed existing JSON is a replaceable _observed row_, not absence. Generate the canonical random token and SHA-256/JSON inside this selected claim body, checked-now + exactly 14,400,000 ms, validate safe integer/overflow. Replace with `UPDATE "serverSetting" SET "value" = newValue WHERE "setting_key" = '__onboarding_claim' AND "value" = observedRaw RETURNING "setting_key" AS "settingKey","value"`; with witnessed absence use `INSERT ... SELECT ... WHERE NOT EXISTS (...) RETURNING ...`. Require one exact returned row. Do not delete first, catch an arbitrary error as a winner, force/retry, or issue a second operation. Same-unit locks plus CAS protect absent/expired/malformed/replaced races.
4. **nextStep branch:** validate retained real first-read singleton and normalized welcome precondition; reread locked current singleton. If the compatible second read has moved out of start, return source void no-op without any transition; reject missing/invalid/foreign singleton. Otherwise derive credentials-and-no-users→user, else LDAP/OIDC→group, else setup from current locked users/pinned providers. CAS actual id, raw step and nullable raw previous step; set previous_step to source `start` and selected step; `RETURNING` actual observed/post fields must be one row. Preserve source precondition/no-op distinctions; raw settings/integrations do not become writable setup automatically and finish never reopens.
5. **initUser branch:** require raw user step, enabled credentials and no-users even when admitted admin. Under locks check `(name,provider='credentials')` uniqueness, source `credentials-admin` name absence, id absence and current `MAX(position)`; preserve `max ?? 1`, then +1, with PostgreSQL smallint range checked. Insert only source `id,name,email,password,provider='credentials'` (other real schema defaults remain); insert group `id,name='credentials-admin',owner_id=userId,position`; insert exactly `groupPermission(group_id,permission='admin')` and `groupMember(group_id,user_id)`. Each INSERT RETURNING must match one row. Derive group/setup from pinned LDAP/OIDC and CAS singleton id/user/raw previous step to previous user/new step. All five effects commit or roll back together. No fabricated account, OAuth link, Everyone membership, session, sign-in success or first-login credential evidence.
6. **initialExternalGroup branch:** require raw group step/current claim-or-admin and pinned LDAP/OIDC selection. Recheck source `name LIKE boundName AND id <> ''` and id absence under locks; derive `max ?? 1` +1 with range check. CAS exact singleton id/group/nullable previous step→previous group/setup; insert source id/name/position and admin permission, each RETURNING exactly one. No supplied owner/member or external account. Actual configured provider login remains the later canonical account/session/Everyone producer.
7. **Final SQL witness:** freshly read native admin policy again where used; compare expected post singleton, exact claim state and checked SQL clock under still-held locks. Issued claim must match its own returned stored JSON/hash/expiry; active claim must retain exact original raw row/hash/expiry; neither requires a claim that predated this operation. Claim-only nextStep/group retain exact pre-claim and no-users. initUser validates its own exact inserted user/group/permission/member poststate and no additional users, rather than falsely requiring no-users after its own insertion. The claim proves admission for this one establishment, not future post-user claim access. Finished/forbidden/locked results have their corresponding unchanged observations, not minted authority. Return source void or claim result only after confirmed physical COMMIT/settlement.

PG table locks prevent no-user/name/max-position/claim-absence phantoms from ordinary DML; parent locks stabilize existing identities/grants. SQLite BEGIN IMMEDIATE supplies the equivalent single-writer unit. This is a concrete new fixed PG setup admission, not an assertion that all future writers are compatible: keep incompatible grant/credential/restore writers unmounted, and rereview lock order against **every enabled writer** before enrollment. Domain-first/common-prefix order must not be reversed by a concurrent critical writer. If the frozen actual source cannot meet this order, report the exact conflicting statement/lease; do not loosen locks, activate held writers or add retries.

### P2: privately owned decreasing expiry witness at native COMMIT dispatch

Use new **fixed** `boundedSqliteOnboardingMutation` and `boundedPostgresOnboardingMutationAsync` wrappers in `transaction-gate.ts`, accepting the captured operation/fixed invocation/configuration, not a runnable body or assertion. They construct and drive the owned statements generator themselves. Keep `BoundedTransactionOperation`, `createGate`, and all existing App/Board/Auth entrypoint behavior unchanged; extract resource plumbing privately only if old admission/cleanup/ambiguity semantics stay identical. A public generic `assertAuthorized` callback or additional caller-supplied setter is expressly rejected.

The setup wrapper owns a private `SetupGateState` with immutable original clock mapping and mutable **only-decreasing** effective wall/monotonic deadlines, last monotonic observation and validated expiry witness. The generator yields a closed internal step union `SQL | {kind:'validated-expiry', source:'claim'|'session', expiresAt:number, hostDeadlineAt:number|null}` after actual stored-row decoding, token/native policy and clock validation; the wrapper consumes this event and updates its own state. These events are never accepted as runtime arguments, callbacks or exported setters. The wrapper never accepts a caller generator. Raw stored expiry is taken from the validated claim JSON or exact matched stored session witness (native policy alone returns permissions, not expiry); never from an unverified claimed deadline. For issued claims the event follows its successful RETURNING decode; for active/retained claims it follows stored match; for admin sessions it follows validated exact stored expiry/native evidence. API-key admin has no invented expiry event. Final witness is armed only after final SQL poststate checks.

Require `originalBudgetMs > 0`, finite original pair/deadlines, `originalMonotonicExpiresAt === originalMonotonicStartedAt + originalBudgetMs`, `deadlineAt <= originalWallStartedAt + originalBudgetMs`, and current monotonic time not before original/last observed time. The retained producer clock mapping is mandatory; if missing or from another owner/clock domain, reject, never recapture at DB entry. Validate configured/wall/SQL clocks and allowed absolute skew by the actual credential clock validator. Every entry, statement, timeout-setting dispatch and final check uses:

```text
remaining = min(
  originalWallStartedAt + originalBudgetMs - checkedWallNow,
  originalMonotonicExpiresAt - monotonicNow,
  effectiveWallDeadlineAt - checkedWallNow,
  effectiveMonotonicExpiresAt - monotonicNow
)
```

Initialize effective wall to supplied deadlineAt and effective monotonic to `min(originalMonotonicExpiresAt, originalMonotonicStartedAt + (deadlineAt - originalWallStartedAt))`. For **validated** stored expiry `E` and allowed skew `S`, compute `H = E - S`, also min with validated session hostDeadlineAt when present. Tighten wall with H; tighten monotonic with `originalMonotonicStartedAt + (H - originalWallStartedAt)` and the previous effective/original expiry. Validate every finite result; never use `performance.now() + (H - Date.now())`, reset a start, refresh a budget or expand after a new observation. Checked time must still precede stored E as well as the conservative H. This original mapping and per-check skew validation prevents rollback of the wall clock from refreshing elapsed request time. SQL timeout uses positive floored remaining capped at 2,147,483,647, not a new timer budget.

**COMMIT ordering is part of the selected body:** finish generator and final stored-policy/poststate/SQL-clock reads → revoke scope → settle underlying scope (PG) and await SQL tail → reject recorded statement failures → fixed setup check owner/current ready connection/K, resource/request lifetime, signal, both original budgets, both tightened budgets, checked configured/wall/skew and armed stored-expiry witness → mark dispatched → native `client.run('COMMIT')` / `client.query('COMMIT')`, with no intervening await/work. No post-revocation SQL query: the final SQL clock was validated under locks and the final wall/configured/monotonic checks account for elapsed settlement time. Runtime target/owner state is retained privately in the fixed setup unit, not supplied as an authorization closure. Retain the existing rollback-before-dispatch, quarantine/ambiguous-after-dispatch, tail/scope/cleanup settlement and active-owner drain semantics; post-COMMIT expiry/output failure is not a safe retry. A copied wall-only operation or successful callback-body check is insufficient.

### Separate full completeSetup lease: freeze actual collection DTO before adding any arm

This is **future rereview input only**, deliberately absent from phase-1 contracts. Freeze the actual planner before/after observations from `-onboard-transitions/helpers.ts:74–85,727–751,825–1065`, not a plan tag or selected-row-only revision. Use DB-schema-derived full row types with explicit driver-normalized scalar timestamp/boolean representation; the next lease must pin every selected column/alias and bounded size. The required DTO is:

| DTO member                                | Frozen comparison, including absence/membership                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `boardCatalogue.before/after`             | Complete sorted `(id,name)` catalogue that drove zero/one/multiple-board selection and name collision decisions. Include actual membership/absence, not just chosen board id.                                                                                                                                                                                                                                                                                                                       |
| `targetGraph.before/after`                | Exact target board full row or explicit absence; complete sorted full `layout`, `section`, `section_layout`, `item`, `item_layout`, `integration_item` collections scoped by the target board and real FK parents. Freeze old rows plus new-row absence and expected inserted/updated rows; unrelated preserved contents cannot silently disappear or change. Composite keys are actual section/layout, item/section/layout and item/integration tuples (`sqlite.ts:378–503`; matching PG schemas). |
| `affectedApps.before/after`               | Each affected id with discriminated absent/full `app` row (`id,name,description,iconUrl,href,pingUrl`); complete affected-id membership. No `existing:boolean` without the old row.                                                                                                                                                                                                                                                                                                                 |
| `affectedIntegrations.before/after`       | Each affected id absent/full `integration` row (`id,name,url,kind,appId`), plus complete sorted `integrationSecret` set (`integrationId,kind,value,updatedAt`) before replacement and after it, including empty sets and secret-row absences. All selected existing-secret recovery inputs belong in this witness.                                                                                                                                                                                  |
| `rawSettings.before/after`                | Exact four-key tuple appearance/culture/analytics/board, each raw `serverSetting.value` or explicit absence. Freeze raw bytes before decoded-default merge, final serialized bytes after; require source updates to affect their expected rows, not silently succeed on missing settings.                                                                                                                                                                                                           |
| `everyone.before/after`                   | Full `group` rows selected by exact source name `everyone`, including zero/one membership and id/owner/position/home/mobile-home fields; retained membership/permission collections if read by preparation or authority. Freeze unchanged members/grants and expected home-board changes, never fabricate Everyone or silently ignore its absence.                                                                                                                                                  |
| `onboarding/claim/authority.before/after` | Exact singleton CAS witness, exact pre-claim and expected deletion/absence, current native principal-scoped grants and original expiry retained privately. Compare whole selected collections in locked unit and expected poststate, including self-deletion, before arming gate.                                                                                                                                                                                                                   |

Physical completion tables are `board`, `layout`, `section`, `section_layout`, `item`, `item_layout`, `integration_item`, `app`, `integration`, `integrationSecret`, `serverSetting`, `group`, not guessed plural names. **Raw SQL must supply `integrationSecret.updated_at` explicitly** for every inserted/replaced secret: both schema definitions use non-null `$onUpdateFn(() => new Date())`, not a SQL DEFAULT (`sqlite.ts:258–276`; `postgresql.ts:260–278`). Bind actual checked write time using SQLite timestamp **seconds** (schema timestamp mode) / PG timestamp conversion; do not confuse it with millisecond session expiry. Freeze that value in expected post rows. A full completion lease must additionally review deterministic domain-first table/parent locks covering these catalogue/graph/absence witnesses, paired physical driver encodings, the actual owned planner/codec/client lineage and all source output; none is authorized by phase 1.

### Handoff and limits

Independent rereview should assess the four-file lease, correlated request-only claim arm, fixed statement sequence, owned expiry events/original mapping, exact COMMIT placement, native policy/lock compatibility, source producer semantics and separate completion DTO freeze. Subsequent actual Auth-private producer and handler/enrollment leases must still establish request/origin/CSRF/cookie/leaf/owner lineage and canonical hash provenance. No broad DB API, callback authorization, fake Auth principal, remote prepared-hash authority, completion stub or implementation-array relabeling is acceptable.

This amendment was appended using public-source reads and a report-only patch. No product writes, commands, checks, hash calculation, compile/evaluation/import/test, native SQL execution, Engine/container, network, private configuration/environment/data access or nested agents occurred. It grants no force/retry/adoption/seed/SQL-execution authority and claims no phase completion. Current file-adoption guard, ready-file/source-K evidence and immutable assets remain unchanged.
