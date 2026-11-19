"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";

import { AreaOverlay } from "./area-overlay";
import { EmptyCellLayer } from "./empty-cell-layer";
import type { OccupancyPlacement, SectionOccupancy } from "./occupancy";
import { registerSection, useAddInPlaceState } from "./store";
import type { GridRowProjection } from "../sections/grid/grid-row-projection";

interface AddInPlaceGridLayerProps {
  sectionId: string;
  columnCount: number;
  rowCount: number;
  maxRowCount: number | null;
  placements: readonly OccupancyPlacement[];
  entryElements: ReadonlyMap<string, HTMLElement>;
  onRowCountChange: (rowCount: number) => void;
  rowProjection?: GridRowProjection;
}

export const AddInPlaceGridLayer = ({
  sectionId,
  columnCount,
  rowCount,
  maxRowCount,
  placements,
  entryElements,
  onRowCountChange,
  rowProjection,
}: AddInPlaceGridLayerProps) => {
  const { session } = useAddInPlaceState();
  const [dragRowCount, setDragRowCount] = useState(0);
  let renderedRowCount = rowCount;
  if (maxRowCount === null) {
    renderedRowCount = Math.max(rowCount, dragRowCount);
    if (session?.sectionId === sectionId) {
      renderedRowCount = Math.max(renderedRowCount, session.area.y + session.area.h + 1);
    }
  }
  useLayoutEffect(() => {
    onRowCountChange(renderedRowCount);
  }, [onRowCountChange, renderedRowCount]);
  const occupancy = useMemo<SectionOccupancy>(
    () => ({
      sectionId,
      columnCount,
      rowCount: renderedRowCount,
      maxRowCount,
      placements: placements.map(({ id, x, y, w, h }) => ({ id, x, y, w, h })),
    }),
    [columnCount, maxRowCount, placements, renderedRowCount, sectionId],
  );

  useEffect(() => registerSection(occupancy), [occupancy]);

  return (
    <>
      {!session && (
        <EmptyCellLayer occupancy={occupancy} onRowCountChange={setDragRowCount} rowProjection={rowProjection} />
      )}
      <AreaOverlay occupancy={occupancy} entryElements={entryElements} rowProjection={rowProjection} />
    </>
  );
};
