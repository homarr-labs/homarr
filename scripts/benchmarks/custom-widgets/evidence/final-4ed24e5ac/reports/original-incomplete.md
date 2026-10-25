# Final custom-widget performance replay

- Candidate: `4ed24e5ac4ff1726e187d4ea3677e2f7979e3691`
- Baseline: `c72a2e02b03c734b3a393914b5e99881e27e86d2`
- Node: `v24.22.1`
- Status: **incomplete; retained evidence includes validation and browser failures**

## Results and validity

- 21 recorded invocations; 1 nonzero exit; no source or Node drift.
- Runtime timed fixture runs completed (two alternating pairs per root), but remain harness-only observations; no headline comparisons are made.
- Runtime counters: baseline 31/32, candidate 31/32; verification failed, so no counter claims.
- Router and response server fixtures completed for both pairs and roots; assertions/checks are retained in raw JSON and `summary.json`.
- Workbench production-esbuild builds completed for both roots. The browser attempt failed at viewport setup (`Unknown command: viewport`) before page replay. Cleanup closed the owned browser and fixture server; no retry.

## Management fixture parity and driver counts

All three management operations ran on both roots in both pairs. Public-output digests and operation sets match in each pair. Driver read/byte counts below are fixture instrumentation, not production costs.
- **pair1** — operation sets match: True; public digest parity: True.
  - `available-legacy` — digest match: True; baseline `3 reads / 131467 bytes`, candidate `3 reads / 276 bytes` per measured operation.
  - `get-8192-byte-secret` — digest match: True; baseline `1 reads / 16711 bytes`, candidate `1 reads / 242 bytes` per measured operation.
  - `list-20-legacy` — digest match: True; baseline `2 reads / 2641534 bytes`, candidate `2 reads / 1654 bytes` per measured operation.
- **pair2** — operation sets match: True; public digest parity: True.
  - `available-legacy` — digest match: True; baseline `3 reads / 131467 bytes`, candidate `3 reads / 276 bytes` per measured operation.
  - `get-8192-byte-secret` — digest match: True; baseline `1 reads / 16711 bytes`, candidate `1 reads / 242 bytes` per measured operation.
  - `list-20-legacy` — digest match: True; baseline `2 reads / 2641534 bytes`, candidate `2 reads / 1654 bytes` per measured operation.

## Evidence and limitations

- `summary.json` contains invocation manifests/provenance, parsed raw runtime samples, server raw records, management digests and per-operation driver counts. `artifacts` lists retained files with byte lengths and SHA-256 hashes.
- Every invocation has unique command, stdout/stderr, completion, and before/after source/dependency records. All completed calls report stable source and Node hashes.
- No production latency, INP, model billing, token, cache-hit, or cost claims are made.
