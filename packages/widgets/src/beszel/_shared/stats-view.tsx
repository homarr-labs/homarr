"use client";

import { useMemo } from "react";
import { Button, Center, Group, SimpleGrid, Skeleton, Stack, Text } from "@mantine/core";
import { IconPlugConnectedX, IconServerOff } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { invariantTechnicalLabels } from "@homarr/definitions";
import type { BeszelContainerStatsRecord, BeszelSystemStatsRecord } from "@homarr/integrations/types";
import { useCurrentIntlLocale, useI18n } from "@homarr/translation/client";
import { zoomCompensatedSize } from "@homarr/ui";

import { getUsableWidgetQueryData } from "../../common/query-state";
import { containerColors } from "./colors";
import type { BeszelTimePeriod } from "./chart";
import {
  BeszelChartPanel,
  CPU_Y_AXIS_DOMAIN,
  useContainerNames,
  useDiskChartData,
  useDockerChartData,
  useSystemChartData,
} from "./chart";
import { chartAxisFormatters, formatByteRate, formatGB, formatPercent, formatStorageBytes } from "./format";
import { makeTooltipProps } from "./tooltip";
import { useLiveStats } from "./use-live-stats";

const CHART_HEIGHT = 180;
const MB = 1024 * 1024;
const tooltips = {
  percent: makeTooltipProps(formatPercent),
  gigabytes: makeTooltipProps(formatGB, true),
  rate: makeTooltipProps(formatByteRate, true),
  percentTotal: makeTooltipProps(formatPercent, true),
  bytesTotal: makeTooltipProps(formatStorageBytes, true),
};

const ChartSkeleton = () => (
  <Stack gap={4} style={{ minWidth: 0 }}>
    <Group gap="xs">
      <Skeleton h={14} w={72} radius="sm" />
      <Skeleton h={10} w={110} radius="sm" />
    </Group>
    <Skeleton h={CHART_HEIGHT} radius="sm" />
  </Stack>
);

export interface BeszelStatsVisibility {
  cpu: boolean;
  memory: boolean;
  disk: boolean;
  diskIO: boolean;
  network: boolean;
  dockerCpu: boolean;
  dockerMemory: boolean;
  dockerNetwork: boolean;
}

interface BeszelStatsViewProps {
  integrationIds: string[];
  systemId: string;
  timePeriod: BeszelTimePeriod;
  visibility: BeszelStatsVisibility;
  columns: 1 | 2;
  availableHeight?: number;
  onSwitchToHistorical?: () => void;
}

const MIN_CHART_HEIGHT = 100;
const PANEL_ROW_OVERHEAD = 28;
const GRID_ROW_GAP = 16;

const computeChartHeight = (availableHeight: number | undefined, rowCount: number) => {
  if (availableHeight === undefined || rowCount <= 0) return CHART_HEIGHT;
  const perRow = (availableHeight - (rowCount - 1) * GRID_ROW_GAP) / rowCount - PANEL_ROW_OVERHEAD;
  return Math.max(MIN_CHART_HEIGHT, Math.min(CHART_HEIGHT, Math.floor(perRow)));
};

const whenVisible = <T,>(visible: boolean, data: T | undefined) => (visible ? data : undefined);

