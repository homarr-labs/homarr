# D4 — exact reader-result typing repair plan

**Report only: minimal one-file type cut, not SOURCE ACCEPT, a writer lease or runtime grant.** D4 remains frozen at `nitro-onboarding-wire-publication-source-563fe920d3b5bccc86c999ed`. Both source reviews are active; reconcile their findings and obtain plan approval before authoring. A real stream race must not be hidden by this typing correction.

## Actual signature / diagnostic

Coordinator `nitro-onboarding-wire-publication-checks-gsu3dsx8/records/{apps-backend,apps-nitro}.stdout` reports the same TS2345 at `application.ts:879`: `underlying.then(read.resolve, read.reject)` cannot forward the actual default-reader result into the old generic result resolver. Supplied statuses are Contracts 0, Backend/Nitro 1, lint/format 0 and conserved source; none establishes repaired PASS.

Frozen Application `1-after:722–732` declares a real `ReadableStreamDefaultReader<Uint8Array>`, acquired from the actual wire body. The deferred result at `873` and pending slot at `732` instead name `ReadableStreamReadResult<Uint8Array>`.

Installed `bun-types` 1.3.10 public declarations establish the relevant signature: `globals.d.ts:740–741` declares `read(): Promise<Bun.ReadableStreamDefaultReadResult<R>>`; `bun.d.ts:25–27` defines its value/done union; `globals.d.ts:760–768` gives done `value?: undefined` and non-done required `value: T`. Backend configuration includes both DOM libraries and Bun types. The actual compiler diagnostic confirms this default-result shape at the merged call site; the chosen generic done branch requires `value`, which is the mismatch—not a runtime EOF defect.

## Exact prospective cut

Only `apps/backend/src/server/application.ts`, inside `retainOnboardingResponse`, after actual reader acquisition:

```ts
type OnboardingReadResult = Awaited<ReturnType<typeof reader.read>>;
let pendingRead: Promise<OnboardingReadResult> | undefined;
```

Use that same local alias for the existing pull's `Promise.withResolvers<OnboardingReadResult>()`. These are the **two** affected annotations (`732`, `873` in the frozen image), derived from this actual reader method rather than a copied generic stream shape. No runtime expression is evaluated by the type query.

Leave actual `reader.read()` forwarding, task publication before invocation, rejection observation and pending-slot clearing before termination joins unchanged. The existing done branch still finishes/returns before accessing a chunk; the non-done branch still has the native byte/currentness/cache checks. Do not manufacture an EOF value, normalize runtime results, change discriminants or introduce casts/non-null assertions/suppressions.

The legacy retention slot at `1268` already uses `ReturnType<typeof reader.read>` and needs no repair. No global stream declaration, public contract/field, reader acquisition, cancellation, EOF/clock/terminal ownership, source result, helper file or dependency changes are proposed.

After both reviews reconcile and an explicit source lease is granted, capture a new one-file generation and let coordinator checks target those bytes. Socket/entry proof, E/F, native/FS fixtures, activation and completeSetup remain held; prior source generations/counts stay unchanged.

Only read-only source/declaration/diagnostic discovery and this NEW plan patch occurred. No product edit, command/hash/stat/check/evaluation/import/test, SQL/native/Engine, network/private configuration/data or nested agent action. No comments/tests/any/casts/new helper or runtime permission is added by this plan.
