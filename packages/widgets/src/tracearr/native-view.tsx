"use client";

import { Box, Group, ScrollArea, SimpleGrid, Stack, Text } from "@mantine/core";

import type { RouterOutputs } from "@homarr/api";
import type { TracearrDashboardData } from "@homarr/integrations/types";
import type { ReactNode } from "react";
import type { TracearrViewDateProps, TracearrViewDurationProps } from "./native-view-types";
import type { formatTotalTracearrBitrate } from "./bitrate";

import type { WidgetComponentProps } from "../definition";
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

export interface TracearrViewProps extends TracearrViewDateProps, TracearrViewDurationProps {
  dashboardData: RouterOutputs["widget"]["tracearr"]["getDashboard"];
  options: WidgetComponentProps<"tracearr">["options"];
  width: number;
  displayMode: "compact" | "advanced";
  queryIndicators: ReactNode;
  formatTotalTracearrBitrate: typeof formatTotalTracearrBitrate;
}

export function TracearrView({
  dashboardData,
  options,
  width,
  displayMode,
  t,
  locale,
  formatDuration,
  queryIndicators,
  formatTotalTracearrBitrate,
}: TracearrViewProps) {
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

  const sourcedStreams = successfulDashboards.flatMap(({ integrationId, integrationName, dashboard }) =>
    attachTracearrSource(dashboard.streams.data, { integrationId, integrationName }),
  );
  const sourcedViolations = successfulDashboards.flatMap(({ integrationId, integrationName, dashboard }) =>
    attachTracearrSource(dashboard.violations?.data ?? [], { integrationId, integrationName }),
  );
  const sourcedRecentActivity = successfulDashboards.flatMap(({ integrationId, integrationName, dashboard }) =>
    attachTracearrSource(dashboard.recentActivity?.data ?? [], { integrationId, integrationName }),
  );
  const showSource = isAdvanced || dashboardData.length > 1;

  if (isAdvanced) {
    const isTwoColumn = width >= ADVANCED_GRID_BREAKPOINT;
    const columnWidth = getAdvancedColumnWidth(width, isTwoColumn);
    return (
      <Box h="100%" pos="relative">
        <Group pos="absolute" top={4} right={8} gap={0} style={{ zIndex: 2 }}>
          {queryIndicators}
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
                <StatsBar
                  stats={combined.stats}
                  summary={combined.streams.summary}
                  width={columnWidth}
                  transparent
                  t={t}
                />
              )}
              {sectionVisibility.streams && (
                <StreamsList
                  streams={sourcedStreams}
                  width={columnWidth}
                  showSource={showSource}
                  transparent
                  t={t}
                  formatDuration={formatDuration}
                />
              )}
            </Stack>
            <Stack gap="sm">
              {sectionVisibility.violations && (
                <ViolationsList
                  violations={sourcedViolations}
                  showSource={showSource}
                  transparent
                  t={t}
                  locale={locale}
                />
              )}
              {sectionVisibility.recentActivity && (
                <RecentActivityList
                  sessions={sourcedRecentActivity}
                  showSource={showSource}
                  transparent
                  t={t}
                  locale={locale}
                />
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
        {queryIndicators}
      </Group>
      <ScrollArea h="100%">
        <Stack gap="xs" p="xs">
          {showSource && (
            <Text size="xs" c="dimmed" lineClamp={1}>
              {successfulDashboards.map(({ integrationName }) => integrationName).join(" · ")}
            </Text>
          )}
          {sectionVisibility.stats && (
            <StatsBar stats={combined.stats} summary={combined.streams.summary} width={width} t={t} />
          )}
          {sectionVisibility.streams && (
            <StreamsList
              streams={sourcedStreams}
              width={width}
              showSource={showSource}
              t={t}
              formatDuration={formatDuration}
            />
          )}
          {sectionVisibility.violations && (
            <ViolationsList violations={sourcedViolations} showSource={showSource} t={t} locale={locale} />
          )}
          {sectionVisibility.recentActivity && (
            <RecentActivityList sessions={sourcedRecentActivity} showSource={showSource} t={t} locale={locale} />
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
