import { doGridPlacementsOverlap, getLayoutRowCount, normalizeGridPlacement } from "~/components/board/layout";
import type { GridPlacement } from "~/components/board/layout";
import type {
  BeginGridTransactionInput,
  GridMoveGuard,
  GridMoveInput,
  GridMoveOptions,
  GridOperationRejection,
  GridPreviewResult,
  GridResizeDirection,
  GridResizeInput,
  GridTransaction,
  TransactionalGrid,
  TransactionalGridState,
} from "./types";

/**
 * Starts an immutable interaction transaction. The returned snapshot is the
 * rollback source for dnd-kit's `onDragCancel` and the baseline for every
 * `onDragMove` / `onDragOver` preview.
 */
export const beginGridTransaction = <TPlacement extends GridPlacement>(
  state: TransactionalGridState<TPlacement>,
  input: BeginGridTransactionInput,
): GridTransaction<TPlacement> => {
  validateGridState(state);

  const located = findPlacement(state, input.activeId);
  if (!located) throw new Error(`Grid item "${input.activeId}" does not exist`);
  if (input.sourceGridId !== undefined && located.grid.id !== input.sourceGridId) {
    throw new Error(`Grid item "${input.activeId}" belongs to grid "${located.grid.id}", not "${input.sourceGridId}"`);
  }

  const snapshot = cloneGridState(state);
  return {
    activeId: input.activeId,
    sourceGridId: located.grid.id,
    snapshot,
    preview: cloneGridState(snapshot),
  };
};

/**
 * Computes a move preview from the transaction snapshot. Same-grid moves that
 * collide with one item swap into that item's slot when both resulting
 * placements remain valid; every other move pins the active item and pushes
 * only actual collisions. Intentional empty rows remain untouched.
 */
export const previewGridMove = <TPlacement extends GridPlacement>(
  transaction: GridTransaction<TPlacement>,
  input: GridMoveInput,
  options: GridMoveOptions<TPlacement> = {},
): GridPreviewResult<TPlacement> => {
  const sourceGrid = getGrid(transaction.snapshot, transaction.sourceGridId);
  const targetGrid = findGrid(transaction.snapshot, input.targetGridId);
  if (!targetGrid) {
    return rejected(transaction, {
      code: "unknown-target-grid",
      message: `Grid "${input.targetGridId}" does not exist`,
    });
  }

  const active = getPlacement(sourceGrid, transaction.activeId);
  const targetIsDescendant = isTargetWithinActiveSubtree(transaction.snapshot, targetGrid.id, transaction.activeId);
  if (targetIsDescendant) {
    return rejected(transaction, {
      code: "descendant-target",
      message: `Grid "${targetGrid.id}" is inside item "${active.id}"`,
    });
  }

  const guardRejection = evaluateMoveGuards(options.guards ?? [], {
    active,
    sourceGrid,
    targetGrid,
    snapshot: transaction.snapshot,
    targetIsDescendant,
  });
  if (guardRejection) return rejected(transaction, guardRejection);

  if (!Number.isFinite(input.x) || !Number.isFinite(input.y)) {
    return rejected(transaction, { code: "invalid-coordinate" });
  }
  if (active.w > targetGrid.columnCount || active.h > getMaximumRows(targetGrid)) {
    return rejected(transaction, { code: "item-too-large" });
  }

  const nextActive = clampMovePlacement(active, input, targetGrid);
  const preview =
    sourceGrid.id === targetGrid.id
      ? previewSameGridMove(transaction.snapshot, sourceGrid, active, nextActive)
      : previewCrossGridMove(transaction.snapshot, sourceGrid, targetGrid, active, nextActive);

  if (!fitsRowLimits(preview)) return rejected(transaction, { code: "row-limit" });
  validateGridState(preview);
  return accepted(transaction, preview);
};

/**
 * Computes an eight-direction resize preview. Deltas describe movement of the
 * selected handle, while the opposite edge stays anchored. Bounds and caller
 * constraints are applied before pinned collision reflow.
 */
