# CORE Auth3 — current-port compatibility / original-birth STOP

**Report only; no source-author release.** Existing Auth3 has the runtime, private credential and physical-task seams needed for CORE. It does **not yet have a verified original CORE request/context/clock binding**. Do not publish a bridge accepting arbitrary late operation/context fields to conceal that missing producer. DB3 is authored/frozen, not SOURCE ACCEPT: module `fe5a72f7…`, runtime `b06291b1…`, gate `64f5a220…`; both DB reviews and fresh checks remain active. The projection plan and bootstrap amendment govern.

## Actual DB public contract

Existing declared `@homarr/db/runtime` exports `OnboardingOperation`, the CORE selection/authority/configuration/result/bounds types and `OnboardingCoreReadError`. Its actual retained runtime method is:

```ts
readOnboardingCoreAsync(
  operation: OnboardingOperation,
  selection: OnboardingCoreReadSelection,
  authority: OnboardingCoreReadAuthority,
  configuration: OnboardingCoreReadConfiguration,
): Promise<OnboardingCoreReadResult>
```

Selections are exactly `current-step` / `environment`. Authority is anonymous claim token or genuine `NativeCredentialEvidence`; it is not a profile/admin flag. Configuration extends the existing native credential policy (`maximumSnapshotRows`, `maximumAbsoluteClockSkewMs`, `now`) with version, retained enabledProviders, serverOrigin, Docker/Kubernetes flags, resolved Workshop API/UI URLs and maximumResponseBytes. Result is detached raw current/previous plus tightened deadlineAt/monotonicExpiresAt/lastMonotonicAt; only environment selection includes environment. No lease/context/credential/native graph or publication permission is returned. This report does not re-review the DB body, timing or representation implementation.

## Real issuer → owner → evidence/task chain

- `service.ts:1336–1386` constructs the SQL owner and retains the exact returned issuer in private `productionSqlIssuers`. Existing reader/profile/write wrappers resolve that map; CORE's future service wrapper must do the same, never accept a runtime or owner DTO from its caller.
- `sql-persistence.ts:173–196,1147–1149` resolves `owners` to actual `OwnedSql`: retained runtime/configuration/authority, requestLeases and requestReads/pending. No new owner/WeakMap/module is needed to retrieve credentials.
- Real admission (`1321–1396`) calls the existing authority reader, captures its `captureOwnedCredential` result and installs `OwnedRequestLease` at admission. That record retains private evidence, original credential locator, operation/authorityOperation, exact lease.identity and observed provider. `privateNativeCredentialEvidence` is this existing private evidence role, not a missing public getter.
- `projectedRequestBounds` (`1288–1319`) checks same registration/identity/signal, nonexpanded deadline, owner/lease lifetimes and stored session host expiry. `ownedOnboardingAuthorityAsync` (`1829–1861`) demonstrates exact recaptured-evidence identity/provider checks, but its mutation/CSRF admission is NOT a CORE reader.
- `runProjectedRequestRead` (`1251–1285`) publishes owner read accounting before its scheduled body. Owner close (`4418–4480`) snapshots/joins actual pending/read/write work. CORE must reuse this physical accounting, not a write settlement/observation slot or detached read promise.

Credential execution therefore needs no new algorithm: resolve the same registered lease, check registration and exact authority-operation signal/deadline, await genuine `lease.assertCurrentAsync`, then require `captureOwnedCredential(...) === registration.evidence`, identity user/provider and unchanged namespace/lifetimeSequence/writeSequence/locator/expiry binding. Pass that private evidence directly to the fixed DB credential branch. Recheck the same registration/evidence and real context after native settlement. A failed presented credential cannot become an anonymous claim request.

## Exact missing producer / STOP

`SqlAuthorityOperation` currently has only signal/deadline. Actual admission copies only those fields into `requestLeases`; that registration contains **no Request, requestId, context identity, header/body witness or original wall/monotonic starts**. `projectedRequestBounds` cannot recover those missing facts or prove a caller's proposed starts.

Backend's `RequestAssociation`, `principals`, `HttpRequestCapture` and `associationFor`/`httpCaptureFor` retain and check real Request/principal/requestId/signal/onDispose identities (`auth.ts:196–229,770–858`). They are private to Backend, not Auth public ports. Ordinary `resolvePrincipal` currently starts its deadline inside its scheduled task (`1159–1184`), which is too late for CORE's original pre-principal birth. Its anonymous result can also represent unsuccessful credential admission (`1198–1203`), so anonymous principal kind alone does not establish that no credential was presented.

The existing Auth `captureProductionOnboardingRequest`/`OwnedOnboardingRequestState` is not a substitute: it samples its own starts and its preparations use mutation admission; Backend's existing capture/final-context joins select the four wire commands. Reusing it for CORE would alter protected wire semantics, grant mutation/CSRF authority or renew the read's clock. No exported `originalOnboardingOperation` or `getIssuer` port was found in these frozen paths; use actual retained objects, not invented getters.

**Minimum missing edge:** the separately leased future Backend original-request producer in `apps/backend/src/server/runtime-composition/auth.ts`, with its actual CORE construction/entry join in `onboarding-core.ts`, `native-main-persistence.ts` and `contracts.ts`, must capture the real Request/signal/requestId/lifetime/onDispose, bounded headers/URL/body lineage and both starts synchronously BEFORE principal work. Its genuine admission/final-context source must establish a retained binding to the same Auth lease registration, not a late field setter or lookup adoption. Anonymous birth needs that real binding too; it cannot invent a lease to enter requestLeases.

