# Acceleration SQL history — source freeze

2026-10-11. Implemented the released SQL-history allocation from `ACCELERATION-WAVE.md`, following `SQL-BACKING-PLAN.md` §§3–6 and the frozen G3/P1 contracts. **Source implementation is frozen for review; native contention and required final validation are outstanding. This is not production readiness or permission to mount.**

## Exclusive delta

- `packages/db/runtime-history.ts`
- `packages/db/runtime-history/types.ts`
- `packages/db/runtime-history/validation.ts`
- `packages/db/runtime-history/statements.ts`
- `packages/db/runtime-history/sqlite.ts`
- `packages/db/runtime-history/postgresql.ts`
- This handoff only.

No existing source, manifest, export map, lock, schema, migration, runtime/gate/Core file or shared handoff was edited. No state/jobs/P2 implementation file was read or imported. The catalog and engine-specific schemas were read as frozen physical contracts. Epoch initialization is wholly state-owned; this constructor rejects the catalog sentinel and accepts only a supplied captured epoch. There is no ambient database, second pool/connection, sidecar, view, new table, initializer, outbox, pub/sub, listener, provider or global history mutex.

## Concrete consumption contract

`createRuntimeHistorySqlStore({ runtime, epoch, lifetime, streams, limits })` accepts the existing main `PersistenceRuntime`. Its returned structural interface is:

```ts
interface RuntimeHistorySqlStore {
  appendTrimAsync(
    stream: RuntimeHistoryStream,
    payload: string,
    maxEntries: number,
    operation: RuntimeHistoryOperation,
  ): Promise<RuntimeHistoryAppendResult>;
  readNewestAsync(
    stream: RuntimeHistoryStream,
    maxEntries: number,
    operation: RuntimeHistoryOperation,
  ): Promise<readonly string[]>;
  clearAsync(
    stream: RuntimeHistoryStream,
    operation: RuntimeHistoryOperation,
  ): Promise<void>;
}
```

`RuntimeHistoryStream` is `{ kind: "log" | "sample"; name: string }`; append returns `{ sequence: string; payload: string }`. Operation is `{ signal: AbortSignal; deadlineAt: number }`. The consumer must derive that finite host-wall deadline from an explicitly approved host duration because the existing Core `HistoryOperation` contains only a signal. No guessed default deadline or retention is installed.

Each immutable constructor registration supplies `{ kind, name, maxEntries }`. Append must match that retention exactly; reads accept an integer from zero through that retention. Both kind and name are part of every physical identity and the in-process registration map, so identical names in log/sample cannot collide. Unknown/duplicate registrations are refused. The host must register the actual source log identity `list:logging:history` with **5,000 entries**, Dashdot `integration:<id>:history:cpu` with **100**, and default/OPNsense sample names such as `integration:<id>:interfaces` with **15**, where applicable. These are entry bounds, not TTL or byte policies. There is no dynamic registration endpoint or competing source-name registry.

All six operational limits are mandatory: `maxStreams`, `maxIdentityBytes`, `maxPayloadBytes`, `maxPendingOperations`, `maxPendingBytes`, `maxOperationDurationMs`. Duration supports finite values from 1 through 2,147,483,647 ms, matching the reviewed gate's native timeout range; no value is selected here. Admission refuses overload immediately rather than retaining a queue or replay backlog. Reservations account for UTF-8 identity bytes plus append payload bytes or a read's worst-case `maxEntries * maxPayloadBytes`; clear reserves identity bytes. Arithmetic must remain safe. The host must size its pending-byte budget to cover the requested reads as well as concurrent appends. This is a serialized-byte reservation, not a claim to measure all JS/native heap overhead, and it does not replace the consumer publication queue's separately approved byte limits.

Reservations remain held until the awaited native bounded operation settles, including delayed pool checkout, rollback and release. Constructor lifetime and per-operation cancellation are passed to the resource gate; admission and every actual statement completion recheck lifetime, deadline and monotonic elapsed budget. Immediately before resource admission, the remaining monotonic budget tightens the absolute deadline, rather than resetting validation elapsed time or a full duration for each statement. Runtime maintenance/close cancellation, transaction-local remaining PG statement/lock timeouts, late checkout release, cleanup aggregation/quarantine and actual COMMIT dispatch remain owned by the unchanged reviewed gate.

## Native operations

### Append and clear

PostgreSQL uses one `runtime.boundedTransactionAsync` checkout. It awaits meta row 1 `FOR SHARE`, verifies the captured epoch, inserts the composite stream header with `ON CONFLICT (epoch, kind, name) DO NOTHING`, then awaits exactly that header `FOR UPDATE`. Cancellation/budget is checked after each lock/insert wait. A checked database clock observation follows acquired locks. No row-2 state mutex, advisory lock, shared connection mutation or independent pool BEGIN is used.

SQLite uses `runtime.boundedTransactionSync` with an entirely synchronous callback and only guarded `.all(SQL)`/`.run(SQL)` calls. The reviewed gate owns native `BEGIN IMMEDIATE`, temporarily scoped `busy_timeout = 0`, synchronous restoration and final native COMMIT/ROLLBACK. This lane does not duplicate that machinery or call async SQLite `.execute()`.

Append reads the locked head as SQL `CAST(... AS TEXT)`, decodes a canonical nonnegative decimal into bigint, rejects values outside signed-64-bit range and refuses overflow at 9,223,372,036,854,775,807. It advances the head, inserts the exact payload with a positive sequence, and deletes only entries below the minimum of that stream's indexed newest `LIMIT maxEntries` set. All effects share the same native transaction. Sequence bindings remain decimal strings cast natively to BIGINT/SQLite integer affinity; no JS-number sequence conversion is used. Returned sequence is canonical decimal text. Mutation result escapes only after successful resource-owned settlement.

