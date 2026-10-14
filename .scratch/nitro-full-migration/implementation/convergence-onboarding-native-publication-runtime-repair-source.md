# Native publication runtime repair — sole-file source freeze

## Outcome

Both independently approved cuts are authored and frozen in **only `packages/db/runtime.ts`**. Controlling plan: `convergence-native-publication-runtime-repair-plan.md`; supplied PLAN APPROVE reviewer: `ses_ec928465fffeJlnM9Li9P06VDI`. This is source-only handoff for fresh coordinator checks and independent source rereview, not a native/runtime grant or phase acceptance.

## Exact cuts

1. `runtime.ts:307–311` constructs the evaluator's local configuration with the already imported `captureNativeCredentialPolicyConfiguration`, preserving identical maximumSnapshotRows, allowed skew and the dereferenced original clock. Every internal configured-clock sample now passes through that existing validating wrapper. Invalid samples remain caught as `clock-invalid` alongside the retained native facts. The local wrapper/configuration is not retained in any record/reader; only the existing weak original clock association persists. Operation/invocation/owner identity, both original budgets and decreasing deadline/expiry mapping are unchanged.
2. `runtime.ts:769–796` replaces the executor's outer-finally block with a call to owner-local `finalizeOnboardingMutation`. Its body is the exact extracted leave/catch/classification/rethrow, followed by the exact scalar observation-copy/dispose/handle-clear/settled block in its own finally. Leave still executes once, and a leave failure retains its original error identity and intentional outward precedence. Observation finalization still occurs before the execution promise settles. The function is not exported, stored in a publication record/reader, shared with other mutations, or used as a suppression/control-flow shortcut.

The retained source diff contains only those two cuts. No additional source producer, fallback, clock function, callback, comments, tests, casts/any, suppression, dependency or manifest changes were needed. Contracts/gate source acceptance remains supplied and protected; ordinary warning-only shadowing/cause diagnostics are outside this repair.

## Fresh private evidence

`/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-onboarding-native-publication-runtime-repair-source-81602ee70ff16121cd001cbd`

The new directory used mode 0700; all records/images/diff used O_EXCL and mode 0600. Authorized bounded pure Python `-I -S -B` file/hash/difflib I/O produced `before.json`, `after.json`, `0-before.ts`, `0-after.ts`, and `0-repair.diff`. The diff was read as source, not executed. No source writes follow this after-capture freeze.

| Sole source              | Before SHA-256                                                     | Frozen after SHA-256                                               | After bytes/lines |
| ------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------ | ----------------- |
| `packages/db/runtime.ts` | `904edda8d6407e98bc5e685ff24f15975cf0415117b19ed989052c169aca811f` | `680b62ba2b220278b1af03706579f47f3c7a0355b3fe8d6370c94c22dde75bd2` | 56372 / 1393      |

| Protected association                          | Identical before/after SHA-256                                     | Bytes |
| ---------------------------------------------- | ------------------------------------------------------------------ | ----- |
| `packages/db/runtime-onboarding/contracts.ts`  | `6d4adc755b1b2460fd1a7ee59dc18aab5ef13e3f2497fc19d584cb86a5ed1afc` | 13084 |
| `packages/db/transaction-gate.ts`              | `f2bc6c76001cd915c0af9c87d53cdc15f4c7539049e25aba13cc6fbf30362446` | 35158 |
| `packages/db/runtime-onboarding/statements.ts` | `db045f5ebbe20be8fd7abe5b92de43668744e0268cc4cfc85efbe7ad7b5ea9ec` | 15316 |
| `packages/db/package.json`                     | `b18fe8ef97fd533556530f2250610d860b32bc8f50293b6466331e766fd9ba41` | 3726  |
| `packages/db/index.ts`                         | `3c52edee3910ad384bb0ce4af98f56163464f0bc0568e53edf45fdbb077d8241` | 3265  |
| `packages/core/src/infrastructure/db/index.ts` | `9170b440a3a27e990dcc366f262e5db1b8d2ab1b205b77049682847577f4c784` | 528   |

## Holds and validation ownership

The supplied prior erltf3mb results—25 typechecks passed, format0, lint1 for the unsafe outer-finally rethrow—belong to the previous frozen bytes. They were not rerun or relabeled as proof of this changed source. Coordinator owns fresh targeted checks and source rereview after freeze; no new PASS is claimed here.

No compiler, lint/format/check commands, application evaluation/imports, tests, native/SQL, Engine, network, private configuration/data or nested agents were used. Only authorized source captures and patch edits were performed. No shared error aggregation, SQL, schema/assets, preservation observer, Auth/MAIN/API or historical artifact/control was changed. The disjoint historical approval-candidate envelope remains artifact-only planning; changed current bytes are never old native proof.

Auth wire A remains held pending actual runtime-source acceptance and fresh source gates. Existing public port signatures, one native dispatch, claim/void outputs, original ownership/clock/guard semantics, cleanup observation, COMMIT acknowledgement, quarantine and detached weak post-retirement retention remain otherwise unchanged. This handoff grants no native execution, runtime activation, retry, commit or push authority.