That cross-package binding must be specified and independently approved before declaring the Auth read-call signature closed. A plain `OnboardingOperation`, a favorable context, matching IDs, an `assertContext` callback or a public request registrar would not close it. This is a producer-design dependency on already planned future Backend work, **not evidence that `persistence.ts` or `onboarding.ts` must be edited**. No fourth Auth file is necessary merely to declare fixed DB-derived types; authoring must STOP if resolving the actual binding later requires one, and name that exact edge rather than widening this lease.

## Prospective Auth3 cuts, conditional on that binding

1. **`sql-persistence.ts` only:** declare fixed CORE bridge input/result/config types from the existing DB leaf; add the owned fixed read body beside projected reads. Resolve real original binding and existing lease/evidence, then invoke ONLY `value.runtime.readOnboardingCoreAsync`. Selection is a fixed server choice; no SQL reader/callback, native-evidence setter, profile proof or new registry. Reuse requestLeases for authenticated accounting; anonymous physical task state must be constructor-owned under the real original producer, not a fake registration.
2. **`service.ts` only:** exact issuer-map resolution and narrow forwarding to that owned body; retain genuine immutable construction inputs through the real owner construction path once its configuration/birth interface is approved. No optional constructor callback/authority slot or facade declaring absent evidence ready.
3. **`index.ts` only:** narrowly export the actual service port and fixed sql-persistence types. No new module, manifest, credential implementation, facts getter or widened wire command union.

All return paths must await the actual native task and lease/currentness work while owner/original task accounting remains live. Use returned bounds only to tighten the original effective wall/monotonic limits, verify finite/nonexpanding mapping and nonregressing lastMonotonicAt, and check the same issuer/runtime/domain/credential/context binding before detached public return. No new start/budget, no publication approval from bounds. Native domain validation belongs the fixed DB branch; do not add an external facts getter to claim it occurred.

Abort/retirement stops delivery and joins the actual physical read/currentness/cleanup tasks before freeing the originating binding or lease. Preserve original primary and distinct cleanup causes, existing ambiguity/nonretryability and cached release completion. Do not call owner retirement from a task that retirement itself drains, await the factory/read on itself, use Promise.race as settlement or resend after uncertainty.

## Anonymous source and configuration contracts

Only a source-established no-presented-credential branch may build DB anonymous authority. Fence original combined Cookie bytes at 16384 before parsing; use existing `readSingleCookie` duplicate/decode rejection and cookie-name policy. Claim token is at most512 bytes; malformed/duplicate/oversized session/API/claim input fails, never becomes absent. Verify canonical retained origin/Host and the original Request/header witness. Native claim/hash/expiry/no-users authorization remains inside DB. No CSRF issuance/check-as-mutation, native-write frame, domain adoption, claim renewal or invented administrator.

Actual owner limits/clock/lifetime are `OwnedSql.configuration`; retained origin/providers/policy are in `OwnedSql.onboarding.configuration` and the genuine SQL issuer's captured requestConfiguration. They must agree by original retained identity/value; never replace now/skew/providers per call. The existing issuer/request configurations have **no version, Docker/Kubernetes flags or Workshop URLs**. Version exists in future Backend authentication input; flags/resolved URLs require its real startup/configuration producer.

A narrow prospective `ProductionOnboardingCoreConfiguration` can be declared in sql-persistence from `Pick<OnboardingCoreReadConfiguration, "version" | "dockerEnabled" | "kubernetesEnabled" | "workshopApiUrl" | "workshopUrl" | "maximumResponseBytes">`; serverOrigin/providers/native clock/limits are derived privately from the retained owner, not caller overrides. These missing environment inputs must be captured once through the genuine Backend construction chain and bounded under approved policy. Plain caller booleans/URLs are not authorization. Do not infer disabled services from anonymous/setup/public-only state or reuse A's4096 write-response limit as the CORE envelope cap.

## Delivery dependencies / gates

After DB3 final acceptance/fresh checks, the original-binding/configuration design must close and this Auth plan be approved before any explicit Auth3 writer lease. Future API still supplies the real one-leaf currentStep SDK/schema/error path and existing pure normalization. Future Backend must supervise the original-bound result/serialization/cache, final SDK/header budgets and delivery revalidation; anonymous claim delivery needs its separately approved guard/drain. Detached result is not an enrolled route/document, SSR prop, favorable setup state or client receipt.

Auth9/five wire endpoints/twelve reads/three writes, signals/cache/native publication, E/F and count91 remain untouched. CORE numeric caps/bootstrap branch are unchanged; no optional primitive/negative-unknown feature authority is introduced. Parent SSR, probes, PostgreSQL/native/application data, runtime/FS/installation/browser/socket and completeSetup/full125 acceptance remain held.

Only dedicated frozen-source/interface/report reads and this NEW report patch occurred. No source edit, command/hash/stat/check/evaluation/import/test, SQL/native/Engine/network/Context7/private configuration/data/nested agent or activation. No existing plan, freeze or failed receipt was modified.
