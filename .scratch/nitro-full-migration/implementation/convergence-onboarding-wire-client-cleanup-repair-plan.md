# F4 — combined one-file cleanup and type repair plan

## Decision / authority

**Ready for the original lifecycle reviewer's plan approval, not source authoring.** Reviewer `ses_eca329b4dffeL69a3IM3ekRTrR` supplied two P2 findings in frozen `claim.ts:256–267`; SDK/security SOURCE ACCEPT is supplied separately. Original freeze `ab297b68…`, claim generation `5fab4da5…` and historical reports remain unchanged. The separately approved `convergence-onboarding-wire-client-type-repair-plan.md` is included below as two type-only annotations.

The prospective sole product path is **`apps/nitro/src/features/onboarding/claim.ts`**. No client/context/public-port/helper-file, Query, installer, UI, backend/Auth/API/DB or bootstrap amendment edit. Coordinator allocates one combined source writer only after the original reviewer approves this cleanup cut. CORE/bootstrap review and its frozen backend dependencies remain independent.

## Actual defect seams

- `track:185–199` publishes the owned task before its deferred work and retains it through settlement; keep that primitive unchanged.
- `readFiniteBody:228–250` retains closed/cancel tasks, but its outer catch conflates native read rejection with abort/overflow/validation failure. It has no direct read-promise rejection witness.
- `256–261` records the first rejected terminal as primary and unconditionally marks **any** cancel rejection as cleanup failure. A native errored stream can replay its stored read error through both closed and cancel without invoking underlying cancellation. The current boolean incorrectly holds a fully locally settled owner forever.
- `263–268` observes release failure but loses it when a body primary already exists. Closed/cancel distinct errors likewise disappear behind that primary; the owner retains only a boolean.
- `cancelBody:206–214` discards the cleanup cause from its owner record. `finishRetirement:473–475` replaces any real cleanup failure with a fresh generic error.

These are source findings, not executed stream behavior. The stored-terminal-error behavior is the supplied standard ReadableStream review basis; no mocked stream, platform probe or new getter/state test is proposed.

## Minimum proof birth and replay classification

Keep proof in the **individual finite reader's lexical scope**, with discriminated none/failed observations carrying `unknown` direct errors. No truth flag supplied by a caller, propagated-error traversal, exception text/name/code comparison or authority receipt.

1. At the existing `track(() => reader.read(), local)` seam, invoke the actual native read once inside the already-published task. Attach the rejection observation to **that returned read promise**, record its direct rejection before forwarding it to the outer catch, and rethrow the unchanged value. A synchronous invocation throw, overflow, validation throw, signal.throwIfAborted or outer primary does not populate this witness.
2. Observe the actual closed and cancellation promise outcomes directly and retain the actual tasks through settlement. The existing closed accessor is consumed for its real promise, not probed for simulated stream state. A task rejection without an actual corresponding native-promise rejection cannot establish replay.
3. At the actual cancellation invocation inside its already-published task, retain whether the direct read rejection was already observed and its exact value. Do not replace an earlier abort-started cancel task or infer that it was terminal replay. If cancellation actually preceded the read-rejection witness, the exemption is unavailable even when later errors look alike.
4. Exempt a **cancel rejection** only when the retained actual read witness exists at that cancel invocation, actual closed rejects with that same read error, and actual cancel rejects with that same error, all compared using **Object.is**. Missing read/closed/cancel observation, closed fulfillment or any distinct cause means genuine cancel cleanup failure. No equality against merely the outer primary establishes this triad.
5. A closed rejection equal to the directly observed native read rejection is the same body-terminal observation, not a second distinct cleanup cause. A distinct closed rejection, or a closed rejection without that direct read witness, is genuine cleanup failure. This does not weaken the stricter full-triad requirement for exempting cancellation.
6. Release always runs after actual terminal tasks settle. **Every release failure is genuine cleanup**, even if Object.is equates it to the read/primary error; no stored-terminal replay rule applies to release.

Continue attempting cancellation on the existing failure/abort paths, await the actual pending read/closed/cancel tasks, remove the abort hook at its existing point, and attempt tracked release regardless of terminal rejection. Never skip cancellation, release or drain to make reset available. An unresolved local task still holds replacement.

## Bounded causes and primary-first outcome

Replace the owner boolean at `156` with one private **first recorded genuine cleanup** latch: discriminated none/failed with the direct `unknown` cause. Record once and never overwrite on later failures. It is owner-local, bounded to one cause, retained through retirement/disposal completion, not reset into success or logged/serialized. No global array, public facts port, Query cache or error-graph/history framework.

Within `readFiniteBody`, retain the existing body-first primary separately from a bounded local collection of direct closed/cancel/release cleanup causes: at most one observation from each of those three ports, identity-deduplicated with Object.is. Classification is independent of deduplication: a genuine release/cancel failure equal to the primary still records the owner cleanup latch. Two protocol ports repeating one genuine cleanup cause contribute it once to the outward outcome, without inspecting AggregateError.errors/cause graphs.

