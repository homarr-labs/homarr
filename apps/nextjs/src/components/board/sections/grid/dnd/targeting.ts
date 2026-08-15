interface RectangleLike {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface GridTargetGeometry {
  id: string;
  parentGridId?: string | null;
  rectangle: RectangleLike;
}

interface GridTargetFallbackInput {
  grids: readonly Pick<GridTargetGeometry, "id" | "parentGridId">[];
  targetGridId: string;
  isEligible: (gridId: string) => boolean;
}

interface PreferredNestedExitTargetInput {
  grids: readonly GridTargetGeometry[];
  pointerTargetId: string;
  sourceGridId: string;
  dragShape: RectangleLike;
  isEligible: (gridId: string) => boolean;
}

const NESTED_EXIT_RETAINED_AREA = 0.7;

/**
 * Keeps pointer precision for entering containers, but lets a large item leave
 * once a clear portion of its projected shape is visibly outside.
 */
export const getPreferredNestedExitTargetId = ({
  grids,
  pointerTargetId,
  sourceGridId,
  dragShape,
  isEligible,
}: PreferredNestedExitTargetInput) => {
  const byId = new Map(grids.map((grid) => [grid.id, grid]));
  const source = byId.get(sourceGridId);
  let current = byId.get(pointerTargetId);
  if (!source || !current || !isSameGridOrAncestor(current.id, source, byId)) return pointerTargetId;

  while (current.parentGridId) {
    if (getCoveredAreaRatio(dragShape, current.rectangle) > NESTED_EXIT_RETAINED_AREA) break;

    const parent = byId.get(current.parentGridId);
    if (!parent || !isEligible(parent.id) || !containsCenter(parent.rectangle, dragShape)) break;
    current = parent;
  }

  return current.id;
};

/**
 * Tries the visible nested grid first, then its ancestors. A full or too-small
 * container must not trap an item that can still move in the parent grid.
 */
export const getGridTargetFallbackIds = ({ grids, targetGridId, isEligible }: GridTargetFallbackInput) => {
  const byId = new Map(grids.map((grid) => [grid.id, grid]));
  const ids: string[] = [];
  const visited = new Set<string>();
  let current = byId.get(targetGridId);

  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    if (!isEligible(current.id)) break;
    ids.push(current.id);
    current = current.parentGridId ? byId.get(current.parentGridId) : undefined;
  }

  return ids;
};

const isSameGridOrAncestor = (
  candidateId: string,
  source: GridTargetGeometry,
  byId: ReadonlyMap<string, GridTargetGeometry>,
) => {
  let current: GridTargetGeometry | undefined = source;
  const visited = new Set<string>();
  while (current) {
    if (current.id === candidateId) return true;
    if (!current.parentGridId || visited.has(current.id)) return false;
    visited.add(current.id);
    current = byId.get(current.parentGridId);
  }
  return false;
};

const getCoveredAreaRatio = (shape: RectangleLike, target: RectangleLike) => {
  const shapeArea = shape.width * shape.height;
  if (!Number.isFinite(shapeArea) || shapeArea <= 0) return 1;

  const width = Math.max(
    0,
    Math.min(shape.left + shape.width, target.left + target.width) - Math.max(shape.left, target.left),
  );
  const height = Math.max(
    0,
    Math.min(shape.top + shape.height, target.top + target.height) - Math.max(shape.top, target.top),
  );
  return (width * height) / shapeArea;
};

const containsCenter = (target: RectangleLike, shape: RectangleLike) => {
  const center = { x: shape.left + shape.width / 2, y: shape.top + shape.height / 2 };
  return (
    center.x >= target.left &&
    center.x <= target.left + target.width &&
    center.y >= target.top &&
    center.y <= target.top + target.height
  );
};
