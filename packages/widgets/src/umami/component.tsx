"use client";

import { BarChart, LineChart } from "@mantine/charts";
import { Box, Group, ScrollArea, Stack, Text, useMantineColorScheme } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { useScopedI18n } from "@homarr/translation/client";

import type { UmamiEventSeries, UmamiMetricItem, UmamiVisitorStats } from "@homarr/integrations/types";

import type { WidgetComponentProps } from "../definition";
import { NoIntegrationDataError } from "../errors/no-data-integration";

export default function UmamiWidget({ options, integrationIds }: WidgetComponentProps<"umami">) {
  if (integrationIds.length === 0) {
    throw new NoIntegrationDataError();
  }

  if (!options.websiteId || options.websiteId.trim() === "") {
    return <NoWebsiteConfigured />;
  }

  return (
    <UmamiContent
      integrationIds={integrationIds}
      websiteId={options.websiteId}
      timeFrame={options.timeFrame}
      eventName={options.eventName || undefined}
      eventNames={options.eventNames}
      chartStyle={options.chartStyle}
      chartType={options.chartType}
      viewMode={options.viewMode}
      topCount={options.topCount}
    />
  );
}

function NoWebsiteConfigured() {
  const t = useScopedI18n("widget.umami");
  return (
    <Stack align="center" justify="center" h="100%">
      <Text c="dimmed" size="sm">
        {t("error.noWebsite")}
      </Text>
    </Stack>
  );
}

