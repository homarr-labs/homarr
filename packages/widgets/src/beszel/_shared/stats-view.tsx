"use client";

import { useMemo } from "react";
import { Button, Center, SimpleGrid, Stack, Text, useComputedColorScheme } from "@mantine/core";
import { IconPlugConnectedX, IconServerOff } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { invariantTechnicalLabels } from "@homarr/definitions";
import type { BeszelContainerStatsRecord, BeszelSystemStatsRecord } from "@homarr/integrations/types";
import { useByteFormatter } from "@homarr/settings";
import { useCurrentIntlLocale, useI18n } from "@homarr/translation/client";
import { zoomCompensatedSize } from "@homarr/ui";

import { getUsableWidgetQueryData } from "../../common/query-state";
import { WidgetQueryLoadingState } from "../../common/query-state-indicator";
import { beszelChartColors } from "./colors";
import type { BeszelTimePeriod } from "./chart";
import {
  BeszelChartPanel,
  CPU_Y_AXIS_DOMAIN,
  hasGpuMetric,
  normalizeBeszelByteRate,
  useContainerNames,
  useDiskChartData,
  useDiskIOChartData,
  useDockerChartData,
  useGpuChartData,
  useGpuDevices,
  useSystemChartData,
} from "./chart";
import { createByteChartAxisFormatters, formatPercent, formatWatts } from "./format";
import { makeTooltipProps } from "./tooltip";
import { useLiveStats } from "./use-live-stats";
import { useDemoReadOnly } from "../../demo-read-only";

const CHART_HEIGHT = 180;
const MEBIBYTE = 1024 * 1024;
const GIBIBYTE = 1024 * MEBIBYTE;

export interface BeszelStatsVisibility {
  cpu: boolean;
  memory: boolean;
  disk: boolean;
  diskIO: boolean;
  network: boolean;
  gpuUsage: boolean;
  gpuMemory: boolean;
  gpuPower: boolean;
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
  showXAxis?: boolean;
  onSwitchToHistorical?: () => void;
}

const whenVisible = <T,>(visible: boolean, data: T | undefined) => (visible ? data : undefined);

