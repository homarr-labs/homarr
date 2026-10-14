# Convergence JS2 — required current-admin jobs reads and status delivery

## Frozen source scope

- `packages/api/src/nitro/routers/-cron-jobs/resources.ts`: required `assertCurrentAdminAsync(context: BackendContext): Promise<void>`. No default, optional callback, frozen-permissions substitute or new Auth reader.
- `packages/api/src/nitro/routers/cron-jobs.ts`: only the `getJobs` handler changed. Check the request signal and await current-admin authorization before and after the actual `jobs.getAllAsync()` read, checking the signal after each await. Return the original result. All six controls, source paths, procedure policies and subscription handler remain unchanged.
- `packages/api/src/nitro/routers/-cron-jobs/helpers.ts`: retain the existing iterator, one pending-record handshake and status subscription owner; add admission, registration-completion, wake/wait and individual-record authorization fences.

The initial signal/admin/signal guard completes before creating the registration deferred, registering disposal or calling `status.subscribeAsync`. Initial refusal therefore leaves no subscription, snapshot read or unresolved registration promise. A genuinely unstarted registration resolves to `undefined`; this denotes no acquisition, not a fabricated unsubscribe resource. Deferred subscription invocation settles synchronous invocation failures through the same registration rejection path and skips acquisition if already retired.

The producer checks signal/current admin before admitting each record and rechecks state/signal after its guard. The iterator captures the pending handshake, awaits its own current-admin guard, then rechecks stream state, signal and exact pending identity before releasing that handshake and returning the original four-field `RuntimeTaskStatus` DTO. Wake waits are followed by current-admin authorization and post-await state/signal checks. Consumption waits also recheck terminal state/signal. No captured record can be returned after concurrent disposal replaces/releases it.

## Retirement and failures

Refusal marks the original stream failed, releases the pending consumed handshake and wakes waiters synchronously. Disposal marks an open stream closed, removes the abort listener and performs the same release/wake **before** awaiting registration or unsubscribe. Disposal is memoized and remains registered with the request owner.

Producer and status-error callbacks start disposal without awaiting it. They never await an unsubscribe that can itself be waiting for the currently executing producer callback. Iterator/startup failures await the existing disposal after releasing backpressure. Cleanup failures are retained alongside primary failures, reported through the existing context error hook when present and propagated by the memoized disposal promise. Reporting failures are also retained. The old silent cleanup catches are removed.

The existing status runtime still owns subscription registration, durable reconnect snapshots, revision ordering, serial callbacks and coalescing. There is no new listener/fanout owner, polling, synthetic status, scheduler activation, job replay or replacement service.

## Mandatory mount prerequisites — still held

1. **AH must supply the actual required callback**, bound to the genuine request/session/grant association. Admission middleware and `BackendPrincipal.user.permissions` snapshots do not establish current admin authority. This lane does not implement that callback.
2. **AH must supply actual expiry, revocation and request-retirement cancellation through `BackendContext.signal`.** Quiet streams cannot rely on a later record or `next()` call for retirement. This signal requirement is mandatory even though the existing context type already contains a signal; no timer, polling or fake permanently-live signal was added here.
3. Mount only the deliberately selected `cronJobs.getJobs` and `cronJobs.subscribeToStatusUpdates` leaves after their genuine same-listener request-to-stream lifetime is joined. The six unchanged controls retain their separate current-commit/effect authority holds.
4. Jobs and SSE must receive the same initialized durable status consumer and real jobs owner. Retire requests/streams and await unsubscribe while that owner/backing remains live; drain actual jobs before disposing status and SQL.

No `createCronJobsProcedures` resource-construction caller was found outside its definition in the searched ordinary source, including `apps/backend` and `test`. **Every existing or subsequently landed resource-construction call outside the three allocated source files must explicitly provide the new required callback.** Future Backend jobs/resource/contribution composition remains coordinator/AH work; do not weaken the contract or add a no-op to make such a caller compile. This tranche neither edits those paths nor creates/mounts a jobs composition.

## Verification boundary

Only the three allocated source files and this new report were written. No commands, lint/typecheck, tests, builds, runtime/native/SQL execution, installs, credentials, real providers, external calls, branch/staging/commit operations or nested agents were used. Existing package manifests were read; no dependency or export changes were needed. Coordinator owns focused validation after writer freeze. No compiler, runtime, procedure acceptance or authenticated subscription activation is claimed.
