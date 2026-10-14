"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import { Box, Center, Group, ScrollArea, SimpleGrid, Stack, Text } from "@mantine/core";

import type { RouterOutputs } from "@homarr/api";

import { WidgetEmptyState } from "../common/empty-state";
import { WidgetQueryLoadingState } from "../common/query-state-indicator";
import type { WidgetComponentProps } from "../definition";
import type { SystemResourcePresentation } from "./native-view-types";
import { CombinedNetworkTrafficChart } from "./chart/combined-network-traffic";
import { SystemResourceCPUChart } from "./chart/cpu-chart";
import { SystemResourceGPUChart } from "./chart/gpu-chart";
import { SystemResourceMemoryChart } from "./chart/memory-chart";
import { NetworkTrafficChart } from "./chart/network-traffic";

const COMPACT_HISTORY_SIZE = 15;
export const ADVANCED_HISTORY_SIZE = 60;
const ALL_SYSTEM_CHARTS = ["cpu", "memory", "gpu", "network"] as const;

const ADVANCED_CHART_COLUMN_BREAKPOINTS = [
  { minWidth: 1100, columns: 4 },
  { minWidth: 560, columns: 2 },
  { minWidth: 0, columns: 1 },
] as const;

const getAdvancedChartColumns = (width: number): number =>
  ADVANCED_CHART_COLUMN_BREAKPOINTS.find(({ minWidth }) => width >= minWidth)?.columns ?? 1;

type SystemChart = WidgetComponentProps<"systemResources">["options"]["visibleCharts"][number];