export function BeszelStatsView({
  integrationIds,
  systemId,
  timePeriod,
  visibility,
  columns,
  availableHeight,
  showXAxis = true,
  onSwitchToHistorical,
}: BeszelStatsViewProps) {
  const t = useI18n("widget.beszelSystemStats");
  const tBeszel = useI18n("widget.beszel");
  const locale = useCurrentIntlLocale();
  const colorScheme = useComputedColorScheme("light");
  const { formatByteRate, formatBytes } = useByteFormatter();
  const byteAxisFormatters = useMemo(
    () => createByteChartAxisFormatters(formatBytes, formatByteRate),
    [formatByteRate, formatBytes],
  );
  const tooltips = useMemo(
    () => ({
      percent: makeTooltipProps(formatPercent),
      bytes: makeTooltipProps(formatBytes, true),
      rate: makeTooltipProps(formatByteRate, true),
      percentTotal: makeTooltipProps(formatPercent, true),
      bytesTotal: makeTooltipProps(formatBytes, true),
      watts: makeTooltipProps(formatWatts),
    }),
    [formatByteRate, formatBytes],
  );
  const showDocker = visibility.dockerCpu || visibility.dockerMemory || visibility.dockerNetwork;
  const isLive = timePeriod === "1m";
  const demoReadOnly = useDemoReadOnly();
  const historicalQuery = clientApi.widget.beszel.getSystemStats.useQuery(
    { integrationIds, systemId, timePeriod, includeDocker: showDocker },
    { refetchInterval: isLive || demoReadOnly ? false : 5_000, enabled: !isLive && systemId !== "" },
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
        [t("chart.memory.series")]: s.mu * GIBIBYTE,
        [t("chart.memory.cache")]: (s.mb ?? 0) * GIBIBYTE,
      }),
      network: (s: { ns?: number; nr?: number; b?: [number, number] }) => ({
        [t("chart.network.sent")]: normalizeBeszelByteRate(s.b?.[0], s.ns),
        [t("chart.network.recv")]: normalizeBeszelByteRate(s.b?.[1], s.nr),
      }),
    }),
    [t],
  );

  const series = useMemo(
    () => ({
      cpu: [{ name: invariantTechnicalLabels.cpu, color: beszelChartColors.cpu }],
      memory: [
        { name: t("chart.memory.series"), color: beszelChartColors.memory },
        { name: t("chart.memory.cache"), color: beszelChartColors.memoryCache },
      ],
      network: [
        { name: t("chart.network.sent"), color: beszelChartColors.networkSent },
        { name: t("chart.network.recv"), color: beszelChartColors.memory },
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
  const networkData = useSystemChartData(
    whenVisible(visibility.network, systemStats),
    mappers.network,
    timePeriod,
    locale,
  );

  const gpuDevices = useGpuDevices(
    whenVisible(visibility.gpuUsage || visibility.gpuMemory || visibility.gpuPower, systemStats),
  );
  const gpuSeries = useMemo(() => {
    const gpuNames = new Map<string, string>();
    const powerTotals = new Map<string, number>();
    for (const record of whenVisible(visibility.gpuPower, systemStats) ?? []) {
      for (const [id, gpu] of Object.entries(record.stats.g ?? {})) {
        if (!gpuNames.has(id)) gpuNames.set(id, gpu.n);
        powerTotals.set(gpu.n, (powerTotals.get(gpu.n) ?? 0) + (gpu.p ?? 0));
        if (gpu.pp !== undefined) {
          const packageName = `${gpu.n} package`;
          powerTotals.set(packageName, (powerTotals.get(packageName) ?? 0) + gpu.pp);
        }
      }
    }
    const rankedPower = [...powerTotals].toSorted(([, a], [, b]) => b - a);
    const powerColors = new Map(
      rankedPower.map(([name], index) => [
        name,
        `hsl(${226 + (((index * 360) / rankedPower.length) % 360)}, 65%, 52%)`,
      ]),
    );
    return {
      usage: gpuDevices.map(({ seriesName }) => ({ name: seriesName, color: beszelChartColors.cpu })),
      memory: gpuDevices.map(({ seriesName }) => ({ name: seriesName, color: beszelChartColors.memory })),
      power: gpuDevices.flatMap(({ id, seriesName }) => {
        const name = gpuNames.get(id);
        const color = name && powerColors.get(name);
        if (!color) return [];
        return [{ name: seriesName, color }];
      }),
    };
  }, [gpuDevices, systemStats, visibility.gpuPower]);
  const gpuUsageData = useGpuChartData(
    whenVisible(visibility.gpuUsage, systemStats),
    gpuDevices,
    "usage",
    timePeriod,
    locale,
  );
  const gpuMemoryData = useGpuChartData(
    whenVisible(visibility.gpuMemory, systemStats),
    gpuDevices,
    "memory",
    timePeriod,
    locale,
  );
  const gpuPowerData = useGpuChartData(
    whenVisible(visibility.gpuPower, systemStats),
    gpuDevices,
    "power",
    timePeriod,
    locale,
  );
  const hasGpuMemory = hasGpuMetric(systemStats, "memory");
  const hasGpuPower = hasGpuMetric(systemStats, "power");

  const efsPaths = useMemo(() => {
    const paths = new Set<string>();
    for (const record of systemStats ?? []) {
      for (const path of Object.keys(record.stats.efs ?? {})) paths.add(path);
    }
    return [...paths];
  }, [systemStats]);
  const rootSeriesName = t("chart.disk.series");
  const readLabel = t("chart.diskIO.read");
  const writeLabel = t("chart.diskIO.write");
  const rootReadSeriesName = `${rootSeriesName} ${readLabel}`;
  const rootWriteSeriesName = `${rootSeriesName} ${writeLabel}`;
  const diskData = useDiskChartData(
    whenVisible(visibility.disk, systemStats),
    efsPaths,
    rootSeriesName,
    timePeriod,
    locale,
  );
  const diskIOData = useDiskIOChartData(
    whenVisible(visibility.diskIO, systemStats),
    efsPaths,
    rootReadSeriesName,
    rootWriteSeriesName,
    readLabel,
    writeLabel,
    timePeriod,
    locale,
  );
  const diskSeries = useMemo(
    () => [
      { name: rootSeriesName, color: beszelChartColors.disk },
      ...efsPaths.map((path) => ({ name: path, color: beszelChartColors.disk })),
    ],
    [efsPaths, rootSeriesName],
  );
  const diskIOSeries = useMemo(
    () => [
      { name: rootWriteSeriesName, color: beszelChartColors.diskWrite },
      { name: rootReadSeriesName, color: beszelChartColors.cpu },
      ...efsPaths.flatMap((path) => [
        {
          name: `${path} ${writeLabel}`,
          color: beszelChartColors.diskWrite,
        },
        {
          name: `${path} ${readLabel}`,
          color: beszelChartColors.cpu,
        },
      ]),
    ],
    [efsPaths, readLabel, rootReadSeriesName, rootWriteSeriesName, writeLabel],
  );

  const containerNames = useContainerNames(whenVisible(showDocker, containerStats));
  const containerSeries = useMemo(() => {
    const totals = new Map<string, { cpu: number; memory: number; network: number }>();
    for (const record of whenVisible(showDocker, containerStats) ?? []) {
      for (const container of record.stats) {
        const usage = totals.get(container.n) ?? { cpu: 0, memory: 0, network: 0 };
        usage.cpu += container.c;
        usage.memory += container.m;
        usage.network += normalizeBeszelByteRate(container.b?.[0], container.ns);
        usage.network += normalizeBeszelByteRate(container.b?.[1], container.nr);
        totals.set(container.n, usage);
      }
    }
    let saturation = 65;
    let lightness = 50;
    if (colorScheme === "dark") {
      saturation = 60;
      lightness = 55;
    }
    const makeSeries = (metric: "cpu" | "memory" | "network") =>
      [...totals]
        .toSorted(([, a], [, b]) => b[metric] - a[metric])
        .map(([name], index) => ({
          name,
          color: `hsl(${((index * 360) / totals.size) % 360}, ${saturation}%, ${lightness}%)`,
        }))
        .filter(({ name }) => containerNames.includes(name));
    const bySelectedOrder = (a: { name: string }, b: { name: string }) =>
      containerNames.indexOf(a.name) - containerNames.indexOf(b.name);
    return {
      cpu: makeSeries("cpu").toSorted(bySelectedOrder),
      memory: makeSeries("memory"),
      network: makeSeries("network").toSorted(bySelectedOrder),
    };
  }, [colorScheme, containerNames, containerStats, showDocker]);
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
    return <WidgetQueryLoadingState />;
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
    (visibility.gpuUsage && gpuDevices.length > 0 && gpuUsageData.length > 0 ? 1 : 0) +
    (visibility.gpuMemory && hasGpuMemory && gpuMemoryData.length > 0 ? 1 : 0) +
    (visibility.gpuPower && hasGpuPower && gpuPowerData.length > 0 ? 1 : 0) +
    (showDocker && containerNames.length > 0
      ? (visibility.dockerCpu && dockerCpuData.length > 0 ? 1 : 0) +
        (visibility.dockerMemory && dockerMemoryData.length > 0 ? 1 : 0) +
        (visibility.dockerNetwork && dockerNetworkData.length > 0 ? 1 : 0)
      : 0);
  const effectiveColumns = Math.min(columns, Math.max(1, renderedPanelCount)) as 1 | 2;

  // Keep each chart at its readable height until every row fits; then share the remaining space.
  // This height is already in layout pixels, so avoid Mantine's rem-based scale compensation.
  return (
    <SimpleGrid cols={effectiveColumns} spacing="md" style={{ minHeight: availableHeight, gridAutoRows: "1fr" }}>
      {visibility.cpu && cpuData.length > 0 && (
        <BeszelChartPanel
          title={t("chart.cpu.title")}
          subtitle={t("chart.cpu.subtitle")}
          chartProps={{
            h: CHART_HEIGHT,
            withXAxis: showXAxis,
            data: cpuData,
            series: series.cpu,
            yAxisFormatter: formatPercent,
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
            h: CHART_HEIGHT,
            withXAxis: showXAxis,
            data: memoryData,
            type: "stacked",
            series: series.memory,
            yAxisFormatter: byteAxisFormatters.bytes,
            tooltipProps: tooltips.bytes,
          }}
        />
      )}
      {visibility.disk && diskData.length > 0 && (
        <BeszelChartPanel
          title={t("chart.disk.title")}
          subtitle={t("chart.disk.subtitle")}
          chartProps={{
            h: CHART_HEIGHT,
            withXAxis: showXAxis,
            data: diskData,
            type: "stacked",
            series: diskSeries,
            yAxisFormatter: byteAxisFormatters.bytes,
            tooltipProps: tooltips.bytes,
          }}
        />
      )}
      {visibility.diskIO && diskIOData.length > 0 && (
        <BeszelChartPanel
          title={t("chart.diskIO.title")}
          subtitle={t("chart.diskIO.subtitle")}
          chartProps={{
            h: CHART_HEIGHT,
            withXAxis: showXAxis,
            data: diskIOData,
            series: diskIOSeries,
            yAxisFormatter: byteAxisFormatters.rate,
            tooltipProps: tooltips.rate,
          }}
        />
      )}
      {visibility.network && networkData.length > 0 && (
        <BeszelChartPanel
          title={t("chart.network.title")}
          subtitle={t("chart.network.subtitle")}
          chartProps={{
            h: CHART_HEIGHT,
            withXAxis: showXAxis,
            data: networkData,
            series: series.network,
            yAxisFormatter: byteAxisFormatters.rate,
            tooltipProps: tooltips.rate,
          }}
        />
      )}
      {gpuDevices.length > 0 && (
        <>
          {visibility.gpuUsage && gpuUsageData.length > 0 && (
            <BeszelChartPanel
              title={t("chart.gpuUsage.title")}
              subtitle={t("chart.gpuUsage.subtitle")}
              chartProps={{
                h: CHART_HEIGHT,
                withXAxis: showXAxis,
                data: gpuUsageData,
                series: gpuSeries.usage,
                yAxisFormatter: formatPercent,
                yAxisDomain: CPU_Y_AXIS_DOMAIN,
                tooltipProps: tooltips.percent,
              }}
            />
          )}
          {visibility.gpuMemory && hasGpuMemory && gpuMemoryData.length > 0 && (
            <BeszelChartPanel
              title={t("chart.gpuMemory.title")}
              subtitle={t("chart.gpuMemory.subtitle")}
              chartProps={{
                h: CHART_HEIGHT,
                withXAxis: showXAxis,
                data: gpuMemoryData,
                series: gpuSeries.memory,
                yAxisFormatter: byteAxisFormatters.bytes,
                tooltipProps: tooltips.bytesTotal,
              }}
            />
          )}
          {visibility.gpuPower && hasGpuPower && gpuPowerData.length > 0 && (
            <BeszelChartPanel
              title={t("chart.gpuPower.title")}
              subtitle={t("chart.gpuPower.subtitle")}
              chartProps={{
                h: CHART_HEIGHT,
                withXAxis: showXAxis,
                data: gpuPowerData,
                series: gpuSeries.power,
                yAxisFormatter: formatWatts,
                tooltipProps: tooltips.watts,
              }}
            />
          )}
        </>
      )}
      {showDocker && containerNames.length > 0 && (
        <>
          {visibility.dockerCpu && dockerCpuData.length > 0 && (
            <BeszelChartPanel
              title={t("chart.dockerCpu.title")}
              subtitle={t("chart.dockerCpu.subtitle")}
              chartProps={{
                h: CHART_HEIGHT,
                withXAxis: showXAxis,
                data: dockerCpuData,
                type: "stacked",
                series: containerSeries.cpu,
                yAxisFormatter: formatPercent,
                tooltipProps: tooltips.percentTotal,
              }}
            />
          )}
          {visibility.dockerMemory && dockerMemoryData.length > 0 && (
            <BeszelChartPanel
              key={JSON.stringify(containerSeries.memory.map(({ name }) => name))}
              title={t("chart.dockerMemory.title")}
              subtitle={t("chart.dockerMemory.subtitle")}
              chartProps={{
                h: CHART_HEIGHT,
                withXAxis: showXAxis,
                data: dockerMemoryData,
                type: "stacked",
                series: containerSeries.memory,
                areaChartProps: { reverseStackOrder: true },
                yAxisFormatter: byteAxisFormatters.bytes,
                tooltipProps: tooltips.bytesTotal,
              }}
            />
          )}
          {visibility.dockerNetwork && dockerNetworkData.length > 0 && (
            <BeszelChartPanel
              title={t("chart.dockerNetwork.title")}
              subtitle={t("chart.dockerNetwork.subtitle")}
              chartProps={{
                h: CHART_HEIGHT,
                withXAxis: showXAxis,
                data: dockerNetworkData,
                series: containerSeries.network,
                yAxisFormatter: byteAxisFormatters.rate,
                tooltipProps: tooltips.rate,
              }}
            />
          )}
        </>
      )}
    </SimpleGrid>
  );
}
