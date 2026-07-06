"use client";

import type { CSSProperties } from "react";
import { RingProgress, Text } from "@mantine/core";
import { IconArrowDown, IconArrowUp, IconClockPause, IconServer } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { formatNumber } from "@homarr/common";
import type { UptimeKumaDashboardData } from "@homarr/integrations/types";
import { useScopedI18n } from "@homarr/translation/client";

import { WidgetEmptyState } from "../common/empty-state";
import type { WidgetComponentProps } from "../definition";
import { NoIntegrationDataError } from "../errors/no-data-integration";
import classes from "./component.module.css";

const emptyDashboard: UptimeKumaDashboardData = {
  totalMonitors: 0,
  upCount: 0,
  downCount: 0,
  pausedCount: 0,
  averageUptimePercent: 0,
  monitors: [],
};

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

export default function UptimeKumaWidget({ integrationIds, options, width }: WidgetComponentProps<"uptimeKuma">) {
  if (integrationIds.length === 0) {
    throw new NoIntegrationDataError();
  }

  return <UptimeKumaContent integrationIds={integrationIds} options={options} width={width} />;
}

interface UptimeKumaContentProps {
  integrationIds: string[];
  options: WidgetComponentProps<"uptimeKuma">["options"];
  width: number;
}

function UptimeKumaContent({ integrationIds, options, width }: UptimeKumaContentProps) {
  const t = useScopedI18n("widget.uptimeKuma");
  const { data: dashboardData } = clientApi.widget.uptimeKuma.getDashboard.useQuery({ integrationIds });

  if (!dashboardData) return <WidgetEmptyState />;

  const combined = dashboardData.reduce<UptimeKumaDashboardData>(
    (acc, item) => ({
      totalMonitors: acc.totalMonitors + item.dashboard.totalMonitors,
      upCount: acc.upCount + item.dashboard.upCount,
      downCount: acc.downCount + item.dashboard.downCount,
      pausedCount: acc.pausedCount + item.dashboard.pausedCount,
      averageUptimePercent: acc.averageUptimePercent + item.dashboard.averageUptimePercent,
      monitors: [...acc.monitors, ...item.dashboard.monitors],
    }),
    emptyDashboard,
  );

  const instanceCount = dashboardData.length;
  const averageUptime = combined.averageUptimePercent / Math.max(instanceCount, 1);
  const uptimeValue = clampPercent(averageUptime);
  const uptimeColor = getUptimeColor(uptimeValue);
  const ringSize = getRingSize(width);
  const iconSize = getIconSize(width);
  const gridCols = getGridCols(width);

  const visibleStatKeys = Object.entries(statVisibilityByOption)
    .filter(([optionKey]) => options[optionKey as keyof typeof options])
    .map(([, statKey]) => statKey);

  const showHero = options.showAverageUptime;
  const hasContent = showHero || visibleStatKeys.length > 0;

  const heroLayoutClass =
    heroLayoutBySecondaryStats[String(visibleStatKeys.length > 0) as keyof typeof heroLayoutBySecondaryStats];
  const heroRingClass = heroVariantByRing[String(options.showUptimeRing) as keyof typeof heroVariantByRing];

  return (
    <div className={classes.root}>
      {showHero && (
        <div className={`${classes.hero} ${heroLayoutClass} ${heroRingClass}`}>
          <div className={classes.heroText}>
            <span className={classes.heroLabel}>{t("averageUptime")}</span>
            <span className={classes.heroValue}>{formatNumber(uptimeValue, 1)}%</span>
          </div>
          {options.showUptimeRing && (
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
    </div>
  );
}

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
