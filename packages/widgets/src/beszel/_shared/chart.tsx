"use client";

import { useMemo } from "react";
import { Group, Stack, Text } from "@mantine/core";
import type { AreaChartProps } from "@mantine/charts";
import { AreaChart } from "@mantine/charts";
import dayjs from "dayjs";

import type { BeszelContainerStatsRecord, BeszelSystemStatsRecord } from "@homarr/integrations/types";

const formatTime = (timestamp: string) => dayjs(timestamp).format("HH:mm");
const formatTimeLive = (timestamp: string) => dayjs(timestamp).format("HH:mm:ss");

function prepareRecords<T>(records: T[], live: boolean) {
  return {
    fmt: live ? formatTimeLive : formatTime,
    ordered: live ? records : [...records].toReversed(),
  };
}

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

export const BeszelAreaChart = ({
  yAxisFormatter,
  yAxisDomain,
  yAxisProps,
  style,
  type = "default",
  ...props
}: BeszelAreaChartProps) => (
  <AreaChart
    dataKey="time"
    curveType="monotone"
    withGradient={false}
    connectNulls
    withDots={true}
    type={type}
    strokeWidth={1}
    fillOpacity={0.2}
    activeDotProps={{ r: 1, strokeWidth: 3 }}
    dotProps={{ r: 0, strokeWidth: 0 }}
    withXAxis
    withYAxis
    w="100%"
    style={{ minWidth: 0, minHeight: 0, ...style }}
    yAxisProps={{
      ...yAxisBase,
      width: 32,
      tickMargin: 2,
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
  live = false,
) =>
  useMemo(() => {
    if (!systemStats) return [];
    const { fmt, ordered } = prepareRecords(systemStats, live);
    return ordered.map((r) => ({
      time: fmt(r.created),
      ...mapFn(r.stats),
    }));
  }, [systemStats, mapFn, live]);

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

// c = CPU (%), m = memory (MB), b = bandwidth [sent,recv] (bytes/s), ns/nr = legacy net (bytes/s)
const MB = 1024 * 1024;

const defaultContainerExtractors: Record<string, ContainerExtractor> = {
  cpu: (c) => c?.c ?? 0,
  memory: (c) => (c?.m ?? 0) * MB,
  network: (c) => (c?.b ? c.b[0] + c.b[1] : (c?.ns ?? 0) + (c?.nr ?? 0)),
};

export const useDockerChartData = (
  containerStats: BeszelContainerStatsRecord[] | undefined,
  containerNames: string[],
  metric: "cpu" | "memory" | "network",
  live = false,
) =>
  useMemo(() => {
    if (!containerStats?.length) return [];
    const extract = defaultContainerExtractors[metric];
    if (!extract) return [];
    const { fmt, ordered } = prepareRecords(containerStats, live);
    return ordered.map((record) => {
      const point: Record<string, unknown> = { time: fmt(record.created) };
      for (const name of containerNames) {
        point[name] = extract(record.stats.find((c) => c.n === name));
      }
      return point;
    });
  }, [containerStats, containerNames, metric, live]);
