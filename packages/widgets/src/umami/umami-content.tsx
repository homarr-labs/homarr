"use client";

import { BarChart, LineChart } from "@mantine/charts";
import { Box, Group, ScrollArea, SimpleGrid, Stack, Text } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { formatDuration } from "@homarr/common";
import type { UmamiVisitorStats } from "@homarr/integrations/types";
import { useCurrentIntlLocale, useI18n } from "@homarr/translation/client";
import classes from "./component.module.css";

import { UmamiEventsContent } from "./umami-events-content";
import { getUmamiLayout } from "./umami-layout";
import { UmamiTopPagesContent, UmamiTopReferrersContent } from "./umami-top-list";
import { formatTimeFrameLabel, formatXLabel, umamiQueryOptions } from "./umami-utils";
import type { TimeFrame } from "./umami-utils";
import { getUsableWidgetQueryData, isInitialWidgetQueryPending } from "../common/query-state";
import { WidgetQueryErrorIndicator, WidgetQueryLoadingState } from "../common/query-state-indicator";

interface UmamiContentProps {
  integrationIds: string[];
  websiteId: string;
  timeFrame: TimeFrame;
  eventName?: string;
  eventNames: string[];
  chartStyle: string;
  chartType: string;
  viewMode: string;
  topCount: number;
  width: number;
  height: number;
  displayMode: "compact" | "advanced";
}

export function UmamiContent({
  integrationIds,
  websiteId,
  timeFrame,
  eventName,
  eventNames,
  chartStyle,
  chartType,
  viewMode,
  topCount,
  width,
  height,
  displayMode,
}: UmamiContentProps) {
  const t = useI18n("widget.umami");
  const locale = useCurrentIntlLocale();
  const tickColor = "var(--mantine-color-dimmed)";

  const statsQuery = clientApi.widget.umami.getVisitorStats.useQuery(
    { integrationIds, websiteId, timeFrame, eventName },
    umamiQueryOptions,
  );
  const results = getUsableWidgetQueryData(statsQuery);

  const activeVisitorsInput = { integrationId: integrationIds[0] ?? "", websiteId };
  const activeVisitorsQuery = clientApi.widget.umami.getActiveVisitors.useQuery(activeVisitorsInput, umamiQueryOptions);
  const activeVisitors = activeVisitorsQuery.data;

  const multiEventQuery = clientApi.widget.umami.getMultiEventTimeSeries.useQuery(
    { integrationId: integrationIds[0] ?? "", websiteId, timeFrame, eventNames: [...eventNames].toSorted() },
    { enabled: viewMode === "events" && eventNames.length > 0, ...umamiQueryOptions },
  );
  const multiEventSeries = getUsableWidgetQueryData(multiEventQuery);

  const multiEventTotal = multiEventSeries
    ? multiEventSeries.flatMap(({ dataPoints }) => dataPoints).reduce((sum, { y }) => sum + y, 0)
    : undefined;

  const firstResult = results?.[0];
  if (isInitialWidgetQueryPending(statsQuery)) return <WidgetQueryLoadingState />;
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
      {viewMode !== "topPages" && (
        <UmamiTopPagesContent
          integrationIds={integrationIds}
          websiteId={websiteId}
          timeFrame={timeFrame}
          limit={topCount}
        />
      )}
      {viewMode !== "topReferrers" && (
        <UmamiTopReferrersContent
          integrationIds={integrationIds}
          websiteId={websiteId}
          timeFrame={timeFrame}
          limit={topCount}
        />
      )}
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
      {(statsQuery.error || activeVisitorsQuery.error || multiEventQuery.error) && (
        <Box pos="absolute" top={4} right={4}>
          <WidgetQueryErrorIndicator
            error={statsQuery.error ?? activeVisitorsQuery.error ?? multiEventQuery.error}
            label={t("name")}
          />
        </Box>
      )}
    </Stack>
  );
}
