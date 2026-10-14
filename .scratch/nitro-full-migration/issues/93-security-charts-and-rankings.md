# 93: Security charts and rankings

**What to build:** Save Wazuh timeline/ranking/vulnerability analyses and render exact protected ranges/buckets/severity/limits with meaningful units, chart states and cleanup.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

- [ ] All 16 options validate/convert/save/reload with placement/type/one-compatible-integration checks; range/interval/chart/log-linear scale/level/legend, top kind/limit/bars and CVE order/severity/limits/agent visibility produce meaningful exact results.
- [ ] Missing query ownership has an explicit approved disposition using actual procedure and range/filter/bucket/severity keys, not kind-prefix paths; changed ranges and two same-kind analyses cannot reuse or clear unrelated protected series.
- [ ] Timeline polls 60s for 1h/24h and 300s for 7d/30d, top list 120s and vulnerabilities 300s; backend 60/120/300s cache scopes remain separate from browser polling and demo overrides receive explicit reconciliation.
- [ ] API/indexer/use-before-secret policy and unavailable/null/empty/source-error `WazuhResult` states stay honest; forbidden/session changes clear series, ordinary stale recovery remains bounded and approved hydration/client chart loading/cancellation/focus cleanup avoids duplicate queries. Future focused range/bucket units, query-gap disposition, indexer/denial and saved conversion evidence runs at scoped target gates.

## Coverage

`wazuhTimeline` (6): `range`, `interval`, `chartType`, `yScale`, `minLevel`, `showLegend`; `wazuhTopList` (5): `kind`, `range`, `limit`, `minLevel`, `showBars`; `wazuhVulnerabilities` (5): `cveOrder`, `minSeverity`, `cveLimit`, `agentLimit`, `showAgents`. Inputs consumed `select`, `switch`, `number`. Primary `widget.wazuh.getTimeline/getTopList/getVulnerabilities`. Families `wazuh`, `mock`, one integration each; #66 native dual-origin queries. Exact [analytics evidence](../drafts/widgets.md#widget-wazuh-analytics--timeline-ranked-threats-and-vulnerabilities).

Common standard: [PUBLISHING](../PUBLISHING.md), [widget common obligations](../drafts/widgets.md#common-completion-obligations-inherited-by-every-ticket) under [DESIGN](../DESIGN.md); defaults/refinements/nullish preservation, current saved/undefined-preview authority and browser/server isolation apply.

## Required contracts

Initially unaccepted: #66 analytics/filter/bucket/indexer capability DTO; #40 execution; #04 use/preview; #67 semantic query/key/error recovery; #68 options; #03 cache/time scopes; #07 units/time; #120 contributions. Individual analytics contracts allow local start; real native/indexer/chart evidence joins later and neither #92 completion nor all 89 providers is a start blocker.

## Decision holds

Q11/Q12 option conversion, Q13 affected saves; missing Wazuh query registration disposition, time/bucket/chart interpretation, SSR and freshness/demo policy remain genuine holds. Q15 matters only on session transitions.

## Ownership

#93 owns three analytics/renderers and local semantic query contributions; #92 separate records, #66 provider and #67 common adapter. #68 options/#29 placement and COMPOSITION central host/registries/manifests remain exclusive; allocate local files before dispatch.
