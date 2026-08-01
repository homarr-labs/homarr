import { describe, expect, test } from "vitest";

import { appendBoundedHistory, getNetworkHistory, toChartItem } from "./component";

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

  test("omits unavailable network samples instead of inventing zero traffic", () => {
    const missing = toChartItem({ cpuUtilization: 1, memUsedInBytes: 2, gpu: [], network: null });
    const available = toChartItem({
      cpuUtilization: 1,
      memUsedInBytes: 2,
      gpu: [],
      network: { up: 12, down: 34 },
    });

    expect(getNetworkHistory([missing, available, missing])).toEqual([{ up: 12, down: 34 }]);
  });
});
