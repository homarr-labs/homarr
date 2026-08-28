import { IconBrain } from "@tabler/icons-react";

import { formatBytesPair } from "@homarr/common";
import { useI18n } from "@homarr/translation/client";

import type { LabelDisplayModeOption } from "..";
import { CommonChart } from "./common-chart";

export const SystemResourceMemoryChart = ({
  memoryUsageOverTime,
  totalCapacityInBytes,
  hasShadow,
  labelDisplayMode,
  advanced = false,
}: {
  memoryUsageOverTime: number[];
  totalCapacityInBytes: number;
  hasShadow: boolean;
  labelDisplayMode: LabelDisplayModeOption;
  advanced?: boolean;
}) => {
  const chartData = memoryUsageOverTime.map((usage, index) => ({
    index,
    usage,
  }));
  const t = useI18n("widget.systemResources.card");

  const percentageUsed =
    memoryUsageOverTime.length > 0 && totalCapacityInBytes > 0
      ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        memoryUsageOverTime[memoryUsageOverTime.length - 1]! /
        totalCapacityInBytes
      : undefined;

  const lastUsed = memoryUsageOverTime.at(-1) ?? 0;
  const memory = formatBytesPair(Math.round(lastUsed), totalCapacityInBytes);
  const tooltipLabel = `${memory.used} / ${memory.available} (${
    percentageUsed !== undefined ? Math.round(percentageUsed * 100) : 0
  }%)`;

  return (
    <CommonChart
      data={chartData}
      dataKey={"index"}
      series={[{ name: "usage", color: "red.6" }]}
      title={t("memory")}
      icon={IconBrain}
      labelDisplayMode={labelDisplayMode}
      advanced={advanced}
      yAxisProps={{ domain: [0, totalCapacityInBytes] }}
      lastValue={
        percentageUsed !== undefined
          ? `${Math.round(percentageUsed * 100)}%`
          : undefined
      }
      chartType={hasShadow ? "area" : "line"}
      tooltipLabel={tooltipLabel}
    />
  );
};
