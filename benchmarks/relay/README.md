# Relay comparison

This measures the opaque relay with real P-256 worker registration, first-frame
capability checks, allowed browser origins and per-worker multiplexing. Workers
are echo peers, not Homarr applications: no dashboards, integration requests,
encryption, browser rendering or database work is included. Payload lengths are
opaque application-frame bytes, not complete Ethernet/WebSocket/relay-envelope
wire bytes. The 12 KiB/64 KiB cases approximate frame sizes only.

Run from this checkout with an **existing** Bun 1.4.2 image and a Go candidate binary compatible with that image’s Linux userspace. No image builds or pulls occur. The default image must have
the Bun executable at `/usr/local/bin/bun`.

```sh
python3 benchmarks/relay/run.py --runtime bun --output /tmp/relay-results/bun-1
python3 benchmarks/relay/run.py --runtime go --go-binary /tmp/homarr-relay-go/relay-go --output /tmp/relay-results/go-1
```

Each case starts a fresh container with read-only checkout/binary mounts,
loopback port44080, a 2-CPU time quota, 512 MiB memory/swap ceiling,
and 128 PIDs. `GOMAXPROCS=2` is explicit for Go. A separate Bun 1.4.2 load-generator container has a 4-CPU time quota,
a 2 GiB memory/swap ceiling and 128 PIDs. It shares only the
relay network namespace, avoiding a published-port proxy. This also works with
rootless Docker, whose host network may be a rootlesskit namespace. Readiness
is checked inside the relay using its existing Bun executable before sampling. CPU affinity is not enforced: the host lacks cpuset support. Both containers
may run on any CPU and share scheduling with other host processes. Output records actual
container state, process limits, RSS, CPU ticks, FD count, cgroup counters where
readable, image digest and commit. The runner verifies Docker HostConfig memory, swap, CPU quota (NanoCpus) and PID
limits before load starts and fails if they differ from the requested budget.
Both cgroupv1 andv2 counters are sampled when readable. Failure/OOM state and
partial samples are saved even if the relay dies. A shared host still has scheduler and memory interference.

`--duration 15` controls active/idle measurement seconds. `--cases` selects comma
separated cases. Repeat steady/heavy cases at least3 times with distinct output
directories and alternate runtime order. Start with `--cases active128` to
calibrate. Use `--cases active512-12k,active512-64k` for larger frame profiles.
Every process/container has a bounded deadline; container names begin
`homarr-relay-bench-20261021-`. The runner always removes its own relay and generator containers; deadline
cleanup kills the generator container as well as the Docker attachment process.

Defaults admission is measured separately:4 workers then140 clients from the
same loopback/proxy IP contend for120 upgrades/minute and 128 active connections.
Other cases deliberately raise only admission limits to4096 total/per-IP,
100000 upgrades/minute,1000 workers and 64 channels/worker. The demo Compose
limits (100 workers/256connections/64perIP) and real worker32-peer ceiling are
separate policies. These results cannot establish full Homarr user capacity.

Idle ramps reach288/1152/2304 total sockets including workers. Active ramps use
128/512/1024 browser channels,8/worker and 2/5/10 roundtrips per second/channel.
Fan-in cases compare32 channels ×6Hz and ×10Hz against the default worker
aggregate 256 incoming messages/second; the latter intentionally crosses policy.
Default1 MiB frames,2 MiB buffers and 16 MiB/s per-socket byte limits stay intact.
Slow consumers are not simulated; do not infer slow-consumer behavior from this
driver. Reconnect re-registers128 identities without active client channels.

The active/idle ramp stops after missing/corrupt messages, handshake failures,
unexpected closes or p99>100 ms. This SLO is a benchmark stop rule, not a product
promise. Run policy probes separately after a stop. A clean largest stage means
only "tested through this stage"; it does not measure a breaking point. A
capacity recommendation must state hardware, frame/rate profile, worker channel
distribution, all policy limits, observed bottleneck and explicit safety margin.

Raw `<case>.json` schemaVersion1 includes setup/registration/connection timings,
attempted/ready/open connection counts, sent/verified/missing/corrupt message
counts, close reasons, errors, delivered roundtrips/sec, p50/p95/p99 latency and
load-generator CPU/RSS/scheduling lag. Expected receiving client, IDs and entire echoed bodies must match
before a message is counted successful. Wrong-route or corrupt replies leave
the original pending message outstanding for loss accounting. RTT starts at actual send; scheduler
lag is reported separately. `<case>.resources.json` contains quarter-second
relay process/cgroup samples over setup, active work and drain; split phases before
deriving steady CPU. `manifest.json` records completed cases plus metadata.
No capabilities/private keys appear in output.

## Extra boundary probes

Use the current compiler's exact binary label so results cannot silently mix
versions. The runner records the Go binary and source SHA256 values.

```sh
python3 benchmarks/relay/run.py --runtime go --label go1.27.3 --go-binary /tmp/homarr-relay-go/relay-go-current --output /tmp/relay-results/go-current --cases active512,active1024
python3 benchmarks/relay/proxy-probe.py --output /tmp/relay-results/proxy1024
python3 benchmarks/relay/sharded-probe.py --runtime bun --output /tmp/relay-results/bun-sharded2048
python3 benchmarks/relay/sharded-probe.py --runtime go --label go1.27.3 --go-binary /tmp/homarr-relay-go/relay-go-current --output /tmp/relay-results/go-sharded2048
python3 benchmarks/relay/sharded-probe.py --runtime bun --shards 3 --output /tmp/relay-results/bun-sharded3072
```

The proxy probe reproduces one Nginx worker with1024 connections, with independently
verified resource budgets. The sharded probe uses two or three separate generator
containers (2 CPU/1 GiB each), with unique message IDs and a synchronized start.
Each shard generates128 workers ×8 clients ×10Hz/4 KiB. It reports summed delivery
and **maximum shard p99**, not an averaged or merged percentile. Inspect each
shard's scheduling lag before attributing a failure to the relay.

The main driver's reported delivery rate includes verified replies received
during its bounded drain. When a workload falls behind, do not describe that
number as sustained timely throughput: report missing replies, deadline misses,
latency and scheduling lag. Failed/SLO-exceeding runs are failure evidence.
