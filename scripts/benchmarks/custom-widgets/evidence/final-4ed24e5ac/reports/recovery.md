# Final custom-widget replay — recovery 1

- Candidate: `4ed24e5ac4ff1726e187d4ea3677e2f7979e3691`
- Baseline: `c72a2e02b03c734b3a393914b5e99881e27e86d2`
- Node: `v24.22.1`
- Status: **recovery complete; prior failures retained and excluded where invalid**

## Runtime

The original 21-call report and raw evidence remain unchanged. Its six runtime calls are excluded: the old wrapper omitted `--expose-gc`, so `sanitize-memory` was absent (31/32). A first recovery preflight failure is also retained; its probe encoded a newline incorrectly and did not launch a benchmark. The corrected versioned wrapper preflighted `global.gc` as a function, then emitted all 32 unique fixture records on all six runtime calls.

Each call used `[Node 24.22.1, --expose-gc, copied run.mjs]`; the flag is before the script and was not supplied through `NODE_OPTIONS`. Both count-mode gates passed: exact 32-name scenario set including `sanitize-memory`, positive sanitizer and adapter-display counters, the `renderer-options-only` positive control, and generated-bundle instrumentation coverage. Candidate `renderer-stable-parent` may have a zero render count; this is not used as the positive control.

Raw per-scenario sample arrays, medians, p95s, counts, and labels are embedded in `summary.json` and retained as six JSONL stdout logs. These are local harness observations only; no production latency or INP claim is made.

## Server fixtures and management parity

No server benchmark was rerun. All 12 successful router, response, and management invocations from the original replay were reused after exact SHA-256 verification of copied raw JSON and source maps. Their original paths and keys are identified in `summary.json`.

- **pair1**: operation set parity=true; public digest parity=true.
- **pair2**: operation set parity=true; public digest parity=true.
  - pair1 `available-legacy`: baseline 3 reads/131467 bytes; candidate 3 reads/276 bytes per measured operation; public digest match=true.
  - pair1 `get-8192-byte-secret`: baseline 1 reads/16711 bytes; candidate 1 reads/242 bytes per measured operation; public digest match=true.
  - pair1 `list-20-legacy`: baseline 2 reads/2641534 bytes; candidate 2 reads/1654 bytes per measured operation; public digest match=true.
  - pair2 `available-legacy`: baseline 3 reads/131467 bytes; candidate 3 reads/276 bytes per measured operation; public digest match=true.
  - pair2 `get-8192-byte-secret`: baseline 1 reads/16711 bytes; candidate 1 reads/242 bytes per measured operation; public digest match=true.
  - pair2 `list-20-legacy`: baseline 2 reads/2641534 bytes; candidate 2 reads/1654 bytes per measured operation; public digest match=true.

## Workbench browser fixture

Reused baseline and candidate production-esbuild fixture builds after verifying all 12 copied files byte-for-byte. Browser replay completed in session `cw-final-replay-2` at 1440×1000, scale 1, light scheme, on port 3848. The unchanged sequence was baseline → candidate → baseline → candidate. Browser control output records CLI version `agent-browser 0.39.2` and the exact valid `agent-browser set` arguments. Own server/browser cleanup was verified.

Raw browser samples, counts, and per-view median/p95 are in `summary.json`; they describe only the local fixture and are not production latency or INP claims.

## Provenance, exclusions, and limits

The recovery has unique per-invocation manifests/logs/source maps, exact raw ROOT/canonical ROOT/cwd/command, explicit and whitelisted config environment values, Node binary hashes before/after, source/dependency hashes before/after, and artifact SHA-256/byte inventory. The original `RESULTS.md` and `summary.json` hashes are recorded and those files were not edited during recovery.

The invalid original runtime calls and browser attempt, plus the failed recovery preflight, are preserved and classified; no attempt was silently replaced. Original inherited-environment fingerprint maps are private and excluded from the recovery archive; original command manifests are referenced by hash only. No production latency, INP, model billing, token, cache-hit, or cost claims are made.
