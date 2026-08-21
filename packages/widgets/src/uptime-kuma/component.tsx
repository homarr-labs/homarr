"use client";

import type { CSSProperties } from "react";
import { Badge, Box, Group, RingProgress, ScrollArea, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconArrowDown, IconArrowUp, IconClockPause, IconServer } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { formatNumber } from "@homarr/common";
import { getIntegrationName } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";

import { WidgetEmptyState } from "../common/empty-state";
import { IntegrationErrorIndicator } from "../common/integration-error-indicator";
import type { WidgetComponentProps } from "../definition";
import { getUsableWidgetQueryData } from "../common/query-state";
import { WidgetQueryErrorIndicator } from "../common/query-state-indicator";
import { NoIntegrationDataError } from "../errors/no-data-integration";
import classes from "./component.module.css";
import { aggregateUptimeKumaDashboards } from "./aggregate";

const statVisibilityByOption = {
  showTotalMonitors: "totalMonitors",
  showUpCount: "upCount",
  showDownCount: "downCount",
  showPausedCount: "pausedCount",
} as const;

const statIcons = {
  totalMonitors: IconServer,
  upCount: IconArrowUp,
  downCount: IconArrowDown,
  pausedCount: IconClockPause,
} as const;

const statColorByKey = {
  totalMonitors: "gray",
  upCount: "green",
  downCount: "red",
  pausedCount: "yellow",
} as const;

const uptimeTierByThreshold = [
  [99, "excellent"],
  [95, "good"],
  [0, "poor"],
] as const;

const uptimeColorByTier = {
  excellent: "green",
  good: "yellow",
  poor: "red",
} as const;

const gridColsByWidth = [
  { minWidth: 380, cols: 4 },
  { minWidth: 260, cols: 2 },
  { minWidth: 0, cols: 2 },
] as const;

const ringSizeByWidth = [
  { minWidth: 400, size: 88 },
  { minWidth: 320, size: 72 },
  { minWidth: 220, size: 56 },
  { minWidth: 0, size: 44 },
] as const;

const iconSizeByWidth = [
  { minWidth: 320, size: 22 },
  { minWidth: 200, size: 18 },
  { minWidth: 0, size: 16 },
] as const;

const heroLayoutBySecondaryStats = {
  false: classes.heroExpanded,
  true: "",
} as const;

const heroVariantByRing = {
  true: "",
  false: classes.heroTextOnly,
} as const;

export function getCompactStatLimit(height: number, showHero: boolean, statCount: number): number {
  if (showHero) {
    if (height < 180) return 0;
    if (height < 260) return Math.min(2, statCount);
    if (height < 340) return Math.min(4, statCount);
  } else {
    if (height < 130) return Math.min(2, statCount);
    if (height < 220) return Math.min(4, statCount);
  }
  return statCount;
}

export function getCompactStatPriority(statKey: keyof typeof statIcons, value: number): number {
  if (statKey === "downCount") return value > 0 ? 0 : 4;
  if (statKey === "pausedCount") return value > 0 ? 1 : 5;
  if (statKey === "totalMonitors") return 2;
  return 3;
}

export default function UptimeKumaWidget({
  integrationIds,
  options,
  width,
  height,
  displayMode = "compact",
}: WidgetComponentProps<"uptimeKuma">) {
  if (integrationIds.length === 0) {
    throw new NoIntegrationDataError();
  }

  return (
    <UptimeKumaContent
      integrationIds={integrationIds}
      options={options}
      width={width}
      height={height}
      displayMode={displayMode}
    />
  );
}

interface UptimeKumaContentProps {
  integrationIds: string[];
  options: WidgetComponentProps<"uptimeKuma">["options"];
  width: number;
  height: number;
  displayMode: "compact" | "advanced";
}

