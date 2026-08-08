import { COLLAPSED_SECTION_ROW_COUNT } from "./constants";
import { normalizeGridPlacement } from "./geometry";
import type { GridPlacement } from "./types";

interface ReflowOptions {
  columnCount: number;
  /**
   * A pinned item keeps its requested x/y while every other item compacts
   * around it. Use this for the item currently being moved or resized.
   */
  pinnedItemId?: string;
}

interface CollapsedLayoutOptions {
  columnCount: number;
  collapsedItemIds: ReadonlySet<string>;
  collapsedRowCount?: number;
}

export const doGridPlacementsOverlap = (first: GridPlacement, second: GridPlacement) =>
  first.x < second.x + second.w &&
  first.x + first.w > second.x &&
  first.y < second.y + second.h &&
  first.y + first.h > second.y;

/**
 * Resolves overlaps and vertically compacts items. Ordering is based on the
 * persisted position and stable id, so the result does not depend on React or
 * database array order.
 */
export const reflowVerticalLayout = <TPlacement extends GridPlacement>(
  placements: readonly TPlacement[],
  { columnCount, pinnedItemId }: ReflowOptions,
): TPlacement[] => {
  assertUniqueIds(placements);

  const normalized = placements.map((placement) => normalizeGridPlacement(placement, columnCount));
  const pinned = pinnedItemId ? normalized.find((placement) => placement.id === pinnedItemId) : undefined;

  if (pinnedItemId && !pinned) {
    throw new Error(`Pinned grid item "${pinnedItemId}" does not exist`);
  }

  const placed: TPlacement[] = pinned ? [pinned] : [];
  const candidates = normalized.filter((placement) => placement.id !== pinnedItemId).toSorted(comparePlacements);

  for (const candidate of candidates) {
    placed.push({
      ...candidate,
      y: findFirstAvailableRow(candidate, placed),
    });
  }

  const byId = new Map(placed.map((placement) => [placement.id, placement]));
  return normalized.map((placement) => getRequiredPlacement(byId, placement.id));
};

/**
 * Produces the view-only layout after inline containers are collapsed. Only
 * display geometry changes; callers retain the persisted expanded height.
 */
export const getCollapsedDisplayLayout = <TPlacement extends GridPlacement>(
  placements: readonly TPlacement[],
  { columnCount, collapsedItemIds, collapsedRowCount = COLLAPSED_SECTION_ROW_COUNT }: CollapsedLayoutOptions,
): TPlacement[] => {
  if (!Number.isFinite(collapsedRowCount) || collapsedRowCount <= 0) {
    throw new RangeError("collapsedRowCount must be positive and finite");
  }

  const normalized = placements.map((placement) => normalizeGridPlacement(placement, columnCount));
  const displayPlacements = normalized.map((placement) =>
    collapsedItemIds.has(placement.id)
      ? {
          ...placement,
          h: collapsedRowCount,
        }
      : placement,
  );

  return reflowCollapsedDisplayLayout(normalized, displayPlacements, collapsedItemIds, collapsedRowCount);
};

/**
 * Applies the requested placement and pins it while neighbors compact into
 * free space or move down. This is the deterministic fallback used by
 * keyboard/numeric editing and can also validate a drag library result.
 */
export const placeGridItem = <TPlacement extends GridPlacement>(
  placements: readonly TPlacement[],
  nextPlacement: TPlacement,
  columnCount: number,
) => {
  if (!placements.some((placement) => placement.id === nextPlacement.id)) {
    throw new Error(`Grid item "${nextPlacement.id}" does not exist`);
  }

  return reflowVerticalLayout(
    placements.map((placement) => (placement.id === nextPlacement.id ? nextPlacement : placement)),
    {
      columnCount,
      pinnedItemId: nextPlacement.id,
    },
  );
};

export const sortGridPlacementsForReadingOrder = <TPlacement extends GridPlacement>(
  placements: readonly TPlacement[],
) => placements.toSorted(comparePlacements);

