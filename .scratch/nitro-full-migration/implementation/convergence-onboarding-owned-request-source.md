# Onboarding owned request — Auth4 source freeze

## Outcome

The released **four-file Auth body is authored and source-frozen**, ready for independent source review and separately authorized coordinator checks. This is not SOURCE ACCEPT, a fresh compiler/lint PASS, native settlement proof, first-request integration, generated-client compatibility, mounting or application acceptance.

Coordinator-supplied independent PLAN APPROVE and repaired DB4 SOURCE ACCEPT are prerequisites supplied to this author, not reviews reproduced here. The controlling report is `convergence-onboarding-request-producer-plan.md`, including its later **four-path** first-request amendment with explicit `assembly.ts` forwarding. No first-request/Main source lease was exercised here.

Exactly these product files changed:

1. NEW `packages/auth/nitro/production-sessions/onboarding.ts`
2. `packages/auth/nitro/production-sessions/sql-persistence.ts`
3. `packages/auth/nitro/production-sessions/service.ts`
4. `packages/auth/nitro/production-sessions/index.ts`

`persistence.ts` and the repaired DB4 are byte-unchanged in this capture. No API factory/handler, MAIN clock/constructor/enrollment, transport, UI, ninth Auth descriptor, registration or completion body was changed. **completeSetup remains absent from every new union, preparation, native branch and export.** No additional product file, dependency, manifest, comment, test, cast, `any`, suppression or global option was added.

## Actual body and surface

| File                 | Authored source                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `onboarding.ts`      | Opaque original-request/four command handles; explicit bounded construction policy; immutable origin/provider/body resources; original clock capture/check/min-tightening; bounded original headers/cookies and actual issuer mutation guard; own original-body canonical JSON/schema preparation; real password hash/IDs; raw singleton decoding; finite claim cookie output and nonretryable failure categories.                                                                |
| `sql-persistence.ts` | Onboarding state attached to actual existing `OwnedSql`; owner-private request/operation WeakMaps, repeat-capture WeakSet and enumerable active requests; prepublished real preparation/dispatch work; projected native lease/evidence admission and original authority signal reuse; fixed first-step SQL; four literal existing runtime overload calls; retained actual native/result/failure evidence; idempotent retirement, lease release and owner drain/failure retention. |
| `service.ts`         | Optional explicit `onboarding` construction policy, captured with the actual immutable issuer origin/providers/body budget and retained SQL configuration. Missing policy leaves onboarding unavailable. Every public capture/prepare/dispatch/dispose resolves the existing `productionSqlIssuers` WeakMap. No new runtime/pool/SQL owner is constructed for onboarding.                                                                                                         |
| `index.ts`           | Narrow capture, four exact preparation functions, four fixed dispatchers, disposal and opaque/policy/safe-result types. No private registry, native credential, SQL, runtime, source-input/candidate, hash or permission/preparation callback is exported.                                                                                                                                                                                                                        |

Public bodies are now concrete source, not held-only wrappers:

- `captureProductionOnboardingRequest(issuer, originalRequest, requestId, signal, lifetime)` samples the host wall/monotonic pair synchronously inside the Auth capture, uses the captured construction budget and retains original signals/lifetimes. It returns no caller-writable clock DTO. A repeat capture of that Request under the owner rejects, including after a consumed capture attempt. Preparation/dispatch require the exact retained Request reference; a cloned Request cannot use the original handle. The separate startup producer must still prove that this capture is invoked at genuine first request admission.
- `prepareProductionOnboardingClaimAsync`, `prepareProductionOnboardNextStepAsync`, `prepareProductionOnboardingInitUserAsync`, `prepareProductionInitialExternalGroupAsync` select one command once, consume the original source body themselves and retain the resulting values privately. No public function accepts an input object as evidence of body provenance.
- Their corresponding `dispatchProduction...Async` functions consume the registered command once and call one literal `onboardingMutationAsync` overload on the same privately retained runtime. Claim returns finite status/expiry/cookie output, never the native token as an arbitrary RPC field; other commands return actual void after native settlement.
- `disposeProductionOnboardingRequestAsync` retires admission, aborts the retained operation, waits actual preparation/native tasks and ledger work, then releases its genuine lease and removes the prepared private values. It is idempotent, not a retry/reset API.

### Actual source-input contract; transport still held

