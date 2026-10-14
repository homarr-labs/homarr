# 19: Historical and live log viewer

**What to build:** A log-permitted user reads bounded history, follows ordered/deduplicated live entries, filters levels/focus and reconnects a client-only terminal with safe cleanup. Own the complete log-specific producer→authorized stream→terminal flow; common backing primitives remain #03-owned.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

- [ ] LogHistoryStream retains the 5,000-message bound; listener-before-history buffering, snapshot/live ordering and ID deduplication handle races without claiming guaranteed durable replay of every event.
- [ ] `other-view-logs` gates history/subscription/direct calls and delayed delivery under current policy; expiry/revocation clears private output on the approved latency, not only when hiding a page.
- [ ] Real history/message union, level filters and focus string/array query state drive one client-only xterm; load/theme/resize/navigation/reconnect and translated error recovery have no server browser globals or duplicate terminals.
- [ ] Abort before subscription settles, unmount/error/reconnect/drain release listeners/buffers/terminal resources and preserve bounded backpressure; latest-value store-before-publish semantics remain distinct from log replay.
- [ ] Log-owned SampleHistoryStore preserves default-15 bounded ordered timestamped Dashdot CPU/OPNsense interface histories with reviewed producer/consumer payloads; Docker/Beszel upstream payload producers remain separate.
- [ ] Future focused history/live race, order/dedup, denial/revocation and cleanup evidence exercises actual target log production and selected ingress; reconnect/loading/stale/error states are observable without claiming fixture-only stream parity.

## Coverage

Merged **CORE-05 + OPS-01**: `log.subscribe`, LogHistoryStream/log buffers/dedup, log-specific latest/history adapters, SampleHistoryStore, terminal/filters/focus/resize/reconnect. Evidence: [core CORE-05](../drafts/core.md), [extended OPS-01](../drafts/extended.md), [persistence §§4–5](../../../research_notes/Homarr%20full%20Nitro%20migration/persistence-background.md). #03 owns common in-process fanout/CAS/namespace primitives; #20 task producer, #116 Docker and #64 Beszel producers.

## Required contracts

#01 abort/lifecycle/request; #03 clock/fanout/bounds; #04 log policy and #09 current identity; #124 selected event framing/cancellation/backpressure/reconnect; #22 typed focus search; #05 locale; Dashdot/OPNsense provider owners #57/#59 supply exact sample contracts. Accept used revisions independently, not all streams/providers complete.

## Decision holds

**Q14** long-lived transport/listener remains unresolved. History retention/restart/outage, reconnect/backpressure and ongoing authorization latency require explicit policy. Singleton and Redis removal are settled; Q15 affects real identity continuity, not isolated terminal work.

## Ownership

Exclusive log/history/sample-specific modules and viewer, not common backing store or global wire host. COMPOSITION mounts; #124 supplies delivery protocol and #03 common atomics. Dispatch needs applicable choices, accepted used revisions and exclusive allocation; publication starts no listener or checks.
