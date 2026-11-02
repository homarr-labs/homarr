import { describe, expect, test } from "vitest";

import { stabilizeBoardCanvasWidth } from "../board-canvas-width";
import { calculateBoardCanvasScale, calculateBoardUiScale } from "../scaled-board-canvas";

describe("board canvas scale policy", () => {
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

  test("keeps UI typography and density at 100% while fitting the canvas", () => {
    expect(calculateBoardUiScale(0.75)).toBeCloseTo(4 / 3);
    expect(calculateBoardUiScale(0.84)).toBeCloseTo(1 / 0.84);
    expect(calculateBoardUiScale(1)).toBe(1);
    expect(calculateBoardUiScale(1.5)).toBeCloseTo(2 / 3);
  });

  test.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    "uses stable UI density for an invalid canvas scale (%s)",
    (scale) => {
      expect(calculateBoardUiScale(scale)).toBe(1);
    },
  );
});

describe("board canvas scrollbar width", () => {
  const logicalWidth = 1000;
  const scrollportHeight = 990;
  const scrollbarWidth = 15;

  test("accepts the first measured width", () => {
    expect(
      stabilizeBoardCanvasWidth({
        measuredWidth: 1000,
        stableWidth: 0,
        logicalWidth,
        logicalHeight: 1000,
        scrollportHeight,
        contentHeight: 1000,
        roomBelowBoard: 0,
        scrollbarWidth,
      }),
    ).toBe(1000);
  });

  test("accepts a narrower width when the scrollbar appears", () => {
    expect(
      stabilizeBoardCanvasWidth({
        measuredWidth: 985,
        stableWidth: 1000,
        logicalWidth,
        logicalHeight: 1000,
        scrollportHeight,
        contentHeight: 1020,
        roomBelowBoard: -30,
        scrollbarWidth,
      }),
    ).toBe(985);
  });

  test("keeps the narrower width when the scrollbar would come back", () => {
    expect(
      stabilizeBoardCanvasWidth({
        measuredWidth: 1000,
        stableWidth: 985,
        logicalWidth,
        logicalHeight: 1000,
        scrollportHeight,
        contentHeight: scrollportHeight,
        roomBelowBoard: 5,
        scrollbarWidth,
      }),
    ).toBe(985);
  });

  test("takes a scrollbar-sized growth back when the board is much shorter than the scrollport", () => {
    expect(
      stabilizeBoardCanvasWidth({
        measuredWidth: 1000,
        stableWidth: 985,
        logicalWidth,
        logicalHeight: 400,
        scrollportHeight,
        contentHeight: 500,
        roomBelowBoard: 400,
        scrollbarWidth,
      }),
    ).toBe(1000);
  });

  test("accepts a scrollbar-sized growth while the page is already scrolling", () => {
    expect(
      stabilizeBoardCanvasWidth({
        measuredWidth: 1000,
        stableWidth: 985,
        logicalWidth,
        logicalHeight: 2000,
        scrollportHeight,
        contentHeight: 1800,
        roomBelowBoard: -200,
        scrollbarWidth,
      }),
    ).toBe(1000);
  });

  test("accepts a resize larger than a scrollbar", () => {
    expect(
      stabilizeBoardCanvasWidth({
        measuredWidth: 1100,
        stableWidth: 1000,
        logicalWidth,
        logicalHeight: 1000,
        scrollportHeight,
        contentHeight: 1100,
        roomBelowBoard: -80,
        scrollbarWidth,
      }),
    ).toBe(1100);
  });

  test("leaves overlay scrollbars alone", () => {
    expect(
      stabilizeBoardCanvasWidth({
        measuredWidth: 1000,
        stableWidth: 985,
        logicalWidth,
        logicalHeight: 1000,
        scrollportHeight,
        contentHeight: scrollportHeight,
        roomBelowBoard: 5,
        scrollbarWidth: 0,
      }),
    ).toBe(1000);
  });

  test("keeps the previous width when the measurement is unusable", () => {
    expect(
      stabilizeBoardCanvasWidth({
        measuredWidth: Number.NaN,
        stableWidth: 985,
        logicalWidth,
        logicalHeight: 1000,
        scrollportHeight,
        contentHeight: scrollportHeight,
        roomBelowBoard: 5,
        scrollbarWidth,
      }),
    ).toBe(985);
  });

  test("settles when the scrollbar appears and disappears", () => {
    const logicalHeight = 1000;
    const fullWidth = 1000;
    let stableWidth = 0;
    let paintedWidth = fullWidth;
    const chosenWidths: number[] = [];

    for (let step = 0; step < 6; step += 1) {
      const paintedHeight = (logicalHeight * paintedWidth) / logicalWidth;
      const overflows = paintedHeight > scrollportHeight;
      const measuredWidth = overflows ? fullWidth - scrollbarWidth : fullWidth;
      const contentHeight = Math.max(paintedHeight, scrollportHeight);
      stableWidth = stabilizeBoardCanvasWidth({
        measuredWidth,
        stableWidth,
        logicalWidth,
        logicalHeight,
        scrollportHeight,
        contentHeight,
        roomBelowBoard: scrollportHeight - paintedHeight,
        scrollbarWidth,
      });
      chosenWidths.push(stableWidth);
      paintedWidth = stableWidth;
    }

    expect(chosenWidths.at(-1)).toBeLessThan(fullWidth);
    expect(new Set(chosenWidths.slice(2)).size).toBe(1);
    expect((logicalHeight * (chosenWidths.at(-1) ?? 0)) / logicalWidth).toBeLessThanOrEqual(scrollportHeight);
  });
});
