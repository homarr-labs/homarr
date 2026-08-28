import { Box, Group, Stack, Text } from "@mantine/core";
import { IconNetwork } from "@tabler/icons-react";

import { formatByteRate } from "@homarr/common";
import { useI18n } from "@homarr/translation/client";

import type { LabelDisplayModeOption } from "..";
import { CommonChart } from "./common-chart";

export const CombinedNetworkTrafficChart = ({
  usageOverTime,
  hasShadow,
  labelDisplayMode,
  advanced = false,
}: {
  usageOverTime: {
    up: number;
    down: number;
  }[];
  hasShadow: boolean;
  labelDisplayMode: LabelDisplayModeOption;
  advanced?: boolean;
}) => {
  const chartData = usageOverTime.map((usage, index) => ({
    index,
    up: usage.up,
    down: usage.down,
  }));
  const t = useI18n("widget.systemResources.card");

  const tooltipLabel = (index: number) => {
    const point = usageOverTime[index];
    return (
      <Stack gap={2}>
        <Group gap={4} wrap="nowrap">
          <Box
            bg="orange.5"
            w={8}
            h={8}
            style={{ borderRadius: 99, flexShrink: 0 }}
          />
          <Text size="xs">{formatByteRate(Math.round(point?.up ?? 0))}</Text>
        </Group>
        <Group gap={4} wrap="nowrap">
          <Box
            bg="yellow.5"
            w={8}
            h={8}
            style={{ borderRadius: 99, flexShrink: 0 }}
          />
          <Text size="xs">{formatByteRate(Math.round(point?.down ?? 0))}</Text>
        </Group>
      </Stack>
    );
  };

  return (
    <CommonChart
      data={chartData}
      dataKey={"index"}
      series={[
        { name: "up", color: "orange.5" },
        { name: "down", color: "yellow.5" },
      ]}
      title={t("network")}
      icon={IconNetwork}
      yAxisProps={{ domain: [0, "dataMax"] }}
      chartType={hasShadow ? "area" : "line"}
      labelDisplayMode={labelDisplayMode}
      advanced={advanced}
      tooltipLabel={tooltipLabel}
    />
  );
};
