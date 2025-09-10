import { Paper, Text } from "@mantine/core";

import { humanFileSize } from "@homarr/common";
import { useScopedI18n } from "@homarr/translation/client";

import { CommonChart } from "./common-chart";

export const SystemResourceMemoryChart = ({
  memoryUsageOverTime,
  totalCapacityInBytes,
  hasShadow,
}: {
  memoryUsageOverTime: number[];
  totalCapacityInBytes: number;
  hasShadow: boolean;
}) => {
  const chartData = memoryUsageOverTime.map((usage, index) => ({ index, usage }));
  const t = useScopedI18n("widget.systemResources.card");

  const percentageUsed =
    memoryUsageOverTime.length > 0
      ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        memoryUsageOverTime[memoryUsageOverTime.length - 1]! / totalCapacityInBytes
      : undefined;

  return (
    <CommonChart
      data={chartData}
      dataKey={"index"}
      series={[{ name: "usage", color: "red.6" }]}
      title={t("memory")}
      yAxisProps={{ domain: [0, totalCapacityInBytes] }}
      lastValue={percentageUsed !== undefined ? `${Math.round(percentageUsed * 100)}%` : undefined}
      chartType={hasShadow ? "area" : "line"}
      tooltipProps={{
        content: ({ payload }) => {
          if (!payload) {
            return null;
          }
          const value = payload[0] ? Number(payload[0].value) : 0;
          return (
            <Paper px={3} py={2} withBorder shadow="md" radius="md">
              <Text c="dimmed" size="xs">
                {humanFileSize(value)} / {humanFileSize(totalCapacityInBytes)} (
                {Math.round((value / totalCapacityInBytes) * 100)}%)
              </Text>
            </Paper>
          );
        },
      }}
    />
  );
};
