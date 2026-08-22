import { describe, expect, test } from "vitest";

import {
  getGridRowCountForVisualHeight,
  getLayoutRowCount,
  getLogicalItemStyle,
  getLogicalTrackSize,
  normalizeGridPlacement,
} from "../index";

describe("fixed dashboard geometry", () => {
  test("keeps a 1x1 item exactly 200px with a fixed 12px gap", () => {
    expect(getLogicalTrackSize(1)).toBe(200);
    expect(getLogicalTrackSize(0.5)).toBe(94);
    expect(getLogicalTrackSize(2)).toBe(412);
    expect(getLogicalTrackSize(3)).toBe(624);

    expect(getLogicalItemStyle({ x: 1, y: 2, w: 2, h: 3 })).toEqual({
      position: "absolute",
      left: 212,
      top: 424,
      width: 412,
      height: 624,
    });
  });

  test("normalizes invalid bounds and derives the required row count", () => {
    const placement = normalizeGridPlacement({ id: "wide", x: 7, y: -2, w: 8, h: 2 }, 4);

    expect(placement).toEqual({ id: "wide", x: 0, y: 0, w: 4, h: 2 });
    expect(getLayoutRowCount([placement, { x: 0, y: 4, w: 1, h: 3 }])).toBe(7);
  });

  test("derives enough logical rows to fill the visual viewport at any canvas scale", () => {
    expect(getGridRowCountForVisualHeight(1200, 1)).toBe(6);
    expect(getLogicalTrackSize(getGridRowCountForVisualHeight(1200, 1))).toBeGreaterThanOrEqual(1200);

    expect(getGridRowCountForVisualHeight(1200, 0.5)).toBe(12);
    expect(getLogicalTrackSize(getGridRowCountForVisualHeight(1200, 0.5)) * 0.5).toBeGreaterThanOrEqual(1200);
  });
});
