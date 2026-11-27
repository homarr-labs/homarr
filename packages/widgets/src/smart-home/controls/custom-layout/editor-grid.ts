import type { GridMoveGuard, GridPlacement, TransactionalGridState } from "@homarr/boards/grid";
import { resolvePinnedGridCollisions, validateGridState } from "@homarr/boards/grid";

import { getCardInnerRows, getElementPlacements, getInnerGridId } from "./card-grid";
import { SMART_HOME_LAYOUT_COLUMNS, SMART_HOME_LAYOUT_MAX_ELEMENTS, SMART_HOME_LAYOUT_ROWS } from "./schema";
import type { SmartHomeLayoutCard } from "./schema";

// The layout editor's grid model: cards on the widget grid, each with its own grid for its elements.

export const GRID_ID = "smart-home-layout";

/** Elements of an imported layout show this widget's integration, whatever integration they were made with. */
export const withSource = (cards: readonly SmartHomeLayoutCard[], source: string) =>
  cards.map((card) => ({
    ...card,
    elements: card.elements.map((element) => ({ ...element, source: element.entityId ? source : "" })),
  }));

/**
 * Card gestures use only the widget grid, so cards push each other like before. Element gestures add every card's
 * own grid, nested under its card, so an element can move within a card or over to another one.
 */
export const toGridState = (
  cards: readonly SmartHomeLayoutCard[],
  withCardGrids: boolean,
  rowCount: number,
): TransactionalGridState => ({
  grids: [
    {
      id: GRID_ID,
      columnCount: SMART_HOME_LAYOUT_COLUMNS,
      // The widget is the frame: cards cannot be moved or resized below its bottom edge.
      maxRowCount: rowCount,
      placements: cards.map(({ id, x, y, w, h }) => ({ id, x, y, w, h })),
    },
    ...(withCardGrids
      ? cards.map((card) => ({
          id: getInnerGridId(card.id),
          columnCount: card.w,
          maxRowCount: getCardInnerRows(card),
          parentGridId: GRID_ID,
          ownerPlacementId: card.id,
          placements: getElementPlacements(card),
        }))
      : []),
  ],
});

export const isValidArrangement = (cards: readonly SmartHomeLayoutCard[]) => {
  try {
    validateGridState(toGridState(cards, true, SMART_HOME_LAYOUT_ROWS));
    return true;
  } catch {
    return false;
  }
};

export const findGrid = (state: TransactionalGridState | null, id: string) =>
  state?.grids.find((grid) => grid.id === id);

/** Writes a finished gesture back: card positions, and element positions including moves between cards. */
export const applyGridState = (cards: readonly SmartHomeLayoutCard[], state: TransactionalGridState) => {
  const outer = new Map(findGrid(state, GRID_ID)?.placements.map((placement) => [placement.id, placement]));
  const owners = new Map<string, { cardId: string; placement: GridPlacement }>();
  for (const grid of state.grids) {
    if (!grid.ownerPlacementId) continue;
    for (const placement of grid.placements) owners.set(placement.id, { cardId: grid.ownerPlacementId, placement });
  }
  const elements = new Map(cards.flatMap((card) => card.elements.map((element) => [element.id, element] as const)));

  return cards.map((card): SmartHomeLayoutCard => {
    const position = outer.get(card.id);
    const moved = position ? { ...card, x: position.x, y: position.y, w: position.w, h: position.h } : card;
    if (owners.size === 0) return moved;
    const kept = card.elements.filter((element) => owners.get(element.id)?.cardId === card.id);
    const arrived = [...owners.entries()]
      .filter(([id, owner]) => owner.cardId === card.id && !card.elements.some((element) => element.id === id))
      .flatMap(([id]) => elements.get(id) ?? []);
    return {
      ...moved,
      elements: [...kept, ...arrived].map((element) => {
        const placement = owners.get(element.id)?.placement;
        return placement ? { ...element, x: placement.x, y: placement.y, w: placement.w, h: placement.h } : element;
      }),
    };
  });
};

export const stateKey = (state: TransactionalGridState) =>
  state.grids.map((grid) => grid.placements.map(({ id, x, y, w, h }) => `${id}${x},${y},${w},${h}`).join()).join("|");

// An element moved in from another card counts against the target's limit; moves within a card do not.
export const elementLimitGuard: GridMoveGuard = ({ sourceGrid, targetGrid }) =>
  sourceGrid.id === targetGrid.id || targetGrid.placements.length < SMART_HOME_LAYOUT_MAX_ELEMENTS;

const orderFreeKey = (state: TransactionalGridState) =>
  JSON.stringify(
    state.grids
      .map((grid) => [grid.id, grid.placements.map(({ id, x, y, w, h }) => `${id}:${x},${y},${w},${h}`).toSorted()])
      .toSorted(),
  );

/** Whether two grid states place everything alike, whatever the order. */
export const sameGridState = (first: TransactionalGridState, second: TransactionalGridState) =>
  orderFreeKey(first) === orderFreeKey(second);

/** The size of one cell of a card's grid on screen. */
export const cardCellSize = (body: Element, card: SmartHomeLayoutCard) => {
  const rect = body.getBoundingClientRect();
  const { columnGap, rowGap } = getComputedStyle(body);
  return {
    rect,
    width: (rect.width + parseFloat(columnGap)) / card.w,
    height: (rect.height + parseFloat(rowGap)) / getCardInnerRows(card),
  };
};

/** The cards after an edit of one of them; a size change pushes overlapping cards down, as a resize would. */
export const placeCardEdit = (existing: readonly SmartHomeLayoutCard[], next: SmartHomeLayoutCard) => {
  const sized = existing.find((card) => card.id === next.id);
  const replaced = existing.map((card) => (card.id === next.id ? next : card));
  if (!sized || (sized.w === next.w && sized.h === next.h)) return replaced;
  // A size change pushes overlapping cards down, exactly like a resize gesture, but never out of the widget.
  // When there is no room, the card keeps its size and its elements share the space it has.
  const kept = existing.map((card) => (card.id === next.id ? { ...next, w: sized.w, h: sized.h } : card));
  const fittedHeight = Math.min(next.h, SMART_HOME_LAYOUT_ROWS - next.y);
  const resolved = resolvePinnedGridCollisions(
    replaced.map(({ id, x, y, w, h }) => ({ id, x, y, w, h })),
    { id: next.id, x: next.x, y: next.y, w: next.w, h: fittedHeight },
    SMART_HOME_LAYOUT_COLUMNS,
  );
  if (resolved.some((placement) => placement.y + placement.h > SMART_HOME_LAYOUT_ROWS)) return kept;
  return applyGridState(replaced, {
    grids: [{ id: GRID_ID, columnCount: SMART_HOME_LAYOUT_COLUMNS, placements: resolved }],
  });
};
