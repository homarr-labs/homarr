# Onboarding native publication evidence — prospective three-file producer plan

## Decision and boundary

Add an **onboarding-only observed dispatch plus registered read/consume handle**. Preserve the existing `onboardingMutationAsync` four overloads and source outputs: claim returns its canonical result; nextStep/initUser/initialExternalGroup return void. The new wrapper invokes the same native unit **once**, captures the actual gate's evidence and native COMMIT acknowledgement before later guards can throw, and retains a small observation independently of promise fulfillment. A fulfilled promise, copied DTO, brand, token, or guessed four-hour window is not the producer.

The prospective source lease is **exactly**:

1. `packages/db/runtime-onboarding/contracts.ts` — narrow public observed-dispatch/read types.
2. `packages/db/transaction-gate.ts` — actual gate/COMMIT/settlement evidence producer and DB-private observation read port.
3. `packages/db/runtime.ts` — same-runtime registration, fixed once-only dispatch, identity-checked read/consume/dispose and existing-runtime type reexports.

`runtime-onboarding/statements.ts` remains unchanged: its existing validated-expiry events suffice. No SQL, lock, provider/account construction, claim TTL, signed64 INTEGER/BIGINT, schema, migration asset, K/D, adoption, epoch, snapshot, configuration or root-table changes are proposed. `completeSetup` stays absent. Existing App/Board/Auth behavior and the repaired locked-expiry/K-reader-finally behavior remain protected.

Auth wire A remains **stopped/held**, with all four Auth files unchanged as recorded in `convergence-onboarding-wire-auth-source.md`. This report approves no producer source, wire port, handler, transport or enrollment. Old Bun/metadata/native attempts remain historical; they are neither rerun nor relabeled.

## Actual source establishing the gap and available seams

| Source                                                                  | Consequence                                                                                                                                                                                                                                                                                                                            |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `runtime-onboarding/contracts.ts:16–29,32–42,83–93,214–276`             | Original operation mapping/configuration are captured; claim-only authority is token-only; three native outputs are void. No publication evidence currently escapes that capture.                                                                                                                                                      |
| `transaction-gate.ts:523–588,691–757`                                   | `createOnboardingGate` owns actual validated events, effective wall/monotonic deadlines, last observed monotonic time and arming. Both fixed wrappers drive the owned generator and discard this state when returning the source result.                                                                                               |
| `transaction-gate.ts:232–267,413–473`                                   | Scope/tail settlement precedes final gate and COMMIT. Native COMMIT acknowledgement occurs before the post-COMMIT guard/cleanup. `finishTransaction` can throw `TransactionCommitAmbiguousError` for later failures even when the raw COMMIT call already returned successfully. Exception class alone cannot distinguish these facts. |
| `runtime.ts:510–583`                                                    | Runtime capture, active accounting and driver dispatch are real. Its post-unit owner/result guard may throw after a known successful native unit. Evidence must be retained before that guard and survive the rejection, without bypassing quarantine or `leave()`.                                                                    |
| `runtime-onboarding/statements.ts:194–198,218–228,320–333`              | Issued/matching-active/claim-authorized mutation expiry is an authority event. Another party's locked claim is only an observation: final row/hash/expiry/current-SQL-time comparison remains, but it does not emit an authority-expiry event. Retention must preserve that repaired distinction.                                      |
| `auth/nitro/production-sessions/sql-persistence.ts:1715–1747,1944–2055` | Actual request/lease authority, task ledger and fixed dispatch exist. Lines 1975–2009 create the native operation and inline invocation, receive void; lines 2014–2016 set `record.confirmed` only after fulfillment. That flag cannot recover a known native acknowledgement followed by rejection.                                   |
| `auth/nitro/production-sessions/onboarding.ts:238–246,295–298,310–322`  | `bounds()` creates a new object; retirement deliberately aborts the work controller incorporated into operation signal/lifetime. The future adapter must retain the exact dispatched operation object, and post-retirement evidence reads must not invoke the retired work guard or demand a fresh bounds object.                      |

## Proposed public signatures — concrete fixed call, not a new source output

All names below are **proposed**, not currently callable exports. Existing invocation/result types keep their meanings. Public handles carry no expiry, credentials, token, password, user/group rows, SQL, owner/runtime or callable body. Their shape is not authorization: the actual retained runtime's private lookup must recognize their object identity.

