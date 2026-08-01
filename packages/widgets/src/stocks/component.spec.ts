import { describe, expect, it } from "vitest";

import { getStockSummary } from "./component";

describe("stock summary", () => {
  it("returns no summary for an empty series", () => {
    expect(getStockSummary([], 10)).toBeNull();
  });

  it("does not divide by a zero previous close", () => {
    expect(getStockSummary([0, 5], 0)).toMatchObject({
      currentPrice: 5,
      change: 5,
      changePercentage: null,
      graphValues: [50, 55],
    });
  });
});
