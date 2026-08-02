import { describe, expect, it } from "vitest";

import { getStockLayout, getStockSummary } from "./component";

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

describe("stock layout", () => {
  it("keeps compact widgets focused on symbol and price", () => {
    expect(getStockLayout(320, 100, false)).toMatchObject({
      showName: false,
      showChange: false,
      showRange: false,
      priceOrder: 2,
    });
  });

  it("reveals secondary data only when both axes have room", () => {
    expect(getStockLayout(320, 160, false)).toMatchObject({
      showName: false,
      showChange: true,
      showRange: true,
    });
    expect(getStockLayout(320, 220, false)).toMatchObject({
      showName: true,
      showChange: true,
      showRange: true,
      graphHeight: "68%",
    });
  });

  it("always exposes the complete advanced summary", () => {
    expect(getStockLayout(120, 80, true)).toEqual({
      showName: true,
      showChange: true,
      showRange: true,
      graphHeight: "75%",
      priceOrder: 1,
    });
  });
});
