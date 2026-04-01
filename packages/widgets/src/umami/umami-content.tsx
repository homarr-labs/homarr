"use client";

import { BarChart, LineChart } from "@mantine/charts";
import { Box, Group, Stack, Text, useMantineColorScheme } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { formatDuration } from "@homarr/common";
import type { UmamiVisitorStats } from "@homarr/integrations/types";
import { useScopedI18n } from "@homarr/translation/client";

import { UmamiEventsContent } from "./umami-events-content";
import { UmamiTopPagesContent, UmamiTopReferrersContent } from "./umami-top-list";
import { formatTimeFrameLabel, formatXLabel } from "./umami-utils";

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
}: UmamiContentProps) {
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

  const { data: multiEventSeries } = clientApi.widget.umami.getMultiEventTimeSeries.useQuery(
    { integrationIds, websiteId, timeFrame, eventNames: [...eventNames].sort() },
    { enabled: viewMode === "events" && eventNames.length > 0 },
  );

  const multiEventTotal = multiEventSeries
    ? multiEventSeries.flatMap((s) => s.dataPoints).reduce((sum, p) => sum + p.y, 0)
    : undefined;

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
          {visitorStats.domain} ({formatTimeFrameLabel(timeFrame, t)})
        </Text>
        {(eventName && viewMode === "chart" && visitorStats.eventCount !== undefined) ||
        (viewMode === "events" && multiEventTotal !== undefined) ? (
          <Group gap={6} align="baseline" wrap="nowrap">
            <Group gap={4} align="baseline">
              <Text size="lg" fw={700} lh={1}>
                {viewMode === "events"
                  ? (multiEventTotal ?? 0).toLocaleString()
                  : (visitorStats.eventCount ?? 0).toLocaleString()}
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
          {formatDuration(visitorStats.avgDuration * 1000)} {t("avgDuration")}
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
