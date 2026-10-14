# Onboarding MAIN first-request join — five-file source freeze

## Outcome and scope

**The approved five-file body is authored and source-frozen for independent review and coordinator checks.** This is not SOURCE ACCEPT, a fresh lint/typecheck/format result, native/runtime acceptance, transport compatibility, mounting, enrollment or usable onboarding.

The controlling plan is `convergence-onboarding-main-request-plan.md`, including both controlling amendments: fixed server-owned policy and Application-owned context registration without first-lookup TOFU. Coordinator supplied actual Auth4 SOURCE ACCEPT and predecessor **37/37 checks, 33 lint, format 0** at `TEMP/nitro-after-auth-ui-repairs-sxndddw6`. Those are prerequisites supplied to this author, not reproduced checks or acceptance of these changed MAIN bytes. Frozen historical child artifacts do not prove the current MAIN join.

Exactly these product paths changed:

1. `apps/backend/src/server/application.ts`
2. `packages/contracts/src/request.ts`
3. `apps/backend/src/server/runtime-composition/auth.ts`
4. `apps/backend/src/server/runtime-composition/assembly.ts`
5. `apps/backend/src/server/runtime-composition/native-main-persistence.ts`

No additional producer/caller file was needed. No Startup/compose, Auth, DB, route factory, transport, enrollment, dependency/manifest, test, view or source-count file changed. No comments, new casts, `any`, suppressions, generic framework, dummy resource, currentVersion placeholder or new dependency was added. The original plan/history was not rewritten.

## Actual authored cuts

| Source                                           | Concrete body                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `native-main-persistence.ts:590–665,676–716`     | Synchronously captures actual existing demo flags and requestDeadlineMs; validates booleans and budget in `1…2_147_483_647`; derives one frozen policy with cookie **16,384**, credential **4096**, onboarding response **4096** bytes. Rejects inconsistent, inherited/accessor or malformed supplied policies; exactly matching own-data policy values do not retain caller identity. Supplies the same internally derived object through captured.issuer to the real issuer constructor and through onboardingPolicy to request resources. |
| `auth.ts:96–130,176–270,284–377`                 | Fixed immutable capture-only four-POST descriptors; retained issuer/policy identity; synchronous public Auth capture on the original Request; weak repeat guard, private carrier registrations and enumerable active wrappers. Disposal prepublishes a cached completion in pending accounting before invoking the actual Auth disposal port, retains its actual underlying promise/settlement/error and removes active accounting only after settlement.                                                                                     |
| `auth.ts:843–859,987–1017,1053–1079`             | Concrete optional-service implementation in authenticated resources, exact context/carrier lineage retention, Application assertion before private handle lookup, and complete wrapper retirement/drain on resource abort/close. No first-context adoption, lease transplantation, clock reconstruction or public-disposal-error-to-owner-fault heuristic.                                                                                                                                                                                    |
| `assembly.ts:209–214`                            | Explicitly forwards the retained synchronous capture service beside unchanged resolvePrincipal/authorize/resolveSetup. Public-only services need no no-op capture implementation. No onboarding contribution or handler was added.                                                                                                                                                                                                                                                                                                            |
| `application.ts:16–59,162–166,428–459`           | Private Application root/request membership and module-private context WeakMap; synchronous capture call before readiness, principal/body/decode work; immediate real disposer registration and captured-request abort retirement.                                                                                                                                                                                                                                                                                                            |
| `application.ts:485–524`                         | Registers the actual fully constructed RequestContext synchronously before authorization/routes/render. Exported assertion validates actual WeakMap key, private root membership/lifetime, original Request and both Request/combined signals, requestId/onDispose, exact carrier and live request state. No registration setter or structural/frozen-copy admission exists.                                                                                                                                                                  |
| `application.ts:248–262,325–349,352–358,529–585` | Cached real retirement invalidates private context state synchronously; deny/pass/unmatched and returned error responses await it before failure publication. Catch retains the original error and separately reports a distinct disposal error. Ordinary disposal awaits callbacks, removes the context key/root membership after settlement, and finishes the existing request accounting.                                                                                                                                                  |
| `packages/contracts/src/request.ts:15–44`        | Dependency-light four-command carrier with readonly command/disposeAsync, optional synchronous start service, optional context carrier and narrow principal-input type binding. No principal/token/clock/policy/SQL/issuer handle is exposed in the carrier.                                                                                                                                                                                                                                                                                  |

The sole real ingress call is:

`captureProductionOnboardingRequest(issuer, originalRequest, requestId, originalCombinedSignal, applicationLifetime)`.

Clock capture remains owned by Auth and happens once on the initial Application handle stack, before `await ready()`. MAIN never samples Date.now/performance.now for onboarding, supplies trusted time through a DTO, or refreshes the original budget. Exact origin/cookies/providers/secrets/clock/bodyBudget and owner lifetimes remain on the existing constructor chain. Auth's fixed **65,536-byte header witness cap** is unchanged. The unchanged public Auth constructor privately captures/copies the policy; this source does not claim reference equality with that inaccessible private copy.

The disposal carrier invokes only:

`disposeProductionOnboardingRequestAsync(issuer, retainedOpaqueRequestHandle, originalRequest)`.

