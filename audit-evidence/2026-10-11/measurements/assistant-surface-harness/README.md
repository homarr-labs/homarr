# Assistant surface retained-DOM harness

This harness is authored but has **not been run**. It AST-extracts the actual `AssistantComposerSurfaceBoundary`, module globals, helper functions, and `AssistantRunFocusPreserver` from either the hash-pinned baseline snapshot or the current production source. The extraction uses the repository's installed `typescript-compiler-api` alias; Vite/esbuild compiles the JSX without changing component logic.

Only `useAui`, `useAuiEvent`, translations, and notifications are mocked. Actual React mounting, layout-effect cleanup, focus capture, DOM removal, and focus-preserver callbacks execute in Chromium. Synthetic content contains a textarea and message element. Each textarea gets a 512 KiB ASCII calibration sentinel, which is not a production payload estimate.

A worker captures after forced GC at 0, 1, 10, and 50 focus/unmount cycles. It records Chrome DOM counters, weak-reference liveness, the actual module reference and connectivity, CDP `JSHeapUsedSize`, and heap snapshots. The narrow sentinel retained-size calculation is reported separately from detached DOM counts and total heap-use. It also verifies active-boundary focus restoration and that unmounting one boundary does not clear another boundary's focus reference. Slow `measureUserAgentSpecificMemory()` is intentionally omitted.

Each worker starts a new Chromium process. The source mode is explicit:

```sh
mise exec -- node --import tsx audit-evidence/2026-10-11/measurements/assistant-surface-harness/run-harness.mts --worker --mode baseline --snapshot
```

That baseline-only command writes raw snapshots to `/tmp/homarr-assistant-surface-harness/baseline/pair-baseline-only/` and a compact summary beside the harness. The `live` mode selects the current production file. After baseline evidence and any authorized minimal cleanup, paired comparison can run as:

```sh
mise exec -- node --import tsx audit-evidence/2026-10-11/measurements/assistant-surface-harness/run-harness.mts --paired
```

The paired command runs nine sequential baseline/live pairs, each in separate browser processes, alternating baseline then live. It takes one retained-path snapshot at the 50-cycle sample for each mode in pair 1, and uses lightweight after-GC evidence for the other 16 workers. It keeps raw snapshots under `/tmp`; only compact summaries are written under this harness directory. Expected duration is roughly 2–5 minutes for nine pairs, depending on browser startup. Browser version, source mode/hash, pair, sample elapsed time, weak targets, narrow module state, CDP heap-use, and sentinel snapshot measurements are recorded. The sentinel is synthetic calibration only and is never described as real production bytes or savings.
