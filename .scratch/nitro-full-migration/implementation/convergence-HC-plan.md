# HC cancellation failure: bounded fix-plan review

## Decision

**APPROVE** a source-only amendment in `apps/backend/src/server/application.ts`, confined to the final failure dispatch in `discardResponse`. Rethrow the sole captured rejection unchanged; retain `AggregateError` for two captured failures. Caller tests remain unchanged. No identity deduplication, helper refactor, new tests, or changes to cancellation/disposal ordering are justified by this failure.

## Evidence and scope

Read-only Phase 3/4 source review, using coordinator-completed Phase 1/2. No commands, tests, product edits, runtime activation, native services, databases, environment/credential reads, or nested agents were performed. This report is the only write.

Coordinator loop from `apps/backend`: `bun --no-env-file test tests/public-fetch.test.ts`; isolated loop adds `--test-name-pattern='failed asynchronous cancellation settles once before shutdown disposal: HEAD'`.

Captured evidence in `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-convergence-final-5QDWgFTY/`:

- `public-fetch.stdout`: Bun 1.4.2; `public-fetch.stderr`: 9 pass / 1 fail, HEAD assertion at test line 402; `public-fetch.exit`: 1.
- `public-fetch-head.stdout`: same Bun version; `public-fetch-head.stderr`: 0 pass / 9 filtered / 1 fail at the same assertion; `public-fetch-head.exit`: 1.
- Both failures show expected `[Error: Source cancellation failed]`, received `[AggregateError: Response cancellation and settlement failed]`.
- The consumer cancellation case passes in the full run, including its `toBe(failure)` assertion at line 399.

The captured formatter does not expose `AggregateError.errors`. The exact inputs below are determined from the actual HEAD control flow and fixture, not inferred from matching error messages. No GLOSSARY or ADR-named files were found; the directly relevant error-reporting interface is `packages/contracts/src/contribution.ts:24–29` (`reportError(error: unknown, requestId: string)`, without an aggregate-only contract).

## Exact origin and inputs

1. The fixture in `apps/backend/tests/public-fetch.test.ts:351–412` creates one `failure` object at line 358. Its source stream's async `cancel` waits for the release promise, records settlement, then throws that same object at line 374. The request disposer only appends an event; no failing contribution disposer exists in this fixture.
2. `respond` assigns the rendered source to `ownedResponse` (`application.ts:124`). HEAD finalization makes a bodyless response (`276–292`) but leaves the source owned until `await discardResponse()` at line 128.
3. That call happens **before** `retainRequest` at line 132. `retainedTermination` starts undefined at line 48 and is assigned only by the callback at lines 138–140, which has not run. Shutdown aborts the request signal while source cancellation is pending, but there is no retained reader, retained abort listener, or termination task on this HEAD path.
4. `discardResponse` takes and clears ownership (`80–82`), awaits the original source body's `cancel`, and catches exactly the fixture's `failure` object (`84–87`). The settlement branch at lines 89–95 is skipped. Thus `failures` is **exactly `[failure]`** and the thrown aggregate at line 96 has `.errors` **exactly `[failure]`**, not `[failure, failure]` and not a distinct cleanup error.
5. `handle` catches this newly constructed aggregate and reports it at lines 218–219. Its second `discardResponse(error)` has neither an owned response nor a retained termination, so it adds no errors and reports nothing further. Because shutdown has aborted the signal, the fallback status is 499; request disposal then runs before shutdown resolves. The observed failing assertion concerns error wrapping, not an established disposal-order failure.

**Root cause:** `discardResponse` unconditionally creates an `AggregateError` whenever it captures even one failure, replacing the original single cancellation rejection in the reporter's output.

## Ranked hypotheses resolved

- **Same rejection counted twice through cancellation and settlement:** falsified for this reproduction. The predicted second collected rejection is impossible here because HEAD cancellation precedes creation of a retained termination. Identity deduplication cannot fix the singleton wrapper anyway.
- **Independent cleanup/settlement failure:** falsified for this reproduction. The only rejecting operation contributing to this aggregate is the fixture source's cancellation; settlement is absent and request disposal is later. This conclusion is fixture-specific and does not justify suppressing independent failures on other paths.
- **Stale single-error test expectation:** not supported. The fixture intentionally throws one object; the consumer case preserves it, and the reporting interface does not require singleton aggregates. Nothing inspected demonstrates an API-contract reason to alter the caller test. The demonstrated defect is the source helper's singleton wrapping, not the existence of aggregation for multiple failures.

## Exact approved amendment

Replace only `discardResponse`'s final dispatch at current line 96:

```ts
if (failures.length === 1) throw failures[0];
if (failures.length > 1)
  throw new AggregateError(
    failures,
    "Response cancellation and settlement failed",
  );
```

Leave both catches and both awaited operations untouched. This preserves zero-failure success, the original singleton rejection object/value, and all entries/order in a multi-failure aggregate. Do not deduplicate by identity or message, flatten nested aggregates, change outer primary-versus-cleanup reporting, suppress a second failure, or modify `retainRequest`'s `finish` helper. Broader failure-composition behavior is outside this approval.

## Coordinator validation gate

After applying that two-line source amendment, rerun the unchanged isolated HEAD loop and full `public-fetch.test.ts` loop in the same clean environment. The required result is that line 402 sees `[failure]` while the existing status, settlement/disposal ordering, and consumer identity assertions still pass. Run the required lint and backend/Nitro/owner typechecks using the coordinator's established commands. Prior lint/typecheck exit 0 is coordinator-reported baseline evidence, not post-amendment validation.

No further probe is needed to distinguish the aggregate inputs on this path. Approval is a bounded source-plan decision only; passing checks, runtime convergence, deployment, or activation are not claimed.
