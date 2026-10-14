# 64: Beszel upstream runtime

**What to build:** Configure/test Beszel, consume complete systems/history/alerts and authorized actions, and deliver authenticated realtime metrics with owned cancellation and reconnect behavior.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

## Coverage

Primary kind `beszel`: U/P PocketBase token, native check/H eligibility, projected systems. Preserve JWT exp/leeway/TTL, expired-token empty-list behavior and one 401 recovery; systems/details/Stats(type,perPage), containers/Stats/SMART/systemd/alerts/history/selectors. Preserve alert create/update/delete and system pause/resume/delete body/results. Upstream SSE retains split frames/PB_CONNECT/topic/register/retry/abort and real-versus-simulated distinction; zero-TTL historical Stats remains explicit. Exact evidence: original INTEGRATION-026/research §§2.2–2.3/4.

## Required contracts

Accept #40 snapshot/session/action/connection/operation/result, #03 history/bounded state, #41 forms, #90 inventory/actions and #91 detail/history/realtime consumers, #124 async event/error/abort contract and #04 policy. Local producer/parser work uses accepted ports without completing the public host first; real state/secrets/identity/runtime, inventory/detail consumers and chosen public-stream lifecycle are release joins.

## Decision holds

Q14 leaves primary public live transport/listener unresolved; it gates host-specific exposure, not native SSE parser extraction. Q11/Q12 affect physical persistence/conversion, Q15 applicable continuity. Token/session/history restart lifetime, runtime and supported agent/version baseline (recorded realtime agent ≥0.13.0) require explicit evidence; disposable alert/system mutations and live access remain approval holds.

## Ownership

Own Beszel native client/PocketBase auth/upstream realtime parser/native compositions/actions/descriptors/fixtures. #124 owns public stream transport, #90/#91 widget orchestration/presentation, #03 backing history and #41 forms. COMPOSITION alone mounts listeners/manifests; no transport objects in browser exports or parallel parser implementation.

- [ ] Complete configure/test/masked edit/remove/delete and authorized systems/history/Stats/selector/UI consumption, preserving every native read family, pagination/type arguments, exact H mode and JWT/401/expiry semantics.
- [ ] Alert/system actions preserve every source payload/result, check action-specific interact before decrypt, bypass caches and invalidate intended consumers. Focused denied/invalid/ambiguous-result fixtures prove no blanket mutation retry or casual system deletion probe.
- [ ] Upstream SSE fixtures cover split frames, PB_CONNECT/topics/register/retry/disconnect/abort, bounded async delivery and real/mock provenance; body cancel, reader release and dispatcher finally-close remain owned on every exit.
- [ ] Query policy, safe redaction, pre-abort/deadline and config/trust/delete/revision fences protect reads/auth/streams/history. Inventory/detail consumers demonstrate qualified system identity, all read/action families and subscribe/unsubscribe without fabricating a live result from simulation.
- [ ] Join the explicitly chosen #124 public event contract after Q14, demonstrating backpressure/revocation/reconnect/shutdown. Later approved agent/version/live expiry/history/realtime evidence uses minimal rights and explicitly disposable mutations; unknown access remains held, not automatic all-provider live success.
