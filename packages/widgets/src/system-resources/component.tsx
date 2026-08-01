"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Group, ScrollArea, SimpleGrid, Stack, Text } from "@mantine/core";

import { clientApi } from "@homarr/api/client";

import type { WidgetComponentProps } from "../definition";
import { CombinedNetworkTrafficChart } from "./chart/combined-network-traffic";
import { SystemResourceCPUChart } from "./chart/cpu-chart";
import { SystemResourceGPUChart } from "./chart/gpu-chart";
import { SystemResourceMemoryChart } from "./chart/memory-chart";
import { NetworkTrafficChart } from "./chart/network-traffic";

const COMPACT_HISTORY_SIZE = 15;
const ADVANCED_HISTORY_SIZE = 60;

type ChartItem = {
  cpu: number;
  memory: number;
  gpu: number;
  network: { up: number; down: number } | null;
};

export const toChartItem = (healthInfo: {
  cpuUtilization: number;
  memUsedInBytes: number;
  gpu: { processorUtilization: number }[];
  network: { up: number; down: number } | null;
}): ChartItem => ({
  cpu: healthInfo.cpuUtilization,
  memory: healthInfo.memUsedInBytes,
  gpu:
    healthInfo.gpu.length > 0
      ? healthInfo.gpu.reduce((acc, gpu) => acc + gpu.processorUtilization, 0) / healthInfo.gpu.length
      : 0,
  network: healthInfo.network,
});

export const appendBoundedHistory = (history: ChartItem[], item: ChartItem, limit: number): ChartItem[] =>
  [...history, item].slice(-limit);

export default function SystemResources({
  integrationIds,
  options,
  width,
  displayMode,
}: WidgetComponentProps<"systemResources">) {
  const { data = [], dataUpdatedAt } = clientApi.widget.healthMonitoring.getSystemHealthStatus.useQuery({
    integrationIds,
  });
  const isAdvanced = displayMode === "advanced";
  const integrationKey = useMemo(() => integrationIds.join("\u0000"), [integrationIds]);
  const [historyByIntegration, setHistoryByIntegration] = useState<Record<string, ChartItem[]>>({});
  const previousIntegrationKey = useRef(integrationKey);

  useEffect(() => {
    if (previousIntegrationKey.current === integrationKey) return;
    previousIntegrationKey.current = integrationKey;
    setHistoryByIntegration({});
  }, [integrationKey]);

  const lastUpdatedAt = useRef(dataUpdatedAt);
  useEffect(() => {
    if (dataUpdatedAt === lastUpdatedAt.current) return;
    lastUpdatedAt.current = dataUpdatedAt;
    setHistoryByIntegration((previous) =>
      Object.fromEntries(
        data.map((entry) => [
          entry.integrationId,
          appendBoundedHistory(
            previous[entry.integrationId] ?? [],
            toChartItem(entry.healthInfo),
            ADVANCED_HISTORY_SIZE,
          ),
        ]),
      ),
    );
  }, [dataUpdatedAt, data]);

  const panelColumns = isAdvanced && width >= 960 && data.length > 1 ? 2 : 1;
  const panelWidth = width / panelColumns;
  const renderCharts = (entry: (typeof data)[number], availableWidth: number) => {
    const currentItem = toChartItem(entry.healthInfo);
    const fullHistory = historyByIntegration[entry.integrationId] ?? [currentItem];
    const history = isAdvanced ? fullHistory : fullHistory.slice(-COMPACT_HISTORY_SIZE);

    return (
      <SystemCharts
        key={entry.integrationId}
        integrationName={entry.integrationName}
        items={history}
        memoryCapacityInBytes={entry.healthInfo.memAvailableInBytes + entry.healthInfo.memUsedInBytes}
        options={options}
        width={availableWidth}
        isAdvanced={isAdvanced}
        showTitle={isAdvanced || data.length > 1}
      />
    );
  };

  if (!isAdvanced && data.length === 1 && data[0]) {
    return (
      <Box h="100%" p="xs">
        {renderCharts(data[0], width)}
      </Box>
    );
  }

  return (
    <ScrollArea h="100%">
      <SimpleGrid cols={panelColumns} spacing="xs" p="xs">
        {data.map((entry) => renderCharts(entry, panelWidth))}
      </SimpleGrid>
    </ScrollArea>
  );
}

interface SystemChartsProps {
  integrationName: string;
  items: ChartItem[];
  memoryCapacityInBytes: number;
  options: WidgetComponentProps<"systemResources">["options"];
  width: number;
  isAdvanced: boolean;
  showTitle: boolean;
}

const SystemCharts = ({
  integrationName,
  items,
  memoryCapacityInBytes,
  options,
  width,
  isAdvanced,
  showTitle,
}: SystemChartsProps) => {
  const showNetwork =
    items.length > 0 && items.every((item) => item.network !== null) && options.visibleCharts.includes("network");
  const chartCount = options.visibleCharts.filter((chart) => chart !== "network").length + Number(showNetwork);
  const chartColumns = isAdvanced && width >= 560 ? 2 : 1;
  const chartHeight = isAdvanced
    ? 180
    : `calc((100% - ${Math.max(0, chartCount - 1) * 8}px) / ${Math.max(1, chartCount)})`;

  return (
    <Stack gap="xs" h={isAdvanced ? "auto" : "100%"} miw={0}>
      {showTitle && (
        <Text size="sm" fw={600} truncate="end">
          {integrationName}
        </Text>
      )}
      <SimpleGrid cols={chartColumns} spacing="xs" style={{ flex: 1 }}>
        {options.visibleCharts.includes("cpu") && (
          <Box h={chartHeight}>
            <SystemResourceCPUChart
              cpuUsageOverTime={items.map((item) => item.cpu)}
              hasShadow={options.hasShadow}
              labelDisplayMode={options.labelDisplayMode}
            />
          </Box>
        )}
        {options.visibleCharts.includes("memory") && (
          <Box h={chartHeight}>
            <SystemResourceMemoryChart
              memoryUsageOverTime={items.map((item) => item.memory)}
              totalCapacityInBytes={memoryCapacityInBytes}
              hasShadow={options.hasShadow}
              labelDisplayMode={options.labelDisplayMode}
            />
          </Box>
        )}
        {options.visibleCharts.includes("gpu") && (
          <Box h={chartHeight}>
            <SystemResourceGPUChart
              gpuUsageOverTime={items.map((item) => item.gpu)}
              hasShadow={options.hasShadow}
              labelDisplayMode={options.labelDisplayMode}
            />
          </Box>
        )}
        {showNetwork &&
          (width >= 300 ? (
            <Group h={chartHeight} gap="xs" grow wrap="nowrap">
              <NetworkTrafficChart
                usageOverTime={items.map((item) => item.network?.down ?? 0)}
                isUp={false}
                hasShadow={options.hasShadow}
                labelDisplayMode={options.labelDisplayMode}
              />
              <NetworkTrafficChart
                usageOverTime={items.map((item) => item.network?.up ?? 0)}
                isUp
                hasShadow={options.hasShadow}
                labelDisplayMode={options.labelDisplayMode}
              />
            </Group>
          ) : (
            <Box h={chartHeight}>
              <CombinedNetworkTrafficChart
                usageOverTime={items.map((item) => item.network ?? { up: 0, down: 0 })}
                hasShadow={options.hasShadow}
                labelDisplayMode={options.labelDisplayMode}
              />
            </Box>
          ))}
      </SimpleGrid>
    </Stack>
  );
};
