# Onboarding pre-receipt frame verifier — minimal three-file plan

**Ready for independent original security/lifecycle plan review. Not product authoring authority, phase-B completion or SOURCE ACCEPT.** Close only the missing non-consuming public Auth association verifier identified in `convergence-onboarding-wire-api-source.md`.

Prospective product scope is exactly `packages/auth/nitro/production-sessions/{sql-persistence.ts,service.ts,index.ts}`. No additional capture path is required: the original producer argument is available in SQL configuration before the validation copy is made. `onboarding.ts`, its private body/clock methods, DB and all API/MAIN paths remain protected.

## 1. Actual constructor/copy boundary

Dedicated immutable source reads establish:

- `service.ts:1334–1340,1373–1382` receives the sixth `onboardingInputSource` argument and forwards that same reference to `configureProductionSessionSqlOnboarding`; the captured issuer configuration object does not replace that argument.
- `sql-persistence.ts:1657–1690` receives `inputSource`, creates a temporary own-data validation record at 1670, and checks the frozen three-function shape. In the currently read source, `value.onboarding.inputSource` at 1682 stores the **original parameter**, not that temporary record.
- `onboarding.ts:270–277` confirms `onboardingOwnRecord` really creates a different object containing descriptor values and rejects accessor descriptors. The copy must never be treated as the original API producer merely because function references match.
- Existing frames retain the operational captured source at `sql-persistence.ts:2183–2189`; `assertOnboardingFrame:2138–2155` checks it against the owner's operational source.

Thus original identity is available within this lease. The plan explicitly separates identity from the copied three-function data rather than assuming a captured copy equals the original. This is a source-reading clarification, not a change to the supplied accepted Auth generation or a claim that a frozen source shape proves API registry membership.

### Minimal startup capture addition

At the existing SQL configuration call, add one private optional capture record to `OwnedSql.onboarding` (`188–194`):

- `original`: `WeakRef<ProductionOnboardingRpcInputSource>` pointing to the **actual incoming constructor argument**, captured once at startup;
- `functions`: a typed frozen `ProductionOnboardingRpcInputSource` snapshot containing only the same three validated own-data function references.

Populate it only when the source is present, after the existing own-data/frozen/three-function validation and before assigning the immutable onboarding configuration. Keep the existing operational `inputSource` and its method receiver semantics unchanged. No wrapper consumer, source replacement, extra constructor argument or public identity/snapshot getter is added.

The new verifier must require `capture.original.deref() === suppliedInputSource` independently of function comparisons. Separately require each operational frame/source function reference and each supplied-original function reference to equal the corresponding frozen snapshot reference. Function equality establishes **snapshot consistency only**, never original object identity. Do not invoke those functions to verify them.

The identity field is weak; snapshot references duplicate only already retained consumer functions. Add neither issuer/SQL owner/Runtime nor request/context/receipt references to that capture. No new identity/snapshot fields enter detached publication state. Missing source/capture remains unavailable only to the new codec/verifier seam; the existing five-argument constructor/raw canonical paths retain their behavior.

## 2. Exact public/internal ports

New public export through the existing production-sessions entrypoint:

```ts
assertProductionOnboardingRpcFrame(
  issuer: ProductionSqlSessionIssuer,
  originalRequest: Request,
  frame: ProductionOnboardingRpcFrame,
  ticket: ProductionOnboardingInputTicket,
  packet: ProductionOnboardingRpcPacket,
  finalContext: ProductionOnboardingRpcContext,
  inputSource: ProductionOnboardingRpcInputSource,
): void
```

Its internal SQL port is `assertProductionSessionSqlOnboardingRpcFrame`, with leading `owner: ProductionSessionSqlOwner`, then `issuer: object` and the same remaining arguments/types. All types already exist/export; no new public DTO, type/brand, opaque handle factory or `onboarding.ts` edit is needed. Reject through the existing `ProductionOnboardingError`; no new public error discriminator or returned permission fact is introduced.

### Read-only assertion sequence

