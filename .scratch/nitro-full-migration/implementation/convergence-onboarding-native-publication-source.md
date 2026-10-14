# Onboarding native publication producer — three-file source freeze

## Outcome

The approved producer plan and controlling cleanup/reader amendment are authored in exactly three product files and source-frozen for independent source review and coordinator checks. This is **source-only evidence**, not compiler/lint/native acceptance, a runtime grant, Auth integration or phase completion. Plan approval was supplied for `ses_ecb7d19deffeUfsRkjA6izUQCz`; no nested review/session was launched here.

Changed product scope:

- `packages/db/runtime-onboarding/contracts.ts`
- `packages/db/transaction-gate.ts`
- `packages/db/runtime.ts`

No fourth producer file was required. `runtime-onboarding/statements.ts` and related package/Core entrypoints are byte-unchanged in the associations below. No Auth/MAIN/API, preservation observer, schemas/assets, K/D/adoption/epoch/snapshot/configuration, dependencies, comments, tests or manifest changes were made. Existing native child/artifact compiler inputs remain historical, not current-source proof; live external C/H/P outputs were not read.

## Actual producer and ownership joins

| Current authored source                       | Actual body                                                                                                                                                                                                                                                                                                                                                                                |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `contracts.ts:95–158`                         | Narrow native publication handle, bounds/facts, pending/settled read, detached reader and observed-dispatch packet types. The packet contains the genuine handle, detached reader and original-result completion promise; facts contain no token/hash/password/SQL/runtime or raw error graph.                                                                                             |
| `transaction-gate.ts:51–125`                  | DB-private onboarding observation WeakMap. The factory registers an unentered attempt, not a permission fact. Entry verifies exact prepared-object and resource-lifetime identity, rejects reuse/copies, and clears those strong associations. These internal ports are not package-public reexports.                                                                                      |
| `transaction-gate.ts:643–734`                 | Existing owned gate retains checked scalar snapshots from its actual original clock mapping, validated authority events and effective decreasing deadlines. Successful actual commitCheck records final-gate-passed. Session/claim values are taken from existing generator events, not an output TTL or caller setter.                                                                    |
| `transaction-gate.ts:327–369,529–593`         | Real native dispatch and acknowledgement are recorded immediately around SQLite COMMIT / awaited PostgreSQL COMMIT, before the later gate/cleanup failures. Slot completion preserves a previously failed cleanup state even when the helper cleanup array is empty. Existing finishTransaction/error ordering, rollback, quarantine and ambiguous-COMMIT behavior remain unchanged.       |
| `transaction-gate.ts:738–864`                 | K-reader cleanup observations originate at the existing all()/iterate() finalization, iterator-return and final cleanup-check catches. Existing nativeFailed/quarantine/push order remains; ordinary read catches record body failure without cleanup increments. The repaired iterator-finally finishTransaction call is unchanged. Propagated aggregates are not traversed or recounted. |
| `transaction-gate.ts:279–287,401–410,555–583` | Existing transaction cleanupFailed sites observe their own actual cleanup failures once, including PostgreSQL listener detach, release/end and native rollback/restoration/close failures. No observation slot is supplied by other mutation callers.                                                                                                                                      |
| `runtime.ts:240–373`                          | The detached reader is constructed outside createPersistenceRuntime and closes over only its publication store and opaque owner identity. It performs weak exact operation/invocation lookup, returns retained facts independently of promise fulfillment, and evaluates original/observed bounds using the weak original configured clock. It never calls ready/work guards or SQL.       |
| `runtime.ts:670–851`                          | Legacy four overloads and the observed four overloads share one actual onboarding executor. Observed handle/store/reader/completion packet are registered before that executor starts. The existing active unit is incremented once, retains actual cleanup/guard/leave accounting, and forwards its source result/error once.                                                             |
| `runtime.ts:738–789`                          | Runtime guard failure and actual leave settlement are retained without replacing the outward error. Finally copies the native scalar observation, removes its internal registration, and clears the publication record's native handle before marking settlement. This also runs on rejected native promises.                                                                              |

The terminal publication record contains scalar native facts, fixed bookkeeping and weak original operation/invocation/configured-clock associations only. It does not retain prepared/business rows, credentials, tokens, errors, configuration objects, connection/pool, Runtime or active promises. Disposal deletes the public evidence registration and retains only a weak identity tombstone for idempotent genuine disposal. Pending disposal does not cancel the already owned task, remove active accounting, dispose its native producer early or close SQL; the real executor still settles and leaves.

## Public ports at the existing `@homarr/db/runtime` entrypoint

The four existing `onboardingMutationAsync(operation, invocation, configuration)` overloads still return `Promise<OnboardingClaimResult>` for claim and `Promise<void>` for nextStep/initUser/initialExternalGroup.

New real overloads use the same arguments:

```ts
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
```

