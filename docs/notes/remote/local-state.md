# Local worker state

The worker can run without a Redis service or Unix/TCP Redis connection. Its entrypoint selects `HOMARR_STATE_BACKEND=memory` before importing the backend. `HOMARR_STATE_BACKEND=redis` retains the Redis transport for installations with multiple cooperating processes. The existing backend defaults to Redis. `WORKER_STATE_BACKEND` is an accepted fallback when the primary variable is unset.

## Ownership and limits

`packages/core/src/infrastructure/redis/state.ts` defines the finite state operations Homarr uses. `MemoryStateStore` owns local values, list histories, hash evidence, cache generations, leases, counters, and subscriptions. `MemoryStateClient` adapts those operations to existing channels; `RedisStateClient` implements the same operations with Redis commands and named Lua scripts. Arbitrary Redis commands and Lua evaluation are absent from the shared client contract.

The process shares one local store. Its default retained-state budget is 16 MiB, configurable with `HOMARR_STATE_MAX_BYTES`. Accounting includes UTF-16 key/value payloads and conservative entry/map/list/subscriber overhead. This is an accounted cache budget, not an exact JavaScript heap or process RSS limit. Existing channel generation memoization has separate fixed limits of 1,000 entries; pending invalidation maps are also bounded. Application libraries and request/response buffers have their own memory usage.

Ordinary cache entries use LRU eviction. Lists retain their newest entries and cap an individual history at one quarter of the shared budget. Live locks, rate counters, concurrency leases, and generation fences cannot be evicted by cache pressure. If protected state exhausts the budget, additional operations fail; the store does not silently grant extra capacity or forget an active owner. Expiration is checked during access and capacity pressure, with no per-entry or interval timer.

Subscriptions count toward the same accounted budget and have a hard maximum of 4,096. Unsubscribe immediately removes the callback and its accounting. Local pub/sub has no retained message queue. An asynchronous subscriber can have one delivery in progress; later publications are dropped while it is busy. The encrypted streaming protocol must provide its own stream flow control and cancellation. Requesting the latest channel value remains available separately.

## Atomicity and invalidation

Local mutations complete synchronously in one JavaScript turn. Token-fenced lease release, renewal, expiring writes, and persistent writes reject expired or superseded owners. Generation advancement and session-secret deletion form one operation; integration response-only invalidation preserves the session intentionally. Local generation values use a process-wide monotonic sequence. Cache generations and active locks survive ordinary cache eviction.

Custom Widget preview revision compare-and-swap, fixed-window request counters, and concurrency slot acquisition are named state operations. All former feature-owned Lua scripts were moved into the Redis adapter and have corresponding local implementations. A short concurrency lease cannot shorten a different owner's longer lease.

The cache is intentionally cold on restart. Database-owned dashboards, users, integrations, grants, and other persistent records remain in the database. Cached integration sessions may need to authenticate again. Logs, preview sessions, live histories, and other ephemeral state are lost. Local state supports one worker process per database. Independent processes do not share local cache entries or locks; deployments requiring that coordination must select Redis.

## Validation completed

All commands used the pinned Bun 1.4.2 toolchain through `mise exec --`.

- `bun x vitest run packages/core/src/infrastructure/redis/memory-store.spec.ts packages/redis/src/lib/local-state.spec.ts packages/redis/src/lib/channel.spec.ts --project dom`: 19 tests passed.
- `bun x tsc --noEmit -p packages/core/tsconfig.json` and the corresponding Redis package typecheck passed.
- A direct Bun runtime smoke exercised real channels, 100 competing lease acquisitions, generation invalidation, and removal of a cached credential. It selected `MemoryStateClient`, retained one lease owner, and used 666 accounted bytes for the two remaining entries.
- A `strace -f -e trace=connect` run around a Bun process using real get/set, locks, persistent pub/sub, and unsubscribe recorded **zero `connect()` syscalls**. Trace: `/tmp/homarr-local-state-connect.log`.
- A separate temporary Redis fixture on a private Unix socket passed adapter parity checks for token ownership, generation plus secret deletion, fixed-window rate counters, mixed-duration concurrency leases, preview revision races, bounded history/evidence, and pub/sub cleanup. No Redis fixture is required by the worker. The fixture was terminated and its socket directory removed. Reproducer: `/tmp/homarr-state-redis-parity.mts`.

The focused tests cover expiration, strict unsupported-operation rejection, LRU bounds, oversized values, history retention, protected-state exhaustion, 100-way lease races, stale-owner writes, revision races, rate-counter pressure, concurrency expiry, subscription limits, deferred replay after unsubscribe, slow subscribers, and the actual integration request-cache refresh/invalidation path.

Container-level idle/busy RSS and complete worker acceptance are separate measurements; these local-state checks do not establish those numbers.