```ts
interface OnboardingNativePublicationHandle {
  readonly kind: "onboarding-native-publication";
}

interface OnboardingObservedDispatch<T> {
  readonly publication: OnboardingNativePublicationHandle;
  readonly completion: Promise<T>;
}

interface OnboardingNativePublicationBounds {
  readonly originalWallStartedAt: number;
  readonly originalMonotonicStartedAt: number;
  readonly originalBudgetMs: number;
  readonly originalMonotonicExpiresAt: number;
  readonly originalDeadlineAt: number;
  readonly effectiveWallDeadlineAt: number;
  readonly effectiveMonotonicExpiresAt: number;
  readonly maximumAbsoluteClockSkewMs: number;
  readonly lastNativeMonotonicAt: number;
  readonly claimExpiresAt: number | null;
  readonly session: {
    readonly expiresAt: number;
    readonly hostDeadlineAt: number;
  } | null;
}

interface OnboardingNativePublicationFacts {
  readonly command: OnboardingInvocation["kind"];
  readonly commit: "not-dispatched" | "dispatched-unconfirmed" | "acknowledged";
  readonly finalGate: "not-passed" | "passed";
  readonly bounds: OnboardingNativePublicationBounds | null;
  readonly unit: "pending" | "returned" | "rejected";
  readonly cleanup: "pending" | "complete" | "failed";
  readonly runtimeGuard: "pending" | "passed" | "failed";
  readonly failureStage:
    | "none" | "admission" | "body" | "commit"
    | "post-commit-guard" | "cleanup" | "runtime-guard";
  readonly cleanupFailureCount: number;
}

type OnboardingNativePublicationRead =
  | { readonly kind: "pending"; readonly facts: OnboardingNativePublicationFacts }
  | {
      readonly kind: "settled";
      readonly facts: OnboardingNativePublicationFacts;
      readonly temporal:
        | "within-original-and-observed-bounds"
        | "expired" | "clock-invalid" | "clock-unavailable";
    };

onboardingObservedMutation(
  operation: OnboardingOperation,
  invocation: OnboardingClaimInvocation,
  configuration: OnboardingSqlConfiguration,
): OnboardingObservedDispatch<OnboardingClaimResult>
onboardingObservedMutation(
  operation: OnboardingOperation,
  invocation: OnboardingNextStepInvocation,
  configuration: OnboardingSqlConfiguration,
): OnboardingObservedDispatch<void>
onboardingObservedMutation(
  operation: OnboardingOperation,
  invocation: OnboardingInitUserInvocation,
  configuration: OnboardingSqlConfiguration,
): OnboardingObservedDispatch<void>
onboardingObservedMutation(
  operation: OnboardingOperation,
  invocation: OnboardingInitialExternalGroupInvocation,
  configuration: OnboardingSqlConfiguration,
): OnboardingObservedDispatch<void>

readOnboardingNativePublication(
  handle: OnboardingNativePublicationHandle,
  operation: OnboardingOperation,
  invocation: OnboardingInvocation,
): OnboardingNativePublicationRead

consumeOnboardingNativePublication(
  handle: OnboardingNativePublicationHandle,
  operation: OnboardingOperation,
  invocation: OnboardingInvocation,
): Extract<OnboardingNativePublicationRead, { readonly kind: "settled" }>

disposeOnboardingNativePublication(
  handle: OnboardingNativePublicationHandle,
  operation: OnboardingOperation,
  invocation: OnboardingInvocation,
): void
```

These are methods of the actual retained `PersistenceRuntime`; overload implementations may use the existing discriminated invocation without casts. The packet is returned synchronously after capture/registration and task creation; `completion` preserves the native source promise result/error. **Preparing the packet starts the one fixed dispatch.** There is no second public start/replay method and no need to turn void into a receipt. Admission errors before packet creation may still throw; after a registered attempt starts, its completion and observation record the actual failure.

`read` is an identity-checked read-only getter/evaluator, not an authority setter. `consume` does the same fresh evaluation and marks one settled publication attempt consumed, including a blocked/expired/failure result; pending consumption rejects without consuming. Repeated consume rejects. Dispose permanently revokes the handle. Copies of the packet's handle, a foreign runtime, a structurally equal operation or an inline rebuilt invocation fail lookup/identity checks before any evidence can be used. No read API accepts a snapshot, new deadline, expiry, clock, token, SQL, predicate or callback as input.

