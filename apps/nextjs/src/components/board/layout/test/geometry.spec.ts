import { describe, expect, test } from "vitest";

import { getLayoutRowCount, getLogicalItemStyle, getLogicalTrackSize, normalizeGridPlacement } from "../index";

describe("fixed dashboard geometry", () => {
  test("keeps a 1x1 item exactly 200px with a fixed 24px gap", () => {
    expect(getLogicalTrackSize(1)).toBe(200);
    expect(getLogicalTrackSize(0.5)).toBe(88);
    expect(getLogicalTrackSize(2)).toBe(424);
    expect(getLogicalTrackSize(3)).toBe(648);

    expect(getLogicalItemStyle({ x: 1, y: 2, w: 2, h: 3 })).toEqual({
      position: "absolute",
      left: 224,
      top: 448,
      width: 424,
      height: 648,
    });
  });

  test("normalizes invalid bounds and derives the required row count", () => {
    const placement = normalizeGridPlacement({ id: "wide", x: 7, y: -2, w: 8, h: 2 }, 4);

    expect(placement).toEqual({ id: "wide", x: 0, y: 0, w: 4, h: 2 });
    expect(getLayoutRowCount([placement, { x: 0, y: 4, w: 1, h: 3 }])).toBe(7);
  });
});
