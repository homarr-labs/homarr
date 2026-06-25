"use client";

import { BarChart, LineChart } from "@mantine/charts";
import { Box, Group, Stack, Text, useMantineColorScheme } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import type { UmamiEventSeries } from "@homarr/integrations/types";
import { useScopedI18n } from "@homarr/translation/client";

import { EVENT_COLORS, formatXLabel, umamiQueryOptions } from "./umami-utils";

interface UmamiEventsContentProps {
  integrationIds: string[];
  websiteId: string;
  timeFrame: string;
  eventNames: string[];
  chartType: string;
}

export function UmamiEventsContent({
  integrationIds,
  websiteId,
  timeFrame,
  eventNames,
  chartType,
}: UmamiEventsContentProps) {
  const t = useScopedI18n("widget.umami");
  const { colorScheme } = useMantineColorScheme();
  const tickColor = colorScheme === "dark" ? "#c1c2c5" : "#495057";

  const { data: series = [] } = clientApi.widget.umami.getMultiEventTimeSeries.useQuery(
    { integrationId: integrationIds[0] ?? "", websiteId, timeFrame, eventNames: [...eventNames].toSorted() },
    umamiQueryOptions,
  );

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
    new Set(series.flatMap(({ dataPoints }) => dataPoints.map(({ x: xPoint }) => xPoint))),
  ).toSorted();

  // Build per-event lookup by timestamp string
  const byEvent = new Map(
    series.map((serie: UmamiEventSeries) => [
      serie.eventName,
      new Map(serie.dataPoints.map((point) => [point.x, point.y])),
    ]),
  );

  const chartData = allTimestamps.map((timestamp) => {
    const row: Record<string, string | number> = { label: formatXLabel(timestamp, timeFrame) };
    for (const serie of series) {
      row[serie.eventName] = byEvent.get(serie.eventName)?.get(timestamp) ?? 0;
    }
    return row;
  });

  const chartSeries = series.map((serie: UmamiEventSeries, index: number) => ({
    name: serie.eventName,
    color: EVENT_COLORS[index % EVENT_COLORS.length] ?? "blue.5",
  }));

  return (
    <Stack gap={4} h="100%">
      {chartSeries.length > 1 && (
        <Group gap={12} justify="center" wrap="wrap" style={{ flexShrink: 0, rowGap: 2 }}>
          {chartSeries.map((serie) => (
            <Group key={serie.name} gap={4} align="center" wrap="nowrap">
              <Box
                w={8}
                h={8}
                style={{
                  borderRadius: "50%",
                  backgroundColor: `var(--mantine-color-${serie.color.replace(".", "-")})`,
                  flexShrink: 0,
                }}
              />
              <Text size="xs" c="dimmed" truncate>
                {serie.name}
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
