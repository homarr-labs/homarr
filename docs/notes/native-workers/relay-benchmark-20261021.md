# Relay capacity experiment — 21 October 2026

**Decision:** keep Bun as the default relay. A Go candidate is implemented and works with the existing wire protocol, but this first port uses more CPU and falls behind earlier under active load. The existing demo stays on Bun. The Homarr worker backend remains Hono/Bun/oRPC.

Open the [interactive flow and results](https://brainzilla.llama-stonecat.ts.net:8446/). This throwaway prototype lives on `feat/worker-relay-prototype-20261021`, based on `32eccd0f8`. The [normal Homarr app](https://brainzilla.llama-stonecat.ts.net:8445/) is unchanged by this experiment.

## Measurement conditions

- Relay: **2 CPU quota, 512 MiB RAM, zero swap, 128 PIDs**. Docker HostConfig and readable cgroup counters were verified. CPU affinity is unavailable in this rootless Docker environment; quotas share a 20-logical-CPU, 64 GiB host with other work.
- Separate generator containers use the same existing Bun 1.4.2 Linux image/userspace. Workers prove their identities; browser channels pass origin and capability checks. Every successful reply must match its expected client, message ID and body. Benchmark ports are unpublished.
- Go uses verified **Go 1.27.3** and coder/websocket 1.8.14. Legacy Go 1.24.5 results are retained separately. Both binaries use identical Go source; compiler/archive/binary hashes are archived.
- Runs last **15 seconds**. The repeated active comparison uses medians of four Bun trials and three current-Go trials. Other boundary probes ran once.
- Traffic is opaque echo data over local networking. It excludes TLS, endpoint encryption, the production proxy, Homarr API execution, databases, widgets, integrations and internet RTT. Process RSS differs from cgroup memory. Host FD enumeration was unavailable and is recorded as unknown.

## Repeated active workload

Each simulated worker carries eight client channels. A roundtrip is one opaque message each way, rather than a complete HTTP/oRPC operation.

| Workload                              | Bun verified RTT/s | Bun p99 |    Bun CPU | Go verified RTT/s |  Go p99 |     Go CPU |
| ------------------------------------- | -----------------: | ------: | ---------: | ----------------: | ------: | ---------: |
| 512 clients × 5 Hz, 4 KiB each way    |              2,560 | 33.1 ms | 0.12 cores |             2,560 | 37.2 ms | 0.36 cores |
| 1,024 clients × 10 Hz, 4 KiB each way |             10,240 | 58.7 ms | 0.40 cores |            10,240 | 76.6 ms | 1.40 cores |

These repeated trials had zero missing/corrupt replies, handshake failures or unexpected closes. At 1,024 clients, individual p99 values ranged from 44.1–81.0 ms for Bun and 73.3–78.7 ms for Go. Median sampled peak RSS was 64.1 MiB and 60.1 MiB respectively.

An idle probe held 256 workers plus 2,048 clients, or 2,304 sockets, for 15 seconds: sampled peak RSS was 46.8 MiB for Bun and 69.5 MiB for Go. This establishes neither an idle ceiling nor long-term stability.

## Observed failure boundaries

| Probe                                                                   | Observed result                                                                                                                    | Implication                                                                                                                                              |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Same source IP, default admission                                       | 4 workers + 116 clients accepted; 24 further upgrades rejected                                                                     | The 120-upgrades/minute policy trips before CPU saturation. A proxy can pool unrelated users into one bucket.                                            |
| Native Nginx connection setting                                         | 64 workers + 429 clients established from 576 requested sockets; 83 upgrades failed; log: `1024 worker_connections are not enough` | Each proxied WebSocket consumes downstream and upstream connections. The observed 493 stable sockets are one measurement, not a universal exact maximum. |
| One worker, 32 clients × 10 Hz                                          | The worker's 256-message/sec aggregate limit closed its socket and all 32 clients                                                  | A hot worker is a shared failure boundary. The 192-message/sec case passed at 6 Hz/client. Real RPCs can use multiple protocol frames.                   |
| Bun: 256 workers + 2,048 clients, 20,480 RTT/s target, two generators   | No missing, late or corrupt replies; maximum shard p99 **77.9 ms**; generator scheduling p99 0.30 ms                               | Largest clean workload tested for this 4 KiB profile. Relay CPU 0.73 cores; RSS 62.2 MiB.                                                                |
| Current Go: same 20,480 RTT/s target                                    | 15,228 replies missing at drain cutoff; 176,703 replies arrived after 2 seconds; maximum shard p99 **7,149.5 ms**                  | Relay reached 1.99 of its 2 CPU quota; RSS 126.0 MiB, no OOM. This workload failed.                                                                      |
| Bun: 384 workers + 3,072 clients, 30,720 RTT/s target, three generators | No loss/corruption; maximum shard p99 **882.5 ms**; generator scheduling p99 7.7 ms                                                | Crossed the exploratory 100 ms latency goal. Average process CPU of 0.98 cores suggests a hot serial path; profiling must locate it.                     |

Maximum shard p99 is the maximum of independent percentiles, not a pooled percentile. These probes had under 1 ms start skew and no missed start barrier. The 100 ms relay RTT goal and 2-second completion deadline are experiment rules, not product promises. Delivery rates include replies received during bounded drain; a failed run's delivery rate is not timely sustained throughput.

An earlier single-generator 20,480 RTT/s trial had 143 ms scheduling lag. Splitting generation reduced that lag to 0.3 ms and exposed Bun's clean point. The earlier trial is therefore not a relay ceiling. Larger-frame and legacy-Go probes remain in the raw evidence; no current-Go large-frame ceiling is claimed.

## What this means for hosting

**Connections are not users.** Budget worker sockets, browser tabs and service/MCP channels separately. Real workers allow 32 peers while the relay defaults to 64 channels per worker. Align those limits and reject only excess channels. The native demo's 100-worker / 256-connection / 64-per-IP limits are lower than the deliberately tuned benchmark.

**Bandwidth can dominate before CPU.** At 20,480 echo RTT/s with 4 KiB requests and replies, relay egress payload alone is 160 MiB/s, about 1.34 Gbit/s. A 1 Gbit/s TX link carries roughly 119 MiB/s before overhead. Actual request/reply sizes are asymmetric, and encoding adds overhead; the [research](relay-research.md) explains the derived budget.

**Replicas require worker ownership routing.** Ordinary round robin can separate a worker from its clients. Add trusted edge admission, per-install budgets, reconnect jitter, liveness deadlines, drain and aggregate diagnostics before scaling out.

**Profile Go before replacing Bun.** Investigate JSON allocations, lock contention and queued writes. These results describe the current implementations, not a fundamental language limit. Go also needs heartbeat parity: its current 120-second complete-message deadline can close a healthy quiet browser whose traffic consists only of control frames. Full encrypted dashboard/MCP/media traffic, slow readers, reconnect storms, TLS and long soaks remain prerequisites for a public capacity claim.

## UX and functional outcome

The real `scripts/worker.sh` launcher starts one persistent worker, publishes no ports and prints its complete private first-owner link. It requires an existing local image and an explicit frontend; `/relay` is derived automatically, with a reachable-WSS override. A fresh task worker opened normal Homarr through the Bun relay. Stop/start preserved its identity and saved browser grant; claimed setup links were not reprinted.

A second fresh worker completed its real encrypted claim/bootstrap and normal settings through the current Go relay on a temporary private WSS endpoint, with zero browser runtime errors. This is one functional sample, not an application load or idle-soak result. Temporary workers, data and private logs were cleaned.

The prototype distinguishes implemented capabilities from proposals: independent workspace URLs and browser-vault namespaces, useful connection states, a simpler first invitation, sole-owner local recovery, and public image/admission provisioning. Today primary-worker selection remains origin-global; independently named workspace tabs need implementation. Local accounts do not require GitHub; hosted MCP is optional and separately approved. No live OAuth check or homarr.dev deployment occurred.

## Review and validation

Parallel reviews found and resolved expected-client reply validation, dead-process evidence retention, duplicate-message ramp handling, loopback relay configuration and prototype flow semantics. Manual walkthroughs cover initial claim, invited local registration, removal preserving the account, lost owner keys and busy admission preserving existing sessions. All five guided scenarios completed in a fresh browser with zero runtime errors after the final keyboard-focus correction.

The prototype has no persistence or real account mutations. Desktop/mobile have no document overflow or dialogs. Scoped axe checks found 30 passes / 0 violations for the journey and 36 passes / 0 violations for desktop capacity. Mobile capacity has zero violations and one incomplete contrast check for horizontally clipped cells using the same reviewed colors; its scroll regions support keyboard focus. One Impeccable font warning was corrected with the incumbent system font stack; no second detector pass ran.

Validation stayed focused: five race-enabled Go transport checks, cross-runtime smoke, bounded benchmarks, native integration and manual browser checks. Five TypeScript handler-assignment warnings are intentional in the throwaway driver; lint has no errors. No full Homarr suite or application image build ran. Temporary load/Go QA/worker containers, data and private browser profiles are removed. The private prototype service on port 8446 remains available.

Read the [primary-source research](relay-research.md), [UX audit](ux-audit-20261021.md), and [accepted raw evidence](../../../benchmarks/relay/results/2026-10-21/README.md) for deeper work. This experiment stays off the production route and original migration branch.