The body producer accepts **plain canonical original JSON only**, not a guessed RPC envelope. initUser reads the real bounded original Request JSON with only username/password/confirmPassword/optional email and runs actual `userInitSchema`; group reads only name and runs actual `groupCreateSchema`. Claim/nextStep accept an absent/empty body or an empty canonical JSON object. This is an unmounted source-only input contract, **not evidence that a generated oRPC client currently sends these bytes**.

No external decoded DTO, caller body reader, JSON translator, source preparation callback, SQL operation or remote prepared hash/ID/provider/position/next-step/TTL/force is accepted. The operation retains the original Request and its header/method/URL witness while its own bounded reader consumes it. A later handler/parent-body producer must explicitly pin the real transport packet, original-request decoding and exact final-context/leaf lineage before enrollment. That join was deliberately not invented here.

### Clock and authority lineage

The four original DB fields remain unchanged through authority work, body reading, bcrypt, preparation, queueing and native dispatch: original wall start, original monotonic start, original budget and original monotonic expiry. Checks retain the original mapping and last monotonic observation; effective deadlines only decrease. The body reader's wall timer is supplemented by the retained original dual-clock controller/timer. No late `performance.now()` plus old wall budget conversion exists in this body.

The real captured `createIssuerOriginGuard` performs POST/canonical URL/Host/exact Origin/Fetch-Site/actual HMAC cookie-header CSRF validation. Only after that succeeds is the already-verified header expiry read and mapped to the original monotonic start. Selected cookies reject duplicates, malformed encodings, empty/ill-formed/NUL values and session chunks; header/cookie/credential bytes are bounded before HMAC/native credential work. Cookie Secure follows approved issuer origin policy, not forwarded protocol.

Actual session/API-key admission goes through this owner's existing projected reader and private request lease registration. A present credential returning anonymous is rejected; there is no anonymous fallback for an invalid credential. Recapture uses the exact registered authority-operation signal and native evidence object, with lease identity/provider consistency and current lease checking. New combined signals are not substituted for that registered signal. API-key admission still requires the same origin/CSRF guard. No supplied principal or permission predicate mints authority.

Anonymous claim acquisition alone produces the DB `claim-request` arm; it does not require a previous token or mint a user lease. Other commands use retained stored claim or genuinely captured native evidence. The unchanged fixed DB unit decides current admin/no-users/claim validity, actual stored expiry and native COMMIT authority. Auth does not issue claim randomness/hash/TTL, export expiry events/setters, or turn a different party's locked claim expiry into its own authority deadline.

### Canonical values and physical work

initUser calls the actual local `hashPasswordAsync` (bcrypt cost 10) and private real `createId` twice, outside SQL but inside the original tracked request. Only omitted email becomes null; explicit empty string is retained. User/group/permission/member construction and locked predicates remain in accepted DB4; no OAuth account, Everyone membership, session cookie or sign-in success is invented. Initial external group has only canonical private ID/name; DB owns LIKE/name/position/step checks and writes. nextStep's first physical singleton read uses fixed SQL with `id`, raw `step`, nullable aliased `previousStep`, LIMIT 2 and exactly-one/start validation on this same ready runtime; no fallback/caller witness is accepted.

Preparation and dispatch completions enter owner task sets before deferred body/hash/admission/read/native work begins. Existing `IssuerOperationLedger` tracks real reader/authority/hash promises without changing persistence.ts. Bcrypt has no cancellation primitive: timeout/abort prevents later native dispatch but retirement awaits the actual hash promise. No timer winner removes live work from accounting.

Native invocation/pending promise/fulfilled result/rejected or ambiguous evidence is retained privately. `TransactionCommitAmbiguousError` stays that classification and DB quarantine is not weakened; there is no automatic retry/second owner. Confirmed native success is recorded before output validation. Later clock/guard/output/disposal failure is confirmed-commit settlement failure, not rollback. Retirement retains ambiguous classification and cleanup/primary errors; owner-level onboarding cleanup failures remain accounted even if automatic retirement completed before owner close. The owner close awaits pending requests, unconsumed registration retirement and cleanup; returning a source result is not transport EOF/publication proof.

## Fresh source evidence

Private capture directory:

`/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-onboarding-owned-request-source-6724efd4def2f92c673a30bf`

The directory was created mode 0700. `before.json`, `after.json`, existing before-images, all four after-images and diffs were created with O_EXCL/mode 0600. Two bounded Python `-I -S -B` captures used only standard-library file IO/hash/difflib/metadata handling; no application import or execution occurred. The NEW path is explicitly **ABSENT** in before.json. All four retained diffs were read as source evidence. No product write follows this after-capture freeze.