function UptimeKumaContent({ integrationIds, options, width, height, displayMode }: UptimeKumaContentProps) {
  const t = useI18n("widget.uptimeKuma");
  const dashboardQuery = clientApi.widget.uptimeKuma.getDashboard.useQuery({ integrationIds });
  const dashboardData = getUsableWidgetQueryData(dashboardQuery);

  if (!dashboardData) return <WidgetEmptyState />;
  const successfulDashboardData = dashboardData.flatMap((item) =>
    item.dashboard === null ? [] : [{ ...item, dashboard: item.dashboard }],
  );

  const combined = aggregateUptimeKumaDashboards(successfulDashboardData.map((item) => item.dashboard));
  const monitors = successfulDashboardData.flatMap((result) =>
    result.dashboard.monitors.map((monitor) => ({
      ...monitor,
      key: `${result.integrationId}:${monitor.id}`,
      integrationName: result.integrationName,
    })),
  );
  const uptimeValue = clampPercent(combined.averageUptimePercent);
  const uptimeColor = getUptimeColor(uptimeValue);
  const ringSize = getRingSize(width);
  const iconSize = getIconSize(width);
  const gridCols = getGridCols(width);
  const isAdvanced = displayMode === "advanced";

  const enabledStatKeys = Object.entries(statVisibilityByOption)
    .filter(([optionKey]) => isAdvanced || options[optionKey as keyof typeof options])
    .map(([, statKey]) => statKey);

  const showHero = isAdvanced || options.showAverageUptime;
  const showRing = isAdvanced || (options.showUptimeRing && width >= 170 && height >= 110);
  const prioritizedStatKeys = isAdvanced
    ? enabledStatKeys
    : enabledStatKeys.toSorted(
        (left, right) => getCompactStatPriority(left, combined[left]) - getCompactStatPriority(right, combined[right]),
      );
  const visibleStatKeys = prioritizedStatKeys.slice(
    0,
    isAdvanced ? prioritizedStatKeys.length : getCompactStatLimit(height, showHero, prioritizedStatKeys.length),
  );
  const hasContent = showHero || visibleStatKeys.length > 0;

  const heroLayoutClass =
    heroLayoutBySecondaryStats[String(visibleStatKeys.length > 0) as keyof typeof heroLayoutBySecondaryStats];
  const heroRingClass = heroVariantByRing[String(showRing) as keyof typeof heroVariantByRing];

  const summaryContent = (
    <div className={classes.root}>
      {showHero && (
        <div className={`${classes.hero} ${heroLayoutClass} ${heroRingClass}`}>
          <div className={classes.heroText}>
            <span className={classes.heroLabel}>{t("averageUptime")}</span>
            <span className={classes.heroValue}>{formatNumber(uptimeValue, 1)}%</span>
          </div>
          {showRing && (
            <RingProgress
              className={classes.ring}
              size={ringSize}
              thickness={Math.max(4, Math.round(ringSize / 10))}
              roundCaps
              sections={[{ value: uptimeValue, color: uptimeColor }]}
              label={
                <Text ta="center" size="xs" fw={700}>
                  {formatNumber(uptimeValue, 0)}%
                </Text>
              }
            />
          )}
        </div>
      )}

      {!hasContent && (
        <div className={classes.emptyState}>
          <Text size="sm" c="dimmed">
            —
          </Text>
        </div>
      )}

      {visibleStatKeys.length > 0 && (
        <div className={classes.statGrid} style={{ "--stat-cols": gridCols } as CSSProperties}>
          {visibleStatKeys.map((statKey) => {
            const Icon = statIcons[statKey];
            const color = statColorByKey[statKey];
            return (
              <div key={statKey} className={classes.statTile}>
                <Icon
                  className={classes.statIcon}
                  size={iconSize}
                  stroke={1.5}
                  color={`var(--mantine-color-${color}-6)`}
                />
                <span className={classes.statValue}>{formatNumber(combined[statKey], 0)}</span>
                <span className={classes.statLabel}>{t(`stats.${statKey}`)}</span>
              </div>
            );
          })}
        </div>
      )}
      {displayMode === "compact" && height >= 300 && combined.downCount > 0 && (
        <Stack gap={2} px="sm">
          {monitors
            .filter((monitor) => monitor.status === "down")
            .slice(0, 3)
            .map((monitor) => (
              <Group key={monitor.key} justify="space-between" wrap="nowrap">
                <Text size="xs" truncate>
                  {monitor.name}
                </Text>
                <Badge size="xs" color="red">
                  {t("status.down")} ·{" "}
                  {monitor.uptimePercent24h === null ? "—" : `${formatNumber(monitor.uptimePercent24h, 1)}%`}
                </Badge>
              </Group>
            ))}
        </Stack>
      )}
    </div>
  );

  if (displayMode === "compact") {
    return (
      <Box h="100%" pos="relative">
        <Group pos="absolute" top={4} right={8} gap={0} style={{ zIndex: 2 }}>
          <IntegrationErrorIndicator results={dashboardData} />
          <WidgetQueryErrorIndicator error={dashboardQuery.error} label={getIntegrationName("uptimeKuma")} />
        </Group>
        {summaryContent}
      </Box>
    );
  }

  const monitorList = (
    <Stack gap="xs">
      {monitors
        .toSorted((left, right) => statusOrder[left.status] - statusOrder[right.status])
        .map((monitor) => (
          <Group key={monitor.key} justify="space-between" wrap="nowrap" p="xs">
            <Stack gap={0} style={{ minWidth: 0 }}>
              <Text size="sm" fw={600} truncate>
                {monitor.name}
              </Text>
              {(isAdvanced || successfulDashboardData.length > 1) && (
                <Text size="xs" c="dimmed">
                  {monitor.integrationName}
                </Text>
              )}
            </Stack>
            <Badge color={monitor.status === "up" ? "green" : monitor.status === "down" ? "red" : "yellow"}>
              {t(`status.${monitor.status}`)} ·{" "}
              {monitor.uptimePercent24h === null ? "—" : `${formatNumber(monitor.uptimePercent24h, 1)}%`}
            </Badge>
          </Group>
        ))}
    </Stack>
  );

  if (width < 760) {
    return (
      <Box h="100%" pos="relative">
        <Group pos="absolute" top={4} right={8} gap={0} style={{ zIndex: 2 }}>
          <IntegrationErrorIndicator results={dashboardData} />
          <WidgetQueryErrorIndicator error={dashboardQuery.error} label={getIntegrationName("uptimeKuma")} />
        </Group>
        <ScrollArea h="100%">
          <Stack gap="lg" p="md">
            <Box h={Math.max(280, Math.min(420, height - 120))}>{summaryContent}</Box>
            {monitorList}
          </Stack>
        </ScrollArea>
      </Box>
    );
  }

  return (
    <Box h="100%" pos="relative">
      <Group pos="absolute" top={4} right={8} gap={0} style={{ zIndex: 2 }}>
        <IntegrationErrorIndicator results={dashboardData} />
        <WidgetQueryErrorIndicator error={dashboardQuery.error} label={getIntegrationName("uptimeKuma")} />
      </Group>
      <SimpleGrid cols={2} spacing="lg" h="100%" p="md" style={{ gridTemplateRows: "minmax(0, 1fr)" }}>
        {summaryContent}
        <ScrollArea h="100%">{monitorList}</ScrollArea>
      </SimpleGrid>
    </Box>
  );
}

const statusOrder = { down: 0, paused: 1, up: 2 } as const;

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function getUptimeTier(uptime: number): keyof typeof uptimeColorByTier {
  const match = uptimeTierByThreshold.find(([min]) => uptime >= min);
  const tier = match?.[1] ?? "poor";
  return tier;
}

function getUptimeColor(uptime: number): string {
  return uptimeColorByTier[getUptimeTier(uptime)];
}

function getGridCols(width: number): number {
  const match = gridColsByWidth.find(({ minWidth }) => width >= minWidth);
  return match?.cols ?? 2;
}

function getRingSize(width: number): number {
  const match = ringSizeByWidth.find(({ minWidth }) => width >= minWidth);
  return match?.size ?? 44;
}

function getIconSize(width: number): number {
  const match = iconSizeByWidth.find(({ minWidth }) => width >= minWidth);
  return match?.size ?? 16;
}
