import { IconDeviceDesktop } from "@tabler/icons-react";

import { invariantTechnicalLabels } from "@homarr/definitions";

import type { LabelDisplayModeOption } from "..";
import { CommonChart } from "./common-chart";

export const SystemResourceGPUChart = ({
  gpuUsageOverTime,
  hasShadow,
  labelDisplayMode,
  advanced = false,
}: {
  gpuUsageOverTime: (number | null)[];
  hasShadow: boolean;
  labelDisplayMode: LabelDisplayModeOption;
  advanced?: boolean;
}) => {
  const chartData = gpuUsageOverTime.map((usage, index) => ({ index, usage }));

  const latest = gpuUsageOverTime.at(-1);
  return (
    <CommonChart
      data={chartData}
      series={[{ name: "usage", color: "grape.5" }]}
      title={invariantTechnicalLabels.gpu}
      icon={IconDeviceDesktop}
      lastValue={latest == null ? undefined : Math.round(latest) + "%"}
      chartType={hasShadow ? "area" : "line"}
      yDomain={[0, 100]}
      labelDisplayMode={labelDisplayMode}
      advanced={advanced}
      tooltipLabel={(index) => {
        const usage = gpuUsageOverTime[index];
        if (usage != null) return Math.round(usage) + "%";
      }}
    />
  );
};
