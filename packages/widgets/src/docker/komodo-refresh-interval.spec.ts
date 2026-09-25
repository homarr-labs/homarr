import { describe, expect, test } from "vitest";

import { getKomodoRefreshIntervalMs } from "./komodo-refresh-interval";

describe("getKomodoRefreshIntervalMs", () => {
  test.each([
    [1, 1_000],
    [30, 30_000],
    [60, 60_000],
    [300, 300_000],
  ])("converts %s seconds to milliseconds", (seconds, expected) => {
    expect(getKomodoRefreshIntervalMs(seconds)).toBe(expected);
  });

  test("clamps values to the supported range", () => {
    expect(getKomodoRefreshIntervalMs(0)).toBe(1_000);
    expect(getKomodoRefreshIntervalMs(301)).toBe(300_000);
  });

  test("falls back to 30 seconds for invalid values", () => {
    expect(getKomodoRefreshIntervalMs(Number.NaN)).toBe(30_000);
  });
});