export function BeszelStatsView({
  integrationIds,
  systemId,
  timePeriod,
  visibility,
  columns,
  availableHeight,
  onSwitchToHistorical,
}: BeszelStatsViewProps) {
  const t = useI18n("widget.beszelSystemStats");
  const tBeszel = useI18n("widget.beszel");
  const locale = useCurrentIntlLocale();
  const showDocker = visibility.dockerCpu || visibility.dockerMemory || visibility.dockerNetwork;
  const isLive = timePeriod === "1m";
  const historicalQuery = clientApi.widget.beszel.getSystemStats.useQuery(
    { integrationIds, systemId, timePeriod, includeDocker: showDocker },
    { refetchInterval: isLive ? false : 5_000, enabled: !isLive && systemId !== "" },
  );
  const historicalData = isLive ? historicalQuery.data : getUsableWidgetQueryData(historicalQuery);
  const { data: liveData, error: liveError } = useLiveStats(integrationIds, systemId, isLive && systemId !== "");

  const activeStats:
    | { systemStats: BeszelSystemStatsRecord[]; containerStats: BeszelContainerStatsRecord[]; error?: string }
    | null
    | undefined = isLive ? liveData : historicalData;

  const mappers = useMemo(
    () => ({
      cpu: (s: { cpu: number }) => ({ [invariantTechnicalLabels.cpu]: s.cpu }),
      memory: (s: { mu: number; mb: number }) => ({
        [t("chart.memory.series")]: s.mu,
        [t("chart.memory.cache")]: s.mb ?? 0,
      }),
      diskIO: (s: { dr?: number; dw?: number }) => ({
        [t("chart.diskIO.read")]: (s.dr ?? 0) * MB,
        [t("chart.diskIO.write")]: (s.dw ?? 0) * MB,
      }),
      network: (s: { ns?: number; nr?: number; b?: [number, number] }) => ({
        [t("chart.network.sent")]: s.b?.[0] ?? s.ns ?? 0,
        [t("chart.network.recv")]: s.b?.[1] ?? s.nr ?? 0,
      }),
    }),
    [t],
  );

  const series = useMemo(
    () => ({
      cpu: [{ name: invariantTechnicalLabels.cpu, color: "teal.6" }],
      memory: [
        { name: t("chart.memory.series"), color: "teal.5" },
        { name: t("chart.memory.cache"), color: "teal.8" },
      ],
      diskIO: [
        { name: t("chart.diskIO.write"), color: "orange.6" },
        { name: t("chart.diskIO.read"), color: "blue.6" },
      ],
      network: [
        { name: t("chart.network.sent"), color: "blue.6" },
        { name: t("chart.network.recv"), color: "teal.6" },
      ],
    }),
    [t],
  );

  const systemStats = activeStats?.systemStats;
  const containerStats = activeStats?.containerStats;
  const cpuData = useSystemChartData(whenVisible(visibility.cpu, systemStats), mappers.cpu, timePeriod, locale);
  const memoryData = useSystemChartData(
    whenVisible(visibility.memory, systemStats),
    mappers.memory,
    timePeriod,
    locale,
  );
  const diskIOData = useSystemChartData(
    whenVisible(visibility.diskIO, systemStats),
    mappers.diskIO,
    timePeriod,
    locale,
  );
  const networkData = useSystemChartData(
    whenVisible(visibility.network, systemStats),
    mappers.network,
    timePeriod,
    locale,
  );

  const efsPaths = useMemo(() => {
    const paths = new Set<string>();
    for (const record of systemStats ?? []) {
      for (const path of Object.keys(record.stats.efs ?? {})) paths.add(path);
    }
    return [...paths];
  }, [systemStats]);
  const rootSeriesName = t("chart.disk.series");
  const diskData = useDiskChartData(
    whenVisible(visibility.disk, systemStats),
    efsPaths,
    rootSeriesName,
    timePeriod,
    locale,
  );
  const diskSeries = useMemo(
    () => [
      { name: rootSeriesName, color: "grape.6" },
      ...efsPaths.map((path, index) => ({
        name: path,
        color: containerColors[(index + 1) % containerColors.length] as string,
      })),
    ],
    [efsPaths, rootSeriesName],
  );

  const containerNames = useContainerNames(whenVisible(showDocker, containerStats));
  const containerSeries = useMemo(
    () =>
      containerNames.map((name, index) => ({ name, color: containerColors[index % containerColors.length] as string })),
    [containerNames],
  );
  const dockerCpuData = useDockerChartData(
    whenVisible(visibility.dockerCpu, containerStats),
    containerNames,
    "cpu",
    timePeriod,
    locale,
  );
  const dockerMemoryData = useDockerChartData(
    whenVisible(visibility.dockerMemory, containerStats),
    containerNames,
    "memory",
    timePeriod,
    locale,
  );
  const dockerNetworkData = useDockerChartData(
    whenVisible(visibility.dockerNetwork, containerStats),
    containerNames,
    "network",
    timePeriod,
    locale,
  );

  if (isLive && liveError) {
    return (
      <Center h={CHART_HEIGHT}>
        <Stack align="center" gap="sm" p="md">
          <IconPlugConnectedX style={zoomCompensatedSize(40)} />
          <Text size="sm" c="dimmed" ta="center">
            {t("error.liveConnectionFailed")}
          </Text>
          {onSwitchToHistorical && (
            <Button size="xs" variant="light" onClick={onSwitchToHistorical}>
              {t("error.switchToHistorical")}
            </Button>
          )}
        </Stack>
      </Center>
    );
  }

  if (!activeStats) {
    const visibleChartCount = Object.values(visibility).filter(Boolean).length;
    return (
      <SimpleGrid cols={columns} spacing="md" aria-label={t("name")}>
        {Array.from({ length: visibleChartCount }, (_, index) => (
          <ChartSkeleton key={index} />
        ))}
      </SimpleGrid>
    );
  }

  if ("error" in activeStats && activeStats.error) {
    return (
      <Center h={CHART_HEIGHT}>
        <Stack align="center" gap="xs">
          <IconServerOff style={zoomCompensatedSize(24)} opacity={0.5} />
          <Text size="sm" c="dimmed">
            {tBeszel("error.internalServerError")}
          </Text>
        </Stack>
      </Center>
    );
  }

  const renderedPanelCount =
    (visibility.cpu && cpuData.length > 0 ? 1 : 0) +
    (visibility.memory && memoryData.length > 0 ? 1 : 0) +
    (visibility.disk && diskData.length > 0 ? 1 : 0) +
    (visibility.diskIO && diskIOData.length > 0 ? 1 : 0) +
    (visibility.network && networkData.length > 0 ? 1 : 0) +
    (showDocker && containerSeries.length > 0
      ? (visibility.dockerCpu && dockerCpuData.length > 0 ? 1 : 0) +
        (visibility.dockerMemory && dockerMemoryData.length > 0 ? 1 : 0) +
        (visibility.dockerNetwork && dockerNetworkData.length > 0 ? 1 : 0)
      : 0);
  const effectiveColumns = Math.min(columns, Math.max(1, renderedPanelCount)) as 1 | 2;
  const rowCount = Math.ceil(renderedPanelCount / effectiveColumns);
  const chartHeight = computeChartHeight(availableHeight, rowCount);

  return (
    <SimpleGrid cols={effectiveColumns} spacing="md">
      {visibility.cpu && cpuData.length > 0 && (
        <BeszelChartPanel
          title={t("chart.cpu.title")}
          subtitle={t("chart.cpu.subtitle")}
          chartProps={{
            h: chartHeight,
            data: cpuData,
            series: series.cpu,
            yAxisFormatter: chartAxisFormatters.percent,
            yAxisDomain: CPU_Y_AXIS_DOMAIN,
            tooltipProps: tooltips.percent,
          }}
        />
      )}
      {visibility.memory && memoryData.length > 0 && (
        <BeszelChartPanel
          title={t("chart.memory.title")}
          subtitle={t("chart.memory.subtitle")}
          chartProps={{
            h: chartHeight,
            data: memoryData,
            type: "stacked",
            series: series.memory,
            yAxisFormatter: chartAxisFormatters.gb,
            tooltipProps: tooltips.gigabytes,
          }}
        />
      )}
      {visibility.disk && diskData.length > 0 && (
        <BeszelChartPanel
          title={t("chart.disk.title")}
          subtitle={t("chart.disk.subtitle")}
          chartProps={{
            h: chartHeight,
            data: diskData,
            type: "stacked",
            series: diskSeries,
            yAxisFormatter: chartAxisFormatters.gb,
            tooltipProps: tooltips.gigabytes,
          }}
        />
      )}
      {visibility.diskIO && diskIOData.length > 0 && (
        <BeszelChartPanel
          title={t("chart.diskIO.title")}
          subtitle={t("chart.diskIO.subtitle")}
          chartProps={{
            h: chartHeight,
            data: diskIOData,
            series: series.diskIO,
            yAxisFormatter: chartAxisFormatters.rate,
            tooltipProps: tooltips.rate,
          }}
        />
      )}
      {visibility.network && networkData.length > 0 && (
        <BeszelChartPanel
          title={t("chart.network.title")}
          subtitle={t("chart.network.subtitle")}
          chartProps={{
            h: chartHeight,
            data: networkData,
            series: series.network,
            yAxisFormatter: chartAxisFormatters.rate,
            tooltipProps: tooltips.rate,
          }}
        />
      )}
      {showDocker && containerSeries.length > 0 && (
        <>
          {visibility.dockerCpu && dockerCpuData.length > 0 && (
            <BeszelChartPanel
              title={t("chart.dockerCpu.title")}
              subtitle={t("chart.dockerCpu.subtitle")}
              chartProps={{
                h: chartHeight,
                data: dockerCpuData,
                type: "stacked",
                series: containerSeries,
                yAxisFormatter: chartAxisFormatters.percent,
                tooltipProps: tooltips.percentTotal,
              }}
            />
          )}
          {visibility.dockerMemory && dockerMemoryData.length > 0 && (
            <BeszelChartPanel
              title={t("chart.dockerMemory.title")}
              subtitle={t("chart.dockerMemory.subtitle")}
              chartProps={{
                h: chartHeight,
                data: dockerMemoryData,
                type: "stacked",
                series: containerSeries,
                yAxisFormatter: chartAxisFormatters.bytes,
                tooltipProps: tooltips.bytesTotal,
              }}
            />
          )}
          {visibility.dockerNetwork && dockerNetworkData.length > 0 && (
            <BeszelChartPanel
              title={t("chart.dockerNetwork.title")}
              subtitle={t("chart.dockerNetwork.subtitle")}
              chartProps={{
                h: chartHeight,
                data: dockerNetworkData,
                series: containerSeries,
                yAxisFormatter: chartAxisFormatters.rate,
                tooltipProps: tooltips.rate,
              }}
            />
          )}
        </>
      )}
    </SimpleGrid>
  );
}
