# CORE retirement — frozen runtime-only handoff

**Implemented/frozen, not SOURCE ACCEPT or lint/runtime proof.** Sole product edit: `packages/db/runtime.ts`, only the approved scheduled-callback outcome cut in `readOnboardingCoreAsync`. Controlling report: `convergence-onboarding-core-db-retirement-repair-plan.md`. No module/gate/Auth/API/Backend/C/D/E/F/Root/SSR/manifest/helper/dependency/test file was edited.

## Actual retained outcome handling

Local typed `BodyOutcome` is pending/success-with-exact-result/failed-with-unknown-error; `DisposalOutcome` is clean/failed-with-unknown-error. A local state object holds these control-flow slots, not authorization or publication facts.

- TRY performs the unchanged native unit/root/post-native/body.detach/assertCurrent sequence, then records the exact detached result reference instead of returning early.
- CATCH retains the exact `settled && !(error instanceof TransactionCommitAmbiguousError)` branch. That branch constructs the same wrapper and quarantines it before disposal, then records that error; otherwise it records the original thrown value. No catch rethrow or extra quarantine was added.
- FINALLY retains the same optional `bodyState.value?.dispose()` invocation. Direct failure still calls `quarantineResource(error)` in the same position, then records that direct error. Finally contains no explicit return, throw, aggregate or outcome decision.
- The decision runs after finally, within the **same** scheduled callback, before underlying/completion settlement. No new promise, native unit, flush, clock/budget/check, detach/clone or controller was introduced.

| Body      | Disposal  | Actual terminal result                                                                                                                     |
| --------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Success R | Clean     | Return the same R.                                                                                                                         |
| Failure P | Clean     | Throw the same P.                                                                                                                          |
| Success R | Failure D | Throw the same D; no new cleanup-alone ambiguous wrapper.                                                                                  |
| Failure P | Failure D | `AggregateError([P, D], "CORE read and retirement failed", { cause: P })`. Exact message/order/cause and direct error references retained. |

Pending outcome fails with the fixed internal `CORE read outcome is unavailable` error, never undefined/empty success or permission. Failure tags preserve thrown null/undefined as failures. Existing quarantine routines/call order and original trusted abrupt calls remain unwrapped; no native error/helper semantics were changed. `finishTransaction` was not borrowed.

Retirement still occurs once when a body exists on every entered try path, before callback settlement; failed disposal withholds output. Clock construction before this try and existing `underlying.then` rejection handling are unchanged. Postcompletion tightened clock/current-resource/release/activity/pending/completion guards remain byte-identical.

## Source freeze / unchanged joins

Private0700/exclusive0600 receipt root: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-onboarding-core-db-retirement-source-lbsvsyo9/`; exclusive `before/`, `after/`, `diffs/`, `pins/{before,after}.json`. Current original source images matched before patching.479 protected images remained unchanged, including the earlier protected joins, repaired TEXT module, gate, old handoffs and captured source plans/Auth compatibility report. Reports were pinned as text, not mutable roster/approval authority.

Frozen runtime SHA-256: `9122f2e1cdd6e3f161b935af6f5359abb7739486206d19ad4fe08c73e7cb7b80`.

Byte spans confirm unchanged entire runtime prefix before the outcome cut, unchanged scheduled-callback close/`underlying.then` continuation and entire runtime tail, unchanged native/post-native/detach/assert body, and unchanged ambiguity condition/wrapper/quarantine prefix. Module remains `7b75957a…`; gate remains `64f5a220…`. Public signatures/types, shared native authority/clock/witness/COMMIT/rollback/busy restoration/cleanup and task registration/scheduling are untouched.

## Evidence correction / holds

Coordinator premises: original both-axis source acceptance; `bklp4vtj` five focused type checks and formatting zero, with **two unsafe-finally diagnostics**. Original `z_5vtwtq` had three lint errors, not one; runtime's two were original, not a TEXT regression. Old reports/failed-check receipts were not overwritten. No new lint/type/format pass is claimed.

Only the source patch, this NEW handoff, dedicated source reads and released bounded isolated Python source/hash/diff IO occurred. No compiler/lint/formatter/project-check command, evaluation/import/test/native SQL/Engine/network/private configuration/data/nested agent/commit/push. No comments/casts/non-null assertions/suppressions/warning cleanup or generic outcome framework was added.

Coordinator owns fresh focused five-type/DB3 lint/format checks and exact-source independent rereview after freeze. Approved Auth3 birth source remains queued behind the DB gate. Decoder/Bun/driver compatibility, native/runtime/Appboot/FS/data/SSR/delivery/enrollment/PostgreSQL/installer/restore/cutover authority and proof remain held.
