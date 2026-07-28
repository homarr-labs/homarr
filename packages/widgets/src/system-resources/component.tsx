"use client";

import { useEffect, useRef, useState } from "react";
import { Box, Group, Stack } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";

import { clientApi } from "@homarr/api/client";
import { formatByteRate } from "@homarr/common";
import { useScopedI18n } from "@homarr/translation/client";

import { WidgetEmptyState } from "../common/empty-state";
import { WidgetMobileLoading, WidgetMobileSummary } from "../common/mobile-summary";
import type { WidgetComponentProps } from "../definition";
import { CombinedNetworkTrafficChart } from "./chart/combined-network-traffic";
import { SystemResourceCPUChart } from "./chart/cpu-chart";
import { SystemResourceGPUChart } from "./chart/gpu-chart";
import { SystemResourceMemoryChart } from "./chart/memory-chart";
import { NetworkTrafficChart } from "./chart/network-traffic";

const MAX_QUEUE_SIZE = 15;

const toChartItem = (healthInfo: {
  cpuUtilization: number;
  memUsedInBytes: number;
  gpu: { processorUtilization: number }[];
  network: { up: number; down: number } | null;
}) => ({
  cpu: healthInfo.cpuUtilization,
  memory: healthInfo.memUsedInBytes,
  gpu:
    healthInfo.gpu.length > 0
      ? healthInfo.gpu.reduce((acc, g) => acc + g.processorUtilization, 0) / healthInfo.gpu.length
      : 0,
  network: healthInfo.network,
});

export default function SystemResources({
  integrationIds,
  options,
  displayMode,
}: WidgetComponentProps<"systemResources">) {
  if (displayMode === "mobileSummary") {
    return <SystemResourcesMobileSummary integrationIds={integrationIds} options={options} />;
  }

  return <SystemResourcesCharts integrationIds={integrationIds} options={options} />;
}

const SystemResourcesMobileSummary = ({
  integrationIds,
  options,
}: Pick<WidgetComponentProps<"systemResources">, "integrationIds" | "options">) => {
  const t = useScopedI18n("widget.systemResources");
  const { data, error, isPending } = clientApi.widget.healthMonitoring.getSystemHealthStatus.useQuery({
    integrationIds,
  });

  if (isPending) return <WidgetMobileLoading />;
  if (error && !data) throw error;

  const healthInfo = data?.[0]?.healthInfo;
  const hasPartialFailure = (data?.length ?? 0) < integrationIds.length;
  if (!healthInfo) return <WidgetEmptyState />;

  const memoryCapacityInBytes = healthInfo.memAvailableInBytes + healthInfo.memUsedInBytes;
  const memoryUsagePercent =
    memoryCapacityInBytes > 0 ? Math.round((healthInfo.memUsedInBytes / memoryCapacityInBytes) * 100) : 0;
  const gpuUsage =
    healthInfo.gpu.length > 0
      ? healthInfo.gpu.reduce((total, gpu) => total + gpu.processorUtilization, 0) / healthInfo.gpu.length
      : 0;
  const metrics: Record<
    (typeof options.visibleCharts)[number],
    { value: string; label: string; description?: string }
  > = {
    cpu: {
      value: `${Math.round(healthInfo.cpuUtilization)}%`,
      label: t("card.cpu"),
    },
    memory: {
      value: `${memoryUsagePercent}%`,
      label: t("card.memory"),
    },
    gpu: {
      value: `${Math.round(gpuUsage)}%`,
      label: t("card.gpu"),
    },
    network: {
      value: healthInfo.network ? `↓ ${formatByteRate(Math.round(healthInfo.network.down))}` : "—",
      label: t("card.network"),
      description: healthInfo.network ? `↑ ${formatByteRate(Math.round(healthInfo.network.up))}` : undefined,
    },
  };
  const [primaryMetric, supportingMetric] = options.visibleCharts.map((chart) => metrics[chart]);

  if (!primaryMetric) return <WidgetEmptyState />;

  return (
    <WidgetMobileSummary
      value={primaryMetric.value}
      label={primaryMetric.label}
      description={supportingMetric ? `${supportingMetric.label} ${supportingMetric.value}` : primaryMetric.description}
      isStale={Boolean(error) || hasPartialFailure}
    />
  );
};

