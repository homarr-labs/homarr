import { describe, expect, test } from "vitest";

import { clampPercentage, getAdvancedDisplayTexts, getDisplayText } from "./component";

describe("system disk display", () => {
  test("clamps malformed utilization before sizing the background", () => {
    expect(clampPercentage(-4)).toBe(0);
    expect(clampPercentage(108)).toBe(100);
  });

  test("falls back to provider values when sizes are already formatted", () => {
    expect(getDisplayText({ used: "5 GiB", available: "10 GiB", percentage: 50 }, "absolute")).toBe("5 GiB / 10 GiB");
  });

  test("provides every value used by the advanced view", () => {
    expect(
      getAdvancedDisplayTexts({ used: `${5 * 1024 ** 3}`, available: `${5 * 1024 ** 3}`, percentage: 50 }),
    ).toEqual({
      percentage: "50%",
      absolute: "5.0 GiB / 10.0 GiB",
      free: "50% free",
    });
  });

  test("clamps free space derived from malformed utilization", () => {
    expect(getDisplayText({ used: "11", available: "10", percentage: 108 }, "free")).toBe("0% free");
  });
});
