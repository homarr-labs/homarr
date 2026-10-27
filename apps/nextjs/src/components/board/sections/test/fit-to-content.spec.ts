import { describe, expect, test } from "vitest";

import { getFitRowCount } from "../auto-expand/fit-to-content";

describe("getFitRowCount", () => {
  const rowsPerPixel = 1 / 100;

  test("gives back spare height", () => {
    expect(getFitRowCount({ current: 5, savedRowCount: 5, slackPx: 250, rowsPerPixel })).toBe(2.5);
  });

  test("takes back missing height", () => {
    expect(getFitRowCount({ current: 2.5, savedRowCount: 5, slackPx: -100, rowsPerPixel })).toBe(3.5);
  });

  test("never grows past the saved height", () => {
    expect(getFitRowCount({ current: 4, savedRowCount: 5, slackPx: -1000, rowsPerPixel })).toBe(5);
  });

  test("never shrinks below one row", () => {
    expect(getFitRowCount({ current: 2, savedRowCount: 5, slackPx: 1000, rowsPerPixel })).toBe(1);
  });

  test("keeps the current height for negligible changes", () => {
    expect(getFitRowCount({ current: 3, savedRowCount: 5, slackPx: 0.5, rowsPerPixel })).toBe(3);
  });
});
