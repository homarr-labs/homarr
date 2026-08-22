"use client";

import type { RefObject } from "react";
import { useCallback, useLayoutEffect, useRef, useSyncExternalStore } from "react";

import { getLayoutRowCount, getLogicalItemStyle, getLogicalTrackSize } from "~/components/board/layout";
import type { TransactionalGridState } from "./dnd";
import type { GridInteractionStore } from "./grid-interaction-store";
import { clearGridPreviewGeometry, createGridPreviewDomState, syncGridPreviewGeometry } from "./grid-preview-geometry";
import type { SectionGridPlacement } from "./use-grid-layout-actions";

export interface GridInteraction {
  activeId: string;
  sourceGridId: string;
  targetGridId: string | null;
  targetPlacement: SectionGridPlacement | null;
  state: TransactionalGridState<SectionGridPlacement>;
  mode: "drag" | "resize";
  valid: boolean;
  previewRevision: number;
}

interface GridPreviewLayerProps {
  sectionId: string;
  rowCount: number;
  maxRowCount: number | null;
  placements: readonly SectionGridPlacement[];
  gridRef: RefObject<HTMLDivElement | null>;
  entryElements: ReadonlyMap<string, HTMLElement>;
  interactionStore: GridInteractionStore<GridInteraction>;
}

export const GridPreviewLayer = ({
  sectionId,
  rowCount,
  maxRowCount,
  placements,
  gridRef,
  entryElements,
  interactionStore,
}: GridPreviewLayerProps) => {
  const subscribe = useCallback(
    (listener: () => void) => interactionStore.subscribeGrid(sectionId, listener),
    [interactionStore, sectionId],
  );
  const getSnapshot = useCallback(() => interactionStore.getGridSnapshot(sectionId), [interactionStore, sectionId]);
  const interaction = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const previewGrid = interaction?.state.grids.find((grid) => grid.id === sectionId);
  const previewStateRef = useRef(createGridPreviewDomState());
  const placementsRef = useRef(placements);

  const isDragging = interaction?.mode === "drag";
  const isTargetGrid = isDragging && interaction.targetGridId === sectionId;
  let targetPlacement: SectionGridPlacement | null = null;
  if (interaction?.valid && interaction.targetGridId === sectionId) {
    targetPlacement = interaction.targetPlacement;
  }

  const growsDuringDrag =
    isDragging && (isTargetGrid || (interaction.targetGridId === null && interaction.sourceGridId === sectionId));
  const previewRowCount = getLayoutRowCount(previewGrid?.placements ?? placements);
  let renderedRowCount = rowCount;
  if (maxRowCount === null && interaction) {
    renderedRowCount = Math.max(rowCount, previewRowCount);
    if (growsDuringDrag) renderedRowCount += 1;
  }

  useLayoutEffect(() => {
    placementsRef.current = placements;
    previewStateRef.current = syncGridPreviewGeometry({
      elements: entryElements,
      placements,
      previewPlacements: previewGrid?.placements ?? null,
      activeId: interaction?.activeId ?? null,
      mode: interaction?.mode ?? null,
      previous: previewStateRef.current,
    });

    const grid = gridRef.current;
    if (!grid) return;
    grid.dataset.dndDropTarget = String(isTargetGrid);
    if (isTargetGrid) grid.dataset.dndDropValid = String(targetPlacement !== null);
    else delete grid.dataset.dndDropValid;

    if (interaction?.targetGridId === sectionId) {
      grid.dataset.dndPreviewRevision = String(interaction.previewRevision);
    } else {
      delete grid.dataset.dndPreviewRevision;
    }
    grid.style.height = `${getLogicalTrackSize(renderedRowCount)}px`;

    const viewport = grid.parentElement;
    if (viewport?.hasAttribute("data-section-id")) {
      // This grows the viewport to match the inner grid while a drag needs extra room to show a
      // drop target (maxRowCount === null - a "main"/rail section without a fixed cap). A capped
      // section (e.g. a scrollable container, maxRowCount !== null) must never have this set: it
      // isn't just a temporary default here, this effect reruns on every board mutation - so a
      // stray value would silently blow the cap open for the rest of the session, well after any
      // drag ended, since nothing else would ever clear it back out.
      if (maxRowCount === null) {
        viewport.style.setProperty("--board-grid-drag-height", `${getLogicalTrackSize(renderedRowCount)}px`);
      } else {
        viewport.style.removeProperty("--board-grid-drag-height");
      }
    }
  }, [
    entryElements,
    gridRef,
    interaction,
    isTargetGrid,
    placements,
    previewGrid?.placements,
    renderedRowCount,
    sectionId,
    targetPlacement,
  ]);

  useLayoutEffect(
    () => () => {
      clearGridPreviewGeometry(entryElements, placementsRef.current, previewStateRef.current);
      const grid = gridRef.current;
      if (!grid) return;
      grid.removeAttribute("data-dnd-drop-target");
      grid.removeAttribute("data-dnd-drop-valid");
      grid.removeAttribute("data-dnd-preview-revision");
      grid.parentElement?.style.removeProperty("--board-grid-drag-height");
    },
    [entryElements, gridRef],
  );

  if (!targetPlacement) return null;

  return (
    <div
      className="board-grid-placeholder"
      style={getLogicalItemStyle(targetPlacement)}
      data-grid-placeholder-for={interaction?.activeId}
      data-grid-placeholder-mode={interaction?.mode}
      data-grid-x={targetPlacement.x}
      data-grid-y={targetPlacement.y}
      data-grid-w={targetPlacement.w}
      data-grid-h={targetPlacement.h}
      aria-hidden="true"
    />
  );
};
