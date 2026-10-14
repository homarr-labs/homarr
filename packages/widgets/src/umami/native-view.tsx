"use client";

import { BarChart, LineChart } from "@mantine/charts";
import { Box, Group, ScrollArea, SimpleGrid, Stack, Text } from "@mantine/core";

import { formatDuration } from "@homarr/common";
import type { UmamiMetricItem, UmamiVisitorStats } from "@homarr/integrations/types";
import { useCurrentIntlLocale, useI18n } from "@homarr/translation/client";
import classes from "./component.module.css";

import { UmamiEventsContent } from "./umami-events-content";
import { getUmamiLayout } from "./umami-layout";
import type { NativeUmamiViewProps } from "./native-view-types";
import { WidgetQueryLoadingState } from "../common/query-state-indicator";

export function NativeUmamiView({
  timeFrame,
  eventName,
  eventNames,
  chartStyle,
  chartType,
  viewMode,
  width,
  height,
  displayMode,
  results,
  activeVisitors,
  multiEventSeries,
  isPending,
  formatXLabel,
  formatTimeFrameLabel,
  eventColors,
  renderTopPages,
  renderTopReferrers,
}: NativeUmamiViewProps) {
  const t = useI18n("widget.umami");
  const locale = useCurrentIntlLocale();
  const tickColor = "var(--mantine-color-dimmed)";

  const multiEventTotal = multiEventSeries
    ? multiEventSeries.flatMap(({ dataPoints }) => dataPoints).reduce((sum, { y }) => sum + y, 0)
    : undefined;

  const firstResult = results?.[0];
  if (isPending) return <WidgetQueryLoadingState />;
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
    label: formatXLabel(point.timestamp, timeFrame, locale),
    visitors: point.visitors,
    ...(point.events !== undefined ? { events: point.events } : {}),
  }));

  const hasEventSeries = visitorStats.dataPoints.some(({ events }) => events !== undefined);
  const series = [
    { name: "visitors", color: "blue.5" },
    ...(hasEventSeries ? [{ name: "events", color: "orange.5" }] : []),
  ];

  const isOverlay = chartStyle === "overlay" && hasEventSeries;
  const overlayBarSize = 16;
  const { isDense, showXAxis, showSecondaryStats, showDetailedStats, stackAdvancedContent } = getUmamiLayout({
    width,
    height,
    displayMode,
  });

  const selectedView =
    viewMode === "events" ? (
      <UmamiEventsContent
        series={multiEventSeries ?? []}
        timeFrame={timeFrame}
        hasSelectedEvents={eventNames.length > 0}
        chartType={chartType}
        showXAxis={showXAxis}
        formatXLabel={formatXLabel}
        eventColors={eventColors}
      />
    ) : viewMode === "topPages" ? (
      renderTopPages()
    ) : viewMode === "topReferrers" ? (
      renderTopReferrers()
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
        withXAxis={showXAxis}
        withYAxis={false}
        xAxisProps={{ tick: { fontSize: 9, fill: tickColor }, interval: "preserveStartEnd" }}
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
        withXAxis={showXAxis}
        withYAxis={false}
        barProps={isOverlay ? { barSize: overlayBarSize, radius: 2 } : { radius: 2 }}
        barChartProps={isOverlay ? { barGap: -overlayBarSize } : undefined}
        xAxisProps={{ tick: { fontSize: 9, fill: tickColor }, interval: "preserveStartEnd" }}
      />
    );

  const advancedLists = (
    <SimpleGrid cols={viewMode === "topPages" || viewMode === "topReferrers" ? 1 : 2} spacing="xs" mih={180}>
      {viewMode !== "topPages" && renderTopPages()}
      {viewMode !== "topReferrers" && renderTopReferrers()}
    </SimpleGrid>
  );

  const advancedContent = stackAdvancedContent ? (
    <ScrollArea className={classes.chartSurface} h="100%">
      <Stack gap="md">
        <Box h={Math.max(280, Math.min(420, height - 160))}>{selectedView}</Box>
        {advancedLists}
      </Stack>
    </ScrollArea>
  ) : (
    <SimpleGrid cols={2} spacing="md" h="100%" style={{ gridTemplateRows: "minmax(0, 1fr)" }}>
      <Box className={classes.chartSurface} h="100%" mih={260}>
        {selectedView}
      </Box>
      <ScrollArea className={classes.chartSurface} h="100%">
        {advancedLists}
      </ScrollArea>
    </SimpleGrid>
  );

  return (
    <Stack gap={isDense ? 1 : 4} p={isDense ? 2 : "xs"} h="100%" pos="relative">
      <Group justify="space-between" align="baseline" wrap="nowrap">
        <Text size="xs" c="dimmed" truncate="end" style={{ maxWidth: "55%" }}>
          {visitorStats.domain} ({formatTimeFrameLabel(timeFrame, t)})
        </Text>
        {(eventName && viewMode === "chart" && visitorStats.eventCount !== undefined) ||
        (viewMode === "events" && multiEventTotal !== undefined) ? (
          <Group gap={6} align="baseline" wrap="nowrap">
            <Group gap={4} align="baseline">
              <Text size="lg" fw={700} lh={1}>
                {viewMode === "events"
                  ? (multiEventTotal ?? 0).toLocaleString(locale)
                  : (visitorStats.eventCount ?? 0).toLocaleString(locale)}
              </Text>
              <Text size="xs" c="dimmed">
                {t("event.label")}
              </Text>
            </Group>
            <Text size="xs" c="dimmed">
              /
            </Text>
            <Group gap={4} align="baseline">
              <Text size="lg" fw={700} lh={1}>
                {visitorStats.totalVisitors.toLocaleString(locale)}
              </Text>
              <Text size="xs" c="dimmed">
                {t("visitors")}
              </Text>
            </Group>
          </Group>
        ) : (
          <Group gap={4} align="baseline">
            <Text size="xl" fw={700} lh={1}>
              {visitorStats.totalVisitors.toLocaleString(locale)}
            </Text>
            <Text size="xs" c="dimmed">
              {t("visitors")}
            </Text>
          </Group>
        )}
      </Group>
      {showSecondaryStats && (
        <Group wrap="wrap" style={{ columnGap: 12, rowGap: 4 }}>
          {activeVisitors !== undefined && (
            <Text size="xs" c="green">
              ● {activeVisitors.toLocaleString(locale)} {t("active")}
            </Text>
          )}
          <Text size="xs" c="dimmed">
            {visitorStats.totalPageviews.toLocaleString(locale)} {t("pageviews")}
          </Text>
          <Text size="xs" c="dimmed">
            {visitorStats.totalVisits.toLocaleString(locale)} {t("visits")}
          </Text>
          {showDetailedStats && (
            <>
              <Text size="xs" c="dimmed">
                {visitorStats.bounceRate.toLocaleString(locale)}% {t("bounceRate")}
              </Text>
              <Text size="xs" c="dimmed">
                {formatDuration(visitorStats.avgDuration * 1000)} {t("avgDuration")}
              </Text>
            </>
          )}
        </Group>
      )}
      <Box className={classes.chartSurface} mt={4} style={{ flex: 1, minHeight: 0 }}>
        {displayMode === "advanced" ? advancedContent : selectedView}
      </Box>
    </Stack>
  );
}

export function NativeUmamiTopListView({
  items,
  heading,
  emptyLabel,
}: {
  items: UmamiMetricItem[];
  heading: string;
  emptyLabel: string;
}) {
  const locale = useCurrentIntlLocale();

  return (
    <Stack className={classes.listSurface} gap={2} h="100%">
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
                {item.y.toLocaleString(locale)}
              </Text>
            </Group>
          ))}
        </Stack>
      </ScrollArea>
    </Stack>
  );
}

export function NativeUmamiNoWebsiteView() {
  const t = useI18n("widget.umami");
  return (
    <Stack align="center" justify="center" h="100%">
      <Text c="dimmed" size="sm">
        {t("error.noWebsite")}
      </Text>
    </Stack>
  );
}
