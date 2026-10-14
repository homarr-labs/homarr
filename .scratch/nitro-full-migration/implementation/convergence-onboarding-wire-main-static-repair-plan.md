# MAIN C5 — narrow static repair plan

**Report only; prospective two-file cut, not a writer grant or SOURCE ACCEPT.** C5 remains frozen at `nitro-onboarding-wire-main-source-ccc010a072e649d64c6b5645`. Joint security/lifecycle reviews are active; reconcile both findings before any product edit. The construction/readiness plans and full C–F contract remain controlling.

## Diagnostic evidence

Read coordinator records under `T/nitro-onboarding-wire-main-checks-11_unm4v/records/`. The actual backend record is `apps-backend.stdout` (the supplied `backend.stdout` shorthand); `lint.stdout` reports nine warnings and two errors. Supplied run status remains two type roots failing, lint exit 1, format 0 and source conservation, not repaired-source evidence.

| Frozen location                        | Minimal prospective correction                                                                                                                                                                                                               |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `native-main-persistence.ts:1140–1180` | Task-local checked issuer/request references inside actual claim execution, before its first await; use those exact references for preparation, bounds, dispatch, serialization, registration, projection retirement and A publication read. |
| Same file `1181`                       | `Object.freeze<OnboardingRpcRequestResult>` on the existing result literal, preserving every field and the existing `cleanup.kind: "none"` value.                                                                                            |
| Same file `1187`, `1227`, `1244`       | Equivalent local checked issuer reference at synchronous publication birth and pending failure/abandonment entry; retain it only through that actual operation. No post-retirement work guard.                                               |
| Same file type imports `23`, `25`      | Remove only unused `ProductionOnboardingRequest` and `ProductionOnboardingRpcCommand`.                                                                                                                                                       |
| `onboarding-rpc.ts:152`                | Annotate the existing callback parameter `cause: unknown`; keep its identical abandonment decision/body.                                                                                                                                     |

Backend TS18048/TS2345 diagnostics concern optional references captured by nested function declarations despite the constructor check at `1094–1105`. TS2322 separately reports nested `cleanup.kind` widened to `string`. TS7006 concerns the unannotated abandonment parameter. These are distinct corrections; a cast or suppression does not supply physical ownership.

## Required task-local ownership grounding

`start()` publishes the real request record and handler/execution tasks (`1113–1136`); `executeClaimAsync` invokes `claimResult` through that prepublished execution task and awaits failure cleanup before its finally block (`1295–1309`). At **claimResult entry**, before preparation or either GET/POST await, obtain local const aliases of the exact issuer/request references selected by this wire's real native construction. Explicitly reject absence before use. These are the original objects, not a getter-adopted replacement owner or a newly captured global/controller resource.

All nested pending dispatch/serialization/registration callbacks use those narrowed task-local constants. They must not reread mutable optional owner fields after awaiting, add another persistent retention slot, or pass a structural substitute into A. Existing constructor identity/publication prerequisites, capture assertions, original bounds and closing checks remain in place. No new native ready/lifetime/work check is inserted after ordinary Auth retirement.

The synchronous `deliver` function needs only a locally checked original issuer for publication birth after its existing signal/closing checks. The asynchronous `fail` function needs only that original issuer retained through actual abandonment; acquire/check it before its first await, not after controller close. This check establishes reference availability, **not live work admission**: closing/failure-retired publication still uses genuine A settlement. An impossible missing owner is not permission to skip abandonment, invent cleanup success, replace the first primary, or acquire a fallback issuer.

### What the frozen close path establishes—and what it does not

The inspected source assigns `authIssuer`, `authRequests` and `authConstructionResult` only during authenticated construction (`1013`, `1043`, `1063`); no shutdown assignment clears or replaces these references. A wire requires the published authenticated construction result. Construction-failure cleanup (`1067–1080`) belongs to failed construction, not a successfully published wire.

The relevant physical close ordering also precedes Auth teardown: wire close joins active handler completions at `1351`, then actual publication abandonment/completions at `1352–1359`; native owner close awaits the wire and its work before Auth-request/issuer cleanup at `707–739`. Thus these diagnostics alone do **not** reveal a closing-clear race requiring a replacement producer. Reference non-absence alone would not prove this ordering; the real pending-task drain is the prerequisite for safe local narrowing.

This is bounded static grounding, not independent lifecycle acceptance. If either active reviewer identifies teardown before these actual tasks settle, the type-only interpretation stops: report the exact retained-owner/task-drain gap and reconcile its lease first. Do not conceal it with const aliases, non-null assertions or favorable state. No extra file or public port is justified by the supplied static diagnostics themselves.

## Preserve behavior and scope

The typed result literal does not manufacture cleanup success: it keeps the existing value only at the same return point after real registration, projection retirement and publication read. All existing rejection paths still bypass that return. No `as const`, cast, new fallback, changed error cause, interface placeholder, helper file, task restructuring or warning cleanup is proposed.

Public source-port types/signatures, native publication/clocks, original Request/frame/context identities, claim mapping, four routes/five method descriptors, ready/release ownership and abandonment ordering remain unchanged. Do not modify `auth.ts`, `contracts.ts`, `onboarding-claim.ts`, protected A/B/DB sources or D–F files for this static cut. Nine lint warnings are outside this plan.

After joint findings reconcile and an explicit two-file lease is issued, the writer must produce a new freeze; coordinator checks must target those new bytes. Current format/conservation and prerequisite acceptances cannot be relabelled as repaired PASS. D–F/enrollment/client/activation remain held; historical native evidence belongs to its old generation, not current MAIN proof.

Only dedicated immutable C source/diagnostic reads and this NEW plan patch occurred. No product edits, commands/hash/stat/checks/evaluation/imports/tests, SQL/native/Engine, network/private configuration/data or nested agents. Original source reports, images, plans and review scopes remain unchanged.
