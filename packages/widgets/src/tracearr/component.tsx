"use client";

import { Box, Group, ScrollArea, SimpleGrid, Stack, Text } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import { IntegrationErrorIndicator } from "../common/integration-error-indicator";
import { getUsableWidgetQueryData } from "../common/query-state";
import { NoIntegrationDataError } from "../errors/no-data-integration";
import { formatTotalTracearrBitrate } from "./bitrate";
import { RecentActivityList } from "./recent-activity-section";
import { attachTracearrSource } from "./source";
import { StatsBar } from "./stats-section";
import { StreamsList } from "./streams-section";
import { ViolationsList } from "./violations-section";

const ADVANCED_GRID_BREAKPOINT = 800;
const ADVANCED_GRID_GAP_PX = 16;
const ADVANCED_GRID_PADDING_PX = 16;

type TracearrSectionOptions = Pick<
  WidgetComponentProps<"tracearr">["options"],
  "showStats" | "showStreams" | "showViolations" | "showRecentActivity"
>;

export const getTracearrSectionVisibility = (options: TracearrSectionOptions, isAdvanced: boolean) => ({
  stats: isAdvanced || options.showStats,
  streams: isAdvanced || options.showStreams,
  violations: isAdvanced || options.showViolations,
  recentActivity: isAdvanced || options.showRecentActivity,
});

export default function TracearrWidget({
  options,
  integrationIds,
  width,
  displayMode = "compact",
}: WidgetComponentProps<"tracearr">) {
  if (integrationIds.length === 0) {
    throw new NoIntegrationDataError();
  }

  return <TracearrContent integrationIds={integrationIds} options={options} width={width} displayMode={displayMode} />;
}

interface TracearrContentProps {
  integrationIds: string[];
  options: WidgetComponentProps<"tracearr">["options"];
  width: number;
  displayMode: "compact" | "advanced";
}

function TracearrContent({ integrationIds, options, width, displayMode }: TracearrContentProps) {
  const t = useI18n("widget.tracearr");
  const dashboardQuery = clientApi.widget.tracearr.getDashboard.useQuery({ integrationIds });
  const dashboardData = getUsableWidgetQueryData(dashboardQuery) ?? [];
  const successfulDashboards = dashboardData.flatMap((item) =>
    item.dashboard === null ? [] : [{ ...item, dashboard: item.dashboard }],
  );

  const sourcedStreams = successfulDashboards.flatMap(({ integrationId, integrationName, dashboard }) =>
    attachTracearrSource(dashboard.streams.data, { integrationId, integrationName }),
  );
  const sourcedViolations = successfulDashboards.flatMap(({ integrationId, integrationName, dashboard }) =>
    attachTracearrSource(dashboard.violations?.data ?? [], { integrationId, integrationName }),
  );
  const sourcedRecentActivity = successfulDashboards.flatMap(({ integrationId, integrationName, dashboard }) =>
    attachTracearrSource(dashboard.recentActivity?.data ?? [], { integrationId, integrationName }),
  );
  const combined = {
    stats: { activeStreams: 0, totalUsers: 0 },
    summary: { total: 0, transcodes: 0, totalBitrate: formatTotalTracearrBitrate(sourcedStreams) },
  };
  for (const { dashboard } of successfulDashboards) {
    combined.stats.activeStreams += dashboard.stats.activeStreams;
    combined.stats.totalUsers += dashboard.stats.totalUsers;
    combined.summary.total += dashboard.streams.summary.total;
    combined.summary.transcodes += dashboard.streams.summary.transcodes;
  }

  const isAdvanced = displayMode === "advanced";
  const sectionVisibility = getTracearrSectionVisibility(options, isAdvanced);
  const noSectionsEnabled = Object.values(sectionVisibility).every((isVisible) => !isVisible);
  const showSource = isAdvanced || dashboardData.length > 1;

  if (isAdvanced) {
    const isTwoColumn = width >= ADVANCED_GRID_BREAKPOINT;
    const columnWidth = getAdvancedColumnWidth(width, isTwoColumn);
    return (
      <Box h="100%" pos="relative">
        <Group pos="absolute" top={4} right={8} gap={0} style={{ zIndex: 2 }}>
          <IntegrationErrorIndicator results={dashboardData} />
        </Group>
        <ScrollArea h="100%">
          <SimpleGrid
            cols={isTwoColumn ? 2 : 1}
            spacing={`${ADVANCED_GRID_GAP_PX}px`}
            p={`${ADVANCED_GRID_PADDING_PX}px`}
          >
            <Stack gap="sm">
              <Text size="xs" c="dimmed" lineClamp={1}>
                {successfulDashboards.map(({ integrationName }) => integrationName).join(" · ")}
              </Text>
              {sectionVisibility.stats && (
                <StatsBar stats={combined.stats} summary={combined.summary} width={columnWidth} transparent />
              )}
              {sectionVisibility.streams && (
                <StreamsList streams={sourcedStreams} width={columnWidth} showSource={showSource} transparent />
              )}
            </Stack>
            <Stack gap="sm">
              {sectionVisibility.violations && (
                <ViolationsList violations={sourcedViolations} showSource={showSource} transparent />
              )}
              {sectionVisibility.recentActivity && (
                <RecentActivityList sessions={sourcedRecentActivity} showSource={showSource} transparent />
              )}
            </Stack>
          </SimpleGrid>
        </ScrollArea>
      </Box>
    );
  }

  return (
    <Box h="100%" pos="relative">
      <Group pos="absolute" top={4} right={8} gap={0} style={{ zIndex: 2 }}>
        <IntegrationErrorIndicator results={dashboardData} />
      </Group>
      <ScrollArea h="100%">
        <Stack gap="xs" p="xs">
          {showSource && (
            <Text size="xs" c="dimmed" lineClamp={1}>
              {successfulDashboards.map(({ integrationName }) => integrationName).join(" · ")}
            </Text>
          )}
          {sectionVisibility.stats && <StatsBar stats={combined.stats} summary={combined.summary} width={width} />}
          {sectionVisibility.streams && <StreamsList streams={sourcedStreams} width={width} showSource={showSource} />}
          {sectionVisibility.violations && <ViolationsList violations={sourcedViolations} showSource={showSource} />}
          {sectionVisibility.recentActivity && (
            <RecentActivityList sessions={sourcedRecentActivity} showSource={showSource} />
          )}
          {noSectionsEnabled && (
            <Text c="dimmed" ta="center">
              {t("noSectionsEnabled")}
            </Text>
          )}
        </Stack>
      </ScrollArea>
    </Box>
  );
}

export const getAdvancedColumnWidth = (width: number, isTwoColumn: boolean) => {
  const contentWidth = Math.max(0, width - ADVANCED_GRID_PADDING_PX * 2);
  return isTwoColumn ? Math.max(0, (contentWidth - ADVANCED_GRID_GAP_PX) / 2) : contentWidth;
};
