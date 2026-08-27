"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Center, Group, Loader, ScrollArea, SimpleGrid, Stack, Text } from "@mantine/core";

import { clientApi } from "@homarr/api/client";

import { WidgetEmptyState } from "../common/empty-state";
import { IntegrationErrorIndicator } from "../common/integration-error-indicator";
import type { WidgetComponentProps } from "../definition";
import { getUsableWidgetQueryData } from "../common/query-state";
import { CombinedNetworkTrafficChart } from "./chart/combined-network-traffic";
import { SystemResourceCPUChart } from "./chart/cpu-chart";
import { SystemResourceGPUChart } from "./chart/gpu-chart";
import { SystemResourceMemoryChart } from "./chart/memory-chart";
import { NetworkTrafficChart } from "./chart/network-traffic";

const COMPACT_HISTORY_SIZE = 15;
const ADVANCED_HISTORY_SIZE = 60;
const ALL_SYSTEM_CHARTS = ["cpu", "memory", "gpu", "network"] as const;

const ADVANCED_CHART_COLUMN_BREAKPOINTS = [
  { minWidth: 1100, columns: 4 },
  { minWidth: 560, columns: 2 },
  { minWidth: 0, columns: 1 },
] as const;

const getAdvancedChartColumns = (width: number): number =>
  ADVANCED_CHART_COLUMN_BREAKPOINTS.find(({ minWidth }) => width >= minWidth)?.columns ?? 1;

type SystemChart = WidgetComponentProps<"systemResources">["options"]["visibleCharts"][number];

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
  height,
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
  return isAdvanced ? [...availableCharts] : availableCharts.slice(0, getCompactChartBudget(height));
};

export default function SystemResources({
  integrationIds,
  options,
  width,
  height,
  displayMode,
}: WidgetComponentProps<"systemResources">) {
  const healthQuery = clientApi.widget.healthMonitoring.getSystemHealthStatus.useQuery({ integrationIds });
  const results = getUsableWidgetQueryData(healthQuery) ?? [];
  const data = results.filter(
    (entry): entry is typeof entry & { healthInfo: NonNullable<typeof entry.healthInfo> } => entry.healthInfo !== null,
  );
  const { dataUpdatedAt, isPending } = healthQuery;
  const isAdvanced = displayMode === "advanced";
  const integrationKey = useMemo(() => integrationIds.join("\u0000"), [integrationIds]);
  const [historyByIntegration, setHistoryByIntegration] = useState<Record<string, ChartItem[]>>({});
  const previousIntegrationKey = useRef(integrationKey);
  const queryIndicators = (
    <Group gap={0}>
      <IntegrationErrorIndicator results={results} />
    </Group>
  );

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
        data.map((entry) => {
          const currentItem = toChartItem(entry.healthInfo);
          // Seed with the current item when there's no history yet, so the first real
          // update lands at 2 points instead of dropping back to the single-value fallback.
          const seed = previous[entry.integrationId] ?? [currentItem];
          return [entry.integrationId, appendBoundedHistory(seed, currentItem, ADVANCED_HISTORY_SIZE)];
        }),
      ),
    );
  }, [dataUpdatedAt, data]);

  const panelColumns = isAdvanced && width >= 960 && data.length > 1 ? 2 : 1;
  const panelWidth = width / panelColumns;
  const renderCharts = (entry: (typeof data)[number], availableWidth: number, availableHeight: number) => {
    const currentItem = toChartItem(entry.healthInfo);
    // Duplicate the first point so the chart has two points to draw a line from
    // immediately, instead of showing the single-value fallback until the next poll.
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
      />
    );
  };

  if (isPending) {
    return (
      <Center h="100%">
        <Loader size="sm" />
      </Center>
    );
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
  const chartColumns = useMemo(
    () => (isAdvanced ? getAdvancedChartColumns(width) : 1),
    [isAdvanced, width],
  );
  const compactChartGap = 8;
  const compactRowHeight = 56;
  const chartHeight = isAdvanced
    ? 110
    : Math.max(
        28,
        Math.min(compactRowHeight, (height - Math.max(0, chartCount - 1) * compactChartGap) / Math.max(1, chartCount)),
      );

  return (
    <Stack gap={isAdvanced ? "xs" : compactChartGap} h="auto" miw={0}>
      {showTitle && (
        <Text size="sm" fw={600} truncate="end">
          {integrationName}
        </Text>
      )}
      <SimpleGrid cols={chartColumns} spacing={isAdvanced ? "xs" : compactChartGap}>
        {chartCount === 0 && (
          <Center h="100%">
            <Text size="sm" c="dimmed">
              —
            </Text>
          </Center>
        )}
        {visibleCharts.includes("cpu") && (
          <Box h={chartHeight}>
            <SystemResourceCPUChart
              cpuUsageOverTime={items.map((item) => item.cpu)}
              hasShadow={options.hasShadow}
              labelDisplayMode={labelDisplayMode}
            />
          </Box>
        )}
        {visibleCharts.includes("memory") && (
          <Box h={chartHeight}>
            <SystemResourceMemoryChart
              memoryUsageOverTime={items.map((item) => item.memory)}
              totalCapacityInBytes={memoryCapacityInBytes}
              hasShadow={options.hasShadow}
              labelDisplayMode={labelDisplayMode}
            />
          </Box>
        )}
        {visibleCharts.includes("gpu") && (
          <Box h={chartHeight}>
            <SystemResourceGPUChart
              gpuUsageOverTime={items.map((item) => item.gpu)}
              hasShadow={options.hasShadow}
              labelDisplayMode={labelDisplayMode}
            />
          </Box>
        )}
        {showNetwork &&
          (width >= 300 ? (
            <Group h={chartHeight} gap="xs" grow wrap="nowrap">
              <NetworkTrafficChart
                usageOverTime={networkItems.map((network) => network.down)}
                isUp={false}
                hasShadow={options.hasShadow}
                labelDisplayMode={labelDisplayMode}
              />
              <NetworkTrafficChart
                usageOverTime={networkItems.map((network) => network.up)}
                isUp
                hasShadow={options.hasShadow}
                labelDisplayMode={labelDisplayMode}
              />
            </Group>
          ) : (
            <Box h={chartHeight}>
              <CombinedNetworkTrafficChart
                usageOverTime={networkItems}
                hasShadow={options.hasShadow}
                labelDisplayMode={labelDisplayMode}
              />
            </Box>
          ))}
      </SimpleGrid>
    </Stack>
  );
};
