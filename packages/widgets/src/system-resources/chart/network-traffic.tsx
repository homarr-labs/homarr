import { Paper, Text } from "@mantine/core";

import { humanFileSize } from "@homarr/common";

import { CommonChart } from "./common-chart";
import {useScopedI18n} from "@homarr/translation/client";

export const NetworkTrafficChart = ({ usageOverTime, isUp }: { usageOverTime: number[]; isUp: boolean }) => {
  const chartData = usageOverTime.map((usage, index) => ({ index, usage }));
  const t = useScopedI18n('widget.systemResources.card');

  const max = Math.max(...usageOverTime);
  const upperBound = max + max * 0.2;

  return (
    <CommonChart
      data={chartData}
      dataKey={"index"}
      series={[{ name: "usage", color: "yellow.5" }]}
      title={isUp ? t("up") : t("down")}
      yAxisProps={{ domain: [0, upperBound] }}
      lastValue={`${humanFileSize(Math.round(max))}/s`}
      tooltipProps={{
        content: ({ payload }) => {
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