export const previewGridResize = <TPlacement extends GridPlacement>(
  transaction: GridTransaction<TPlacement>,
  input: GridResizeInput,
): GridPreviewResult<TPlacement> => {
  const grid = getGrid(transaction.snapshot, transaction.sourceGridId);
  const active = getPlacement(grid, transaction.activeId);

  if (!Number.isFinite(input.deltaColumns) || !Number.isFinite(input.deltaRows)) {
    return rejected(transaction, { code: "invalid-coordinate" });
  }

  const constraints = getResizeConstraints(input, grid);
  const resized = resizePlacement(active, input.direction, input, constraints, grid);
  if (!resized) return rejected(transaction, { code: "resize-constraints" });

  const preview = cloneGridState(transaction.snapshot);
  const previewGrid = getGrid(preview, grid.id);
  previewGrid.placements = areCoordinatesEqual(active, resized)
    ? previewGrid.placements
    : resolvePinnedGridCollisions(previewGrid.placements, resized, previewGrid.columnCount);

  if (!fitsRowLimits(preview)) return rejected(transaction, { code: "row-limit" });
  validateGridState(preview);
  return accepted(transaction, preview);
};

/** Returns the latest accepted preview as one atomic state update. */
export const commitGridTransaction = <TPlacement extends GridPlacement>(
  transaction: GridTransaction<TPlacement>,
): TransactionalGridState<TPlacement> => cloneGridState(transaction.preview);

/** Restores the exact interaction-start snapshot. */
export const cancelGridTransaction = <TPlacement extends GridPlacement>(
  transaction: GridTransaction<TPlacement>,
): TransactionalGridState<TPlacement> => cloneGridState(transaction.snapshot);

const previewSameGridMove = <TPlacement extends GridPlacement>(
  state: TransactionalGridState<TPlacement>,
  grid: TransactionalGrid<TPlacement>,
  active: TPlacement,
  nextActive: TPlacement,
) => {
  const preview = cloneGridState(state);
  const previewGrid = getGrid(preview, grid.id);
  if (areCoordinatesEqual(active, nextActive)) return preview;

  const collisions = grid.placements.filter(
    (placement) => placement.id !== active.id && doGridPlacementsOverlap(placement, nextActive),
  );
  const displacedCandidate = collisions.length === 1 ? collisions[0] : undefined;
  const displaced = displacedCandidate && !isContainerPlacement(displacedCandidate) ? displacedCandidate : undefined;

  const swapped = displaced
    ? grid.placements.map((placement) => {
        if (placement.id === active.id) return { ...placement, x: displaced.x, y: displaced.y };
        if (placement.id === displaced.id) return { ...placement, x: active.x, y: active.y };
        return { ...placement };
      })
    : null;

  previewGrid.placements =
    swapped && placementsFitGrid(swapped, grid)
      ? swapped
      : resolvePinnedGridCollisions(grid.placements, nextActive, grid.columnCount);
  return preview;
};

const placementsFitGrid = <TPlacement extends GridPlacement>(
  placements: readonly TPlacement[],
  grid: TransactionalGrid<TPlacement>,
) =>
  placements.every(
    (placement) =>
      placement.x >= 0 &&
      placement.y >= 0 &&
      placement.x + placement.w <= grid.columnCount &&
      (grid.maxRowCount === undefined || grid.maxRowCount === null || placement.y + placement.h <= grid.maxRowCount),
  ) &&
  placements.every((placement, index) =>
    placements.slice(index + 1).every((other) => !doGridPlacementsOverlap(placement, other)),
  );

const previewCrossGridMove = <TPlacement extends GridPlacement>(
  state: TransactionalGridState<TPlacement>,
  sourceGrid: TransactionalGrid<TPlacement>,
  targetGrid: TransactionalGrid<TPlacement>,
  active: TPlacement,
  nextActive: TPlacement,
) => {
  const preview = cloneGridState(state);
  const previewSource = getGrid(preview, sourceGrid.id);
  const previewTarget = getGrid(preview, targetGrid.id);

  previewSource.placements = sourceGrid.placements
    .filter((placement) => placement.id !== active.id)
    .map((placement) => ({ ...placement }));
  previewTarget.placements = resolvePinnedGridCollisions(
    [...targetGrid.placements, nextActive],
    nextActive,
    targetGrid.columnCount,
  );

  preview.grids = preview.grids.map((grid) =>
    grid.ownerPlacementId === active.id ? { ...grid, parentGridId: targetGrid.id } : grid,
  );
  return preview;
};

