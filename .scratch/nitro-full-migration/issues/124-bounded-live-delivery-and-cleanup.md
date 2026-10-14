# 124: Bounded live delivery and cleanup

**What to build:** Real log, task-status, Docker-log and Beszel live consumers receive their distinct typed events through the approved application host, reconnect coherently and release every resource on revocation, disconnect or singleton shutdown. Own shared host/client framing and lifecycle wiring only; feature owners retain generators, reducers, history and UI.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

## Coverage

All four source contracts are explicit: `log.subscribe` → #19 history/generator/log reducer/terminal; `cronJobs.subscribeToStatusUpdates` → #20 generator/keyed job reducer/task UI; `docker.subscribeLogs` → #116 endpoint/log producer/reducer/tools UI (#78 consumes its operational contracts); `widget.beszel.subscribeSystemStats` → #91 generator/history/live snapshot merge/detail UI with #64's upstream runtime. [The source application ledger](../drafts/transports.md#primary-procedure-ledger--334-unique-paths) counts these four subscriptions within334, not four added transport features.

Own D-WS-HOST's deliberate host/exposure replacement and shared framing/keepalive/backpressure/abort/reconnect interface. Assistant UIMessage semantic turns/approvals/terminal framing remain #96/#97-owned; MCP Streamable HTTP framing remains #122-owned. Neither becomes an application event stream or a generic latest-value reducer.

## Required contracts

- #01 supplies host/effects/abort/contribution and response-precedence interfaces; #21 supplies singleton readiness/reject/drain/dispose; #03 supplies classified bounded fanout/clock/state lifecycle primitives without Redis. Feature-specific history/state remains with #19/#20/#116/#91.
- Those four feature owners supply accepted event/initial-snapshot/error/terminal/abort contracts and feature-owned generator/reducer/consumer evidence. #04/#09 supply principal/permission/expiry/revocation; trusted-origin/exposure behavior must be accepted per selected transport.
- Accept individual interface revisions, not completed producer areas. Generator/reducer work can proceed independently; selected shared host mounts wait for Q14. All four real demonstrations are integrated acceptance, not four native start blockers.

## Decision holds

Q14 (same-listener HTTP/SSE versus another approved live arrangement) remains unanswered. If WS is selected, separately decide subscription-only versus broader callable exposure; the source whole-router host is not mandated. Decide credentials, origin checks, reauthorization cadence/expiry/revocation, heartbeat/reconnect, buffer/replay limits and preset/proxy behavior. Do not silently add Bearer/ApiKey access or retain expired-session acceptance. Redis removal/singleton are settled; per-service replay, TTL, fencing, bounds and restart guarantees need fresh classification. Q15 affects real session continuity; Q13 affects only participating editor semantics, not all streams.

## Ownership and release joins

The stream owner writes exclusively allocated shared host/client framing modules, never generators/reducers/UI or a second scheduler. COMPOSITION is the single host/root/route/manifests/exports/lock/build writer across #01/#21/#125. Feature owners prove all four actual event paths through the shared contribution, and #125 joins them with separate Assistant/MCP lifecycle evidence. Dispatch requires accepted contracts, settled path-specific choices and exclusive files; ready-for-agent is triage only.

## Acceptance criteria

- [ ] All four real event contracts and owned UI consumers work through the chosen host: logs accumulate, job updates reduce by identity, Docker logs preserve endpoint ordering, and Beszel merges history/snapshots correctly. No universal latest-event replacement substitutes for feature reducers.
- [ ] Log subscribe-before-history ordering/dedup and bounded buffering, close-before-setup, Docker late async setup disposal, and Beszel's source queue-of-four/drop-oldest/abort behavior are retained or explicitly revised with equivalent intended capability and approved limits.
- [ ] Reconnect obtains appropriate snapshots without invented durable replay or mutation reissue; event IDs imply replay only with an actual retained source. Task subscriptions do not start another scheduler, and state restart/retention guarantees match classified backends.
- [ ] Accepted long-lived credential/origin/expiry/revocation policy denies expired or revoked principals and clears permission-revoked consumers; transport change does not silently broaden credential authority or copy source security gaps as desired behavior.
- [ ] Slow readers, abort before/after setup, post-header errors, terminal events and singleton shutdown dispose every upstream resource. Approved preset/proxy flush/buffering/timeouts (and ordered WS message/close behavior if selected) have focused target evidence, while Assistant UIMessage and MCP protocol cleanup remain separately verified and limitations explicit.
