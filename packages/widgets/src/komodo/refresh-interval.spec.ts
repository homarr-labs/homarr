import { describe, expect, test } from "vitest";

import { getKomodoRefreshIntervalMs } from "./refresh-interval";

describe("getKomodoRefreshIntervalMs", () => {
  test.each([
    [5, 5_000],
    [30, 30_000],
    [60, 60_000],
    [3600, 3_600_000],
  ])("converts %s seconds to milliseconds", (seconds, expected) => {
    expect(getKomodoRefreshIntervalMs(seconds)).toBe(expected);
  });

  test("clamps values to the supported range", () => {
    expect(getKomodoRefreshIntervalMs(1)).toBe(5_000);
    expect(getKomodoRefreshIntervalMs(7200)).toBe(3_600_000);
  });

  test("falls back to 30 seconds for invalid values", () => {
    expect(getKomodoRefreshIntervalMs(Number.NaN)).toBe(30_000);
  });
});
