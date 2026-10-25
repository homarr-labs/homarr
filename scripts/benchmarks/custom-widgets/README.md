# Custom Widget benchmark evidence

These are **synthetic local fixtures, not production or full-Homarr end-to-end measurements**. No production/Langfuse data, real credentials, traces, generated bundles or validation logs are included. Fixture input data is generated in the checked-in harness files.

## Final pinned replay: `4ed24e5ac` against `c72a2e02b`

Baseline **`c72a2e02b03c734b3a393914b5e99881e27e86d2`** versus clean product candidate **`4ed24e5ac4ff1726e187d4ea3677e2f7979e3691`**, measured October 25, 2026 with Node 24.22.1. This archive-only update changes no product source and does not relabel the measured candidate as its later archive commit. [Final report](evidence/final-4ed24e5ac/RESULTS.md), [computed statistics](evidence/final-4ed24e5ac/summary.json) and [selection/provenance](evidence/final-4ed24e5ac/provenance.json).

All timings below are **pooled median / p95 milliseconds**, recomputed from the valid raw arrays using `sorted[floor(n * percentile)]`, not averaged run medians. Count-mode timings are retained but excluded from timing pooling.

| Fixture                                   | Baseline → candidate, median / p95 ms   | Deterministic work                                                                                                 |
| ----------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Stable parent update, 20 widgets          | **75.221 / 112.158 → 0.312 / 0.325**    | Over 10 updates, renderer renders/evaluations/bindings **200 → 0** each; adapter displays **200 → 200**            |
| Router, 20 integration queries, cold      | **428.857 / 445.495 → 13.973 / 15.767** | Per invocation, SELECTs **63 → 4**, decryptions **20 → 1**                                                         |
| Router, 20 integration queries, warm      | **109.037 / 118.667 → 0.836 / 1.326**   | Same SELECT/decrypt counts; no upstream requests                                                                   |
| Redaction, 4,000 records, no match        | **11.307 / 11.889 → 2.922 / 3.096**     | Same generated JSON fixture                                                                                        |
| Redaction, 4,000 records, sparse match    | **11.214 / 11.858 → 2.972 / 4.319**     | Same generated JSON fixture                                                                                        |
| Management list, 20 legacy definitions    | **2.311 / 4.093 → 0.284 / 0.361**       | Serialized SQLite driver-result bytes **2,641,534 → 1,654**; **2 → 2 SELECTs**; public digests match in both pairs |
| Workbench edit, stable 200-field response | **10.900 / 12.400 → 2.000 / 6.800**     | Per replay, 25 edits render **25 → 0** response trees and **5,025 → 0** rows                                       |

The final archive retains **all 32 runtime records in each of six byte-identical JSONLs**, all cases/samples/operations/checks in 12 server results, all three management operations and both public-digest pairs, and four byte-identical browser result files. Corrected counter gates require positive sanitizer/adapter-display instrumentation and the forcing `renderer-options-only` control (**40 → 20** renders); a zero stable-parent count is not the positive control. All other runtime scenarios and browser editor/form/completion observations remain available, not just these headlines.

Six invalid original 31-record runtime runs, both original failed gates, the original browser command failure and the recovery preflight error remain under `rejected/`, explicitly excluded. Original reports and command hashes are referenced without overwriting the original 21-call evidence. All **58 complete pre/post source/dependency snapshots** compare equal per root; complete recorded maps are stored once per root, with original snapshot hashes, canonical digests and collector scope/missing entries disclosed. All **29 unique invocations** retain command/ROOT/cwd/pins, Node hashes and safe environment metadata. Inherited-environment fingerprint maps and secret-variable hashes are never copied; documented path-prefix tokens and original/packaged hashes make sanitization explicit. No generated bundles, sourcemaps or environment dumps are duplicated.

```sh
node scripts/benchmarks/custom-widgets/summarize-final.mjs
EVIDENCE_SOURCE=/absolute/path/to/final-replay-2/recovery-1 node scripts/benchmarks/custom-widgets/import-final.mjs
```

Neither command executes a benchmark. The first verifies archive hashes, assertions, counts, parity, privacy checks and pooled statistics; with `EVIDENCE_SOURCE` it also verifies original inputs. The importer reproducibly regenerates the selection from the recovery directory and its unchanged original sibling. Driver-result bytes are not response transfer, database wire or heap bytes. These fixtures support no production-latency, INP, token or cost claims.

## Historical PR7358 replay: `1677c940` (preserved)

Baseline dev **`c72a2e02b03c734b3a393914b5e99881e27e86d2`** versus consolidated candidate **`1677c940ca76ad8b7562d5faefd8f591aae88873`**, measured October 24, 2026. These are recorded pins, not a claim about subsequent dev/PR heads. The candidate includes its credential-redaction fix. See [the consolidated report](evidence/consolidated/RESULTS.md) for methods, source-stability scope and caveats.

