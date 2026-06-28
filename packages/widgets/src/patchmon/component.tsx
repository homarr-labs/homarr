"use client";

import type { CSSProperties } from "react";
import { Text } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { useScopedI18n } from "@homarr/translation/client";

import { WidgetEmptyState } from "../common/empty-state";
import type { WidgetComponentProps } from "../definition";
import classes from "./component.module.css";
import { OsDistributionSection } from "./os-distribution-section";
import { resolveStatColor, severityToMantineColor, type PatchMonStatKey } from "./stat-colors";

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

  const showOsSection = options.showOsDistribution && stats.osDistribution.length > 0;
  const hasContent = visibleStatKeys.length > 0 || showOsSection;
  const colorContext = { totalHosts: stats.totalHosts };

  const isCompact = width < 220;
  const gridCols = getGridCols(width);

  if (!hasContent) {
    return (
      <div className={classes.root}>
        <Text size={isCompact ? "xs" : "sm"} fw={600} className={classes.title}>
          {t("title")}
        </Text>
        <div className={classes.emptyState}>
          <Text size="sm" c="dimmed">
            —
          </Text>
        </div>
      </div>
    );
  }

  return (
    <div className={classes.root}>
      <Text size={isCompact ? "xs" : "sm"} fw={600} className={classes.title}>
        {t("title")}
      </Text>
      <div className={classes.content}>
        {visibleStatKeys.length > 0 && (
          <div className={`${classes.statsSection} ${showOsSection ? classes.statsSectionCompact : ""}`}>
            <div className={classes.grid} style={{ "--stat-cols": gridCols } as CSSProperties}>
              {visibleStatKeys.map((statKey) => {
                const severity = resolveStatColor(statKey, statValues[statKey], colorContext, options);

                return (
                  <div key={statKey} className={classes.statTile}>
                    <span className={classes.statValue}>
                      <Text component="span" fw={700} size="inherit" c={severityToMantineColor(severity)}>
                        {statValues[statKey]}
                      </Text>
                    </span>
                    <span className={classes.statLabel}>{t(statKey)}</span>
                  </div>
                );
              })}
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
