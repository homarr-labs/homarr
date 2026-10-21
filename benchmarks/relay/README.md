# Relay comparison

This measures the opaque relay with real P-256 worker registration, first-frame
capability checks, allowed browser origins and per-worker multiplexing. Workers
are echo peers, not Homarr applications: no dashboards, integration requests,
encryption, browser rendering or database work is included. Payload lengths are
opaque application-frame bytes, not complete Ethernet/WebSocket/relay-envelope
wire bytes. The 12 KiB/64 KiB cases approximate frame sizes only.

Run from this checkout with an **existing** Bun1.4.2 image and a statically linked
Go candidate binary. No image builds or pulls occur. The default image must have
the Bun executable at `/usr/local/bin/bun`.

```sh
python3 benchmarks/relay/run.py --runtime bun --output /tmp/relay-results/bun-1
python3 benchmarks/relay/run.py --runtime go --go-binary /tmp/homarr-relay-go/relay-go --output /tmp/relay-results/go-1
```

Each case starts a fresh container with read-only checkout/binary mounts,
loopback port44080, a2-CPU time quota, 512MiB memory/swap ceiling,
and128 PIDs. `GOMAXPROCS=2` is explicit for Go. A separate Bun1.4.2 load-generator container has a4-CPU time quota,
a2GiB memory/swap ceiling and128 PIDs. It shares only the
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
same loopback/proxy IP contend for120 upgrades/minute and128 active connections.
Other cases deliberately raise only admission limits to4096 total/per-IP,
100000 upgrades/minute,1000 workers and64 channels/worker. The demo Compose
limits (100workers/256connections/64perIP) and real worker32-peer ceiling are
separate policies. These results cannot establish full Homarr user capacity.

Idle ramps reach288/1152/2304 total sockets including workers. Active ramps use
128/512/1024 browser channels,8/worker and2/5/10 roundtrips per second/channel.
Fan-in cases compare32 channels ×6Hz and ×10Hz against the default worker
aggregate256 incoming messages/second; the latter intentionally crosses policy.
Default1MiB frames,2MiB buffers and16MiB/s per-socket byte limits stay intact.
Slow consumers are not simulated; do not infer slow-consumer behavior from this
driver. Reconnect re-registers128 identities without active client channels.

The active/idle ramp stops after missing/corrupt messages, handshake failures,
unexpected closes or p99>100ms. This SLO is a benchmark stop rule, not a product
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
