import { describe, expect, test } from "vitest";

import type { SetupMetricProperties } from "./setup-analytics";

describe("SetupMetricProperties", () => {
  test("keeps the measurement contract coarse and configuration-free", () => {
    const allowedKeys = [
      "entryPoint",
      "intent",
      "outcome",
      "elapsedMs",
      "hasBoardContext",
      "canResolveInline",
    ] satisfies (keyof SetupMetricProperties)[];
    type ExpectedKey = (typeof allowedKeys)[number];
    type ActualKey = keyof SetupMetricProperties;
    const exactContract: [ActualKey] extends [ExpectedKey]
      ? [ExpectedKey] extends [ActualKey]
        ? true
        : false
      : false = true;

    expect(exactContract).toBe(true);
    expect(allowedKeys).not.toContain("url");
    expect(allowedKeys).not.toContain("query");
    expect(allowedKeys).not.toContain("recordId");
  });
});
