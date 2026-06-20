"use client";

import { memo, useMemo, useRef } from "react";
import { Group, Stack, Text } from "@mantine/core";
import type { AreaChartProps } from "@mantine/charts";
import { AreaChart } from "@mantine/charts";
import dayjs from "dayjs";

import type { BeszelContainerStatsRecord, BeszelSystemStatsRecord } from "@homarr/integrations/types";

export type BeszelTimePeriod = "1m" | "1h" | "12h" | "24h" | "1w" | "30d";

const timeFormats: Record<BeszelTimePeriod, string> = {
  "1m": "HH:mm:ss",
  "1h": "HH:mm",
  "12h": "HH:mm",
  "24h": "HH:mm",
  "1w": "MMM D",
  "30d": "MMM D",
};

const periodDays: Partial<Record<BeszelTimePeriod, number>> = { "1w": 7, "30d": 30 };

function prepareRecords<T>(records: T[], timePeriod: BeszelTimePeriod) {
  const fmt = (timestamp: string) => dayjs(timestamp).format(timeFormats[timePeriod]);
  if (timePeriod === "1m") {
    return { fmt, ordered: records };
  }
  return { fmt, ordered: [...records].toReversed() };
}

function padTimeGrid(data: Record<string, unknown>[], timePeriod: BeszelTimePeriod) {
  const days = periodDays[timePeriod];
  if (!days) return data;

  const fmt = (ts: string) => dayjs(ts).format(timeFormats[timePeriod]);
  const now = dayjs();
  const existingDays = new Set(data.map((d) => dayjs(d.rawTime as string).format("YYYY-MM-DD")));
  const result = [...data];

  for (let i = days; i >= 0; i--) {
    const d = now.subtract(i, "day").startOf("day");
    const key = d.format("YYYY-MM-DD");
    if (!existingDays.has(key)) {
      const iso = d.toISOString();
      result.push({ time: fmt(iso), rawTime: iso });
    }
  }

  return result.toSorted((a, b) => new Date(a.rawTime as string).getTime() - new Date(b.rawTime as string).getTime());
}

const yAxisBase = { tickMargin: 0, tick: { fontSize: 10 } } as const;
const chartStyle = { minWidth: 0, minHeight: 1 } as const;
const panelStyle = { minWidth: 0, overflow: "hidden" } as const;
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

const BeszelAreaChart = memo(
  ({
    yAxisFormatter,
    yAxisDomain,
    yAxisProps: yAxisPropsOverride,
    type = "default",
    ...props
  }: BeszelAreaChartProps) => {
    const mergedYAxis = useMemo(() => {
      const base = {
        ...yAxisBase,
        width: 48,
        tickMargin: 2,
        tickFormatter: yAxisFormatter,
        ...yAxisPropsOverride,
      };
      if (yAxisDomain) {
        return { ...base, domain: yAxisDomain };
      }
      return base;
    }, [yAxisFormatter, yAxisDomain, yAxisPropsOverride]);

    return (
      <AreaChart
        dataKey="time"
        curveType="monotone"
        withGradient={false}
        connectNulls={false}
        withDots={false}
        type={type}
        strokeWidth={1}
        fillOpacity={0.2}
        withXAxis
        withYAxis
        w="100%"
        style={chartStyle}
        yAxisProps={mergedYAxis}
        {...props}
      />
    );
  },
);

export const useSystemChartData = (
  systemStats: BeszelSystemStatsRecord[] | undefined,
  mapFn: (stats: BeszelSystemStatsRecord["stats"]) => Record<string, unknown>,
  timePeriod: BeszelTimePeriod = "1h",
) =>
  useMemo(() => {
    if (!systemStats) return [];
    const { fmt, ordered } = prepareRecords(systemStats, timePeriod);
    const mapped = ordered.map((r) => ({
      time: fmt(r.created),
      rawTime: r.created,
      ...mapFn(r.stats),
    }));
    return padTimeGrid(mapped, timePeriod);
  }, [systemStats, mapFn, timePeriod]);

export const useContainerNames = (containerStats: BeszelContainerStatsRecord[] | undefined, max = 15) => {
  const prevRef = useRef<string[]>([]);
  return useMemo(() => {
    if (!containerStats?.length) {
      if (prevRef.current.length === 0) return prevRef.current;
      prevRef.current = [];
      return prevRef.current;
    }
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
  timePeriod: BeszelTimePeriod = "1h",
) =>
  useMemo(() => {
    if (!containerStats?.length) return [];
    const extract = defaultContainerExtractors[metric];
    if (!extract) return [];
    const { fmt, ordered } = prepareRecords(containerStats, timePeriod);
    const mapped = ordered.map((record) => {
      const point: Record<string, unknown> = { time: fmt(record.created), rawTime: record.created };
      const byName = new Map(record.stats.map((c) => [c.n, c]));
      for (const name of containerNames) {
        point[name] = extract(byName.get(name));
      }
      return point;
    });
    return padTimeGrid(mapped, timePeriod);
  }, [containerStats, containerNames, metric, timePeriod]);
