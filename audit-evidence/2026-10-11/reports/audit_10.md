# Audit 10: Custom Widget JSX runtime and workbench

## Finding F1: every bound input edit re-copies and serializes the full response graph

**Call path and trigger.** `CustomJsxDisplay` in `packages/widgets/src/custom-api/custom-jsx-display.tsx` passes the widget data and `SAFE_BINDINGS` (`createCustomJsxBindings`) into `CustomJsxRenderer`. A bound control calls `setInputValue` in `runtime-components.tsx`, which replaces input state and rerenders `CustomJsxRendererSession`. Its `useMemo` depends on `inputs`; each value edit therefore calls `createBindings(data)`, runs the JSX interpreter again, and calls `createBoundaryKey(template, bindings)`. The key helper currently does `JSON.stringify(bindings)` before hashing the string (`runtime/custom-jsx-renderer.tsx`, lines 188-204 and 266-271; see also `runtime-components.tsx` lines 95-155 and `widgets/src/custom-api/custom-jsx-display.tsx` lines 70-83).

**Cause and impact.** `createCustomJsxBindings` sanitizes by traversing and copying the response tree (`jsx/bindings.ts`, lines 4-8 and 16-82). The backend accepts response bodies up to 1 MiB and JSON structures up to 50,000 nodes (`server/response.ts`, lines 6-8 and 24-50). For a response with `N` nodes and `B` serialized bytes, each input edit causes another O(N) sanitize/copy and O(B) serialization, in addition to the needed template parse/evaluation. The sanitized copy and `JSON.stringify` result are temporary allocations; `createBoundaryKey` retains only the short hash string, so this is repeated CPU and peak temporary memory, not cumulative retained growth. Frequent text input edits make the repeated work especially visible. Current limits bound one pass but do not amortize it across edits.

**Smallest compatible fix.** Build the boundary key from the template, identity/version tokens for the original data/status/options objects, and an input-state revision (or a small input-only fingerprint). This preserves boundary reset behavior when the template, request data, options, status, or bound values change without serializing the sanitized response graph. Keep the sanitized copy for interpreter safety and rendering.

**Tradeoffs and confidence.** A monotonic input revision is O(1) but resets the error boundary on every value change, which is consistent with the current key changing for every changed input. Stable object identity tokens avoid stringifying large data/status/options and preserve upstream-change resets. Confidence: high for the repeated traversal/serialization path; the visible latency and peak heap impact are unmeasured.

**Evidence still needed.** Profile the production widget renderer with a near-limit response and a text-bound input. Compare per-keystroke scripting time and peak heap before/after, recording response bytes/node count and input edit count. No browser profile or benchmark was run in this audit.

## Reviewed concerns and evidence gaps

- `runtime-components.tsx` imports Mantine core, charts, and dates as namespaces, then resolves descriptors with dynamic `Reflect.get` and `name.split`. This is a concrete bundle-size investigation candidate, but source inspection alone does not prove what the production bundler retains. Establish its import path and compare emitted client-chunk bytes before reporting it as a bundle finding; no build or bundle analysis was run.
- `ResponseTree` recursively creates a full response-shaped tree with a separate path string per node. Its apparent production panel (`PreviewResponsePanel`) was not referenced by the app call sites searched; the backend response bound is 1 MiB / 50,000 nodes. This remains a bounded workbench-only concern, not an actionable production finding on current evidence.
- `DirectCodeMirror` deletes its module-level `EditorView` and callback-map entries before destroying the view. The editor lazy-loads its implementation. Copy-button timers are cleared on unmount; the editor's remaining short timeouts are one-shot UI updates. No object URL or persistent event-listener leak was found in the assigned paths.
- The JSX parser/runtime enforce template, AST, operation, collection, rendered-node, response-node, and string bounds. `SubFetch` delegates query and polling lifecycle to TanStack Query and clamps intervals to the browser timer range.
- `.join()` in `collection-methods.ts` repeatedly appends a growing prefix and checks its length. The interpreter caps the array at 4,000 collection items and result string at 200,000 characters, and JavaScript engines may represent concatenation ropes efficiently. No measured regression or stronger evidence justifies a separate finding here.

## Large-file pass

Individually re-read every assigned file at or above 200 lines in a separate pass: `analyzer-jsx.ts`, `analyzer.ts`, `collection-methods.ts`, `interactive-components.tsx`, `interpreter.tsx`, `runtime-components.tsx`, `safe-properties.ts`, `actions.tsx`, `custom-jsx-renderer.tsx`, `sub-fetch.tsx`, `code-editor.tsx`, `direct-code-mirror.tsx`, and `source-setup.tsx`. Full-file outputs were not truncated. The initial full-read pass covered all 58 assignment files; coverage notes are in `coverage/audit_10.json`.

## Scope and validation

This was a read-only audit. No production files were changed; no tests, builds, Docker compilation, E2E runs, or benchmarks were run. Asset/bundle sizes and runtime memory/time measurements remain unavailable.
