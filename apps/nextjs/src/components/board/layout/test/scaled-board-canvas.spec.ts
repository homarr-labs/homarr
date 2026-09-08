import { describe, expect, test } from "vitest";

import { BOARD_FIXED_ITEM_SIZE_DEFAULT } from "@homarr/definitions";

import { getBoardCanvasGeometry } from "../canvas-geometry";
import { BOARD_GRID_ITEM_INSET, LOGICAL_GRID_PITCH } from "../constants";
import {
  calculateBoardCanvasScale,
  calculateBoardUiScale,
  calculateFixedBoardCanvasScale,
  getBoardCanvasMetrics,
  getBoardScaling,
  normalizeFixedItemSize,
} from "../scaling";

describe("board canvas scale policy", () => {
  test.each([100, 150, 200, 400])("renders an exact %s CSS-pixel fixed tile", (itemSize) => {
    const scale = calculateFixedBoardCanvasScale(itemSize);
    expect(LOGICAL_GRID_PITCH * scale - 2 * BOARD_GRID_ITEM_INSET).toBeCloseTo(itemSize);
  });

  test.each([Number.NaN, Number.POSITIVE_INFINITY, ""])(
    "uses the default fixed size for unavailable input %s",
    (input) => {
      expect(normalizeFixedItemSize(input)).toBe(BOARD_FIXED_ITEM_SIZE_DEFAULT);
    },
  );

  test("clamps and rounds the configured fixed size", () => {
    expect(normalizeFixedItemSize(20)).toBe(100);
    expect(normalizeFixedItemSize(700)).toBe(400);
    expect(normalizeFixedItemSize(200.7)).toBe(201);
  });

  test.each([0.75, 1, 1.25, 1.5, 2])("preserves fixed CSS dimensions at browser zoom %s", (zoom) => {
    const scaling = getBoardScaling({ fixedScaling: true, fixedItemSize: 200 });
    const metrics = getBoardCanvasMetrics(scaling, 1440 / zoom, 5 * LOGICAL_GRID_PITCH);
    expect(metrics.itemSize).toBeCloseTo(200);
    expect(metrics.width).toBeCloseTo(1100);
  });

  test("centers fixed boards that fit and scrolls without changing tile size when narrow", () => {
    const scaling = getBoardScaling({ fixedScaling: true, fixedItemSize: 200 });
    expect(getBoardCanvasMetrics(scaling, 2560, 1060)).toMatchObject({ centered: true, overflows: false });
    expect(getBoardCanvasMetrics(scaling, 600, 1060)).toMatchObject({ centered: false, overflows: true });
  });

  test("keeps the sizing mode adapter reversible", () => {
    expect(getBoardScaling({ fixedScaling: false, fixedItemSize: 200 })).toEqual({ mode: "responsive" });
    expect(getBoardCanvasMetrics({ mode: "responsive" }, 600, 1060).width).toBeCloseTo(600);
  });

  test("aligns left, main, and right lanes using the same canvas geometry", () => {
    const geometry = getBoardCanvasGeometry({ columnCount: 5, leftGutterColumnCount: 1, rightGutterColumnCount: 1 });
    expect(geometry.lanes.map(({ lane, offset, width }) => ({ lane, offset, width }))).toEqual([
      { lane: "left", offset: 0, width: 212 },
      { lane: "main", offset: 236, width: 636 },
      { lane: "right", offset: 896, width: 212 },
    ]);
    expect(geometry.width).toBe(1108);
  });

  test("fits the logical canvas exactly", () => {
    const scale = calculateBoardCanvasScale(840, 1000);

    expect(scale).toBe(0.84);
    expect(1000 * scale).toBe(840);
  });

  test("scales up uniformly on a larger screen", () => {
    expect(calculateBoardCanvasScale(1800, 1000)).toBe(1.8);
  });

  test("keeps fitting narrow viewports without horizontal overflow", () => {
    const availableWidth = 600;
    const logicalWidth = 1000;
    const scale = calculateBoardCanvasScale(availableWidth, logicalWidth);

    expect(scale).toBe(0.6);
    expect(logicalWidth * scale).toBe(availableWidth);
  });

  test("keeps the board fitted at 200% effective zoom", () => {
    const logicalWidth = 1696;
    const normalAvailableWidth = 1872;
    const normalScale = calculateBoardCanvasScale(normalAvailableWidth, logicalWidth);
    const zoomedScale = calculateBoardCanvasScale(normalAvailableWidth / 2, logicalWidth);
    const normalPaintedCellSize = 200 * normalScale;
    const zoomedPaintedCellSize = 200 * zoomedScale * 2;

    expect(zoomedScale).toBeCloseTo(normalScale / 2);
    expect(zoomedPaintedCellSize).toBeCloseTo(normalPaintedCellSize);
  });

  test.each([
    [0, 1000],
    [1000, 0],
    [Number.NaN, 1000],
    [1000, Number.POSITIVE_INFINITY],
  ])("uses a stable initial scale for unavailable geometry (%s, %s)", (availableWidth, logicalWidth) => {
    expect(calculateBoardCanvasScale(availableWidth, logicalWidth)).toBe(1);
  });

  test("keeps UI typography and density at 100% while fitting the canvas down", () => {
    expect(calculateBoardUiScale(0.75)).toBeCloseTo(4 / 3);
    expect(calculateBoardUiScale(0.84)).toBeCloseTo(1 / 0.84);
    expect(calculateBoardUiScale(1)).toBe(1);
    expect(calculateBoardUiScale(1.5)).toBe(1);
  });

  test.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    "uses stable UI density for an invalid canvas scale (%s)",
    (scale) => {
      expect(calculateBoardUiScale(scale)).toBe(1);
    },
  );
});
