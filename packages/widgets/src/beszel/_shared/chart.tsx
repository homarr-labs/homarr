"use client";

import { memo, useMemo, useRef } from "react";
import { Group, Stack, Text } from "@mantine/core";
import type { AreaChartProps } from "@mantine/charts";
import { AreaChart } from "@mantine/charts";
import dayjs from "dayjs";

import type { BeszelContainerStatsRecord, BeszelSystemStatsRecord } from "@homarr/integrations/types";

import { formatLocalizedDate } from "../../common/locale";

export type BeszelTimePeriod = "1m" | "1h" | "12h" | "24h" | "1w" | "30d";

const timeFormatOptions: Record<BeszelTimePeriod, Intl.DateTimeFormatOptions> = {
  "1m": { hour: "numeric", minute: "2-digit", second: "2-digit" },
  "1h": { hour: "numeric", minute: "2-digit" },
  "12h": { hour: "numeric", minute: "2-digit" },
  "24h": { hour: "numeric", minute: "2-digit" },
  "1w": { month: "short", day: "numeric" },
  "30d": { month: "short", day: "numeric" },
};

const periodDays: Partial<Record<BeszelTimePeriod, number>> = { "1w": 7, "30d": 30 };

export const formatBeszelChartTimestamp = (timestamp: string, timePeriod: BeszelTimePeriod, locale: string): string =>
  formatLocalizedDate(timestamp, locale, timeFormatOptions[timePeriod]);

function prepareRecords<T>(records: T[], timePeriod: BeszelTimePeriod, locale: string) {
  const fmt = (timestamp: string) => formatBeszelChartTimestamp(timestamp, timePeriod, locale);
  if (timePeriod === "1m") {
    return { fmt, ordered: records };
  }
  return { fmt, ordered: records.toReversed() };
}

function padTimeGrid(data: Record<string, unknown>[], timePeriod: BeszelTimePeriod, locale: string) {
  if (timePeriod === "1m") return padLiveTimeGrid(data, 60, locale);
  const days = periodDays[timePeriod];
  if (!days) return data;

  const fmt = (timestamp: string) => formatBeszelChartTimestamp(timestamp, timePeriod, locale);
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

export function padLiveTimeGrid(data: Record<string, unknown>[], pointCount = 60, locale = "en-US") {
  if (data.length === 0) return data;

  const end = dayjs(
    data.reduce((latest, point) => {
      const timestamp = new Date(point.rawTime as string).getTime();
      return Number.isFinite(timestamp) ? Math.max(latest, timestamp) : latest;
    }, 0),
  ).startOf("second");
  const pointsBySecond = new Map(
    data.map(
      (point) =>
        [
          dayjs(point.rawTime as string)
            .startOf("second")
            .valueOf(),
          point,
        ] as const,
    ),
  );

  return Array.from({ length: pointCount }, (_, index) => {
    const timestamp = end.subtract(pointCount - index - 1, "second");
    return (
      pointsBySecond.get(timestamp.valueOf()) ?? {
        time: formatBeszelChartTimestamp(timestamp.toISOString(), "1m", locale),
        rawTime: timestamp.toISOString(),
      }
    );
  });
}

const yAxisBase = { tickMargin: 0, tick: { fontSize: "var(--mantine-font-size-xs)" } } as const;
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
  locale = "en-US",
) =>
  useMemo(() => {
    if (!systemStats) return [];
    const { fmt, ordered } = prepareRecords(systemStats, timePeriod, locale);
    const mapped = ordered.map((r) => ({
      time: fmt(r.created),
      rawTime: r.created,
      ...mapFn(r.stats),
    }));
    return padTimeGrid(mapped, timePeriod, locale);
  }, [systemStats, mapFn, timePeriod, locale]);

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

export const useDiskChartData = (
  systemStats: BeszelSystemStatsRecord[] | undefined,
  efsPaths: string[],
  rootSeriesName: string,
  timePeriod: BeszelTimePeriod = "1h",
  locale = "en-US",
) =>
  useMemo(
    () => buildDiskChartData(systemStats, efsPaths, rootSeriesName, timePeriod, locale),
    [systemStats, efsPaths, rootSeriesName, timePeriod, locale],
  );

export const buildDiskChartData = (
  systemStats: BeszelSystemStatsRecord[] | undefined,
  efsPaths: string[],
  rootSeriesName: string,
  timePeriod: BeszelTimePeriod = "1h",
  locale = "en-US",
) => {
  if (!systemStats?.length) return [];
  const { fmt, ordered } = prepareRecords(systemStats, timePeriod, locale);
  const mapped = ordered.map((record) => {
    const point: Record<string, unknown> = {
      time: fmt(record.created),
      rawTime: record.created,
      [rootSeriesName]: record.stats.du,
    };
    const efs = record.stats.efs ?? {};
    for (const path of efsPaths) {
      point[path] = efs[path]?.du ?? 0;
    }
    return point;
  });
  return padTimeGrid(mapped, timePeriod, locale);
};

export const useDockerChartData = (
  containerStats: BeszelContainerStatsRecord[] | undefined,
  containerNames: string[],
  metric: "cpu" | "memory" | "network",
  timePeriod: BeszelTimePeriod = "1h",
  locale = "en-US",
) =>
  useMemo(() => {
    if (!containerStats?.length) return [];
    const extract = defaultContainerExtractors[metric];
    if (!extract) return [];
    const { fmt, ordered } = prepareRecords(containerStats, timePeriod, locale);
    const mapped = ordered.map((record) => {
      const point: Record<string, unknown> = { time: fmt(record.created), rawTime: record.created };
      const byName = new Map(record.stats.map((c) => [c.n, c]));
      for (const name of containerNames) {
        point[name] = extract(byName.get(name));
      }
      return point;
    });
    return padTimeGrid(mapped, timePeriod, locale);
  }, [containerStats, containerNames, metric, timePeriod, locale]);
