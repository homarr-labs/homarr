import { describe, expect, test } from "vitest";

import { calculateResourcePercentage } from "./resource-percentage";

describe("calculateResourcePercentage", () => {
  test("calculates a rounded percentage", () => {
    expect(calculateResourcePercentage(1, 3)).toBe(33.33);
  });

  test("returns zero when no capacity is available", () => {
    expect(calculateResourcePercentage(1, 0)).toBe(0);
  });
});
