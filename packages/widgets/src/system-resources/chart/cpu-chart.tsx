import { IconCpu } from "@tabler/icons-react";

import { invariantTechnicalLabels } from "@homarr/definitions";

import type { LabelDisplayModeOption } from "..";
import { CommonChart } from "./common-chart";

export const SystemResourceCPUChart = ({
  cpuUsageOverTime,
  hasShadow,
  labelDisplayMode,
  advanced = false,
  title = invariantTechnicalLabels.cpu,
}: {
  cpuUsageOverTime: (number | null)[];
  hasShadow: boolean;
  labelDisplayMode: LabelDisplayModeOption;
  advanced?: boolean;
  title?: string;
}) => {
  const chartData = cpuUsageOverTime.map((usage, index) => ({ index, usage }));
  const latest = cpuUsageOverTime.at(-1);

  return (
    <CommonChart
      data={chartData}
      dataKey={"index"}
      series={[{ name: "usage", color: "blue.5" }]}
      title={title}
      icon={IconCpu}
      lastValue={latest == null ? undefined : `${Math.round(latest)}%`}
      chartType={hasShadow ? "area" : "line"}
      yAxisProps={{ domain: [0, 100] }}
      labelDisplayMode={labelDisplayMode}
      advanced={advanced}
      tooltipLabel={(index) => {
        const usage = cpuUsageOverTime[index];
        return usage == null ? undefined : `${title}: ${Math.round(usage)}%`;
      }}
    />
  );
};
