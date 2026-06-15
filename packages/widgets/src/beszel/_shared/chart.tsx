"use client";

import { memo, useMemo, useRef } from "react";
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
const chartStyle = { minWidth: 0, minHeight: 0 } as const;
const panelStyle = { minWidth: 0, overflow: "hidden" } as const;
const noAnimation = { isAnimationActive: false } as const;
export const CPU_Y_AXIS_DOMAIN: [number, string] = [0, "auto"];

interface BeszelChartPanelProps {
  title: string;
  subtitle?: string;
  chartProps: BeszelAreaChartProps;
}

export const BeszelChartPanel = memo(({ title, subtitle, chartProps }: BeszelChartPanelProps) => (
  <Stack gap={4} style={panelStyle}>
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
    <BeszelAreaChart {...chartProps} />
  </Stack>
));

type BeszelAreaChartProps = Omit<AreaChartProps, "dataKey" | "curveType" | "withDots" | "withXAxis" | "withYAxis"> & {
  yAxisFormatter: (value: number) => string;
  yAxisDomain?: [number, string];
};

const BeszelAreaChart = memo(({
  yAxisFormatter,
  yAxisDomain,
  yAxisProps: yAxisPropsOverride,
  type = "default",
  ...props
}: BeszelAreaChartProps) => {
  const mergedYAxis = useMemo(
    () => ({
      ...yAxisBase,
      width: 48,
      tickMargin: 2,
      ...(yAxisDomain ? { domain: yAxisDomain } : {}),
      tickFormatter: yAxisFormatter,
      ...yAxisPropsOverride,
    }),
    [yAxisFormatter, yAxisDomain, yAxisPropsOverride],
  );

  return (
    <AreaChart
      dataKey="time"
      curveType="monotone"
      withGradient={false}
      connectNulls
      withDots={false}
      type={type}
      strokeWidth={1}
      fillOpacity={0.2}
      areaChartProps={{
        // margin: { top: 0, right: 0, bottom: 0, left: 10 },
      }}
      withXAxis
      withYAxis
      w="100%"
      style={chartStyle}
      yAxisProps={mergedYAxis}
      {...props}
    />
  );
});

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

export const useContainerNames = (containerStats: BeszelContainerStatsRecord[] | undefined, max = 15) => {
  const prevRef = useRef<string[]>([]);
  return useMemo(() => {
    if (!containerStats?.length) return prevRef.current.length === 0 ? prevRef.current : (prevRef.current = []);
    const names = new Set<string>();
    for (const record of containerStats) {
      for (const c of record.stats) {
        names.add(c.n);
      }
    }
    const next = [...names].slice(0, max);
    const prev = prevRef.current;
    if (prev.length === next.length && prev.every((n, i) => n === next[i])) return prev;
    prevRef.current = next;
    return next;
  }, [containerStats, max]);
};

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
      const byName = new Map(record.stats.map((c) => [c.n, c]));
      for (const name of containerNames) {
        point[name] = extract(byName.get(name));
      }
      return point;
    });
  }, [containerStats, containerNames, metric, live]);