| Source               | Before SHA-256                                                     | Frozen after SHA-256                                               | After bytes/lines | Images/diff                                  |
| -------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ | ----------------- | -------------------------------------------- |
| `onboarding.ts`      | ABSENT                                                             | `239524acd16a9637a36a9712c1ee8d42eb905aa122d83d602352e9441a6ef3a9` | 18441 / 458       | `0-after.ts`, `0-source.diff`                |
| `sql-persistence.ts` | `38d5a7cfbc65e5c45a3c933ba3605b38ccfc03f6dc270f627a98f2993a0396c6` | `6298270f2603fe28c5b219e2ea3ae6d319c825c16a3b62aa39fe0b17f2ad1d75` | 144754 / 3460     | `1-before.ts`, `1-after.ts`, `1-source.diff` |
| `service.ts`         | `580e2c88b270509fd7f495e76dde517bba8a0fb4b5cc052049bc24e0c3f688dd` | `e29b43325c7814bad371f13df68541b525a331f51df919aa7e456e54ed27e10a` | 67312 / 1507      | `2-before.ts`, `2-after.ts`, `2-source.diff` |
| `index.ts`           | `804c664c6a64d81ecdac904f480817e2f200bc7b892b31f09faf57331e963554` | `1118ff1cf7a48f161c97a134bbc9aaf05b8cc8e5f01d45a1f1edae362d198d4b` | 1534 / 44         | `3-before.ts`, `3-after.ts`, `3-source.diff` |

| Unchanged source association                             | Identical before/after SHA-256                                     |
| -------------------------------------------------------- | ------------------------------------------------------------------ |
| `packages/auth/nitro/production-sessions/persistence.ts` | `cc394f8f3ff84ae0426ee549d769187898e120b75906cf1171b2625aacf6911f` |
| `packages/db/runtime-onboarding/contracts.ts`            | `508549140e2386f4fa009974389b6ce9f26768732df034250e570d4377f30987` |
| `packages/db/runtime-onboarding/statements.ts`           | `db045f5ebbe20be8fd7abe5b92de43668744e0268cc4cfc85efbe7ad7b5ea9ec` |
| `packages/db/runtime.ts`                                 | `87e8754f8323dbe33f8789dfe73323903ba7e5a7b39cafd9746dff1dc79c56a6` |
| `packages/db/transaction-gate.ts`                        | `31c2bf210de2e11aff4d077945d794a58bc3bf0628fed38a99364466dedad6cd` |

## Remaining joins and holds

1. **First-request producer is not integrated.** Its exact separately held four paths remain `apps/backend/src/server/application.ts`, `packages/contracts/src/request.ts`, `apps/backend/src/server/runtime-composition/auth.ts`, and `apps/backend/src/server/runtime-composition/assembly.ts`. The latter must actually forward the synchronous capture service. Coordinator supplies the startup conclusion that the issuer can exist before Application; no backward-beforeReady framework or construction-cycle workaround was authored.
2. **Approved same-MAIN construction policy/caller is not supplied here.** Existing constructor callers omit onboarding and therefore cannot capture these operations. A later lease must provide the explicit approved mode/request budget/limits while retaining the same issuer/runtime/clock owner. No writable defaults were added.
3. **Parent body/real transport decoding, exact final-context/leaf binding, API factories/handlers, CSRF GET/claim POST/client propagation and enrollment remain held.** This Auth source proves its own raw canonical original-body preparation, not a currently generated-client wire join or actual HTTP/RPC publication/abandonment.
4. **Independent Auth4 source review and fresh coordinator checks remain due after writers freeze.** Original **37/37 checks** remain original-source historical evidence, never these changed bytes' PASS. No source/native/UI SOURCE6 acceptance is inferred. No compiler/lint/format command, test, native SQL, application evaluation/import, Engine/network/private configuration/data or nested-agent action was run for this authoring cut.
5. **Native/application/setup/login/completion acceptance remains separate.** The already consumed Bun actual attempt stays HELD; no archive hash, retry/reset or RootB action occurred. completeSetup is still deferred. No runtime/adoption/seed/registration/wire/enrollment permission was exercised.

Disjoint Media/Spotlight and Widget planner/repair paths were not edited. All historical controls/artifacts, 142 migration assets, data, protected ports and nine Auth descriptors remain outside this cut; only the five unchanged source associations above were independently byte-compared by the pure capture. This source freeze does not change any acceptance counter or claim full phase completion.
