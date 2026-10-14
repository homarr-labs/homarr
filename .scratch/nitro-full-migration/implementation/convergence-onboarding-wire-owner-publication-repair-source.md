# Onboarding wire owner/publication repair — sole-file source freeze

## Outcome and authority

**Both approved SQL cuts are authored and source-frozen for independent rereview and coordinator checks.** This is not Auth SOURCE ACCEPT, a fresh compiler/lint/format PASS, native acceptance, or a runtime/enrollment grant.

Controlling plan: `convergence-onboarding-wire-owner-publication-repair-plan.md`; supplied PLAN APPROVE from original reviewer `ses_eca329b4dffeL69a3IM3ekRTrR`. Exactly one product file changed: `packages/auth/nitro/production-sessions/sql-persistence.ts`. The body-hint author's frozen `onboarding.ts` was the protected baseline, not edited or recaptured as this author's change.

## Actual two cuts

### P1 — actual SQL-owner disposal after physical drainage

The exact eight-line unassigned-native-publication disposal/catch/clear block was removed from `closeIssuerSqlScope` and moved to `closeProductionSessionSqlOwner`, frozen lines 4416–4423. It follows `await Promise.allSettled(tasks)` and the existing `failures` array, preceding the existing bounded onboarding cleanup summary.

The incorrect `OwnedScope.onboardingNativePublications` access is gone; disposal now accesses the existing collection on the actual `OwnedSql`. This closes the reported field-access diagnostic root at source level, **not a claim that fresh types pass**. No `owned(owner)` substitution inside scope close, collection addition, cast or type widening was used. Scope detach/abort/lease/observation/read settlement, error aggregation and success-only deletion are unchanged apart from removal of the misplaced block.

Owner close still publishes its single completion before snapshots and awaits the existing actual pending/read/write, authority, scope, request-retirement and active-publication-settlement tasks. Pending native completion, request ledger/release, and output reader/cancellation/closed/release settlement precede unassigned disposal. Transferred slots are already removed from the unassigned set and disposed by their publication settlement; legacy disposed slots are already removed during retirement. Each remaining slot receives its actual disposal attempt; thrown causes remain in the same `failures` array, and clearing follows the loop. No early live-slot disposal, new Runtime close port, retry, or cleanup-success claim on a thrown disposal was introduced.

Existing first genuine cleanup cause, distinct-failed-retirement bounded/saturated summary and task ownership rejection filtering remain unchanged. Repeated owner close returns its original completion.

### P2 — caught post-wait and last-boundary publication checks

`settleOnboardingPublication` retains its initial published assertion, prepublished completion and both readiness/task awaits. Two caught validation blocks were added:

- Frozen lines 2478–2494, after both waits: actual settled output/body, original Response status/header witness, this exact completion identity, owner-not-closing state, and the existing original publication clock/external-signal checks.
- Frozen lines 2527–2561, immediately before result freeze without another await: repeat those actual state/Response/clock checks; validate retained consumed `record.nativeRead` with the existing settled/native temporal/positive-output validity rules; prohibit recorded native cleanup failure and genuine publication cleanup failures.

Neither block calls the assertion's pre-completion guard. Both operate for GET and pre-native error responses without requiring a native slot. Caught failure marks the observed terminal abandoned and sets primary only when none exists. Post-wait invalidation does not return early: the existing actual native consume/dispose block still runs, retains `record.nativeRead`, and records genuine disposal failure. The last block reads that consumed evidence, never a disposed slot. Existing acknowledgement, dispatched-unconfirmed ambiguity, source error primary and cleanup aggregation are not rewritten.

The original result freeze remains before body/cleanup storage and collection/pending removal, then completion resolution. Repeated terminal settlement returns the same completion. Published remains a reported physical terminal, not proof that an error packet is a source-positive command. No new clock/budget, public expiry setter, late context DTO authorizer, evidence DTO, native replay/resend, self-await, source callback or helper framework was added.

## Fresh private source evidence

