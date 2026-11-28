import { IconBrain } from "@tabler/icons-react";

import { useByteFormatter } from "@homarr/settings";
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
  memoryUsageOverTime: (number | null)[];
  totalCapacityInBytes: number | null;
  hasShadow: boolean;
  labelDisplayMode: LabelDisplayModeOption;
  advanced?: boolean;
}) => {
  const chartData = memoryUsageOverTime.map((usage, index) => ({
    index,
    usage,
  }));
  const t = useI18n("widget.systemResources.card");
  const { formatBytesPair } = useByteFormatter();

  const latest = memoryUsageOverTime.at(-1);
  let percentageUsed;
  let capacityDomain: [number, number] | undefined;
  if (totalCapacityInBytes !== null && totalCapacityInBytes > 0) {
    capacityDomain = [0, totalCapacityInBytes];
    if (latest != null) percentageUsed = latest / totalCapacityInBytes;
  }
  const tooltipLabel = (index: number) => {
    const used = memoryUsageOverTime[index];
    if (used == null || totalCapacityInBytes === null || totalCapacityInBytes <= 0) return undefined;
    const memory = formatBytesPair(Math.round(used), totalCapacityInBytes);
    const percent = Math.round((used / totalCapacityInBytes) * 100);
    return t("memoryTooltip", {
      used: memory.used,
      available: memory.total,
      percent,
    });
  };

  return (
    <CommonChart
      data={chartData}
      series={[{ name: "usage", color: "red.6" }]}
      title={t("memory")}
      icon={IconBrain}
      labelDisplayMode={labelDisplayMode}
      advanced={advanced}
      yDomain={capacityDomain}
      lastValue={percentageUsed !== undefined ? `${Math.round(percentageUsed * 100)}%` : undefined}
      chartType={hasShadow ? "area" : "line"}
      tooltipLabel={tooltipLabel}
    />
  );
};