## Body flow and exact bookkeeping

### 1. Runtime preparation and one dispatch

In `runtime.ts`, keep an **onboarding-only** private `WeakMap<OnboardingNativePublicationHandle, PublicationRecord>` per runtime. Do not add a global mutation owner/epoch service. `onboardingObservedMutation` performs the same own-data capture/ready-owner checks as the existing method, creates the genuine frozen handle, and records strict weak identity references to the **actual input** operation and invocation. Preserve the captured immutable business invocation/configuration for the active unit, not remote hash/provenance assertions. Store the retained owner's actual lifetime signal for native execution and create the internal observation before any native body can run.

Refactor only the onboarding method's private execution join so old `onboardingMutationAsync` and the new observed wrapper use one body: existing callers return its original promise; observed callers additionally obtain their registered handle. The observed wrapper must not call an old method and also invoke a second wrapper, reacquire another owner, or create another clock budget. Register completion/active native work before forwarding. Increment active exactly once and keep the actual underlying unit physically tracked through existing scope/tail/cleanup and `leave()`; preparing/reading/disposing the handle is not another SQL unit.

The original operation and invocation identities are retained by the future Auth-owned publication state until disposal. Native registration can validate only those identities **after this call**, not prove that an arbitrary first DTO came from an HTTP request. Genuine Request/leaf/origin/hash lineage still belongs to the existing Auth-private producer. This limitation is explicit: native output is not independently trusted request authorization.

### 2. Gate-owned observed producer

In `transaction-gate.ts`, add a small DB-private `NativeOnboardingAttemptHandle`/WeakMap, scoped to onboarding. Concrete internal functions may be `prepareNativeOnboardingObservation(prepared, resourceLifetime)`, `readNativeOnboardingObservation(handle)` and `disposeNativeOnboardingObservation(handle)`. They are not package-public exports/reexports and accept **no expiry or writer callback**. The factory registers an empty attempt identity, not a checked authority witness. Fixed onboarding wrappers accept that internally minted attempt handle, verify its exact prepared-object/resource-lifetime association and single entry, and still construct/drive their own existing generator. Copied internal handles cannot join a unit.

`createOnboardingGate.observe` remains the sole authority-expiry producer: when it has processed the real validated event and completed its existing checks, retain the actual claim/session values and effective decreasing deadlines in that attempt. At the successful **actual final `commitCheck`**, snapshot the gate's original mapping, effective wall/monotonic deadlines, allowed skew, last native monotonic observation, actual expiry fields and final-gate-passed fact. Earlier validated events may be retained for diagnostics, but cannot be labeled final-COMMIT authorization if arming/final checking failed. Incomplete captures remain explicitly incomplete; never fill absent facts with invented zero/expiry/success.

No statement change is necessary. Native session expiry is retained only after the current native policy's exact stored-expiry/credential match; claim expiry only from the already-yielded validated event. Claim issued/active evidence is the operation's own actual event, not a TTL inferred from output/token. The repaired unrelated locked claim stays a row/hash/expiry/time observation only and contributes **no claim authority expiry** to this port. A valid API-key admin has no invented session expiry; an actual authority-free terminal claim response has no minted grant.

### 3. Capture native outcome before errors obscure it

Instrument only the private onboarding attempt in the existing transaction-control points; existing callers with no attempt retain their exact behavior:

- After final gate, immediately before native COMMIT invocation, record `commit = dispatched-unconfirmed` and its actual passed-gate snapshot.
- Immediately after SQLite `client.run("COMMIT")` returns, or PostgreSQL `await client.query("COMMIT")` fulfills, record `commit = acknowledged` **before** post-COMMIT `gate.check`, cleanup or publication/result guards. This is source-observed native acknowledgement, not an fsync guarantee or proof about an unrelated unit.
- Preserve rejection of COMMIT as dispatched-unconfirmed unless acknowledgement was genuinely observed. Record body/admission/commit/post-commit/cleanup stages at their actual branches and retain cleanup failure counts in physical order. No exception-name inference and no catching an ambiguous outcome to pretend success.
- Preserve `TransactionCommitAmbiguousError`, `retryable:false`, quarantine, rollback-before-dispatch and existing scope/tail/native cleanup. The side record may truthfully say acknowledged even when the unchanged outward exception conservatively says ambiguous. Never erase acknowledgement because a later guard rejects, or promote a dispatched-unconfirmed attempt because a promise eventually settles.
- Complete the attempt's unit/cleanup observation from the actual `finishTransaction` path, including failure. Runtime then adds its actual owner/result guard outcome and final `leave()` settlement in its own `finally`. A completion promise rejection must not delete the attempt. A cleanup attempt returning with an error is **cleanup-failed**, not successful physical resource retirement; callers keep the existing quarantine/cleanup hold.

