# 48: SDK torrent clients

**What to build:** Configure/test and consume three torrent SDK clients' queue/history/Stats and complete version-aware actions with isolated sessions and owned cancellation/lifecycle behavior.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

## Coverage

Primary kinds `deluge,transmission,qBittorrent`; all have projected download/upload (bytes/s, nullable upload) and recorded paused label/value using limit=1, native tests and H eligibility. Deluge password uses cookie/RPC SDK login and generic cookie hook; Transmission U/P Basic retains RPC session-ID handshake. qBittorrent native K or U/P retains version read, v5 stop/start versus earlier pause/resume; generic HTTP permits only K bearer (installed declaration describes ≥5.2), explicitly rejects U/P. Preserve jobs/history and all six queue/item controls, state fanout and removal/disk flags. Exact evidence: original INTEGRATION-009/research §§2.2–2.3/5.

## Required contracts

Accept #40 transport/policy/snapshot/operation/lifecycle, #47 domain download results/options/actions, #41 managed forms and #76 consumer interfaces. #42 consumes server auth hooks. SDK trust/timeout/signal/ownership revisions must be proven; whole provider peers need not complete to start. Real policy/secrets/storage/runtime and all three UI/control joins are release obligations.

## Decision holds

Exact retained/replaced SDK versions and runtime cancellation/trust compatibility are unverified evidence gates, not settled by Fetch behavior. Supported older/newer server/auth baseline and secure disposable mutation scope need explicit approval. Q11/Q12 apply to concrete persistence/conversion, Q15 applicable session continuity and provider session restart lifetime remains qualified.

## Ownership

Exclusively own Deluge/Transmission/qBit provider files and shared download SDK bridges. #47 owns shared domain download types, #40 common transport, #76 UI, #41 forms and COMPOSITION registration/manifests/exports; do not concurrently rewrite their files.

- [ ] Every native mode completes configure/test/masked edit/mode/remove/delete and authorized queue/Stats consumption; preserve exact H hooks, rejecting qBit password mode generically without losing native support.
- [ ] Preserve session-ID/cookie challenge recovery, all state/action fanout/disk flags and version-selected qBit endpoints through independent fixtures for each kind/mode/version; bound auth recovery without replaying ambiguous writes.
- [ ] Prove SDK-specific dispatcher/trust/timeout/signal behavior with focused handshake/pre-abort/pending-work fixtures. Uncancellable calls remain owned until settlement, cannot duplicate prematurely and cannot leak another integration's cookies/configuration.
- [ ] Download UI demonstrates interact denial before decrypt, direct supported mutations/error/invalidation, complete units/limits and config/trust/delete stale fencing; credential-bearing SDK causes never reach browser/logs.
- [ ] Record real target joins separately from later explicitly approved old/new-server and native-mode live evidence using disposable torrents with disk-effect approval. Unknown SDK/server support remains a release hold, not a passed matrix or automatic all-88 live obligation.