Both the Application adapter and resource wrapper cache/prepublish their completion before forwarding work. A repeat call reuses that promise; source errors are not wrapped into a new classification. Resource abort retires all active wrappers; resource close waits their actual settlements alongside existing pending and association cleanup. Public onboarding disposal rejection is retained locally, not treated as evidence requiring shared-owner abort. Auth's accepted private cleanup/native classification and owner-close summary remain authoritative; no new strong request-error history was created.

## Exact capture eligibility, not handler activation

| Command              | Method and exact path                        |
| -------------------- | -------------------------------------------- |
| claim                | `POST /api/onboarding/claim`                 |
| nextStep             | `POST /rpc/onboard/nextStep`                 |
| initUser             | `POST /rpc/user/initUser`                    |
| initialExternalGroup | `POST /rpc/group/createInitialExternalGroup` |

There is no descendant/generic RPC/body-selected capture. Ineligible requests do not call the Auth capture port. Actual authenticated MAIN always derives its policy; it is not disabled by an absent arbitrary startup policy. Real demo flags remain unchanged, including the accepted Auth/DB mutation predicate; nothing defaults to writable.

The descriptor table is capture metadata only. No preparation/dispatch port, new RPC factory, claim handler, route stub or publication enrollment was installed. An unmatched/pass/error captured request retires before its rejection is released. The existing ordinary principal admission, authenticated reads/fixed writes and nine Auth descriptor/controller/publication identities remain unchanged except the narrowly guarded captured-onboarding failure handling in Application.

## Fresh source evidence and freeze

Private evidence directory:

`/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-onboarding-main-request-source-d2f5dd33be7b02edd8d4d05f`

Two bounded pure `python3 -I -S -B` file-capture commands created the directory with mode **0700** and artifacts using **O_EXCL / 0600**. They read only these five source files and their retained before-images/manifests, hashed bytes and generated difflib unified diffs. No application import/evaluation or compiler/runtime operation occurred. `before.json`, `after.json`, all ten source images and all five diffs are retained; every diff was read as source evidence. No product write follows the after capture.

| Source                                           | Before SHA-256                                                     | Frozen after SHA-256                                               | After bytes/lines | Retained images/diff                         |
| ------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------ | ----------------- | -------------------------------------------- |
| `application.ts`                                 | `a58e958e954779babc44d01a8a8f3596bd70253778e8928937126a4d29f95de9` | `81affce9c7ee547ca7faeb46e7f68b387307772b1232708d00dddcdef2c210ad` | 32819 / 849       | `0-before.ts`, `0-after.ts`, `0-source.diff` |
| `packages/contracts/src/request.ts`              | `58a8289344e76384150bc64f4cfb6f5ae3eaab21f4472e573b620cb016b88707` | `e5fd2848937cea81d5ce25c07c7a0446963c4785549ee8dbed61239344d9c8c0` | 2199 / 51         | `1-before.ts`, `1-after.ts`, `1-source.diff` |
| `runtime-composition/auth.ts`                    | `c3f77335a055c1c4d40deeef8902c3adb33727be5f6746c89f92f5f51250e304` | `32878b4ac5c6295268bc749537764cadcb2f65f7267e081850be0c330dce0744` | 42201 / 1084      | `2-before.ts`, `2-after.ts`, `2-source.diff` |
| `runtime-composition/assembly.ts`                | `a0f5fa487c70460e3a7c5a220b7d07f373a5f3d91ae769c147079cd99a17f841` | `1b135ca457c381572ca2660d84d19c5c49da891e14d8d2843598adcbc3625a44` | 15392 / 394       | `3-before.ts`, `3-after.ts`, `3-source.diff` |
| `runtime-composition/native-main-persistence.ts` | `5e44fd1ceeb879b15c7ac33895bf0caaa59738b60680183a655fe9806e021084` | `6b31f4d774fd2ad791a839160ecbd1b64bc11ee834c1e450606472ff82061360` | 53914 / 1334      | `4-before.ts`, `4-after.ts`, `4-source.diff` |

## Continuing holds and coordinator handoff

- Independent five-file source review and fresh focused compiler/lint/format checks are due **after this freeze**. None were run here; predecessor checks do not transfer to changed source.
- Raw canonical JSON versus actual generated oRPC packet/decode/body ownership is still held. This cut reads no onboarding body or decoded DTO. Catch and returned HTTP errors now await retirement, but an oRPC failure hidden in a successful-status packet still needs its own reviewed adapter join.
- Exact final BackendContext, command-correlated prepared input/handle binding, CSRF GET/POST/client propagation, API bodies, output and physical publication/abandonment remain held. Application outer-context provenance is not that final integration.
- No onboarding handler mounting/enrollment, native execution, first-user/sign-in/external login or usable flow acceptance is claimed. completeSetup remains entirely absent/deferred.
- No unrelated scratch control, C+H metadata, view/source counter, legacy UI, Auth/DB source, historical artifact or consumed HELD native attempt was edited or relabelled accepted.

Only the mandatory patch tool authored product changes and this new report. Apart from the two authorized pure source captures, no commands/checks, compiler/lint/format/evaluation/tests, runtime/SQL/Engine/network, private configuration/data or nested agents were used. This handoff supplies frozen source and its actual diffs/pins, not a promise of later implementation or new execution permission.