const findFirstAvailableRow = (candidate: GridPlacement, placed: readonly GridPlacement[]) => {
  let y = 0;
  for (;;) {
    const atRow = { ...candidate, y };
    const collisions = placed.filter((placement) => doGridPlacementsOverlap(atRow, placement));
    if (collisions.length === 0) return y;

    y = Math.max(...collisions.map((placement) => placement.y + placement.h));
  }
};

const reflowCollapsedDisplayLayout = <TPlacement extends GridPlacement>(
  expandedPlacements: readonly TPlacement[],
  displayPlacements: readonly TPlacement[],
  collapsedItemIds: ReadonlySet<string>,
  collapsedRowCount: number,
): TPlacement[] => {
  assertUniqueIds(expandedPlacements);
  const displayById = new Map(displayPlacements.map((placement) => [placement.id, placement]));
  const collapsedPlacements = expandedPlacements.filter((placement) => collapsedItemIds.has(placement.id));
  const placed: TPlacement[] = [];

  for (const expandedPlacement of expandedPlacements.toSorted(comparePlacements)) {
    const candidate = getRequiredPlacement(displayById, expandedPlacement.id);
    const verticalShift = getCollapsedVerticalShift(expandedPlacement, collapsedPlacements, collapsedRowCount);
    placed.push({
      ...candidate,
      y: findFirstAvailableRowAtOrAfter(candidate, placed, Math.max(0, candidate.y - verticalShift)),
    });
  }

  const byId = new Map(placed.map((placement) => [placement.id, placement]));
  return displayPlacements.map((placement) => getRequiredPlacement(byId, placement.id));
};

const getCollapsedVerticalShift = (
  candidate: GridPlacement,
  collapsedPlacements: readonly GridPlacement[],
  collapsedRowCount: number,
) => {
  const removedIntervals = collapsedPlacements
    .filter(
      (collapsed) =>
        collapsed.id !== candidate.id &&
        collapsed.y + collapsed.h <= candidate.y &&
        doGridPlacementsOverlapHorizontally(candidate, collapsed),
    )
    .map((collapsed) => ({ start: collapsed.y + collapsedRowCount, end: collapsed.y + collapsed.h }))
    .toSorted((first, second) => first.start - second.start || first.end - second.end);

  let shift = 0;
  let intervalEnd = Number.NEGATIVE_INFINITY;
  for (const interval of removedIntervals) {
    const start = Math.max(interval.start, intervalEnd);
    if (interval.end > start) shift += interval.end - start;
    intervalEnd = Math.max(intervalEnd, interval.end);
  }
  return shift;
};

const doGridPlacementsOverlapHorizontally = (first: GridPlacement, second: GridPlacement) =>
  first.x < second.x + second.w && first.x + first.w > second.x;

const findFirstAvailableRowAtOrAfter = (
  candidate: GridPlacement,
  placed: readonly GridPlacement[],
  minimumRow: number,
) => {
  let y = minimumRow;
  for (;;) {
    const atRow = { ...candidate, y };
    const collisions = placed.filter((placement) => doGridPlacementsOverlap(atRow, placement));
    if (collisions.length === 0) return y;

    y = Math.max(...collisions.map((placement) => placement.y + placement.h));
  }
};

const comparePlacements = (first: GridPlacement, second: GridPlacement) =>
  first.y - second.y || first.x - second.x || (first.id === second.id ? 0 : first.id < second.id ? -1 : 1);

const assertUniqueIds = (placements: readonly GridPlacement[]) => {
  const ids = new Set<string>();
  for (const placement of placements) {
    if (ids.has(placement.id)) throw new Error(`Duplicate grid item id "${placement.id}"`);
    ids.add(placement.id);
  }
};

const getRequiredPlacement = <TPlacement extends GridPlacement>(
  placements: ReadonlyMap<string, TPlacement>,
  id: string,
) => {
  const placement = placements.get(id);
  if (!placement) throw new Error(`Grid item "${id}" was lost during layout`);

  return placement;
};
