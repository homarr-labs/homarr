# PR7354: selected Custom Widget benchmark evidence

These are **synthetic local fixtures, not production or full-Homarr end-to-end measurements**. No production/Langfuse data, real credentials, traces, generated bundles or validation logs are included. Fixture input data is generated in the checked-in harness files.

The measured BEFORE is **`929a928be6a176d992c9a80ed839321b29100828`**, not the later screenshot `dev` revision **`1a3df6ba395223860057f84893d3b196f886da3f`**. Historical AFTER was the uncommitted `perf/custom-widgets-audit` worktree, including port `99d6e2545c6cbe0013be0e7e33945ce617edca4e` and the subsequent runtime/server/workbench changes. The screenshots do not establish that these timings were measured against latest dev.

## Selected results

Milliseconds are median / p95. Runtime pools two runs; other ranges are the two separate run medians. Counts use separate instrumentation where noted.

| Fixture                                | Historical BEFORE → AFTER                                                                                                                                                       | Raw evidence                                           |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Stable parent update, 20 widgets       | **65.180 / 101.666 → 0.331 / 0.403 ms**; over 10 measured updates, renderer sessions/evaluations/bindings each **200 → 0**, wrappers **8,200 → 0**, adapter calls **200 → 200** | `evidence/runtime/{before,after}-{1,2,counts}.jsonl`   |
| Actual router, 20 integration queries  | Cold medians **420.81–426.98 → 13.56–15.05 ms**; warm **107.51–108.69 → 0.78–0.84 ms**. SELECTs **63 → 4**, decryptions **20 → 1** per invocation, cold and warm                | `evidence/server/router-{before,after}-{2,3}.json`     |
| Actual router, 20 direct queries       | SELECTs **23 → 3**, decryptions **20 → 1** per invocation, cold and warm                                                                                                        | Same router files                                      |
| 4,000-record JSON redaction            | No matches **10.97–11.37 → 2.85–2.96 ms**; sparse matches **11.20–11.46 → 2.82–2.95 ms**                                                                                        | `evidence/server/response-{before,after}-{1,2}.json`   |
| Management list, 20 legacy definitions | Serialized SQLite driver-result bytes **2,641,534 → 1,654**, **2 → 2 SELECTs**, identical public output SHA-256                                                                 | `evidence/server/management-{before,after}-{1,2}.json` |
| Sample edit, 200-field response        | Medians **10.1–10.7 → 2.0 ms**; 25 updates (5 warmups + 20 timed) render **25 → 0** trees and **5,025 → 0** rows                                                                | `evidence/workbench/browser-{before,after}{1,2}.json`  |

`node scripts/benchmarks/custom-widgets/summarize.mjs` verifies every packaged evidence hash and management output parity, then recalculates statistics from the original sample arrays. Percentiles use the original sorted-array index convention: `floor(n * percentile)`.

## Method and limits

- **Runtime:** Node 24.22.1, development React, jsdom, real React DOM/Mantine/QueryClient and real widget adapter/renderer/interpreter. Stable providers surround a synthetic parent with 20 real `CustomJsxDisplay` instances; each receives a 2,000-row payload (225,511 serialized bytes), 40 Text nodes, 8 icons and the four helper kinds. Translation, transport, notifications and modal presentation are stubbed. Each scenario mounts, performs 5 warmup updates, then 10 measured board updates. Timed BEFORE/AFTER alternate twice; counted runs are separate. Includes reconciliation/`act`, not browser layout/paint, network, server or production compilation.
- **Router:** actual lazy `appRouter.createCaller`, migrated in-memory SQLite, real encryption/decryption and local HTTP/Undici. The upstream delays its small JSON reply by 1 ms. Per case: 3 warmups, 30 samples; cold invocations use fresh Items/definitions, warm invocations use cached responses. Driver SELECT execution and decrypt counts are instrumented. These are per-invocation counts, not a board aggregate. Router timings combine the existing port and later changes; they do not isolate one optimization. No PostgreSQL, Redis, WAN or TLS throughput claim.
- **Redaction:** 4,000 generated records, approximately 933 kB, 4 synthetic secret inputs, no matches or a match every 100 records. 30 warmups, 120 samples of 2 calls each. The harness also retains its original parser/budget checks; selected evidence contains only redaction results.
- **Management:** one current definition with an authoring-valid 8,192-byte stored secret plus 20 legacy definitions with 64 KiB request bodies and 64 KiB display configurations. Five warmups, 30 samples per query. Bytes mean UTF-8 serialized SQLite driver results, **not response transfer bytes, database wire bytes or heap size**. The router harness's separate oversized-secret management probe is not the source of these claims.
- **Workbench:** production React/esbuild fixture in Chromium through `agent-browser`; actual response-panel/tree/editor code with host boundaries stubbed. Five warmups + 20 timed edits; counters cover all 25. No Next.js route, network transfer, INP or whole-app latency claim. The retained original fixture also includes editor/form scenarios to preserve measurement order.

## Provenance

`evidence/provenance.json` lists original report/harness filenames and SHA-256s, original raw-result SHA-256s, selected-file SHA-256s and exact field/record selection rules. Timing samples and operation counters are unchanged. Unused result records and machine-local `root` paths were removed. `evidence/runtime/source-hashes.json` is the original historical AFTER hash map for the seven changed runtime files.

