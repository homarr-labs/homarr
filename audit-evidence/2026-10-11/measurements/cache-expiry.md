# Custom Widget response-cache expiry measurement

`cache-expiry.mts` exercises the real `executeCustomWidgetRequest` implementation against a synthetic HTTP server bound to `127.0.0.1`. The transport, body parsing, response limits, cache, TTL checks, invalidation, and eviction are production code; only the upstream responses are synthetic. The request uses the explicitly supported `loopback` network scope. It does not replace or mock the response cache.

Do not run while the serialized memory analyzer is active. The repo pins Node 24.18.0 in `mise.toml`; for each isolated baseline/after run, start a fresh process with explicit GC enabled:

```sh
mise exec -- node --max-old-space-size=512 --expose-gc --import tsx audit-evidence/2026-10-11/measurements/cache-expiry.mts
```

Defaults measure 1, 25, and 100 entries in sequence. Each response contains the same 256 KiB JSON string, below the executor's 1 MiB limit; TTL is 5 seconds and the idle margin is 100 ms. Every cardinality has an empty-before-fill sample, a sample after fill plus cache-hit verification, a sample after TTL plus idle with no intervening cache request, and a sample after explicit invalidation. Each sample yields the event loop, forces GC, and records RSS, heap used, external memory, and ArrayBuffers. Caller references are not retained across samples.

Use `CACHE_EXPIRY_ENTRY_COUNTS`, `CACHE_EXPIRY_RESPONSE_BYTES`, `CACHE_EXPIRY_TTL_SECONDS`, and `CACHE_EXPIRY_IDLE_MS` only when holding the same values across every paired run. The first JSON line records source path and SHA-256, Node version and arguments, process usage, and `/proc/self/limits`. `CACHE_EXPIRY_EXECUTOR_SOURCE` selects another executor source snapshot; esbuild loads that source while resolving its relative imports from the actual `request-executor.ts` directory. This supports alternating fresh-process before/after pairs without changing the production source between conditions.

The harness also checks refetch after expiry, refreshed hits, and stale in-flight generation invalidation. To separately exercise the existing 1,000-entry bound (about 1,001 additional local requests), pass `--check-eviction`. It verifies the oldest key refetches after insertion beyond capacity. This mode is optional and should not be included in the memory samples unless it is included identically in both paired conditions.

The nine alternating before/after pairs, source hashes, raw JSONL, capacity checks, and measurement findings are recorded in `cache-expiry-results.md` and the adjacent `cache-expiry-*.jsonl` files.

If the paired measurements support retained expired entries, the smallest candidate is one unref'd timer tracking the earliest expiry: compare the new expiry to the scheduled deadline in O(1) on insertion, prune expired entries when it fires, then scan the bounded cache to schedule the next deadline in O(C), and clear the timer when invalidation or pruning empties the cache. This avoids per-entry timers and preserves the existing cache cap, invalidation epoch, in-flight behavior, and eviction path. The tradeoff is a bounded O(C) callback scan and timer wakeup CPU per expiry batch; expiry cleanup becomes prompt while idle, while event-loop work is added at expiry boundaries. Validate that invalidation, replacement, and capacity eviction keep the scheduled deadline aligned with the cache.
