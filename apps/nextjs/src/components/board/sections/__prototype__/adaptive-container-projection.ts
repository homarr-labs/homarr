import { getCollapsedDisplayLayout, reflowVerticalLayout } from "~/components/board/layout/reflow";
import type { SectionGridPlacement } from "../grid/use-grid-layout-actions";
import type { AdaptiveContainerPrototypeContextValue } from "./adaptive-container-context";

// Only this scratch fixture opts into the native rendering experiment.
export function isPrototypeItemHidden(
  context: AdaptiveContainerPrototypeContextValue | null,
  itemId: string,
  isEditMode: boolean,
) {
  if (!context || isEditMode) return false;
  if (context.state.focusedItemId === itemId) return false;
  if (itemId === context.statsItemId && !context.settings.showFallback) return true;
  if (context.variant === "B" && (itemId === context.mediaItemId || itemId === context.statsItemId)) {
    if (itemId !== context.state.selectedId) return true;
    // Manual selection retains access even after its activity changes.
    if (!context.state.automatic && context.state.pausedReason === "manual selection") return false;
  }
  return itemId === context.mediaItemId && context.settings.hideInactive && context.activity.canHide;
}

export function getPrototypeMediaRows(context: AdaptiveContainerPrototypeContextValue) {
  if (context.variant !== "C" || context.settings.fitStrategy !== "compact") return context.mediaSavedRows;
  if (context.state.focusedItemId === context.mediaItemId && context.state.focusedPlacement)
    return context.state.focusedPlacement.h;
  if (context.activity.kind === "unknown" || context.activity.kind === "error") return context.mediaSavedRows;
  return Math.min(context.mediaSavedRows, Math.max(1, context.state.probe.playing + context.state.probe.paused));
}

export function getPrototypeContainerRows(context: AdaptiveContainerPrototypeContextValue, isEditMode: boolean) {
  if (isEditMode || context.variant !== "C" || !context.settings.shrinkContainer || context.state.focusedItemId)
    return context.savedContainerRows;
  let rows = 0;
  if (!isPrototypeItemHidden(context, context.mediaItemId, false)) rows += getPrototypeMediaRows(context);
  if (!isPrototypeItemHidden(context, context.statsItemId, false)) rows += 1;
  return Math.max(1, rows);
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
    if (context.variant === "B" && (placement.id === context.mediaItemId || placement.id === context.statsItemId)) {
      return { ...placement, x: 0, y: 0, w: columnCount, h: context.savedContainerRows };
    }
    if (placement.id === context.mediaItemId) return { ...placement, h: getPrototypeMediaRows(context) };
    return placement;
  });
  const focused = context.state.focusedPlacement;
  if (context.state.focusedItemId && focused) {
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
