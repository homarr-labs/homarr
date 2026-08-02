import type { SectionGridPlacement } from "./use-grid-layout-actions";

/**
 * GridStack's floating mode lets Homarr keep intentional empty rows, but it
 * disables GridStack's built-in swap path. Restore the intuitive subset: when
 * an item lands exactly in an equally-sized item's former slot, exchange the
 * two slots and leave every other item where it started.
 */
export const getDropSwapPlacements = (
  initial: readonly SectionGridPlacement[],
  current: readonly SectionGridPlacement[],
  movedItemId: string,
  bounds: { columnCount: number; rowCount?: number },
): SectionGridPlacement[] | null => {
  const movedInitially = initial.find((placement) => placement.id === movedItemId);
  const movedCurrently = current.find((placement) => placement.id === movedItemId);
  if (!movedInitially || !movedCurrently) return null;
  if (
    movedInitially.x === movedCurrently.x &&
    movedInitially.y === movedCurrently.y &&
    movedInitially.w === movedCurrently.w &&
    movedInitially.h === movedCurrently.h
  ) {
    return null;
  }

  const displaced = initial.find(
    (placement) => placement.id !== movedItemId && placement.x === movedCurrently.x && placement.y === movedCurrently.y,
  );
  if (!displaced) return null;

  const swapped = initial.map((placement) => {
    if (placement.id === movedItemId) {
      return {
        ...placement,
        x: displaced.x,
        y: displaced.y,
      };
    }
    if (placement.id === displaced.id) {
      return {
        ...placement,
        x: movedInitially.x,
        y: movedInitially.y,
      };
    }
    return placement;
  });

  return placementsFit(swapped, bounds) ? swapped : null;
};

const placementsFit = (
  placements: readonly SectionGridPlacement[],
  { columnCount, rowCount }: { columnCount: number; rowCount?: number },
) =>
  placements.every(
    (placement) =>
      placement.x >= 0 &&
      placement.y >= 0 &&
      placement.x + placement.w <= columnCount &&
      (rowCount === undefined || placement.y + placement.h <= rowCount),
  ) &&
  placements.every((placement, index) =>
    placements.slice(index + 1).every((other) => !placementsOverlap(placement, other)),
  );

const placementsOverlap = (first: SectionGridPlacement, second: SectionGridPlacement) =>
  first.x < second.x + second.w &&
  first.x + first.w > second.x &&
  first.y < second.y + second.h &&
  first.y + first.h > second.y;
