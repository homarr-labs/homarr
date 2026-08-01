import { describe, expect, test } from "vitest";

import { appendBoundedHistory, boundHistoryByIntegration, toChartItem } from "./component";

describe("system resource history", () => {
  test("averages all GPU values", () => {
    expect(
      toChartItem({
        cpuUtilization: 10,
        memUsedInBytes: 20,
        gpu: [{ processorUtilization: 20 }, { processorUtilization: 60 }],
        network: null,
      }).gpu,
    ).toBe(40);
  });

  test("keeps a bounded rolling history", () => {
    const item = toChartItem({ cpuUtilization: 1, memUsedInBytes: 2, gpu: [], network: null });
    expect(appendBoundedHistory([item, item], item, 2)).toHaveLength(2);
  });

  test("bounds restored history for every integration", () => {
    const item = toChartItem({ cpuUtilization: 1, memUsedInBytes: 2, gpu: [], network: null });
    expect(boundHistoryByIntegration({ first: [item, item, item], second: [item, item] }, 2)).toEqual({
      first: [item, item],
      second: [item, item],
    });
  });
});
