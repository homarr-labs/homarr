"use client";

import { useMemo } from "react";
import { Stack, Text } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import type { SpeedtestTrackerDashboardData } from "@homarr/integrations/types";
import { useScopedI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import { AveragesSection } from "./averages";
import { mergeStats } from "./helpers";
import { LatestResultSection } from "./latest-result";
import { RecentResultsSection } from "./recent-results";

export default function SpeedtestTrackerWidget({
  options,
  integrationIds,
  isEditMode,
}: WidgetComponentProps<"speedtestTracker">) {
  const t = useScopedI18n("widget.speedtestTracker");
  const [dashboardData] = clientApi.widget.speedtestTracker.getDashboard.useSuspenseQuery({ integrationIds });

  const utils = clientApi.useUtils();
  clientApi.widget.speedtestTracker.subscribeToDashboard.useSubscription(
    { integrationIds },
    {
      enabled: !isEditMode,
      onData(newData) {
        utils.widget.speedtestTracker.getDashboard.setData({ integrationIds }, (prevData) => {
          if (!prevData) return prevData;
          return prevData.map((instance) =>
            instance.integrationId === newData.integrationId
              ? { ...instance, dashboard: newData.dashboard, updatedAt: newData.timestamp }
              : instance,
          );
        });
      },
    },
  );

  const combined = useMemo(
    () =>
      dashboardData.reduce<SpeedtestTrackerDashboardData>(
        (acc, item) => ({
          latestResult: item.dashboard.latestResult ?? acc.latestResult,
          stats: mergeStats(acc.stats, item.dashboard.stats),
          recentResults: [...acc.recentResults, ...item.dashboard.recentResults],
        }),
        { latestResult: null, stats: null, recentResults: [] },
      ),
    [dashboardData],
  );

  const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000;
  const recentFiltered = combined.recentResults.filter((result) => result.created_at.getTime() > twelveHoursAgo);

  const hasStatSection =
    (options.showLatestResult && combined.latestResult !== null) || (options.showStats && combined.stats !== null);
  const hasChart = options.showRecentResults && recentFiltered.length > 0;
  const noSectionsEnabled = !options.showLatestResult && !options.showStats && !options.showRecentResults;

  return (
    <Stack h="100%" gap="sm" p="xs" style={{ overflow: "hidden" }}>
      {hasStatSection && (
        <Stack gap="sm" style={{ flex: 1, minHeight: 0 }}>
          {options.showLatestResult && combined.latestResult && (
            <div style={{ flex: 1, minHeight: 0 }}>
              <LatestResultSection result={combined.latestResult} />
            </div>
          )}
          {options.showStats && combined.stats && (
            <div style={{ flex: 1, minHeight: 0 }}>
              <AveragesSection stats={combined.stats} />
            </div>
          )}
        </Stack>
      )}
      {hasChart && (
        <div style={{ flex: 2, minHeight: 0 }}>
          <RecentResultsSection results={recentFiltered} showPingGraph={options.showPingGraph} />
        </div>
      )}
      {noSectionsEnabled && (
        <Text c="dimmed" ta="center" size="sm">
          {t("noSectionsEnabled")}
        </Text>
      )}
    </Stack>
  );
}
