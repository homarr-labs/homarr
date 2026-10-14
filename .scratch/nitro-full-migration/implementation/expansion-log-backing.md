# EXPANSION35 — log/sample SQL consumer freeze

Source-only implementation is frozen for sequential composition and review. No mounting, native SQL proof, #19 closure, private authority acceptance or sink acknowledgement is claimed.

## Exclusive files

- `packages/core/src/infrastructure/logs/runtime/nitro-backing/contracts.ts`
- `packages/core/src/infrastructure/logs/runtime/nitro-backing/queue.ts`
- `packages/core/src/infrastructure/logs/runtime/nitro-backing/index.ts`
- `packages/core/src/infrastructure/logs/runtime/nitro-backing/consumers.ts`
- This handoff.

Existing Core logger/runtime files, DB/history implementation, migrations, manifests, exports, API/host and peer scopes were not modified. The active DB history peer's source was neither read nor imported. No SQL, provider/live environment access, check/format/install commands, tests, network listeners, Git operations or nested agents were used.

## Frozen structural join

`createNitroHistoryBacking({ store, lifetime, limits, samples })` requires an explicitly injected `HistorySqlStore`. There is no fallback, no in-memory history implementation, no ambient client and no Core→DB dependency. Memory contains only registered stream metadata, bounded pending operations, current sequence observations and live listener registrations; SQL is the sole retained-history source.

The local store shape mirrors SQL-BACKING-PLAN §5 and the frozen G3 bounded-operation metadata:

```ts
interface HistorySqlOperation {
  readonly signal: AbortSignal;
  readonly lifetime: AbortSignal;
  readonly deadlineAt: number;
}
interface HistorySqlStream {
  readonly kind: "log" | "sample";
  readonly name: string;
}
interface HistorySqlStore {
  appendTrimAsync(
    stream: HistorySqlStream,
    payload: string,
    maxEntries: number,
    operation: HistorySqlOperation,
  ): Promise<{ sequence: string; payload: string }>;
  readNewestAsync(
    stream: HistorySqlStream,
    maxEntries: number,
    operation: HistorySqlOperation,
  ): Promise<readonly string[]>;
  clearAsync(
    stream: HistorySqlStream,
    operation: HistorySqlOperation,
  ): Promise<void>;
}
```

The actual DB owner must structurally join these three operations after its own freeze. Successful append resolution must mean actual native COMMIT and ownership cleanup have settled, not that a transaction callback finished. The store captures/checks the installed epoch, owns real SQL admission/checkout/locks/commit/rollback/release, and reports already-dispatched COMMIT ambiguity. The consumer does not manufacture those guarantees with its timer.

## Implemented behavior

- One resource owns one fixed log stream `(log, list:logging:history)` with 5,000 entries. Samples are explicit, unique, bounded constructor registrations, each with source retention 15 or 100. Dashdot's `integration:<id>:history:cpu` must be registered at 100; OPNsense's `integration:<id>:interfaces` at 15; other source-default samples at 15. An unregistered name fails rather than creating a stream or granting access.
- Exactly one serial queue per registered stream covers append, commit result validation, local ingress, reads, clear and explicit sample publication. All in-process log producers must share this resource; the host must not hand out a second physical log writer or independent log publisher. Local queue ownership is not distributed SQL exclusion.
- Log ingress is called only after successful `appendTrimAsync`, cancellation/deadline checks, exact payload equality and canonical positive int64 decimal sequence validation. Sequences are compared with bigint; no conversion to Number. A rejected/ambiguous SQL append invokes no log listener. Concurrent local appends cannot advance their publication ahead of an earlier queued append.
- SQL alone performs atomic append+trim and newest-first snapshot reads. Strings are forwarded unchanged: no SuperJSON parse/reserialize, timestamp ordering, TTL, list-in-JSON state CAS, last-value snapshot or fabricated data. Reads reject an oversized result rather than truncate it. The frozen domain still supplies invalid-log omission, ID overlap filtering and source oldest-first log history.
- Sample push only retains history; it never publishes. Sample publish only invokes current local raw-data listeners and never calls SQL. The frozen `publishAndPushAsync` still awaits raw SuperJSON publication before timestamped history push. A later failed sample push cannot retract the already intentional live publication; log commit-before-publish does not apply to that explicit source method.
- Clear only calls the store's namespace-local `clearAsync`. It does not reset the consumer's last observed sequence. The store must delete entries while preserving the header/head; header retention and no sequence reuse are physical proof obligations, not an adapter-side substitute.
- The unchanged `SampleHistoryStore` retains oldest-retained `getLastAsync`, inclusive/negative slices, cutoff excluding the oldest element, source dates/non-finite units, and the CPU/OPNsense source window behavior.