1. Service resolves the issuer through the existing `onboardingSqlOwner` (`service.ts:1537–1541`) and calls the actual SQL assertion. Foreign issuer objects cannot select another owner or install a source.
2. SQL resolves the existing private frame/ticket using `onboardingCodecFrameFor:2198–2209`, which calls the actual `assertOnboardingFrame` and `assertOwnedOnboarding`. No lookup creates/adopts a record. Reuse their live owner/readiness/membership and original request clock/signal/header currentness checks; no post-retirement publication guard is substituted.
3. Require `record.phase === "captured"`, `frame.consumed === false` and no recorded request failure. A retired/closing request is already rejected by the live helper. Do **not** add this pre-consumption phase restriction to shared `assertOnboardingFrame`, because real preparation uses that helper after its phase/consumption transition.
4. Compare the actual registered `record.state.request` to `originalRequest`, `frame.ticket` to `ticket`, `frame.packet.handle` to `packet`, and `frame.context` to `finalContext`. Existing helper checks also require all underlying frame/ticket/packet/request maps, issuer/owner associations, exact context Request/original operation signal, frozen context, command URL and matching ticket kind. A returned bundle's freeze/shape is not a capability assertion.
5. Require the startup identity capture and compare its dereferenced original object to `inputSource`, then verify all three immutable function references against the captured operational source and supplied original. A copied source with identical functions rejects at the identity comparison. Never enroll an unknown producer during assertion.
6. Enforce the existing captured `demoEnabled && readOnly` rejection by reading the owned immutable policy. Rely on the original already-admitted packet/header witness and existing decreasing clock/signal checks; **do not call `admitMutation`**, which tightens state, or reread/revalidate the body/cache. Header changes/expired bounds cannot pass the existing currentness guard.
7. Return void after all checks. No preparation/hash/SQL, consumer call, phase/failure transition, ticket consumption, receipt insertion, task creation/drain or data output occurs. Existing clock checking may advance its normal monotonic observation; it never recaptures a start/deadline/budget. This is not a promise-producing operation or a dry-run preparation.

## 3. Exact cut positions