const SystemResourcesCharts = ({
  integrationIds,
  options,
}: Pick<WidgetComponentProps<"systemResources">, "integrationIds" | "options">) => {
  const { ref, width } = useElementSize();

  const { data = [], dataUpdatedAt } = clientApi.widget.healthMonitoring.getSystemHealthStatus.useQuery({
    integrationIds,
  });
  const currentHealthInfo = data[0]?.healthInfo;
  const memoryCapacityInBytes =
    (currentHealthInfo?.memAvailableInBytes ?? 0) + (currentHealthInfo?.memUsedInBytes ?? 0);

  const [items, setItems] = useState<
    { cpu: number; memory: number; gpu: number; network: { up: number; down: number } | null }[]
  >(() => (data[0] ? [toChartItem(data[0].healthInfo)] : []));

  const prevIntegrationIds = useRef(integrationIds);
  useEffect(() => {
    if (prevIntegrationIds.current === integrationIds) return;
    prevIntegrationIds.current = integrationIds;
    setItems([]);
  }, [integrationIds]);

  const lastUpdatedAt = useRef(dataUpdatedAt);
  useEffect(() => {
    if (dataUpdatedAt === lastUpdatedAt.current) return;
    lastUpdatedAt.current = dataUpdatedAt;
    const firstItem = data[0];
    if (!firstItem) return;
    setItems((prev) => [...prev, toChartItem(firstItem.healthInfo)].slice(-MAX_QUEUE_SIZE));
  }, [dataUpdatedAt, data]);

  const showNetwork =
    items.length === 0 || (items.every((item) => item.network !== null) && options.visibleCharts.includes("network"));
  const rowHeight = `calc((100% - ${(options.visibleCharts.length - 1) * 8}px) / ${options.visibleCharts.length})`;

  return (
    <Stack gap="xs" p="xs" ref={ref} h="100%">
      {options.visibleCharts.includes("cpu") && (
        <Box h={rowHeight}>
          <SystemResourceCPUChart
            cpuUsageOverTime={items.map((item) => item.cpu)}
            hasShadow={options.hasShadow}
            labelDisplayMode={options.labelDisplayMode}
          />
        </Box>
      )}
      {options.visibleCharts.includes("memory") && (
        <Box h={rowHeight}>
          <SystemResourceMemoryChart
            memoryUsageOverTime={items.map((item) => item.memory)}
            totalCapacityInBytes={memoryCapacityInBytes}
            hasShadow={options.hasShadow}
            labelDisplayMode={options.labelDisplayMode}
          />
        </Box>
      )}
      {options.visibleCharts.includes("gpu") && (
        <Box h={rowHeight}>
          <SystemResourceGPUChart
            gpuUsageOverTime={items.map((item) => item.gpu)}
            hasShadow={options.hasShadow}
            labelDisplayMode={options.labelDisplayMode}
          />
        </Box>
      )}
      {showNetwork &&
        (width > 256 ? (
          <Group h={rowHeight} gap="xs" grow>
            <NetworkTrafficChart
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              usageOverTime={items.map((item) => item.network!.down)}
              isUp={false}
              hasShadow={options.hasShadow}
              labelDisplayMode={options.labelDisplayMode}
            />

            <NetworkTrafficChart
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              usageOverTime={items.map((item) => item.network!.up)}
              isUp
              hasShadow={options.hasShadow}
              labelDisplayMode={options.labelDisplayMode}
            />
          </Group>
        ) : (
          <Box h={rowHeight}>
            <CombinedNetworkTrafficChart
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              usageOverTime={items.map((item) => item.network!)}
              hasShadow={options.hasShadow}
              labelDisplayMode={options.labelDisplayMode}
            />
          </Box>
        ))}
    </Stack>
  );
};
