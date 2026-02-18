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

export default function TracearrWidget({
  options,
  integrationIds,
  width,
  isEditMode,
}: WidgetComponentProps<"tracearr">) {
  if (integrationIds.length === 0) {
    throw new NoIntegrationDataError();
  }

  return <TracearrContent integrationIds={integrationIds} options={options} width={width} isEditMode={isEditMode} />;
}

interface TracearrContentProps {
  integrationIds: string[];
  options: WidgetComponentProps<"tracearr">["options"];
  width: number;
  isEditMode: boolean;
}

function TracearrContent({ integrationIds, options, width, isEditMode }: TracearrContentProps) {
  const t = useScopedI18n("widget.tracearr");
  const [dashboardData] = clientApi.widget.tracearr.getDashboard.useSuspenseQuery({ integrationIds });

  const utils = clientApi.useUtils();
  clientApi.widget.tracearr.subscribeToDashboard.useSubscription(
    { integrationIds },
    {
      enabled: !isEditMode,
      onData(newData) {
        utils.widget.tracearr.getDashboard.setData({ integrationIds }, (prevData) => {
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

  // Merge data from all integrations
  const combined = dashboardData.reduce<TracearrDashboardData>(
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
            totalBitrate: streams.summary.totalBitrate,
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
