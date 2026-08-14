import { describe, expect, test } from "vitest";

import { isSmartHomeTiny } from "./layout";

describe("smart home layout", () => {
  test.each([
    { width: 127, height: 96, expected: true },
    { width: 128, height: 95, expected: true },
    { width: 128, height: 96, expected: false },
    { width: 256, height: 192, expected: false },
  ])("classifies $width x $height", ({ width, height, expected }) => {
    expect(isSmartHomeTiny(width, height)).toBe(expected);
  });
});