| Fixture                                | Baseline → candidate                                                                                                                                          | Raw evidence under `evidence/consolidated/`       |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Stable parent update, 20 widgets       | Pooled median/p95 **58.016 / 84.303 → 0.302 / 1.897 ms**; renderer sessions/evaluations/bindings **200 → 0**, adapter renders **200 → 200** over 10 updates   | `runtime/{baseline,candidate}-{1,2,counts}.jsonl` |
| Router, 20 integration queries         | Cold run medians **424.883–425.985 → 14.454–14.550 ms**; warm **110.231–110.344 → 0.793–0.812 ms**; SELECTs **63 → 4**, decryptions **20 → 1** per invocation | `server/router-{before,after}-{1,2}.json`         |
| Router, 20 direct queries              | SELECTs **23 → 3**, decryptions **20 → 1** per invocation                                                                                                     | Same router files                                 |
| 4,000-record JSON redaction            | No-match run medians **11.098–11.116 → 2.841–2.870 ms**; sparse-match **11.130–11.136 → 2.833–2.850 ms**                                                      | `server/response-{before,after}-{1,2}.json`       |
| Sample edit, stable 200-field response | Pooled median/p95 **10.30 / 11.70 → 1.40 / 1.50 ms**; 25 edits render **25 → 0** response trees and **5,025 → 0** rows                                        | `workbench/browser-{before,after}{1,2}.json`      |

**No valid management replay is archived for this historical `1677c940` pin:** `ai-prompt.ts` changed during those management measurements. Router/redaction had already completed source-stable. Do not reuse those contaminated timing/byte/parity figures; the final `4ed24e5ac` replay above provides source-stable management evidence. Blind-authoring quality evidence is maintained separately under `scripts/benchmarks/custom-widget-authoring/`.

```sh
node scripts/benchmarks/custom-widgets/summarize-consolidated.mjs
```

This verifies all 30 historical consolidated data hashes and recomputes results from exact raw samples. Runtime includes every original scenario, not just the headline; counted-run timings remain archived but are excluded from timing summaries. Workbench preserves all original fields. Consolidated provenance records original input hashes, compact source-hash selection and path sanitization; `import-consolidated.mjs` regenerates it with `EVIDENCE_SOURCE` pointing to the original consolidated directory. Neither import nor summarize executes a benchmark. Historical archives retained in `0a7067f4f` are unchanged; that archive commit is not a new measured candidate pin.

## Historical PR7354 evidence (preserved)

The historical measured BEFORE is **`929a928be6a176d992c9a80ed839321b29100828`**, not the later screenshot `dev` revision **`1a3df6ba395223860057f84893d3b196f886da3f`**. Historical AFTER was the uncommitted `perf/custom-widgets-audit` worktree, including port `99d6e2545c6cbe0013be0e7e33945ce617edca4e` and subsequent runtime/server/workbench changes. The screenshots do not establish that these historical timings were measured against the consolidated baseline.

Milliseconds are median / p95. Runtime pools two runs; other ranges are the two separate run medians. Counts use separate instrumentation where noted.

| Fixture                                | Historical BEFORE → AFTER                                                                                                                                                       | Raw evidence                                           |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Stable parent update, 20 widgets       | **65.180 / 101.666 → 0.331 / 0.403 ms**; over 10 measured updates, renderer sessions/evaluations/bindings each **200 → 0**, wrappers **8,200 → 0**, adapter calls **200 → 200** | `evidence/runtime/{before,after}-{1,2,counts}.jsonl`   |
| Actual router, 20 integration queries  | Cold medians **420.81–426.98 → 13.56–15.05 ms**; warm **107.51–108.69 → 0.78–0.84 ms**. SELECTs **63 → 4**, decryptions **20 → 1** per invocation, cold and warm                | `evidence/server/router-{before,after}-{2,3}.json`     |
| Actual router, 20 direct queries       | SELECTs **23 → 3**, decryptions **20 → 1** per invocation, cold and warm                                                                                                        | Same router files                                      |
| 4,000-record JSON redaction            | No matches **10.97–11.37 → 2.85–2.96 ms**; sparse matches **11.20–11.46 → 2.82–2.95 ms**                                                                                        | `evidence/server/response-{before,after}-{1,2}.json`   |
| Management list, 20 legacy definitions | Serialized SQLite driver-result bytes **2,641,534 → 1,654**, **2 → 2 SELECTs**, identical public output SHA-256                                                                 | `evidence/server/management-{before,after}-{1,2}.json` |
| Sample edit, 200-field response        | Medians **10.1–10.7 → 2.0 ms**; 25 updates (5 warmups + 20 timed) render **25 → 0** trees and **5,025 → 0** rows                                                                | `evidence/workbench/browser-{before,after}{1,2}.json`  |