- Record genuine cleanup causes from actual terminal outcomes, then attempt/record release. Do not let one rejected cleanup task prevent the other tasks or release from being observed.
- Perform the existing fresh signal check after settlement/release and before successful byte delivery. Capture a resulting abort as primary only if no earlier body primary exists; it is not a native read witness and cannot replace the original body error.
- Build the outward outcome **after all these observations**. Start with the unchanged body primary when present, then append distinct direct cleanup causes in closed/cancel/release observation order, deduplicating against that primary by Object.is. With one resulting value, throw that exact value. With multiple values, throw AggregateError with primary first and its exact original value retained as cause; without a body primary, use the first genuine cleanup as the first/cause value. No generic replacement or aggregate traversal.
- A read E / closed E / cancel E proven replay with successful release throws **the original E**, records no cleanup failure and permits a later explicit reset after the actual local drain. A distinct cleanup cause remains held and visible alongside E.
- `cancelBody`'s existing catch records its actual direct cause into the same bounded owner latch before rethrowing; it does not gain a replay exemption without finite-reader proof.
- `finishRetirement` still first drains actual owned work, then throws the retained first cleanup cause directly instead of manufacturing `Onboarding transport cleanup failed`. Update the existing assertCurrent cleanup gate to consult the latch; origin/state/currentness policies are unchanged.

No general rewrite of all call finalizers is proposed. For the described acquired-reader read/overflow/abort paths, cancellation/read has disturbed the response before the enclosing GET/POST `finally cancelBody`, so that existing helper skips a second cancellation. The concrete primary-loss cut being repaired is **inside readFiniteBody's terminal/release outcome assembly**. SDK continuation/context and parent-call ownership stay unchanged; a separately identified primary-loss seam outside this cut requires an exact additional review, not an opportunistic refactor.

## Required source traces, not runtime claims

| Actual observations                                                                                                  | Classification / outward outcome / barrier                                                                                                     |
| -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Native read rejects E; cancellation invoked after that witness; closed rejects E; cancel rejects E; release succeeds | Full stored-terminal replay: original E, no owner cleanup latch; actual task drain still required.                                             |
| Read rejects E; closed fulfills; cancel rejects E                                                                    | Triad fails: genuine cancel cleanup, owner latch E; outward E identity once, held cleanup despite deduplication.                               |
| Overflow or abort primary P without actual native read rejection; closed/cancel reject P                             | No read witness: genuine rejected cleanup, primary-first P once if identical; held owner.                                                      |
| Native read rejects E; closed rejects E; cancel rejects distinct C                                                   | Closed body replay only; cancel C genuine; AggregateError ordered E then C, original E cause; held owner.                                      |
| Native read rejects E; closed rejects distinct C; cancel rejects C                                                   | Genuine terminal cleanup C counted once; E then C, original E cause; held owner.                                                               |
| Abort starts cancellation before native read-rejection observation; eventual read/closed/cancel all reject E         | No cancellation-birth proof: cannot assume replay; actual cancellation rejection remains genuine cleanup.                                      |
| Any primary P and release rejects R                                                                                  | Release always genuine; P then distinct R, or P once if identical, but owner latch still failed. Other cleanup observations are retained too.  |
| No body primary, distinct closed/cancel/release failures                                                             | First genuine cause recorded; all attempted/settled; direct single cause or ordered deduplicated aggregate, no successful byte result.         |
| Read/closed/cancel/release succeed and fresh signal remains live                                                     | Existing bounded byte copy/output behavior; no new cleanup latch. Fresh abort instead prevents delivery without minting a read-replay witness. |
| Any pending read/closed/cancel/release task remains unresolved                                                       | No timeout/finally/waiter-abort settlement assertion; local drain/replacement remains pending.                                                 |

POST server/socket/native UNKNOWN evidence never changes under any row. Locally settled replay is not native rollback, COMMIT, physical server ACK, automatic mutation retry/resend or implicit claim reacquisition. Later new explicit non-mutating CSRF refresh follows the already-approved local-settlement amendment only.

## Included approved type-only cut / retained boundaries

At current `478`, annotate `const owner` with its existing **OnboardingCsrfOwner** type while retaining Object.freeze's existing generic. At `488`, annotate the existing object's **resetAsync(): Promise<void>** return. These address supplied recursive TS7022/TS7023 only; no runtime expression/signature change, cast, suppression or new exported type.

The three generated leaves, SDK/private context association, actual claim mapping, old claim callable/body, bounded response copies, GET cache/generation/reservations, raw source/schema/email/provider/account/group intents, stable mutation keys and no-retry policy remain frozen outside this narrow correction. No comments, tests, any/casts/non-null assertions, dependencies, helper files, installation, UI or runtime action.

After future combined author freeze, coordinator owns fresh focused Nitro type/lint/format checks; the original SDK/security and lifecycle reviewers rereview the exact repaired generation. Prior SDK SOURCE ACCEPT and old diagnostics are not relabelled acceptance/checks of future bytes. Only this NEW plan was patched; dedicated frozen claim/client/interface and approved type-plan reads only, no product edits, commands/hash/stat/checks, evaluation/imports/tests, native SQL/Engine, network/Context7, private configuration/data or nested agents.
