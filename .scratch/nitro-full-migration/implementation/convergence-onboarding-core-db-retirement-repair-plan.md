# CORE runtime — retirement outcome repair, report only

**Closed sole-file proposal for original native-axis review.** Future product scope is only `packages/db/runtime.ts`, specifically `readOnboardingCoreAsync`'s scheduled-body outcome handling at898–968. No source changes occurred. Module `7b75957a…`, runtime `b06291b1…`, gate `64f5a220…`, public types and all other files stay protected.

Coordinator supplies both-axis source acceptance and fresh five-type/format-zero, lint-exit1 results at `bklp4vtj`; these are premises, not rerun checks. Correction: original `z_5vtwtq` lint had **three errors**, not one. Remaining runtime963/966 `no-unsafe-finally` throws were already in the original CORE runtime; they are not a TEXT repair regression. Original reports/receipts are preserved rather than rewritten.

## Exact cut

Keep existing admission, scheduling, clock creation, `bodyState`, `settled`, native unit/body/root/post-native/detachment and final in-try `assertCurrent()` unchanged. Replace only the early return/rethrow/finally outcome decisions with local discriminated slots:

```ts
type BodyOutcome =
  | { readonly kind: "pending" }
  | { readonly kind: "success"; readonly result: OnboardingCoreReadResult }
  | { readonly kind: "failed"; readonly error: unknown };
type DisposalOutcome =
  | { readonly kind: "clean" }
  | { readonly kind: "failed"; readonly error: unknown };
```

Use a local typed state object holding these slots, initialized pending/clean, consistent with the existing `bodyState` style. This avoids callback/control-flow narrowing problems and undefined-as-success. No exported types, brand/authorization flags, assertions, non-null assertions, suppression or generic outcome framework.

1. **TRY:** after the existing `body.detach()` and `assertCurrent()`, store success with that **exact result reference**, rather than returning it. No second detach, clone, codec, await or new clock check.
2. **CATCH:** retain the original branch condition `settled && !(error instanceof TransactionCommitAmbiguousError)`. In that branch construct the same new TransactionCommitAmbiguousError from the same original error, call `quarantineResource(ambiguous)` in the same position, and store failure with that wrapper. Otherwise store failure with the original error reference. Do not rethrow from this catch; do not rewrap an existing ambiguous error or quarantine the otherwise branch anew.
3. **FINALLY:** keep `bodyState.value?.dispose()` always attempted at exactly the existing position. If a body exists, invoke it once; if construction never produced one, retain the existing optional no-op. On direct disposal failure, keep `quarantineResource(error)` in the same position and record disposal failure with that exact error. No explicit return/throw/aggregate/outcome decision in finally. Do not flatten a disposal AggregateError into new counted faults.
4. **AFTER FINALLY:** decide the stored outcomes with the exact table below. This is still inside the existing scheduled callback, **before** its promise result/error reaches `underlying.then` or completion. Do not insert a promise wrapper, flush, deferred finalizer or extra native unit.

## Exact outcome equivalence

| Body outcome | Disposal outcome | Required result                                                                                                                                                             |
| ------------ | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Success R    | Clean            | Return R unchanged.                                                                                                                                                         |
| Failure P    | Clean            | Throw P unchanged. P is the original error or the original catch's newly quarantined ambiguous wrapper.                                                                     |
| Success R    | Failure D        | Throw D unchanged, after the existing disposal quarantine call. Do not turn cleanup-alone failure into a new ambiguous wrapper merely because COMMIT settled.               |
| Failure P    | Failure D        | Throw `new AggregateError([P, D], "CORE read and retirement failed", { cause: P })`. Exact message, body-first order, direct cleanup error and primary cause are preserved. |

After disposal handling, pending body outcome is an internal missing-outcome invariant only: fail with a fixed internal error, never return undefined, an empty projection or permission. Ordinary synchronous try/catch paths must store success/failure before reaching this decision. Failed slots intentionally support any thrown value, including undefined/null; their tags distinguish failure from clean/pending.

Quarantine calls are not moved into the final decision or doubled: post-settled nonambiguous body failure still quarantines its wrapper **before** disposal; disposal failure still quarantines D during retirement. Already ambiguous body errors and ordinary pre-settlement body errors retain their existing treatment. The trusted existing `quarantineResource` implementation is not replaced, wrapped or given a new policy. Its existing abrupt behavior is not turned into an authorized outcome.

Do **not** reuse `transaction-gate.ts#finishTransaction`: its transaction cleanup message/dispatch-based ambiguous wrapping would change the cleanup-alone and combined outcomes above. That helper and all native gate/COMMIT/rollback/busy restoration/quarantine logic remain untouched.

## Ownership / timing held constant

- Pending task registration, active accounting and the single `Promise.resolve().then` schedule stay exactly as written. Clock-construction failures before this try still follow the existing rejection continuation.
- All original K/root/epoch/credential/claim/native unit/post-native/currentness checks and the in-try result guard stay in place. The local outcome slots are control flow, not authority evidence or a new native observation/publication slot.
- Retirement still runs on every entered try path and before scheduled callback completion. A failed retirement withholds the result; no success can escape from the try before disposal is assessed.
- `underlying.then:970–988`, tightened publication clock checks, actual current-resource checks, release idempotence, activity/pending deletion and completion resolve/reject stay byte-unchanged. No late budget renewal or new post-retirement check alters the original failure precedence.

## Review / source gate

Only this NEW report was patched; inspection read frozen runtime and existing transaction error handling. No product edit, command/hash/stat/check/evaluation/import/test/SQL/native/Engine/network/private configuration/data/nested-agent operation occurred. No broad warning cleanup, framework, helper file, dependency, comment or test is proposed.

Original native-axis reviewer must approve before the future sole-file writer. That writer records a new freeze/protected joins, then coordinator allocates fresh focused types/lint/format and independent rereview. Auth birth plan is approved but its source remains queued behind the DB gate. No Auth admission/CoreRoot/configuration/SSR/delivery/enrollment/installer, decoder/Bun/driver compatibility, runtime/native/FS/data/restore/cutover authority follows from this plan or static results.
