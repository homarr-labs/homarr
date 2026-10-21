# Standalone worker memory

Build the worker-only image from the repository root:

```sh
docker build -f apps/backend/Dockerfile -t homarr:worker-mini-local .
```

Run the host-side collector on the Docker daemon’s Linux host with a local Docker context; remote contexts are unsupported. It requires Python 3, Docker access and readable cgroup v2 counters. It adds no process to the measured container. Start a fresh worker using `scripts/worker.sh`, then record separate windows before connection, during real dashboard use and after disconnecting:

```sh
python3 benchmarks/worker-memory/measure.py CONTAINER --phase cold-idle --seconds 60 --output /tmp/worker-memory/cold-idle.json
```

Change `--phase` and output path for each window. Only healthy, functionally verified use is an active-workload result. Keep image ID, dataset, optional jobs, integration connectivity and window duration with the data. Do not infer a deployment memory limit or a leak from these short windows.

`workingSetBytes` follows Linux Docker CLI accounting: `memory.current - inactive_file`. The output separately records full cgroup usage and summed process RSS/PSS; those metrics are not additive. RSS includes shared pages, PSS divides shared pages, and cgroup charge ownership can differ on a shared host. A missing counter is unknown. Report the sampled maximum rather than claiming an instantaneous peak. [Docker stats accounting](https://docs.docker.com/reference/cli/docker/container/stats/).

Accepted current-image data and scope: [measurement report](../../docs/notes/remote/worker-memory-20261021.md). Initial failed relay-only setup diagnostics are excluded from the accepted results.
