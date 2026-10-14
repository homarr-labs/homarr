# 03: Redis-free bounded refresh and last-good state

**What to build:** A real authorized provider/widget refreshes boundedly, presents permitted last-good data on upstream failure and rejects obsolete results after configuration or policy changes. Supply common atomic/clock/expiry/fanout primitives using suitable Nitro KV, SQL or singleton memory; Redis is removed. This is the named coordination expansion with one real consuming flow.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

- [ ] ResponseCache/RefreshLease/InvalidationService preserve data/fresh/stale/error envelopes and version/configuration/generation identity, 15-second renewable owner leases and fenced writes; expired owners and late settlements cannot overwrite newer data.
- [ ] Local handlers bound entries to 1,000 and in-flight work to 100, honor deadlines/cancellation and approved stale-on-error policy; generation state retains 30-day expiry and 1,000 pending/local-read bounds with defined overflow/failure repair.
- [ ] StatisticsSnapshotService preserves non-expiring last-good/error/retry metadata, 128 pending, four shared slots, 120-second leases, 10-second renewal and 60-second upstream deadline, including generation fences and unavailable-store behavior.
- [ ] UpdateStateService serves `updateChecker.getAvailableUpdates` with 24-hour freshness, separate non-expiring stale release state and owned refresh, respecting external-connection policy without inventing a fourth cron job.
- [ ] One actual policy-correct provider/widget demonstrates refresh, outage, cancellation, credential change and denial; authorization failure never returns stale private data and failed stores never queue delayed unsafe shared writes.
- [ ] Specify per-primitive TTL/clock/CAS/acquire/renew/release/invalidate/bounds/stop/restart behavior and future focused race regressions; classify the unused generic queue explicitly without inventing durable retries or claiming KV alone provides atomicity.

## Coverage

**CORE-03**, including OPS-09 update-checker transfer: ResponseCache, RefreshLease, InvalidationService, bounded request handler, StatisticsSnapshotService, UpdateStateService, common CAS/generation/lease/key namespace and in-process fanout. Evidence: [core CORE-03/state ledger](../drafts/core.md), [persistence §4](../../../research_notes/Homarr%20full%20Nitro%20migration/persistence-background.md), [graph state distribution](../GRAPH-AUDIT.md).

## Required contracts

#01 runtime/abort/lifecycle; #04 current principal-before-data policy; #40 exact provider result/configuration identity and the selected widget consumer's query/status contract; #25 update presentation and #17 external-connection setting projection. Review each consumed revision independently. SQL-backed primitives use #02 transaction/clock/error interface where chosen; do not wait for all provider/widget tickets.

## Decision holds

Per-service retention/restart/crash/cold-start, permissible stale rendering, invalidation-failure repair and store-outage bounds remain explicit choices. Q11 affects any concrete SQL adapter; Q12 affects retained state conversion. Singleton/Redis removal are settled, not holds. Dispatch waits only on decisions used by its selected path.

## Ownership

Common backing primitives only. Distributed CORE-04 consumers own their behavior: preview/rate leases #101, configuration requests #103, encrypted integration sessions #40, image registrations #114, SQL setup claim #109; #04 owns crypto/policy. #19 owns log/sample history, #20 task status. One local owner per shared primitive; COMPOSITION mounts it.
