# Native publication reader: one-file repair plan

## Scope and evidence

Repair only `packages/db/runtime.ts`. The gate/contracts source review is accepted; neither those files nor protected statements/exports changes. Frozen runtime is `904edda8d6407e98bc5e685ff24f15975cf0415117b19ed989052c169aca811f`.

Fresh reverse-DB dependency checks at `TEMP/nitro-native-publication-source-checks-erltf3mb` passed25/25 typechecks and format0 with unchanged inputs. Lint1 is the explicit rethrow inside the executor's outer finally. Existing warning-only shadowing/caught-error diagnostics do not justify unrelated edits or suppression.

The independent runtime review found that the read evaluator passes the weak original clock directly into `requireAuthCredentialClock`, which assumes a validated clock wrapper. Invalid configured-clock samples can therefore pass internal skew comparisons. This is a source-established finding, not an executed runtime reproduction. Native/current-product execution and new tests are not authorized here; diagnostic reproduction/regression phases remain deferred rather than claimed complete.

## Two exact cuts

1. Construct the evaluator's local configuration through the already imported `captureNativeCredentialPolicyConfiguration`, with the identical maximumSnapshotRows, allowed skew and dereferenced original clock. Continue retaining only that weak original function. Every internal configured-clock sample then uses the existing validating wrapper; the read catches invalid samples as clock-invalid while preserving native facts. Do not substitute a fresh clock, expand deadlines, retain the local wrapper or change original operation/invocation identity.
2. Extract the existing executor-finalization block into one onboarding-only local function within the runtime owner. The outer finally invokes that function. It performs the identical leave call, caught failure observation and original-error rethrow, then the identical native scalar-copy/dispose/settled updates in its own finally. There is no direct throw/return inside the outer finally, no unsafe-finally suppression, and no change to the intentional outward precedence if leave itself throws. Native observation settlement still completes before the execution promise settles. This helper is never stored in the publication record or detached reader, exported or shared with other mutations.

No new file/helper framework, casts, comments, tests, dependency, gate/SQL change, deadline recapture, error aggregation change or owner-accounting shortcut is needed. If the extraction cannot preserve exact native failure/leave/settlement order, stop for review rather than alter it.

## Gates

Independent plan approval precedes the sole-file writer. Capture fresh before/after/diff/pins; then repeat affected source checks and independently review both cuts. Auth wire A remains held until actual runtime-source acceptance and fresh lint/type gates. The historical native artifact/index preparation is disjoint and cannot validate this changed source.
