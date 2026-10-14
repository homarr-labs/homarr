# Onboarding owned request — minimal Auth2 repair plan

## Decision and fixed scope

**Ready for independent plan review; no product repair is released or authored here.** Coordinator reports both Auth4 reviews HOLD on one common P1 and two P2 findings. Repair exactly:

1. `packages/auth/nitro/production-sessions/onboarding.ts`
2. `packages/auth/nitro/production-sessions/sql-persistence.ts`

Keep `service.ts`, `index.ts`, repaired DB4, `persistence.ts`, existing Auth/Board/App bodies, descriptors, API factories, MAIN and enrollment unchanged. No fifth file, shared-ledger change, generic history/owner framework, helper file, new callback authority or native command is needed. completeSetup remains absent/deferred.

Frozen Auth4 stage is `nitro-onboarding-owned-request-source-6724efd4def2f92c673a30bf`. The following are **copied recorded after-pin labels**, not new hash verification:

| Source               | Frozen after SHA-256                                               | Repair treatment          |
| -------------------- | ------------------------------------------------------------------ | ------------------------- |
| `onboarding.ts`      | `239524acd16a9637a36a9712c1ee8d42eb905aa122d83d602352e9441a6ef3a9` | Prospective narrow repair |
| `sql-persistence.ts` | `6298270f2603fe28c5b219e2ea3ae6d319c825c16a3b62aa39fe0b17f2ad1d75` | Prospective narrow repair |
| `service.ts`         | `e29b43325c7814bad371f13df68541b525a331f51df919aa7e456e54ed27e10a` | Unchanged                 |
| `index.ts`           | `1118ff1cf7a48f161c97a134bbc9aaf05b8cc8e5f01d45a1f1edae362d198d4b` | Unchanged                 |

No changed source has new native/check acceptance. Old 37/37 checks and prior controls retain original-source historical provenance; Auth4's frozen report is not rewritten as accepted.

## Actual defects and producer facts

