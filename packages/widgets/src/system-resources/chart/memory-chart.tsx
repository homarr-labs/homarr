import { Paper, Text } from "@mantine/core";
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
  const chartData = memoryUsageOverTime.map((usage, index) => ({ index, usage }));
  const t = useI18n("widget.systemResources.card");

  const percentageUsed =
    memoryUsageOverTime.length > 0 && totalCapacityInBytes > 0
      ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        memoryUsageOverTime[memoryUsageOverTime.length - 1]! / totalCapacityInBytes
      : undefined;

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
      lastValue={percentageUsed !== undefined ? `${Math.round(percentageUsed * 100)}%` : undefined}
      chartType={hasShadow ? "area" : "line"}
      tooltipProps={{
        content: ({ payload }) => {
          const value = payload[0] ? Number(payload[0].value) : 0;
          const memory = formatBytesPair(Math.round(value), totalCapacityInBytes);
          return (
            <Paper px={3} py={2} shadow="md">
              <Text c="dimmed" size="xs">
                {memory.used} / {memory.available} (
                {totalCapacityInBytes > 0 ? Math.round((value / totalCapacityInBytes) * 100) : 0}%)
              </Text>
            </Paper>
          );
        },
      }}
    />
  );
};
