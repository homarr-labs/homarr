# 87: Speedtests and llama.cpp

**What to build:** Persist performance/history and model telemetry display choices and render correct units/dates/charts with truthful source availability and clean lifecycles.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

- [ ] All 11 options convert/save/reload under placement/type/compatibility checks; latest/stats/recent/ping graph and model/context/cache/speed/request/token/speculative controls retain supported compact/advanced meaning.
- [ ] Native times/latencies/rates keep their source units, null latest/history/optional slots and model not-ready states remain visible, and native speedtest rates are not confused with Stats projection conversions.
- [ ] Use-before-secret, one llama.cpp integration and safe serializable DTOs preserve empty/partial/source/forbidden outcomes; browser charts never import native clients or expose model-control capabilities.
- [ ] Speedtest no-root-poll versus llama.cpp 5s refresh uses exact keys/manual recovery/demo policy; hydration/focus/unmount avoids duplicate history or polling and clears revoked/session data. Future focused units/null/not-ready, option conversion and query/lifecycle evidence runs at scoped target gates.

## Coverage

`speedtestTracker` (4): `showLatestResult`, `showStats`, `showRecentResults`, `showPingGraph`; `llamacpp` (7): `showModelInfo`, `showContextUsage`, `showCacheHitRate`, `showSpeedStats`, `showRequests`, `showTokenStats`, `showSpeculative`. Input consumed `switch`. Primary `widget.speedtestTracker.getDashboard`, `widget.llamacpp.getStats`. Families `speedtestTracker`, `llamacpp`, each also `mock`; llama.cpp single integration. Native providers/Stats stay #60. Exact [performance evidence](../drafts/widgets.md#widget-performance--speedtest-history-and-llamacpp-telemetry).

Common standard: [PUBLISHING](../PUBLISHING.md), [widget common obligations](../drafts/widgets.md#common-completion-obligations-inherited-by-every-ticket), [DESIGN](../DESIGN.md); defaults/refinements/current saved-preview read policy and stale/retry/client separation apply.

## Required contracts

Initially unaccepted: #60 history/telemetry/native units; #40 execution; #04 view/use/preview; #67 actual query/status/error/host; #68 options; #03 cache; #07 time/units; #120 DTO/error contributions. Later real performance/model/saved-widget evidence is not an all-provider start barrier.

## Decision holds

Q11/Q12 saved options/conversion, Q13 affected saves; SSR/chart loading, source-unit and freshness/demo policies need accepted revisions; Q15 affects session data clearing only.

## Ownership

#87 owns two read adapters/renderers/charts, #60 native/Stats results, #68 common options/#29 placement. COMPOSITION exclusively mounts shared roots/registrations/exports/build; allocate local files before dispatch.
