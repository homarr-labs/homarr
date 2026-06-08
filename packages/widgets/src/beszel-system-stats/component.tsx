"use client";

import { useMemo, useState } from "react";
import { Group, ScrollArea, Select, SimpleGrid, Stack, Text } from "@mantine/core";
import { AreaChart } from "@mantine/charts";
import dayjs from "dayjs";

import { clientApi } from "@homarr/api/client";
import { useScopedI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";

const formatTime = (timestamp: string) => dayjs(timestamp).format("HH:mm");
const formatBytes = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
};
const formatBytesPerSec = (bytes: number) => `${formatBytes(bytes)}/s`;
const formatPercent = (v: number) => `${v.toFixed(1)}%`;
const formatGB = (v: number) => `${v.toFixed(2)} GB`;
const formatMB = (v: number) => `${v.toFixed(1)} MB`;
const formatMBs = (v: number) => `${v.toFixed(2)} MB/s`;

const compactTooltipProps = {
  wrapperStyle: { zIndex: 1000, pointerEvents: "none" as const },
  contentStyle: { padding: "4px 8px", fontSize: 11, lineHeight: 1.3 },
  labelStyle: { fontSize: 11, marginBottom: 2 },
  itemStyle: { padding: 0, fontSize: 11 },
};

interface ChartPanelProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

const ChartPanel = ({ title, subtitle, children }: ChartPanelProps) => (
  <Stack gap={4}>
    <Group gap="xs">
      <Text size="sm" fw={600}>{title}</Text>
      {subtitle && <Text size="xs" c="dimmed">{subtitle}</Text>}
    </Group>
    {children}
  </Stack>
);

