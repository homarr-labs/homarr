import { describe, expect, test } from "vitest";

import { formatByteRate, formatBytes } from "@homarr/common";

import { createByteChartAxisFormatters, getProgressTrackSize } from "./format";

const GIBIBYTE = 1024 ** 3;
const binaryAxisFormatters = createByteChartAxisFormatters(
  (bytes) => formatBytes(bytes, { unit: "binary" }),
  (bytes) => formatByteRate(bytes, { unit: "binary" }),
);

describe("Beszel storage formatting", () => {
  test("formats canonical byte values with shared binary units", () => {
    expect(binaryAxisFormatters.bytes(455.81 * GIBIBYTE)).toBe("455.8GiB");
  });

  test("promotes large canonical byte values to TiB", () => {
    expect(binaryAxisFormatters.bytes(3323 * GIBIBYTE)).toBe("3.2TiB");
    expect(binaryAxisFormatters.bytes(3936.86 * GIBIBYTE)).toBe("3.8TiB");
  });

  test("maps progress sizes consistently", () => {
    expect(getProgressTrackSize("xs")).toBe(6);
    expect(getProgressTrackSize("sm")).toBe(9);
  });
});
