import { Paper, Text } from "@mantine/core";
import { IconDeviceDesktop } from "@tabler/icons-react";

import { useScopedI18n } from "@homarr/translation/client";

import type { LabelDisplayModeOption } from "..";
import { CommonChart } from "./common-chart";

export const SystemResourceGPUChart = ({
  gpuUsageOverTime,
  hasShadow,
  labelDisplayMode,
}: {
  gpuUsageOverTime: number[];
  hasShadow: boolean;
  labelDisplayMode: LabelDisplayModeOption;
}) => {
  const chartData = gpuUsageOverTime.map((usage, index) => ({ index, usage }));
  const t = useScopedI18n("widget.systemResources.card");

  return (
    <CommonChart
      data={chartData}
      dataKey={"index"}
      series={[{ name: "usage", color: "grape.5" }]}
      title={t("gpu")}
      icon={IconDeviceDesktop}
      lastValue={
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        gpuUsageOverTime.length > 0 ? `${Math.round(gpuUsageOverTime[gpuUsageOverTime.length - 1]!)}%` : undefined
      }
      chartType={hasShadow ? "area" : "line"}
      yAxisProps={{ domain: [0, 100] }}
      labelDisplayMode={labelDisplayMode}
      tooltipProps={{
        content: ({ payload }) => {
          if (!payload) {
            return null;
          }
          const value = payload[0] ? Number(payload[0].value) : 0;
          return (
            <Paper px={3} py={2} withBorder shadow="md" radius="md">
              <Text c="dimmed" size="xs">
                {value.toFixed(0)}%
              </Text>
            </Paper>
          );
        },
      }}
    />
  );
};