/**
 * Keeps stationary containers fixed, resolves the active placement around
 * those obstacles, and then pushes only the deterministic item collision chain
 * downward. A container can still be the active placement and push items, but
 * no active placement can displace another container.
 */
export const resolvePinnedGridCollisions = <TPlacement extends GridPlacement>(
  placements: readonly TPlacement[],
  pinnedPlacement: TPlacement,
  columnCount: number,
): TPlacement[] => {
  const normalized = placements.map((placement) =>
    normalizeGridPlacement(placement.id === pinnedPlacement.id ? pinnedPlacement : placement, columnCount),
  );
  const pinned = normalized.find((placement) => placement.id === pinnedPlacement.id);
  if (!pinned) throw new Error(`Pinned grid item "${pinnedPlacement.id}" does not exist`);

  const fixedContainers = normalized.filter(
    (placement) => placement.id !== pinned.id && isContainerPlacement(placement),
  );
  const placed: TPlacement[] = [...fixedContainers];
  let resolvedPinned = pinned;
  for (;;) {
    const collisions = placed.filter((placement) => doGridPlacementsOverlap(resolvedPinned, placement));
    if (collisions.length === 0) break;
    resolvedPinned = {
      ...resolvedPinned,
      y: Math.max(...collisions.map((placement) => placement.y + placement.h)),
    };
  }
  placed.push(resolvedPinned);

  const candidates = normalized
    .filter((placement) => placement.id !== pinned.id && !isContainerPlacement(placement))
    .toSorted(comparePlacements);
  for (const candidate of candidates) {
    let resolved = candidate;
    for (;;) {
      const collisions = placed.filter((placement) => doGridPlacementsOverlap(resolved, placement));
      if (collisions.length === 0) break;
      resolved = {
        ...resolved,
        y: Math.max(...collisions.map((placement) => placement.y + placement.h)),
      };
    }
    placed.push(resolved);
  }

  const byId = new Map(placed.map((placement) => [placement.id, placement]));
  return normalized.map((placement) => byId.get(placement.id) ?? placement);
};

const comparePlacements = (first: GridPlacement, second: GridPlacement) =>
  first.y - second.y || first.x - second.x || first.id.localeCompare(second.id);

const isContainerPlacement = (placement: GridPlacement) => "type" in placement && placement.type === "section";

const clampMovePlacement = <TPlacement extends GridPlacement>(
  placement: TPlacement,
  input: GridMoveInput,
  grid: TransactionalGrid<TPlacement>,
) => {
  const maximumX = grid.columnCount - placement.w;
  const maximumY = getMaximumRows(grid) - placement.h;
  return {
    ...placement,
    x: clamp(Math.trunc(input.x), 0, maximumX),
    y: clamp(Math.trunc(input.y), 0, maximumY),
  };
};

interface ResolvedResizeConstraints {
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
}

const getResizeConstraints = <TPlacement extends GridPlacement>(
  input: GridResizeInput,
  grid: TransactionalGrid<TPlacement>,
): ResolvedResizeConstraints => {
  const minWidth = toPositiveInteger(input.minWidth ?? 1, "minWidth");
  const minHeight = toPositiveInteger(input.minHeight ?? 1, "minHeight");
  const maxWidth = toPositiveInteger(input.maxWidth ?? grid.columnCount, "maxWidth");
  const maxHeight = toPositiveInteger(input.maxHeight ?? getMaximumRows(grid), "maxHeight");
  if (maxWidth < minWidth) throw new RangeError("maxWidth must be greater than or equal to minWidth");
  if (maxHeight < minHeight) throw new RangeError("maxHeight must be greater than or equal to minHeight");

  return { minWidth, minHeight, maxWidth, maxHeight };
};

