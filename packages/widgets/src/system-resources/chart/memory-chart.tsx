import { IconBrain } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";

import type { LabelDisplayModeOption } from "..";
import { CommonChart } from "./common-chart";
import type { SystemResourcePresentation } from "../native-view-types";

export const SystemResourceMemoryChart = ({
  memoryUsageOverTime,
  totalCapacityInBytes,
  hasShadow,
  labelDisplayMode,
  advanced = false,
  presentation,
}: {
  memoryUsageOverTime: number[];
  totalCapacityInBytes: number;
  hasShadow: boolean;
  labelDisplayMode: LabelDisplayModeOption;
  advanced?: boolean;
  presentation: SystemResourcePresentation;
}) => {
  const chartData = memoryUsageOverTime.map((usage, index) => ({
    index,
    usage,
  }));
  const t = useI18n("widget.systemResources.card");
  const { formatBytesPair } = presentation;

  const percentageUsed =
    memoryUsageOverTime.length > 0 && totalCapacityInBytes > 0
      ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        memoryUsageOverTime[memoryUsageOverTime.length - 1]! / totalCapacityInBytes
      : undefined;

  const tooltipLabel = (index: number) => {
    const used = memoryUsageOverTime[index] ?? 0;
    const memory = formatBytesPair(Math.round(used), totalCapacityInBytes);
    const percent = totalCapacityInBytes > 0 ? Math.round((used / totalCapacityInBytes) * 100) : 0;
    return t("memoryTooltip", {
      used: memory.used,
      available: memory.total,
      percent,
    });
  };

  return (
    <CommonChart
      presentation={presentation}
      data={chartData}
      dataKey={"index"}
      series={[{ name: "usage", color: "red.6" }]}
      title={t("memory")}
      icon={IconBrain}
      labelDisplayMode={labelDisplayMode}
      advanced={advanced}
      yAxisProps={{ domain: [0, totalCapacityInBytes] }}
      lastValue={percentageUsed !== undefined ? `${Math.round(percentageUsed * 100)}%` : undefined}
      chartType={hasShadow ? "area" : "line"}
      tooltipLabel={tooltipLabel}
    />
  );
};
