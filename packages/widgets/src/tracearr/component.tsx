"use client";

import { ScrollArea, SimpleGrid, Stack, Text } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import type { TracearrDashboardData } from "@homarr/integrations/types";
import { useScopedI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import { NoIntegrationDataError } from "../errors/no-data-integration";
import { formatTotalTracearrBitrate } from "./bitrate";
import { RecentActivityList } from "./recent-activity-section";
import { StatsBar } from "./stats-section";
import { StreamsList } from "./streams-section";
import { ViolationsList } from "./violations-section";

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
  const t = useScopedI18n("widget.tracearr");
  const { data: dashboardData = [] } = clientApi.widget.tracearr.getDashboard.useQuery({ integrationIds });

  // Merge data from all integrations
  const combinedData = dashboardData.reduce<TracearrDashboardData>(
    (acc, item) => {
      const { stats, streams, violations, recentActivity } = item.dashboard;
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

  const noSectionsEnabled =
    !options.showStats && !options.showStreams && !options.showRecentActivity && !options.showViolations;

  const compactLimit = height < 220 ? 2 : height < 360 ? 4 : 8;
  const streams = displayMode === "advanced" ? combined.streams.data : combined.streams.data.slice(0, compactLimit);
  const violations = combined.violations?.data ?? [];
  const recentActivity = combined.recentActivity?.data ?? [];

  if (displayMode === "advanced") {
    return (
      <ScrollArea h="100%">
        <SimpleGrid cols={width >= 800 ? 2 : 1} spacing="md" p="md">
          <Stack gap="sm">
            {options.showStats && (
              <StatsBar stats={combined.stats} summary={combined.streams.summary} width={width / 2} />
            )}
            {options.showStreams && <StreamsList streams={streams} width={width / 2} />}
          </Stack>
          <Stack gap="sm">
            {options.showViolations && <ViolationsList violations={violations} />}
            {options.showRecentActivity && <RecentActivityList sessions={recentActivity} />}
          </Stack>
        </SimpleGrid>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea h="100%">
      <Stack gap="xs" p="xs">
        {options.showStats && <StatsBar stats={combined.stats} summary={combined.streams.summary} width={width} />}
        {options.showStreams && <StreamsList streams={streams} width={width} />}
        {options.showViolations && <ViolationsList violations={violations.slice(0, compactLimit)} />}
        {options.showRecentActivity && <RecentActivityList sessions={recentActivity.slice(0, compactLimit)} />}
        {noSectionsEnabled && (
          <Text c="dimmed" ta="center">
            {t("noSectionsEnabled")}
          </Text>
        )}
      </Stack>
    </ScrollArea>
  );
}
