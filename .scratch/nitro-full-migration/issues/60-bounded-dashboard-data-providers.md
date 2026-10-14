# 60: Bounded dashboard/data providers

**What to build:** Configure/test and consume seven read-only dashboard providers with their complete distinct queue/document/update/speed/uptime/model result contracts, not only Stats totals.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

## Coverage

Retain INTEGRATION-021 as a separate provider unit. Primary kinds all have native checks, H eligibility and projected Stats; K means apiKey, U/P username/password.

| Kind | Auth, native results and exact projection |
| --- | --- |
| `tdarr` | none/K X-Api-Key; statistics/workers/transcoding+health queues, firstItemIndex/pageSize/totals; totalFileCount,totalTranscodeCount,failedTranscodeCount |
| `paperlessNgx` | K Authorization Token; statistics/count endpoints/document/inbox/tag/correspondent/type; documentsTotal,documentsInbox,tagsCount,correspondentsCount,documentTypesCount |
| `patchmon` | public patchmonApiKey/private patchmonApiSecret Basic; full host/update/security/outdated schema; totalHosts,hostsNeedingUpdates,securityUpdates,totalOutdatedPackages |
| `speedtestTracker` | K bearer; latest/aggregate/recent(perPage)/dashboard; ping (ms),download,upload (bytes/s from bits/8), null without latest |
| `uptimeKuma` | none/slug/K/slug+K; default/lowercased public status page/heartbeat/category, missing heartbeat paused; totalMonitors,upCount,downCount,averageUptimePercent; generic K empty-username Basic is not native private monitoring |
| `wud` | none/U/P Basic; full container Stats/update-detail predicates; totalContainers,updatesAvailable |
| `llamacpp` | none; health/models/Prometheus metrics/optional slots/normalized Stats/source timeouts; health (text),tokensGenerated,requestsProcessing; no completion/model-control API |

Unspecified units are source counts. Exact methods/auth/fields: original INTEGRATION-021/research §§2.2–2.3.

## Required contracts

Accept #40 snapshot/native/schema/options/Stats/trust/operation interfaces, #41 forms and #81/#85/#86/#87 named consumer/result interfaces with #04 policy/#03 refresh. Only consumed revisions gate dispatch; real identity/secrets/storage/runtime plus every managed native UI demonstration remain release joins, not mutual widget blockers.

## Decision holds

Q11/Q12 apply to concrete persistence/conversion and Q15 applicable sessions. Cache/restart/native URL/trust changes remain scoped; exact runtime/server/auth baseline and secure live optional-endpoint evidence are unknown until approved. If sizing needs change, request approval rather than silently repartition seven kinds or omit fields.

## Ownership

Own exactly seven clients/native compositions/descriptors/fixtures, separate from #81 transcoding, #85 service cards, #86 compliance and #87 performance widget UI. #40 common transport, #41 reusable forms and COMPOSITION central assembly/manifests remain exclusive. Keep provider files allocated as in the retained draft boundary.

- [ ] All seven kinds complete configure/test/masked edit/mode/remove/delete and actual authorized native/Stats consumer demonstrations with every recorded alternative, including public/private PatchMon metadata and optional Kuma fields.
- [ ] Preserve all table native fields, paging/queue bounds, units/source timeouts and exact projections; Speedtest bits-to-bytes conversion applies only to scalar Stats, Kuma fraction-to-percent preserves public-page semantics and no-latest/paused/not-ready/unavailable slots stay truthful.
- [ ] Focused valid/empty/nullable/partial/malformed/application-error fixtures cover each client independently, retaining full native results beyond projected counts; no admin/control API is added because upstream happens to offer it.
- [ ] Native allowed-kind/query before decrypt, trusted transport, redaction, abort/deadline/pending-work ownership and config/trust/delete fences preserve provider-specific refresh/results and safe errors across all seven.
- [ ] Collect complete target queue/document/update/speed/uptime/WUD/model UI evidence. Later explicitly approved live reads record actual versions/auth/minimal scopes and optional-endpoint cases; unknown services stay unverified and no automatic all-provider live matrix is required.
