"use client";

import { Badge, Group, Paper, Progress, ScrollArea, SimpleGrid, Stack, Text, Tooltip } from "@mantine/core";
import { IconDevices, IconNetwork, IconPlayerPause, IconPlayerPlay, IconUsers, IconVideo } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import type { TracearrDashboardData, TracearrStream } from "@homarr/integrations/types";
import { useScopedI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";

export default function TracearrWidget({ options, integrationIds }: WidgetComponentProps<"tracearr">) {
  const t = useScopedI18n("widget.tracearr");

  if (integrationIds.length === 0) {
    return (
      <Stack align="center" justify="center" h="100%">
        <Text c="dimmed">{t("error.noIntegration")}</Text>
      </Stack>
    );
  }

  return <TracearrContent integrationIds={integrationIds} options={options} />;
}

interface TracearrContentProps {
  integrationIds: string[];
  options: WidgetComponentProps<"tracearr">["options"];
}

function TracearrContent({ integrationIds, options }: TracearrContentProps) {
  const [dashboardData] = clientApi.widget.tracearr.getDashboard.useSuspenseQuery({ integrationIds });

  const utils = clientApi.useUtils();
  clientApi.widget.tracearr.subscribeToDashboard.useSubscription(
    { integrationIds },
    {
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
    (acc, item) => ({
      stats: {
        activeStreams: acc.stats.activeStreams + item.dashboard.stats.activeStreams,
        totalUsers: acc.stats.totalUsers + item.dashboard.stats.totalUsers,
        totalSessions: acc.stats.totalSessions + item.dashboard.stats.totalSessions,
        recentViolations: acc.stats.recentViolations + item.dashboard.stats.recentViolations,
        timestamp: item.dashboard.stats.timestamp,
      },
      streams: {
        data: [...acc.streams.data, ...item.dashboard.streams.data],
        summary: {
          total: acc.streams.summary.total + item.dashboard.streams.summary.total,
          transcodes: acc.streams.summary.transcodes + item.dashboard.streams.summary.transcodes,
          directStreams: acc.streams.summary.directStreams + item.dashboard.streams.summary.directStreams,
          directPlays: acc.streams.summary.directPlays + item.dashboard.streams.summary.directPlays,
          totalBitrate: item.dashboard.streams.summary.totalBitrate,
          byServer: [...acc.streams.summary.byServer, ...item.dashboard.streams.summary.byServer],
        },
      },
    }),
    {
      stats: { activeStreams: 0, totalUsers: 0, totalSessions: 0, recentViolations: 0, timestamp: "" },
      streams: {
        data: [],
        summary: { total: 0, transcodes: 0, directStreams: 0, directPlays: 0, totalBitrate: "0", byServer: [] },
      },
    },
  );

  return (
    <ScrollArea h="100%">
      <Stack gap="xs" p="xs">
        {options.showStats && <StatsBar stats={combined.stats} summary={combined.streams.summary} />}
        {options.showStreams && <StreamsList streams={combined.streams.data} />}
        {!options.showStats && !options.showStreams && (
          <Text c="dimmed" ta="center">
            No sections enabled
          </Text>
        )}
      </Stack>
    </ScrollArea>
  );
}

function StatsBar({
  stats,
  summary,
}: {
  stats: TracearrDashboardData["stats"];
  summary: TracearrDashboardData["streams"]["summary"];
}) {
  const t = useScopedI18n("widget.tracearr");

  return (
    <SimpleGrid cols={4} spacing="xs">
      <StatCard icon={<IconVideo size={16} />} label={t("stats.activeStreams")} value={stats.activeStreams} />
      <StatCard icon={<IconUsers size={16} />} label={t("stats.totalUsers")} value={stats.totalUsers} />
      <StatCard
        icon={<IconDevices size={16} />}
        label={t("stats.transcodes")}
        value={`${summary.transcodes}/${summary.total}`}
      />
      <StatCard icon={<IconNetwork size={16} />} label={t("stats.bandwidth")} value={summary.totalBitrate} />
    </SimpleGrid>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <Paper p="xs" radius="lg" withBorder>
      <Group gap={4} wrap="nowrap">
        {icon}
        <Stack gap={0}>
          <Text size="xs" c="dimmed" lineClamp={1}>
            {label}
          </Text>
          <Text size="sm" fw={600}>
            {value}
          </Text>
        </Stack>
      </Group>
    </Paper>
  );
}

function StreamsList({ streams }: { streams: TracearrStream[] }) {
  const t = useScopedI18n("widget.tracearr");

  if (streams.length === 0) {
    return (
      <Text c="dimmed" ta="center" size="sm">
        {t("streams.empty")}
      </Text>
    );
  }

  return (
    <Stack gap="xs">
      {streams.map((stream) => (
        <StreamCard key={stream.id} stream={stream} />
      ))}
    </Stack>
  );
}

function StreamCard({ stream }: { stream: TracearrStream }) {
  const progressPercent =
    stream.durationMs && stream.durationMs > 0 ? (stream.progressMs / stream.durationMs) * 100 : 0;

  const formatDuration = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  };

  const mediaLabel =
    stream.mediaType === "episode" && stream.showTitle
      ? `${stream.showTitle} - S${stream.seasonNumber ?? 0}E${stream.episodeNumber ?? 0} - ${stream.mediaTitle}`
      : stream.mediaTitle;

  const videoDecisionLabel =
    stream.videoDecision === "directplay"
      ? "Direct Play"
      : stream.videoDecision === "transcode"
        ? "Transcode"
        : stream.videoDecision === "copy"
          ? "Direct Stream"
          : null;

  return (
    <Paper p="xs" radius="lg" withBorder>
      <Stack gap={4}>
        <Group justify="space-between" wrap="nowrap">
          <Group gap="xs" wrap="nowrap" style={{ overflow: "hidden" }}>
            {stream.state === "playing" ? (
              <IconPlayerPlay size={14} color="var(--mantine-color-green-6)" />
            ) : (
              <IconPlayerPause size={14} color="var(--mantine-color-yellow-6)" />
            )}
            <Text size="sm" fw={600} lineClamp={1}>
              {stream.username}
            </Text>
          </Group>
          <Group gap={4} wrap="nowrap">
            {stream.resolution && (
              <Badge size="xs" variant="light">
                {stream.resolution}
              </Badge>
            )}
            {videoDecisionLabel && (
              <Badge
                size="xs"
                variant="light"
                color={
                  stream.videoDecision === "directplay"
                    ? "green"
                    : stream.videoDecision === "transcode"
                      ? "orange"
                      : "blue"
                }
              >
                {videoDecisionLabel}
              </Badge>
            )}
          </Group>
        </Group>

        <Tooltip label={mediaLabel} openDelay={300}>
          <Text size="xs" c="dimmed" lineClamp={1}>
            {mediaLabel}
          </Text>
        </Tooltip>

        {stream.durationMs && stream.durationMs > 0 && (
          <Group gap="xs" align="center">
            <Progress value={progressPercent} size="xs" style={{ flex: 1 }} radius="xl" />
            <Text size="xs" c="dimmed" style={{ whiteSpace: "nowrap" }}>
              {formatDuration(stream.progressMs)} / {formatDuration(stream.durationMs)}
            </Text>
          </Group>
        )}

        <Group gap="xs" wrap="nowrap">
          {stream.device && (
            <Text size="xs" c="dimmed" lineClamp={1}>
              {stream.player ?? stream.device}
            </Text>
          )}
        </Group>
      </Stack>
    </Paper>
  );
}