| File                 | Prospective cut                                                                                                                                                                                                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sql-persistence.ts` | Private capture record in `OwnedSql.onboarding`; original weak identity/frozen function snapshot in existing `configureProductionSessionSqlOnboarding:1657–1690`; concrete non-consuming assertion adjacent to `onboardingCodecFrameFor:2198–2209`. Reuse—not widen—the existing private helpers. |
| `service.ts`         | Import the SQL assertion and add its exact issuer-wrapper near the existing bounds/frame ports (`1543–1582`). Existing sixth-argument forwarding/constructor semantics remain unchanged.                                                                                                          |
| `index.ts`           | Add only the named assertion to the existing service export block near frame creation (`17–23`). Existing types/exports remain unchanged.                                                                                                                                                         |

No new helper file, dependency/library, Auth→API import, comment/test/cast/any/suppression, callback/registry setter, body getter, caller SQL/policy hook or generic owner framework is proposed. No raw cookie, credential/hash, private owner or internal record is returned.

## 4. Failure timing / separate proofs

API B's real controller constructor can assert before publishing its active controller. After the actual installed SDK match/decode/schema steps, its schema-handler closure must assert **again immediately before receipt birth**, then insert the receipt directly in its co-located private registry and invoke the matching real from-codec preparation. No await/caller callback is inserted between that final assertion and receipt insertion.

The assertion is repeatable while the same live association is unconsumed. Preparation currently marks `frame.consumed = true` and phase preparing before invoking the source consumer (`1935–1965`); therefore the API consumer must **not call this pre-consumption port afterwards**. It separately validates/consumes its genuine private SDK receipt; Auth's existing preparation continues performing its own live internal association checks. A successful earlier assertion is not a reusable permission token if work becomes stale during an SDK await.

Source-review cases (not tests/results):

- Accept repeated assertions of the exact existing live, unconsumed frame/ticket/packet/context and originally captured producer, under the original budgets/mode.
- Reject copied/foreign frame or ticket, real objects cross-paired from different records, copied packet, copied context with equal fields, replaced Request/signal, wrong command, foreign issuer/owner and a different producer—including a frozen source carrying the same three function pointers.
- Reject missing startup capture, changed function snapshot consistency, failed/stale/retired/closing/consumed association, preparation/dispatch/settled phase, changed headers, aborted original signals/lifetime, invalid/expired original clocks and demo-enabled/read-only mutation mode. Do not create a replacement association on any failure.
- Neither accepted nor rejected assertion consumes a ticket/receipt or starts native work. No post-retirement, GET-CSRF or publication use is granted.

This port proves only the existing **Auth association/currentness**. Actual API factory verification, private WeakRegistry membership and matched path/procedure/schema/decoded-input lineage remain B's separate proofs. Actual Application root/final BackendContext factory birth remains C's explicit prerequisite; identity against Auth's registered context alone does not manufacture that MAIN proof. Neither assertion nor native acknowledgement proves physical response publication.

## Holds and review ownership

This is a closed plan within the three prospective files; no additional original-source capture path/port is needed. Original security and lifecycle reviewers should assess the weak identity/snapshot capture and non-consuming timing together before authoring. Auth A SOURCE ACCEPT and supplied 13 type/style-zero evidence remain recorded; API B's new paths remain absent and its existing paths unchanged. No renewed source/check PASS is claimed.

Preserve the accepted body-hint/once-read/physical cleanup, dual clocks, preparation-once, known COMMIT/quarantine, GET and detached native publication semantics. Existing B–F/MAIN/API/enrollment and completeSetup holds remain unchanged. Publication coordinator preflight HOLD/first-source-guard-zero is separate; its live C/H state and historical artifacts were not read or used to clear any hold.

Only this new report patch is written. No product edits, commands/hashes/stat/checks, evaluation/imports/tests, SQL/native/Engine, network/private configuration/data or nested agents occurred. Dedicated immutable constructor/helper/export reads only were used; existing plans/reports/captures/receipts/controls were not modified. This plan grants no source authoring, runtime/init/publication or phase-B completion authority.

## Controlling amendment — reuse existing original-source identity

**Ready for the original reviewers' plan rereview only.** Original lines 1–90 are preserved. This appendix supersedes only the redundant weak-identity/function-snapshot additions and their dependent checks/review wording; all other signatures, scope, timing and admission rules remain controlling.

The confirmed source invariants suffice: `value.onboarding.inputSource` already retains the actual incoming constructor object; `frame.source` retains that operational object; `assertOnboardingFrame` compares those references. The existing constructor validates a frozen object with exactly three own-data consuming functions. The temporary `onboardingOwnRecord` validation copy is **not** the stored original producer. Do not equate that copy with the original or create another identity representation.

### Minimal assertion body

1. Resolve the existing private frame/ticket/packet/request/issuer-owner association through the planned existing helpers. Apply the same live pre-consumption phase, unconsumed/no-failure, original Request/context/packet identity, command, signal/header/clock and mode checks.
2. Require the owner's operational input source to be present, then require **`suppliedInputSource === actualFrame.source === owner.onboarding.inputSource`**, expressed as the two direct reference comparisons. This uses the real stored constructor parameter, not function-pointer/brand/shape equivalence.
3. Return void without creating/adopting records, reflecting over the source again, invoking any consumer or changing phase/consumption. Existing normal clock observation remains permitted as originally specified.

A frozen structural copy carrying identical three functions fails the source-reference comparison. Existing startup own-data/freeze validation already preserves those method references; no additional snapshot consistency machinery is needed. Missing operational source replaces the original plan's “missing startup capture” case. New weak-capture/snapshot failure cases are removed because those fields will not exist. All copied/foreign/stale/retired/consumed capability and currentness cases remain unchanged.

### Superseded cuts / preserved boundary

Do **not** add a WeakRef capture, function snapshot, configuration field, constructor argument, Set/Map, registrar or retired graph. `OwnedSql.onboarding` and `configureProductionSessionSqlOnboarding` remain unchanged. The sole SQL-file addition is the concrete non-consuming verifier beside the existing frame lookup helper; the service wrapper and index reexport remain the other two planned cuts. The public/internal signatures are unchanged.

The API constructor and actual schema-handler may call the verifier before receipt birth, but not after preparation consumes the frame. Repeat live assertions do not become reusable permission facts. This port proves only Auth association/currentness; genuine API factory registry, SDK match/procedure/schema lineage and actual MAIN context-factory birth remain separate required future proofs. No decoding, native or publication acceptance follows from source identity alone.

Source authority remains the supplied frozen Auth generation (`sql-persistence.ts` ad705fa8…; `onboarding.ts` 80056246…). No product source was read or edited for this amendment, and no commands, hashes/stat/checks, evaluation/imports/tests, SQL/native/Engine, network/private configuration/data or nested agents were used. Only this append was patched. The separate publication coordinator's completed-file result review/live C/H state was not read. This is not SOURCE ACCEPT or an Auth writer release.
