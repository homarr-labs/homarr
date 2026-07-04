"use client";

import { ScrollArea, Stack, Text } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import type { TracearrDashboardData } from "@homarr/integrations/types";
import { useScopedI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import { NoIntegrationDataError } from "../errors/no-data-integration";
import { RecentActivityList } from "./recent-activity-section";
import { StatsBar } from "./stats-section";
import { StreamsList } from "./streams-section";
import { ViolationsList } from "./violations-section";

export default function TracearrWidget({ options, integrationIds, width }: WidgetComponentProps<"tracearr">) {
  if (integrationIds.length === 0) {
    throw new NoIntegrationDataError();
  }

  return <TracearrContent integrationIds={integrationIds} options={options} width={width} />;
}

interface TracearrContentProps {
  integrationIds: string[];
  options: WidgetComponentProps<"tracearr">["options"];
  width: number;
}

function TracearrContent({ integrationIds, options, width }: TracearrContentProps) {
  const t = useScopedI18n("widget.tracearr");
  const { data: dashboardData = [] } = clientApi.widget.tracearr.getDashboard.useQuery({ integrationIds });

  // Merge data from all integrations
  const combined = dashboardData.reduce<TracearrDashboardData>(
    (acc, item) => {
      const { stats, streams, violations, recentActivity } = item.dashboard;
      const vData = violations ?? { data: [], meta: { total: 0, page: 1, pageSize: 5 } };
      const aData = recentActivity ?? { data: [], meta: { total: 0, page: 1, pageSize: 5 } };
      const sData = streams ?? { data: [], summary: { total: 0, transcodes: 0, directStreams: 0, directPlays: 0, totalBitrate: "0", byServer: [] } };

      return {
        stats: {
          activeStreams: acc.stats.activeStreams + (stats?.activeStreams ?? 0),
          totalUsers: acc.stats.totalUsers + (stats?.totalUsers ?? 0),
          totalSessions: acc.stats.totalSessions + (stats?.totalSessions ?? 0),
          recentViolations: acc.stats.recentViolations + (stats?.recentViolations ?? 0),
          timestamp: stats?.timestamp ?? "",
        },
        streams: {
          data: [...acc.streams.data, ...(sData.data ?? [])],
          summary: {
            total: acc.streams.summary.total + (sData.summary?.total ?? 0),
            transcodes: acc.streams.summary.transcodes + (sData.summary?.transcodes ?? 0),
            directStreams: acc.streams.summary.directStreams + (sData.summary?.directStreams ?? 0),
            directPlays: acc.streams.summary.directPlays + (sData.summary?.directPlays ?? 0),
            totalBitrate: sData.summary?.totalBitrate ?? "0",
            byServer: [...acc.streams.summary.byServer, ...(sData.summary?.byServer ?? [])],
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

  const noSectionsEnabled =
    !options.showStats && !options.showStreams && !options.showRecentActivity && !options.showViolations;

  return (
    <ScrollArea h="100%">
      <Stack gap="xs" p="xs">
        {options.showStats && <StatsBar stats={combined.stats} summary={combined.streams.summary} width={width} />}
        {options.showStreams && <StreamsList streams={combined.streams.data} width={width} />}
        {options.showViolations && <ViolationsList violations={combined.violations?.data ?? []} />}
        {options.showRecentActivity && <RecentActivityList sessions={combined.recentActivity?.data ?? []} />}
        {noSectionsEnabled && (
          <Text c="dimmed" ta="center">
            {t("noSectionsEnabled")}
          </Text>
        )}
      </Stack>
    </ScrollArea>
  );
}
