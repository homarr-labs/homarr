# Frozen log sprint delivery

One unmounted source subscription body; no accepted ticket, production binding, public stream, SQL execution or central-count increment. Central accepted 91/334 is unchanged. Previous section delivery remains frozen and was not edited.

## Exact leaf inventory

| Identity        | Legacy source                          | Kind/access/demo                           | Body                                                                                             | Binding status                                                                                                         |
| --------------- | -------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `log.subscribe` | `packages/api/src/router/log.ts:19–83` | Subscription / `other-view-logs` / guarded | `createLogProcedures` plus `createLogSubscriptionIterator`, using actual Core `LogHistoryStream` | Held for actual per-request authority/history/logger lease, physical backing settlement and private transport delivery |

There are no other legacy log leaves. `logImplementedPaths` records the prepared body, not acceptance; `logPendingPaths` tracks absent bodies only. Every binding listed below remains candidate and unmounted.

## Source comparison

- Exact schema uses the source `z.object({ levels: z.array(zodEnumFromArray(logLevels)).default(["info"]) })`, including source error/warn/info/debug enumeration, optional defaulted levels field, allowed empty/duplicate selections, unknown-key stripping and required outer object. No output schema, REST/MCP metadata, replay cursor, extra log query, timer or polling endpoint is invented.
- Existing authenticated procedure applies `other-view-logs` before acquiring resources. Guarded demo behavior does not reject subscriptions; the source read-only demo guard rejects mutations only. Current principal comes from BackendContext, is checked against the acquired lease ID, and has no caller-selected/default fallback.
- Actual legacy `loggingChannel` was read but is not imported or called. Core public runtime/backing/stream and sample modules were inspected read-only. The existing primitive is named `LogHistoryStream`, not `LogHistoryRuntime`; the native handler constructs that real class over tracked operations on the concrete existing `LogHistoryBacking` interface. No controller-result/getLogs callback replaces its body.
- Listener acquisition completes before the snapshot read. The original diagnostic literal `A tRPC client has connected to the logging procedure` runs after listener establishment and before history access, through the injected per-request logger. No ambient `createLogger` or Redis import is evaluated. The producer must bind the diagnostic logger to source module `logRouter`, formatting and real append/drain behavior; this is not implemented here.
- Payload is the actual Core discriminated union `{ type: "history", messages: LoggerMessage[] } | { type: "message", message: LoggerMessage }`. UUID strings, Date timestamps, formatted message strings and level fields pass through untouched. No timestamp sorting, reformatting, synthetic UUID, sanitization policy or numeric conversion is added.
- Core retains the source 5,000-entry newest-first backing snapshot, invalid-message omission, level filtering, oldest-first emitted history and non-cancellation history-failure-to-empty fallback. Its installed listener buffers racing live messages before emitting history, then removes snapshot/live overlap by UUID and preserves live append order.
- Reusing accepted Core intentionally retains its bounded replay/live queues, 5,000-ID rolling retention, duplicate-ID suppression and overflow closure via `LogBackpressureError`. Legacy observable itself had an unbounded initial buffer and only deduplicated snapshot/buffer overlap. These inherited Core guardrails are not silently described as identical behavior for malformed duplicate-ID history or indefinitely slow consumers. No new replay algorithm or extra queue bound is fabricated by this port.

## Iterator and cleanup body

Pinned installed oRPC exports `AsyncIteratorClass`, which is a native async iterator/async generator with awaited cleanup for next/error/return/throw/async-dispose. Its actual implementation was inspected: return/dispose runs cleanup even while next is waiting, unlike relying on an async generator's suspended finally alone. Handler starts initialization without waiting for the consumer's first pull; listener-before-snapshot and initial history cannot be lost because no waiter exists yet.

The bridge holds one runtime delivery, with no unbounded extra event queue. Core `observer.nextAsync` waits for the iterator to resume after its yielded event, or for closure. The `resumed` promise means iterator pull progression, **not successful physical socket write or an asynchronous unsubscribe**. The preexisting Core queues provide backpressure and overflow semantics. Pending bridge and yielded references are cleared on closure; waiter notification has no missed-notification gap.

