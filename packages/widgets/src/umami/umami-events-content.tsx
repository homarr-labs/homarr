"use client";

import { BarChart, LineChart } from "@mantine/charts";
import { Box, Group, Stack, Text, useMantineColorScheme } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import type { UmamiEventSeries } from "@homarr/integrations/types";
import { useScopedI18n } from "@homarr/translation/client";

import { EVENT_COLORS, formatXLabel } from "./umami-utils";

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
  const allTimestamps = Array.from(new Set(series.flatMap((s) => s.dataPoints.map((p) => p.x)))).sort();

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
