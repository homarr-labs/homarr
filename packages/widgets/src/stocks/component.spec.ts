import { describe, expect, it } from "vitest";

import { getStockLayout, getStockSummary } from "./component";

describe("stock summary", () => {
  it("returns no summary for an empty series", () => {
    expect(getStockSummary([], 10)).toBeNull();
  });

  it("does not divide by a zero previous close", () => {
    expect(getStockSummary([0, 5], 0)).toMatchObject({
      currentPrice: 5,
      previousClose: 0,
      change: 5,
      changePercentage: null,
      minimum: 0,
      maximum: 5,
      graphValues: [50, 55],
    });
  });

  it("derives every advanced metric from the owned price series", () => {
    expect(getStockSummary([90, 110, 105], 100)).toMatchObject({
      currentPrice: 105,
      previousClose: 100,
      change: 5,
      changePercentage: 5,
      minimum: 90,
      maximum: 110,
    });
  });
});

describe("stock layout", () => {
  it("keeps compact widgets focused on symbol and price", () => {
    expect(getStockLayout(320, 100, true)).toMatchObject({
      showName: false,
      showChange: false,
      showRange: false,
      priceOrder: 2,
    });
  });

  it("reveals secondary data only when both axes have room", () => {
    expect(getStockLayout(320, 160, true)).toMatchObject({
      showName: false,
      showChange: true,
      showRange: true,
    });
    expect(getStockLayout(320, 220, true)).toMatchObject({
      showName: true,
      showChange: true,
      showRange: true,
      graphHeight: "68%",
    });
  });

  it("exposes the complete summary when the widget is roomy", () => {
    expect(getStockLayout(640, 360, true)).toEqual({
      showName: true,
      showChange: true,
      showRange: true,
      graphHeight: "75%",
      priceOrder: 1,
    });
  });

  it("hides name, change, and range regardless of size when showDetails is off", () => {
    expect(getStockLayout(640, 360, false)).toMatchObject({
      showName: false,
      showChange: false,
      showRange: false,
    });
  });
});
