import { Paper, Text } from "@mantine/core";
import { IconCpu } from "@tabler/icons-react";

import { invariantTechnicalLabels } from "@homarr/definitions";

import type { LabelDisplayModeOption } from "..";
import { CommonChart } from "./common-chart";

export const SystemResourceCPUChart = ({
  cpuUsageOverTime,
  hasShadow,
  labelDisplayMode,
  advanced = false,
}: {
  cpuUsageOverTime: number[];
  hasShadow: boolean;
  labelDisplayMode: LabelDisplayModeOption;
  advanced?: boolean;
}) => {
  const chartData = cpuUsageOverTime.map((usage, index) => ({ index, usage }));

  return (
    <CommonChart
      data={chartData}
      dataKey={"index"}
      series={[{ name: "usage", color: "blue.5" }]}
      title={invariantTechnicalLabels.cpu}
      icon={IconCpu}
      lastValue={
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        cpuUsageOverTime.length > 0 ? `${Math.round(cpuUsageOverTime[cpuUsageOverTime.length - 1]!)}%` : undefined
      }
      chartType={hasShadow ? "area" : "line"}
      yAxisProps={{ domain: [0, 100] }}
      labelDisplayMode={labelDisplayMode}
      advanced={advanced}
      tooltipProps={{
        content: ({ payload }) => {
          const value = payload[0] ? Number(payload[0].value) : 0;
          return (
            <Paper px={3} py={2} shadow="md">
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
