"use client";

import { useEffect, useMemo } from "react";

import { AreaOverlay } from "./area-overlay";
import { EmptyCellLayer } from "./empty-cell-layer";
import type { OccupancyPlacement, SectionOccupancy } from "./occupancy";
import { registerSection, useAddInPlaceState } from "./store";

interface AddInPlaceGridLayerProps {
  sectionId: string;
  columnCount: number;
  rowCount: number;
  maxRowCount: number | null;
  placements: readonly OccupancyPlacement[];
  entryElements: ReadonlyMap<string, HTMLElement>;
}

export const AddInPlaceGridLayer = ({
  sectionId,
  columnCount,
  rowCount,
  maxRowCount,
  placements,
  entryElements,
}: AddInPlaceGridLayerProps) => {
  const { session } = useAddInPlaceState();
  const occupancy = useMemo<SectionOccupancy>(
    () => ({
      sectionId,
      columnCount,
      rowCount,
      maxRowCount,
      placements: placements.map(({ id, x, y, w, h }) => ({ id, x, y, w, h })),
    }),
    [columnCount, maxRowCount, placements, rowCount, sectionId],
  );

  useEffect(() => registerSection(occupancy), [occupancy]);

  return (
    <>
      {!session && <EmptyCellLayer occupancy={occupancy} />}
      <AreaOverlay occupancy={occupancy} entryElements={entryElements} />
    </>
  );
};
