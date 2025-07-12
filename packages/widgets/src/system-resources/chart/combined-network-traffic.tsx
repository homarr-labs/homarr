import {Box, Group, Paper, Stack, Text} from "@mantine/core";
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
      series={[{name: "up", color: "orange.5"}, {name: "down", color: "yellow.5"}]}
      title={"NET"}
      yAxisProps={{domain: [0, "dataMax"]}}
      tooltipProps={{
        content: ({payload}) => {
          if (!payload) {
            return null;
          }
          return (
            <Paper px={3} py={2} withBorder shadow="md" radius="md">
              <Stack gap={0}>
                {payload.map((payloadData) => (
                  <Group gap={4}>
                    <Box bg={payloadData.color} w={10} h={10} style={{ borderRadius: 99 }}></Box>
                    <Text c="dimmed" size="xs">
                      {payloadData.value === undefined ? (<>N/A</>) : (
                        <>
                          {humanFileSize(Math.round(payloadData.value))}/s
                        </>
                      )}
                    </Text>
                  </Group>
                ))}
              </Stack>

            </Paper>
          );
        },
      }}
    />
  );
};