function formatXLabel(timestamp: string, timeFrame: string): string {
  const date = new Date(timestamp);
  switch (timeFrame) {
    case "today":
    case "24h":
      return `${date.getUTCHours().toString().padStart(2, "0")}:00`;
    case "7d":
    case "30d":
    case "month":
    case "lastMonth":
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
    default:
      return timestamp;
  }
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

function formatTimeFrameLabel(timeFrame: string): string {
  switch (timeFrame) {
    case "today":     return "Today";
    case "24h":       return "24h";
    case "7d":        return "7d";
    case "30d":       return "30d";
    case "month":     return new Date().toLocaleString("en-US", { month: "short", timeZone: "UTC" });
    case "lastMonth": {
      const d = new Date();
      d.setUTCMonth(d.getUTCMonth() - 1);
      return d.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
    }
    default: return timeFrame;
  }
}

interface UmamiContentProps {
  integrationIds: string[];
  websiteId: string;
  timeFrame: string;
  eventName?: string;
  eventNames: string[];
  chartStyle: string;
  chartType: string;
  viewMode: string;
  topCount: number;
}

function UmamiContent({ integrationIds, websiteId, timeFrame, eventName, eventNames, chartStyle, chartType, viewMode, topCount }: UmamiContentProps) {
  const t = useScopedI18n("widget.umami");
  const { colorScheme } = useMantineColorScheme();
  const tickColor = colorScheme === "dark" ? "#c1c2c5" : "#495057";

  const [results] = clientApi.widget.umami.getVisitorStats.useSuspenseQuery({
    integrationIds,
    websiteId,
    timeFrame,
    eventName,
  });

  const { data: activeVisitors } = clientApi.widget.umami.getActiveVisitors.useQuery(
    { integrationIds, websiteId },
    { refetchInterval: 30_000 },
  );

  const firstResult = results[0];
  if (!firstResult) {
    return (
      <Stack align="center" justify="center" h="100%">
        <Text c="dimmed" size="sm">
          {t("error.noData")}
        </Text>
      </Stack>
    );
  }

  const { visitorStats } = firstResult;

  const chartData = visitorStats.dataPoints.map((point: UmamiVisitorStats["dataPoints"][number]) => ({
    label: formatXLabel(point.timestamp, timeFrame),
    visitors: point.visitors,
    ...(point.events !== undefined ? { events: point.events } : {}),
  }));

  const hasEventSeries = visitorStats.dataPoints.some((p) => p.events !== undefined);
  const series = [
    { name: "visitors", color: "blue.5" },
    ...(hasEventSeries ? [{ name: "events", color: "orange.5" }] : []),
  ];

  const isOverlay = chartStyle === "overlay" && hasEventSeries;
  const overlayBarSize = 16;

  return (
    <Stack gap={4} p="xs" h="100%">
      <Group justify="space-between" align="baseline" wrap="nowrap">
        <Text size="xs" c="dimmed" truncate="end" style={{ maxWidth: "55%" }}>
          {visitorStats.domain} ({formatTimeFrameLabel(timeFrame)})
        </Text>
        {eventName && visitorStats.eventCount !== undefined ? (
          <Group gap={6} align="baseline" wrap="nowrap">
            <Group gap={4} align="baseline">
              <Text size="lg" fw={700} lh={1}>
                {visitorStats.eventCount.toLocaleString()}
              </Text>
              <Text size="xs" c="dimmed">
                {t("event.label")}
              </Text>
            </Group>
            <Text size="xs" c="dimmed">/</Text>
            <Group gap={4} align="baseline">
              <Text size="lg" fw={700} lh={1}>
                {visitorStats.totalVisitors.toLocaleString()}
              </Text>
              <Text size="xs" c="dimmed">
                {t("visitors")}
              </Text>
            </Group>
          </Group>
        ) : (
          <Group gap={4} align="baseline">
            <Text size="xl" fw={700} lh={1}>
              {visitorStats.totalVisitors.toLocaleString()}
            </Text>
            <Text size="xs" c="dimmed">
              {t("visitors")}
            </Text>
          </Group>
        )}
      </Group>
      <Group wrap="wrap" style={{ columnGap: 12, rowGap: 4 }}>
        {activeVisitors !== undefined && (
          <Text size="xs" c="green">
            ● {activeVisitors.toLocaleString()} {t("active")}
          </Text>
        )}
        <Text size="xs" c="dimmed">
          {visitorStats.totalPageviews.toLocaleString()} {t("pageviews")}
        </Text>
        <Text size="xs" c="dimmed">
          {visitorStats.totalVisits.toLocaleString()} {t("visits")}
        </Text>
        <Text size="xs" c="dimmed">
          {visitorStats.bounceRate}% {t("bounceRate")}
        </Text>
        <Text size="xs" c="dimmed">
          {formatDuration(visitorStats.avgDuration)} {t("avgDuration")}
        </Text>
      </Group>
      <Box mt={4} style={{ flex: 1, minHeight: 0 }}>
        {viewMode === "events" ? (
          <UmamiEventsContent
            integrationIds={integrationIds}
            websiteId={websiteId}
            timeFrame={timeFrame}
            eventNames={eventNames}
            chartType={chartType}
          />
        ) : viewMode === "topPages" ? (
          <UmamiTopPagesContent
            integrationIds={integrationIds}
            websiteId={websiteId}
            timeFrame={timeFrame}
            limit={topCount}
          />
        ) : viewMode === "topReferrers" ? (
          <UmamiTopReferrersContent
            integrationIds={integrationIds}
            websiteId={websiteId}
            timeFrame={timeFrame}
            limit={topCount}
          />
        ) : chartType === "sparkline" ? (
          <LineChart
            h="100%"
            data={chartData}
            dataKey="label"
            series={series}
            withDots={false}
            curveType="monotone"
            tickLine="none"
            gridAxis="none"
            withLegend={false}
            withTooltip
            withXAxis
            withYAxis={false}
            xAxisProps={{
              tick: { fontSize: 9, fill: tickColor },
              interval: "preserveStartEnd",
            }}
          />
        ) : (
          <BarChart
            h="100%"
            data={chartData}
            dataKey="label"
            series={series}
            tickLine="none"
            gridAxis="none"
            withLegend={false}
            withTooltip
            withXAxis
            withYAxis={false}
            barProps={isOverlay ? { barSize: overlayBarSize, radius: 2 } : { radius: 2 }}
            barChartProps={isOverlay ? { barGap: -overlayBarSize } : undefined}
            xAxisProps={{
              tick: { fontSize: 9, fill: tickColor },
              interval: "preserveStartEnd",
            }}
          />
        )}
      </Box>
    </Stack>
  );
}

const EVENT_COLORS = ["blue.5", "orange.5", "green.5", "red.5", "violet.5", "teal.5", "yellow.5", "pink.5"];

interface UmamiEventsContentProps {
  integrationIds: string[];
  websiteId: string;
  timeFrame: string;
  eventNames: string[];
  chartType: string;
}

function UmamiEventsContent({ integrationIds, websiteId, timeFrame, eventNames, chartType }: UmamiEventsContentProps) {
  const t = useScopedI18n("widget.umami");
  const { colorScheme } = useMantineColorScheme();
  const tickColor = colorScheme === "dark" ? "#c1c2c5" : "#495057";

  const [series] = clientApi.widget.umami.getMultiEventTimeSeries.useSuspenseQuery({
    integrationIds,
    websiteId,
    timeFrame,
    eventNames: [...eventNames].sort(),
  });

  if (eventNames.length === 0) {
    return (
      <Stack align="center" justify="center" h="100%">
        <Text c="dimmed" size="sm">
          {t("events.selectPrompt")}
        </Text>
      </Stack>
    );
  }

  // Collect all unique timestamps across all series
  const allTimestamps = Array.from(
    new Set(series.flatMap((s) => s.dataPoints.map((p) => p.x))),
  ).sort();

  // Build per-event lookup by timestamp string
  const byEvent = new Map(
    series.map((s: UmamiEventSeries) => [s.eventName, new Map(s.dataPoints.map((p) => [p.x, p.y]))]),
  );

  const chartData = allTimestamps.map((ts) => {
    const row: Record<string, string | number> = { label: formatXLabel(ts, timeFrame) };
    for (const s of series) {
      row[s.eventName] = byEvent.get(s.eventName)?.get(ts) ?? 0;
    }
    return row;
  });

  const chartSeries = series.map((s: UmamiEventSeries, i: number) => ({
    name: s.eventName,
    color: EVENT_COLORS[i % EVENT_COLORS.length] ?? "blue.5",
  }));

  return (
    <Stack gap={4} h="100%">
      {chartSeries.length > 1 && (
        <Group gap={12} justify="center" wrap="wrap" style={{ flexShrink: 0, rowGap: 2 }}>
          {chartSeries.map((s) => (
            <Group key={s.name} gap={4} align="center" wrap="nowrap">
              <Box
                w={8}
                h={8}
                style={{
                  borderRadius: "50%",
                  backgroundColor: `var(--mantine-color-${s.color.replace(".", "-")})`,
                  flexShrink: 0,
                }}
              />
              <Text size="xs" c="dimmed" truncate>
                {s.name}
              </Text>
            </Group>
          ))}
        </Group>
      )}
      <Box style={{ flex: 1, minHeight: 0 }}>
        {chartType === "sparkline" ? (
          <LineChart
            h="100%"
            data={chartData}
            dataKey="label"
            series={chartSeries}
            withDots={false}
            curveType="monotone"
            tickLine="none"
            gridAxis="none"
            withLegend={false}
            withTooltip
            withXAxis
            withYAxis={false}
            xAxisProps={{
              tick: { fontSize: 9, fill: tickColor },
              interval: "preserveStartEnd",
            }}
          />
        ) : (
          <BarChart
            h="100%"
            data={chartData}
            dataKey="label"
            series={chartSeries}
            tickLine="none"
            gridAxis="none"
            withLegend={false}
            withTooltip
            withXAxis
            withYAxis={false}
            barProps={{ radius: 2 }}
            xAxisProps={{
              tick: { fontSize: 9, fill: tickColor },
              interval: "preserveStartEnd",
            }}
          />
        )}
      </Box>
    </Stack>
  );
}

interface UmamiTopListProps {
  integrationIds: string[];
  websiteId: string;
  timeFrame: string;
  limit: number;
}

function UmamiTopPagesContent({ integrationIds, websiteId, timeFrame, limit }: UmamiTopListProps) {
  const t = useScopedI18n("widget.umami");
  const [data] = clientApi.widget.umami.getTopPages.useSuspenseQuery({
    integrationIds,
    websiteId,
    timeFrame,
    limit,
  });
  return <UmamiTopList items={data} heading={t("option.viewMode.option.topPages")} emptyLabel={t("topPages.direct")} />;
}

function UmamiTopReferrersContent({ integrationIds, websiteId, timeFrame, limit }: UmamiTopListProps) {
  const t = useScopedI18n("widget.umami");
  const [data] = clientApi.widget.umami.getTopReferrers.useSuspenseQuery({
    integrationIds,
    websiteId,
    timeFrame,
    limit,
  });
  return <UmamiTopList items={data} heading={t("option.viewMode.option.topReferrers")} emptyLabel={t("topReferrers.direct")} />;
}

function UmamiTopList({ items, heading, emptyLabel }: { items: UmamiMetricItem[]; heading: string; emptyLabel: string }) {
  return (
    <Stack gap={2} h="100%">
      <Text size="xs" c="dimmed" fw={500}>
        {heading}
      </Text>
      <ScrollArea style={{ flex: 1 }} scrollbars="y">
        <Stack gap={2}>
          {items.map((item, i) => (
            <Group key={item.x} gap="xs" wrap="nowrap" px={2}>
              <Text size="xs" c="dimmed" w={18} ta="right" flex="0 0 auto">
                {i + 1}.
              </Text>
              <Text size="xs" truncate="end" style={{ flex: 1 }}>
                {item.x || emptyLabel}
              </Text>
              <Text size="xs" fw={600} flex="0 0 auto">
                {item.y.toLocaleString()}
              </Text>
            </Group>
          ))}
        </Stack>
      </ScrollArea>
    </Stack>
  );
}
