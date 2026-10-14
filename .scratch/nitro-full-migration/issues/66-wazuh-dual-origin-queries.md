# 66: Wazuh dual-origin queries

**What to build:** Configure/test all Wazuh credential modes and consume complete protected security queries across independent API/indexer origins with honest unavailable/empty/error outcomes.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

## Coverage

Primary kind `wazuh`: API U/P, combined API plus indexer URL/U/P, or indexer-only URL/U/P, optional dashboard URL. Full-editor public metadata includes indexer URL/username/dashboard URL; passwords remain private. JWT/one 401 recovery and indexer Basic use separate origins/trust/permissions. Eight native families: agents, recent alerts(minLevel/limit/hours), timeline, top-list, security summary(range), vulnerabilities, FIM, authentication failures, preserving named queries/fallback/severity/time/aggregation/null/deep links. Native checks/H eligibility but no Stats implementation. Exact evidence: original INTEGRATION-028/research §§2.2–2.3/4.

## Required contracts

Accept #40 multi-origin snapshot/auth/session/clock/query/operation/results/trust, #41 forms, #92 records and #93 analytics query/filter/deep-link consumption, #07 time basis and #04 per-origin policy. Exact accepted revisions gate independent parser/client work; real secrets/identity/storage/runtime and all managed record/chart UI joins are release requirements, not complete widget predecessors.

## Decision holds

Bindery/Wazuh selectable-without-Stats disposition remains unresolved: retain truthful unsupported/empty behavior or separately approve a capability-map correction; never fabricate metrics. Native URL/multi-origin/trust handling, time/restart/session policy and supported server/indexer scope require explicit dispositions. Q11/Q12 apply to concrete persistence/conversion, Q15 applicable continuity; secure live representative data/access is unverified.

## Ownership

Own Wazuh API/indexer auth/clients/named queries/native security composition/descriptors/fixtures. #92/#93 own saved widget input/query orchestration/presentation, #41 reusable forms, #40 common ports and COMPOSITION mounts/manifests. No duplicated security-dashboard UI or flattening indexer/dashboard into API origin.

- [ ] API-only/combined/indexer-only modes complete authorized configure/test/masked edit/mode/remove/delete and record/chart consumer demonstration with exact native/H alternatives/public-private metadata and separately authorized/trusted origins.
- [ ] Independent fixtures cover all eight native families, named query/fallback/severity/time/range/aggregation/null/deep-link semantics, paging and real unavailable-without-indexer outcomes; missing services/data/rights never become fake zeros.
- [ ] No Stats implementation is invented and the Bindery/Wazuh selection discrepancy remains visibly held until an approved disposition. Preserve native methods/results despite absent generic metrics.
- [ ] Policy denial precedes secret exchange on both origins; bounded JWT/401 recovery, indexer Basic, safe redaction, pre-abort/deadline and config/trust/delete/session revision fences prevent cross-origin leaks and stale security data.
- [ ] Demonstrate actual protected filters/time ranges/deep links/empty/unavailable/error UI for records and analytics. Later explicitly approved minimal-per-origin live versions/query/data evidence leaves unavailable indexer/access/unknown support unverified, without an automatic all-88 provider matrix.
