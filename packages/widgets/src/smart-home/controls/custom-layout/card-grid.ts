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

const scaleEdge = (edge: number, from: number, to: number) => Math.round((edge * to) / from);

/**
 * The element placements of the card at another size. Every edge moves in proportion to the card, so elements keep
 * their share of it and neighbors stay neighbors without overlapping. Null when an element would become smaller
 * than it can be.
 */
export const scaleElementPlacements = (card: SmartHomeLayoutCard, w: number, h: number): GridPlacement[] | null => {
  const placements = getElementPlacements(card);
  const fromRows = getCardInnerRows(card);
  const toRows = getCardInnerRows({ ...card, h });
  if (w === card.w && toRows === fromRows) return placements;
  const minRows = new Map(card.elements.map((element) => [element.id, getElementMinRows(element)]));
  const scaled = placements.map((placement) => {
    const x = scaleEdge(placement.x, card.w, w);
    const y = scaleEdge(placement.y, fromRows, toRows);
    return {
      id: placement.id,
      x,
      y,
      w: scaleEdge(placement.x + placement.w, card.w, w) - x,
      h: scaleEdge(placement.y + placement.h, fromRows, toRows) - y,
    };
  });
  return scaled.every((placement) => placement.w >= 1 && placement.h >= (minRows.get(placement.id) ?? 1))
    ? scaled
    : null;
};

/** The card at another size, its elements scaled with it (see `scaleElementPlacements`). */
export const resizeCardWithElements = (card: SmartHomeLayoutCard, w: number, h: number): SmartHomeLayoutCard => {
  const scaled = new Map(scaleElementPlacements(card, w, h)?.map((placement) => [placement.id, placement]));
  return {
    ...card,
    w,
    h,
    elements: card.elements.map((element) => {
      const placement = scaled.get(element.id);
      return placement ? { ...element, x: placement.x, y: placement.y, w: placement.w, h: placement.h } : element;
    }),
  };
};

/** How small a card can be resized: its elements shrink with it until one reaches its own minimum. */
export const getCardScaledMinSize = (card: SmartHomeLayoutCard) => {
  let { w, h } = card;
  while (w > SMART_HOME_CARD_MIN.w && scaleElementPlacements(card, w - 1, card.h)) w--;
  while (h > SMART_HOME_CARD_MIN.h && scaleElementPlacements(card, card.w, h - 1)) h--;
  return { w, h };
};

/** Whether every element sits inside the card's own grid. */
export const elementsFitCard = (card: SmartHomeLayoutCard) => {
  const rows = getCardInnerRows(card);
  return getElementPlacements(card).every(
    (placement) => placement.x + placement.w <= card.w && placement.y + placement.h <= rows,
  );
};

/**
 * The card with every element inside its own grid: elements that are outside lose their position and take free
 * space instead (see `getElementPlacements`), the others keep theirs. Null when they still do not fit, for example
 * when a card with many elements has to become smaller.
 */
export const fitElementsIntoCard = (card: SmartHomeLayoutCard): SmartHomeLayoutCard | null => {
  if (elementsFitCard(card)) return card;
  const rows = getCardInnerRows(card);
  const placements = new Map(getElementPlacements(card).map((placement) => [placement.id, placement]));
  const reflowed = {
    ...card,
    elements: card.elements.map((element) => {
      const placement = placements.get(element.id);
      if (placement && placement.x + placement.w <= card.w && placement.y + placement.h <= rows) return element;
      const { x: _x, y: _y, w: _w, h: _h, ...rest } = element;
      return rest;
    }),
  };
  return elementsFitCard(reflowed) ? reflowed : null;
};

/** Every card and element id once within one arrangement; Wide and Narrow may share them. */
const hasUniqueIds = (cards: readonly SmartHomeLayoutCard[]) => {
  const ids = cards.flatMap((card) => [card.id, ...card.elements.map((element) => element.id)]);
  return new Set(ids).size === ids.length;
};

const overlapsAny = (placements: readonly GridPlacement[]) =>
  placements.some((placement, index) =>
    placements.slice(index + 1).some((other) => doGridPlacementsOverlap(placement, other)),
  );

/**
 * Whether cards can be edited as they are: inside the widget, not on top of each other, and each with its elements
 * inside it and apart. Anything else (an imported layout written by hand) would break the editor's grid.
 */
export const isValidArrangement = (cards: readonly SmartHomeLayoutCard[], columns: number, rows: number) =>
  hasUniqueIds(cards) &&
  cards.every((card) => card.x + card.w <= columns && card.y + card.h <= rows) &&
  !overlapsAny(cards) &&
  cards.every((card) => elementsFitCard(card) && !overlapsAny(getElementPlacements(card)));
