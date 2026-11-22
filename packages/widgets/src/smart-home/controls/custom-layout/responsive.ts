import { doGridPlacementsOverlap } from "@homarr/boards/grid";
import type { GridPlacement } from "@homarr/boards/grid";

import { SMART_HOME_CARD_MIN, SMART_HOME_LAYOUT_COLUMNS, SMART_HOME_LAYOUT_ROWS } from "./schema";
import type { SmartHomeLayoutCard } from "./schema";

export const LAYOUT_ROW_HEIGHT = 32;
export const LAYOUT_GAP = 8;
// The layout scales with the widget like the editor shows it; only very narrow widgets (under ~160 px) fall back to
// fewer, wider columns where cards stack.
const MIN_COLUMN_WIDTH = 6;
const MIN_CARD_WIDTH = 140;

/** Columns for the widget's actual width (not the viewport), at most the stored 12. */
export const getLayoutColumns = (width: number) =>
  Math.min(SMART_HOME_LAYOUT_COLUMNS, Math.max(1, Math.floor((width + LAYOUT_GAP) / (MIN_COLUMN_WIDTH + LAYOUT_GAP))));

/**
 * The arrangement for a widget narrower than 12 columns. Cards keep their reading order, widths scale with the
 * column count and each card takes the first free slot from where the previous one went. Only computed, never
 * stored, so making a widget smaller does not lose the layout for its full size.
 */
export const deriveLayout = (
  cards: readonly SmartHomeLayoutCard[],
  columns: number,
  width = Number.POSITIVE_INFINITY,
): GridPlacement[] => {
  if (columns >= SMART_HOME_LAYOUT_COLUMNS) return cards.map(({ id, x, y, w, h }) => ({ id, x, y, w, h }));

  const scale = columns / SMART_HOME_LAYOUT_COLUMNS;
  const columnWidth = (width - LAYOUT_GAP * (columns - 1)) / columns;
  // On a narrow widget a card never gets thinner than its content needs; it takes more columns instead.
  const minColumns = Math.min(columns, Math.ceil((MIN_CARD_WIDTH + LAYOUT_GAP) / (columnWidth + LAYOUT_GAP)));
  const placed: GridPlacement[] = [];
  let cursor = 0;
  for (const card of cards.toSorted((left, right) => left.y - right.y || left.x - right.x)) {
    const w = Math.min(
      columns,
      Math.max(Math.min(SMART_HOME_CARD_MIN.w, columns), minColumns, Math.round(card.w * scale)),
    );
    let slot: GridPlacement | null = null;
    for (let y = cursor; slot === null; y++) {
      for (let x = 0; x <= columns - w; x++) {
        const candidate = { id: card.id, x, y, w, h: card.h };
        if (!placed.some((other) => doGridPlacementsOverlap(candidate, other))) {
          slot = candidate;
          break;
        }
      }
    }
    placed.push(slot);
    cursor = slot.y;
  }
  return placed;
};

/**
 * The first free spot inside the widget for a new card. When the wanted size no longer fits, the card gets smaller,
 * down to the minimum card size; null when not even that fits.
 */
export const findFreeSlot = (cards: readonly GridPlacement[], w: number, h: number) => {
  const sizes = [{ w, h }];
  for (let height = Math.min(h, SMART_HOME_LAYOUT_ROWS); height >= SMART_HOME_CARD_MIN.h; height--) {
    for (let width = w; width >= SMART_HOME_CARD_MIN.w; width--) sizes.push({ w: width, h: height });
  }
  for (const size of sizes) {
    for (let y = 0; y <= SMART_HOME_LAYOUT_ROWS - size.h; y++) {
      for (let x = 0; x <= SMART_HOME_LAYOUT_COLUMNS - size.w; x++) {
        const candidate = { id: "", x, y, ...size };
        if (!cards.some((other) => doGridPlacementsOverlap(candidate, other))) return candidate;
      }
    }
  }
  return null;
};
