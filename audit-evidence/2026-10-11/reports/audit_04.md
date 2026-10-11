# Audit 04: Assistant, Custom Widget editors, and Workshop

## Scope and completion

All 160 assigned application files were individually read in full. Coverage is in `audit-evidence/2026-10-11/coverage/audit_04.json`; designated large files received dedicated contiguous passes. The audit inspected the assigned route/UI surfaces and concrete callers for assistant runtime, Custom Widget workbench, and Workshop. A four-line cleanup prototype was evaluated and rejected; production source is restored to the original baseline. No tests or builds were run.

## Candidate: stale assistant focus pointer after surface unmount

- **Files and trigger:** `apps/nextjs/src/components/assistant/assistant-runtime-provider.tsx`, called through `assistant-widget.tsx`. `AssistantComposerSurfaceBoundary` captures focused elements in module-level `lastFocusedSurfaceElement`; unmount removes the surface from `surfaceElements` but leaves this global unchanged when it points inside that surface.
- **Baseline evidence:** after forced GC at 1, 10, and 50 focus/unmount cycles, the global referenced a detached `TEXTAREA`; at 50 cycles 49 of 50 weak references were collected. A heap snapshot also showed browser/React-associated edges to the target. This confirms the stale module reference, but does not establish that it is the only strong retainer.
- **Prototype and rejection:** a temporary four-line cleanup checked `element.contains(lastFocusedSurfaceElement)`, then nulled the reference and reset `lastFocusedSurfaceAt`. The exact patch is archived at `audit-evidence/2026-10-11/rejected-prototypes/assistant-focus-reference-cleanup.patch`; production source has been restored. Across nine isolated baseline/live pairs, the updated source cleared the module reference every time, but both versions had 38 DOM nodes and one surviving target weak reference at 50 cycles. Median post-GC CDP `JSHeapUsedSize` was 5,436,912 bytes baseline vs 5,437,688 bytes updated; paired deltas were +32 to +1,544 bytes for live. No heap or node benefit was measured.
- **Retainer caveat and assessment:** a matched neutral render then focused an outside-assistant button, confirming that `document.activeElement` moved to the button in both modes; still one target weak reference survived in both. Snapshot paths showed a browser/React-associated edge after clearing the module global, and the narrow snapshot object-ID lookup could not attribute retained bytes. The 512 KiB sentinel is synthetic calibration, not a production-size estimate. This remains a lifecycle candidate only, not a retained-performance finding; the prototype is rejected under the audit's evidence threshold.

## Other reviewed lifecycle and workload paths

- Assistant attachment submission enforces five attachments in the shared surface adapter. Each image is limited to 1 MB and each document to 350 KB; `FileReader` converts accepted files to data URLs at send time. Historical attachment data URLs are pruned from later transport messages. This does not support an uncapped attachment-count finding.
- Per-conversation assistant composers use an LRU limit of 12, remain pinned while subscribed, and call `reset()`/`dispose()` on eviction or provider disposal. Adapter subscriptions are released on conversation changes and unmount. Weak maps hold bound runtime functions without extending the lifetime of their keys.
- Assistant message content uses lazy Shiki/Mermaid imports. Mermaid render effects deactivate on cleanup; the image attachment `FileReader` is cancelled and aborted on source change/unmount. No object URL is used in these paths.
- Assistant export and Custom Widget JSON download URLs are explicitly revoked. The Workshop screenshot UI renders the current submission’s images and lightbox slides; its count bound is provided by Workshop data/schema, and no retained browser measurement was taken.
- Custom Widget editor wrappers delegate to the workbench implementation. Dependency-level inspection confirmed CodeMirror instances are keyed by editor identity and destroyed/removed on unmount; the lazy accordion intentionally remains mounted after first open to preserve undo history.
- The explicit Custom Widget preview route fans out load requests with `Promise.all`, while request schemas cap request records at 64 and the workbench helper uses concurrency 4. This is a bounded server-side temporary workload; no production measurements establish that it causes a material resource issue, so it is recorded as a candidate only in coverage, not as a confirmed finding.
- Assistant message/telemetry, tool-result, Workshop list, and source-setup transformations either cap displayed collections or operate on route/schema-bounded payloads. No retained cache with an unbounded lifetime was identified in the assigned files beyond the focused surface element above.

## Measurement and gaps

Browser measurements are summarized in `audit-evidence/2026-10-11/measurements/assistant-surface-harness/summary-*.json`; raw heap snapshots remain under `/tmp/homarr-assistant-surface-harness/`. The nine-pair comparison used separate Chromium processes, forced GC, CDP DOM counters, weak references, module-state inspection, and post-GC heap-use metrics. Focus restoration and cross-boundary ownership checks passed. No bundle/network measurements were collected. The preview `Promise.all` candidate would need request count/duration and server memory/CPU measurements on a representative maximum-size definition; these are separate from bundle weight and short-lived allocations.

## Large-file notes

- `apps/nextjs/src/app/api/assistant/chat/custom-widget-authoring-context.ts`: dedicated complete 681-line pass in three contiguous chunks.
- `apps/nextjs/src/app/api/assistant/chat/route.ts`: dedicated complete 1,406-line pass in six contiguous chunks.
- `apps/nextjs/src/components/assistant/assistant-conversation-context.tsx`: dedicated complete 664-line pass in three contiguous chunks.
- `apps/nextjs/src/components/assistant/assistant-message-content.tsx`: dedicated complete 545-line pass in three contiguous chunks.
- `apps/nextjs/src/components/assistant/assistant-panel.module.css`: dedicated complete 2,348-line stylesheet pass in contiguous 240-line chunks, plus tail verification.
- `apps/nextjs/src/components/assistant/assistant-panel.tsx`: dedicated complete 733-line pass in four contiguous chunks.
- `apps/nextjs/src/components/assistant/assistant-provider.tsx`: dedicated complete 964-line pass in five contiguous chunks.
- `apps/nextjs/src/components/assistant/assistant-runtime-provider.tsx`: dedicated complete 597-line pass in three contiguous chunks.
- `apps/nextjs/src/app/[locale]/manage/assistant/_components/assistant-configuration.tsx`: dedicated complete 807-line pass.
