# Onboarding wire owner/publication repair — review-only plan

## Boundary and evidence

For independent original reviewer `ses_eca329b4dffeL69a3IM3ekRTrR`, before implementation. **Not Auth SOURCE ACCEPT, native acceptance, a runtime grant, or activation.** The prospective product lease is only `packages/auth/nitro/production-sessions/sql-persistence.ts`; this delivery creates only this plan.

References: `convergence-onboarding-wire-auth-implemented-source.md` and immutable `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-onboarding-wire-auth-source-97b1fa1764438be0019afbcd`. All SQL line numbers below refer to `1-after.ts`. Read-only owner/clock/reader declarations were checked in `0-after.ts`, and issuer close/public exports in `2-after.ts`/`3-after.ts`.

The supplied `rwpxj5n9` receipt remains historical: 13 checks, ten zero exits, three one exits, lint 0, format 0; the reported type errors match the misplaced `OwnedScope` field access. This plan supplies no replacement checks. Preserve the old four-file source capture and failed receipt unchanged.

## P1 — relocate unassigned native-slot disposal

**Cut:** SQL 3182–3189, the complete `for (const publication of value.onboardingNativePublications)` disposal/catch block and following `.clear()`, out of `closeIssuerSqlScope`. Here `value` is the actual `OwnedScope` from `scopes.get(scope)` (3159), which has no such collection (158–171).

**Paste:** inside `closeProductionSessionSqlOwner` (4344–4399), immediately after its `await Promise.allSettled(tasks)` and `const failures: unknown[] = []` (4370–4371), before reading `value.onboardingCleanup` and assembling the existing owner failure summary. Here `value = owned(owner)` is the actual `OwnedSql`, with the existing collection (186). Use the exact disposal/catch/clear block and its existing `failures.push(error)`; do not substitute `owned(owner)` inside scope close, add a collection, cast, or widen a type.

Scope close consequently retains its own detach, abort, lease/observation release, awaited reads, failure aggregation and success-only scope deletion (3163–3181, 3190–3195). Closing one scope must never dispose another live request's slot.

### Owner-close settlement timeline

1. Publish `value.closing` once before snapshots (4347–4354); existing admissions/response registration cannot create fresh owned work after close begins.
2. Keep the actual controller abort, `value.authority.closeAsync()`, scope close, request retirement and publication abandonment tasks (4356–4369). Request retirement awaits actual `record.tasks`, ledger drain and lease release (2848–2862). Publication abandonment awaits readiness and real response read/cancellation/closed/release settlement through `record.tasks` before disposing its native slot.
3. Await all these actual tasks, including tracked `packet.completion`/dispatch tasks. A cancellation signal, outward rejection, or snapshot removal is not physical settlement. Already-running preparation/dispatch work remains covered by the corresponding request retirement; already-transferred slots remain covered by publication settlement.
4. Only then iterate the remaining `value.onboardingNativePublications`, invoke actual `publication.dispose()` once per remaining slot, retain each thrown cause in `failures`, and clear the collection after the loop. Successful disposal clears the slot's strong association through the existing reader port; a failed attempt is a cleanup failure, not evidence of successful disposal. Do not clear early, skip later attempts after one failure, or retry an uncertain reader operation.
5. Retain the existing `OnboardingOwnerCleanupError` first-phase/first-cause/distinct-failed-retirement/saturated-count summary and existing non-onboarding rejection aggregation (4372–4395). Direct slot-disposal failures are genuine cleanup causes in the same aggregate; ordinary onboarding/readiness errors remain excluded by their existing task ownership metadata. Return the same close completion on repeats.

There is no Runtime-retirement call in this owner body: `value.authority.closeAsync()` is already a tracked authority teardown, not an invented `runtime.close` port. Unassigned-slot disposal must finish before the owner close settles, so the resource owner cannot advance to underlying Runtime retirement on the strength of this close before disposal has been attempted and failures retained. No caller/helper/native-DB change is proposed.

| Native/publication ownership at close                           | Required handling                                                                                                     |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Not dispatched / GET / pre-native error                         | No native slot to dispose; still drain request/output work.                                                           |
| Pending native dispatch                                         | Wait the exact completion and request retirement before touching the slot.                                            |
| Transferred to `OwnedOnboardingPublication.native`              | Transfer removed it from the unassigned set at 2382; settle the active publication, never dispose through both paths. |
| Unassigned, including a retired wire request with `inputSource` | Remains in the existing owner set; dispose only in the post-drain owner block.                                        |
| Legacy untransferred slot already disposed during retirement    | Existing deletion at 2883 prevents a second owner disposal.                                                           |
| Publication settlement already active                           | Reuse `record.completion`; wait it, never its own owner-close promise.                                                |

## P2 — revalidate at the physical terminal boundary

**Cut positions:** `settleOnboardingPublication` (2463–2525), specifically after the readiness/task awaits at 2476–2477 and immediately before freezing the terminal result at 2510. Preserve the initial published-only `assertOnboardingPublication(record)` (2469) and prepublication of `record.completion`/`value.pending` (2470–2472).

The initial assertion is insufficient: scheduling and both waits can outlive the original external signal or decreasing deadlines. Its `record.completion` guard (2303) also means it cannot simply be called again after this settlement has published its completion promise.

