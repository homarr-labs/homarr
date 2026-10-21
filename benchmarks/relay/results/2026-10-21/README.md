# Relay experiment evidence — 21 October 2026

See `docs/notes/native-workers/relay-benchmark-20261021.md` for interpretation.
`summary.json` compares Bun with current Go 1.27.3; `summary-baseline.json` also
retains the legacy Go 1.24.5 results. `ui-results.json` is embedded in the standalone
flow prototype. Per-run driver/config/manifest/resource evidence is under `raw/`.
Files over20 KiB are gzip-compressed losslessly (`gzip -dc FILE.json.gz`).

Accepted runs use verified CPU/memory budgets. Rootless network/pinning calibration
failures and the interrupted pre-barrier shard attempt are excluded. No private
worker credentials or actual dashboard data are present. Registration token values
are the fixed nonsecret benchmark fixture string. Observed source/binary hashes
are retained where recorded; early baseline runs reference source commit94ef85c5d.
The final harness adds startup/output guards and an optional synchronized shard
start; it does not change the earlier workload's traffic schedule.

Reported rate includes verified replies received during bounded drain. Failed
probes must be interpreted using loss/deadlines/latency, not their delivery rate.
Sharded p99 is the maximum of individual shard p99 values. It is not a pooled
percentile. Short localhost echo runs establish workload points, not full Homarr
or public service capacity. No ceiling is inferred from an idle population.
