"use client";

import { useMemo } from "react";
import { Badge, Box, Group } from "@mantine/core";
import { AreaChart, BarChart } from "@mantine/charts";
import { IconChartAreaLine } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useCurrentIntlLocale, useI18n } from "@homarr/translation/client";

import { WidgetEmptyState } from "../common/empty-state";
import { getUsableWidgetQueryData, isInitialWidgetQueryPending } from "../common/query-state";
import type { WidgetComponentProps } from "../definition";
import { WazuhErrorState } from "../wazuh/_shared/error-state";
import { WazuhLegendChip, WazuhSkeleton, WazuhWidgetFrame } from "../wazuh/_shared/frame";
import { formatWazuhCount, wazuhSeverityChartColors } from "../wazuh/_shared/severity";
import { useWazuhLinks } from "../wazuh/_shared/use-wazuh-links";

const rangeToRefetchMs = { "1h": 60_000, "24h": 60_000, "7d": 5 * 60_000, "30d": 5 * 60_000 } as const;
const formatInterval = (intervalMs: number, locale: string) => {
  const minutes = intervalMs / 60_000;
  const [value, unit] =
    minutes >= 1440 ? [minutes / 1440, "day"] : minutes >= 60 ? [minutes / 60, "hour"] : [minutes, "minute"];
  return new Intl.NumberFormat(locale, { style: "unit", unit, unitDisplay: "short" }).format(value);
};

const stackOrder = ["low", "medium", "high", "critical"] as const;

const formatTick = (timestamp: number, range: "1h" | "24h" | "7d" | "30d", locale: string, detailed: boolean) => {
  const date = new Date(timestamp);
  if (range === "1h" || (range === "24h" && !detailed)) {
    return date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  }
  if (range === "24h") {
    return date.toLocaleString(locale, { weekday: "short", hour: "2-digit", minute: "2-digit" });
  }
  if (range === "7d") {
    return detailed
      ? date.toLocaleString(locale, { weekday: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
      : date.toLocaleDateString(locale, { weekday: "short", day: "numeric" });
  }
  return detailed
    ? date.toLocaleString(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString(locale, { day: "numeric", month: "short" });
};

export default function WazuhTimelineWidget({
  integrationIds,
  options,
  width,
  height,
}: WidgetComponentProps<"wazuhTimeline">) {
  const t = useI18n("widget.wazuhTimeline");
  const tShared = useI18n("widget.wazuh");
  const locale = useCurrentIntlLocale();
  const integrationId = integrationIds[0] ?? "";
  const query = clientApi.widget.wazuh.getTimeline.useQuery(
    { integrationId, range: options.range, interval: options.interval, minLevel: options.minLevel },
    { staleTime: 60_000, refetchInterval: rangeToRefetchMs[options.range] },
  );
  const result = getUsableWidgetQueryData(query);
  const links = useWazuhLinks(result?.dashboardUrl);

  const chartData = useMemo(
    () =>
      (result?.data?.points ?? []).map((point) => ({
        label: formatTick(point.timestamp, options.range, locale, true),
        tick: formatTick(point.timestamp, options.range, locale, false),
        ...point,
      })),
    [result?.data?.points, options.range, locale],
  );

  const compact = height < 180 || width < 260;
  const title = t("title", { range: tShared(`range.${options.range}`) });

  if (isInitialWidgetQueryPending(query)) {
    return (
      <WazuhWidgetFrame icon={IconChartAreaLine} title={title} compact={compact}>
        <WazuhSkeleton variant="chart" />
      </WazuhWidgetFrame>
    );
  }
  if (!result) return <WidgetEmptyState />;
  if (result.error) return <WazuhErrorState error={result.error} compact={height < 160} />;

  const timeline = result.data;
  // Empty severities would only draw a flat line on top of the stack; keep them in the legend only.
  const activeSeverities = stackOrder.filter((severity) => timeline.totals[severity] > 0);
  const series = (activeSeverities.length > 0 ? activeSeverities : stackOrder).map((severity) => ({
    name: severity,
    label: tShared(`severity.${severity}`),
    color: wazuhSeverityChartColors[severity],
  }));
  const showLegend = options.showLegend && height >= 150;
  const showAxis = height >= 130 && width >= 220;

  const sharedProps = {
    h: "100%",
    data: chartData,
    dataKey: "tick",
    series,
    type: "stacked" as const,
    withLegend: false,
    withXAxis: showAxis,
    withYAxis: showAxis && width >= 300,
    gridAxis: "y" as const,
    strokeDasharray: "3 3",
    tickLine: "none" as const,
    yAxisProps: {
      width: 44,
      scale: options.yScale,
      domain: [0, "auto"] as [number, string],
      allowDataOverflow: false,
      tickFormatter: (value: number) => formatWazuhCount(value, locale),
    },
    xAxisProps: { minTickGap: 24, interval: "preserveStartEnd" as const },
    valueFormatter: (value: number) => value.toLocaleString(locale),
    tooltipAnimationDuration: 120,
    tooltipProps: {
      labelFormatter: (_: unknown, payload: readonly { payload?: { label?: string } }[]) =>
        payload[0]?.payload?.label ?? "",
    },
  };

  return (
    <WazuhWidgetFrame
      icon={IconChartAreaLine}
      title={title}
      href={links?.events({ from: `now-${options.range}` })}
      compact={compact}
      headerRight={
        <Badge size="sm" variant="light" color="gray" radius="sm">
          {t("total", { count: formatWazuhCount(timeline.totals.total, locale) })}
        </Badge>
      }
    >
      <Box h="100%" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {showLegend && (
          <Group gap="sm" wrap="wrap" style={{ rowGap: 2 }}>
            {stackOrder.toReversed().map((severity) => (
              <WazuhLegendChip
                key={severity}
                color={wazuhSeverityChartColors[severity]}
                label={tShared(`severity.${severity}`)}
                value={formatWazuhCount(timeline.totals[severity], locale)}
              />
            ))}
            {width >= 420 && (
              <Box ml="auto" c="dimmed" fz={11}>
                {t("interval", { interval: formatInterval(timeline.intervalMs, locale) })}
              </Box>
            )}
          </Group>
        )}
        <Box style={{ flex: 1, minHeight: 0 }}>
          {options.chartType === "bar" ? (
            <BarChart {...sharedProps} barProps={{ radius: 1 }} maxBarWidth={18} />
          ) : (
            <AreaChart {...sharedProps} curveType="monotone" withDots={false} fillOpacity={0.55} strokeWidth={1.25} />
          )}
        </Box>
      </Box>
    </WazuhWidgetFrame>
  );
}