`node scripts/benchmarks/custom-widgets/summarize.mjs` verifies the 23 historical data hashes and historical management output parity, then recalculates statistics from the original sample arrays. It does not summarize the latest replay. Both summarizers use the original sorted-array index convention: `floor(n * percentile)`.

## Historical method and limits

- **Runtime:** Node 24.22.1, development React, jsdom, real React DOM/Mantine/QueryClient and real widget adapter/renderer/interpreter. Stable providers surround a synthetic parent with 20 real `CustomJsxDisplay` instances; each receives a 2,000-row payload (225,511 serialized bytes), 40 Text nodes, 8 icons and the four helper kinds. Translation, transport, notifications and modal presentation are stubbed. Each scenario mounts, performs 5 warmup updates, then 10 measured board updates. Timed BEFORE/AFTER alternate twice; counted runs are separate. Includes reconciliation/`act`, not browser layout/paint, network, server or production compilation.
- **Router:** actual lazy `appRouter.createCaller`, migrated in-memory SQLite, real encryption/decryption and local HTTP/Undici. The upstream delays its small JSON reply by 1 ms. Per case: 3 warmups, 30 samples; cold invocations use fresh Items/definitions, warm invocations use cached responses. Driver SELECT execution and decrypt counts are instrumented. These are per-invocation counts, not a board aggregate. Router timings combine the existing port and later changes; they do not isolate one optimization. No PostgreSQL, Redis, WAN or TLS throughput claim.
- **Redaction:** 4,000 generated records, approximately 933 kB, 4 synthetic secret inputs, no matches or a match every 100 records. 30 warmups, 120 samples of 2 calls each. The harness also retains its original parser/budget checks; selected evidence contains only redaction results.
- **Management:** one current definition with an authoring-valid 8,192-byte stored secret plus 20 legacy definitions with 64 KiB request bodies and 64 KiB display configurations. Five warmups, 30 samples per query. Bytes mean UTF-8 serialized SQLite driver results, **not response transfer bytes, database wire bytes or heap size**. The router harness's separate oversized-secret management probe is not the source of these claims.
- **Workbench:** production React/esbuild fixture in Chromium through `agent-browser`; actual response-panel/tree/editor code with host boundaries stubbed. Five warmups + 20 timed edits; counters cover all 25. No Next.js route, network transfer, INP or whole-app latency claim. The retained original fixture also includes editor/form scenarios to preserve measurement order.

## Historical provenance

`evidence/provenance.json` lists original report/harness filenames and SHA-256s, original raw-result SHA-256s, selected-file SHA-256s and exact field/record selection rules. Timing samples and operation counters are unchanged. Unused result records and machine-local `root` paths were removed; packaged JSON whitespace follows the repository formatter. `evidence/runtime/source-hashes.json` contains the original historical AFTER hash map for the seven changed runtime files.

Full historical AFTER hashes were **not** recorded for all transitive server/workbench inputs. Re-running on a current PR head is a fresh comparable measurement, not an exact replay of that historical source snapshot. Small host timing differences are not proof of a regression or speedup; deterministic counts/bytes are stronger evidence. This directory preserves only the headline evidence above, not every audit finding or rejected experiment.

The original harnesses are retained with path/output portability changes, environment guards, a loopback server path guard, an optional runtime `BUILD_ONLY=1` smoke check, unused-code cleanup and formatting. Measurement workloads, warmups, assertions, instrumentation and sample definitions are unchanged. `import-evidence.mjs` can regenerate the selected archive when `EVIDENCE_SOURCE` points to the original directory; normal reproduction does not require that directory.

## Fresh reproduction against the recorded baseline

Requires repository dependencies installed in both source checkouts, Node **24.22.1**, and the checkout's `tsx`/esbuild. The browser stage additionally needs `agent-browser` and Chromium. No external API or real credentials are used. Use dedicated checkouts; no source files are edited. Server fixture databases are in memory.

From the PR checkout, set absolute paths to an existing baseline checkout and the candidate checkout:

```sh
export BENCH="$PWD/scripts/benchmarks/custom-widgets"
export BEFORE=/absolute/path/to/checkout-at-c72a2e02b
export AFTER="$PWD"
export OUTPUT="$BENCH/output"
mkdir -p "$OUTPUT/runtime" "$OUTPUT/server" "$OUTPUT/workbench"
node "$BENCH/summarize.mjs"
node "$BENCH/summarize-consolidated.mjs"
node "$BENCH/summarize-final.mjs"
```

Use `mise exec -- node` instead of `node` if that is how Node 24.22.1 is selected locally. Run the original runtime workload alternately, keeping timed and instrumented samples separate:

