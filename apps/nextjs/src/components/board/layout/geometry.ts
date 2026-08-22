import type { CSSProperties } from "react";

import { LOGICAL_GRID_CELL_SIZE, LOGICAL_GRID_GAP, LOGICAL_GRID_PITCH } from "./constants";
import type { GridCoordinates, GridPlacement } from "./types";

export const getLogicalTrackSize = (trackCount: number) => {
  const normalizedTrackCount = Math.max(0, toFiniteNumber(trackCount, "trackCount"));
  if (normalizedTrackCount === 0) return 0;

  return normalizedTrackCount * LOGICAL_GRID_CELL_SIZE + (normalizedTrackCount - 1) * LOGICAL_GRID_GAP;
};

/**
 * Returns the complete footprint occupied by grid tracks. Cards are inset
 * inside this footprint so their visual gutters stay fixed while the canvas
 * is scaled.
 */
export const getLogicalGridSize = (trackCount: number) => {
  const normalizedTrackCount = Math.max(0, toFiniteNumber(trackCount, "trackCount"));

  return normalizedTrackCount * LOGICAL_GRID_PITCH;
};

export const getLogicalItemStyle = ({ x, y, w, h }: GridCoordinates): CSSProperties => ({
  position: "absolute",
  left: x * LOGICAL_GRID_PITCH,
  top: y * LOGICAL_GRID_PITCH,
  width: getLogicalGridSize(w),
  height: getLogicalGridSize(h),
});

export const getLayoutRowCount = (placements: readonly GridCoordinates[]) =>
  placements.reduce((rowCount, placement) => Math.max(rowCount, placement.y + placement.h), 0);

export const getGridRowCountForVisualHeight = (visualHeight: number, visualScale: number) => {
  if (!Number.isFinite(visualHeight) || visualHeight <= 0) return 1;
  if (!Number.isFinite(visualScale) || visualScale <= 0) return 1;

  return Math.max(1, Math.ceil(visualHeight / visualScale / LOGICAL_GRID_PITCH));
};

export const normalizeGridPlacement = <TPlacement extends GridPlacement>(
  placement: TPlacement,
  columnCount: number,
): TPlacement => {
  const normalizedColumnCount = toPositiveInteger(columnCount, "columnCount");
  const width = Math.min(toPositiveInteger(placement.w, "placement.w"), normalizedColumnCount);
  const x = Math.min(Math.max(0, toNonNegativeInteger(placement.x)), normalizedColumnCount - width);

  return {
    ...placement,
    x,
    y: toNonNegativeInteger(placement.y),
    w: width,
    h: toPositiveInteger(placement.h, "placement.h"),
  };
};

const toNonNegativeInteger = (value: number) => Math.max(0, Math.trunc(toFiniteNumber(value, "value")));

const toPositiveInteger = (value: number, name: string) => {
  const integer = Math.trunc(toFiniteNumber(value, name));
  if (integer < 1) throw new RangeError(`${name} must be at least 1`);

  return integer;
};

const toFiniteNumber = (value: number, name: string) => {
  if (!Number.isFinite(value)) throw new TypeError(`${name} must be finite`);

  return value;
};
