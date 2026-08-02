import { describe, expect, it } from "vitest";

import { getAdvancedFocusClosePosition, getAdvancedFocusRect } from "./geometry";

describe("getAdvancedFocusRect", () => {
  it("expands around the widget instead of centering a modal", () => {
    const rect = getAdvancedFocusRect({ left: 450, top: 300, width: 300, height: 200 }, { width: 1200, height: 800 });

    expect(rect).toEqual({ left: 200, top: 120, width: 800, height: 560 });
    expect(rect.left + rect.width / 2).toBe(600);
    expect(rect.top + rect.height / 2).toBe(400);
  });

  it("uses the available viewport on small screens", () => {
    expect(getAdvancedFocusRect({ left: 0, top: 0, width: 400, height: 500 }, { width: 390, height: 700 })).toEqual({
      left: 8,
      top: 68,
      width: 374,
      height: 624,
    });
  });

  it("keeps controls below the fixed board header on short screens", () => {
    const rect = getAdvancedFocusRect({ left: 1200, top: 700, width: 500, height: 500 }, { width: 1366, height: 768 });

    expect(rect.left).toBeGreaterThanOrEqual(16);
    expect(rect.left + rect.width).toBeLessThanOrEqual(1350);
    expect(rect.top).toBeGreaterThanOrEqual(76);
    expect(rect.top + rect.height).toBeLessThanOrEqual(752);
  });
});

describe("getAdvancedFocusClosePosition", () => {
  it("keeps the close control outside the surface when the right side has room", () => {
    expect(getAdvancedFocusClosePosition({ left: 16, top: 76, width: 800, height: 560 }, 1280)).toEqual({
      left: 824,
      top: 76,
    });
  });

  it("uses the left side when the surface is anchored to the right edge", () => {
    expect(getAdvancedFocusClosePosition({ left: 464, top: 76, width: 800, height: 560 }, 1280)).toEqual({
      left: 412,
      top: 76,
    });
  });

  it("falls back to the inside corner on narrow screens", () => {
    expect(getAdvancedFocusClosePosition({ left: 8, top: 68, width: 374, height: 624 }, 390)).toEqual({
      left: 330,
      top: 76,
    });
  });
});