`OnboardingObservedDispatch<T>` has `publication`, `reader` and `completion: Promise<T>`. Starting this fixed call starts its one native dispatch; there is no receipt replay/start method. The detached packet reader and runtime's forwarding references expose:

```ts
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

Foreign runtime/reader stores, copied handles and structurally equal but different input objects fail actual lookup. Consume rejects pending or already consumed records and freshly evaluates before its once transition. Dispose revokes reads/consumption; repeated genuine disposal is idempotent, but copied/foreign associations reject. Read snapshots/brands are not independently trusted authorization or accepted input for another registrar.

Known COMMIT acknowledgement remains visible when the existing outward error conservatively reports ambiguous after a post-COMMIT guard/cleanup failure. A genuinely dispatched-unconfirmed COMMIT stays unconfirmed. No acknowledgement, cleanup or runtime guard success is inferred from exception type or a void result. Reads after retirement/quarantine do not reopen persistence; unavailable/invalid/expired temporal evaluation retains the actual native facts alongside its blocked result.

The evaluator retains both original wall/monotonic budgets and the actual gate's effective deadline pair, checks original configured/wall clock skew and last successful native monotonic observation, and enforces recorded actual claim/session expiry. It does not recapture a budget or accept an expiry/timestamp callback. The repaired unrelated locked-claim branch still emits no authority-expiry event, and therefore contributes no claim-expiry tightener to this port.

## Fresh source evidence and freeze

Private capture directory:

`/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-onboarding-native-publication-source-4e158bce0b8da99dfb06a8dc`

The new directory was created with mode 0700; records/images/diffs used O_EXCL and mode 0600. `before.json` / `after.json` contain the three source associations and protected associations. Only authorized bounded pure Python `-I -S -B` file/hash/difflib I/O was run. Source diffs were read as source, not executed. No source writes follow this after-capture freeze.

| Source                            | Before SHA-256                                                     | Frozen after SHA-256                                               | After bytes/lines | Evidence                                     |
| --------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ | ----------------- | -------------------------------------------- |
| `runtime-onboarding/contracts.ts` | `508549140e2386f4fa009974389b6ce9f26768732df034250e570d4377f30987` | `6d4adc755b1b2460fd1a7ee59dc18aab5ef13e3f2497fc19d584cb86a5ed1afc` | 13084 / 341       | `0-before.ts`, `0-after.ts`, `0-source.diff` |
| `transaction-gate.ts`             | `31c2bf210de2e11aff4d077945d794a58bc3bf0628fed38a99364466dedad6cd` | `f2bc6c76001cd915c0af9c87d53cdc15f4c7539049e25aba13cc6fbf30362446` | 35158 / 940       | `1-before.ts`, `1-after.ts`, `1-source.diff` |
| `runtime.ts`                      | `87e8754f8323dbe33f8789dfe73323903ba7e5a7b39cafd9746dff1dc79c56a6` | `904edda8d6407e98bc5e685ff24f15975cf0415117b19ed989052c169aca811f` | 56229 / 1389      | `2-before.ts`, `2-after.ts`, `2-source.diff` |

Paths in that table are under `packages/db/`.

| Protected source association                   | Identical before/after SHA-256                                     | Bytes |
| ---------------------------------------------- | ------------------------------------------------------------------ | ----- |
| `packages/db/runtime-onboarding/statements.ts` | `db045f5ebbe20be8fd7abe5b92de43668744e0268cc4cfc85efbe7ad7b5ea9ec` | 15316 |
| `packages/db/package.json`                     | `b18fe8ef97fd533556530f2250610d860b32bc8f50293b6466331e766fd9ba41` | 3726  |
| `packages/db/index.ts`                         | `3c52edee3910ad384bb0ce4af98f56163464f0bc0568e53edf45fdbb077d8241` | 3265  |
| `packages/core/src/infrastructure/db/index.ts` | `9170b440a3a27e990dcc366f262e5db1b8d2ab1b205b77049682847577f4c784` | 528   |

Existing package dependencies and the `./runtime` export were read before reuse. No new library, install, manifest or helper file was needed; the shared finishTransaction body and SQL statements were not edited.

## Continuing hold

Independent source review and coordinator-owned fresh targeted checks must assess this changed whole closure after writer freeze. No compiler, lint/format command, tests, application imports/evaluation, SQL/native execution, Engine, network, private configuration/data, nested agents, commit or push was performed. Existing accepted/failed controls and compiler inputs are not retagged current by this source change.

Auth wire A remains held: its future actual dispatch callsite must retain the exact original operation/invocation/configured clock, pin the **detached packet reader rather than a bound Runtime**, track/await that exact completion, and join the retained native facts to the genuine request/CSRF/origin/publication/retirement association. Consuming these facts is not a new SQL authorization grant. No Auth source or transport/API factory activation is claimed. completeSetup and all separately held native/publication/enrollment work remain deferred.
