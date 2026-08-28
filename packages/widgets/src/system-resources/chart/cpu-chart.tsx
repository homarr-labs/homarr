import { IconCpu } from "@tabler/icons-react";

import { invariantTechnicalLabels } from "@homarr/definitions";

import type { LabelDisplayModeOption } from "..";
import { CommonChart } from "./common-chart";

export const SystemResourceCPUChart = ({
  cpuUsageOverTime,
  hasShadow,
  labelDisplayMode,
  advanced = false,
}: {
  cpuUsageOverTime: number[];
  hasShadow: boolean;
  labelDisplayMode: LabelDisplayModeOption;
  advanced?: boolean;
}) => {
  const chartData = cpuUsageOverTime.map((usage, index) => ({ index, usage }));

  return (
    <CommonChart
      data={chartData}
      dataKey={"index"}
      series={[{ name: "usage", color: "blue.5" }]}
      title={invariantTechnicalLabels.cpu}
      icon={IconCpu}
      lastValue={
        cpuUsageOverTime.length > 0
          ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            `${Math.round(cpuUsageOverTime[cpuUsageOverTime.length - 1]!)}%`
          : undefined
      }
      chartType={hasShadow ? "area" : "line"}
      yAxisProps={{ domain: [0, 100] }}
      labelDisplayMode={labelDisplayMode}
      advanced={advanced}
      tooltipLabel={(index) => `${Math.round(cpuUsageOverTime[index] ?? 0)}%`}
    />
  );
};