| Actual source read                                                | Finding/consequence                                                                                                                                                                                                                                                                                                                                            |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sql-persistence.ts:1572–1575`                                    | Automatic retirement catches any disposal rejection and aborts the **shared** SQL owner controller with a cleanup-labelled error. Ordinary onboarding request failure can therefore disable existing issuer/Auth/Board/App work.                                                                                                                               |
| Same file `2027–2057`                                             | One failures array mixes retained request failure, prepare/dispatch task rejection, ledger drain rejection and actual lease-release failure. Even physically successful cleanup rejects disposal for a failed request; this mixed rejection is not evidence of an owner fault.                                                                                 |
| `persistence.ts:125–155`                                          | Ledger tasks are real deferred promises; `drainAsync` waits all of them and then rethrows its retained task failure. Invalid credential/body/hash interruption can therefore make drain reject **after physical settlement**. The ledger provides no separate cleanup provenance. Do not infer cleanup from its error class/code or change this shared ledger. |
| `bounded-body.ts:68–84,129–148`                                   | Current reader observes real cancel/read/closed/release work but collapses cancel/release failures to a settlement boolean/error, without returning the caught cleanup causes. `reader.closed` rejection is deliberately treated as an observed terminal stream state. Its external rejection alone cannot produce the requested typed cleanup facts.          |
| `sql-persistence.ts:2067–2070,155,3454`                           | Every rejected retirement appends a complete error graph to an unbounded owner-strong array, including ordinary request errors. Close later aggregates that array.                                                                                                                                                                                             |
| `onboarding.ts:207`; `db/runtime-onboarding/contracts.ts:243–246` | Auth rejects readOnly alone; accepted DB rejects exactly `demoEnabled && readOnly`. This flag is the demo mutation predicate, not a newly invented global DB read-only bit.                                                                                                                                                                                    |

The existing private request/operation WeakMaps, actual request phase/native/failure record, enumerable active requests, original authority signals, body provenance, canonical hash and dual budgets are retained. The repair changes retirement facts/routing/history and the one mode predicate, not the established request security model.

## P1 — typed retirement facts, separate public reporting

### One real producer, two consumers

Replace the single mixed retirement rejection path with **one private cached retirement promise producing a discriminated result** in sql-persistence.ts. Its result is one of:

- `settled`: actual task/body/ledger/lease retirement has finished; retains the request's original primary outcome and actual native outcome separately. This does **not** mean the request succeeded.
- `cleanup-failed`: retirement has finished its available settlement attempts; retains the same primary/native outcomes plus the actual nonempty cleanup-failure collection, with each entry's fixed cleanup phase and caught cause.

The record retains this result/promise privately through its existing weak registration. Its existing public `closing: Promise<void>` can remain the cached **public disposal adapter**, so service/index signatures do not change. Add a separate private retirement field rather than making auto cleanup inspect a public disposal error. Use explicit pending/settled record states; do not fabricate a successful status before real tasks and cleanup have settled.

The automatic callback consumes the typed retirement result directly. `settled` with an invalid request/cancelled preparation requires **no shared owner abort**. Only `cleanup-failed`, produced by actual failed cleanup operations, enters owner fault handling. Neither `ProductionOnboardingError`, `IssuerStagingError`, a code, `criticalStage`, a public rejection or a guessed plain boolean is the automatic branch discriminator.

Public disposal consumes that same completed result:

- With no cleanup failure and a retained primary error, reject with **the identical original recorded error object**. Do not synthesize another wrapper/aggregate merely because disposal was called. Its cause/nonretryable classification and command failure remain unchanged.
- With no primary/cleanup failure, resolve void after physical settlement.
- With genuine cleanup failure, retain the primary cause first and actual cleanup causes in deterministic order. Preserve confirmed-commit settlement classification or native COMMIT ambiguity where present; do not turn either into rollback, successful request or retryable conflict. Native evidence/result/promise remains unchanged in its original private record.
- Cache this public adapter once. Repeated idempotent disposal returns the same promise/error and never starts another cleanup/counting operation.

No new preparation/dispatch result is fabricated. The existing preparation/dispatch catch paths still record and reject their original per-request errors. The retirement result labels only the resource retirement, not the source command's success.

### Actual cleanup-array producers within these two files

**onboarding.ts:** introduce a narrow onboarding-only body-retirement facts collection and an owned body-byte reader implementation inside this existing file. Mechanically retain the current reader's byte cap/growth, original Request, UTF-8/JSON/schema semantics, signals, decreasing budget, one cancellation, actual pending read and reader release order. This local cut is necessary because the unchanged shared reader's external error has discarded the underlying cleanup causes. Do not classify `reason: 'settlement'` after the fact or accept a caller status/callback.

At the actual source operations retain facts separately:

1. `reader.read()`/decode/schema/admission/hash rejection belongs to the **primary request** channel.
2. Record an actual thrown/rejected `reader.cancel()` at the cancellation operation as a cleanup failure, preserving its caught cause. Cancellation is invoked once; do not count its awaited rejection a second time.
3. Await any actual pending read and the actual `reader.closed` settlement even after interruption. A terminal errored stream/read rejection is a primary/terminal fact, not automatically a cleanup failure; preserve the shared reader's existing closed-observation semantics. Do not label every closed rejection as an owner failure.
4. Record an actual `releaseLock()` or actual retirement detach/timer-release failure at that operation as cleanup provenance; continue remaining settlement attempts rather than short-circuiting them.

Keep ordinary body-reader outward rejection behavior and existing ledger wrapping at its current source boundary. The new facts collection retains the underlying cleanup causes separately; it does not rewrite ordinary public primary errors or hide a failed cancel/release. Use existing body-budget validation/error definitions through local imports as needed; **do not modify bounded-body.ts or persistence.ts**. No API body/SQL/preparation callback or new transport decoding is introduced.

**sql-persistence.ts:** drive retirement from the cached private promise, prepublished before retirement operations. Independently attempt detach/request retirement, await the existing real request tasks, drain the real ledger and release the real captured lease. After task settlement read the **final** record.failure/native outcome, not a stale snapshot taken before a pending hash/native task finishes.

- Task/ledger primary rejections remain in the private request outcome channel. A ledger drain rejection caused by a settled failed task is not added to the cleanup collection.
- Body cleanup facts come from the actual local reader producer above, even if the reader's outward error was wrapped by the ledger.
- An actual `lease.releaseAsync()` rejection is added at that awaited operation, not guessed from an earlier admission/current-authority failure. Its release is real and idempotent (`sql-authority/authority.ts:373–387`).
- Retain actual failures from the retirement driver’s own detach/abort/release operations, attempt the other cleanup work, and settle the typed outcome only afterwards. Unexpected actual driver failure must be retained as a real owner/retirement fault, not silently replaced with settled success.

This closes the provenance gap in two files. Do not use a fifth-file ledger flag or add a fabricated “cleanup verified” DTO.

### Active work and close routing

Keep preparations/dispatches prepublished in the current owner task sets and request tasks. Add only a private weak task association identifying **these actual onboarding** preparation/dispatch/retirement promises and their existing owned record; no generic history/cache framework. Close can then distinguish a live onboarding primary task rejection from a genuine cleanup failure without changing any legacy task producer or inspecting error codes.

The private retirement promise belongs to owner pending accounting. The public adapter's expected primary rejection is **not** owner cleanup evidence or a second retirement task. Close still awaits every live onboarding task/retirement, including outstanding bcrypt/native work. Existing non-onboarding pending/read/write/scope/authority results retain their old close handling. Do not globally suppress task rejections or change old Auth/Board/App functions.

Only after physical tasks/reader/ledger/lease settlement attempts finish: delete the prepared operation map entry, clear the private prepared values/lease, detach listeners and remove the record from the enumerable active-request set. Keep the request WeakMap registration for idempotent disposal and exact local outcome retention; retain the weak repeat-capture guard. No owner-strong retired-request/result list is added. Weak maps are not a substitute for draining the currently active set.

Native runtime quarantine remains authoritative. A retained native ambiguous outcome, by itself, is not guessed to be an Auth cleanup failure; it stays ambiguous and nonretryable and never resets runtime state. A genuine cleanup failure alongside it additionally enters owner cleanup handling with its actual cause. No epoch/domain/sequence logic changes.

## P2 — bounded owner cleanup summary, not request history

Remove `OwnedSql.onboardingFailures: unknown[]` and its unconditional append. Replace it with a private onboarding-only bounded summary, initially `none`, or:

- `failed`: the **first genuine cleanup phase/caught cause only**;
- `failedRetirements`: number of distinct requests whose first retirement settlement had one or more genuine cleanup failures;
- `countStatus`: `exact` or `saturated`.

Retain no subsequent complete error graph, request/operation record, promise, task set, body, candidate, profile or result in the owner summary. One first cleanup cause may itself be an error graph, but the owner holds at most **one**, not a list growing with hostile failed requests. All exact per-request primary/native/cleanup outcomes remain private and weakly associated after active retirement.

Update the summary **once inside the producer’s first completed cleanup-failed settlement**, before removing pending accounting, not inside public dispose or its catch. Multiple cleanup errors from one request increment failedRetirements once. Auto retirement, explicit dispose, owner close and repeated calls all reuse the same produced result and cannot increment it again. Ordinary invalid/cancelled request errors never enter this summary.

Use a fixed maximum count **2,147,483,647**:

- none → first genuine failed retirement: count 1, exact, store its first actual cleanup cause;
- exact count below maximum → increment by one;
- increment from maximum-minus-one → maximum, still exact;
- another failed retirement when already at maximum → retain maximum, mark saturated;
- saturated → remain saturated at maximum, never wrap/reset or pretend the displayed count is exact.

Close emits one local cleanup-summary error/aggregate contribution carrying that first genuine cause plus these scalar count/status fields. `saturated` is explicitly an at-least bound, not exact telemetry. Existing non-onboarding close failures are still reported normally. Do not reaggregate every historical request error or attach request identifiers/plaintext/native candidates to the summary; do not log causes or tokens. Genuine owner abort reason comes from this typed cleanup fact, not from public request disposal failure.

## P2 — exact demo mutation predicate

In `OwnedOnboardingRequestState`'s existing constructor condition, change only the policy rejection from readOnly alone to **`configuration.policy.demoEnabled && configuration.policy.readOnly`**. Preserve immutable construction capture, all clock/signal/lifetime/ready-owner checks, original bounds, native writable/resource policies and the same values passed to DB. No writable default or global DB-readonly policy is introduced.

| demoEnabled | readOnly | Demo mutation predicate |
| ----------- | -------- | ----------------------- |
| false       | false    | Does not reject         |
| false       | true     | Does not reject         |
| true        | false    | Does not reject         |
| true        | true     | Rejects                 |

All other security/step/claim/native predicates still apply to the non-rejected branches; this table does not authorize a write by itself.

## Source-review scenarios and exact obligations

These are prospective review criteria, **not executed tests or new acceptance claims**:

| Scenario                                                                                                            | Private/public outcome after real settlement                                                                                                                                                                      | Automatic shared owner action                                                              | Owner cleanup count                                                                              |
| ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Invalid payload or invalid present credential; reader/lease cleanup succeeds                                        | Original prepare failure remains; public dispose rejects that same recorded object. Typed retirement says physically settled, not successful request.                                                             | No abort; existing Auth/Board/App owner stays available subject to its unchanged policies. | +0, no stored owner cause                                                                        |
| Request/body abort or bcrypt interruption; cancellation/release succeeds                                            | Wait actual reader/hash promise and ledger completion. Retain original cancellation/preparation failure; no post-abort native dispatch or refreshed budget.                                                       | No abort for the ordinary primary/cancel fact.                                             | +0, including repeated disposal/close observations                                               |
| Actual reader cancel/release, lease release or retirement-driver cleanup failure, with or without a primary failure | Retain actual cleanup-array facts and primary cause; public error reports both, preserving native ambiguous/confirmed classification where applicable. Attempt and await remaining cleanup before active removal. | Owner fault handling allowed from typed genuine failure; no native reset/retry.            | +1 per first failed request retirement, not per cleanup entry/caller; bounded/saturated as above |

Additional native control: a real COMMIT ambiguity or a confirmed commit followed by output failure **without genuine retirement failure** keeps its exact local native/primary classification and authoritative runtime quarantine as applicable, but adds +0 owner cleanup history and does not manufacture an Auth cleanup abort. With a genuine cleanup failure, the same native outcome is preserved and exactly one failed retirement is counted.

Independent rereview must trace: real cleanup producers → typed cached retirement → auto/public/close consumers; unchanged command failure object/cause identity for cleanup-success paths; private task associations and complete physical drain; one-time counter update; first-cause-only retention; actual prepared-map deletion/active-set removal after settlement; idempotent weak request record; and all four demo predicate cases. Check the old functions are unchanged apart from their already named onboarding close join. No code- or error-name heuristic can substitute for those actual producer facts.

## Release and continuing holds

Only after independent approval may a source author touch the exact two product paths, capture fresh before/after evidence and freeze the repair. Fresh scoped compiler/lint checks belong to the coordinator **after all writers freeze**; old checks are not successor evidence. No repair source, commands, checks, hashes, compiler/evaluation/application import, tests, SQL, Engine/network/private configuration/data or nested agents were run for this report.

Later first-request/Main4 (including assembly forwarding), approved constructor caller, real transport/parent body/final-context/API publication and enrollment remain held. Canonical body/hash, actual origin/CSRF/private Request, decreasing dual budgets, original authority signals and four single-use fixed native calls remain otherwise unchanged. completeSetup stays deferred; no registration/adoption/runtime/wire permission is granted.

Active legacy UI3 repair paths and frozen Media syntax/style evidence are not touched or relabelled accepted. Counters, epoch/domain/sequence controls, nine Auth descriptors, old artifacts, the consumed HELD native attempt, 142 migration assets, data and protected ports remain outside this report. The only write is this NEW repair plan; the frozen Auth4 source report and source pins remain historical and unchanged.

## Controlling amendment — terminal replay and projected-admission lineage

**Ready for rereview by `ses_eca329b4dffeL69a3IM3ekRTrR`, not approved or released.** This append addresses that reviewer's two narrow HOLD findings and controls where it qualifies the original plan. Original lines 1–145 remain unchanged. Prospective product scope is still only `onboarding.ts` and `sql-persistence.ts`; no product source is written by this amendment.

### A. Observe terminal read error before cancellation; exempt only the proven replay

Original item 2 under “Actual cleanup-array producers” is narrowed: a cancellation rejection is genuine cleanup provenance **except** the exact already-observed terminal stream error replay described here. A `reader.read()` terminal rejection can put the stream in its errored state; subsequently `reader.cancel()` returns that same stored error without invoking underlying cancellation. Treating that replay as a failed cleanup operation would recreate the owner-abort defect.

Inside the prospective local onboarding body reader, retain a private discriminated observation for the **one genuine acquired Request reader**: no terminal read error observed, or terminal read error observed with that reader reference and its exact raw rejection cause. Set it in the direct `await currentRead` rejection handler, before wrapping the outward stream error and before entering the cancellation/finally path. Do not derive it from JSON/schema failure, an outer ledger error, a body error code, or `reader.closed` rejection alone.

At the **first cancellation initiation**, synchronously snapshot a separate immutable cancellation-start fact: either no terminal read error had been observed, or the exact reader/terminal cause had already been observed. Capture it before calling `reader.cancel()`, including when cancellation is initiated by the original abort/deadline listener. Never mutate that snapshot when a read error is observed later.

The classification timeline is exact:

1. Own the fixed original Request's reader and its lock; publish/await the actual read promise.
2. If that read rejects terminally while the same lock is retained, record its raw cause immediately in the local terminal observation. No release occurs before this observation/classification.
3. Snapshot the current observation at the first cancellation call; retain that call's actual promise or actual synchronous thrown cause. Cancellation remains single-invocation.
4. Only a **returned cancellation promise rejection** with the same reader and an already-observed terminal error at cancellation start, whose cause is exactly the stored read cause (`Object.is` for the retained unknown value), is the proven no-op replay. Keep it in the primary/terminal channel; do not append a cleanup failure, count an owner failure or abort the shared issuer for it.
5. A cancellation rejection with a different cause, an actual synchronous cancellation throw, or any cancellation initiated before the terminal read error was observed remains actual caught cleanup provenance. A later same-identity read rejection cannot retroactively turn it into a replay exemption.
6. In every branch await the actual pending read, cancellation promise and closed settlement, then attempt release and other retirement steps. Actual release/detach/other cleanup failure remains genuine even when the cancellation was a primary replay.

This uses the fixed reader's real operation ordering and held lock, not an `instanceof`/code heuristic or error identity alone. The genuine reader lock is not released or transferred before classification. Its terminal closed rejection is still observed as terminal state, not an additional cleanup fault. Keep the already-recorded public primary object/wrapping boundary unchanged; clean physical retirement returns the original primary error through the cached public disposal adapter.

| Actual order                                                                                       | Cancellation classification                                                                  | Retirement/owner consequence if remaining cleanup succeeds                   |
| -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Read terminal error E observed → cancel starts with retained E → returned cancel promise rejects E | Proven primary replay; underlying cancellation was not invoked in this errored-stream branch | Physically settled; same public primary; no shared abort; cleanup count +0   |
| Cancel starts with no observed terminal error → read error E observed later → cancel rejects E     | Genuine caught cleanup cause; no retrospective identity exemption                            | Typed cleanup-failed; real cause retained; first failed retirement count +1  |
| Terminal read error E observed → cancel rejects different F, or cancel synchronously throws        | Genuine caught cleanup cause                                                                 | Typed cleanup-failed; retain E as primary and actual cleanup cause; count +1 |

If the proven replay is followed by actual release failure, count that request's genuine failed retirement once, retaining the actual release cause. Do not suppress a failed actual cancellation or invent successful cancellation; the replay branch records that cancellation **rejected as a primary no-op replay**, while physical retirement waits all real work.

### B. Tag projected admission at its own private task producer

Fresh source reads establish the missed task: `admitOwnedOnboardingAsync:1587–1600` calls the existing public SQL request reader inside the ledger; `getProductionSessionSqlRequestReader:1218–1243` validates/wraps tokens and API keys, then calls `admitProjectedRequestAsync:1155–1215`; that private function creates a **separate** `requestReads` promise through `runProjectedRequestRead:1108–1119`. Tagging only the outer preparation/dispatch/retirement promises leaves this independently captured close task unclassified.

Use this smallest private lineage, entirely within sql-persistence.ts:

1. Add a private weak association from the **actual frozen operation object** obtained by this onboarding record's `state.bounds()` to that same `OwnedOnboardingRequest`, solely for projected admission. Register it immediately before entering the existing onboarding ledger call/public reader wrapper. Its key is the real object, not copied signal/deadline fields or a caller DTO.
2. Leave both public reader wrappers and their token/API-key validation/signatures unchanged. They pass this exact operation reference to the existing private admission function. A validation throw before that function creates no independent admission task; it remains an ordinary primary error.
3. In private `admitProjectedRequestAsync`, resolve and consume the weak association **before** copying the operation or creating the read task. Validate the record's actual owner against `value`, its live/preparing registration and original operation signal/decreasing bounds. No public optional cleanup flag, callback or principal is accepted. The onboarding caller also deletes any unconsumed association in its finally path, including wrapper-validation failure.
4. Pass this optional, already-resolved owned record only through the two private functions to the projected-read producer. When absent, keep the existing non-onboarding scheduling, task sets, errors and admission/release behavior unchanged.
5. For the associated onboarding branch, allocate a deferred completion for that actual projected admission read. Install the private weak task metadata identifying `projected-admission` and this genuine record **before** adding it to `value.requestReads`/the record's live tasks and **before scheduling** its deferred read body. Then invoke the same fixed private admission body and settle the completion only after its actual authority/admission/release work finishes. No late consumer-side tagging or tagging after `.then(read)` scheduling is sufficient.
6. Remove that task from live sets only after its body and any admission-catch release settle. Its metadata is weak; do not add an owner-strong admission/request history. Close drains it alongside the outer preparation and private retirement promises, preserving the existing prepublication guarantee.

The private optional record association carries provenance, **not** permission to treat all errors from that task as primary. In `admitProjectedRequestAsync:1207–1213`, the admission catch already awaits a genuine `lease.releaseAsync()` and aggregates its failure. For associated onboarding only, record the actual caught release cause in the request's typed cleanup facts at **that release catch, before throwing the existing aggregate**. Retain the exact existing primary/aggregate object and cause ordering; a successful release contributes no cleanup fault. Non-onboarding catch behavior remains unchanged.

That release failure can occur before `admitOwnedOnboardingAsync` receives a lease or assigns `record.lease`. It must therefore reach retirement through the local admission cleanup facts, not depend on later `record.lease?.releaseAsync()` and not disappear because the read promise is tagged onboarding. Neither aggregate inspection nor a blanket “ignore tagged rejection” policy can supply these facts. The actual task's failure remains recorded locally, while genuine release failure produces typed cleanup-failed and increments the bounded owner counter once at first retirement settlement.

### Combined rereview obligations and unchanged holds

Trace both paths all the way to the original plan's consumers: proven terminal replay/ordinary projected-admission rejection with successful cleanup → identical public primary object, settled physical retirement, no automatic shared abort, count +0; actual early admission-release failure or genuine cancellation/release failure → actual typed cleanup collection, first genuine owner cause, one failed-retirement increment, and no loss of primary/native outcome. Repeated public dispose/automatic retirement/owner close reuses the cached result and cannot increment again.

Retain the private typed retirement split, first-cause-only owner summary/count saturation at 2,147,483,647, exact demo conjunction, enumerable active-task drain and post-settlement prepared-map/active-set removal. Preserve native COMMIT ambiguity/quarantine, confirmed-output failure, original signals/budgets/epoch behavior and existing canonical body/security guards. No service/index/DB4/persistence/shared-body-reader change or additional product file is proposed.

This is a controlling plan amendment only. UI3's active source author is disjoint; first-request/Main4, transport/parent-body/final-context/API publication, enrollment and completeSetup remain held. No commands, checks, hashes, evaluation/import execution, tests, network, SQL, Engine, private configuration/data or nested agents occurred. Only this append was written; it grants no product repair or acceptance authority.
