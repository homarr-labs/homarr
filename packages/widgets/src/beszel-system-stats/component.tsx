"use client";

import { useCallback, useMemo, useState } from "react";
import { ScrollArea, Select, SimpleGrid, Stack } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { useScopedI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import { containerColors } from "../beszel/_shared/colors";
import {
  BeszelAreaChart,
  ChartPanel,
  useContainerNames,
  useDockerChartData,
  useSystemChartData,
} from "../beszel/_shared/chart";
import {
  chartAxisFormatters,
  formatByteRate,
  formatGB,
  formatPercent,
  formatStorageBytes,
} from "../beszel/_shared/format";
import { makeTooltipProps } from "../beszel/_shared/tooltip";

const tooltipPercent = makeTooltipProps(formatPercent);
const tooltipGB = makeTooltipProps(formatGB, true);
const tooltipRate = makeTooltipProps(formatByteRate, true);
const tooltipPercentTotal = makeTooltipProps(formatPercent, true);
const tooltipBytesTotal = makeTooltipProps(formatStorageBytes, true);

const CHART_HEIGHT = 180;

export default function BeszelSystemStatsWidget({
  options,
  integrationIds,
  isEditMode,
  width,
}: WidgetComponentProps<"beszelSystemStats">) {
  const t = useScopedI18n("widget.beszelSystemStats");
  const [systemsResult] = clientApi.widget.beszel.getSystems.useSuspenseQuery({ integrationIds });

  const systems = useMemo(
    () => systemsResult.flatMap((r) => r.systems.map((s) => ({ value: s.id, label: s.name }))),
    [systemsResult],
  );

  const [selectedSystem, setSelectedSystem] = useState<string | null>(systems[0]?.value ?? null);

  const showDocker = options.showDockerCpu || options.showDockerMemory || options.showDockerNetwork;

  const [statsResult] = clientApi.widget.beszel.getSystemStats.useSuspenseQuery({
    integrationIds,
    systemId: selectedSystem ?? systems[0]?.value ?? "",
    timePeriod: options.timePeriod as "1h" | "12h" | "24h" | "1w" | "30d",
    includeDocker: showDocker,
  });

  // BeszelSystemStats fields are documented in beszel-types.ts.
  // mu/du = bytes, dr/dw = bytes/s, b = public bandwidth [sent,recv] bytes/s, ns/nr = all-interface bytes/s
  const BYTES_TO_GB = 1024 * 1024 * 1024;

  const cpuMap = useCallback((s: { cpu: number }) => ({ [t("chart.cpu.series")]: s.cpu }), [t]);
  const memoryMap = useCallback(
    (s: { mu: number; mb: number }) => ({
      [t("chart.memory.series")]: s.mu / BYTES_TO_GB,
      [t("chart.memory.cache")]: (s.mb ?? 0) / BYTES_TO_GB,
    }),
    [t],
  );
  const diskMap = useCallback((s: { du: number }) => ({ [t("chart.disk.series")]: s.du / BYTES_TO_GB }), [t]);
  const diskIOMap = useCallback(
    (s: { dr?: number; dw?: number }) => ({
      [t("chart.diskIO.read")]: s.dr ?? 0,
      [t("chart.diskIO.write")]: s.dw ?? 0,
    }),
    [t],
  );
  // b = public interface bandwidth (preferred), ns/nr = all-interface traffic (fallback)
  const networkMap = useCallback(
    (s: { ns: number; nr: number; b?: [number, number] }) => ({
      [t("chart.network.sent")]: s.b?.[0] ?? s.ns,
      [t("chart.network.recv")]: s.b?.[1] ?? s.nr,
    }),
    [t],
  );

  const cpuData = useSystemChartData(statsResult?.systemStats, cpuMap);
  const memoryData = useSystemChartData(statsResult?.systemStats, memoryMap);
  const diskData = useSystemChartData(statsResult?.systemStats, diskMap);
  const diskIOData = useSystemChartData(statsResult?.systemStats, diskIOMap);
  const networkData = useSystemChartData(statsResult?.systemStats, networkMap);

  const containerNames = useContainerNames(statsResult?.containerStats);
  const dockerCpuData = useDockerChartData(statsResult?.containerStats, containerNames, "cpu");
  const dockerMemData = useDockerChartData(statsResult?.containerStats, containerNames, "memory");
  const dockerNetData = useDockerChartData(statsResult?.containerStats, containerNames, "network");

  const containerSeries = containerNames.map((name, i) => ({
    name,
    color: containerColors[i % containerColors.length] as string,
  }));

  const cols = width > 600 ? 2 : 1;

  return (
    <ScrollArea h="100%" style={{ pointerEvents: isEditMode ? "none" : undefined }}>
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
                <BeszelAreaChart
                  h={CHART_HEIGHT}
                  data={cpuData}
                  series={[{ name: t("chart.cpu.series"), color: "teal.6" }]}
                  fillOpacity={0.4}
                  yAxisFormatter={chartAxisFormatters.percent}
                  yAxisDomain={[0, "auto"]}
                  tooltipProps={tooltipPercent}
                />
              </ChartPanel>
            )}

            {options.showMemory && memoryData.length > 0 && (
              <ChartPanel title={t("chart.memory.title")} subtitle={t("chart.memory.subtitle")}>
                <BeszelAreaChart
                  h={CHART_HEIGHT}
                  data={memoryData}
                  series={[
                    { name: t("chart.memory.series"), color: "teal.5" },
                    { name: t("chart.memory.cache"), color: "teal.8" },
                  ]}
                  fillOpacity={0.4}
                  yAxisFormatter={chartAxisFormatters.gb}
                  tooltipProps={tooltipGB}
                  withLegend
                />
              </ChartPanel>
            )}

            {options.showDisk && diskData.length > 0 && (
              <ChartPanel title={t("chart.disk.title")} subtitle={t("chart.disk.subtitle")}>
                <BeszelAreaChart
                  h={CHART_HEIGHT}
                  data={diskData}
                  series={[{ name: t("chart.disk.series"), color: "grape.6" }]}
                  fillOpacity={0.4}
                  yAxisFormatter={chartAxisFormatters.gb}
                  tooltipProps={tooltipGB}
                />
              </ChartPanel>
            )}

            {options.showDiskIO && diskIOData.length > 0 && (
              <ChartPanel title={t("chart.diskIO.title")} subtitle={t("chart.diskIO.subtitle")}>
                <BeszelAreaChart
                  h={CHART_HEIGHT}
                  data={diskIOData}
                  series={[
                    { name: t("chart.diskIO.write"), color: "orange.6" },
                    { name: t("chart.diskIO.read"), color: "blue.6" },
                  ]}
                  fillOpacity={0.3}
                  yAxisFormatter={chartAxisFormatters.rate}
                  tooltipProps={tooltipRate}
                  withLegend
                />
              </ChartPanel>
            )}

            {options.showNetwork && networkData.length > 0 && (
              <ChartPanel title={t("chart.network.title")} subtitle={t("chart.network.subtitle")}>
                <BeszelAreaChart
                  h={CHART_HEIGHT}
                  data={networkData}
                  series={[
                    { name: t("chart.network.sent"), color: "blue.6" },
                    { name: t("chart.network.recv"), color: "teal.6" },
                  ]}
                  fillOpacity={0.3}
                  yAxisFormatter={chartAxisFormatters.rate}
                  tooltipProps={tooltipRate}
                  withLegend
                />
              </ChartPanel>
            )}

            {showDocker && containerSeries.length > 0 && (
              <>
                {options.showDockerCpu && dockerCpuData.length > 0 && (
                  <ChartPanel title={t("chart.dockerCpu.title")} subtitle={t("chart.dockerCpu.subtitle")}>
                    <BeszelAreaChart
                      h={CHART_HEIGHT}
                      data={dockerCpuData}
                      type="stacked"
                      series={containerSeries}
                      fillOpacity={0.6}
                      yAxisFormatter={chartAxisFormatters.percent}
                      tooltipProps={tooltipPercentTotal}
                    />
                  </ChartPanel>
                )}

                {options.showDockerMemory && dockerMemData.length > 0 && (
                  <ChartPanel title={t("chart.dockerMemory.title")} subtitle={t("chart.dockerMemory.subtitle")}>
                    <BeszelAreaChart
                      h={CHART_HEIGHT}
                      data={dockerMemData}
                      type="stacked"
                      series={containerSeries}
                      fillOpacity={0.6}
                      yAxisFormatter={chartAxisFormatters.bytes}
                      tooltipProps={tooltipBytesTotal}
                    />
                  </ChartPanel>
                )}

                {options.showDockerNetwork && dockerNetData.length > 0 && (
                  <ChartPanel title={t("chart.dockerNetwork.title")} subtitle={t("chart.dockerNetwork.subtitle")}>
                    <BeszelAreaChart
                      h={CHART_HEIGHT}
                      data={dockerNetData}
                      type="stacked"
                      series={containerSeries}
                      fillOpacity={0.6}
                      yAxisFormatter={chartAxisFormatters.rate}
                      tooltipProps={tooltipRate}
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
