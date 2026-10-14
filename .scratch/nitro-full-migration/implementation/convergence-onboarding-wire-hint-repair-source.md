# Onboarding body-hint repair — sole-file source freeze

## Outcome

**The approved security cut is authored and source-frozen for independent rereview and coordinator checks.** This is not SOURCE ACCEPT or a current compiler/lint/format/native result.

Controlling plan: `convergence-onboarding-wire-body-hint-repair-plan.md`; independent PLAN APPROVE supplied for reviewer `ses_eca5fc894ffeP2TR4ZaIlDr80j`. Exactly one product file changed: `packages/auth/nitro/production-sessions/onboarding.ts`. The retained diff has one hunk, confined to `OwnedOnboardingRequestState.readRpcPacketAsync` at current lines 737–778.

## Actual cut

- Original `standard-server`, Content-Type and Content-Length are read in the synchronous validation section, before cache return, ledger invocation, body acquisition/read or absence shortcut. The enclosing async signature is unchanged.
- Only exact whole `json`/`none` hint values are admitted. Every other explicitly present value—including unknown, empty, mixed/uppercase, duplicate/coalesced and the five noncompatible recognized SDK hints—rejects without split/trim/case-folding. Header data is an interpretation constraint, not permission/provenance.
- Unhinted absence is selected only when Content-Type is missing and Content-Length is missing or exactly `0`. Otherwise the existing case-insensitive application/json/optional UTF-8 regex must pass. Explicit `json` requires that same regex even for an empty body. No MIME/charset policy was broadened.
- Explicit `none` accepts any headers only provisionally: the same real once-owned bounded reader must observe null/zero bytes. Any positive byte count rejects, including whitespace, `null`, `{}` or false zero-length metadata. No body bytes are ignored because a header says none.
- JSON interpretation always reaches the existing fatal UTF-8 decoder after the actual read, using an empty buffer only for a genuinely null body. Exactly empty decoded text caches undefined/absence, including BOM-only decoding; otherwise whole-text JSON.parse is required. Whitespace does not become absence. Cache population follows actual read, compatible interpretation, successful decode/parse and currentness checks.

Genuine generated no-body/no-hint/no-Content-Type nextStep remains compatible. The existing resolver still returns undefined or a fresh SDK-owned parsed value from immutable original cached text; it was not edited. No literal RPC envelope, envelope-field selector, serializer, body getter, Request clone/reconstruction, second read, public flag/type/signature, dependency or helper framework was added.

The actual source collection, EOF/cancellation/reader.closed/release and terminal-stream-error replay bodies are unchanged. Method/path/header witness, origin/CSRF/demo policy, original clocks/budget, task ownership, native registrations and publisher methods are outside this hunk and unchanged. The wider lifecycle/publication axis was neither inspected nor repaired.

## Fresh private source evidence

`/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-onboarding-wire-hint-repair-source-e439520d8d62515167292580`

Directory mode 0700; all artifacts created with O_EXCL/mode 0600. Authorized bounded pure Python `-I -S -B` file/hash/difflib I/O produced `before.json`, `after.json`, `0-before.ts`, `0-after.ts`, `0-source.diff`, and nine protected before/after associations/images/empty diffs. The source diff was read, not executed. No product writes follow the after-capture freeze; only this new report was written afterwards.

| Sole product source          | SHA-256                                                            | Bytes / lines |
| ---------------------------- | ------------------------------------------------------------------ | ------------- |
| Before `onboarding.ts`       | `d0ea803e00c48b0c28671bc7eae65521a27515707018e5d2096316e7941c635a` | 41395 / 1092  |
| Frozen after `onboarding.ts` | `80056246320eaee86fbebd627723cfe756f41dff91d537d7503777c69cd3b67e` | 42265 / 1114  |

| Protected association                                        | Identical before/after SHA-256                                     |
| ------------------------------------------------------------ | ------------------------------------------------------------------ |
| `packages/auth/nitro/production-sessions/sql-persistence.ts` | `4a6fbb6b90ed473f0dcd40349537a4ee8ea3ab1b033258eafb40ccd58c538366` |
| `packages/auth/nitro/production-sessions/service.ts`         | `dc15daabb694204dfdc9f6460e5252b301fab216550cf5efc87faba5df1646d8` |
| `packages/auth/nitro/production-sessions/index.ts`           | `41394d5335ea52e93d8645a64cde5f7de4532d45dd37b38ff8a0545a871ce2ef` |
| `packages/db/runtime-onboarding/contracts.ts`                | `6d4adc755b1b2460fd1a7ee59dc18aab5ef13e3f2497fc19d584cb86a5ed1afc` |
| `packages/db/transaction-gate.ts`                            | `f2bc6c76001cd915c0af9c87d53cdc15f4c7539049e25aba13cc6fbf30362446` |
| `packages/db/runtime.ts`                                     | `680b62ba2b220278b1af03706579f47f3c7a0355b3fe8d6370c94c22dde75bd2` |
| `packages/db/runtime-onboarding/statements.ts`               | `db045f5ebbe20be8fd7abe5b92de43668744e0268cc4cfc85efbe7ad7b5ea9ec` |
| `packages/auth/nitro/production-sessions/bounded-body.ts`    | `0fc1de4836340d3d2b7753af697f21faafcbe0f3bc287a237430ddb7934cd25b` |
| `packages/auth/nitro/production-sessions/persistence.ts`     | `cc394f8f3ff84ae0426ee549d769187898e120b75906cf1171b2625aacf6911f` |

## Review/check ownership and continuing holds

The original security reviewer owns source rereview. Coordinator owns fresh Auth checks after **both reached writers freeze**. Supplied prior 13 checks (10 green/3 red) belong to the old source; they were not rerun or relabelled. The pending OwnedScope-field/lifecycle errors remain on the separate SQL-owner/publication axis; no widening/cast or scope expansion was attempted here.

Old Auth captures, receipt/control/failure/hold markers, plans and implementation reports remain untouched. No self-clearance of SOURCE HOLD is claimed. Actual API/MAIN factory provenance, physical transport/enrollment/client joins and completeSetup remain held; this body-interpretation repair grants no runtime/init/transport activation.

No comments, tests, casts/any, suppressions, other product/shared-reader/schema/manifest/library changes, compiler/lint/format/check commands, evaluation/imports, SQL/native/Engine, network, private configuration/data, nested agents, commit or push were used. Only the permitted capture commands and patch edits occurred. Active SQL-owner/publication planning and the disjoint closed C-candidate/external scratch executor outputs were not read.
