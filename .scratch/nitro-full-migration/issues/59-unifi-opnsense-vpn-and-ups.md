# 59: UniFi, OPNsense, VPN and UPS

**What to build:** Configure/test and consume full network/firewall/VPN/UPS readings from the four assigned providers, preserving isolated cookies, SDK topology and bounded history without invented controls.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

## Coverage

Primary kinds all have native checks, H eligibility and projected Stats.

| Kind | Native/auth and exact projection |
| --- | --- |
| `unifiController` | U/P forked SDK/cookie agents; UniFi OS/legacy login and port fallback, all-site summaries; wifi,lan = users+guests,latency (ms); generic cookie/optional CSRF has distinct session lifecycle |
| `opnsense` | opnsenseApiKey/opnsenseApiSecret Basic; four independent CPU/memory/interfaces/version summaries, 15 ordered interface rate/history samples; cpu (percent) from total |
| `gluetun` | none/U/P/K; VPN/DNS/public-IP/settings join/missing fields; status,publicIp,country (text); no native VPN controls |
| `peaNut` | none/U/P Basic; per-device UPS summary/status/metrics, nullable NUT numeric parsing/combined statuses; devices,onBattery,lowBattery |

Exact mode/native/runtime evidence: original INTEGRATION-020/research §§2.2–2.3/4–5; other units are source-defined counts/metrics.

## Required contracts

Accept #40 snapshot/query/cookie/session/trust/operation/results, #19 SampleHistoryStore append/window/read contract, #03 bounded atomics/clock/state ports, #41 forms, #84 network/firewall/VPN/UPS options/consumption and #04 policy. #42 consumes isolated UniFi auth hooks. Exact interfaces, not whole producers, gate start; real state/policy/secrets/forked runtime and all four managed/native UI paths gate acceptance.

## Decision holds

Forked SDK and cookie-agent runtime/server topology are unverified evidence gates, not automatic compatibility. Q11/Q12 apply to concrete persistence/conversion, Q15 applicable continuity; session/history restart lifetime and native URL/trust changes remain qualified. Approved live versions/topologies/minimum access must be recorded separately; neither singleton nor Redis removal settles those details.

## Ownership

Own four clients/native network/firewall/VPN/UPS composition and the single UniFi SDK/cookie-agent injection bridge. #19 owns SampleHistoryStore, #03 backing atomics/clock/bounds, #40 shared session/trust ports, #84 widget queries/presentation, #41 forms and COMPOSITION mounts/manifests. No parallel cookie bridge or Redis channel symbols in provider contracts.

- [ ] Each kind demonstrates configure/test/masked edit/mode/remove/delete and authorized complete native/Stats UI consumption for every recorded auth alternative/topological branch, not just one generic network summary.
- [ ] UniFi fixtures independently preserve OS/legacy login/port fallback/site aggregation, forked trust/cookie isolation and distinct generic-cookie/CSRF lifecycle; no cross-site/config session leakage.
- [ ] OPNsense retains four independent summaries and 15 timestamped interface samples/rates; Gluetun retains four-read missing-field semantics without controls; UPS retains per-device nullable numeric and combined-state meanings. Preserve all table projections/units.
- [ ] Native query policy resolves before decrypt; focused malformed/error/abort/deadline/config/trust/delete fixtures prove credential redaction, history/session revision fences and owned resource cleanup without a new polling fleet.
- [ ] Demonstrate all four actual target consumers. Later explicitly approved live topology/site/repeated-history/auth/device evidence uses minimal access and known runtime/server versions; inaccessible services stay unverified and no automatic all-88 matrix or new upstream mutation is required.