Actual request signal, optional native procedure signal, disposal controller and real authorizer revocation close the subscription. Core rechecks authority before enqueue delivery; the bridge rechecks the same `other-view-logs` authority immediately before handing a waiting event to the iterator, then checks cancellation after the await. This prevents a stale pending bridge event from bypassing the Core pre-delivery check. No additional grant policy, publication decision, replay cursor or invented revocation timer is supplied. Async iteration failures use the existing backend error adapter, not only the initial procedure catch.

Cleanup is memoized and awaited by native iterator cleanup and BackendContext disposal. It aborts and clears delivery, invokes the genuine synchronous Core disposer, waits for initialization, drains tracked backing/authorizer/observer promises and finally awaits the acquired lease's real `releaseAsync`. Acquiring a lease after abort cannot start a stream and is still released. A real backing listener acquired after cancellation is synchronously released inside the tracked acquisition before that operation settles; the returned idempotent release also protects the Core late-acquisition path. There is no invented resolved promise purporting to represent unsubscribe settlement.

## Required real binding and missing settlement contract

`LogProcedureResources.acquireAsync` must produce an operation-owned, current authenticated lease tied to the same BackendContext principal, database admission and installation. The source-shaped logger is a per-request resource, not permission to import/narrow the legacy global. Required producer obligations:

1. Bind `LogAuthorizer.revoked` and `requirePermissionAsync` to real current authority, expiry/revocation and `other-view-logs`, with source errors and accepted currentness policy. Acquisition failure must not retain resources; late success must remain releasable. The ID comparison and repeated permission checks are consumer fences, not implemented identity verification.
2. Provide actual `LogHistoryBacking` atomic append/trim and ordered publish, consistent retained snapshots, both-engine physical persistence and cancellable reads/acquisition. No generic KV substitution, memory production fixture, Redis tunnel, history SQL implementation or backing migration is introduced.
3. `releaseAsync` must join actual physical listener deregistration, underlying operations and diagnostic logger append/fanout writes, and release the tracked persistence/authority admission only after those settle. Existing Core `LogSubscription` exposes only synchronous `dispose()` and `readyAsync`; readiness means initialization queued, not lifecycle settlement. Existing backing release is also synchronous. This delivery tracks their observable promises but **cannot prove physical release/write completion** without the genuine producer's owned join. No accepted producer or runtime settlement handle exists in this delivery; the added lease join is a candidate contract, not implemented infrastructure.
4. The real oRPC host must keep request resources/admission alive through stream closure; honor cancellation/currentness immediately before private byte writes; clear queued private output on authority loss; and join outstanding transport writes during disposal/shutdown. AsyncIterator `next`/`resumed` does not acknowledge socket bytes or clear a browser terminal. Already delivered bytes are not revocable. Framing, byte bounds, shutdown deadlines and terminal/reconnect behavior remain external holds.

No complete subscription-runtime, permission-readiness, physical-SQL/fanout/restart or public delivery claim is made. Sample stores/windows remain unchanged and are not given the log permission or mounted by this factory.

## Exact files written and verification

- `packages/api/src/nitro/routers/log.ts`
- `packages/api/src/nitro/routers/-logs/resources.ts`
- `packages/api/src/nitro/routers/-logs/helpers.ts`
- `.scratch/nitro-full-migration/implementation/sprint-log.md`

Three code files. Declared/installed dependency and public-port inspection confirms `@orpc/server` 2.0.0-beta.43, Zod 4.4.3, the existing Core runtime/constants exports and validation enum entrypoint. Installed oRPC handler signal, async iterator types and actual cleanup implementation were consulted. Source comparison only: no lint/typecheck/build/test/format/install command, new test, Git/network/provider/SQL/environment/credential/current-data action, nested agent, actual listener, browser or container activity.

Shared API context/procedure/errors/map/index/barrels/manifests/lock, all other routers, legacy source, Core logs/history/sample runtime, DB/state/scheduler/host and Stage G remain unmodified. Factory is unmounted; no static/runtime validation or acceptance was asserted. Freeze on return.
