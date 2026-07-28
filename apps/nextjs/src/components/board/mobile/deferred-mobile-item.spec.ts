import { describe, expect, test } from "vitest";

import { getMobilePreloadRootMargin, mobilePreloadViewportMultiplier } from "./deferred-mobile-item";

describe("getMobilePreloadRootMargin", () => {
  test.each([
    [568, "1136px 0px"],
    [844, "1688px 0px"],
    [932, "1864px 0px"],
  ])("preloads %i px viewports using vertical pixels", (viewportHeight, expected) => {
    expect(getMobilePreloadRootMargin(viewportHeight)).toBe(expected);
  });

  test("keeps the preload policy explicit and prevents negative margins", () => {
    expect(mobilePreloadViewportMultiplier).toBe(2);
    expect(getMobilePreloadRootMargin(-100)).toBe("0px 0px");
  });
});