The private generic transaction helpers may carry an **internally constructed observation slot**, not an `onCommit`/`assertAuthorized`/body callback or public receipt registrar. Mutation of that slot is performed at these owned statement/COMMIT/control-flow sites. No default slot fabricates an observation for legacy commands. Do not change `finishTransaction`'s error identity/cause/order or the repaired K iterator's `finally` aggregator.

### 4. Strip retained native/business graphs, preserve a bounded witness

During the active unit the real closure necessarily owns prepared rows, connection and work. After actual settlement, replace the publication record's active payload with only fixed-size scalar outcome/bounds facts, opaque attempt identity and weak references to original operation, invocation and original configured clock. Clear prepared rows, credential/claim tokens, password hash, SQL connection/pool, configuration object, promise/result and raw error/cause graphs from the retained record. Error facts are finite stage/count classifications; callers already receive the original rejection and retain it in their existing task ledger, not this new graph.

Use the **original configured clock function** weakly, not the fresh wrapper closure created by `captureNativeCredentialPolicyConfiguration` (which would become collectible when active capture is stripped). The future Auth-private publication state must pin that exact original function, operation/invocation objects and narrow reader association for its bounded publication lifetime. It must not keep the SQL owner/resource alive merely to read evidence. If a weak referent is unavailable, fail provenance/clock evaluation closed; never substitute Date.now-only authority, a copied operation or a new claim read.

No strong Set/Map of retired tickets, original invocations, Requests, runtimes or promises is added. Existing active/drain accounting tracks real physical work only. A weak disposed-handle tombstone can make repeat disposal idempotent for the same runtime while foreign handles still reject. Disposal while pending marks the handle unreadable/consumed but does not cancel, detach or decrement physical work; the already-owned execution closure finishes tracking/cleanup and clears its attempt. After settlement, disposal deletes evidence/reader registration. Auth must dispose in its publication-finally; abandoned unreachable handles are weakly collectible without relying on finalizers for physical cleanup.

## Publication read and original-clock evaluation

Identity/outcome reads must work after normal resource retirement, after quarantine, and after known-commit guard/cleanup failures. They must **not call `requireReady`, run SQL, reopen persistence, repeat a native mutation or call the retired work gate**. This port reports the actual settled native unit; it does not reauthorize new writes against a closed runtime.

The read-only evaluator retrieves the real registration/attempt, returns pending while the unit/runtime finalization is still pending, and otherwise evaluates retained limits with the original configured clock plus current wall/performance clocks. Validate finite/safe checked clocks and the same allowed skew; require monotonic time not before the original start/last native observation. Compute:

```text
remaining = min(
  originalWallStartedAt + originalBudgetMs - checkedNow,
  originalMonotonicExpiresAt - monotonicNow,
  effectiveWallDeadlineAt - checkedNow,
  effectiveMonotonicExpiresAt - monotonicNow
)
```

For actual authority expiry E, the gate already applied H = E − allowedSkew, also min with validated session hostDeadlineAt, and mapped H through `originalMonotonicStartedAt + (H − originalWallStartedAt)`. Preserve that exact effective pair; never compute `performance.now() + remaining`, rebase after retirement or expand bounds. Require checked time still before the recorded actual expiry/host deadline. Missing/invalid/expired clocks produce a blocked temporal result **alongside the retained native facts**, not an exception which hides acknowledgement/ambiguity. The getter neither installs a new expiry nor changes native facts; consume alone changes the once-publication bookkeeping.

This temporal result is **not** permission to publish. Successful source publication requires acknowledged COMMIT, actual passed final gate, returned unit, complete native cleanup, passed runtime guard and within-bounds evaluation, **plus** the future Auth-private publisher's genuine request/leaf/final-context association, current external request abort/lifetime checks, validated CSRF/origin conditions, mode and completed physical retirement checks. A copied read DTO or its temporal enum cannot satisfy that Auth lookup. Auth must call the actual registered read/consume port at final publication, not accept a caller snapshot in an expiry setter or produce authorization from a brand.

