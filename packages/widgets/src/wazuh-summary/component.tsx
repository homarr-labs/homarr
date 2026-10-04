"use client";

import { Box, Flex, Group, Stack, Text, Tooltip } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { DonutChart } from "@mantine/charts";
import { IconArrowDownRight, IconArrowUpRight, IconMinus, IconShieldHalfFilled } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useCurrentIntlLocale, useI18n } from "@homarr/translation/client";

import { WidgetEmptyState } from "../common/empty-state";
import { getUsableWidgetQueryData, isInitialWidgetQueryPending } from "../common/query-state";
import type { WidgetComponentProps } from "../definition";
import { WazuhErrorState } from "../wazuh/_shared/error-state";
import { WazuhPendingState, WazuhWidgetFrame } from "../wazuh/_shared/frame";
import {
  formatWazuhCount,
  formatWazuhTrend,
  getWazuhTrend,
  wazuhSeverities,
  wazuhSeverityChartColors,
} from "../wazuh/_shared/severity";
import { useWazuhLinks } from "../wazuh/_shared/use-wazuh-links";
import classes from "../wazuh/_shared/wazuh.module.css";

const healthColors = { green: "green", yellow: "yellow", red: "red" } as const;

const TrendIndicator = ({
  current,
  previous,
  size = "xs",
}: {
  current: number;
  previous: number;
  size?: "xs" | "sm";
}) => {
  const t = useI18n("widget.wazuhSummary");
  const locale = useCurrentIntlLocale();
  if (current === 0 && previous === 0) {
    // Nothing now and nothing before: a percentage would only be noise.
    return (
      <Text size={size} c="dimmed" fw={600} className={classes.numeric}>
        —
      </Text>
    );
  }
  const trend = getWazuhTrend(current, previous);
  if (trend === null) {
    return (
      <Text size={size} c="red.4" fw={600} className={classes.numeric}>
        {t("trend.new")}
      </Text>
    );
  }
  // More alerts than before is bad news, so increases are red and decreases green.
  const color = trend > 0.005 ? "red.4" : trend < -0.005 ? "green.4" : "dimmed";
  const Icon = trend > 0.005 ? IconArrowUpRight : trend < -0.005 ? IconArrowDownRight : IconMinus;
  return (
    <Tooltip label={t("trend.tooltip", { previous: previous.toLocaleString(locale) })} withArrow openDelay={300}>
      <Group gap={1} wrap="nowrap" c={color} className={classes.numeric}>
        <Icon size={size === "sm" ? 14 : 12} stroke={2.2} />
        <Text size={size} fw={600} c={color}>
          {formatWazuhTrend(trend, locale)}
        </Text>
      </Group>
    </Tooltip>
  );
};

