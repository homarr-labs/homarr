import { getLogicalGridSize, LOGICAL_GRID_PITCH } from "~/components/board/layout";
import type { GridPlacement } from "~/components/board/layout";

export interface GridPreviewDomState {
  activeId: string | null;
  changedIds: Set<string>;
}

interface SyncGridPreviewGeometryInput {
  elements: ReadonlyMap<string, HTMLElement>;
  placements: readonly GridPlacement[];
  previewPlacements: readonly GridPlacement[] | null;
  activeId: string | null;
  mode: "drag" | "resize" | null;
  previous: GridPreviewDomState;
}

export const createGridPreviewDomState = (): GridPreviewDomState => ({
  activeId: null,
  changedIds: new Set(),
});

export const syncGridPreviewGeometry = ({
  elements,
  placements,
  previewPlacements,
  activeId,
  mode,
  previous,
}: SyncGridPreviewGeometryInput): GridPreviewDomState => {
  const controlledById = new Map(placements.map((placement) => [placement.id, placement]));
  const changedIds = new Set<string>();

  if (previewPlacements && mode) {
    for (const preview of previewPlacements) {
      const controlled = controlledById.get(preview.id);
      const element = elements.get(preview.id);
      if (!controlled || !element || (mode === "drag" && preview.id === activeId)) continue;
      if (arePlacementsEqual(controlled, preview)) continue;

      applyPreviewGeometry(element, controlled, preview);
      changedIds.add(preview.id);
    }
  }

  for (const id of previous.changedIds) {
    if (changedIds.has(id)) continue;
    const element = elements.get(id);
    const controlled = controlledById.get(id);
    if (element && controlled) clearPreviewGeometry(element, controlled);
  }

  if (previous.activeId && previous.activeId !== activeId) {
    elements.get(previous.activeId)?.removeAttribute("data-dnd-active");
  }
  if (activeId) elements.get(activeId)?.setAttribute("data-dnd-active", "true");

  return { activeId, changedIds };
};

export const clearGridPreviewGeometry = (
  elements: ReadonlyMap<string, HTMLElement>,
  placements: readonly GridPlacement[],
  state: GridPreviewDomState,
) => {
  const controlledById = new Map(placements.map((placement) => [placement.id, placement]));
  for (const id of state.changedIds) {
    const element = elements.get(id);
    const controlled = controlledById.get(id);
    if (element && controlled) clearPreviewGeometry(element, controlled);
  }
  if (state.activeId) elements.get(state.activeId)?.removeAttribute("data-dnd-active");
};

const applyPreviewGeometry = (element: HTMLElement, controlled: GridPlacement, preview: GridPlacement) => {
  element.style.setProperty("--board-grid-preview-x", `${(preview.x - controlled.x) * LOGICAL_GRID_PITCH}px`);
  element.style.setProperty("--board-grid-preview-y", `${(preview.y - controlled.y) * LOGICAL_GRID_PITCH}px`);
  element.style.setProperty("--board-grid-preview-width", `${getLogicalGridSize(preview.w)}px`);
  element.style.setProperty("--board-grid-preview-height", `${getLogicalGridSize(preview.h)}px`);
  element.setAttribute("data-grid-preview", "true");
  setPlacementAttributes(element, preview);
};

const clearPreviewGeometry = (element: HTMLElement, controlled: GridPlacement) => {
  element.style.removeProperty("--board-grid-preview-x");
  element.style.removeProperty("--board-grid-preview-y");
  element.style.removeProperty("--board-grid-preview-width");
  element.style.removeProperty("--board-grid-preview-height");
  element.removeAttribute("data-grid-preview");
  setPlacementAttributes(element, controlled);
};

const setPlacementAttributes = (element: HTMLElement, placement: GridPlacement) => {
  element.dataset.gridX = String(placement.x);
  element.dataset.gridY = String(placement.y);
  element.dataset.gridW = String(placement.w);
  element.dataset.gridH = String(placement.h);
};

const arePlacementsEqual = (first: GridPlacement, second: GridPlacement) =>
  first.x === second.x && first.y === second.y && first.w === second.w && first.h === second.h;
