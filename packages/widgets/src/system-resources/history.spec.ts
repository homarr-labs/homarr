import { describe, expect, test } from "vitest";

import {
  appendBoundedHistory,
  getCompactChartBudget,
  getNetworkHistory,
  getVisibleSystemCharts,
  toChartItem,
} from "./component";

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

  test("limits compact charts to the available height", () => {
    expect(getCompactChartBudget(100)).toBe(1);
    expect(getCompactChartBudget(200)).toBe(2);
    expect(getCompactChartBudget(300)).toBe(4);
  });

  test("advanced mode exposes every available chart regardless of compact configuration", () => {
    expect(
      getVisibleSystemCharts({
        configuredCharts: ["cpu"],
        hasGpu: true,
        hasNetwork: true,
        height: 100,
        isAdvanced: true,
      }),
    ).toEqual(["cpu", "memory", "gpu", "network"]);
  });

  test("advanced mode omits charts whose data is unavailable", () => {
    expect(
      getVisibleSystemCharts({
        configuredCharts: ["gpu", "network"],
        hasGpu: false,
        hasNetwork: false,
        height: 300,
        isAdvanced: true,
      }),
    ).toEqual(["cpu", "memory"]);
  });
});
