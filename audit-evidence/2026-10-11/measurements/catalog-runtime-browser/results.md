# Runtime catalog browser fixture results

## Setup

Ran `mise exec -- node audit-evidence/2026-10-11/measurements/catalog-runtime-browser/run.mjs` on Node 24.18.0, esbuild 0.28.2, Playwright 1.61.1, and its pinned Chromium. The fixture used nine alternating before/after pairs, one fresh Chromium process and page per sample. Both bundles came from the saved pre-change `component-registry.ts` and the current registry entry. The before entry resolved its unchanged catalog import to the current full authoring catalog. The after entry imported the compact generated runtime catalog. Both were production-minified by esbuild.

The browser first measured an empty fixture page, then loaded the bundle from an isolated loopback HTTP server with `no-store`, forced GC, and recorded the difference from the empty-page V8 heap in the same page. CDP `Network.dataReceived.encodedDataLength` measured the compressed response body. CDP decoded-body size and the fixture response header independently matched the raw bundle size. The before/after order alternated by pair. Heap deltas were stable within each variant: 2,328,704–2,328,820 B before and 2,055,496–2,055,508 B after; paired reductions ranged from 273,208 to 273,324 B. CDP cold-request medians had wider spreads: 603.6–748.1 ms before and 192.7–281.1 ms after. The per-run raw records preserve all nine samples per side.

This measures a small isolated script fixture; it does not measure the deployed Next.js route, full React application, or app startup. The fixture measures heap only for the imported registry and binding surface (plus browser/page overhead after subtracting the empty page). It does not load a real dashboard, analyzer, editor, or authoring UI. Request-to-initialization values ranged 638.7–780.8 ms before and 221.0–324.5 ms after; this interval includes request latency and cannot be interpreted as pure JavaScript CPU time.

## Results

| Measure | Before median | After median | Change |
|---|---:|---:|---:|
| Raw minified bundle | 788,251 B | 195,497 B | −75.2% |
| Gzip bundle | 86,173 B | 15,885 B | −81.6% |
| Brotli bundle | 50,112 B | 11,917 B | −76.2% |
| CDP encoded response body | 50,112 B | 11,917 B | −76.2% |
| Post-GC V8 heap over empty page | 2,328,784 B | 2,055,496 B | −273,288 B (−11.7%) |
| Registry/binding semantic JSON | 1,820,578 B | 1,820,578 B | unchanged |
| Cold script request (CDP) | 646.3 ms | 198.8 ms | −69.2% |
| Request to fixture initialization | 695.2 ms | 239.1 ms | −65.6% |
| Fixture DOM elements | 12 | 12 | unchanged |

Semantic parity passed for the registry descriptors, supported and blocked props, package/safety/reason fields, bindable names, and five binding-prop modes for each bindable component. The matching 1,820,578-byte semantic snapshot shows the browser-visible registry projection stayed the same. The five mode cases are stored in every raw sample. Required-prop checks are covered by the separate catalog parity result; this fixture does not export authoring catalog APIs to the browser.

The post-GC heap delta is an approximate total for this bundle plus its small page/runtime, not a heap snapshot attribution to an individual catalog object. It fell less than bundle bytes because the descriptor and binding semantics are unchanged. These results support a smaller runtime catalog artifact and less retained heap in this isolated fixture; they do not establish a production route startup or total-app memory reduction of the same magnitude.

The raw field `timing.moduleEvaluationMs` is named incorrectly: its timer starts in a page evaluation immediately before Playwright injects the external script, before the browser requests it, and stops after the script has evaluated. It therefore measures request-to-fixture-initialization, not CPU-only module evaluation. The separate CDP cold-request metric begins at `Network.requestWillBeSent` and ends at `Network.loadingFinished`. The two intervals overlap, and pure module CPU time was not measured. `measurement-metadata.json` records this correction for machine readers.

## Generation boundary and complexity

`generate-component-metadata.ts` runs at build time. It creates one TypeScript `Program` and `TypeChecker`, inspects exported Mantine Core, Dates, and Charts component prop types for discovered components, merges common/global prop descriptors, interns prop types, then serializes the full authoring catalog, its docs copy, and the compact runtime projection. This is work proportional to the loaded TypeScript program plus the number of inspected component/property declarations; generation latency and peak build-process memory were not measured in this browser run. None of that TypeScript compiler work runs when the browser imports the generated runtime JSON. The runtime catalog JSON was 227,717 B in this run; the full authoring/docs catalog remains a separate generated artifact.

CDP observed 13 `window` listeners after loading either bundle and zero before; `document` and `body` remained at zero. Neither minified bundle contains an `addEventListener` or `removeEventListener` token. Attribution is unresolved; the equal count does not distinguish the catalog variants. DOM counts were stable.

## Archived evidence

- `summary.json` contains the aggregate medians and bundle/source metadata.
- `raw-runs.jsonl` and `raw/pair-*.json` preserve all eighteen CDP samples, listener counts, event-level transfer sizes, semantic snapshots, heap deltas, and timings.
- `bundles/` preserves both minified bundles and gzip/Brotli encodings.
- `provenance.json` records runtime tool versions and SHA-256 hashes for the before/after registry and source catalogs.
- `measurement-metadata.json` records the timing-field correction and measurement boundaries.
- No heap dump was produced or committed.
