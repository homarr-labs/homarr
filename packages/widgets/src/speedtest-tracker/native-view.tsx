"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";
import type { MantineSize } from "@mantine/core";
import { Box, Group, Stack, Text } from "@mantine/core";

import { useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import { WidgetEmptyState } from "../common/empty-state";
import { AveragesSection } from "./averages";
import { combineSpeedtestDashboards, getAvailableSpeedtestDashboards } from "./helpers";
import { LatestResultSection } from "./latest-result";
import { RecentResultsSection } from "./recent-results";

export interface NativeSpeedtestTrackerViewProps {
  options: WidgetComponentProps<"speedtestTracker">["options"];
  width: number;
  dashboardData: Parameters<typeof getAvailableSpeedtestDashboards>[0];
  itemRadius: MantineSize;
  queryIndicators: ReactNode;
}

export function NativeSpeedtestTrackerView({
  options,
  width,
  dashboardData,
  itemRadius,
  queryIndicators,
}: NativeSpeedtestTrackerViewProps) {
  const t = useI18n("widget.speedtestTracker");
  const successfulDashboards = useMemo(() => getAvailableSpeedtestDashboards(dashboardData), [dashboardData]);

  const combined = useMemo(
    () => combineSpeedtestDashboards(successfulDashboards.map(({ dashboard }) => dashboard)),
    [successfulDashboards],
  );

  const cutoff = Date.now() - 12 * 60 * 60 * 1000;
  const recentFiltered = combined.recentResults.filter((result) => result.created_at.getTime() > cutoff);

  const showLatestResult = options.showLatestResult;
  const showStats = options.showStats;
  const showRecentResults = options.showRecentResults;
  const showPingGraph = options.showPingGraph;
  const hasStatSection = (showLatestResult && combined.latestResult !== null) || (showStats && combined.stats !== null);
  const hasChart = showRecentResults && recentFiltered.length > 0;
  const noSectionsEnabled = !options.showLatestResult && !options.showStats && !options.showRecentResults;

  const latest = showLatestResult && combined.latestResult && (
    <LatestResultSection result={combined.latestResult} width={width} compactSurface itemRadius={itemRadius} />
  );
  const averages = showStats && combined.stats && (
    <AveragesSection stats={combined.stats} width={width} compactSurface itemRadius={itemRadius} />
  );

  return (
    <Box h="100%" pos="relative">
      <Group pos="absolute" top={4} right={8} gap={0} style={{ zIndex: 2 }}>
        {queryIndicators}
      </Group>
      <Stack h="100%" gap="sm" p="xs" style={{ overflow: "hidden" }}>
        {dashboardData.length > 1 && (
          <Text size="xs" c="dimmed" truncate>
            {successfulDashboards.map(({ integrationName }) => integrationName).join(" · ")}
          </Text>
        )}
        {(latest || averages) && (
          <Stack gap="sm" style={{ flex: 1, minHeight: 0 }}>
            {latest && <div style={{ flex: 1, minHeight: 0 }}>{latest}</div>}
            {averages && <div style={{ flex: 1, minHeight: 0 }}>{averages}</div>}
          </Stack>
        )}
        {hasChart && (
          <div style={{ flex: 2, minHeight: 0 }}>
            <RecentResultsSection
              results={recentFiltered}
              showPingGraph={showPingGraph}
              uppercaseLabels
              itemRadius={itemRadius}
            />
          </div>
        )}
        {noSectionsEnabled && (
          <Text c="dimmed" ta="center" size="sm">
            {t("noSectionsEnabled")}
          </Text>
        )}
        {!noSectionsEnabled && !hasStatSection && !hasChart && <WidgetEmptyState />}
      </Stack>
    </Box>
  );
}