const resizePlacement = <TPlacement extends GridPlacement>(
  placement: TPlacement,
  direction: GridResizeDirection,
  input: GridResizeInput,
  constraints: ResolvedResizeConstraints,
  grid: TransactionalGrid<TPlacement>,
): TPlacement | null => {
  const deltaX = Math.trunc(input.deltaColumns);
  const deltaY = Math.trunc(input.deltaRows);
  const resizeWest = direction.includes("w");
  const resizeEast = direction.includes("e");
  const resizeNorth = direction.includes("n");
  const resizeSouth = direction.includes("s");

  let x = placement.x;
  let y = placement.y;
  let width = placement.w;
  let height = placement.h;

  if (resizeWest) {
    const fixedRight = placement.x + placement.w;
    const maximumWidth = Math.min(constraints.maxWidth, fixedRight);
    if (constraints.minWidth > maximumWidth) return null;
    width = clamp(placement.w - deltaX, constraints.minWidth, maximumWidth);
    x = fixedRight - width;
  } else if (resizeEast) {
    const maximumWidth = Math.min(constraints.maxWidth, grid.columnCount - placement.x);
    if (constraints.minWidth > maximumWidth) return null;
    width = clamp(placement.w + deltaX, constraints.minWidth, maximumWidth);
  }

  if (resizeNorth) {
    const fixedBottom = placement.y + placement.h;
    const maximumHeight = Math.min(constraints.maxHeight, fixedBottom);
    if (constraints.minHeight > maximumHeight) return null;
    height = clamp(placement.h - deltaY, constraints.minHeight, maximumHeight);
    y = fixedBottom - height;
  } else if (resizeSouth) {
    const maximumHeight = Math.min(constraints.maxHeight, getMaximumRows(grid) - placement.y);
    if (constraints.minHeight > maximumHeight) return null;
    height = clamp(placement.h + deltaY, constraints.minHeight, maximumHeight);
  }

  return { ...placement, x, y, w: width, h: height };
};

const evaluateMoveGuards = <TPlacement extends GridPlacement>(
  guards: readonly GridMoveGuard<TPlacement>[],
  context: Parameters<GridMoveGuard<TPlacement>>[0],
): GridOperationRejection | null => {
  for (const guard of guards) {
    const result = guard(context);
    if (result === true) continue;
    if (result === false) return { code: "guard-rejected" };
    return result;
  }
  return null;
};

const isTargetWithinActiveSubtree = <TPlacement extends GridPlacement>(
  state: TransactionalGridState<TPlacement>,
  targetGridId: string,
  activeId: string,
) => {
  let current: TransactionalGrid<TPlacement> | undefined = findGrid(state, targetGridId);
  const visited = new Set<string>();
  while (current) {
    if (current.ownerPlacementId === activeId) return true;
    if (!current.parentGridId || visited.has(current.id)) return false;
    visited.add(current.id);
    current = findGrid(state, current.parentGridId);
  }
  return false;
};

const accepted = <TPlacement extends GridPlacement>(
  transaction: GridTransaction<TPlacement>,
  preview: TransactionalGridState<TPlacement>,
): GridPreviewResult<TPlacement> => ({
  accepted: true,
  transaction: { ...transaction, preview },
});

const rejected = <TPlacement extends GridPlacement>(
  transaction: GridTransaction<TPlacement>,
  rejection: GridOperationRejection,
): GridPreviewResult<TPlacement> => ({ accepted: false, transaction, rejection });

const fitsRowLimits = <TPlacement extends GridPlacement>(state: TransactionalGridState<TPlacement>) =>
  state.grids.every((grid) => {
    if (grid.maxRowCount === undefined || grid.maxRowCount === null) return true;
    return getLayoutRowCount(grid.placements) <= grid.maxRowCount;
  });

const getMaximumRows = <TPlacement extends GridPlacement>(grid: TransactionalGrid<TPlacement>) =>
  grid.maxRowCount ?? Number.MAX_SAFE_INTEGER;

const cloneGridState = <TPlacement extends GridPlacement>(
  state: TransactionalGridState<TPlacement>,
): TransactionalGridState<TPlacement> => ({
  grids: state.grids.map((grid) => ({
    ...grid,
    placements: grid.placements.map((placement) => ({ ...placement })),
  })),
});

const findGrid = <TPlacement extends GridPlacement>(state: TransactionalGridState<TPlacement>, gridId: string) =>
  state.grids.find((grid) => grid.id === gridId);

const getGrid = <TPlacement extends GridPlacement>(state: TransactionalGridState<TPlacement>, gridId: string) => {
  const grid = findGrid(state, gridId);
  if (!grid) throw new Error(`Grid "${gridId}" does not exist`);
  return grid;
};

const getPlacement = <TPlacement extends GridPlacement>(grid: TransactionalGrid<TPlacement>, itemId: string) => {
  const placement = grid.placements.find((candidate) => candidate.id === itemId);
  if (!placement) throw new Error(`Grid item "${itemId}" does not exist in grid "${grid.id}"`);
  return placement;
};

