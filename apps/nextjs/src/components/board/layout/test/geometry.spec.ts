import { describe, expect, test } from "vitest";

import { getLayoutRowCount, normalizeGridPlacement } from "../index";

describe("fixed dashboard geometry", () => {
  test("normalizes invalid bounds and derives the required row count", () => {
    const placement = normalizeGridPlacement({ id: "wide", x: 7, y: -2, w: 8, h: 2 }, 4);

    expect(placement).toEqual({ id: "wide", x: 0, y: 0, w: 4, h: 2 });
    expect(getLayoutRowCount([placement, { x: 0, y: 4, w: 1, h: 3 }])).toBe(7);
  });
});
