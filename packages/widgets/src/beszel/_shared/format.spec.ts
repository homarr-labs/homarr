import { describe, expect, test } from "vitest";

import { chartAxisFormatters, formatGB, getProgressTrackSize } from "./format";

describe("Beszel storage formatting", () => {
  test("keeps smaller values in GB", () => {
    expect(formatGB(455.81)).toBe("455.81 GB");
    expect(chartAxisFormatters.gb(455.81)).toBe("456G");
  });

  test("promotes large GiB values to TB", () => {
    expect(formatGB(3323)).toBe("3.25 TB");
    expect(formatGB(3936.86)).toBe("3.84 TB");
    expect(chartAxisFormatters.gb(3323)).toBe("3.2T");
  });

  test("maps progress sizes consistently", () => {
    expect(getProgressTrackSize("xs")).toBe(6);
    expect(getProgressTrackSize("sm")).toBe(9);
  });
});
