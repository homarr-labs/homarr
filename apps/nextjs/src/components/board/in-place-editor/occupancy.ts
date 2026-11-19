import type { AreaRect } from "./types";

export interface OccupancyPlacement {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SectionOccupancy {
  sectionId: string;
  columnCount: number;
  rowCount: number;
  maxRowCount: number | null;
  placements: readonly OccupancyPlacement[];
}

export interface CellPoint {
  x: number;
  y: number;
}

const key = (x: number, y: number) => `${x},${y}`;

export const buildOccupiedCells = (placements: readonly OccupancyPlacement[], excludeId?: string) => {
  const occupied = new Set<string>();
  for (const placement of placements) {
    if (placement.id === excludeId) continue;
    for (let y = placement.y; y < placement.y + placement.h; y++) {
      for (let x = placement.x; x < placement.x + placement.w; x++) occupied.add(key(x, y));
    }
  }
  return occupied;
};

export const isCellFree = (occupied: ReadonlySet<string>, cell: CellPoint) => !occupied.has(key(cell.x, cell.y));

const getRowLimit = (section: Pick<SectionOccupancy, "rowCount" | "maxRowCount">) =>
  section.maxRowCount ?? Number.POSITIVE_INFINITY;

export const fits = (
  section: Pick<SectionOccupancy, "columnCount" | "rowCount" | "maxRowCount">,
  occupied: ReadonlySet<string>,
  area: AreaRect,
) => {
  if (area.x < 0 || area.y < 0 || area.w < 1 || area.h < 1) return false;
  if (area.x + area.w > section.columnCount) return false;
  if (area.y + area.h > getRowLimit(section)) return false;
  for (let y = area.y; y < area.y + area.h; y++) {
    for (let x = area.x; x < area.x + area.w; x++) {
      if (occupied.has(key(x, y))) return false;
    }
  }
  return true;
};

export const getFreeRect = (
  section: Pick<SectionOccupancy, "columnCount" | "rowCount" | "maxRowCount">,
  occupied: ReadonlySet<string>,
  anchor: CellPoint,
  pointer: CellPoint,
): AreaRect => {
  const dx = Math.sign(pointer.x - anchor.x);
  const dy = Math.sign(pointer.y - anchor.y);
  let x0 = anchor.x;
  let x1 = anchor.x;
  let y0 = anchor.y;
  let y1 = anchor.y;
  const rowLimit = getRowLimit(section);
  const columnFree = (x: number) => {
    if (x < 0 || x >= section.columnCount) return false;
    for (let y = y0; y <= y1; y++) if (occupied.has(key(x, y))) return false;
    return true;
  };
  const rowFree = (y: number) => {
    if (y < 0 || y >= rowLimit) return false;
    for (let x = x0; x <= x1; x++) if (occupied.has(key(x, y))) return false;
    return true;
  };

  let grew = true;
  while (grew) {
    grew = false;
    if (dx > 0 && x1 < pointer.x && columnFree(x1 + 1)) {
      x1++;
      grew = true;
    }
    if (dx < 0 && x0 > pointer.x && columnFree(x0 - 1)) {
      x0--;
      grew = true;
    }
    if (dy > 0 && y1 < pointer.y && rowFree(y1 + 1)) {
      y1++;
      grew = true;
    }
    if (dy < 0 && y0 > pointer.y && rowFree(y0 - 1)) {
      y0--;
      grew = true;
    }
  }

  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
};

export const firstFreeCell = (
  placements: readonly OccupancyPlacement[],
  columnCount: number,
  rowLimit = 999,
): CellPoint | null => {
  const occupied = buildOccupiedCells(placements);
  for (let y = 0; y < rowLimit; y++) {
    for (let x = 0; x < columnCount; x++) {
      if (!occupied.has(key(x, y))) return { x, y };
    }
  }
  return null;
};