```sh
for run in 1 2; do
  ROOT="$BEFORE" LABEL="baseline-$run" OUTPUT="$OUTPUT/runtime" node --expose-gc "$BENCH/runtime/run.mjs" > "$OUTPUT/runtime/baseline-$run.jsonl"
  ROOT="$AFTER" LABEL="candidate-$run" OUTPUT="$OUTPUT/runtime" node --expose-gc "$BENCH/runtime/run.mjs" > "$OUTPUT/runtime/candidate-$run.jsonl"
done
ROOT="$BEFORE" LABEL=baseline-counts COUNTS=1 OUTPUT="$OUTPUT/runtime" node --expose-gc "$BENCH/runtime/run.mjs" > "$OUTPUT/runtime/baseline-counts.jsonl"
ROOT="$AFTER" LABEL=candidate-counts COUNTS=1 OUTPUT="$OUTPUT/runtime" node --expose-gc "$BENCH/runtime/run.mjs" > "$OUTPUT/runtime/candidate-counts.jsonl"
```

Freeze both checkouts before measuring and compare source/dependency hashes before and after every invocation; stop if they change. Run the same candidate harness against both roots. Fresh results are not an exact replay of a later edited PR head. Each invocation is a fresh process; the wrapper uses the chosen checkout as its working directory and propagates child failure status.

```sh
for run in 1 2; do
  ROOT="$BEFORE" LABEL="before-$run" OUTPUT="$OUTPUT/server" node "$BENCH/run-server.mjs" router
  ROOT="$AFTER" LABEL="after-$run" OUTPUT="$OUTPUT/server" node "$BENCH/run-server.mjs" router
done
for name in response management; do
  for run in 1 2; do
    ROOT="$BEFORE" LABEL="before-$run" OUTPUT="$OUTPUT/server" node "$BENCH/run-server.mjs" "$name"
    ROOT="$AFTER" LABEL="after-$run" OUTPUT="$OUTPUT/server" node "$BENCH/run-server.mjs" "$name"
  done
done
```

The management commands are for a **new, source-stable** run, not reproduction of the excluded historical `1677c940` measurement; the final archive already retains valid `4ed24e5ac` management results. For historical filenames, use the historical baseline above, runtime labels before/after rather than baseline/candidate, and router labels 2/3 rather than 1/2.

Browser fixture (light theme, identical generated data). Build both versions, start the loopback fixture server in a separate terminal, then run BEFORE → AFTER twice:

```sh
ROOT="$BEFORE" LABEL=before OUTPUT="$OUTPUT/workbench" node "$BENCH/workbench/build-browser.mjs"
ROOT="$AFTER" LABEL=after OUTPUT="$OUTPUT/workbench" node "$BENCH/workbench/build-browser.mjs"
PORT=3848 OUTPUT="$OUTPUT/workbench" node "$BENCH/workbench/serve.mjs"
```

In the other terminal, with the same `BENCH`/`OUTPUT` variables:

```sh
agent-browser --session cw-workbench-perf open http://127.0.0.1:3848/before/index.html
agent-browser --session cw-workbench-perf set viewport 1440 1000 1
agent-browser --session cw-workbench-perf set media light
OUTPUT="$OUTPUT/workbench" ORIGIN=http://127.0.0.1:3848 AGENT_BROWSER_SESSION=cw-workbench-perf node "$BENCH/workbench/run-browser.mjs"
AGENT_BROWSER_SESSION=cw-workbench-perf agent-browser close
```

Stop the loopback server after use. Reproduction outputs go under ignored `output/`; they never overwrite `evidence/`. Inspect fresh raw samples separately rather than changing archived provenance. Port 3848 matches the original private workbench replay; use a different free loopback port consistently in both commands if needed.

## Focused validation

```sh
node "$BENCH/check-syntax.mjs"
bun x oxlint --no-ignore "$BENCH" --format stylish
bun x oxfmt --check "$BENCH"/*.mjs "$BENCH"/runtime/*.{mjs,tsx} "$BENCH"/server/*.mts "$BENCH"/workbench/*.{mjs,tsx}
node node_modules/typescript/bin/tsc --noEmit --incremental false --pretty false -p packages/custom-widgets/tsconfig.json
```

Packaged JSON is formatted before its archive hash is recorded; original input hashes remain separate in the provenance. The original transpile-only harness fixtures are not part of a package TypeScript project; syntax is checked without running a benchmark. No new unit tests are added.

For archive-only changes, use all three hash/statistics summarizers, syntax and focused formatting/lint checks above; no runtime/application source is changed. Evidence files intentionally bypass formatting to preserve recorded bytes. Imports verify raw-object parity and original source-map stability before selection. Do not rerun timed benchmarks while source edits are pending; no new tests or dependencies are needed.
