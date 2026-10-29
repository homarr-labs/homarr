import { getCollapsedDisplayLayout, reflowVerticalLayout } from "~/components/board/layout/reflow";
import type { SectionGridPlacement } from "../grid/use-grid-layout-actions";
import type { AdaptiveContainerPrototypeContextValue } from "./adaptive-container-context";

// Projection changes the real native display geometry; persisted placements remain intact.
export function isPrototypeItemHidden(
  context: AdaptiveContainerPrototypeContextValue | null,
  itemId: string,
  isEditMode: boolean,
) {
  if (!context || isEditMode) return false;
  const allocation = context.allocations.find((entry) => entry.itemId === itemId);
  if (!allocation) return false;
  return allocation.pageId !== context.selectedPageId;
}

export function getPrototypeContainerRows(context: AdaptiveContainerPrototypeContextValue, isEditMode: boolean) {
  if (isEditMode || !context.settings.reclaimSpace) return context.savedContainerRows;
  const selected = context.allocations.filter((allocation) => allocation.pageId === context.selectedPageId);
  let rows = selected.reduce((total, allocation) => total + allocation.rows, 0);
  if (context.state.focusedPlacement)
    rows = Math.max(rows, context.state.focusedPlacement.y + context.state.focusedPlacement.h);
  let minimumRows = 1;
  if (context.variant === "B" || context.variant === "C") minimumRows = 3;
  return Math.max(minimumRows, Math.min(context.savedContainerRows, rows));
}

export function projectAdaptiveContainerPlacements(
  context: AdaptiveContainerPrototypeContextValue | null,
  sectionId: string,
  placements: readonly SectionGridPlacement[],
  columnCount: number,
  isEditMode: boolean,
): SectionGridPlacement[] {
  if (!context || isEditMode) return [...placements];
  if (sectionId !== context.sectionId) {
    const container = placements.find((placement) => placement.id === context.sectionId);
    if (!container) return [...placements];
    const rows = getPrototypeContainerRows(context, false);
    if (rows === container.h) return [...placements];
    return getCollapsedDisplayLayout(placements, {
      columnCount,
      collapsedItemIds: new Set([context.sectionId]),
      collapsedRowCount: rows,
    });
  }
  const visible = placements.filter((placement) => !isPrototypeItemHidden(context, placement.id, false));
  const projected = visible.map((placement) => {
    const allocation = context.allocations.find((entry) => entry.itemId === placement.id);
    if (!allocation) return placement;
    let y = 0;
    for (const preceding of context.allocations) {
      if (preceding.itemId === allocation.itemId) break;
      if (preceding.pageId === allocation.pageId) y += preceding.rows;
    }
    return { ...placement, x: 0, y, w: columnCount, h: allocation.rows };
  });
  const focused = context.state.focusedPlacement;
  if (
    context.state.focusedItemId &&
    focused &&
    projected.some((placement) => placement.id === context.state.focusedItemId)
  ) {
    return reflowVerticalLayout(
      projected.map((placement) => {
        if (placement.id !== context.state.focusedItemId) return placement;
        return { ...placement, y: focused.y, h: focused.h };
      }),
      { columnCount, pinnedItemId: context.state.focusedItemId },
    );
  }
  return reflowVerticalLayout(projected, { columnCount });
}
