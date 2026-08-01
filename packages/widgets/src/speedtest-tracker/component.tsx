"use client";

import { useMemo, useState } from "react";
import { SegmentedControl, SimpleGrid, Stack, Text } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { useScopedI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import { WidgetEmptyState } from "../common/empty-state";
import { AveragesSection } from "./averages";
import { combineSpeedtestDashboards } from "./helpers";
import { LatestResultSection } from "./latest-result";
import { RecentResultsSection } from "./recent-results";

export default function SpeedtestTrackerWidget({
  options,
  integrationIds,
  width,
  height,
  displayMode = "compact",
}: WidgetComponentProps<"speedtestTracker">) {
  const t = useScopedI18n("widget.speedtestTracker");
  const { data: dashboardData = [] } = clientApi.widget.speedtestTracker.getDashboard.useQuery({ integrationIds });
  const [advancedRange, setAdvancedRange] = useState("24");

  const combined = useMemo(
    () => combineSpeedtestDashboards(dashboardData.map((item) => item.dashboard)),
    [dashboardData],
  );

  const rangeHours = displayMode === "advanced" ? Number(advancedRange) : 12;
  const cutoff = rangeHours > 0 ? Date.now() - rangeHours * 60 * 60 * 1000 : 0;
  const recentFiltered = combined.recentResults.filter((result) => result.created_at.getTime() > cutoff);

  const hasStatSection =
    (options.showLatestResult && combined.latestResult !== null) || (options.showStats && combined.stats !== null);
  const hasChart = options.showRecentResults && recentFiltered.length > 0;
  const noSectionsEnabled = !options.showLatestResult && !options.showStats && !options.showRecentResults;

  const latest = options.showLatestResult && combined.latestResult && (
    <LatestResultSection result={combined.latestResult} width={displayMode === "advanced" ? width / 2 : width} />
  );
  const averages = options.showStats && combined.stats && (
    <AveragesSection stats={combined.stats} width={displayMode === "advanced" ? width / 2 : width} />
  );

  if (displayMode === "advanced") {
    return (
      <Stack h="100%" gap="md" p="md" style={{ overflow: "hidden" }}>
        <SegmentedControl
          size="xs"
          value={advancedRange}
          onChange={setAdvancedRange}
          data={[
            { value: "12", label: t("range.twelveHours") },
            { value: "24", label: t("range.oneDay") },
            { value: "0", label: t("range.all") },
          ]}
        />
        {hasStatSection && (
          <SimpleGrid cols={width >= 720 ? 2 : 1} spacing="md">
            {latest}
            {averages}
          </SimpleGrid>
        )}
        {hasChart && (
          <div style={{ flex: 1, minHeight: Math.max(220, height / 2) }}>
            <RecentResultsSection results={recentFiltered} showPingGraph={options.showPingGraph} />
          </div>
        )}
      </Stack>
    );
  }

  return (
    <Stack h="100%" gap="sm" p="xs" style={{ overflow: "hidden" }}>
      {hasStatSection && (
        <Stack gap="sm" style={{ flex: 1, minHeight: 0 }}>
          {latest && <div style={{ flex: 1, minHeight: 0 }}>{latest}</div>}
          {averages && height >= 170 && <div style={{ flex: 1, minHeight: 0 }}>{averages}</div>}
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
      {!noSectionsEnabled && !hasStatSection && !hasChart && <WidgetEmptyState />}
    </Stack>
  );
}
