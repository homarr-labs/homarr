import { describe, expect, it } from "vitest";

import { getAdvancedColumnWidth, getCompactSectionVisibility, getTracearrSectionVisibility } from "./component";
import { attachTracearrSource } from "./source";

describe("Tracearr source ownership", () => {
  it("uses integration-scoped keys for overlapping upstream ids", () => {
    const first = attachTracearrSource([{ id: "same" }], {
      integrationId: "tracearr-a",
      integrationName: "Tracearr A",
    });
    const second = attachTracearrSource([{ id: "same" }], {
      integrationId: "tracearr-b",
      integrationName: "Tracearr B",
    });

    expect([first[0]?.key, second[0]?.key]).toEqual(["tracearr-a:same", "tracearr-b:same"]);
    expect(second[0]?.integrationName).toBe("Tracearr B");
  });
});

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

describe("Tracearr advanced disclosure", () => {
  it("shows all sections even when compact presentation toggles are disabled", () => {
    expect(
      getTracearrSectionVisibility(
        { showStats: false, showStreams: false, showViolations: false, showRecentActivity: false },
        true,
      ),
    ).toEqual({ stats: true, streams: true, violations: true, recentActivity: true });
  });
});
