"use client";

import { memo, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Box, Group, Stack, Text } from "@mantine/core";
import type { AreaChartProps } from "@mantine/charts";
import { AreaChart } from "@mantine/charts";
import { useInViewport } from "@mantine/hooks";
import dayjs from "dayjs";

import type { BeszelTimePeriod } from "@homarr/definitions/beszel";
import { defaultBeszelTimePeriod } from "@homarr/definitions/beszel";
import type { BeszelContainerStatsRecord, BeszelGPUData, BeszelSystemStatsRecord } from "@homarr/integrations/types";

import { formatLocalizedDate } from "../../common/locale";
import { WidgetQueryLoadingState } from "../../common/query-state-indicator";
import { containerChartColor } from "./colors";
import classes from "./chart.module.css";

export type { BeszelTimePeriod } from "@homarr/definitions/beszel";

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

interface BeszelChartRecords<T> {
  points: { time: string; rawTime: string; record?: T }[];
  hasRecords: boolean;
}

export function prepareChartRecords<T extends { created: string }>(
  records: T[] | undefined,
  timePeriod: BeszelTimePeriod,
  locale: string,
): BeszelChartRecords<T> | undefined {
  if (!records) return undefined;
  let ordered = records;
  if (timePeriod !== "1m") ordered = records.toReversed();
  const mapped = ordered.map((record) => ({
    time: formatBeszelChartTimestamp(record.created, timePeriod, locale),
    rawTime: record.created,
    record,
  }));
  return {
    points: padTimeGrid(mapped, timePeriod, locale) as BeszelChartRecords<T>["points"],
    hasRecords: records.length > 0,
  };
}

export const useChartRecords = <T extends { created: string }>(
  records: T[] | undefined,
  timePeriod: BeszelTimePeriod,
  locale: string,
) => useMemo(() => prepareChartRecords(records, timePeriod, locale), [records, timePeriod, locale]);

