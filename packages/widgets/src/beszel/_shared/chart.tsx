"use client";

import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Box, Group, Stack, Text } from "@mantine/core";
import type { AreaChartProps } from "@mantine/charts";
import dynamic from "next/dynamic";
import { useInViewport } from "@mantine/hooks";
import dayjs from "dayjs";

import type { BeszelTimePeriod } from "@homarr/definitions/beszel";
import { defaultBeszelTimePeriod } from "@homarr/definitions/beszel";
import type { BeszelContainerStatsRecord, BeszelGPUData, BeszelSystemStatsRecord } from "@homarr/integrations/types";

import { formatLocalizedDate } from "../../common/locale";
import { useInitialRenderTime } from "@homarr/common";

import { BeszelChartPreview } from "./chart-preview";
import { chartStyle } from "./chart-style";
import type { BeszelAreaChartProps } from "./interactive-chart";
import { WidgetQueryLoadingState } from "../../common/query-state-indicator";
import { containerChartColor } from "./colors";
import classes from "./chart.module.css";

export type { BeszelTimePeriod } from "@homarr/definitions/beszel";

const BeszelAreaChart = dynamic(() => import("./interactive-chart"), {
  ssr: false,
  loading: () => <BeszelChartPlaceholder height={180} />,
});

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

const panelStyle = { minWidth: 0 } as const;
const chartContainerStyle = {
  minWidth: 0,
  minHeight: 1,
  display: "flex",
  flexDirection: "column",
  flexGrow: 1,
  flexShrink: 0,
} as const;
export const CPU_Y_AXIS_DOMAIN: [number, string] = [0, "auto"];

interface BeszelChartPanelProps {
  title: string;
  subtitle?: string;
  chartProps: BeszelAreaChartProps;
}

export const BeszelChartPanel = memo(({ title, subtitle, chartProps }: BeszelChartPanelProps) => {
  const { ref, inViewport } = useInViewport<HTMLDivElement>();
  const [hasBeenVisible, setHasBeenVisible] = useState(false);
  const [chartReady, setChartReady] = useState(false);
  const onReady = useCallback(() => setChartReady(true), []);
  const prepared = useInitialRenderTime() !== undefined;
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
      <Box ref={ref} style={{ ...chartContainerStyle, position: "relative" }}>
        {prepared && !chartReady && (
          <Box h={chartProps.h} className={classes.chart} style={chartStyle}>
            <BeszelChartPreview title={title} {...chartProps} />
          </Box>
        )}
        {(inViewport || hasBeenVisible) && (
          <div
            className={classes.interactiveChart}
            data-ready={!prepared || chartReady}
            inert={prepared && !chartReady}
          >
            <DeferredBeszelChart chartProps={chartProps} isVisible={isVisible} onReady={onReady} />
          </div>
        )}
        {!prepared && !inViewport && !hasBeenVisible && <BeszelChartPlaceholder height={chartProps.h} />}
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
  ({ chartProps, onReady }: { chartProps: BeszelAreaChartProps; isVisible: boolean; onReady: () => void }) => {
    // Show the first visible chart immediately; defer subsequent data updates.
    const deferredChartProps = useDeferredValue(chartProps);
    return <BeszelAreaChart {...deferredChartProps} onReady={onReady} />;
  },
  // Retain mounted charts while offscreen; apply the latest data when they re-enter view.
  (previous, next) => !next.isVisible || previous.chartProps === next.chartProps,
);

export const useSystemChartData = (
  systemStats: BeszelSystemStatsRecord[] | undefined,
  mapFn: (stats: BeszelSystemStatsRecord["stats"]) => Record<string, unknown>,
  timePeriod: BeszelTimePeriod = defaultBeszelTimePeriod,
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
    const totals = new Map(names.map((name) => [name, 0]));
    const extract = defaultContainerExtractors[metric];
    for (const record of records ?? []) {
      for (const container of record.stats) {
        totals.set(container.n, (totals.get(container.n) ?? 0) + extract(container));
      }
    }
    return [...totals]
      .toSorted(([, a], [, b]) => b - a)
      .map(([name], rank) => ({ name, color: containerChartColor(rank, totals.size) }));
  }, [records, names, metric]);

