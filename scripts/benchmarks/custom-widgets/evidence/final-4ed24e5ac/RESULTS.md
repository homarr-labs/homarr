# Final pinned custom-widget evidence

Baseline **`c72a2e02b03c734b3a393914b5e99881e27e86d2`** → candidate **`4ed24e5ac4ff1726e187d4ea3677e2f7979e3691`**, measured October 25, 2026 with Node 24.22.1. This archive-only update changes no product source and does not relabel the measured pin.

Synthetic local fixtures only, not production or full-Homarr end-to-end measurements. Values below are pooled **median / p95 milliseconds**, computed from original sorted raw arrays at index `floor(n * percentile)`, never an average of run medians. Count-mode timings are archived but excluded from timing pooling.

| Fixture | Baseline → candidate, median / p95 ms | Deterministic work |
| --- | --- | --- |
| Stable parent, 20 widgets | 75.221 / 112.158 → 0.312 / 0.325 | Over 10 updates, renderer renders/evaluations/bindings 200 → 0 each; adapter displays 200 → 200 |
| Router, 20 integration queries, cold | 428.857 / 445.495 → 13.973 / 15.767 | Per invocation, SELECTs 63 → 4; decryptions 20 → 1 |
| Router, 20 integration queries, warm | 109.037 / 118.667 → 0.836 / 1.326 | Same counts; upstream requests 0 → 0 |
| Redaction, 4,000 records, no match | 11.307 / 11.889 → 2.922 / 3.096 | Same generated JSON fixture |
| Redaction, 4,000 records, sparse match | 11.214 / 11.858 → 2.972 / 4.319 | Same generated JSON fixture |
| Management list, 20 legacy definitions | 2.311 / 4.093 → 0.284 / 0.361 | Serialized SQLite driver-result bytes 2,641,534 → 1,654; 2 → 2 SELECTs; identical public digests in both pairs |
| Workbench edit, stable 200-field response | 10.900 / 12.400 → 2.000 / 6.800 | Per replay, 25 edits render 25 → 0 response trees and 5,025 → 0 rows |

## Retained evidence and gates

- All six corrected runtime JSONLs retain 32 unique records byte-for-byte, including memory and non-timing observations. Each root has two timed runs and a separate counted run. Both original corrected gates pass; sanitizer visits are 4,801,500, adapter-display counters are positive, and renderer-options-only renders are 40 / 20 (baseline / candidate). A zero stable-parent renderer count is not the positive control.
- All 12 original server result objects retain every case, sample, operation and check, including all three management operations. Public digests match in both pairs. get/available driver-result bytes are 16,711 → 242 / 131,467 → 276, with 1 / 3 reads respectively. Router direct-20 SELECTs are 23 → 3 and decryptions 20 → 1. These bytes are not response transfer, database wire or heap bytes.
- All four browser result JSON files are byte-identical; all editor, completion and form observations remain. Replay order is baseline → candidate twice, 1440×1000, scale 1, light scheme, agent-browser 0.39.2. Builds were reused only after byte/hash equality checks; bundle contents are not duplicated here.
- Six original 31-record runtime attempts, both failed original gates, the browser viewport-command failure and the failed recovery preflight are explicitly classified and retained under `rejected/`. None contributes headline statistics. The preflight failure launched no benchmark. Original reports are retained under `reports/`; their original hashes and all original command-manifest hashes remain in provenance. No original 21-call report or source file was overwritten.

## Integrity, selection and limits

All 58 complete original pre/post source/dependency snapshots were compared first, including rejected attempts; one invariant full recorded files map per root is stored under `sources/`. Original collector scope and missing entries remain explicit. Installed dependency manifest aggregates are not hashes of every dependency implementation file. Every one of the 29 unique invocations retains command, raw/canonical ROOT, cwd, pins through snapshot references, safe environment values, Node binary hashes, source snapshot hashes and canonical map digests. Ten measured fixtures match the checked-in harness byte-for-byte; the failed/corrected private browser wrappers are retained separately.

`provenance.json` distinguishes original SHA-256/bytes from packaged SHA-256/bytes and describes each selection. Runtime/browser samples and rejected runtime JSONLs are byte-exact; server objects differ only in whitespace and tokenized root prefixes. Machine-local checkout/output/executable prefixes are replaced with documented tokens, preserving raw ROOT spelling differences. No inherited-environment fingerprint maps or secret-variable hashes are copied. No generated bundles, sourcemaps, node_modules, environment dumps, credentials, auth headers, provider traces or screenshots are packaged.

The runtime fixture uses development React/jsdom, stable providers, a 2,000-row payload per widget, 5 warmups and 10 measured board updates; transport and host UI boundaries are stubbed. The router uses actual appRouter callers, in-memory SQLite, real encryption and loopback HTTP with 1 ms synthetic upstream delay, 3 warmups and 30 samples per headline case. Redaction uses 30 warmups and 120 samples of two calls per case. Management uses 5 warmups and 30 samples per operation. Browser fixtures use production React/esbuild and Chromium, 5 warmups and 20 timed edits; counters include all 25. No production latency, INP, token or cost conclusions follow from these fixtures.

Run `node scripts/benchmarks/custom-widgets/summarize-final.mjs` to verify hashes, assertions and pooled statistics without executing benchmarks. Set `EVIDENCE_SOURCE` to the private `final-replay-2/recovery-1` directory to also verify originals; `import-final.mjs` with that variable regenerates this selection. Historical archives and their summarizers are unchanged.