`/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-onboarding-wire-owner-publication-repair-source-b0ed947a83052bac6134f614`

Directory created mode 0700; every artifact created with O_EXCL/mode 0600. Authorized bounded pure Python `-I -S -B` file/hash/difflib I/O produced `before.json`, `after.json`, `pins.json`, ten before/after source-image pairs and ten diffs. Index 0 is the sole changed SQL source; indices 1–9 are protected associations with empty diffs. The SQL diff was read, not executed: four hunks implement the two lifecycle cuts. No product writes follow this after-capture freeze; only this new report was added afterward.

| SQL source   | SHA-256                                                            | Bytes / lines |
| ------------ | ------------------------------------------------------------------ | ------------- |
| Before       | `4a6fbb6b90ed473f0dcd40349537a4ee8ea3ab1b033258eafb40ccd58c538366` | 182439 / 4399 |
| Frozen after | `ad705fa8eb78e33f1ac29f61e4c35d3048de9c31a4d1eb10d196ee9c6e7405fd` | 184757 / 4451 |

| Protected association                                     | Identical before/after SHA-256                                     |
| --------------------------------------------------------- | ------------------------------------------------------------------ |
| `packages/auth/nitro/production-sessions/onboarding.ts`   | `80056246320eaee86fbebd627723cfe756f41dff91d537d7503777c69cd3b67e` |
| `packages/auth/nitro/production-sessions/service.ts`      | `dc15daabb694204dfdc9f6460e5252b301fab216550cf5efc87faba5df1646d8` |
| `packages/auth/nitro/production-sessions/index.ts`        | `41394d5335ea52e93d8645a64cde5f7de4532d45dd37b38ff8a0545a871ce2ef` |
| `packages/db/runtime-onboarding/contracts.ts`             | `6d4adc755b1b2460fd1a7ee59dc18aab5ef13e3f2497fc19d584cb86a5ed1afc` |
| `packages/db/transaction-gate.ts`                         | `f2bc6c76001cd915c0af9c87d53cdc15f4c7539049e25aba13cc6fbf30362446` |
| `packages/db/runtime.ts`                                  | `680b62ba2b220278b1af03706579f47f3c7a0355b3fe8d6370c94c22dde75bd2` |
| `packages/db/runtime-onboarding/statements.ts`            | `db045f5ebbe20be8fd7abe5b92de43668744e0268cc4cfc85efbe7ad7b5ea9ec` |
| `packages/auth/nitro/production-sessions/persistence.ts`  | `cc394f8f3ff84ae0426ee549d769187898e120b75906cf1171b2625aacf6911f` |
| `packages/auth/nitro/production-sessions/bounded-body.ts` | `0fc1de4836340d3d2b7753af697f21faafcbe0f3bc287a237430ddb7934cd25b` |

Protected `onboarding.ts` remains 42265 bytes / 1114 lines. Native detached-reader/clock/validated DB3 semantics and shared ledger/bounded-body source were not changed.

## Handoff and continuing holds

Original reviewer owns independent rereview of these frozen cuts; coordinator owns fresh focused checks after freeze. Original phase-A capture, body-hint capture, 13-check receipt with ten green/three red outcomes, earlier reports and holds remain untouched and are not relabelled fresh PASS. Supplied accepted V2 native C-candidate 21106 is historical native evidence, not validation of current Auth bytes. No live executor outputs were read.

Packet-security hint rereview remains on the other author's frozen onboarding image; this handoff supplies immutable SQL images for the lifecycle reviewer. Actual API/MAIN producer birth, physical transport/client/enrollment joins, runtime activation and completeSetup remain held. A scratch-only publication report does not clear those holds.

No compiler/lint/format/check command, evaluation/application import, tests, native SQL/Engine, network, private configuration/data, nested agents, commit or push was used. No comments, suppressions, any/casts, schema/native DB edits, helper files or changes to the other three Auth sources/shared readers were added. Only the two permitted capture commands, sole product patch and this report patch occurred.
