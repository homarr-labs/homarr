"use client";

import { useMemo } from "react";
import { Box, ColorSwatch, Group, Stack, Text } from "@mantine/core";
import { IconArrowsDownUp, IconBolt, IconChartLine, IconGauge, IconTemperature } from "@tabler/icons-react";
import { useHover } from "@mantine/hooks";
import { getQueryKey } from "@trpc/react-query";

import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";
import type { TablerIcon } from "@homarr/ui";

import type { WidgetComponentProps } from "../definition";
import { WidgetEmptyState } from "../common/empty-state";
import { useDemoReadOnly } from "../demo-read-only";
import { getWidgetRefreshInterval } from "../refresh-interval";
import { useWidgetRuntimeQueries } from "../runtime-hooks";
import { HistoryGraph } from "../common/history-graph";
import type { HistoryGraphLine } from "../common/history-graph";
import { ChartLayout } from "../system-resources/chart-layout";
import { CommonChart } from "../system-resources/chart/common-chart";
import { getEntrySeriesKey, metricGraphEntriesSchema, metricGraphTimeRanges } from "./config";
import type { MetricGraphEntry, MetricGraphTimeRange } from "./config";
import {
  alignToGrid,
  fillEdges,
  formatMetricValue,
  getMedian,
  getScaleKey,
  getSeriesDomain,
  isPercentUnit,
} from "./format";
import type { MetricSeries } from "./format";

const SAMPLES = 60;

interface QueryGroup {
  integrationId: string;
  source: MetricGraphEntry["source"];
  keys: string[];
}

interface ResolvedEntry {
  entry: MetricGraphEntry;
  series: MetricSeries | undefined;
  failed: boolean;
}

const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" });

const getIcon = (unit: string | null): TablerIcon => {
  if (isPercentUnit(unit)) return IconGauge;
  if (unit === "bytesPerSecond") return IconArrowsDownUp;
  if (unit === "celsius" || unit === "°C" || unit === "°F") return IconTemperature;
  if (unit === "watts" || unit === "W" || unit === "kW" || unit === "kWh") return IconBolt;
  return IconChartLine;
};

export default function MetricGraphWidget({
  options,
  integrationIds,
  widgetRuntimeRef,
  displayMode,
}: WidgetComponentProps<"metricGraph">) {
  const t = useI18n("widget.metricGraph");
  const demoReadOnly = useDemoReadOnly();
  const advanced = displayMode === "advanced";
  const refreshInterval = getWidgetRefreshInterval(options, 30);
  const minutes = metricGraphTimeRanges[options.timeRange as MetricGraphTimeRange] ?? 60;
  // Values of an integration that was unlinked from the widget are neither shown nor polled.
  const entries = useMemo(
    () =>
      (metricGraphEntriesSchema.safeParse(options.entries).data ?? []).filter((entry) =>
        integrationIds.includes(entry.integrationId),
      ),
    [options.entries, integrationIds],
  );

  // One request per integration and source, never per value.
  const groups = useMemo(() => {
    const byKey = new Map<string, QueryGroup>();
    for (const entry of entries) {
      const groupKey = `${entry.integrationId}\u0000${entry.source}`;
      const group = byKey.get(groupKey) ?? { integrationId: entry.integrationId, source: entry.source, keys: [] };
      const seriesKey = getEntrySeriesKey(entry);
      if (!group.keys.includes(seriesKey)) group.keys.push(seriesKey);
      byKey.set(groupKey, group);
    }
    return [...byKey.values()];
  }, [entries]);

  const queryOptions = {
    refetchInterval: demoReadOnly ? (false as const) : refreshInterval * 1000,
    refetchIntervalInBackground: false,
    retry: false,
  };
  const statsGroups = groups.filter((group) => group.source === "stats");
  const smartHomeGroups = groups.filter((group) => group.source === "smartHome");
  const statsInputs = statsGroups.map((group) => ({
    integrationId: group.integrationId,
    metrics: group.keys,
    minutes,
    samples: SAMPLES,
    refreshInterval,
  }));
  const smartHomeInputs = smartHomeGroups.map((group) => ({
    integrationId: group.integrationId,
    entityIds: group.keys,
    minutes,
    samples: SAMPLES,
  }));
  const statsResults = clientApi.useQueries((api) =>
    statsInputs.map((input) => api.widget.metricGraph.statsSeries(input, queryOptions)),
  );
  const smartHomeResults = clientApi.useQueries((api) =>
    smartHomeInputs.map((input) => api.widget.metricGraph.smartHomeSeries(input, queryOptions)),
  );

  const queryKeys = useMemo(
    () => [
      ...statsInputs.map((input) => getQueryKey(clientApi.widget.metricGraph.statsSeries, input, "query")),
      ...smartHomeInputs.map((input) => getQueryKey(clientApi.widget.metricGraph.smartHomeSeries, input, "query")),
    ],
    // The inputs are derived from these values only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [groups, minutes, refreshInterval],
  );
  useWidgetRuntimeQueries(widgetRuntimeRef, queryKeys);

  if (entries.length === 0) return <WidgetEmptyState message={t("empty")} />;

  const resolved: ResolvedEntry[] = entries.map((entry) => {
    const sourceGroups = entry.source === "stats" ? statsGroups : smartHomeGroups;
    const sourceResults: { data?: { series: MetricSeries[] }; isError: boolean }[] =
      entry.source === "stats" ? statsResults : smartHomeResults;
    const result = sourceResults[sourceGroups.findIndex((group) => group.integrationId === entry.integrationId)];
    const seriesKey = getEntrySeriesKey(entry);
    const series = result?.data?.series.find((item) => item.key === seriesKey);
    return { entry, series, failed: result?.isError === true };
  });

  const labelDisplayMode = options.labelDisplayMode;
  const chartType = options.hasShadow ? "area" : "line";

  if (options.layout === "combined") {
    return (
      <Box h="100%">
        <CombinedGraph
          items={resolved}
          minutes={minutes}
          labelDisplayMode={labelDisplayMode}
          chartType={chartType}
          advanced={advanced}
          fallbackLabel={t("unavailable")}
          medianLabel={(value) => t("median", { value })}
        />
      </Box>
    );
  }

  // A single value fills the widget directly instead of sitting in a card inside the widget card.
  const single = resolved.length === 1;
  return (
    <Box h="100%" p={single ? 0 : "xs"}>
      <ChartLayout layout={options.cardLayout} minimumColumnWidth={140} gap="xs">
        {resolved.map((item) => (
          <MetricCard
            key={item.entry.id}
            item={item}
            labelDisplayMode={labelDisplayMode}
            chartType={chartType}
            advanced={advanced}
            fallbackLabel={t("unavailable")}
            medianLabel={(value) => t("median", { value })}
            plain={single}
          />
        ))}
      </ChartLayout>
    </Box>
  );
}

