# Onboarding four-command repair — two-file source freeze

## Outcome and scope

The independently approved narrow repair is authored and source-frozen for coordinator rereview. This is **source evidence only**, not typecheck/lint/native acceptance or application activation. The original cancelled four-file/native4 stage remains **partial**; its original after-images and historical failed/accepted controls are retained, not renamed passed or made current by this repair.

This renewed lease changed exactly:

- `packages/db/runtime-onboarding/statements.ts`
- `packages/db/transaction-gate.ts`

`packages/db/runtime-onboarding/contracts.ts` and `packages/db/runtime.ts` remain byte-unchanged at their associated original source pins below. No four-file rebuild, new command, completion arm, handler, counter or enrollment change occurred. Other Widget/Media authors' paths were not written.

## Exact repair

- `statements.ts:170–172,196–198`: initialize the existing void-capable result to its actual JavaScript initial value, `undefined`; retain another party's locked expiry separately as `lockedClaimExpiry`. No fabricated claim result/default was introduced.
- `statements.ts:317–331`: compare the exact final claim row/hash/expiry and current SQL observation using `claimExpiry ?? lockedClaimExpiry`; only `claimExpiry` emits a validated authority-expiry event. Existing issued, matching-active and claim-authorized mutation expiry enforcement remains. The unrelated locked claim does not tighten the operation's authority deadline or turn a near-expiry locked response into a skew-margin authority failure.
- `transaction-gate.ts:638–678`: the new onboarding K-reader iterator captures `TransactionOutcome<void>`, initially successful with `undefined`, and retains the same caught primary error. Its external `cleanupErrors` array receives iterator-return, statement-finalization and final-check failures in that order; existing native-failure/quarantine behavior remains. Its `finally` calls the existing `finishTransaction(outcome, cleanupErrors, false)`, including early generator return, preserving single-error identity and aggregate primary cause/order without explicit throws in finally, suppressions, empty catches, or a new helper.

No optional PG variable rename was needed. Existing App/Board/Auth gate behavior, original clock/expiry mapping, ready-domain/policy/lock routines, K/D, adoption, epoch/snapshot/configuration, schema and 142 migration assets were not changed by this cut. Nullable email contracts and runtime association remain exactly as frozen, including explicit empty-string preservation.

## Fresh source evidence

Private evidence directory:

`/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-onboarding-four-command-repair-7c4d8eb9a17301471ac3ec03`

`before.json` and `after.json` associate the exact two source paths and unchanged contracts/runtime hashes. The directory was created with mode 0700; evidence files used O_EXCL and mode 0600. Capture used bounded pure-file-I/O/hash/difflib Python with `-I -S -B`; no application imports or evaluation occurred.

| Source                                         | Before SHA-256                                                     | Frozen after SHA-256                                               | After bytes/lines | Evidence files                               |
| ---------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ | ----------------- | -------------------------------------------- |
| `packages/db/runtime-onboarding/statements.ts` | `2bab69501092b7083632bdedbc0f975340e6d386eac812f352e76358ef509cf3` | `db045f5ebbe20be8fd7abe5b92de43668744e0268cc4cfc85efbe7ad7b5ea9ec` | 15316 / 334       | `0-before.ts`, `0-after.ts`, `0-repair.diff` |
| `packages/db/transaction-gate.ts`              | `344481eac58c51fa8f2b075601414b8009791379c5f48f5283280029470552b9` | `31c2bf210de2e11aff4d077945d794a58bc3bf0628fed38a99364466dedad6cd` | 27493 / 758       | `1-before.ts`, `1-after.ts`, `1-repair.diff` |

| Unchanged association                         | Identical before/after SHA-256                                     | Bytes |
| --------------------------------------------- | ------------------------------------------------------------------ | ----- |
| `packages/db/runtime-onboarding/contracts.ts` | `508549140e2386f4fa009974389b6ce9f26768732df034250e570d4377f30987` | 10561 |
| `packages/db/runtime.ts`                      | `87e8754f8323dbe33f8789dfe73323903ba7e5a7b39cafd9746dff1dc79c56a6` | 44976 |

Both retained diffs were read as source evidence; they contain only this selected repair. No source writes follow this after-capture freeze. The previous four-file capture at `nitro-onboarding-four-command-source-09637babbda2bca935b4defa` remains historical and unchanged; it is not this repair's after-image.

## Remaining holds

Fresh coordinator checks may be allocated only after all source writers freeze. This changed whole source closure invalidates old _current_ checks, never historical artifacts. No checks, compiler, lint/format command, tests, application evaluation/import, native SQL, Engine/container, network, private configuration/data or nested agents were run for this repair. No new tests, dependencies, comments, manifests or ambient/compiler changes were added.

The four-command DB body still requires independent source/native rereview and the separately held actual Auth request/hash/origin producer before handler/enrollment activation. `completeSetup` remains absent and deferred. Counters 91/3340/9, frozen child435 outputs, the fifth immutable artifact, and historical controls retain their original status. This freeze claims no phase completion, native success, safe retry/force, adoption/seed authority or application setup/login acceptance.
