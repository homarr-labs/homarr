import { getLogicalTrackSize, LOGICAL_GRID_PITCH } from "~/components/board/layout";

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
  const logicalWidth = getLogicalTrackSize(columnCount);
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
  const scale = typeof visualScale === "number" ? { x: visualScale, y: visualScale } : visualScale;
  if (!Number.isFinite(scale.x) || scale.x <= 0 || !Number.isFinite(scale.y) || scale.y <= 0) return null;
  return {
    x: Math.round((current.x - initial.x) / (LOGICAL_GRID_PITCH * scale.x)),
    y: Math.round((current.y - initial.y) / (LOGICAL_GRID_PITCH * scale.y)),
  };
};