export const useDiskChartData = (
  systemStats: BeszelSystemStatsRecord[] | undefined,
  efsPaths: string[],
  rootSeriesName: string,
  timePeriod: BeszelTimePeriod = defaultBeszelTimePeriod,
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
  timePeriod: BeszelTimePeriod = defaultBeszelTimePeriod,
  locale = "en-US",
) => {
  if (!systemStats?.length) return [];
  const { fmt, ordered } = prepareRecords(systemStats, timePeriod, locale);
  const mapped = ordered.map((record) => {
    const point: Record<string, unknown> = {
      time: fmt(record.created),
      rawTime: record.created,
      [rootSeriesName]: record.stats.du * GIBIBYTE,
    };
    const efs = record.stats.efs ?? {};
    for (const path of efsPaths) {
      point[path] = (efs[path]?.du ?? 0) * GIBIBYTE;
    }
    return point;
  });
  return padTimeGrid(mapped, timePeriod, locale);
};

export const useDiskIOChartData = (
  systemStats: BeszelSystemStatsRecord[] | undefined,
  efsPaths: string[],
  rootReadSeriesName: string,
  rootWriteSeriesName: string,
  readLabel: string,
  writeLabel: string,
  timePeriod: BeszelTimePeriod = defaultBeszelTimePeriod,
  locale = "en-US",
) =>
  useMemo(() => {
    if (!systemStats?.length) return [];
    const { fmt, ordered } = prepareRecords(systemStats, timePeriod, locale);
    const mapped = ordered.map((record) => {
      const point: Record<string, unknown> = {
        time: fmt(record.created),
        rawTime: record.created,
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
    return padTimeGrid(mapped, timePeriod, locale);
  }, [systemStats, efsPaths, rootReadSeriesName, rootWriteSeriesName, readLabel, writeLabel, timePeriod, locale]);

export const useDockerChartData = (
  containerStats: BeszelContainerStatsRecord[] | undefined,
  containerNames: string[],
  metric: "cpu" | "memory" | "network",
  timePeriod: BeszelTimePeriod = defaultBeszelTimePeriod,
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
        const container = byName.get(name);
        point[name] = null;
        if (container) point[name] = extract(container);
      }
      return point;
    });
    return padTimeGrid(mapped, timePeriod, locale);
  }, [containerStats, containerNames, metric, timePeriod, locale]);

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
  systemStats: BeszelSystemStatsRecord[] | undefined,
  devices: BeszelGpuDevice[],
  metric: BeszelGpuMetric,
  timePeriod: BeszelTimePeriod = defaultBeszelTimePeriod,
  locale = "en-US",
) =>
  useMemo(
    () => buildGpuChartData(systemStats, devices, metric, timePeriod, locale),
    [systemStats, devices, metric, timePeriod, locale],
  );

export const buildGpuChartData = (
  systemStats: BeszelSystemStatsRecord[] | undefined,
  devices: BeszelGpuDevice[],
  metric: BeszelGpuMetric,
  timePeriod: BeszelTimePeriod = defaultBeszelTimePeriod,
  locale = "en-US",
) => {
  if (!systemStats?.length) return [];
  const extract = gpuExtractors[metric];
  const { fmt, ordered } = prepareRecords(systemStats, timePeriod, locale);
  const mapped = ordered.map((record) => {
    const point: Record<string, unknown> = { time: fmt(record.created), rawTime: record.created };
    for (const device of devices) {
      point[device.seriesName] = extract(record.stats.g?.[device.id]);
    }
    return point;
  });
  return padTimeGrid(mapped, timePeriod, locale);
};
