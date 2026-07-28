import { describe, expect, test } from "vitest";

import { hasStaleIntegrationData } from "./query-status";

describe("Beszel query status", () => {
  test("marks cached data stale after outer or per-integration failures", () => {
    expect(hasStaleIntegrationData(true, [])).toBe(true);
    expect(hasStaleIntegrationData(false, [{ error: "offline" }])).toBe(true);
    expect(hasStaleIntegrationData(false, [])).toBe(false);
  });
});
