import { describe, expect, it } from "vitest";

import { getAdvancedColumnWidth, getCompactSectionVisibility } from "./component";

describe("Tracearr advanced layout", () => {
  it("subtracts grid padding and the inter-column gap", () => {
    expect(getAdvancedColumnWidth(800, true)).toBe(376);
    expect(getAdvancedColumnWidth(801, true)).toBe(376.5);
  });

  it("subtracts only grid padding in a single-column layout", () => {
    expect(getAdvancedColumnWidth(799, false)).toBe(767);
  });
});

describe("Tracearr compact disclosure", () => {
  it("keeps urgent violations visible in a short widget", () => {
    expect(
      getCompactSectionVisibility({
        height: 160,
        showStreams: true,
        showViolations: true,
        hasViolations: true,
        showRecentActivity: true,
      }),
    ).toEqual({ violations: true, recentActivity: false });
  });

  it("reveals secondary history as height becomes available", () => {
    expect(
      getCompactSectionVisibility({
        height: 400,
        showStreams: true,
        showViolations: true,
        hasViolations: false,
        showRecentActivity: true,
      }),
    ).toEqual({ violations: true, recentActivity: true });
  });
});
