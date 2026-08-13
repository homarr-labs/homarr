import { describe, expect, test } from "vitest";

import { getBeszelAlertsQueryInput } from "./display";

describe("Beszel alerts query input", () => {
  test("preserves compact history settings", () => {
    expect(getBeszelAlertsQueryInput(["beszel-a"], { showHistory: false, maxHistoryItems: 10 }, false)).toEqual({
      integrationIds: ["beszel-a"],
      includeHistory: false,
      maxHistoryItems: 10,
    });
  });

  test("requests a useful bounded history in advanced mode", () => {
    expect(getBeszelAlertsQueryInput(["beszel-a"], { showHistory: false, maxHistoryItems: 10 }, true)).toEqual({
      integrationIds: ["beszel-a"],
      includeHistory: true,
      maxHistoryItems: 50,
    });
    expect(getBeszelAlertsQueryInput(["beszel-a"], { showHistory: true, maxHistoryItems: 150 }, true)).toEqual({
      integrationIds: ["beszel-a"],
      includeHistory: true,
      maxHistoryItems: 100,
    });
  });
});