## Limits, cancellation and close

Every limit is mandatory, positive, safe-integer and constructor-snapshotted: `maxStreams`, `maxStreamNameBytes`, `maxPayloadBytes`, `maxSnapshotBytes`, `maxPendingOperations`, `maxPendingOperationsPerStream`, `maxQueuedBytes`, `maxQueuedBytesPerStream`, `maxListeners`, `maxListenersPerStream`, `operationTimeoutMs`. No operational policy default or source retention change is selected here. Timer duration must fit the native timeout range. Per-stream caps cannot exceed global caps; payload and snapshot reservations must fit per-stream bytes.

Payload/name caps use UTF-8 bytes with an allocation-free character-length precheck. Pending-operation and queued-byte accounting includes the active operation until its actual promise settles. Reads reserve the entire maximum snapshot budget before admission and validate every returned payload and total bytes. SQL decoding/allocation occurs in the injected store, so its own detached-row/native allocation bounds still need DB/#124 agreement; the adapter cannot retroactively cap driver allocation. Domain observer queues and physical transport buffers are also separate from these backing reservations.

The operation signal joins request/current-authority cancellation, backing lifetime and a request-local deadline controller. The absolute deadline starts at admission, not native dispatch; wall-clock and monotonic elapsed checks cover local queue wait. Queued cancellation removes the task, clears its timer/listener and rejects without SQL. Active cancellation remains tracked and awaited through actual store settlement; there is no Promise.race pretending to release native ownership. An active failure rejects the waiting stream tasks, rather than leaving them to replay after the failed operation.

Unexpected store/record/snapshot failure latches the whole resource `failed`, aborts its signal, releases listeners, rejects waiting tasks and refuses subsequent admission. There is no recovery timer, retry, reconnect replay buffer, automatic resource replacement or blind ambiguous-write replay. A clean cancellation reported as that operation's exact abort reason is not a new SQL-failure latch. Actual ambiguity/cleanup errors remain failures even with an aborted request.

Listener installation is synchronous inside `subscribeAsync`, before its promise settles and before the frozen log consumer performs its snapshot read. It has no external asynchronous acquisition to leak. Request/resource abort releases a listener even if the caller has not yet received its handle; a late returned release handle remains idempotent/nonthrowing. Publication snapshots current listeners, skips already removed/aborted ones and does not replay prior messages to new listeners. A throwing callback is detached and counted, without recursively logging private payloads or blocking other listeners.

`createNitroLogHistoryStream(backing)` returns the real frozen `LogHistoryStream` with the backing signal joined to producer append, direct reads and subscription lifetime. Inherited `recordAsync` uses that joined append. `bindNitroSampleHistoryResources(backing, resources)` supplies the actual sample backing and joins its lifetime with the supplied real authorizer's revocation signal, delegating the real access check with its original receiver. Use it with the frozen `SampleHistoryStore`/source factories. Neither helper invents authority, changes permissions or supplies a no-op sink. Without these helpers, a manually assembled consumer must perform the equivalent lifetime join itself.

