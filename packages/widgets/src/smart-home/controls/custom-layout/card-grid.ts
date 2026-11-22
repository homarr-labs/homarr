import { doGridPlacementsOverlap, findFreeGridSlot } from "@homarr/boards/grid";
import type { GridPlacement } from "@homarr/boards/grid";

import { SMART_HOME_CARD_MIN } from "./schema";
import type { SmartHomeElementView, SmartHomeLayoutCard, SmartHomeLayoutElement } from "./schema";

/**
 * Every card holds its own grid: as many columns as the card is wide and as many rows as it is tall (minus a row
 * for its title). Elements sit on that grid like cards sit on the widget's grid.
 */

// Rows an element takes when it is placed automatically, and the fewest rows that still show it. Content scales
// with the element, so the user sets its size by resizing it on the card.
const elementRows: Record<SmartHomeElementView, { initial: number; min: number }> = {
  control: { initial: 2, min: 2 },
  tile: { initial: 3, min: 2 },
  slider: { initial: 1, min: 1 },
  // A vertical pill needs height to be usable.
  pill: { initial: 4, min: 3 },
  // Two rows put the label above the number; in one row they sit side by side.
  value: { initial: 2, min: 1 },
  button: { initial: 2, min: 1 },
  // A camera picture needs some height to be recognizable.
  camera: { initial: 4, min: 2 },
  group: { initial: 2, min: 1 },
  chip: { initial: 1, min: 1 },
  row: { initial: 1, min: 1 },
  graph: { initial: 3, min: 2 },
  status: { initial: 1, min: 1 },
  battery: { initial: 1, min: 1 },
  heading: { initial: 1, min: 1 },
  divider: { initial: 1, min: 1 },
  spacer: { initial: 1, min: 1 },
};

const getElementDefaultRows = (element: Pick<SmartHomeLayoutElement, "view">) => elementRows[element.view].initial;

/** The smallest height that still shows the element's content. */
export const getElementMinRows = (element: Pick<SmartHomeLayoutElement, "view">) => elementRows[element.view].min;

export const getCardTitleRows = (card: Pick<SmartHomeLayoutCard, "title">) => (card.title ? 1 : 0);

export const getCardInnerRows = (card: Pick<SmartHomeLayoutCard, "h" | "title">) =>
  Math.max(1, card.h - getCardTitleRows(card));

export const getInnerGridId = (cardId: string) => `card:${cardId}`;

const isPlaced = (
  element: SmartHomeLayoutElement,
): element is SmartHomeLayoutElement & Required<Pick<SmartHomeLayoutElement, "x" | "y" | "w" | "h">> =>
  element.x !== undefined && element.y !== undefined && element.w !== undefined && element.h !== undefined;

const firstFreeRow = (placed: readonly GridPlacement[], x: number, w: number, h: number) => {
  for (let y = 0; ; y++) {
    const candidate = { id: "", x, y, w, h };
    if (!placed.some((other) => doGridPlacementsOverlap(candidate, other))) return y;
  }
};

/**
 * Element positions on the card's grid, in element order. Elements without a position (just added, or saved before
 * positions existed) take the first free space on the card; only when there is none do they stack below the others,
 * where the card grows to show them.
 */
export const getElementPlacements = (card: SmartHomeLayoutCard, columns = card.w): GridPlacement[] => {
  const placed = new Map<string, GridPlacement>();
  for (const element of card.elements) {
    if (!isPlaced(element)) continue;
    const w = Math.min(columns, Math.max(1, element.w));
    const x = Math.min(Math.max(0, element.x), columns - w);
    placed.set(element.id, { id: element.id, x, y: Math.max(0, element.y), w, h: Math.max(1, element.h) });
  }
  for (const element of card.elements) {
    if (placed.has(element.id)) continue;
    const h = getElementDefaultRows(element);
    // Its usual size if that fits, otherwise narrower, then lower, down to the least it needs.
    const slot = findFreeGridSlot(
      [...placed.values()],
      { columns, rows: getCardInnerRows(card) },
      { w: columns, h },
      { w: 1, h: getElementMinRows(element) },
    );
    if (slot) {
      placed.set(element.id, { ...slot, id: element.id });
      continue;
    }
    placed.set(element.id, {
      id: element.id,
      x: 0,
      y: firstFreeRow([...placed.values()], 0, columns, h),
      w: columns,
      h,
    });
  }
  return card.elements.flatMap((element) => placed.get(element.id) ?? []);
};

/** For a card shown narrower than it was laid out: elements stack at full width in reading order. */
export const stackElementPlacements = (card: SmartHomeLayoutCard, columns: number): GridPlacement[] => {
  let y = 0;
  return getElementPlacements(card)
    .toSorted((left, right) => left.y - right.y || left.x - right.x)
    .map((placement) => {
      const stacked = { id: placement.id, x: 0, y, w: columns, h: placement.h };
      y += placement.h;
      return stacked;
    });
};

/** A card cannot shrink below its elements. */
export const getCardMinSize = (card: SmartHomeLayoutCard) => {
  const placements = getElementPlacements(card);
  return {
    w: Math.max(SMART_HOME_CARD_MIN.w, ...placements.map((placement) => placement.x + placement.w)),
    h: Math.max(
      SMART_HOME_CARD_MIN.h,
      ...placements.map((placement) => placement.y + placement.h + getCardTitleRows(card)),
    ),
  };
};