export type ChartItem = {
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

export const getNetworkHistory = (items: readonly ChartItem[]) =>
  items.flatMap((item) => (item.network === null ? [] : [item.network]));

export const getCompactChartBudget = (height: number): number => {
  if (height < 140) return 1;
  if (height < 260) return 2;
  return 4;
};

export const getVisibleSystemCharts = ({
  configuredCharts,
  hasGpu,
  hasNetwork,
  height: _height,
  isAdvanced,
}: {
  configuredCharts: readonly SystemChart[];
  hasGpu: boolean;
  hasNetwork: boolean;
  height: number;
  isAdvanced: boolean;
}): SystemChart[] => {
  const selectedCharts = isAdvanced ? ALL_SYSTEM_CHARTS : configuredCharts;
  const availableCharts = selectedCharts.filter(
    (chart) => (chart !== "gpu" || !isAdvanced || hasGpu) && (chart !== "network" || hasNetwork),
  );
  return [...availableCharts];
};

export interface NativeSystemResourcesViewProps {
  options: WidgetComponentProps<"systemResources">["options"];
  width: number;
  height: number;
  displayMode: WidgetComponentProps<"systemResources">["displayMode"];
  data: (RouterOutputs["widget"]["healthMonitoring"]["getSystemHealthStatus"][number] & {
    healthInfo: NonNullable<RouterOutputs["widget"]["healthMonitoring"]["getSystemHealthStatus"][number]["healthInfo"]>;
  })[];
  historyByIntegration: Record<string, ChartItem[]>;
  isPending: boolean;
  queryIndicators: ReactNode;
  presentation: SystemResourcePresentation;
}

export function NativeSystemResourcesView({
  options,
  width,
  height,
  displayMode,
  data,
  historyByIntegration,
  isPending,
  queryIndicators,
  presentation,
}: NativeSystemResourcesViewProps) {
  const isAdvanced = displayMode === "advanced";

  const panelColumns = isAdvanced && width >= 960 && data.length > 1 ? 2 : 1;
  const panelWidth = width / panelColumns;
  const renderCharts = (entry: (typeof data)[number], availableWidth: number, availableHeight: number) => {
    const currentItem = toChartItem(entry.healthInfo);
    const fullHistory = historyByIntegration[entry.integrationId] ?? [currentItem, currentItem];
    const history = isAdvanced ? fullHistory : fullHistory.slice(-COMPACT_HISTORY_SIZE);

    return (
      <SystemCharts
        key={entry.integrationId}
        integrationName={entry.integrationName}
        items={history}
        hasGpu={entry.healthInfo.gpu.length > 0}
        memoryCapacityInBytes={entry.healthInfo.memAvailableInBytes + entry.healthInfo.memUsedInBytes}
        options={options}
        width={availableWidth}
        height={availableHeight}
        isAdvanced={isAdvanced}
        showTitle={isAdvanced || data.length > 1}
        presentation={presentation}
      />
    );
  };

  if (isPending) {
    return <WidgetQueryLoadingState />;
  }

  if (data.length === 0) {
    return (
      <Box h="100%" pos="relative">
        <Box pos="absolute" top={4} right={8} style={{ zIndex: 2 }}>
          {queryIndicators}
        </Box>
        <WidgetEmptyState />
      </Box>
    );
  }

  if (!isAdvanced && data.length === 1 && data[0]) {
    return (
      <Box h="100%" p="xs" pos="relative">
        <Box pos="absolute" top={4} right={8} style={{ zIndex: 2 }}>
          {queryIndicators}
        </Box>
        {renderCharts(data[0], width, Math.max(0, height - 20))}
      </Box>
    );
  }

  const compactPanelHeight = Math.max(160, Math.floor(height / Math.min(data.length, 2)));

  return (
    <Box h="100%" pos="relative">
      <Box pos="absolute" top={4} right={8} style={{ zIndex: 2 }}>
        {queryIndicators}
      </Box>
      <ScrollArea h="100%">
        <SimpleGrid cols={panelColumns} spacing="xs" p="xs">
          {data.map((entry) => renderCharts(entry, panelWidth, isAdvanced ? height : compactPanelHeight))}
        </SimpleGrid>
      </ScrollArea>
    </Box>
  );
}

interface SystemChartsProps {
  integrationName: string;
  items: ChartItem[];
  hasGpu: boolean;
  memoryCapacityInBytes: number;
  options: WidgetComponentProps<"systemResources">["options"];
  width: number;
  height: number;
  isAdvanced: boolean;
  showTitle: boolean;
  presentation: SystemResourcePresentation;
}

const SystemCharts = ({
  integrationName,
  items,
  hasGpu,
  memoryCapacityInBytes,
  options,
  width,
  height,
  isAdvanced,
  showTitle,
  presentation,
}: SystemChartsProps) => {
  const networkItems = getNetworkHistory(items);
  const visibleCharts = getVisibleSystemCharts({
    configuredCharts: options.visibleCharts,
    hasGpu,
    hasNetwork: networkItems.length > 0,
    height,
    isAdvanced,
  });
  const showNetwork = visibleCharts.includes("network");
  const labelDisplayMode = isAdvanced ? "textWithIcon" : options.labelDisplayMode;
  const chartCount = visibleCharts.length;
  const chartColumns = useMemo(() => (isAdvanced ? getAdvancedChartColumns(width) : 1), [isAdvanced, width]);
  const chartGap = isAdvanced ? "xs" : 8;

  return (
    <Stack gap={chartGap} style={{ height: `${height}px` }} miw={0}>
      {showTitle && (
        <Text size="sm" fw={600} truncate="end">
          {integrationName}
        </Text>
      )}
      <SimpleGrid cols={chartColumns} spacing={chartGap} style={{ flex: 1, minHeight: 0, gridAutoRows: "1fr" }}>
        {chartCount === 0 && (
          <Center h="100%">
            <Text size="sm" c="dimmed">
              —
            </Text>
          </Center>
        )}
        {visibleCharts.includes("cpu") && (
          <Box h="100%">
            <SystemResourceCPUChart
              presentation={presentation}
              cpuUsageOverTime={items.map((item) => item.cpu)}
              hasShadow={options.hasShadow}
              labelDisplayMode={labelDisplayMode}
              advanced={isAdvanced}
            />
          </Box>
        )}
        {visibleCharts.includes("memory") && (
          <Box h="100%">
            <SystemResourceMemoryChart
              presentation={presentation}
              memoryUsageOverTime={items.map((item) => item.memory)}
              totalCapacityInBytes={memoryCapacityInBytes}
              hasShadow={options.hasShadow}
              labelDisplayMode={labelDisplayMode}
              advanced={isAdvanced}
            />
          </Box>
        )}
        {visibleCharts.includes("gpu") && (
          <Box h="100%">
            <SystemResourceGPUChart
              presentation={presentation}
              gpuUsageOverTime={items.map((item) => item.gpu)}
              hasShadow={options.hasShadow}
              labelDisplayMode={labelDisplayMode}
              advanced={isAdvanced}
            />
          </Box>
        )}
        {showNetwork &&
          (width >= 300 ? (
            <Group h="100%" gap="xs" grow wrap="nowrap">
              <NetworkTrafficChart
                presentation={presentation}
                usageOverTime={networkItems.map((network) => network.down)}
                isUp={false}
                hasShadow={options.hasShadow}
                labelDisplayMode={labelDisplayMode}
                advanced={isAdvanced}
              />
              <NetworkTrafficChart
                presentation={presentation}
                usageOverTime={networkItems.map((network) => network.up)}
                isUp
                hasShadow={options.hasShadow}
                labelDisplayMode={labelDisplayMode}
                advanced={isAdvanced}
              />
            </Group>
          ) : (
            <Box h="100%">
              <CombinedNetworkTrafficChart
                presentation={presentation}
                usageOverTime={networkItems}
                hasShadow={options.hasShadow}
                labelDisplayMode={labelDisplayMode}
                advanced={isAdvanced}
              />
            </Box>
          ))}
      </SimpleGrid>
    </Stack>
  );
};
