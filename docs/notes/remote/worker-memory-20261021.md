# Standalone worker memory — 21 October 2026

The current standalone worker image is **122.85 MiB Docker-reported uncompressed image size**. In one real browser run, Docker's cache-adjusted RAM was about **7 MiB before first use**, **92 MiB during initial dashboard use**, and **94 MiB after closing the browser**. The worker loads domain APIs on demand; the fresh-process figure is not its warmed footprint.

## Measured RAM

These are sequential windows on the same worker and image, sampled once per second. RSS/PSS include the worker's shell supervisor and Bun process. Frontend, relay, account service, browser and observer processes are outside the worker container.

| State                                  | Window | Docker working set, median | Sampled maximum | Full cgroup usage, median | Process RSS, median | Process PSS, median |
| -------------------------------------- | -----: | -------------------------: | --------------: | ------------------------: | ------------------: | ------------------: |
| Fresh idle, before client use          |   60 s |                   7.02 MiB |        8.33 MiB |                  7.50 MiB |           44.45 MiB |           22.01 MiB |
| First dashboard connection and loading |   90 s |                  91.60 MiB |       97.05 MiB |                 92.09 MiB |          135.71 MiB |          111.26 MiB |
| Idle after browser closure             |   60 s |                  94.24 MiB |       96.70 MiB |                 94.72 MiB |          138.62 MiB |          113.95 MiB |

Docker's Linux CLI subtracts inactive file cache from cgroup usage. RSS counts resident process pages including shared pages; PSS apportions shared pages. Cgroup page charges can belong to a different container on this shared host. **These metrics are different and are not additive.** The 7 MiB Docker result is not a claim that a fresh machine needs only 7 MiB of physical RAM. No host caches were flushed. [Docker memory accounting](https://docs.docker.com/reference/cli/docker/container/stats/).

The maxima are sampled working-set values, not guaranteed instantaneous peaks. This is one short matched run, not a minimum-memory, long-soak or leak result. The 512 MiB container limit is a test allowance, not observed consumption. Startup migration peaks, configured provider integrations, large media, backup/restore, Assistant and full MCP discovery are outside this workload.

## Image and workload

- Local image: `homarr:worker-mini-local`.
- Image ID: `sha256:2e092ca4bd13e64dc391953fc51d52df0a4d77e286a45ba5000cbe685fea9390`.
- Docker image storage: **128,817,562 bytes / 122.85 MiB**, uncompressed; registry transfer size was not measured.
- Runtime source: `82978841fa40834d224e82ba8fc5b3976309809b`. Build command: `docker build -f apps/backend/Dockerfile -t homarr:worker-mini-local .`.
- Bun 1.4.2, Linux amd64, SQLite, in-process state/cache, UID 1000. One persistent data volume and no published ports. Node, Nginx, Redis server, Next.js and React are absent; the emitted worker also contains no tRPC bridge or native better-sqlite3 package.
- Effective cgroup settings: 2 CPU quota (`cpu.max=200000 100000`), 512 MiB (`memory.max=536870912`), no swap, 128 PIDs. CPU affinity was not imposed; the host is shared.
- Fresh seeded database: one board, four apps, seven board items comprising four app items and three widgets, zero provider integrations. Optional jobs were off and provider outbound connections disabled; the weather widget showed that expected state.
- A task browser claimed the worker through the existing private WSS relay and rendered the normal dashboard. The active window covers initial connection and loading. The saved Apps, Integrations and Worker-settings navigation proof ran **after** that window and before browser closure/warm-idle measurement; it is functional proof, not a timestamped active-load trace. The raw phase label includes the originally planned management navigation, but the table scopes its claim to initial dashboard use. The browser had zero page errors, and its setup field was cleared before accepted screenshots. No GitHub sign-in was used.

## Available Dockerfile

`apps/backend/Dockerfile` now defaults to the standalone `worker` runtime. Its build reuses the existing shared assembler and lifecycle scripts; it does not build Next.js. Its runtime block matches the root Dockerfile's existing `worker` target. The root Dockerfile still has its compatibility/full-app targets.

```sh
docker build -f apps/backend/Dockerfile -t homarr:worker-mini-local .
bash scripts/worker.sh up --frontend https://YOUR-FRONTEND --image homarr:worker-mini-local
```

The second command needs an existing frontend/relay; it publishes no worker ports and keeps `/appdata` in a named volume. Fresh launcher instances and the prototype’s Copy command now select `homarr:worker-mini-local`. Persisted instance configuration and explicit image overrides remain authoritative. This image is available locally; no registry image was published. See [backend build instructions](../../../apps/backend/README.md) and [worker lifecycle](../../../deployments/worker/README.md).

The live check caught and fixed a relay-only startup configuration bug: the launcher intentionally supplied an empty public address, while native API handlers required a valid internal request URL. Empty/whitespace `WORKER_PUBLIC_URL` now uses the existing localhost fallback. Relay pairing and explicit direct addresses remain supported. A prior failed fixture was removed and its measurements excluded; every accepted window uses the corrected image above.

Private deployment `.state` directories are excluded from the Docker build context. All task workers, task data volumes, setup-link files and task browser sessions were removed after capture. The built image remains available. The existing demo and its data were preserved.

## Evidence and scope

[Accepted results](../../../benchmarks/worker-memory/results/2026-10-21/) contain losslessly compressed phase samples, exact image/source metadata, effective limits and sanitized functional proof. [Collector instructions](../../../benchmarks/worker-memory/README.md) describe reproduction. The host collector injects no process into the worker. Each accepted sample recorded the same two worker processes; no OOM, swap use or restart occurred.

Collector review added refusal to overwrite evidence, incomplete-process reporting, partial-result retention and effective-limit recording. Those reporting guards do not alter the successful cgroup sampling formula. Both focused source-review axes found no material packaging issues; accepted functional validation covers encrypted dashboard/management use, SQLite readiness and raw private RPC denial. No broad unit/E2E suite or full dashboard image build was run.
