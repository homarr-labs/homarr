import { getLogicalGridSize, LOGICAL_GRID_PITCH } from "~/components/board/layout";
import type { GridPlacement } from "~/components/board/layout";
import type { GridResizeDirection } from "./types";

interface RectangleLike {
  left: number;
  top: number;
  width: number;
}

interface ProjectedRectangle extends RectangleLike {
  height: number;
}

export interface DragProjectionOrigin {
  initialPointer: { x: number; y: number };
  initialShape: ProjectedRectangle;
}

/**
 * Projects the dragged shape from the grab point instead of dnd-kit's
 * feedback element. The latter can live in a CSS-zoomed overlay whose
 * bounding rectangle is in a different coordinate space from pointer events.
 */
export const getPointerProjectedShape = (origin: DragProjectionOrigin, currentPointer: { x: number; y: number }) => ({
  left: origin.initialShape.left + currentPointer.x - origin.initialPointer.x,
  top: origin.initialShape.top + currentPointer.y - origin.initialPointer.y,
  width: origin.initialShape.width,
  height: origin.initialShape.height,
});

export const getSnappedGridCoordinates = ({
  dragShape,
  target,
  columnCount,
}: {
  dragShape: Pick<RectangleLike, "left" | "top">;
  target: RectangleLike;
  columnCount: number;
}) => {
  const logicalWidth = getLogicalGridSize(columnCount);
  const visualScale = logicalWidth > 0 ? target.width / logicalWidth : 0;
  if (!Number.isFinite(visualScale) || visualScale <= 0) return null;

  return {
    x: Math.round((dragShape.left - target.left) / (LOGICAL_GRID_PITCH * visualScale)),
    y: Math.round((dragShape.top - target.top) / (LOGICAL_GRID_PITCH * visualScale)),
  };
};

export const getSnappedGridDelta = ({
  current,
  initial,
  visualScale,
}: {
  current: { x: number; y: number };
  initial: { x: number; y: number };
  visualScale: number | { x: number; y: number };
}) => {
  const delta = getContinuousGridDelta({ current, initial, visualScale });
  if (!delta) return null;
  return {
    x: Math.round(delta.x),
    y: Math.round(delta.y),
  };
};

export const getContinuousGridDelta = ({
  current,
  initial,
  visualScale,
}: {
  current: { x: number; y: number };
  initial: { x: number; y: number };
  visualScale: number | { x: number; y: number };
}) => {
  const scale = typeof visualScale === "number" ? { x: visualScale, y: visualScale } : visualScale;
  if (!Number.isFinite(scale.x) || scale.x <= 0 || !Number.isFinite(scale.y) || scale.y <= 0) return null;
  return {
    x: (current.x - initial.x) / (LOGICAL_GRID_PITCH * scale.x),
    y: (current.y - initial.y) / (LOGICAL_GRID_PITCH * scale.y),
  };
};

/** Projects a resize continuously while the committed layout remains snapped. */
export const getContinuousResizePlacement = <TPlacement extends GridPlacement>({
  placement,
  direction,
  deltaColumns,
  deltaRows,
  columnCount,
  maxRowCount,
  minWidth = 1,
  minHeight = 1,
}: {
  placement: TPlacement;
  direction: GridResizeDirection;
  deltaColumns: number;
  deltaRows: number;
  columnCount: number;
  maxRowCount: number | null;
  minWidth?: number;
  minHeight?: number;
}): TPlacement => {
  const fixedRight = placement.x + placement.w;
  const fixedBottom = placement.y + placement.h;
  let x = placement.x;
  let y = placement.y;
  let w = placement.w;
  let h = placement.h;

  if (direction.includes("w")) {
    w = clamp(placement.w - deltaColumns, minWidth, fixedRight);
    x = fixedRight - w;
  } else if (direction.includes("e")) {
    w = clamp(placement.w + deltaColumns, minWidth, columnCount - placement.x);
  }

  if (direction.includes("n")) {
    h = clamp(placement.h - deltaRows, minHeight, fixedBottom);
    y = fixedBottom - h;
  } else if (direction.includes("s")) {
    h = clamp(
      placement.h + deltaRows,
      minHeight,
      maxRowCount === null ? Number.MAX_SAFE_INTEGER : maxRowCount - placement.y,
    );
  }

  return { ...placement, x, y, w, h };
};

const clamp = (value: number, minimum: number, maximum: number) => Math.min(Math.max(value, minimum), maximum);
