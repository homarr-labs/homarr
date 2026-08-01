import { describe, expect, it } from "vitest";

import { getAdvancedFocusRect } from "./geometry";

describe("getAdvancedFocusRect", () => {
  it("expands a widget and keeps it inside the viewport", () => {
    expect(getAdvancedFocusRect({ left: 10, top: 10, width: 300, height: 200 }, { width: 1200, height: 800 })).toEqual({
      left: 240,
      top: 190,
      width: 720,
      height: 480,
    });
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
    const rect = getAdvancedFocusRect({ left: 0, top: 0, width: 500, height: 500 }, { width: 1366, height: 768 });

    expect(rect.top).toBeGreaterThanOrEqual(84);
    expect(rect.top + rect.height).toBeLessThanOrEqual(744);
  });
});
