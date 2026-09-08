import {
  BOARD_FIXED_ITEM_SIZE_DEFAULT,
  BOARD_FIXED_ITEM_SIZE_MAX,
  BOARD_FIXED_ITEM_SIZE_MIN,
} from "@homarr/definitions";

import { BOARD_GRID_ITEM_INSET, LOGICAL_GRID_PITCH } from "./constants";

export type BoardScaling = { mode: "fixed"; itemSize: number } | { mode: "responsive" };

export const normalizeFixedItemSize = (value: number | string) => {
  if (value === "" || !Number.isFinite(Number(value))) return BOARD_FIXED_ITEM_SIZE_DEFAULT;

  return Math.min(BOARD_FIXED_ITEM_SIZE_MAX, Math.max(BOARD_FIXED_ITEM_SIZE_MIN, Math.round(Number(value))));
};

/** The only adapter from persisted settings to the canvas sizing policy. */
export const getBoardScaling = (settings: { fixedScaling: boolean; fixedItemSize: number }): BoardScaling => {
  if (settings.fixedScaling) return { mode: "fixed", itemSize: normalizeFixedItemSize(settings.fixedItemSize) };

  return { mode: "responsive" };
};

export const calculateBoardCanvasScale = (availableWidth: number, logicalWidth: number) => {
  if (!Number.isFinite(availableWidth) || !Number.isFinite(logicalWidth)) return 1;
  if (availableWidth <= 0 || logicalWidth <= 0) return 1;

  return availableWidth / logicalWidth;
};

export const calculateFixedBoardCanvasScale = (itemSize: number) =>
  (normalizeFixedItemSize(itemSize) + 2 * BOARD_GRID_ITEM_INSET) / LOGICAL_GRID_PITCH;

/** Fixed sizing never reads viewport width or devicePixelRatio: browser zoom stays native. */
export const getBoardCanvasMetrics = (scaling: BoardScaling, availableWidth: number, logicalWidth: number) => {
  let scale: number;
  if (scaling.mode === "fixed") scale = calculateFixedBoardCanvasScale(scaling.itemSize);
  else scale = calculateBoardCanvasScale(availableWidth, logicalWidth);

  const width = logicalWidth * scale;
  return {
    scale,
    width,
    itemSize: Math.max(0, LOGICAL_GRID_PITCH * scale - 2 * BOARD_GRID_ITEM_INSET),
    centered: scaling.mode === "fixed" && width <= availableWidth,
    overflows: availableWidth > 0 && width - availableWidth > 0.5,
  };
};

export const calculateBoardUiScale = (canvasScale: number) => {
  if (!Number.isFinite(canvasScale) || canvasScale <= 0) return 1;
  if (canvasScale < 1) return 1 / canvasScale;

  return 1;
};
