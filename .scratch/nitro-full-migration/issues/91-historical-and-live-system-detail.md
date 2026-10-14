# 91: Historical and live system detail

**What to build:** Select/save a Beszel system/time period, view historical charts and visibility-gated live metrics, and supply the shared detail renderer used by inventory placements.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

- [ ] All 13 options and legacy/qualified system IDs validate/convert/save/reload; selection resolves within the intended integration, optimistic changes roll back on rejected saves and period/GPU/Docker controls retain units and meaning.
- [ ] Historical requests use exact integration/system/period/includeDocker keys, zero backend TTL and explicit 5s consumer polling; missing/history errors are distinct from live mode under approved deterministic hydration/client chart boundaries.
- [ ] Live `1m` subscribes only while visible, retains at most 60 records per client buffer and resets on identity/enabling changes; bounded server queue, AbortController and generator-finally cleanup preserve deliberate append-versus-replacement semantics rather than guessing from an SDK helper.
- [ ] Hide/reopen/unmount/focus/session/revocation aborts requests/listeners and clears protected samples; reconnect failures cannot leak previous systems or leave background streams. No immortal stream prefetch/dehydration.
- [ ] Shared detail renderer serves #90 with the same policy/units/lifecycle, and primary integrationSelect primitive serves #82 albums independently of live Beszel completion. Future focused selected-ID conversion/save rollback, bounded/reconnect/revoke/cleanup and history/live merge evidence runs at scoped target gates with honest real-provider/host limitations.

## Coverage

`beszelSystemStats` — 13: `systemId`, `timePeriod`, `showCpu`, `showMemory`, `showDisk`, `showDiskIO`, `showNetwork`, `showGpuUsage`, `showGpuMemory`, `showGpuPower`, `showDockerCpu`, `showDockerMemory`, `showDockerNetwork`. Primary `integrationSelect` input and shared detail/chart/live hooks; consumes `select`, `switch`. Primary `widget.beszel.getSystemStats/subscribeSystemStats`; consumes #90-owned `widget.beszel.getSystems` discovery. Families `beszel`, `mock`. #64 owns PocketBase/auth/upstream realtime, #124 iterator host. Exact [live evidence](../drafts/widgets.md#widget-beszel-live--historical-stats-and-bounded-live-streams-on-a-saved-system).

Common standard: [PUBLISHING](../PUBLISHING.md), [widget common obligations](../drafts/widgets.md#common-completion-obligations-inherited-by-every-ticket), [DESIGN](../DESIGN.md); placement/kind/type/refinement/compatible integrations, use-before-secret and saved/undefined-preview policy apply.

## Required contracts

Initially unaccepted: #64 qualified system/history/event/error/abort DTO; #90 discovery; #124 iterator framing/backpressure/revocation host; #03 buffer/generation/clock; #04 use/preview/long-lived authority; #67 query/error/focus host; #68 option save; #07 units/time; #120 typed streaming contribution. #82 accepts integrationSelect only. Historical extraction can proceed with accepted contracts; actual live provider/host/cleanup and #90 detail acceptance are later joins, not reciprocal native blockers.

## Decision holds

Q11/Q12 saved qualified IDs/conversion, Q13 optimistic saves, Q14 live transport/listener and proxy lifetime, Q15 relevant session continuity. Stream reducer append-versus-replacement, SSR/client chart/historical freshness/demo override require explicit accepted decisions; source SSE is not automatic approval of the target host.

## Ownership

#91 exclusively owns selected stats and shared detail/live/chart consumer logic plus integrationSelect primitive; #64 upstream protocol, #90 discovery/entry, #124 delivery host and #68 options remain separate. COMPOSITION owns central listener/SSR/registration; exclusive local files precede dispatch.