`closeAsync()` returns the same memoized promise, closes admission, aborts backing work, releases current listeners and cancels queued operations. It settles only when active store calls have actually settled and pending accounting reaches zero. A latched failure remains visible and rejects the memoized close result; close does not erase it. The backing does not close the host-owned main persistence runtime. `status()` reports `ready | failed(reason) | closing | closed`, pending operations, reserved bytes, listener count and callback failure count; it is diagnostic state, not readiness/authority acceptance.

## Exact sequential proof and joins still required

1. Freeze/accept the actual DB history adapter and verify structural compatibility above. Prove both-engine atomic append+trim, per-header contention, epoch checks, no read-created header, newest-first append order, namespace-only clear preserving head, checked sequence overflow, ordinary restart retention and native statement/checkout/commit/rollback/release settlement. Do not consume the still-active peer source to infer acceptance.
2. Prove the real final COMMIT dispatch fence under queued checkout, row/SQLite contention, deadline and cancellation, including late acquisition without BEGIN, bounded SQLite busy handling, native cleanup failure and already-dispatched durability ambiguity. Caller deadline expiry is not proof of rolled-back storage. No retry without reconciliation.
3. Host/#124 must approve actual operational values and SQL decoding, domain queue, SSE framing and sink byte budgets. Sequential race checks must cover concurrent append publication order, listener-before-snapshot overlap/dedup, per-request queued removal, active cancellation, admission/UTF-8/snapshot overflow, failure discarding pending work, listener release before/after acquisition continuation, and identical close-promise identity/drain.
4. Bind actual current session/principal/resource authority and its accepted expiry/revocation signal. Logs still require `other-view-logs` before registration/read and every delivery, with direct post-read revalidation; samples still require the trusted integration/principal policy. Names and stored payloads never authorize private access. These checks are not replaced by registration or structural store injection.
5. Join the real formatted Winston ingress exactly once, using the shared log queue, and the actual Dashdot/OPNsense producer lifetimes/await ordering. No existing global logger, provider or producer was altered here.
6. The current private physical sink acknowledgement/drain remains a JOIN HOLD. Frozen synchronous disposal aborts delivery but does not expose an awaited native write-settlement receipt. The host must cancel pending private output and await actual `nextAsync`/physical sink settlement before maintenance, along with this backing's close, provider/job finalization and DB drain. Neither synchronous ingress nor a callback's return is physical ACK; no no-op authority/drain is supplied.
7. Direct Nitro/oRPC SSE mounting, reconnect/framing, xterm terminal clearing on revocation, permissions/session loss, byte caps, actual written-byte boundaries and end-to-end source parity remain host/protocol/frontend work. Demonstrate the exact history/message union and sample raw-data protocol using the real sink, not a synthetic observer. Already written bytes cannot be revoked.
8. Full restore must fence producers/consumers, drain all real work, reset/rebind the epoch through the accepted maintenance phase and rebuild the resource before reopening. Export exclusion/private runtime data handling remains separately owned. This adapter performs neither reset nor archive authority adoption.

A crash after committed append and before local publication leaves retained history without live-delivery assurance. A successfully committed append may also be withheld after request cancellation. Partial local delivery after a callback-triggered cancellation is not retractable. There is no cross-process fanout/outbox, exactly-once delivery, crash replay, total distributed live order or mounting claim.

## Dependency and validation evidence

Read the frozen backing/stream/sample implementations, source log constants/Redis transport, legacy Redis history methods, SQL-BACKING-PLAN §§5–6 and frozen G3 operation metadata. Read Core's manifest and TypeScript configuration, searched Common for existing queue/drain helpers, and verified Node Buffer/timer APIs against the installed declaration documentation. New runtime imports are local frozen modules plus `node:buffer`; inherited serialization remains the already-declared SuperJSON/Zod code. No new library, export, manifest or installation is necessary for source preparation.

Only source review was performed in this wave. Lint/typecheck/native/browser/race/restart evidence is deliberately unrun under the EXPANSION35 prohibition; coordinator validation and independent review must follow freeze. This handoff is not acceptance evidence or a completion/count/mount claim.
