import { describe, expect, test } from "vitest";

import { isBeszelGridMetricVisible } from "./display";

describe("Beszel grid metric visibility", () => {
  test("honors compact configuration", () => {
    expect(isBeszelGridMetricVisible(false, false)).toBe(false);
    expect(isBeszelGridMetricVisible(true, false)).toBe(true);
  });

  test("forces configured-off metrics in advanced mode when applicable", () => {
    expect(isBeszelGridMetricVisible(false, true)).toBe(true);
    expect(isBeszelGridMetricVisible(false, true, false)).toBe(false);
  });
});
