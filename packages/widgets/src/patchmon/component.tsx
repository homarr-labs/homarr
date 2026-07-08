"use client";

import { type CSSProperties } from "react";
import { RingProgress, ScrollArea, Text, Tooltip } from "@mantine/core";
import {
  IconCircleCheck,
  IconClockCheck,
  IconDatabase,
  IconPackages,
  IconRefreshAlert,
  IconServer,
  IconShieldExclamation,
  IconShieldX,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import { clientApi } from "@homarr/api/client";
import { useScopedI18n } from "@homarr/translation/client";
import type { TablerIcon } from "@homarr/ui";

import { WidgetEmptyState } from "../common/empty-state";
import type { WidgetComponentProps } from "../definition";
import classes from "./component.module.css";
import { getGridCols, shouldShowComplianceHeroText } from "./layout-utils";
import { OsDistributionSection } from "./os-distribution-section";
import {
  resolveStatColor,
  severityToIconColor,
  severityToMantineBgColor,
  severityToMantineColor,
  type PatchMonStatKey,
} from "./stat-colors";

dayjs.extend(relativeTime);

const statVisibilityByOption = {
  showTotalHosts: "totalHosts",
  showHostsNeedingUpdates: "hostsNeedingUpdates",
  showSecurityUpdates: "securityUpdates",
  showUpToDateHosts: "upToDateHosts",
  showHostsWithSecurityUpdates: "hostsWithSecurityUpdates",
  showRecentUpdates24h: "recentUpdates24h",
  showTotalOutdatedPackages: "totalOutdatedPackages",
  showTotalRepos: "totalRepos",
} as const;

const statIcons: Record<PatchMonStatKey, TablerIcon> = {
  totalHosts: IconServer,
  hostsNeedingUpdates: IconRefreshAlert,
  securityUpdates: IconShieldExclamation,
  upToDateHosts: IconCircleCheck,
  hostsWithSecurityUpdates: IconShieldX,
  recentUpdates24h: IconClockCheck,
  totalOutdatedPackages: IconPackages,
  totalRepos: IconDatabase,
};

const iconSizeByWidth = [
  { minWidth: 320, size: 22 },
  { minWidth: 200, size: 18 },
  { minWidth: 0, size: 16 },
] as const;

const ringSizeByWidth = [
  { minWidth: 400, size: 88 },
  { minWidth: 320, size: 72 },
  { minWidth: 220, size: 56 },
  { minWidth: 0, size: 40 },
] as const;

type LayoutMode = "mini" | "compact" | "comfortable" | "spacious";
type CompactPrimaryContent = "hero" | "os" | "stats" | null;

const getLayoutMode = (width: number, height: number): LayoutMode => {
  const minDim = Math.min(width, height);
  if (minDim < 140) return "mini";
  if (minDim < 220) return "compact";
  if (width >= 380 && height >= 350) return "spacious";
  return "comfortable";
};

export default function PatchMonWidget({ integrationIds, options, width, height }: WidgetComponentProps<"patchmon">) {
  const t = useScopedI18n("widget.patchmon");
  const integrationId = integrationIds[0] ?? "";
  const { data: stats } = clientApi.widget.patchmon.getStats.useQuery(
    { integrationId },
    { staleTime: 60 * 1000 },
  );

  if (!stats) return <WidgetEmptyState />;

  const statValues: Record<PatchMonStatKey, number> = {
    totalHosts: stats.totalHosts,
    hostsNeedingUpdates: stats.hostsNeedingUpdates,
    securityUpdates: stats.securityUpdates,
    upToDateHosts: stats.upToDateHosts,
    hostsWithSecurityUpdates: stats.hostsWithSecurityUpdates,
    recentUpdates24h: stats.recentUpdates24h,
    totalOutdatedPackages: stats.totalOutdatedPackages,
    totalRepos: stats.totalRepos,
  };

  const visibleStatKeys = Object.entries(statVisibilityByOption)
    .filter(([optionKey]) => options[optionKey as keyof typeof options])
    .map(([, statKey]) => statKey);

  const colorContext = { totalHosts: stats.totalHosts };
  const layout = getLayoutMode(width, height);
  const isLandscape = width / height > 2.5;
  const isTinySquare = width < 160 && height < 160;
  const isShortLandscape = width >= 160 && height < 160;
  const isCompactSurface = isTinySquare || isShortLandscape;
  const isNarrow = width < 180;
  const osDisplayMode = options.osDisplayMode as "bars" | "donut";
  const showOsData = options.showOsDistribution && stats.osDistribution.length > 0;

  const showIcons = layout !== "mini";
  const showLabels = layout !== "mini";
  const showHero = options.showComplianceHero && (!isLandscape || isCompactSurface) && width >= 90 && height >= 90;
  const showHeroText = showHero && shouldShowComplianceHeroText(width);
  const showHeroRingOnly = showHero && !showHeroText;
  const compactPrimaryContent = isCompactSurface
    ? getCompactPrimaryContent({
        showHero,
        showOsDistribution: showOsData,
        visibleStatKeys,
      })
    : null;
  const showStats = visibleStatKeys.length > 0 && !isCompactSurface;
  const showOsSection = showOsData && !isCompactSurface && height > 200;
  const showCompactFooter = isCompactSurface && height >= 110;
  const showFooter = isCompactSurface ? showCompactFooter : !isLandscape && height > 220;
  const showOsLegend = osDisplayMode === "donut" && width >= 380 && height >= 300;

  const hasContent = compactPrimaryContent !== null || showStats || showOsSection || showHero;

  const gridCols = isLandscape
    ? Math.min(visibleStatKeys.length, 4)
    : Math.min(getGridCols(width), visibleStatKeys.length || 1);
  const iconSize = getIconSize(width);
  const ringSize = getRingSize(width, height, showHeroRingOnly);

  const compliancePercent =
    stats.totalHosts > 0 ? Math.round((stats.upToDateHosts / stats.totalHosts) * 100) : 100;
  const complianceSeverity = resolveStatColor("upToDateHosts", stats.upToDateHosts, colorContext, options);
  const complianceColor = complianceSeverity === "neutral" ? "blue" : complianceSeverity;

  const timeAgo = dayjs(stats.lastUpdated).fromNow();
  const compactTimeAgo = getCompactTimeAgo(stats.lastUpdated);
  const footerText = isNarrow ? compactTimeAgo : t("lastUpdated", { time: timeAgo });

  if (isCompactSurface) {
    const compactContentHeight = showCompactFooter ? height - 18 : height;
    const compactStatCols = Math.max(1, Math.floor(width / 120));
    const compactStatKeys = visibleStatKeys.slice(0, Math.min(visibleStatKeys.length, compactStatCols * 2));
    const compactContent =
      compactPrimaryContent === "hero" ? (
        <ComplianceHero
          compliancePercent={compliancePercent}
          complianceColor={complianceColor}
          upToDateHosts={stats.upToDateHosts}
          totalHosts={stats.totalHosts}
          ringSize={getRingSize(width, compactContentHeight, showHeroRingOnly)}
          showText={showHeroText}
          expanded
          compact
          getLabel={t}
        />
      ) : compactPrimaryContent === "os" ? (
        <div className={classes.compactPrimary}>
          <OsDistributionSection
            entries={stats.osDistribution}
            limit={Number(options.osDistributionLimit)}
            showOsVersion={options.showOsVersion}
            displayMode={osDisplayMode}
            width={width}
            height={compactContentHeight}
            showLegend={false}
            compact
          />
        </div>
      ) : compactPrimaryContent === "stats" ? (
        <CompactStatGrid
          statKeys={compactStatKeys}
          statValues={statValues}
          colorContext={colorContext}
          options={options}
          columns={compactStatCols}
          showIcon={width >= 180 || height >= 140}
          getLabel={t}
        />
      ) : null;

    if (!compactContent) {
      return (
        <div className={`${classes.root} ${classes.compactRoot}`}>
          <div className={classes.emptyState}>
            <Text size="sm" c="dimmed">
              —
            </Text>
          </div>
        </div>
      );
    }

    return (
      <div className={`${classes.root} ${classes.compactRoot}`}>
        {compactContent}
        {showCompactFooter && (
          <Text size="xs" c="dimmed" ta="center" className={`${classes.footer} ${classes.compactFooter}`}>
            {footerText}
          </Text>
        )}
      </div>
    );
  }

  if (!hasContent) {
    return (
      <div className={classes.root}>
        <div className={classes.emptyState}>
          <Text size="sm" c="dimmed">
            —
          </Text>
        </div>
      </div>
    );
  }

  const statGridContent = showStats && (
    <div className={`${classes.statsSection} ${showOsSection ? classes.statsSectionCompact : ""}`}>
      <div className={classes.grid} style={{ "--stat-cols": gridCols } as CSSProperties}>
        {visibleStatKeys.map((statKey) => {
          const severity = resolveStatColor(statKey, statValues[statKey], colorContext, options);
          const Icon = statIcons[statKey];

          const tile = (
            <div
              key={statKey}
              className={classes.statTile}
              style={{ "--stat-bg": severityToMantineBgColor(severity) } as CSSProperties}
            >
              {showIcons && (
                <Icon
                  className={classes.statIcon}
                  size={iconSize}
                  stroke={1.5}
                  color={severityToIconColor(severity)}
                />
              )}
              <span className={classes.statValue}>
                <Text component="span" fw={700} size="inherit" c={severityToMantineColor(severity)}>
                  {statValues[statKey]}
                </Text>
              </span>
              {showLabels && <span className={classes.statLabel}>{t(statKey)}</span>}
            </div>
          );

          if (!showLabels) {
            return (
              <Tooltip key={statKey} label={t(statKey)} withArrow>
                {tile}
              </Tooltip>
            );
          }

          return tile;
        })}
      </div>
    </div>
  );

  const osContent = showOsSection && (
    <div className={`${classes.osSectionWrapper} ${visibleStatKeys.length > 0 ? classes.osSectionWithStats : ""}`}>
      <OsDistributionSection
        entries={stats.osDistribution}
        limit={Number(options.osDistributionLimit)}
        showOsVersion={options.showOsVersion}
        displayMode={osDisplayMode}
        width={width}
        height={height}
        showLegend={showOsLegend}
      />
    </div>
  );

  const needsScroll = layout === "mini" || layout === "compact";

  return (
    <div className={classes.root}>
      {showHero && (
        <ComplianceHero
          compliancePercent={compliancePercent}
          complianceColor={complianceColor}
          upToDateHosts={stats.upToDateHosts}
          totalHosts={stats.totalHosts}
          ringSize={ringSize}
          showText={showHeroText}
          expanded={!showStats && !showOsSection}
          getLabel={t}
        />
      )}

      {(statGridContent || osContent) &&
        (needsScroll ? (
          <ScrollArea style={{ flex: 1, minHeight: 0 }} scrollbars="y">
            <div className={classes.content}>
              {statGridContent}
              {osContent}
            </div>
          </ScrollArea>
        ) : (
          <div className={classes.content}>
            {statGridContent}
            {osContent}
          </div>
        ))}

      {showFooter && (
        <Text size="xs" c="dimmed" ta={isNarrow ? "center" : "right"} className={classes.footer}>
          {footerText}
        </Text>
      )}
    </div>
  );
}

function ComplianceHero({
  compliancePercent,
  complianceColor,
  upToDateHosts,
  totalHosts,
  ringSize,
  showText,
  expanded = false,
  compact = false,
  getLabel,
}: {
  compliancePercent: number;
  complianceColor: string;
  upToDateHosts: number;
  totalHosts: number;
  ringSize: number;
  showText: boolean;
  expanded?: boolean;
  compact?: boolean;
  getLabel: (key: "compliance" | "complianceRatio", params?: { upToDate: number; total: number }) => string;
}) {
  const heroClasses = [
    compact && classes.compactPrimary,
    classes.hero,
    expanded && classes.heroExpanded,
    showText ? classes.heroWithText : classes.heroRingOnly,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={heroClasses}>
      {showText && (
        <div className={classes.heroText}>
          <span className={classes.heroLabel}>{getLabel("compliance")}</span>
          <span className={classes.heroValue}>
            {getLabel("complianceRatio", { upToDate: upToDateHosts, total: totalHosts })}
          </span>
        </div>
      )}
      <RingProgress
        className={classes.ring}
        size={ringSize}
        thickness={Math.max(4, Math.round(ringSize / 10))}
        roundCaps
        sections={[{ value: compliancePercent, color: complianceColor }]}
        label={
          <Text ta="center" size="xs" fw={700}>
            {compliancePercent}%
          </Text>
        }
      />
    </div>
  );
}

function getIconSize(width: number): number {
  const match = iconSizeByWidth.find(({ minWidth }) => width >= minWidth);
  return match?.size ?? 16;
}

function getRingSize(width: number, height: number, compact: boolean): number {
  if (compact) {
    return Math.max(36, Math.min(64, width - 28, height - 28));
  }

  const match = ringSizeByWidth.find(({ minWidth }) => width >= minWidth);
  return match?.size ?? 44;
}

function getCompactPrimaryContent({
  showHero,
  showOsDistribution,
  visibleStatKeys,
}: {
  showHero: boolean;
  showOsDistribution: boolean;
  visibleStatKeys: PatchMonStatKey[];
}): CompactPrimaryContent {
  if (showHero) return "hero";
  if (showOsDistribution) return "os";
  return visibleStatKeys.length > 0 ? "stats" : null;
}

function getCompactTimeAgo(lastUpdated: string): string {
  const minutes = Math.max(0, dayjs().diff(dayjs(lastUpdated), "minute"));

  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function CompactStatGrid({
  statKeys,
  statValues,
  colorContext,
  options,
  columns,
  showIcon,
  getLabel,
}: {
  statKeys: PatchMonStatKey[];
  statValues: Record<PatchMonStatKey, number>;
  colorContext: { totalHosts: number };
  options: WidgetComponentProps<"patchmon">["options"];
  columns: number;
  showIcon: boolean;
  getLabel: (key: PatchMonStatKey) => string;
}) {
  return (
    <div className={classes.compactStatGrid} style={{ "--compact-stat-cols": columns } as CSSProperties}>
      {statKeys.map((statKey) => {
        const severity = resolveStatColor(statKey, statValues[statKey], colorContext, options);
        const Icon = statIcons[statKey];
        const label = getLabel(statKey);

        return (
          <Tooltip key={statKey} label={label} withArrow>
            <div
              className={classes.compactStatTile}
              style={{ "--stat-bg": severityToMantineBgColor(severity) } as CSSProperties}
            >
              {showIcon && (
                <Icon className={classes.statIcon} size={18} stroke={1.5} color={severityToIconColor(severity)} />
              )}
              <span className={classes.compactStatValue}>
                <Text component="span" fw={700} size="inherit" c={severityToMantineColor(severity)}>
                  {statValues[statKey]}
                </Text>
              </span>
              <span className={classes.compactStatLabel}>{label}</span>
            </div>
          </Tooltip>
        );
      })}
    </div>
  );
}
