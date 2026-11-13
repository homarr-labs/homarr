import type { GridCoordinates, GridPlacement } from "~/components/board/layout";

export interface GridRowProjection {
  getDisplayRow: (row: number) => number;
  getLogicalRow: (row: number) => number;
}

export const projectGridCoordinates = <T extends GridCoordinates>(placement: T, projection?: GridRowProjection): T => {
  if (!projection) return placement;
  return { ...placement, y: projection.getDisplayRow(placement.y) };
};

interface RowSpacing {
  row: number;
  extra: number;
}

/** Adds exact display space at row boundaries while saved coordinates stay integral. */
export const createGridRowProjection = <TPlacement extends GridPlacement>(
  placements: readonly TPlacement[],
  minimumHeights: ReadonlyMap<string, number> = new Map(),
) => {
  const spacing: RowSpacing[] = [];
  const getDisplayRow = (row: number) => {
    let displayRow = row;
    for (const entry of spacing) {
      if (entry.row > row) break;
      displayRow += entry.extra;
    }
    return displayRow;
  };

  const byBottom = placements.toSorted((first, second) => first.y + first.h - second.y - second.h);
  for (const placement of byBottom) {
    const height = Math.max(placement.h, minimumHeights.get(placement.id) ?? placement.h);
    const bottom = placement.y + placement.h;
    const available = getDisplayRow(bottom) - getDisplayRow(placement.y);
    const extra = height - available;
    if (extra > 1e-9) spacing.push({ row: bottom, extra });
  }

  const getLogicalRow = (displayRow: number) => {
    let offset = 0;
    for (const entry of spacing) {
      const start = entry.row + offset;
      if (displayRow < start) break;
      if (displayRow <= start + entry.extra) return entry.row;
      offset += entry.extra;
    }
    return displayRow - offset;
  };

  return {
    getDisplayRow,
    getLogicalRow,
    placements: placements.map((placement) => ({
      ...placement,
      y: getDisplayRow(placement.y),
      h: Math.max(placement.h, minimumHeights.get(placement.id) ?? placement.h),
    })),
  };
};
