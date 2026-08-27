"use client";

import { useMemo, useState } from "react";
import { Box, Card, Group, ScrollArea, SegmentedControl, SimpleGrid, Stack, Text } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import { IntegrationErrorIndicator } from "../common/integration-error-indicator";
import { getUsableWidgetQueryData } from "../common/query-state";
import { WidgetEmptyState } from "../common/empty-state";
import { AveragesSection } from "./averages";
import { combineSpeedtestDashboards, getAvailableSpeedtestDashboards } from "./helpers";
import { LatestResultSection } from "./latest-result";
import { RecentResultsSection } from "./recent-results";

const emptyDashboardData = [] as const;

export default function SpeedtestTrackerWidget({
  options,
  integrationIds,
  width,
  height,
  displayMode = "compact",
}: WidgetComponentProps<"speedtestTracker">) {
  const t = useI18n("widget.speedtestTracker");
  const dashboardQuery = clientApi.widget.speedtestTracker.getDashboard.useQuery({ integrationIds });
  const dashboardData = getUsableWidgetQueryData(dashboardQuery) ?? emptyDashboardData;
  const [advancedRange, setAdvancedRange] = useState("24");
  const isAdvanced = displayMode === "advanced";
  const successfulDashboards = useMemo(() => getAvailableSpeedtestDashboards(dashboardData), [dashboardData]);

  const combined = useMemo(
    () => combineSpeedtestDashboards(successfulDashboards.map(({ dashboard }) => dashboard)),
    [successfulDashboards],
  );

  const rangeHours = isAdvanced ? Number(advancedRange) : 12;
  const cutoff = rangeHours > 0 ? Date.now() - rangeHours * 60 * 60 * 1000 : 0;
  const recentFiltered = combined.recentResults.filter((result) => result.created_at.getTime() > cutoff);

  const showLatestResult = isAdvanced || options.showLatestResult;
  const showStats = isAdvanced || options.showStats;
  const showRecentResults = isAdvanced || options.showRecentResults;
  const showPingGraph = isAdvanced || options.showPingGraph;
  const hasStatSection = (showLatestResult && combined.latestResult !== null) || (showStats && combined.stats !== null);
  const hasChart = showRecentResults && recentFiltered.length > 0;
  const noSectionsEnabled =
    !isAdvanced && !options.showLatestResult && !options.showStats && !options.showRecentResults;
  const advancedSectionWidth = width >= 720 ? width / 2 : width;

  const latest = showLatestResult && combined.latestResult && (
    <LatestResultSection
      result={combined.latestResult}
      width={isAdvanced ? advancedSectionWidth : width}
      compactSurface={!isAdvanced}
    />
  );
  const averages = showStats && combined.stats && (
    <AveragesSection
      stats={combined.stats}
      width={isAdvanced ? advancedSectionWidth : width}
      compactSurface={!isAdvanced}
    />
  );

  if (displayMode === "advanced") {
    const sourceColumns = successfulDashboards.length > 1 && width >= 900 ? 2 : 1;
    const sourcePanelWidth = sourceColumns === 2 ? Math.max(0, (width - 48) / 2) : Math.max(0, width - 32);
    const sourceSectionWidth = sourcePanelWidth >= 720 ? sourcePanelWidth / 2 : sourcePanelWidth;

    return (
      <Box h="100%" pos="relative">
        <Group pos="absolute" top={4} right={8} gap={0} style={{ zIndex: 2 }}>
          <IntegrationErrorIndicator results={dashboardData} />
        </Group>
        <ScrollArea h="100%">
          <Stack gap="md" p="md">
            <SegmentedControl
              size="xs"
              value={advancedRange}
              onChange={setAdvancedRange}
              data={[
                { value: "12", label: t("range.twelveHours") },
                { value: "24", label: t("range.oneDay") },
                { value: "0", label: t("range.lastThirty") },
              ]}
            />
            {successfulDashboards.length === 0 ? (
              <WidgetEmptyState />
            ) : (
              <SimpleGrid cols={sourceColumns} spacing="md">
                {successfulDashboards.map(({ integrationId, integrationName, dashboard }) => {
                  const sourceRecent = dashboard.recentResults.filter((result) => result.created_at.getTime() > cutoff);
                  const sourceHasStats = dashboard.latestResult !== null || dashboard.stats !== null;
                  const sourceHasChart = sourceRecent.length > 0;

                  return (
                    <Card key={integrationId} data-integration-id={integrationId} p="sm" withBorder>
                      <Stack gap="md">
                        <Text size="sm" fw={600} truncate>
                          {integrationName}
                        </Text>
                        {sourceHasStats && (
                          <SimpleGrid cols={sourcePanelWidth >= 720 ? 2 : 1} spacing="md">
                            {dashboard.latestResult && (
                              <LatestResultSection result={dashboard.latestResult} width={sourceSectionWidth} />
                            )}
                            {dashboard.stats && <AveragesSection stats={dashboard.stats} width={sourceSectionWidth} />}
                          </SimpleGrid>
                        )}
                        {sourceHasChart && (
                          <Box h={Math.max(260, Math.min(420, height / 2))}>
                            <RecentResultsSection results={sourceRecent} showPingGraph />
                          </Box>
                        )}
                        {!sourceHasStats && !sourceHasChart && <WidgetEmptyState />}
                      </Stack>
                    </Card>
                  );
                })}
              </SimpleGrid>
            )}
          </Stack>
        </ScrollArea>
      </Box>
    );
  }

  return (
    <Box h="100%" pos="relative">
      <Group pos="absolute" top={4} right={8} gap={0} style={{ zIndex: 2 }}>
        <IntegrationErrorIndicator results={dashboardData} />
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
            <RecentResultsSection results={recentFiltered} showPingGraph={showPingGraph} uppercaseLabels />
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
