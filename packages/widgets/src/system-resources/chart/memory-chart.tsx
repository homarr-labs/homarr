import { Paper, Text } from "@mantine/core";
import { CommonChart } from "./common-chart";
import { humanFileSize } from "@homarr/common";

export const SystemResourceMemoryChart = ({ memoryUsageOverTime }: { memoryUsageOverTime: number[] }) => {
  const chartData = memoryUsageOverTime.map((usage, index) => ({ index, "usage": usage }));

  return (
    <CommonChart
      data={chartData}
      dataKey={"index"}
      series={[{ name: "usage", color: "teal.6" }]}
      title={"RAM"}
      tooltipProps={{
        content: ({ label, payload }) => {
          const value = payload[0] ? Number(payload[0].value) : 0;
          return (
            <Paper px="md" py="sm" withBorder shadow="md" radius="md">
              <Text c="dimmed" size="xs">
                {humanFileSize(value)}
              </Text>
            </Paper>
          );
        },
      }}
    />
  );
};
