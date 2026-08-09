import { describe, expect, test } from "vitest";

import { clampPercentage, getDisplayText } from "./component";

describe("system disk display", () => {
  test("clamps malformed utilization before sizing the background", () => {
    expect(clampPercentage(-4)).toBe(0);
    expect(clampPercentage(108)).toBe(100);
  });

  test("falls back to provider values when sizes are already formatted", () => {
    expect(getDisplayText({ used: "5 GiB", available: "10 GiB", percentage: 50 }, "absolute")).toBe("5 GiB / 10 GiB");
  });
});