type LabelDisplayMode = WidgetComponentProps<"metricGraph">["options"]["labelDisplayMode"];

interface ChartProps {
  labelDisplayMode: LabelDisplayMode;
  chartType: "area" | "line";
  advanced: boolean;
  fallbackLabel: string;
  medianLabel: (value: string) => string;
}

const getTitle = ({ entry, series }: ResolvedEntry, fallbackLabel: string) =>
  entry.label || series?.name || (series ? getEntrySeriesKey(entry) : fallbackLabel);

/**
 * The value shown as current. A smart home sensor reports its own (null while it is unavailable, which stays null);
 * a statistics value falls back to the last recorded one until its source answers again.
 */
const getCurrent = ({ entry, series }: Pick<ResolvedEntry, "entry" | "series">) => {
  if (!series) return null;
  if (entry.source === "smartHome") return series.current;
  return series.current ?? series.points.findLast((point) => point.value !== null)?.value ?? null;
};

const MetricCard = ({
  item,
  labelDisplayMode,
  chartType,
  advanced,
  fallbackLabel,
  medianLabel,
  plain,
}: ChartProps & { item: ResolvedEntry; plain: boolean }) => {
  const { entry, series } = item;
  const points = series?.points ?? [];
  // Where each point sits by its time: a native history plus a live value at "now" is not evenly spaced.
  const first = points[0]?.time ?? 0;
  const span = (points.at(-1)?.time ?? first) - first;
  const positions = span > 0 ? points.map((point) => (point.time - first) / span) : undefined;
  const unit = series?.unit ?? null;
  const values = points.map((point) => point.value);
  const domain = getSeriesDomain(
    values.filter((value): value is number => value !== null),
    unit,
  );
  const median = getMedian(values);
  let lastValue = formatMetricValue(getCurrent(item), unit);
  if (median !== null) lastValue += ` (${medianLabel(formatMetricValue(median, unit))})`;
  if (item.failed && !series) lastValue = fallbackLabel;

  return (
    <CommonChart
      // A sensor that is unavailable now ends its line there instead of repeating the last cached value.
      data={fillEdges(values, 2, { fillEnd: getCurrent(item) !== null }).map((value) => ({ value }))}
      positions={positions}
      series={[{ name: "value", color: `${entry.color}.5` }]}
      title={getTitle(item, fallbackLabel)}
      icon={getIcon(unit)}
      labelDisplayMode={labelDisplayMode}
      lastValue={lastValue}
      // Without a history to draw (it failed, or only the live value is known), the current value still shows.
      showValueWithoutHistory
      yDomain={domain}
      chartType={chartType}
      advanced={advanced}
      plain={plain}
      tooltipLabel={(index) => {
        const point = points[index];
        if (!point) return lastValue;
        return `${timeFormatter.format(point.time)} · ${formatMetricValue(point.value, unit)}`;
      }}
    />
  );
};

