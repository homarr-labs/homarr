import {Paper, Text} from "@mantine/core";
import {CommonChart} from "./common-chart";
import {humanFileSize} from "@homarr/common";

export const CombinedNetworkTrafficChart = ({usageOverTime}: {
  usageOverTime: {
    up: number
    down: number
  }[]
}) => {
  const chartData = usageOverTime.map((usage, index) => ({index, up: usage.up, down: usage.down}));

  return (
    <CommonChart
      data={chartData}
      dataKey={"index"}
      series={[{name: "up", color: "yellow.5"},{name: "down", color: "yellow.5"}]}
      title={"NET"}
      yAxisProps={{domain: [0, "dataMax"]}}
      tooltipProps={{
        content: ({payload}) => {
          if (!payload) {
            return null;
          }
          const value = payload[0] ? Number(payload[0].value) : 0;
          return (
            <Paper px={3} py={2} withBorder shadow="md" radius="md">
              <Text c="dimmed" size="xs">
                {humanFileSize(Math.round(value))}/s
              </Text>
            </Paper>
          );
        },
      }}
    />
  );
};
