# HC singleton cancellation failure fix

## Frozen source-only amendment

Applied the exact bounded approval in `convergence-HC-plan.md` and Oracle session `ses_ece992781ffe6GbY8SjhWLC0zo`. Only the final failure dispatch in `apps/backend/src/server/application.ts`'s `discardResponse` changed:

```ts
if (failures.length === 1) throw failures[0];
if (failures.length > 1)
  throw new AggregateError(
    failures,
    "Response cancellation and settlement failed",
  );
```

After the existing physical cancellation and settlement collection, zero failures still succeeds, a sole rejection is rethrown unchanged (including falsy thrown values), and multiple failures retain their collected order and original rejection objects/values in `AggregateError.errors`. No cause option or other error-composition behavior changed.

The approved HEAD reproduction collects exactly `[original failure]`, not duplicate rejections or a distinct cleanup failure. No deduplication or flattening was added. Waits, cancellation ownership, closed settlement, release logic, private publication, status behavior, and tests remain untouched. The existing failed HEAD test remains the regression seam.

## Remaining validation

No commands, checks, tests, runtime/native/data/secret access, or nested agents were performed. No PASS, compiler, runtime, or procedure acceptance is claimed. The coordinator must run the unchanged isolated HEAD check, focused public-fetch checks, and required lint/typechecks in its established clean environment. Activation remains held; this writer's diff is frozen.