### Publication settlement timeline / concrete SQL-only cut

1. Keep readiness rejection handling and separately scheduled abandonment; retain `await record.ready.catch(() => undefined)` and `await Promise.allSettled([...record.tasks])`. Never await `record.completion` from its own settlement, and do not add that completion to `record.tasks`.
2. After both waits, use a caught, published-only validation block against the actual record: settled output, retained body, original Response status and `publicationHeaders(record.response)` witness, this settlement's `record.completion === completion.promise`, and `record.clock.check()`. Owner close in progress (`value.closing !== undefined`) cannot produce a fresh published terminal. Do not call the pre-settlement assertion's completion guard or authorize using a late context DTO.
3. A validation exception changes `observedTerminal` to `{ kind: "abandoned", cause: error }`; assign `record.primary` only if its kind is `"none"`. **Continue** to the existing native consumption/disposal block (2478–2497), even after invalidation. No early return or escaped validation rejection may strand evidence or the pending completion.
4. Keep one actual `record.native.consume()` and one actual `record.native.dispose()` attempt. Save returned `record.nativeRead` before disposal, preserve acknowledged/dispatched-unconfirmed facts and fresh native timing, and preserve genuine disposal cleanup in `record.cleanupFailures`. Do not resend a mutation or synthesize a native result when consumption fails. Never reinterpret a thrown dispose as successful reader disposal.
5. Keep genuine cleanup aggregation (2498–2509). Immediately before `Object.freeze<ProductionOnboardingPublicationResult>`, if `observedTerminal.kind === "published"`, repeat the caught actual state/Response witness checks and `record.clock.check()` with no intervening await. Validate the retained consumed native read using the existing 2313–2325 rules: settled evidence; original-and-observed temporal bounds when bounds exist; and, only when `primary.kind === "none"`, acknowledged commit/passed final gate/returned unit/complete cleanup/passed runtime guard/valid temporal result. Require no genuine publication cleanup failures. This final check uses `record.nativeRead`, not the now-disposed slot. Failure changes the terminal to abandoned and records a primary only when none exists.
6. Freeze the result retaining `sourceOutcome`, `native`, `primary`, and cleanup status; only afterward retire retained body/cleanup storage and owner-set/pending membership, then resolve, as in 2517–2521. All new throwing checks are caught inside the settlement; retain the existing observed outer rejection handler. Repeated settlement returns the original completion, not a new evidence-consumption attempt.

Reuse only the captured `OwnedOnboardingPublicationClock.check()` (immutable `0-after.ts` 832–860). It checks the original external request/signal/lifetime union, original request witnesses, wall/configured clock skew and monotonic ordering, original budget and captured tightened deadlines. No new publication clock/budget, public expiry setter, original operation rewrite, work-controller-as-external-validity substitution, current DTO authorizer, or claim refetch. The final check is unconditional on native presence: GET and pre-native error publications must not bypass it.

### Failure/outcome table

| Observation after waits / at final boundary                                                                                                | Result and retained accounting                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| External abort, expired original/tightened bounds, clock regression/skew, changed Response witness, invalid output/state, or owner closing | `abandoned`; preserve existing first primary, otherwise retain the actual validation cause. Consume/dispose a present native slot despite invalidation. No invented cleanup fault from expiry/abort alone. |
| Valid GET or pre-native error, no native slot                                                                                              | `published` only after both fresh validity checks; `native: null`. Error response retains `sourceOutcome: "error"` and its actual primary.                                                                 |
| Native consume succeeds, valid state/timing and no genuine cleanup fault                                                                   | Requested physical `published` can remain published; retain the actual consumed evidence, including acknowledgement/ambiguity. An error packet is not source-positive command success.                     |
| Native timing invalid or consume throws                                                                                                    | `abandoned`; retain any actual native read and original primary/acknowledgement/ambiguity, then attempt disposal. Never manufacture no-dispatch evidence or retry permission.                              |
| Native disposal or actual response/retirement cleanup fails                                                                                | `abandoned`, cleanup failed; preserve first genuine cleanup cause and existing owner bounded summary, without replacing original primary or native facts.                                                  |
| Already abandoned or terminal settlement repeated                                                                                          | Drain/consume/dispose through the single existing completion; never upgrade to published or create a second settlement.                                                                                    |

## Independent rereview gate

Confirm both cut positions, actual-task coverage, unassigned/transferred separation, caught post-wait and last-boundary checks on native and non-native paths, and first-primary/native/genuine-cleanup retention before implementation is authorized. No fabricated registry/token names, source-positive publication claim, or accepted DB3 reader/timing/weak-detachment change is permitted.

`onboarding.ts`, `service.ts`, `index.ts`, native DB, `persistence.ts` and `bounded-body.ts` remain unchanged. The STANDARD-server header-hint topic belongs exclusively to report-only planner `ses_eca7697adffeOV3istoJSNccwz`; this plan does not duplicate it. Parent-reviewed associations and legitimate future API/MAIN factory-birth holds remain as supplied.

No product edits, commands, hashes/stat/checks, evaluation/imports/tests, native SQL/Engine, network, private configuration/data, or nested agents were used. No inert C-candidate executor/live scratch outputs were read. This report is a prospective repair plan only.
