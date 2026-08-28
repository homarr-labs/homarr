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
  gpuUsageOverTime: number[];
  hasShadow: boolean;
  labelDisplayMode: LabelDisplayModeOption;
  advanced?: boolean;
}) => {
  const chartData = gpuUsageOverTime.map((usage, index) => ({ index, usage }));

  return (
    <CommonChart
      data={chartData}
      dataKey={"index"}
      series={[{ name: "usage", color: "grape.5" }]}
      title={invariantTechnicalLabels.gpu}
      icon={IconDeviceDesktop}
      lastValue={
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        gpuUsageOverTime.length > 0
          ? `${Math.round(gpuUsageOverTime[gpuUsageOverTime.length - 1]!)}%`
          : undefined
      }
      chartType={hasShadow ? "area" : "line"}
      yAxisProps={{ domain: [0, 100] }}
      labelDisplayMode={labelDisplayMode}
      advanced={advanced}
    />
  );
};