const findPlacement = <TPlacement extends GridPlacement>(state: TransactionalGridState<TPlacement>, itemId: string) => {
  for (const grid of state.grids) {
    const placement = grid.placements.find((candidate) => candidate.id === itemId);
    if (placement) return { grid, placement };
  }
  return null;
};

const areCoordinatesEqual = (first: GridPlacement, second: GridPlacement) =>
  first.x === second.x && first.y === second.y && first.w === second.w && first.h === second.h;

const clamp = (value: number, minimum: number, maximum: number) => Math.min(Math.max(value, minimum), maximum);

const toPositiveInteger = (value: number, name: string) => {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 1) {
    throw new RangeError(`${name} must be a positive integer`);
  }
  return value;
};

const validateGridState = <TPlacement extends GridPlacement>(state: TransactionalGridState<TPlacement>) => {
  const gridIds = new Set<string>();
  const placementIds = new Set<string>();
  const ownerIds = new Set<string>();

  for (const grid of state.grids) {
    if (gridIds.has(grid.id)) throw new Error(`Duplicate grid id "${grid.id}"`);
    gridIds.add(grid.id);
    toPositiveInteger(grid.columnCount, `columnCount for grid "${grid.id}"`);
    if (grid.maxRowCount !== undefined && grid.maxRowCount !== null) {
      toPositiveInteger(grid.maxRowCount, `maxRowCount for grid "${grid.id}"`);
    }

    for (const placement of grid.placements) {
      if (placementIds.has(placement.id)) throw new Error(`Duplicate grid item id "${placement.id}"`);
      placementIds.add(placement.id);
      validatePlacementBounds(placement, grid);
    }
    for (let index = 0; index < grid.placements.length; index += 1) {
      const placement = grid.placements[index];
      if (!placement) continue;
      for (const other of grid.placements.slice(index + 1)) {
        if (doGridPlacementsOverlap(placement, other)) {
          throw new Error(`Grid items "${placement.id}" and "${other.id}" overlap in grid "${grid.id}"`);
        }
      }
    }
  }

  for (const grid of state.grids) {
    if (grid.parentGridId && !gridIds.has(grid.parentGridId)) {
      throw new Error(`Parent grid "${grid.parentGridId}" for grid "${grid.id}" does not exist`);
    }
    if (grid.ownerPlacementId) {
      if (!grid.parentGridId) throw new Error(`Owned grid "${grid.id}" must have a parent grid`);
      if (ownerIds.has(grid.ownerPlacementId)) {
        throw new Error(`Grid item "${grid.ownerPlacementId}" owns more than one grid`);
      }
      ownerIds.add(grid.ownerPlacementId);
      const parent = getGrid(state, grid.parentGridId);
      if (!parent.placements.some((placement) => placement.id === grid.ownerPlacementId)) {
        throw new Error(`Owner item "${grid.ownerPlacementId}" does not exist in parent grid "${grid.parentGridId}"`);
      }
    }
  }

  for (const grid of state.grids) {
    const visited = new Set<string>();
    let current: TransactionalGrid<TPlacement> | undefined = grid;
    while (current?.parentGridId) {
      if (visited.has(current.id)) throw new Error(`Grid hierarchy contains a cycle at "${current.id}"`);
      visited.add(current.id);
      current = getGrid(state, current.parentGridId);
    }
  }
};

const validatePlacementBounds = <TPlacement extends GridPlacement>(
  placement: TPlacement,
  grid: TransactionalGrid<TPlacement>,
) => {
  const values = [placement.x, placement.y, placement.w, placement.h];
  if (values.some((value) => !Number.isFinite(value) || !Number.isInteger(value))) {
    throw new Error(`Grid item "${placement.id}" must use finite integer coordinates`);
  }
  if (placement.x < 0 || placement.y < 0 || placement.w < 1 || placement.h < 1) {
    throw new Error(`Grid item "${placement.id}" has invalid bounds`);
  }
  if (placement.x + placement.w > grid.columnCount) {
    throw new Error(`Grid item "${placement.id}" exceeds grid "${grid.id}" columns`);
  }
  if (placement.y + placement.h > getMaximumRows(grid)) {
    throw new Error(`Grid item "${placement.id}" exceeds grid "${grid.id}" rows`);
  }
};