Retirement deliberately aborts the work controller in `onboarding.ts:310–322`; thus DB evidence evaluation must not reject simply because the **normally retired work** signal is aborted, nor clear that signal and keep doing writes. The future Auth publication-owned state separately retains the genuine external Request signal/lifetime and validated publication conditions before work retirement. Failure/cancellation/quarantine stays blocked by its actual outcome/retirement facts. The native port supplies source facts and temporal limits only; it cannot distinguish intentional Auth work retirement from a real client cancellation without that separate existing-owner lineage.

## Failure/publication matrix

| Actual native path                                                                        | Read/consume result and allowed interpretation                                                                                                                                                                       |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Capture/admission fails before COMMIT                                                     | Not-dispatched, final gate not passed/incomplete; no native success or retry authority. Registered attempts keep available diagnostic facts.                                                                         |
| Body/final gate fails, rollback/cleanup succeeds                                          | Not-dispatched/rejected; any observed expiry remains diagnostic. No success publication or manufactured void completion.                                                                                             |
| COMMIT dispatched; no successful native acknowledgement observed                          | Dispatched-unconfirmed, rejected/quarantined, retained passed-gate limits if they existed. Truthfully ambiguous; no success/retry/replay.                                                                            |
| COMMIT acknowledged; post-COMMIT gate rejects                                             | Acknowledged plus post-commit-guard failure and retained expiry/original mapping, even though completion rejects with the existing conservative error. Known effect, failed publication; not rollback or safe retry. |
| COMMIT acknowledged; cleanup or runtime guard fails                                       | Acknowledged plus actual failure stage/cleanup status. Evidence remains readable after quarantine/close. Do not publish ordinary success or call cleanup complete.                                                   |
| Unit returns canonical void; all native/runtime settlement succeeds                       | Acknowledged/complete/passed plus actual stored-claim/session limits. Final consume still evaluates elapsed original budgets/expiry and Auth's own publication conditions. Void does not mean unbounded validity.    |
| Claim issued/active succeeds                                                              | Own actual validated claim expiry retained; canonical source result remains unchanged. No new TTL or output reconstruction after a rejected promise.                                                                 |
| Claim locked/finished/forbidden returns canonically                                       | Preserve actual response classification/source result; unrelated locked-claim expiry never becomes publication authority. No claim/admin grant is minted by a denial observation.                                    |
| Successful unit, but publication later expired/clock invalid or external request canceled | Keep acknowledgement truth; block publication. Dispose after recorded failure/retirement. Never repeat the mutation to obtain another witness.                                                                       |

## Exact future consumer gap — identify before source authoring

The three DB files can implement this producer/read boundary without an additional DB file or statement change. **Consuming it is a separate Auth release**, not hidden work inside this lease:

- Actual fixed callsite: `packages/auth/nitro/production-sessions/sql-persistence.ts`, `dispatchOwnedOnboardingAsync` around 1962–2017. Store each actual invocation in a local/owned record instead of rebuilding the current inline object; retain the exact `operation = record.state.bounds()` object once. Call `value.runtime.onboardingObservedMutation(operation, invocation, configuration)` once, register/store its publication handle before awaiting `.completion`, and continue tracking that exact completion in the existing underlying-task ledger. In both fulfillment and rejection paths, use the retained actual read port to classify native acknowledgement independently of `record.confirmed`. Do not obtain a new `bounds()` after retirement.
- Actual Auth lifecycle seam: `retireOwnedOnboardingRequest` at `sql-persistence.ts:2145–2169` and `ProductionOnboardingRequestState.retire` at `onboarding.ts:310–322`. Before retirement, its future publication-owned association must retain the exact objects/original clock and external signal lineage, not the retired work state as a runnable authorization method. Existing retirement still drains actual tasks and records failures.
- Any new Auth publication owner/cache/receipt getter/export needed to join those facts to the final response belongs to the already held Auth wire A lease (`onboarding.ts`, `sql-persistence.ts`, `service.ts`, `index.ts`). Its exact ports require separate source acceptance; this report does not invent them as existing, allocate a fifth DB file, or solve MAIN transport/API mounting again.

