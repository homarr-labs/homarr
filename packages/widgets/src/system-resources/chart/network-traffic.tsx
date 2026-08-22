import { Paper, Text } from "@mantine/core";
import { IconArrowDown, IconArrowUp } from "@tabler/icons-react";

import { formatByteRate } from "@homarr/common";
import { useI18n } from "@homarr/translation/client";

import type { LabelDisplayModeOption } from "..";
import { CommonChart } from "./common-chart";

export const NetworkTrafficChart = ({
  usageOverTime,
  isUp,
  hasShadow,
  labelDisplayMode,
}: {
  usageOverTime: number[];
  isUp: boolean;
  hasShadow: boolean;
  labelDisplayMode: LabelDisplayModeOption;
}) => {
  const chartData = usageOverTime.map((usage, index) => ({ index, usage }));
  const t = useI18n("widget.systemResources.card");

  const max = Math.max(...usageOverTime);
  const upperBound = max + max * 0.2;
  const latest = usageOverTime.at(-1) ?? 0;

  return (
    <CommonChart
      data={chartData}
      dataKey={"index"}
      series={[{ name: "usage", color: "yellow.5" }]}
      title={isUp ? t("up") : t("down")}
      icon={isUp ? IconArrowUp : IconArrowDown}
      yAxisProps={{ domain: [0, upperBound] }}
      lastValue={formatByteRate(Math.round(latest))}
      chartType={hasShadow ? "area" : "line"}
      labelDisplayMode={labelDisplayMode}
      tooltipProps={{
        content: ({ payload }) => {
          const value = payload[0] ? Number(payload[0].value) : 0;
          return (
            <Paper px={3} py={2} shadow="md">
              <Text c="dimmed" size="xs">
                {formatByteRate(Math.round(value))}
              </Text>
            </Paper>
          );
        },
      }}
    />
  );
};
