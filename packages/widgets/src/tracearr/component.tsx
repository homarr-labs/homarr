"use client";

import { Box, Group, ScrollArea, SimpleGrid, Stack, Text } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { getIntegrationName } from "@homarr/definitions";
import type { TracearrDashboardData } from "@homarr/integrations/types";
import { useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import { IntegrationErrorIndicator } from "../common/integration-error-indicator";
import { getUsableWidgetQueryData } from "../common/query-state";
import { WidgetQueryErrorIndicator } from "../common/query-state-indicator";
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

export const getCompactSectionVisibility = ({
  height,
  showStreams,
  showViolations,
  hasViolations,
  showRecentActivity,
}: {
  height: number;
  showStreams: boolean;
  showViolations: boolean;
  hasViolations: boolean;
  showRecentActivity: boolean;
}) => ({
  violations: showViolations && (hasViolations || height >= 240 || !showStreams),
  recentActivity: showRecentActivity && (height >= 360 || (!showStreams && (!showViolations || !hasViolations))),
});

export default function TracearrWidget({
  options,
  integrationIds,
  width,
  height,
  displayMode = "compact",
}: WidgetComponentProps<"tracearr">) {
  if (integrationIds.length === 0) {
    throw new NoIntegrationDataError();
  }

  return (
    <TracearrContent
      integrationIds={integrationIds}
      options={options}
      width={width}
      height={height}
      displayMode={displayMode}
    />
  );
}

interface TracearrContentProps {
  integrationIds: string[];
  options: WidgetComponentProps<"tracearr">["options"];
  width: number;
  height: number;
  displayMode: "compact" | "advanced";
}

function TracearrContent({ integrationIds, options, width, height, displayMode }: TracearrContentProps) {
  const t = useI18n("widget.tracearr");
  const dashboardQuery = clientApi.widget.tracearr.getDashboard.useQuery({ integrationIds });
  const dashboardData = getUsableWidgetQueryData(dashboardQuery) ?? [];
  const successfulDashboards = dashboardData.flatMap((item) =>
    item.dashboard === null ? [] : [{ ...item, dashboard: item.dashboard }],
  );

  // Merge data from all integrations
  const combinedData = successfulDashboards.reduce<TracearrDashboardData>(
    (acc, { dashboard }) => {
      const { stats, streams, violations, recentActivity } = dashboard;
      const vData = violations ?? { data: [], meta: { total: 0, page: 1, pageSize: 5 } };
      const aData = recentActivity ?? { data: [], meta: { total: 0, page: 1, pageSize: 5 } };

      return {
        stats: {
          activeStreams: acc.stats.activeStreams + stats.activeStreams,
          totalUsers: acc.stats.totalUsers + stats.totalUsers,
          totalSessions: acc.stats.totalSessions + stats.totalSessions,
          recentViolations: acc.stats.recentViolations + stats.recentViolations,
          timestamp: stats.timestamp,
        },
        streams: {
          data: [...acc.streams.data, ...streams.data],
          summary: {
            total: acc.streams.summary.total + streams.summary.total,
            transcodes: acc.streams.summary.transcodes + streams.summary.transcodes,
            directStreams: acc.streams.summary.directStreams + streams.summary.directStreams,
            directPlays: acc.streams.summary.directPlays + streams.summary.directPlays,
            totalBitrate: "—",
            byServer: [...acc.streams.summary.byServer, ...streams.summary.byServer],
          },
        },
        violations: {
          data: [...(acc.violations?.data ?? []), ...vData.data],
          meta: {
            total: (acc.violations?.meta.total ?? 0) + vData.meta.total,
            page: 1,
            pageSize: 5,
          },
        },
        recentActivity: {
          data: [...(acc.recentActivity?.data ?? []), ...aData.data],
          meta: {
            total: (acc.recentActivity?.meta.total ?? 0) + aData.meta.total,
            page: 1,
            pageSize: 5,
          },
        },
      };
    },
    {
      stats: { activeStreams: 0, totalUsers: 0, totalSessions: 0, recentViolations: 0, timestamp: "" },
      streams: {
        data: [],
        summary: { total: 0, transcodes: 0, directStreams: 0, directPlays: 0, totalBitrate: "0", byServer: [] },
      },
      violations: null,
      recentActivity: null,
    },
  );
  const combined: TracearrDashboardData = {
    ...combinedData,
    streams: {
      ...combinedData.streams,
      summary: {
        ...combinedData.streams.summary,
        totalBitrate: formatTotalTracearrBitrate(combinedData.streams.data),
      },
    },
  };

  const isAdvanced = displayMode === "advanced";
  const sectionVisibility = getTracearrSectionVisibility(options, isAdvanced);
  const noSectionsEnabled = Object.values(sectionVisibility).every((isVisible) => !isVisible);

  const compactLimit = height < 220 ? 2 : height < 360 ? 4 : 8;
  const sourcedStreams = successfulDashboards.flatMap(({ integrationId, integrationName, dashboard }) =>
    attachTracearrSource(dashboard.streams.data, { integrationId, integrationName }),
  );
  const sourcedViolations = successfulDashboards.flatMap(({ integrationId, integrationName, dashboard }) =>
    attachTracearrSource(dashboard.violations?.data ?? [], { integrationId, integrationName }),
  );
  const sourcedRecentActivity = successfulDashboards.flatMap(({ integrationId, integrationName, dashboard }) =>
    attachTracearrSource(dashboard.recentActivity?.data ?? [], { integrationId, integrationName }),
  );
  const streams = isAdvanced ? sourcedStreams : sourcedStreams.slice(0, compactLimit);
  const showSource = isAdvanced || dashboardData.length > 1;
  const compactSections = getCompactSectionVisibility({
    height,
    showStreams: sectionVisibility.streams,
    showViolations: sectionVisibility.violations,
    hasViolations: sourcedViolations.length > 0,
    showRecentActivity: sectionVisibility.recentActivity,
  });

  if (isAdvanced) {
    const isTwoColumn = width >= ADVANCED_GRID_BREAKPOINT;
    const columnWidth = getAdvancedColumnWidth(width, isTwoColumn);
    return (
      <Box h="100%" pos="relative">
        <Group pos="absolute" top={4} right={8} gap={0} style={{ zIndex: 2 }}>
          <IntegrationErrorIndicator results={dashboardData} />
          <WidgetQueryErrorIndicator error={dashboardQuery.error} label={getIntegrationName("tracearr")} />
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
                <StatsBar stats={combined.stats} summary={combined.streams.summary} width={columnWidth} />
              )}
              {sectionVisibility.streams && (
                <StreamsList streams={streams} width={columnWidth} showSource={showSource} />
              )}
            </Stack>
            <Stack gap="sm">
              {sectionVisibility.violations && (
                <ViolationsList violations={sourcedViolations} showSource={showSource} />
              )}
              {sectionVisibility.recentActivity && (
                <RecentActivityList sessions={sourcedRecentActivity} showSource={showSource} />
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
        <WidgetQueryErrorIndicator error={dashboardQuery.error} label={getIntegrationName("tracearr")} />
      </Group>
      <ScrollArea h="100%">
        <Stack gap="xs" p="xs">
          {showSource && (
            <Text size="xs" c="dimmed" lineClamp={1}>
              {successfulDashboards.map(({ integrationName }) => integrationName).join(" · ")}
            </Text>
          )}
          {sectionVisibility.stats && (
            <StatsBar stats={combined.stats} summary={combined.streams.summary} width={width} />
          )}
          {compactSections.violations && (
            <ViolationsList violations={sourcedViolations.slice(0, compactLimit)} showSource={showSource} />
          )}
          {sectionVisibility.streams && <StreamsList streams={streams} width={width} showSource={showSource} />}
          {compactSections.recentActivity && (
            <RecentActivityList sessions={sourcedRecentActivity.slice(0, compactLimit)} showSource={showSource} />
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
