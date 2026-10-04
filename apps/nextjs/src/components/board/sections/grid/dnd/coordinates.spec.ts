import { describe, expect, test } from "vitest";

import { getLogicalTrackSize, LOGICAL_GRID_PITCH } from "~/components/board/layout";
import {
  getContinuousGridDelta,
  getContinuousResizePlacement,
  getPointerProjectedShape,
  getSnappedGridCoordinates,
  getSnappedGridDelta,
} from "./coordinates";

describe("dnd grid coordinates", () => {
  test.each([0.75, 1, 1.25, 2])("maps transformed drag geometry at %sx scale", (scale) => {
    const target = { left: 137, top: -42, width: getLogicalTrackSize(8) * scale };
    const dragShape = {
      left: target.left + 3 * LOGICAL_GRID_PITCH * scale,
      top: target.top + 7 * LOGICAL_GRID_PITCH * scale,
    };

    expect(getSnappedGridCoordinates({ dragShape, target, columnCount: 8 })).toEqual({ x: 3, y: 7 });
  });

  test("uses the dragged shape origin so a non-center grab retains its pointer offset", () => {
    const scale = 0.75;
    const target = { left: -280, top: 390, width: getLogicalTrackSize(5) * scale };
    const initialShape = {
      left: target.left,
      top: target.top,
      width: getLogicalTrackSize(2) * scale,
      height: 200 * scale,
    };
    const pointerDelta = { x: LOGICAL_GRID_PITCH * scale * 2, y: LOGICAL_GRID_PITCH * scale * 3 };

    expect(
      getSnappedGridCoordinates({
        dragShape: {
          left: initialShape.left + pointerDelta.x,
          top: initialShape.top + pointerDelta.y,
        },
        target,
        columnCount: 5,
      }),
    ).toEqual({ x: 2, y: 3 });
  });

  test.each([0.75, 1, 1.25, 2])("projects a pointer drag in visual coordinates at %sx scale", (scale) => {
    const target = { left: 496, top: -938, width: getLogicalTrackSize(8) * scale };
    const initialShape = {
      left: target.left + 4 * LOGICAL_GRID_PITCH * scale,
      top: target.top + 8 * LOGICAL_GRID_PITCH * scale,
      width: getLogicalTrackSize(2) * scale,
      height: getLogicalTrackSize(2) * scale,
    };
    const initialPointer = { x: initialShape.left + 134 * scale, y: initialShape.top + 89 * scale };
    const dragShape = getPointerProjectedShape(
      { initialPointer, initialShape },
      { x: initialPointer.x, y: initialPointer.y - LOGICAL_GRID_PITCH * scale },
    );

    expect(dragShape.left).toBe(initialShape.left);
    expect(dragShape).toMatchObject({ width: initialShape.width, height: initialShape.height });
    expect(getSnappedGridCoordinates({ dragShape, target, columnCount: 8 })).toEqual({ x: 4, y: 7 });
  });

  test.each([0.75, 1, 1.25, 2])("snaps resize pointer deltas at %sx scale", (visualScale) => {
    expect(
      getSnappedGridDelta({
        initial: { x: 19, y: 31 },
        current: {
          x: 19 - 2 * LOGICAL_GRID_PITCH * visualScale,
          y: 31 + 4 * LOGICAL_GRID_PITCH * visualScale,
        },
        visualScale,
      }),
    ).toEqual({ x: -2, y: 4 });
  });

  test("keeps the visual resize continuous between snapped grid breakpoints", () => {
    const visualScale = 0.75;
    const delta = getContinuousGridDelta({
      initial: { x: 10, y: 20 },
      current: {
        x: 10 + LOGICAL_GRID_PITCH * visualScale * 0.42,
        y: 20 + LOGICAL_GRID_PITCH * visualScale * 0.68,
      },
      visualScale,
    });

    expect(delta?.x).toBeCloseTo(0.42);
    expect(delta?.y).toBeCloseTo(0.68);
    expect(
      getSnappedGridDelta({
        initial: { x: 10, y: 20 },
        current: {
          x: 10 + LOGICAL_GRID_PITCH * visualScale * 0.42,
          y: 20 + LOGICAL_GRID_PITCH * visualScale * 0.68,
        },
        visualScale,
      }),
    ).toEqual({ x: 0, y: 1 });
  });

  test("projects a continuous resize while anchoring the opposite edges and respecting bounds", () => {
    const placement = { id: "widget", x: 2, y: 3, w: 3, h: 2 };

    expect(
      getContinuousResizePlacement({
        placement,
        direction: "nw",
        deltaColumns: 0.35,
        deltaRows: -0.6,
        columnCount: 8,
        maxRowCount: 10,
      }),
    ).toEqual({ id: "widget", x: 2.35, y: 2.4, w: 2.65, h: 2.6 });
    expect(
      getContinuousResizePlacement({
        placement,
        direction: "se",
        deltaColumns: 99,
        deltaRows: 99,
        columnCount: 8,
        maxRowCount: 7,
      }),
    ).toEqual({ id: "widget", x: 2, y: 3, w: 6, h: 4 });
  });

  test("uses independently measured visual axes for transformed resize geometry", () => {
    expect(
      getSnappedGridDelta({
        initial: { x: 10, y: 20 },
        current: { x: 10 + LOGICAL_GRID_PITCH * 1.25, y: 20 - LOGICAL_GRID_PITCH * 1.5 },
        visualScale: { x: 1.25, y: 1.5 },
      }),
    ).toEqual({ x: 1, y: -1 });
  });

  test("rejects non-positive or non-finite scales", () => {
    expect(
      getSnappedGridCoordinates({
        dragShape: { left: 0, top: 0 },
        target: { left: 0, top: 0, width: 0 },
        columnCount: 4,
      }),
    ).toBeNull();
    expect(
      getSnappedGridDelta({ initial: { x: 0, y: 0 }, current: { x: 1, y: 1 }, visualScale: Number.NaN }),
    ).toBeNull();
  });
});