export default function WazuhSummaryWidget({
  integrationIds,
  options,
  width,
  height,
}: WidgetComponentProps<"wazuhSummary">) {
  const t = useI18n("widget.wazuhSummary");
  const tShared = useI18n("widget.wazuh");
  const locale = useCurrentIntlLocale();
  const integrationId = integrationIds[0] ?? "";
  const query = clientApi.widget.wazuh.getSummary.useQuery(
    { integrationId, range: options.range },
    { staleTime: 60_000, refetchInterval: 60_000 },
  );
  const result = getUsableWidgetQueryData(query);
  const links = useWazuhLinks(result?.dashboardUrl);
  const compact = height < 170 || width < 240;
  const donutArea = useElementSize();
  const title = t("title", { range: tShared(`range.${options.range}`) });

  if (isInitialWidgetQueryPending(query)) {
    return (
      <WazuhWidgetFrame icon={IconShieldHalfFilled} title={title} compact={compact}>
        <WazuhPendingState />
      </WazuhWidgetFrame>
    );
  }
  if (!result) return <WidgetEmptyState />;
  if (result.error) return <WazuhErrorState error={result.error} compact={height < 160} />;

  const summary = result.data;
  const alerts = summary.alerts;
  const previous = summary.previousAlerts;
  const showFooter = options.showFooter && height >= 190;
  // Square-ish or tall tiles stack the donut above the legend so it can grow; wide tiles put them side by side.
  const vertical = height >= 300 && height >= width * 0.75;
  // In the stacked layout the donut fills whatever height the legend leaves (measured, so it never overlaps).
  const donutSize = vertical
    ? Math.floor(Math.min(donutArea.height, donutArea.width * 0.7, 230))
    : Math.min(height - (showFooter ? 88 : 62), width * 0.42, 170);
  const showDonut = donutSize >= 84 && width >= 260;

  if (!alerts) {
    return (
      <WazuhWidgetFrame icon={IconShieldHalfFilled} title={title} compact={compact}>
        <Stack h="100%" justify="center" align="center" gap={4}>
          <Text size="sm" c="dimmed" ta="center">
            {tShared("error.indexerRequired.description")}
          </Text>
          {summary.managerVersion && <Text size="xs">{t("manager", { version: summary.managerVersion })}</Text>}
        </Stack>
      </WazuhWidgetFrame>
    );
  }

  const donutData =
    alerts.total === 0
      ? [{ name: t("none"), value: 1, color: "dark.4" }]
      : wazuhSeverities.toReversed().map((severity) => ({
          name: tShared(`severity.${severity}`),
          value: alerts[severity],
          color: wazuhSeverityChartColors[severity],
        }));

  const donutChart = (
    <Box pos="relative" w={donutSize} h={donutSize} style={{ flexShrink: 0 }}>
      <DonutChart
        data={donutData}
        size={donutSize}
        thickness={Math.max(10, Math.round(donutSize / 9))}
        paddingAngle={alerts.total === 0 ? 0 : 2}
        withTooltip={alerts.total > 0}
        tooltipDataSource="segment"
        valueFormatter={(value) => value.toLocaleString(locale)}
        strokeWidth={0}
      />
      <Stack gap={0} align="center" justify="center" pos="absolute" inset={0} style={{ pointerEvents: "none" }}>
        <Text fw={700} size={donutSize >= 120 ? "xl" : "md"} lh={1.1} className={classes.numeric}>
          {formatWazuhCount(alerts.total, locale)}
        </Text>
        <Text size="10px" c="dimmed" tt="uppercase" fw={600}>
          {t("alerts")}
        </Text>
      </Stack>
    </Box>
  );

  return (
    <WazuhWidgetFrame
      icon={IconShieldHalfFilled}
      title={title}
      href={links?.events({ from: `now-${options.range}` })}
      compact={compact}
      headerRight={
        options.showTrend && previous && width >= 220 ? (
          <TrendIndicator current={alerts.total} previous={previous.total} size="sm" />
        ) : undefined
      }
      footer={
        showFooter ? (
          <Group justify="space-between" gap={6} wrap="nowrap">
            <Text size="xs" c="dimmed" truncate>
              {previous
                ? t("previous", {
                    range: tShared(`range.${options.range}`),
                    count: formatWazuhCount(previous.total, locale),
                  })
                : null}
            </Text>
            <Group gap={8} wrap="nowrap">
              {summary.maxLevel !== null && width >= 300 && (
                <Text size="xs" c="dimmed" className={classes.nowrap}>
                  {t("maxLevel", { level: String(summary.maxLevel) })}
                </Text>
              )}
              {summary.indexerHealth && (
                <Tooltip label={t("health", { status: summary.indexerHealth })} withArrow>
                  <Box className={classes.dot} bg={healthColors[summary.indexerHealth]} />
                </Tooltip>
              )}
            </Group>
          </Group>
        ) : undefined
      }
    >
      <Flex
        h="100%"
        gap={vertical ? "sm" : "md"}
        direction={vertical ? "column" : "row"}
        wrap="nowrap"
        justify={showDonut && !vertical ? "space-between" : "center"}
        align={vertical ? "stretch" : "center"}
      >
        {vertical && (
          <Box ref={donutArea.ref} pos="relative" style={{ flex: 1, minHeight: 0 }}>
            {/* Absolutely positioned so the donut never feeds back into the measured area size. */}
            <Box pos="absolute" inset={0} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              {showDonut && donutChart}
            </Box>
          </Box>
        )}
        {!vertical && showDonut && donutChart}
        <Stack
          gap={compact ? 2 : 6}
          style={vertical ? { minWidth: 0, flexShrink: 0 } : { flex: 1, minWidth: 0 }}
          maw={showDonut && !vertical ? 240 : undefined}
        >
          {!showDonut && (
            <Group justify="space-between" wrap="nowrap">
              <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                {t("alerts")}
              </Text>
              <Text fw={700} size="md" className={classes.numeric}>
                {formatWazuhCount(alerts.total, locale)}
              </Text>
            </Group>
          )}
          {wazuhSeverities.map((severity) => {
            const share = alerts.total > 0 ? alerts[severity] / alerts.total : 0;
            return (
              <Stack key={severity} gap={2}>
                <Group gap={6} wrap="nowrap">
                  <Box className={classes.dot} bg={wazuhSeverityChartColors[severity]} />
                  <Text size="xs" style={{ flex: 1 }} truncate>
                    {tShared(`severity.${severity}`)}
                  </Text>
                  <Text size="xs" fw={600} className={classes.numeric}>
                    {formatWazuhCount(alerts[severity], locale)}
                  </Text>
                  {options.showTrend && previous && width >= 200 && (
                    <Box w={52} style={{ display: "flex", justifyContent: "flex-end" }}>
                      <TrendIndicator current={alerts[severity]} previous={previous[severity]} />
                    </Box>
                  )}
                </Group>
                {!compact && (
                  <div className={classes.bar}>
                    <div
                      className={classes.barFill}
                      style={{
                        width: `${alerts[severity] > 0 ? Math.max(share * 100, 1.5) : 0}%`,
                        background: `var(--mantine-color-${wazuhSeverityChartColors[severity].replace(".", "-")})`,
                      }}
                    />
                  </div>
                )}
              </Stack>
            );
          })}
        </Stack>
      </Flex>
    </WazuhWidgetFrame>
  );
}
