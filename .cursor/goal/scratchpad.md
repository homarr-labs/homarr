---
iteration: 2
max_iterations: 10
status: active
goal: "Maximize the downloads widget by leveraging every mantine-datatable feature, adding hover tooltips with stats, click-to-expand rich detail rows, toggleable global stats, and comprehensive customization options"
success_criteria:
  - "Leverage all mantine-datatable features: row expansion, column toggling, custom row styling, striped rows, scroll area tracking, pinned columns, and context menus"
  - "Add hover tooltips on rows showing additional stats (size, speed, ETA, ratio, category)"
  - "Implement click-to-expand row details with comprehensive download info"
  - "Add toggleable global stats bar showing total speeds, ratios, queue counts, and disk usage"
  - "Use every relevant DataTable prop from the mantine-datatable docs"
  - "Typecheck passes with pnpm turbo typecheck --filter=@homarr/widgets"
  - "No regressions in existing functionality (context menu, sorting, filtering still work)"
last_verdict: null
last_reason: null
last_next: null
engine: cursor
---

## Progress log

### Iteration 1
- Added hover tooltips on name column showing size, state, speeds, ETA, ratio, category
- Added toggleable global stats bar with overall progress, total size, speeds, ratio, status counts
- Enhanced row expansion with RingProgress, SimpleGrid layout, collapse on click
- Added striped rows, highlightOnHover colors, rowBackgroundColor for failed/paused
- Added defaultColumnProps with noWrap and dynamic cellsStyle
- Added collapseProps for smooth expansion animation
- Added onScroll to auto-close context menu
- Added new translations for stats bar
- TypeCheck: PASS

### Iteration 2
- Migrated to `useDataTableColumns` hook with toggleable, draggable, resizable, pinnable columns
- Added `storeColumnsKey` for localStorage column preference persistence
- Added `pinFirstColumn`, `pinLastColumn`, `textSelectionDisabled`, `withColumnBorders`
- Added `scrollAreaProps`, `customRowAttributes`, enhanced scroll tracking (`onScroll`, `onScrollToTop`, `onScrollToBottom`)
- Added column settings menu in footer with reset visibility/order/width/pinning
- Added scroll position indicator badge when scrolled
- Explicit `rowExpansion.trigger: "click"`
- Updated docs and translations for column controls
- TypeCheck: PASS

## Blockers
None

## Verification
- pnpm turbo typecheck --filter=@homarr/widgets: PASS (exit code 0)
- Context menu: preserved via onRowContextMenu
- Sorting: preserved via sortStatus/onSortStatusChange
- Filtering: preserved in WidgetFooter
- Column toggling/reordering/resizing/pinning: via useDataTableColumns + header UI

## Task

Maximize the downloads widget by leveraging every mantine-datatable feature, adding hover tooltips with stats, click-to-expand rich detail rows, toggleable global stats, and comprehensive customization options