Full historical AFTER hashes were **not** recorded for all transitive server/workbench inputs. Re-running on a current PR head is a fresh comparable measurement, not an exact replay of that historical source snapshot. Small host timing differences are not proof of a regression or speedup; deterministic counts/bytes are stronger evidence. This directory preserves only the headline evidence above, not every audit finding or rejected experiment.

The original harnesses are retained with path/output portability changes, environment guards, a loopback server path guard, an optional runtime `BUILD_ONLY=1` smoke check, unused-code cleanup and formatting. Measurement workloads, warmups, assertions, instrumentation and sample definitions are unchanged. `import-evidence.mjs` can regenerate the selected archive when `EVIDENCE_SOURCE` points to the original directory; normal reproduction does not require that directory.

## Exact reproduction

Requires repository dependencies installed in both source checkouts, Node **24.22.1**, and the checkout's `tsx`/esbuild. The browser stage additionally needs `agent-browser` and Chromium. No external API or real credentials are used. Use dedicated checkouts; no source files are edited. Server fixture databases are in memory.

From the PR checkout, set absolute paths to an existing baseline checkout and the candidate checkout:

```sh
export BENCH="$PWD/scripts/benchmarks/custom-widgets"
export BEFORE=/absolute/path/to/checkout-at-929a928be
export AFTER="$PWD"
export OUTPUT="$BENCH/output"
mkdir -p "$OUTPUT/runtime" "$OUTPUT/server" "$OUTPUT/workbench"
node "$BENCH/summarize.mjs"
```

Use `mise exec -- node` instead of `node` if that is how Node 24.22.1 is selected locally. Run the original runtime workload alternately, keeping timed and instrumented samples separate:

```sh
for run in 1 2; do
  ROOT="$BEFORE" LABEL="before-$run" OUTPUT="$OUTPUT/runtime" node --expose-gc "$BENCH/runtime/run.mjs" > "$OUTPUT/runtime/before-$run.jsonl"
  ROOT="$AFTER" LABEL="after-$run" OUTPUT="$OUTPUT/runtime" node --expose-gc "$BENCH/runtime/run.mjs" > "$OUTPUT/runtime/after-$run.jsonl"
done
ROOT="$BEFORE" LABEL=before-counts COUNTS=1 OUTPUT="$OUTPUT/runtime" node --expose-gc "$BENCH/runtime/run.mjs" > "$OUTPUT/runtime/before-counts.jsonl"
ROOT="$AFTER" LABEL=after-counts COUNTS=1 OUTPUT="$OUTPUT/runtime" node --expose-gc "$BENCH/runtime/run.mjs" > "$OUTPUT/runtime/after-counts.jsonl"
```

Router runs 2/3 and redaction/management runs 1/2 are the historical selections. Labels below match those filenames; each invocation is a fresh process. The wrapper uses the chosen checkout as its working directory and propagates child failure status.

```sh
for run in 2 3; do
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

Browser fixture (light theme, identical generated data). Build both versions, start the loopback fixture server in a separate terminal, then run BEFORE → AFTER twice:

```sh
ROOT="$BEFORE" LABEL=before OUTPUT="$OUTPUT/workbench" node "$BENCH/workbench/build-browser.mjs"
ROOT="$AFTER" LABEL=after OUTPUT="$OUTPUT/workbench" node "$BENCH/workbench/build-browser.mjs"
OUTPUT="$OUTPUT/workbench" node "$BENCH/workbench/serve.mjs"
```

In the other terminal, with the same `BENCH`/`OUTPUT` variables:

```sh
OUTPUT="$OUTPUT/workbench" AGENT_BROWSER_SESSION=cw-workbench-perf node "$BENCH/workbench/run-browser.mjs"
AGENT_BROWSER_SESSION=cw-workbench-perf agent-browser close
```

Stop the loopback server after use. Reproduction outputs go under ignored `output/`; they never overwrite `evidence/`. To recalculate on fresh files without historical hash verification, inspect the corresponding raw samples rather than changing the archived provenance.

## Focused validation

```sh
node "$BENCH/check-syntax.mjs"
bun x oxlint "$BENCH" --format stylish
bun x oxfmt --check "$BENCH"/*.mjs "$BENCH"/runtime/*.{mjs,tsx} "$BENCH"/server/*.mts "$BENCH"/workbench/*.{mjs,tsx}
node node_modules/typescript/bin/tsc --noEmit --incremental false --pretty false -p packages/custom-widgets/tsconfig.json
```

Archived JSON/JSONL is deliberately not reformatted: its byte hashes are evidence. The original transpile-only harness fixtures are not part of a package TypeScript project; syntax is checked without running a benchmark. No new unit tests are added.

Packaging validation passed syntax (13 scripts/fixtures), source formatting, 23 evidence hashes, management-output parity, runtime build-only and browser fixture bundle smoke checks, and the focused package typecheck (exit 0). Generated smoke bundles were removed. Lint exits 0 with 46 original style warnings (instrumentation names, scoping, sorting and CSS imports). No timed benchmarks or unit tests were rerun while packaging.
