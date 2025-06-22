import { Paper, Text } from "@mantine/core";

import { humanFileSize } from "@homarr/common";

import { CommonChart } from "./common-chart";

export const SystemResourceMemoryChart = ({
  memoryUsageOverTime,
  totalCapacityInBytes,
}: {
  memoryUsageOverTime: number[];
  totalCapacityInBytes: number;
}) => {
  const chartData = memoryUsageOverTime.map((usage, index) => ({ index, usage }));

  return (
    <CommonChart
      data={chartData}
      dataKey={"index"}
      series={[{ name: "usage", color: "red.6" }]}
      title={"RAM"}
      yAxisProps={{ domain: [0, totalCapacityInBytes] }}
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
