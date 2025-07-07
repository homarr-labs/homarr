import {Paper, Text} from "@mantine/core";
import {CommonChart} from "./common-chart";

export const SystemResourceCPUChart = ({cpuUsageOverTime}: { cpuUsageOverTime: number[] }) => {
  const chartData = cpuUsageOverTime.map((usage, index) => ({index, "usage": usage}));

  return (
    <CommonChart
      data={chartData}
      dataKey={"index"}
      series={[{name: "usage", color: "teal.6"}]}
      title={"CPU"}
      yAxisProps={{domain: [0, 100]}}
      tooltipProps={{
        content: ({payload}) => {
          if (!payload) {
            return;
          }
          const value = payload[0] ? Number(payload[0].value) : 0;
          return (
            <Paper px="md" py="sm" withBorder shadow="md" radius="md">
              <Text c="dimmed" size="xs">{value.toFixed(0)}%</Text>
            </Paper>
          );
        }
      }}
    />
  );
};