Clear locks the same identity, validates its head and deletes only its entries; it never resets/deletes an existing header or reuses sequence numbers. Clear on a missing registered stream may create a zero head to serialize concurrent absent-stream append/clear. Clear remains valid at the maximum head, although a subsequent append then correctly fails overflow. SQL/decoding/clock/effect failures unwind the whole transaction.

### Newest reads

One SQL SELECT uses a materialized epoch/clock observation and an indexed `ORDER BY sequence DESC LIMIT bound` entry subquery. The epoch is returned even with no entries or a zero bound; a missing/retired meta row fails closed rather than becoming an empty successful history. Read validates positive canonical sequences and strictly descending order and returns detached payload strings. It never inserts a header, trims rows, refreshes retention or writes a snapshot/latest value. Oversize stored payloads are replaced by an internal SQL NULL projection and rejected during decoding; they are not silently omitted/truncated or transferred as an unbounded result payload.

Reads also use the reviewed bounded gate, not ordinary unbounded `withDatabaseAsync`. Consequently SQLite reads acquire the gate's immediate native writer reservation despite executing only one SELECT and no data writes. This conservative contention behavior must be exercised and reviewed; no weaker read/commit deadline port is invented. PostgreSQL reads use a single statement snapshot and do not take header locks or request READ ONLY alongside mutation locks.

Payloads are plain TEXT with no codec, JSON parse/stringify, timestamp sorting or normalization in DB. Exact UTF-8 text is accepted; raw NUL and unpaired UTF-16 surrogates are explicitly rejected, rather than silently changed or passed to PostgreSQL's unsupported text representation. Existing SuperJSON output remains opaque. Errors contain no supplied identities or payload contents.

## Consumer/host holds

- Package subpath export `@homarr/db/runtime-history` is **not added** because manifests are coordinator-owned. No new dependency is needed; coordinator must release the export before public-package consumption.
- Logs must keep the one bounded per-stream append/commit/publication queue and only publish after successful store append in that queue's order. This store supplies no publication or cross-process delivery. Sample live publication and legacy publish-before-push remain consumer-owned.
- Actual permission/revocation checks, host-approved operational caps, immutable registrations/lifecycle assembly and maintenance drain still need their independently owned joins. A stream string grants no access. Host logger configuration must not expose private bound payload parameters.
- Already-dispatched COMMIT/cleanup ambiguity propagates unchanged as the reviewed `TransactionCommitAmbiguousError`; there is no catch/retry, compensating replay or false rollback-success claim. Reconciliation is mandatory. PG checkout/native I/O can outlive a deadline while settlement is awaited; this does not claim hard realtime native interruption.
- Registration retention must agree across all consumers writing an identity. This source does not add a fifth table or store retention/policy in the physical header.

## API/dependency evidence and validation limits

Read `packages/db/package.json`, `driver.ts`, `runtime.ts`, `transaction-gate.ts`, runtime catalog/schema, source log constants/backing/sample store and installed Drizzle 0.45.2 package/source/declarations. Verified tagged SQL parameter chunks, Bun synchronous named `.all` versus raw array `.get`, `.run(...).changes`, and awaited PG `.execute(...).rows/.rowCount` against installed code. Only existing declared Drizzle and Node builtins are used. No `any`, TypeScript assertion/cast or code comments were introduced.

A single Context7 documentation resolution attempt returned **“Monthly quota reached.”** No retry/install/authentication/CLI workaround or external provider call followed; pinned installed API source was used instead. No lint, typecheck, format command, build, tests/new tests, runtime evaluation, live SQL, credentials/environment/data reads, listeners, containers, Git or nested agents were run. Only source reads/patches and a file-only SHA-256 command were used. Native SQLite/PG constraints, concurrent absent-header insertion, same/different-stream contention, cancel-before-COMMIT, overflow above JS-safe range, clear/restart monotonicity, retained bytes and stale-epoch snapshots remain **unvalidated** for this new lane. Required final checks and independent native behavioral/standards review are outstanding.

## Frozen source hashes

SHA-256, DB-relative paths:

| Path                            | Hash                                                               |
| ------------------------------- | ------------------------------------------------------------------ |
| `runtime-history.ts`            | `7865ac9b49d1a8f50ac894819ef13b39ca6b053e154b5ae2934bc077e74f197d` |
| `runtime-history/types.ts`      | `dd18feec37dcaa88b1a92a9a7aaa6700d57bd99baded8bd2ebdc675093e0a158` |
| `runtime-history/validation.ts` | `5dadd800fbce440984d082b2643705a74fe01b8d19e2e3ad520de7751bef93ec` |
| `runtime-history/statements.ts` | `d137cd644b00cde2312222203fa698ea944ade391de6384347f54bcc23de012b` |
| `runtime-history/sqlite.ts`     | `8afc7c3277953d1bfac994ba7dd2246989b7af18f3840399819a74b97107d017` |
| `runtime-history/postgresql.ts` | `a860ae4fc4c061d46f23418ae8a69f810a1c7eb9ee4d1f2ebefdc0f1d19be42c` |

The same file-only hash command reproduced the recorded frozen G3 runtime (`07d93bba…`) and gate (`745d2f5e…`) and P1 catalog (`7fb9b289…`), SQLite runtime schema (`6a771a2a…`) and PostgreSQL runtime schema (`c855bfff…`). This is a targeted read-only anchor comparison, not a whole-checkout or concurrent-worker change claim.
