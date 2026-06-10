"use client";

import { useMemo } from "react";
import { Group, Stack, Text } from "@mantine/core";
import type { AreaChartProps } from "@mantine/charts";
import { AreaChart } from "@mantine/charts";
import dayjs from "dayjs";

import type { BeszelContainerStatsRecord, BeszelSystemStatsRecord } from "@homarr/integrations/types";

const formatTime = (timestamp: string) => dayjs(timestamp).format("HH:mm");

const yAxisBase = { tickMargin: 0, tick: { fontSize: 10 } } as const;

interface ChartPanelProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export const ChartPanel = ({ title, subtitle, children }: ChartPanelProps) => (
  <Stack gap={4} style={{ minWidth: 0, overflow: "hidden" }}>
    <Group gap="xs">
      <Text size="sm" fw={600}>
        {title}
      </Text>
      {subtitle && (
        <Text size="xs" c="dimmed">
          {subtitle}
        </Text>
      )}
    </Group>
    {children}
  </Stack>
);

type BeszelAreaChartProps = Omit<AreaChartProps, "dataKey" | "curveType" | "withDots" | "withXAxis" | "withYAxis"> & {
  yAxisFormatter: (value: number) => string;
  yAxisDomain?: [number, string];
};

export const BeszelAreaChart = ({ yAxisFormatter, yAxisDomain, yAxisProps, style, ...props }: BeszelAreaChartProps) => (
  <AreaChart
    dataKey="time"
    curveType="monotone"
    withDots={false}
    withXAxis
    withYAxis
    style={{ minWidth: 0, ...style }}
    yAxisProps={{
      ...yAxisBase,
      ...(yAxisDomain ? { domain: yAxisDomain } : {}),
      tickFormatter: yAxisFormatter,
      ...yAxisProps,
    }}
    {...props}
  />
);

export const useSystemChartData = (
  systemStats: BeszelSystemStatsRecord[] | undefined,
  mapFn: (stats: BeszelSystemStatsRecord["stats"]) => Record<string, unknown>,
) =>
  useMemo(() => {
    if (!systemStats) return [];
    return [...systemStats].toReversed().map((r) => ({
      time: formatTime(r.created),
      ...mapFn(r.stats),
    }));
  }, [systemStats, mapFn]);

export const useContainerNames = (containerStats: BeszelContainerStatsRecord[] | undefined, max = 15) =>
  useMemo(() => {
    if (!containerStats?.length) return [];
    const names = new Set<string>();
    for (const record of containerStats) {
      for (const c of record.stats) {
        names.add(c.n);
      }
    }
    return [...names].slice(0, max);
  }, [containerStats, max]);

type ContainerExtractor = (container: BeszelContainerStatsRecord["stats"][number] | undefined) => number;

// c = CPU (%), m = memory (bytes), b = bandwidth [sent,recv] (bytes/s), ns/nr = legacy net (bytes/s)
const defaultContainerExtractors: Record<string, ContainerExtractor> = {
  cpu: (c) => c?.c ?? 0,
  memory: (c) => c?.m ?? 0,
  network: (c) => (c?.b ? c.b[0] + c.b[1] : (c?.ns ?? 0) + (c?.nr ?? 0)),
};

export const useDockerChartData = (
  containerStats: BeszelContainerStatsRecord[] | undefined,
  containerNames: string[],
  metric: "cpu" | "memory" | "network",
) =>
  useMemo(() => {
    if (!containerStats?.length) return [];
    const extract = defaultContainerExtractors[metric];
    if (!extract) return [];
    return [...containerStats].toReversed().map((record) => {
      const point: Record<string, unknown> = { time: formatTime(record.created) };
      for (const name of containerNames) {
        point[name] = extract(record.stats.find((c) => c.n === name));
      }
      return point;
    });
  }, [containerStats, containerNames, metric]);
