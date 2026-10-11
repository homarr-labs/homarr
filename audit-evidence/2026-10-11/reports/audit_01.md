# Board and shell UI audit

Scope: all 200 files listed in `assignments/audit_01.json` were read in full, including the five designated large files in dedicated passes. I also followed the board route, section rendering, widget prefetch consumers, edit warmup, and grid interaction call paths. No production files were changed. No tests, builds, or benchmarks were run, consistent with the audit instructions.

## Findings

### 1. Grid drag preview repeats whole-state validation for an unchanged snapped position

**Call path and trigger.** In edit mode, pointer movement reaches `updateDragPreview` from the DnD move/over handlers and collision-frame path in `grid-editor.tsx`. The handler snaps to a target grid coordinate and calls `previewGridMove`; only after the engine returns an accepted preview does it compare `active.lastPreviewKey` and skip publishing an unchanged preview. The resize path does this in the opposite order: `previewResize` checks the key before `previewGridResize`.

`previewGridMove` clones the transactional grid state and validates it. `validateGridState` scans placements and checks every placement against the remainder of its grid, making overlap validation quadratic in the placements within each grid. The call repeats on pointer/DnD events even when the snapped target coordinate has not changed. This is avoidable CPU work and transient per-event object allocation, not retained RAM or a leak.

**Smallest compatible fix.** After computing the candidate preview key, check whether it matches the active valid preview key before calling `previewGridMove`. Preserve the existing invalid-preview handling and ensure keys still distinguish candidate/invalid target eligibility. A larger optimization would remove repeated global validation only after proving the transaction operations preserve the invariants they rely on.

**Evidence and limits.** The trigger and call ordering are directly confirmed in the full source. No representative item counts, event-rate traces, CPU profile, or frame-time measurements were collected, so user-visible latency impact and priority remain unquantified. A follow-up benchmark should replay pointer movement over a large board while staying in one snapped cell and record preview call counts and frame duration before/after. Confidence: high that duplicate work occurs; medium that it is material in typical boards.

### 2. Kind-level board prefetch includes items outside the selected layout

**Call path and trigger.** The board route creator groups every `board.items` entry by widget kind and calls `prefetchForKind` before it resolves the viewport-selected `layoutId`. The app and bookmarks prefetchers register item data lookups for their board items. Later, `prefetchInitialWidgetData` is explicitly given the selected layout, and `useSectionItems` renders items placed in that layout. The route then dehydrates the query client into the RSC response. Consequently, app/bookmark queries may be included in the initial response for items that have no placement in the selected layout. This is a payload and server/query work opportunity; client hydration may also retain the extra query data. It is not evidence of duplicated database records or a memory leak.

Collapsed sections retain their contents and are still mounted, so filtering only to currently visible/un-collapsed widgets is not established as safe. Filtering by selected layout placement is the narrower supported projection.

**Smallest compatible fix.** Resolve `layoutId` before constructing the kind map and pass only items whose `layouts` contains that ID into `prefetchForKind`. Keep all placed items, including collapsed-section contents.

**Evidence and limits.** The ordering, item-based prefetch API, selected-layout filtering, and dehydration path are confirmed in the route and widget code. No board counts, count of out-of-layout items, serialized RSC/dehydrated payload sizes, database query time, server heap, or browser hydration memory were measured. First measure those values on boards with multiple layouts; compare query hashes and payload bytes with and without out-of-layout placements. Confidence: high that unnecessary queries can be registered where an item is absent from the chosen layout; medium on practical payload savings because snapshot restoration and query deduplication may cover some entries.

## Measurement-required candidates (not promoted to findings)

- **Grid editor warmup and bundle transfer.** The board header schedules a dynamic import warmup after board load for users with edit access, with further pointer/focus warmup. This trades edit-entry latency for transferring and retaining the editor module for eligible users who may never edit. The editor boundary itself only mounts in edit mode. No production chunk sizes, network transfer, cache hit rate, or edit-use frequency were checked, so this is a bundle/latency tradeoff, not a RAM finding. Measure chunk bytes and session edit-entry rate before changing the warmup policy.
- **Backup restore peak memory.** The user-triggered restore path accepts archives up to 256 MiB, reads the archive into an `ArrayBuffer`, decompresses the database member into a `Uint8Array`, and opens it in the SQLite/WASM database. These buffers and the opened DB can overlap in lifetime, producing transient client memory pressure for large backups. Cleanup closes the temporary DB and clears its ref; no persistent leak was found. No peak-memory measurements or representative archive sizes were available. Streaming extraction or changing the accepted size is not recommended without data because it changes a supported restore path.
- **Board layout thumbnail work.** Thumbnail generation does repeated item/placement lookup while rendering a preview, and is used in board/layout selection surfaces. It is user-triggered and bounded by board size; no supported maximum or timing evidence establishes a bottleneck. Benchmark only if realistic large boards show slow switcher/settings rendering.

## Dedicated large-file passes

### `apps/nextjs/src/components/board/items/item-content.tsx` (544 lines)

Read in full and traced through section content, fixed grid item, and portal-host consumers. Widget definitions are loaded through their lazy registry path; item runtime state is managed by the grid portal host, with cleanup when board item IDs change. Query recovery/scope boundaries are attached to widget rendering. Advanced focus moves the surface through a portal and its lifecycle listeners are cleaned up by the relevant hooks. No evidence of a retained detached widget or eager loading of all widget implementations was found. The widget registry/import cost remains distinct from hydrated widget data and was not measured.

### `apps/nextjs/src/components/board/items/item-select-modal.tsx` (670 lines)

Read in full and traced from add-item actions and board setup/completion entry points. The modal loads candidates and preloads widget definitions from pointer/focus interaction; this is deliberate hover-to-open latency warming, with module caching. No evidence that all definitions are loaded on ordinary board viewing was found. Unused candidate preloads may transfer modules during a long browse through the modal, but bytes and user behavior were not measured; this is not a finding absent bundle evidence.

### `apps/nextjs/src/components/board/items/widget-context-menu.tsx` (502 lines)

Read in full and traced from resolved board-item content. Menu state and integration-dependent actions are conditional on menu/open state and widget kind; integration data is queried only for applicable actions. No long-lived per-item cache or cleanup defect was established. No actionable memory/payload issue identified.

### `apps/nextjs/src/components/board/sections/grid/dnd/engine.ts` (519 lines)

Read in three contiguous full-file sections and traced into grid editor drag, resize, and transaction callers. Preview operations clone transaction state and validate global grid invariants; overlap validation compares each placement to later placements. This is the engine mechanism behind Finding 1. It is CPU and transient allocation, not retained memory. No complexity change should bypass validation without preserving transaction correctness.

### `apps/nextjs/src/components/board/sections/grid/grid-editor.tsx` (1,277 lines)

Read in two contiguous full-file sections and traced through DnD handlers, RAF collision work, resize pointer handlers, preview store publication, and commit/cancel lifecycle. Drag preview performs engine work before the unchanged-key guard; resize guards before engine work. Interaction state is cleared on completion/cancellation. This confirms Finding 1 and shows the narrow fix location. CSS and drag overlay rendering do not themselves establish bundle or RAM waste.

## Scope and evidence boundary

The remaining assigned route, board, settings, permissions, backup UI, integration forms, and shell/header files were reviewed for state lifetime, listener cleanup, generated imports, and data projection. No other actionable issue was supported by a concrete trigger and consumer path. The report distinguishes CPU and transient allocations from retained RAM, dynamic-import transfer from runtime memory, and query payload from database storage. No measurements were made; the audit evidence is source-based and should not be read as proof of a user-visible regression.