function mapChartRecords<T>(
  records: BeszelChartRecords<T> | undefined,
  mapFn: (record: T) => Record<string, unknown>,
): Record<string, unknown>[] {
  if (!records) return [];
  return records.points.map(({ time, rawTime, record }) => {
    if (!record) return { time, rawTime };
    return { time, rawTime, ...mapFn(record) };
  });
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

const yAxisBase = {
  tickMargin: 0,
  tick: { fontSize: 12, fill: "var(--beszel-chart-muted)" },
} as const;
const chartStyle = {
  minWidth: 0,
  minHeight: 1,
  flexGrow: 1,
  flexShrink: 0,
  // Recharts measures pixels; keep points, axes and tooltips readable on a scaled board.
  zoom: "var(--board-canvas-inverse-scale, 1)",
} as const;
const panelStyle = { minWidth: 0 } as const;
const chartContainerStyle = {
  minWidth: 0,
  minHeight: 1,
  display: "flex",
  flexDirection: "column",
  flexGrow: 1,
  flexShrink: 0,
} as const;
const chartMargin = { top: 12, right: 5, bottom: 0, left: 0 } as const;
export const CPU_Y_AXIS_DOMAIN: [number, string] = [0, "auto"];

interface BeszelChartPanelProps {
  title: string;
  subtitle?: string;
  chartProps: BeszelAreaChartProps;
}

export const BeszelChartPanel = memo(({ title, subtitle, chartProps }: BeszelChartPanelProps) => {
  const { ref, inViewport } = useInViewport<HTMLDivElement>();
  const [hasBeenVisible, setHasBeenVisible] = useState(false);
  const isVisible = inViewport || typeof IntersectionObserver === "undefined";

  useEffect(() => {
    if (isVisible) setHasBeenVisible(true);
  }, [isVisible]);

  return (
    <Stack gap={4} style={panelStyle}>
      <Group gap="xs" wrap="nowrap">
        <Text size="sm" fw={600} style={{ flexShrink: 0 }}>
          {title}
        </Text>
        {subtitle && (
          <Text size="xs" c="dimmed" truncate style={{ minWidth: 0 }}>
            {subtitle}
          </Text>
        )}
      </Group>
      <Box ref={ref} style={chartContainerStyle}>
        {(inViewport || hasBeenVisible) && <DeferredBeszelChart chartProps={chartProps} isVisible={isVisible} />}
        {!inViewport && !hasBeenVisible && <BeszelChartPlaceholder height={chartProps.h} />}
      </Box>
    </Stack>
  );
});

const BeszelChartPlaceholder = ({ height }: { height: AreaChartProps["h"] }) => (
  <Box h={height} className={classes.chart} style={chartStyle}>
    <WidgetQueryLoadingState />
  </Box>
);

const DeferredBeszelChart = memo(
  ({ chartProps }: { chartProps: BeszelAreaChartProps; isVisible: boolean }) => {
    // Let the dashboard hydrate and handle input before mounting or refreshing SVG charts.
    const deferredChartProps = useDeferredValue(chartProps, null);
    if (!deferredChartProps) {
      return <BeszelChartPlaceholder height={chartProps.h} />;
    }
    return <BeszelAreaChart {...deferredChartProps} />;
  },
  // Retain mounted charts while offscreen; apply the latest data when they re-enter view.
  (previous, next) => !next.isVisible || previous.chartProps === next.chartProps,
);

type BeszelAreaChartProps = Omit<AreaChartProps, "dataKey" | "curveType" | "withDots" | "withYAxis"> & {
  yAxisFormatter: (value: number) => string;
  yAxisDomain?: [number, string];
};

const BeszelAreaChart = memo(
  ({
    yAxisFormatter,
    withXAxis = true,
    yAxisDomain,
    yAxisProps: yAxisPropsOverride,
    xAxisProps: xAxisPropsOverride,
    areaChartProps: areaChartPropsOverride,
    type = "default",
    fillOpacity = 0.4,
    ...props
  }: BeszelAreaChartProps) => {
    const mergedXAxis = useMemo(
      () => ({
        interval: "preserveEnd" as const,
        minTickGap: 50,
        tick: { fontSize: 12, fill: "var(--beszel-chart-muted)" },
        ...xAxisPropsOverride,
      }),
      [xAxisPropsOverride],
    );
    const mergedYAxis = useMemo(() => {
      const base = {
        ...yAxisBase,
        width: "auto" as const,
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
        // Recharts keeps registration order when keyed areas move; reset it when ranks change.
        key={JSON.stringify(props.series.map(({ name }) => name))}
        className={classes.chart}
        dataKey="time"
        curveType="monotone"
        withGradient={false}
        connectNulls={false}
        withDots={false}
        areaProps={({ color }) => ({
          fill: color,
          fillOpacity,
          activeDot: { r: 4, fill: color, stroke: "transparent", strokeWidth: 2 },
        })}
        type={type}
        strokeWidth={1}
        fillOpacity={fillOpacity}
        strokeDasharray="0"
        gridColor="color-mix(in srgb, var(--beszel-chart-border) 50%, transparent)"
        textColor="var(--beszel-chart-muted)"
        withXAxis={withXAxis}
        withYAxis
        w="100%"
        areaChartProps={{ margin: chartMargin, ...areaChartPropsOverride }}
        style={chartStyle}
        xAxisProps={mergedXAxis}
        yAxisProps={mergedYAxis}
        {...props}
      />
    );
  },
);

export const useSystemChartData = (
  records: BeszelChartRecords<BeszelSystemStatsRecord> | undefined,
  mapFn: (stats: BeszelSystemStatsRecord["stats"]) => Record<string, unknown>,
) => useMemo(() => mapChartRecords(records, (record) => mapFn(record.stats)), [records, mapFn]);

export const useContainerNames = (containerStats: BeszelContainerStatsRecord[] | undefined) => {
  const prevRef = useRef<string[]>([]);
  return useMemo(() => {
    if (!containerStats?.length) {
      if (prevRef.current.length === 0) return prevRef.current;
      prevRef.current = [];
      return prevRef.current;
    }
    const names = new Set<string>();
    // Native processes history chronologically; first appearance breaks equal-usage ties.
    for (const record of containerStats.toSorted((a, b) => a.created.localeCompare(b.created))) {
      for (const c of record.stats) {
        names.add(c.n);
      }
    }
    const next = [...names];
    const prev = prevRef.current;
    if (prev.length === next.length && prev.every((n, i) => n === next[i])) return prev;
    prevRef.current = next;
    return next;
  }, [containerStats]);
};

type ContainerExtractor = (container: BeszelContainerStatsRecord["stats"][number] | undefined) => number;

// c = CPU (%), m = memory (MiB), b = bandwidth [sent,recv] (bytes/s), ns/nr = legacy net (MiB/s)
const MEBIBYTE = 1024 * 1024;
const GIBIBYTE = 1024 * MEBIBYTE;

export const normalizeBeszelByteRate = (
  bytesPerSecond: number | undefined,
  legacyMebibytesPerSecond: number | undefined,
): number => bytesPerSecond ?? (legacyMebibytesPerSecond ?? 0) * MEBIBYTE;

const defaultContainerExtractors: Record<"cpu" | "memory" | "network", ContainerExtractor> = {
  cpu: (c) => c?.c ?? 0,
  memory: (c) => c?.m ?? 0,
  network: (c) => normalizeBeszelByteRate(c?.b?.[0], c?.ns) + normalizeBeszelByteRate(c?.b?.[1], c?.nr),
};

export const useContainerSeries = (
  records: BeszelContainerStatsRecord[] | undefined,
  names: string[],
  metric: "cpu" | "memory" | "network",
) =>
  useMemo(() => {
    if (!records) return [];
    const totals = new Map(names.map((name) => [name, 0]));
    const extract = defaultContainerExtractors[metric];
    for (const record of records) {
      for (const container of record.stats) {
        totals.set(container.n, (totals.get(container.n) ?? 0) + extract(container));
      }
    }
    return [...totals]
      .toSorted(([, a], [, b]) => b - a)
      .map(([name], rank) => ({ name, color: containerChartColor(rank, totals.size) }));
  }, [records, names, metric]);

export const useDiskChartData = (
  records: BeszelChartRecords<BeszelSystemStatsRecord> | undefined,
  efsPaths: string[],
  rootSeriesName: string,
) => useMemo(() => mapDiskChartData(records, efsPaths, rootSeriesName), [records, efsPaths, rootSeriesName]);

export const buildDiskChartData = (
  systemStats: BeszelSystemStatsRecord[] | undefined,
  efsPaths: string[],
  rootSeriesName: string,
  timePeriod: BeszelTimePeriod = defaultBeszelTimePeriod,
  locale = "en-US",
) => mapDiskChartData(prepareChartRecords(systemStats, timePeriod, locale), efsPaths, rootSeriesName);

const mapDiskChartData = (
  records: BeszelChartRecords<BeszelSystemStatsRecord> | undefined,
  efsPaths: string[],
  rootSeriesName: string,
) => {
  if (!records?.hasRecords) return [];
  return mapChartRecords(records, (record) => {
    const point: Record<string, unknown> = { [rootSeriesName]: record.stats.du * GIBIBYTE };
    const efs = record.stats.efs ?? {};
    for (const path of efsPaths) point[path] = (efs[path]?.du ?? 0) * GIBIBYTE;
    return point;
  });
};

export const useDiskIOChartData = (
  records: BeszelChartRecords<BeszelSystemStatsRecord> | undefined,
  efsPaths: string[],
  rootReadSeriesName: string,
  rootWriteSeriesName: string,
  readLabel: string,
  writeLabel: string,
) =>
  useMemo(() => {
    if (!records?.hasRecords) return [];
    return mapChartRecords(records, (record) => {
      const point: Record<string, unknown> = {
        [rootReadSeriesName]: normalizeBeszelByteRate(record.stats.dio?.[0], record.stats.dr),
        [rootWriteSeriesName]: normalizeBeszelByteRate(record.stats.dio?.[1], record.stats.dw),
      };
      const efs = record.stats.efs ?? {};
      for (const path of efsPaths) {
        const filesystem = efs[path];
        point[`${path} ${readLabel}`] = normalizeBeszelByteRate(filesystem?.rb, filesystem?.r);
        point[`${path} ${writeLabel}`] = normalizeBeszelByteRate(filesystem?.wb, filesystem?.w);
      }
      return point;
    });
  }, [records, efsPaths, rootReadSeriesName, rootWriteSeriesName, readLabel, writeLabel]);

export const useDockerChartData = (
  records: BeszelChartRecords<BeszelContainerStatsRecord> | undefined,
  containerNames: string[],
  metric: "cpu" | "memory" | "network",
) =>
  useMemo(() => {
    if (!records?.hasRecords) return [];
    const extract = defaultContainerExtractors[metric];
    return mapChartRecords(records, (record) => {
      const point: Record<string, unknown> = {};
      const byName = new Map(record.stats.map((c) => [c.n, c]));
      for (const name of containerNames) {
        const container = byName.get(name);
        point[name] = null;
        if (container) point[name] = extract(container);
      }
      return point;
    });
  }, [records, containerNames, metric]);

export interface BeszelGpuDevice {
  id: string;
  seriesName: string;
}

export type BeszelGpuMetric = "usage" | "memory" | "power";

export const buildGpuDevices = (systemStats: BeszelSystemStatsRecord[] | undefined) => {
  const devices = new Map<string, BeszelGpuDevice>();
  for (const record of systemStats ?? []) {
    for (const [id, gpu] of Object.entries(record.stats.g ?? {})) {
      if (!devices.has(id)) devices.set(id, { id, seriesName: `${gpu.n} (${id})` });
    }
  }
  return [...devices.values()].toSorted((a, b) => a.id.localeCompare(b.id));
};

export const useGpuDevices = (systemStats: BeszelSystemStatsRecord[] | undefined) =>
  useMemo(() => buildGpuDevices(systemStats), [systemStats]);

export const hasGpuMetric = (systemStats: BeszelSystemStatsRecord[] | undefined, metric: BeszelGpuMetric) => {
  if (metric === "usage") return (systemStats ?? []).some((record) => Object.keys(record.stats.g ?? {}).length > 0);

  return (systemStats ?? []).some((record) =>
    Object.values(record.stats.g ?? {}).some((device) => (metric === "memory" ? device.mu : device.p) !== undefined),
  );
};

const gpuExtractors: Record<BeszelGpuMetric, (device: BeszelGPUData | undefined) => number> = {
  usage: (device) => device?.u ?? 0,
  memory: (device) => (device?.mu ?? 0) * 1024 * 1024,
  power: (device) => device?.p ?? 0,
};

export const useGpuChartData = (
  records: BeszelChartRecords<BeszelSystemStatsRecord> | undefined,
  devices: BeszelGpuDevice[],
  metric: BeszelGpuMetric,
) => useMemo(() => mapGpuChartData(records, devices, metric), [records, devices, metric]);

export const buildGpuChartData = (
  systemStats: BeszelSystemStatsRecord[] | undefined,
  devices: BeszelGpuDevice[],
  metric: BeszelGpuMetric,
  timePeriod: BeszelTimePeriod = defaultBeszelTimePeriod,
  locale = "en-US",
) => mapGpuChartData(prepareChartRecords(systemStats, timePeriod, locale), devices, metric);

const mapGpuChartData = (
  records: BeszelChartRecords<BeszelSystemStatsRecord> | undefined,
  devices: BeszelGpuDevice[],
  metric: BeszelGpuMetric,
) => {
  if (!records?.hasRecords) return [];
  const extract = gpuExtractors[metric];
  return mapChartRecords(records, (record) => {
    const point: Record<string, unknown> = {};
    for (const device of devices) point[device.seriesName] = extract(record.stats.g?.[device.id]);
    return point;
  });
};
