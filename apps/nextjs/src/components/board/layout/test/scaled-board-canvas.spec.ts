import { describe, expect, test } from "vitest";

import { calculateBoardCanvasScale, calculateBoardUiScale, MIN_ACCESSIBLE_CANVAS_SCALE } from "../scaled-board-canvas";

describe("board canvas scale policy", () => {
  test("fits the logical canvas exactly when the viewport can preserve the minimum scale", () => {
    const scale = calculateBoardCanvasScale(840, 1000);

    expect(scale).toBe(0.84);
    expect(1000 * scale).toBe(840);
  });

  test("scales up uniformly on a larger screen", () => {
    expect(calculateBoardCanvasScale(1800, 1000)).toBe(1.8);
  });

  test("stops counter-scaling at 0.75 and lets the canvas overflow", () => {
    const availableWidth = 600;
    const logicalWidth = 1000;
    const scale = calculateBoardCanvasScale(availableWidth, logicalWidth);

    expect(scale).toBe(MIN_ACCESSIBLE_CANVAS_SCALE);
    expect(logicalWidth * scale).toBeGreaterThan(availableWidth);
  });

  test("keeps content materially magnified at 200% effective zoom", () => {
    const logicalWidth = 1696;
    const normalAvailableWidth = 1872;
    const normalScale = calculateBoardCanvasScale(normalAvailableWidth, logicalWidth);
    const zoomedScale = calculateBoardCanvasScale(normalAvailableWidth / 2, logicalWidth);
    const normalPaintedCellSize = 200 * normalScale;
    const zoomedPaintedCellSize = 200 * zoomedScale * 2;

    expect(zoomedScale).toBe(MIN_ACCESSIBLE_CANVAS_SCALE);
    expect(zoomedPaintedCellSize).toBeGreaterThan(normalPaintedCellSize * 1.25);
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
