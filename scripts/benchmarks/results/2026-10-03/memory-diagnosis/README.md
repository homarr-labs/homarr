# Memory investigation and Turbo cache controls

The original Node/pnpm versus Bun production measurements remain unchanged. Diagnostic profile images add a heap preloader and a forced GC; their RSS includes profiler overhead and must not be compared as production performance. Runtime configuration controls modify one immutable Bun parent image, run the same 20-page/7-search/routes/WebSocket workload, and settle for 120 seconds. Each control has one container and is ineligible for the original three-container/ten-minute performance comparison. No diagnostic JSC option is shipped.

`no-preload` disables eager Next route loading; `serial-jit` disables concurrent JIT; `no-jit` disables JIT. All functional workloads pass. Only disabling JIT materially reduces RAM, while increasing CPU and request latency. This does not meet the migration acceptance bar. Full Bun runtime migration is abandoned.

`turbo-cache/` contains real before/after Turbo input hashes and cold/warm/delete-restore compiled build results. The reproducible harness is `scripts/benchmarks/turbo-cache.py`; failed exploratory artifact assumptions are excluded from timing summaries. Dedicated Turbo fixes will be proposed separately from dev.
