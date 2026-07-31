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
    (placement) =>
      placement.id !== movedItemId &&
      placement.x === movedCurrently.x &&
      placement.y === movedCurrently.y &&
      placement.w === movedCurrently.w &&
      placement.h === movedCurrently.h,
  );
  if (!displaced) return null;

  return initial.map((placement) => {
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
};