Independent rereview must confirm the exact runtime registration, private gate COMMIT/acknowledgement producer, rejection-safe observation, weak retirement retention, identity rejection, once/dispose semantics and future Auth ownership join before release. If that actual consumer cannot pin the original identities/clock without retaining the retired SQL graph, stop and name that Auth-side gap; do not substitute a plain-data registrar, new timestamp reader, generic mutation framework or partial stub.

## Report-only record

Only this new report was patched. Public source and the stopped Auth wire report were read; live C/H/P staticcopy outputs were not read. No product source, old report/control, metadata/artifact, counters, native attempts, assets or configuration was changed. No commands, hashes/stat captures, checks, compiler, evaluation/import execution, tests, native SQL, Engine, network, private configuration/data or nested agents were used. All proposed methods and body changes remain future work pending the exact three-file source release and acceptance; Auth wire A remains held until that producer is accepted.

## Controlling amendment — sole P2 cleanup observation and reader ownership

**Ready for the original independent reviewer.** The original 213 lines above remain preserved. This append controls cleanup observation and narrow reader construction where it makes the original plan more precise; the otherwise approved three-file producer plan, observed dispatch once, void source results, real COMMIT acknowledgement, original clocks and weak post-retirement retention remain unchanged. This is a plan amendment, not source implementation or acceptance.

### P2: observe cleanup at its actual owned failure site

The transaction helper's `cleanupErrors` array is **not a complete cleanup producer**. In the current `assertOnboardingSqliteTarget` reader, `iterator.return()` and `statement.finalize()` failures enter the reader's own `cleanupErrors`, then `finishTransaction` propagates them as a body error. The enclosing helper's cleanup array can consequently remain empty. Observing only that outer array would falsely label native cleanup complete.

Use the already proposed onboarding-only private observation slot in `transaction-gate.ts`. Extend the owned `assertOnboardingSqliteTarget` join to associate that same internally created slot with its reader; no caller callback, public registrar, expiry setter or additional cleanup helper is added. At each **actual caught cleanup failure**, the observation-only update is: increment `cleanupFailureCount` once, make `cleanup` monotonically `failed`, and record `failureStage = cleanup` only if no earlier actual failure stage was recorded. These slot writes must not throw, inspect/unwrap errors, replace a primary error, alter native control flow or invoke caller code.

| Actual existing producer site                                                                                            | Exact observation-only addition; existing error handling remains                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `assertOnboardingSqliteTarget`, `reader.iterate`, catch after `iterator?.return?.()` (`transaction-gate.ts:660–664`)     | Record that owned iterator-return cleanup failure once at this catch, alongside its existing `cleanupErrors.push(error)`, before the existing quarantine call. Keep `nativeFailed = true`, quarantine, caught error identity and append order unchanged.                                                                          |
| Same iterator, catch after `statement.finalize()` (`:667–671`)                                                           | Record that owned statement-finalization cleanup failure once at this catch; retain the existing push/nativeFailed/quarantine sequence. Do not rely on the propagated aggregate reaching the enclosing helper.                                                                                                                    |
| Same iterator, final cleanup `check()` catch (`:674–675`)                                                                | Record the failure of this actual final cleanup check at its owned catch. Preserve the existing push and absence of an additional nativeFailed/quarantine action here. A gate failure in ordinary iteration is not this cleanup site.                                                                                             |
| `reader.all`, finalization and final cleanup-check catches (`:625–633`)                                                  | Apply the same observation-only association at these existing sibling cleanup sites. Preserve their current push/nativeFailed/quarantine distinctions; do not introduce another producer function.                                                                                                                                |
| Existing transaction helper `cleanupFailed` calls for rollback, timeout restoration, native close/end or listener detach | Record each actual owned cleanup failure at its existing catch/cleanupFailed path once. In particular the PostgreSQL `client.removeListener("error", onError)` catch is an actual detach-cleanup producer. Preserve the existing error array, quarantine and native eviction/close behavior. No new detach mechanism is proposed. |

