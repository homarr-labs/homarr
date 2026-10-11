# Audit 08 — Widgets C

## Scope and confidence

The assignment lists 140 source/style files. The dedicated full-file passes requested for `health-monitoring/system-health.tsx` (514 lines), `notebook/notebook.tsx` (967 lines), and `releases/component.tsx` (732 lines) are complete, including their direct component/definition callers and widget loading path.

All 140 assigned source/style files received full-file review; per-file evidence is in `coverage/audit_08.json`. Caller and lazy-loading paths were traced for the three designated large components and for the two actionable candidates. No tests, builds, formal runtime benchmarks, or production edits were performed. One compatibility-only browser smoke was run; there are no measured browser CPU, latency, heap, transfer, or bundle results.

## Notebook candidate disposition: rejected for this PR

The proposed change to remove notebook HTML state and serialize only at save was not implemented. The focused compatibility smoke used one small Tiptap fixture pair with a fresh Chromium process per variant. Both fixture paths persisted the same normalized HTML: raw input was 3,110 UTF-8 bytes (SHA-256 `852fd57b4482829e1ce1b92c703bcd079bc65a7b11eba62a32b93a50eb1063e4`), while normalized/persisted HTML was 3,701 bytes (SHA-256 `45c0571977b73990fd094bbecef700ffd35d7e8b44fed8636ca62c359b96c8f3`). This compatibility-only smoke is not a valid performance benchmark. The fixture baseline had apparently received an initial update before the no-edit save, so it does not establish the actual production baseline behavior or prove a raw-HTML regression. Static source inspection shows a potential raw-content difference for an edit session saved before an editor update, but that behavior remains unproven. No CPU, latency, or retained-heap benefit was measured; the candidate is rejected for this PR.

## Notebook code-path observation: full HTML serialization on editor updates

**Call path and trigger:** Dashboard widget loading goes through the explicit lazy registry (`packages/widgets/src/registry.ts`) and the notebook definition's dynamic component loader (`notebook/index.ts` → `notebook/component.tsx` → `notebook/notebook.tsx`). When a user edits the notebook, Tiptap's `onUpdate` runs for each editor transaction. `shouldRerenderOnTransaction: true` also permits editor transaction rerenders.

**Evidence and cause:** `Notebook` initializes React state with the full `options.content` string. Its Tiptap `onUpdate` callback calls `editor.getHTML()` and stores that serialized document in `content` state on every update. The ProseMirror editor already retains its document model; this adds a complete serialized HTML string to component state and causes a React state update on each transaction. Saving later uses that state string. Read-only task checks also serialize HTML when they commit. The compatibility fixture's raw small input (default notebook content plus a task row) measured 3,110 UTF-8 bytes; actual user notebook size is not bounded by the inspected widget definition, so cost depends on content length and editing frequency.

**Dimensions:** For document length N, each edit incurs O(N) HTML serialization CPU and a transient O(N) string allocation; React state keeps an additional O(N) serialized representation while mounted and schedules a render. This is transient/retained duplicate widget state, not evidence of a leak. No heap or per-keystroke latency measurement was taken, so bytes and user-visible delay remain unquantified. No query/network payload or bundle-size issue is claimed.

**Candidate not accepted:** A save-time-only serialization design may save the per-update serialization work, but this audit did not establish a production-compatible replacement for raw initial `options.content` when no document update has occurred. It also did not produce valid before/after CPU or retained-heap evidence. Keep the production code unchanged; revisit only with a faithful production baseline and compatibility evidence.

**Evidence limit:** The source path confirms `getHTML()` runs in `onUpdate`, which costs O(N) CPU and creates an O(N) transient string for document size N. It does not prove a retained-memory reduction or user-visible latency improvement. The compatibility smoke and its limitations are recorded in `measurements/notebook-measurement.md` and `measurements/notebook-compatibility-smoke.json`. Confidence is high for the source call path, low for user impact, and insufficient for an accepted optimization.

## Finding: Stocks builds an unused full-size graph array in advanced display

**Call path and trigger:** The stock widget is lazily loaded by its definition. On any successful `getPriceHistory` result, `StockPriceWidget` calls `getStockSummary`; this happens for both compact and advanced display modes.

**Evidence and cause:** `getStockSummary` computes `graphValues` with `priceHistory.map(...)`, but the advanced branch renders `Sparkline` from `data.priceHistory` directly and never reads `summary.graphValues`. The array is therefore created and kept in the render-local summary until that render completes, then becomes collectible. It is a transient duplicate, not a leak. `Math.min(...priceHistory)` and `Math.max(...priceHistory)` also spread every observation into function arguments. The widget exposes ranges through `max` and intervals through `5m`, but this audit did not trace or measure an upper bound on provider response length.

**Dimensions and evidence gaps:** For N observations, the extra advanced-mode mapping is O(N) CPU and O(N) transient number storage. The min/max calls are O(N); large arrays may encounter JavaScript argument-count limits, but no response large enough to reproduce that behavior was measured. No latency, heap, or API response-size measurement is available, so practical impact is unquantified.

**Minimal compatible fix:** Pass display mode into summary construction or move graph normalization into the compact-only render path, so advanced mode does not build `graphValues`. Replace spread-based min/max with a single loop to avoid argument expansion while preserving O(N) work. Keep the source query array unchanged for the advanced Sparkline. This saves one O(N) pass and temporary array in advanced mode; the compact chart still needs its normalized series. Confidence is medium for the unnecessary advanced allocation and low-to-medium for user-visible impact pending real history-size measurements.

## Dedicated large-file passes

### `health-monitoring/system-health.tsx`

The full component and its wrapper/definition callers were read. Query data is filtered to entries with health information. For each integration, storage selections filter filesystem and SMART entries, then `matchFileSystemAndSmart` maps the filesystem list, linearly searches SMART records for each disk, and sorts the resulting display list. This is O(F×S + F log F) CPU with O(F) derived display records per render (F filesystem entries, S SMART entries). The arrays are expected to be small disk inventories; no realistic large-input evidence or measured cost was available. This is a temporary derived rendering structure, not long-lived retention. No timer, listener, video, or buffer lifecycle concern was found.

### `notebook/notebook.tsx`

The entire 967-line editor component and its direct definition/component callers were read. The event listener for read-only task events is removed in its effect cleanup. The custom task-item node view removes its checkbox listener and forwards the parent destroy callback. The actionable concern is the repeated full HTML serialization/state duplication described above; no cleanup leak was found.

### `releases/component.tsx`

The entire 732-line component and direct definition/query helpers were read. Repositories are grouped by provider and requests are split into groups of five. Returned records are flattened into a short-lived array/map and shallowly decorated for display; source query records are reused by reference for their nested values. Release descriptions are rendered as Markdown only in the expanded repository panel. No persistent duplicate payload or unbounded buffer was identified. Query count, response sizes, and rendering latency were not measured.

## Loading and asset notes

The registry stores explicit dynamic module loaders; it does not import all component implementations into the board synchronously. Notebook loads the Tiptap editor through a `next/dynamic` component with SSR disabled. `default-content.ts` is a 4,438-byte source module; the runtime small-fixture HTML (default content plus task row) measured 3,110 bytes. It is inline content, not a generated or binary asset. No bundle measurement was made.
