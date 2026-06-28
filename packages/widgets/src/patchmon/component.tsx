"use client";

import type { CSSProperties } from "react";
import { Text } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { useScopedI18n } from "@homarr/translation/client";

import { WidgetEmptyState } from "../common/empty-state";
import type { WidgetComponentProps } from "../definition";
import classes from "./component.module.css";
import { OsDistributionSection } from "./os-distribution-section";

type StatKey =
  | "totalHosts"
  | "hostsNeedingUpdates"
  | "securityUpdates"
  | "upToDateHosts"
  | "hostsWithSecurityUpdates"
  | "recentUpdates24h"
  | "totalOutdatedPackages"
  | "totalRepos";

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

const statColors: Partial<Record<StatKey, string>> = {
  hostsNeedingUpdates: "yellow",
  securityUpdates: "red",
  hostsWithSecurityUpdates: "red",
};

const gridColsByWidth = [
  { minWidth: 380, cols: 3 },
  { minWidth: 220, cols: 2 },
  { minWidth: 0, cols: 1 },
] as const;

export default function PatchMonWidget({ integrationIds, options, width }: WidgetComponentProps<"patchmon">) {
  const t = useScopedI18n("widget.patchmon");
  const { data: stats } = clientApi.widget.patchmon.getStats.useQuery(
    { integrationId: integrationIds[0] ?? "" },
    { staleTime: 5 * 60 * 1000 },
  );

  if (!stats) return <WidgetEmptyState />;

  const statValues: Record<StatKey, number> = {
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

  const showOsSection = options.showOsDistribution && stats.osDistribution.length > 0;
  const hasContent = visibleStatKeys.length > 0 || showOsSection;

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

  const gridCols = getGridCols(width);

  return (
    <div className={classes.root}>
      <div className={classes.content}>
        {visibleStatKeys.length > 0 && (
          <div className={`${classes.statsSection} ${showOsSection ? classes.statsSectionCompact : ""}`}>
            <div className={classes.grid} style={{ "--stat-cols": gridCols } as CSSProperties}>
              {visibleStatKeys.map((statKey) => (
                <div key={statKey} className={classes.statTile}>
                  <span className={classes.statValue}>
                    <Text
                      component="span"
                      fw={700}
                      size="inherit"
                      c={statColors[statKey] ?? "var(--mantine-primary-color-filled)"}
                    >
                      {statValues[statKey]}
                    </Text>
                  </span>
                  <span className={classes.statLabel}>{t(statKey)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {showOsSection && (
          <div className={`${classes.osSectionWrapper} ${visibleStatKeys.length > 0 ? classes.osSectionWithStats : ""}`}>
            <OsDistributionSection
              entries={stats.osDistribution}
              limit={Number(options.osDistributionLimit)}
              showOsVersion={options.showOsVersion}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function getGridCols(width: number): number {
  const match = gridColsByWidth.find(({ minWidth }) => width >= minWidth);
  return match?.cols ?? 1;
}