export default function BeszelSystemStatsWidget({
  options,
  integrationIds,
  width,
}: WidgetComponentProps<"beszelSystemStats">) {
  const t = useScopedI18n("widget.beszelSystemStats");
  const [systemsResult] = clientApi.widget.beszel.getSystems.useSuspenseQuery({ integrationIds });

  const systems = useMemo(
    () => systemsResult.flatMap((r) => r.systems.map((s) => ({ value: s.id, label: s.name }))),
    [systemsResult],
  );

  const [selectedSystem, setSelectedSystem] = useState<string | null>(systems[0]?.value ?? null);

  const [statsResult] = clientApi.widget.beszel.getSystemStats.useSuspenseQuery({
    integrationIds,
    systemId: selectedSystem ?? systems[0]?.value ?? "",
    timePeriod: options.timePeriod as "1h" | "12h" | "24h" | "1w" | "30d",
    includeDocker: options.showDockerCpu || options.showDockerMemory || options.showDockerNetwork,
  });

  const chartHeight = 180;
  const showDocker = options.showDockerCpu || options.showDockerMemory || options.showDockerNetwork;

  const cpuData = useMemo(() => {
    if (!statsResult?.systemStats) return [];
    return [...statsResult.systemStats].reverse().map((r) => ({
      time: formatTime(r.created),
      [t("chart.cpu.series")]: r.stats.cpu,
    }));
  }, [statsResult, t]);

  const memoryData = useMemo(() => {
    if (!statsResult?.systemStats) return [];
    return [...statsResult.systemStats].reverse().map((r) => ({
      time: formatTime(r.created),
      [t("chart.memory.series")]: r.stats.mu / (1024 * 1024 * 1024),
    }));
  }, [statsResult, t]);

  const diskData = useMemo(() => {
    if (!statsResult?.systemStats) return [];
    return [...statsResult.systemStats].reverse().map((r) => ({
      time: formatTime(r.created),
      [t("chart.disk.series")]: r.stats.du / (1024 * 1024 * 1024),
    }));
  }, [statsResult, t]);

  const diskIOData = useMemo(() => {
    if (!statsResult?.systemStats) return [];
    return [...statsResult.systemStats].reverse().map((r) => ({
      time: formatTime(r.created),
      [t("chart.diskIO.read")]: r.stats.dr / (1024 * 1024),
      [t("chart.diskIO.write")]: r.stats.dw / (1024 * 1024),
    }));
  }, [statsResult, t]);

  const networkData = useMemo(() => {
    if (!statsResult?.systemStats) return [];
    return [...statsResult.systemStats].reverse().map((r) => ({
      time: formatTime(r.created),
      [t("chart.network.sent")]: r.stats.ns,
      [t("chart.network.recv")]: r.stats.nr,
    }));
  }, [statsResult, t]);

  const containerNames = useMemo(() => {
    if (!statsResult?.containerStats?.length) return [];
    const names = new Set<string>();
    for (const record of statsResult.containerStats) {
      for (const c of record.stats) {
        names.add(c.n);
      }
    }
    return [...names].slice(0, 15);
  }, [statsResult]);

  const dockerCpuData = useMemo(() => {
    if (!statsResult?.containerStats?.length) return [];
    return [...statsResult.containerStats].reverse().map((record) => {
      const point: Record<string, unknown> = { time: formatTime(record.created) };
      for (const name of containerNames) {
        const container = record.stats.find((c) => c.n === name);
        point[name] = container?.c ?? 0;
      }
      return point;
    });
  }, [statsResult, containerNames]);

  const dockerMemData = useMemo(() => {
    if (!statsResult?.containerStats?.length) return [];
    return [...statsResult.containerStats].reverse().map((record) => {
      const point: Record<string, unknown> = { time: formatTime(record.created) };
      for (const name of containerNames) {
        const container = record.stats.find((c) => c.n === name);
        point[name] = (container?.m ?? 0) / (1024 * 1024);
      }
      return point;
    });
  }, [statsResult, containerNames]);

  const dockerNetData = useMemo(() => {
    if (!statsResult?.containerStats?.length) return [];
    return [...statsResult.containerStats].reverse().map((record) => {
      const point: Record<string, unknown> = { time: formatTime(record.created) };
      for (const name of containerNames) {
        const container = record.stats.find((c) => c.n === name);
        const netTotal = (container?.ns ?? 0) + (container?.nr ?? 0);
        point[name] = netTotal / 1024;
      }
      return point;
    });
  }, [statsResult, containerNames]);

  const containerColors = [
    "blue.6", "teal.6", "orange.6", "grape.6", "cyan.6",
    "pink.6", "lime.6", "violet.6", "indigo.6", "yellow.6",
    "red.6", "green.6", "blue.4", "teal.4", "orange.4",
  ];

  const containerSeries = containerNames.map((name, i) => ({
    name,
    color: containerColors[i % containerColors.length]!,
  }));

  const cols = width > 600 ? 2 : 1;

  return (
    <ScrollArea h="100%">
      <Stack gap="md" p="sm">
        <Select
          size="xs"
          data={systems}
          value={selectedSystem}
          onChange={setSelectedSystem}
          placeholder={t("selectSystem")}
        />

        {statsResult && (
          <SimpleGrid cols={cols} spacing="md">
            {options.showCpu && cpuData.length > 0 && (
              <ChartPanel title={t("chart.cpu.title")} subtitle={t("chart.cpu.subtitle")}>
                <AreaChart
                  h={chartHeight}
                  data={cpuData}
                  dataKey="time"
                  series={[{ name: t("chart.cpu.series"), color: "teal.6" }]}
                  curveType="monotone"
                  withDots={false}
                  fillOpacity={0.4}
                  yAxisProps={{ domain: [0, 100], tickFormatter: (v: number) => `${v}%` }}
                  valueFormatter={formatPercent}
                  tooltipProps={compactTooltipProps}
                  withXAxis
                  withYAxis
                />
              </ChartPanel>
            )}

            {options.showMemory && memoryData.length > 0 && (
              <ChartPanel title={t("chart.memory.title")} subtitle={t("chart.memory.subtitle")}>
                <AreaChart
                  h={chartHeight}
                  data={memoryData}
                  dataKey="time"
                  series={[{ name: t("chart.memory.series"), color: "teal.6" }]}
                  curveType="monotone"
                  withDots={false}
                  fillOpacity={0.4}
                  yAxisProps={{ tickFormatter: (v: number) => `${v.toFixed(0)} GB` }}
                  valueFormatter={formatGB}
                  tooltipProps={compactTooltipProps}
                  withXAxis
                  withYAxis
                />
              </ChartPanel>
            )}

            {options.showDisk && diskData.length > 0 && (
              <ChartPanel title={t("chart.disk.title")} subtitle={t("chart.disk.subtitle")}>
                <AreaChart
                  h={chartHeight}
                  data={diskData}
                  dataKey="time"
                  series={[{ name: t("chart.disk.series"), color: "grape.6" }]}
                  curveType="monotone"
                  withDots={false}
                  fillOpacity={0.4}
                  yAxisProps={{ tickFormatter: (v: number) => `${v.toFixed(0)} GB` }}
                  valueFormatter={formatGB}
                  tooltipProps={compactTooltipProps}
                  withXAxis
                  withYAxis
                />
              </ChartPanel>
            )}

            {options.showDiskIO && diskIOData.length > 0 && (
              <ChartPanel title={t("chart.diskIO.title")} subtitle={t("chart.diskIO.subtitle")}>
                <AreaChart
                  h={chartHeight}
                  data={diskIOData}
                  dataKey="time"
                  series={[
                    { name: t("chart.diskIO.read"), color: "orange.6" },
                    { name: t("chart.diskIO.write"), color: "blue.6" },
                  ]}
                  curveType="monotone"
                  withDots={false}
                  fillOpacity={0.3}
                  yAxisProps={{ tickFormatter: (v: number) => `${v.toFixed(1)} MB/s` }}
                  valueFormatter={formatMBs}
                  tooltipProps={compactTooltipProps}
                  withXAxis
                  withYAxis
                  withLegend
                />
              </ChartPanel>
            )}

            {options.showNetwork && networkData.length > 0 && (
              <ChartPanel title={t("chart.network.title")} subtitle={t("chart.network.subtitle")}>
                <AreaChart
                  h={chartHeight}
                  data={networkData}
                  dataKey="time"
                  series={[
                    { name: t("chart.network.sent"), color: "blue.6" },
                    { name: t("chart.network.recv"), color: "teal.6" },
                  ]}
                  curveType="monotone"
                  withDots={false}
                  fillOpacity={0.3}
                  yAxisProps={{ tickFormatter: (v: number) => formatBytesPerSec(v) }}
                  valueFormatter={(v: number) => formatBytesPerSec(v)}
                  tooltipProps={compactTooltipProps}
                  withXAxis
                  withYAxis
                  withLegend
                />
              </ChartPanel>
            )}

            {showDocker && containerSeries.length > 0 && (
              <>
                {options.showDockerCpu && dockerCpuData.length > 0 && (
                  <ChartPanel title={t("chart.dockerCpu.title")} subtitle={t("chart.dockerCpu.subtitle")}>
                    <AreaChart
                      h={chartHeight}
                      data={dockerCpuData}
                      dataKey="time"
                      type="stacked"
                      series={containerSeries}
                      curveType="monotone"
                      withDots={false}
                      fillOpacity={0.6}
                      yAxisProps={{ tickFormatter: (v: number) => `${v.toFixed(2)}%` }}
                      valueFormatter={formatPercent}
                      tooltipProps={compactTooltipProps}
                      withXAxis
                      withYAxis
                    />
                  </ChartPanel>
                )}

                {options.showDockerMemory && dockerMemData.length > 0 && (
                  <ChartPanel title={t("chart.dockerMemory.title")} subtitle={t("chart.dockerMemory.subtitle")}>
                    <AreaChart
                      h={chartHeight}
                      data={dockerMemData}
                      dataKey="time"
                      type="stacked"
                      series={containerSeries}
                      curveType="monotone"
                      withDots={false}
                      fillOpacity={0.6}
                      yAxisProps={{ tickFormatter: (v: number) => `${v.toFixed(0)} MB` }}
                      valueFormatter={formatMB}
                      tooltipProps={compactTooltipProps}
                      withXAxis
                      withYAxis
                    />
                  </ChartPanel>
                )}

                {options.showDockerNetwork && dockerNetData.length > 0 && (
                  <ChartPanel title={t("chart.dockerNetwork.title")} subtitle={t("chart.dockerNetwork.subtitle")}>
                    <AreaChart
                      h={chartHeight}
                      data={dockerNetData}
                      dataKey="time"
                      type="stacked"
                      series={containerSeries}
                      curveType="monotone"
                      withDots={false}
                      fillOpacity={0.6}
                      yAxisProps={{ tickFormatter: (v: number) => `${v.toFixed(0)} KB/s` }}
                      valueFormatter={(v: number) => `${v.toFixed(1)} KB/s`}
                      tooltipProps={compactTooltipProps}
                      withXAxis
                      withYAxis
                    />
                  </ChartPanel>
                )}
              </>
            )}
          </SimpleGrid>
        )}
      </Stack>
    </ScrollArea>
  );
}
