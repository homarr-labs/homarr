import { IconDeviceDesktop } from "@tabler/icons-react";

import { invariantTechnicalLabels } from "@homarr/definitions";

import type { LabelDisplayModeOption } from "..";
import { CommonChart } from "./common-chart";
import type { SystemResourcePresentation } from "../native-view-types";

export const SystemResourceGPUChart = ({
  gpuUsageOverTime,
  hasShadow,
  labelDisplayMode,
  advanced = false,
  presentation,
}: {
  gpuUsageOverTime: number[];
  hasShadow: boolean;
  labelDisplayMode: LabelDisplayModeOption;
  advanced?: boolean;
  presentation: SystemResourcePresentation;
}) => {
  const chartData = gpuUsageOverTime.map((usage, index) => ({ index, usage }));

  return (
    <CommonChart
      presentation={presentation}
      data={chartData}
      dataKey={"index"}
      series={[{ name: "usage", color: "grape.5" }]}
      title={invariantTechnicalLabels.gpu}
      icon={IconDeviceDesktop}
      lastValue={
        gpuUsageOverTime.length > 0
          ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            `${Math.round(gpuUsageOverTime[gpuUsageOverTime.length - 1]!)}%`
          : undefined
      }
      chartType={hasShadow ? "area" : "line"}
      yAxisProps={{ domain: [0, 100] }}
      labelDisplayMode={labelDisplayMode}
      advanced={advanced}
      tooltipLabel={(index) => `${Math.round(gpuUsageOverTime[index] ?? 0)}%`}
    />
  );
};