The reader's `finishTransaction(outcome, cleanupErrors, false)` in its `finally` (`:677`) stays **untouched**. Keep its early-generator-return behavior, primary error/cause, single-error identity and cleanup ordering exactly as repaired. The observation slot is independent of that exception aggregation: one owned caught cleanup cause contributes once at its originating site. Its escape through `finishTransaction`, `assertSqliteMainTarget`, the outer target assertion catch, the transaction body catch, `includeFailure` or runtime rejection is propagation, **not another cleanup cause to count**. Do not traverse/recount aggregate contents or infer cleanup from an exception class. Observing a later independently failed cleanup call is distinct from recounting the earlier propagated aggregate.

Ordinary K preparation/read/iteration failure (`reader.iterate :654–656` and `reader.all :619–621`) remains an actual body/target failure, even when it sets nativeFailed/quarantine. It contributes **no cleanup count** by itself. Likewise a pre-COMMIT final gate failure remains a gate/body failure, and a post-COMMIT `gate.check()` failure remains the actual post-commit guard failure; neither is reclassified as physical cleanup merely because it occurs late. The final `check()` performed _inside the reader cleanup finally_ is the separately named cleanup producer above. Record each in its real control-flow context.

At unit finalization, combine the helper's actual successful/failed cleanup completion with the slot's already observed state: `cleanup = failed` cannot become complete because the helper's own cleanup array is empty. Only actual completion of all owned reader/native cleanup paths with no observed cleanup failure permits complete. The cleanup failure count is the accumulated originating-site observations, not that count plus a later array length. Existing nativeFailed/quarantine and outward errors continue to provide their existing failure behavior; this additional record only makes the read port truthful when a reader cleanup failure traveled as a body error.

### Narrow publication reader must not retain the runtime closure

Construct the proposed narrow read/consume/dispose reader **outside** the resource-bearing `createPersistenceRuntime` closure. Its construction may close over **only** the onboarding publication store and a frozen opaque owner identity with no runtime/resource fields. Neither reader methods nor their stored terminal records may capture the `PersistenceRuntime` object, connection/pool, resource factory closure, `requireReady`, issuer/OwnedSql, native body, quarantine closure or a bound runtime method. Do not rely on engine closure optimization to release them.

The proposed observed-dispatch packet must additionally carry this narrow `reader` object, with the already proposed `readOnboardingNativePublication`, `consumeOnboardingNativePublication` and `disposeOnboardingNativePublication` signatures. These methods still perform the same publication-store lookup, exact handle/operation/invocation identity checks, temporal evaluation and once/dispose bookkeeping. Runtime-facing methods, if retained, merely forward to that same reader; future Auth pins the packet's reader **rather than** `value.runtime` or `.bind(value.runtime)`. This addition is confined to the same prospective contracts/runtime files; it introduces no extra exported constructor, public callback or new owner framework.

After real native/runtime settlement, the publication store holds only the existing plan's small scalar native facts and weak original associations. It does not retain a reader callback which closes over the active native record, raw errors, business rows or a retired SQL owner. Pending physical work continues to own what it actually needs until cleanup/active leave; narrowing the terminal reader must never sever that accounting early.

The future Auth-private publication association pins the **actual original dispatched operation object, actual invocation object and original configured clock function**, plus the narrow reader/handle, for its bounded publication lifetime. It must not substitute a fresh `bounds()` result, copied DTO or bound Runtime. Identity/clock disappearance fails the existing proposed read evaluation closed; no new timestamps, claim reread, generic expiry registrar or revived work guard is permitted. Known native acknowledgement and cleanup-failed facts stay readable after normal retirement/quarantine without treating the aborted work lifetime as new write authorization.

### Scope and readiness

Prospective scope remains exactly `runtime-onboarding/contracts.ts`, `transaction-gate.ts`, and `runtime.ts`; `statements.ts`/SQL, original locked-claim distinction, native once/void flow, COMMIT/ambiguity semantics, clocks, K/D/adoption/configuration/schema/assets and existing App/Board/Auth behavior remain protected. The actual source names and catches above govern this amendment; no identifiers from unrelated earlier prompts are introduced as existing facilities. Auth wire A remains held until genuine producer source acceptance and its separately allocated consumer join.

Only this plan append was written. No product writes, commands, hashes/stat captures, checks, compiler/evaluation/imports, tests, network, SQL, Engine, private configuration/data or nested agents occurred. The supplied Body_Current0 lean-review approval is not a new execution or evidence read here; no live copy-executor outputs were read. Historical artifacts and the original report remain unchanged. Return this amendment to the original reviewer for the sole P2 rereview.
