# AS cleanup frozen handoff

## Scope

- Changed only `apps/nitro/src/features/assistant/conversation.ts` and this new report.
- Followed `.scratch/nitro-full-migration/WRITER-RULES.md`; writer is frozen.

## Source changes

- Captured generation work in an inner async `Promise<false | void>` with tagged returned/thrown outcomes.
- Moved conditional readback, reconciliation, failure selection, and lock release out of `finally`; retained the actual thread-ID validation throw.
- Preserved every original early `false`: blank input, unknown iterator/provider settlement, and aborted writes or unmount after physical settlement. Conditional finalization runs before returning the captured result.
- Retained readback only when physically settled and still writable/mounted. The active operation stays locked through readback, reconciliation, invalidation, and state publication; unknown physical settlement keeps the operation retained.
- Kept awaited message writes, user-save acknowledgement, missing-message reconciliation, existing failure-reason precedence, iterator/provider drain, and cancellation unchanged. No retry was introduced.
- Captured escaping finalization errors with an explicit tag, including falsy thrown values. If both work and finalization escape with errors, `AggregateError` retains the work error first and finalization error second; otherwise the original thrown value is propagated.

## Remaining dependencies and evidence limits

- No dependency, manifest, controller, API, UI, form/runtime boundary, or other source changes.
- Existing generation settlement and persistence/readback owners remain required and unchanged.
- Coordinator must perform the permitted focused lint/type validation after writer freeze. No commands, checks, tests, installs, runtime/native/SQL execution, real providers, or nested agents were used.
- File readback only; no compiler, runtime, procedure acceptance, activation, or production-cutover proof is claimed.
