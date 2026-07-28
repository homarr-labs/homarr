import { describe, expect, test } from "vitest";

import { hasWidgetDataWarning, throwOnInitialQueryError } from "./query-state";

describe("widget query state", () => {
  test.each([
    { error: new Error("refresh failed") },
    { failedIntegrationCount: 1 },
    { staleIntegrationCount: 1 },
    { expectedIntegrationCount: 2, receivedIntegrationCount: 1 },
  ])("warns when data provenance is incomplete or stale", (provenance) => {
    expect(hasWidgetDataWarning(provenance)).toBe(true);
  });

  test("does not warn for complete current data", () => {
    expect(
      hasWidgetDataWarning({
        failedIntegrationCount: 0,
        staleIntegrationCount: 0,
        expectedIntegrationCount: 2,
        receivedIntegrationCount: 2,
      }),
    ).toBe(false);
  });

  test("throws an initial query error", () => {
    const error = new Error("initial request failed");
    expect(() => throwOnInitialQueryError(error, false)).toThrow(error);
  });

  test("keeps cached data visible after a refresh error", () => {
    expect(() => throwOnInitialQueryError(new Error("refresh failed"), true)).not.toThrow();
  });
});