/**
 * All values in one graph (see `HistoryGraph`): values with the same unit share one scale, so 260 W and 60 W keep
 * their proportions; different units get their own range. The legend shows each value and its median; while the
 * pointer is over the graph, the graph's own readout shows the values at that point instead.
 */
const CombinedGraph = ({
  items,
  minutes,
  labelDisplayMode,
  chartType,
  fallbackLabel,
  medianLabel,
}: ChartProps & { items: ResolvedEntry[]; minutes: number }) => {
  const { hovered, ref: hoverRef } = useHover();
  const end = Math.max(Date.now(), ...items.flatMap(({ series }) => series?.points.map((point) => point.time) ?? []));
  const start = end - minutes * 60_000;
  const step = (end - start) / (SAMPLES - 1);
  const grid = Array.from({ length: SAMPLES }, (_, index) => Math.round(start + step * index));

  const aligned = items.map((item) => ({
    item,
    unit: item.series?.unit ?? null,
    raw: alignToGrid(item.series?.points ?? [], grid),
  }));
  const valuesByScale = new Map<string, number[]>();
  for (const { unit, raw } of aligned) {
    const values = valuesByScale.get(getScaleKey(unit)) ?? [];
    values.push(...raw.filter((value): value is number => value !== null));
    valuesByScale.set(getScaleKey(unit), values);
  }
  const lines = aligned.map(
    ({ item, unit, raw }): HistoryGraphLine => ({
      id: item.entry.id,
      // Gaps stay empty, so the readout shows "—" where nothing was recorded; the graph bridges them when drawing.
      values: raw,
      times: grid,
      color: `var(--mantine-color-${item.entry.color}-5)`,
      unit,
      // The widget's own scale per unit, so percentages keep their 0 to 100 range.
      domain: getSeriesDomain(valuesByScale.get(getScaleKey(unit)) ?? [], unit),
    }),
  );
  const hasData = aligned.some((line) => line.raw.some((value) => value !== null));

  const legendLines = aligned.map((line) => ({
    id: line.item.entry.id,
    color: line.item.entry.color,
    title: getTitle(line.item, fallbackLabel),
    current: getCurrent(line.item),
    median: getMedian(line.raw),
    unit: line.unit,
    raw: line.raw,
  }));
  // "Show only icon" keeps the colored dots and values but drops the names.
  const showNames = labelDisplayMode === "text" || labelDisplayMode === "textWithIcon";

  return (
    <Box ref={hoverRef} pos="relative" h="100%">
      {hasData ? (
        <HistoryGraph
          lines={lines}
          // Names the graph for screen readers by the metrics it shows.
          label={legendLines.map((line) => line.title).join(", ")}
          variant={chartType}
          connectNulls
          formatValue={(line, value) => formatMetricValue(value, line.unit ?? null)}
          formatTime={(time) => timeFormatter.format(time)}
        />
      ) : null}
      {/* Hovering swaps the legend for the graph's own readout; without a graph the legend stays. */}
      {labelDisplayMode !== "hidden" && !(hovered && hasData) && (
        <Stack
          pos="absolute"
          top={0}
          left={0}
          right={0}
          p={8}
          pt={6}
          gap={2}
          style={{ zIndex: 2, pointerEvents: "none" }}
        >
          <LegendRows lines={legendLines} index={null} showNames={showNames} medianLabel={medianLabel} />
        </Stack>
      )}
    </Box>
  );
};

interface LegendLine {
  id: string;
  color: MetricGraphEntry["color"];
  title: string;
  current: number | null;
  median: number | null;
  unit: string | null;
  raw: (number | null)[];
}

/** One compact row per value: color, truncated name, then the value right after it. */
const LegendRows = ({
  lines,
  index,
  showNames,
  medianLabel,
}: {
  lines: LegendLine[];
  index: number | null;
  showNames: boolean;
  /** Shown next to the latest value; omitted for a hovered point. */
  medianLabel?: (value: string) => string;
}) =>
  lines.map((line) => (
    // Values come first so a narrow widget truncates the name, never the numbers.
    <Group key={line.id} gap={6} wrap="nowrap" miw={0}>
      <ColorSwatch
        color={`var(--mantine-color-${line.color}-5)`}
        size={8}
        withShadow={false}
        style={{ flex: "none" }}
      />
      <Text size="xs" fw={600} style={{ flex: "none", whiteSpace: "nowrap" }}>
        {formatMetricValue(index === null ? line.current : line.raw[index], line.unit)}
      </Text>
      {index === null && medianLabel && line.median !== null && (
        <Text size="xs" c="dimmed" style={{ flex: "none", whiteSpace: "nowrap" }}>
          ({medianLabel(formatMetricValue(line.median, line.unit))})
        </Text>
      )}
      {showNames && (
        <Text size="xs" c="dimmed" truncate="end" miw={0} style={{ flex: "1 1 0" }}>
          {line.title}
        </Text>
      )}
    </Group>
  ));
