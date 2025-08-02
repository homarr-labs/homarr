import { Box, Group, Paper, Stack, Text } from "@mantine/core";

import { humanFileSize } from "@homarr/common";
import { useScopedI18n } from "@homarr/translation/client";

import { CommonChart } from "./common-chart";

export const CombinedNetworkTrafficChart = ({
  usageOverTime,
}: {
  usageOverTime: {
    up: number;
    down: number;
  }[];
}) => {
  const chartData = usageOverTime.map((usage, index) => ({ index, up: usage.up, down: usage.down }));
  const t = useScopedI18n("widget.systemResources.card");

  return (
    <CommonChart
      data={chartData}
      dataKey={"index"}
      series={[
        { name: "up", color: "orange.5" },
        { name: "down", color: "yellow.5" },
      ]}
      title={t("network")}
      yAxisProps={{ domain: [0, "dataMax"] }}
      tooltipProps={{
        content: ({ payload }) => {
          if (!payload) {
            return null;
          }
          return (
            <Paper px={3} py={2} withBorder shadow="md" radius="md">
              <Stack gap={0}>
                {payload.map((payloadData) => (
                  <Group key={payloadData.key} gap={4}>
                    <Box bg={payloadData.color} w={10} h={10} style={{ borderRadius: 99 }}></Box>
                    <Text c="dimmed" size="xs">
                      {payloadData.value === undefined ? (
                        <>N/A</>
                      ) : (
                        <>{humanFileSize(Math.round(payloadData.value))}/s</>
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
