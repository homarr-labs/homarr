"use client";

import { useMemo, useState } from "react";
import { SegmentedControl, SimpleGrid, Stack } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { createModal } from "@homarr/modals";
import { useScopedI18n } from "@homarr/translation/client";

import type { BeszelTimePeriod } from "./chart";
import { BeszelChartPanel, CPU_Y_AXIS_DOMAIN, useSystemChartData } from "./chart";
import { chartAxisFormatters, formatByteRate, formatGB, formatPercent } from "./format";
import { makeTooltipProps } from "./tooltip";

const tooltipPercent = makeTooltipProps(formatPercent);
const tooltipGB = makeTooltipProps(formatGB, true);
const tooltipRate = makeTooltipProps(formatByteRate, true);

const CHART_HEIGHT = 180;
const MB = 1024 * 1024;

const timePeriodOptions: { value: BeszelTimePeriod; label: string }[] = [
  { value: "1h", label: "1H" },
  { value: "12h", label: "12H" },
  { value: "24h", label: "24H" },
  { value: "1w", label: "1W" },
  { value: "30d", label: "30D" },
];

interface BeszelSystemStatsModalProps {
  integrationId: string;
  systemId: string;
}

export const BeszelSystemStatsModal = createModal<BeszelSystemStatsModalProps>(({ innerProps }) => {
  const t = useScopedI18n("widget.beszelSystemStats");
  const [timePeriod, setTimePeriod] = useState<BeszelTimePeriod>("1h");

  const { data } = clientApi.widget.beszel.getSystemStats.useQuery({
    integrationIds: [innerProps.integrationId],
    systemId: innerProps.systemId,
    timePeriod,
    includeDocker: false,
  });

  const mappers = useMemo(
    () => ({
      cpu: (s: { cpu: number }) => ({ [t("chart.cpu.series")]: s.cpu }),
      memory: (s: { mu: number; mb: number }) => ({
        [t("chart.memory.series")]: s.mu,
        [t("chart.memory.cache")]: s.mb ?? 0,
      }),
      disk: (s: { du: number }) => ({ [t("chart.disk.series")]: s.du }),
      diskIO: (s: { dr?: number; dw?: number }) => ({
        [t("chart.diskIO.read")]: (s.dr ?? 0) * MB,
        [t("chart.diskIO.write")]: (s.dw ?? 0) * MB,
      }),
      network: (s: { ns: number; nr: number; b?: [number, number] }) => ({
        [t("chart.network.sent")]: s.b?.[0] ?? s.ns,
        [t("chart.network.recv")]: s.b?.[1] ?? s.nr,
      }),
    }),
    [t],
  );

  const series = useMemo(
    () => ({
      cpu: [{ name: t("chart.cpu.series"), color: "teal.6" }],
      memory: [
        { name: t("chart.memory.series"), color: "teal.5" },
        { name: t("chart.memory.cache"), color: "teal.8" },
      ],
      disk: [{ name: t("chart.disk.series"), color: "grape.6" }],
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

  const systemStats = data?.systemStats;
  const cpuData = useSystemChartData(systemStats, mappers.cpu, timePeriod);
  const memoryData = useSystemChartData(systemStats, mappers.memory, timePeriod);
  const diskData = useSystemChartData(systemStats, mappers.disk, timePeriod);
  const diskIOData = useSystemChartData(systemStats, mappers.diskIO, timePeriod);
  const networkData = useSystemChartData(systemStats, mappers.network, timePeriod);

  return (
    <Stack gap="md">
      <SegmentedControl
        size="xs"
        value={timePeriod}
        onChange={(v) => setTimePeriod(v as BeszelTimePeriod)}
        data={timePeriodOptions}
      />
      <SimpleGrid cols={2} spacing="md">
        {cpuData.length > 0 && (
          <BeszelChartPanel
            title={t("chart.cpu.title")}
            chartProps={{
              h: CHART_HEIGHT,
              data: cpuData,
              series: series.cpu,
              yAxisFormatter: chartAxisFormatters.percent,
              yAxisDomain: CPU_Y_AXIS_DOMAIN,
              tooltipProps: tooltipPercent,
            }}
          />
        )}
        {memoryData.length > 0 && (
          <BeszelChartPanel
            title={t("chart.memory.title")}
            chartProps={{
              h: CHART_HEIGHT,
              data: memoryData,
              type: "stacked",
              series: series.memory,
              yAxisFormatter: chartAxisFormatters.gb,
              tooltipProps: tooltipGB,
            }}
          />
        )}
        {diskData.length > 0 && (
          <BeszelChartPanel
            title={t("chart.disk.title")}
            chartProps={{
              h: CHART_HEIGHT,
              data: diskData,
              series: series.disk,
              yAxisFormatter: chartAxisFormatters.gb,
              tooltipProps: tooltipGB,
            }}
          />
        )}
        {diskIOData.length > 0 && (
          <BeszelChartPanel
            title={t("chart.diskIO.title")}
            chartProps={{
              h: CHART_HEIGHT,
              data: diskIOData,
              series: series.diskIO,
              yAxisFormatter: chartAxisFormatters.rate,
              tooltipProps: tooltipRate,
            }}
          />
        )}
        {networkData.length > 0 && (
          <BeszelChartPanel
            title={t("chart.network.title")}
            chartProps={{
              h: CHART_HEIGHT,
              data: networkData,
              series: series.network,
              yAxisFormatter: chartAxisFormatters.rate,
              tooltipProps: tooltipRate,
            }}
          />
        )}
      </SimpleGrid>
    </Stack>
  );
}).withOptions({
  defaultTitle: (t) => t("widget.beszelSystemStats.name"),
  size: 1200,
});
