"use client";

import {
  Avatar,
  Badge,
  Box,
  Group,
  Paper,
  Progress,
  ScrollArea,
  SimpleGrid,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconDevices,
  IconNetwork,
  IconPlayerPause,
  IconPlayerPlay,
  IconUsers,
  IconVideo,
} from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import type {
  TracearrDashboardData,
  TracearrHistorySession,
  TracearrStream,
  TracearrViolation,
} from "@homarr/integrations/types";
import { useScopedI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";

export default function TracearrWidget({
  options,
  integrationIds,
  width,
  isEditMode,
}: WidgetComponentProps<"tracearr">) {
  const t = useScopedI18n("widget.tracearr");

  if (integrationIds.length === 0) {
    return (
      <Stack align="center" justify="center" h="100%">
        <Text c="dimmed">{t("error.noIntegration")}</Text>
      </Stack>
    );
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

// --- Stats Section ---

function StatsBar({
  stats,
  summary,
  width,
}: {
  stats: TracearrDashboardData["stats"];
  summary: TracearrDashboardData["streams"]["summary"];
  width: number;
}) {
  const t = useScopedI18n("widget.tracearr");
  const cols = width > 400 ? 4 : width > 250 ? 2 : 1;

  return (
    <SimpleGrid cols={cols} spacing="xs">
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
        <Stack gap={0} style={{ overflow: "hidden" }}>
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

// --- Streams Section ---

function StreamsList({ streams, width }: { streams: TracearrStream[]; width: number }) {
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
        <StreamCard key={stream.id} stream={stream} compact={width < 300} />
      ))}
    </Stack>
  );
}

function StreamCard({ stream, compact }: { stream: TracearrStream; compact: boolean }) {
  const progressPercent =
    stream.durationMs && stream.durationMs > 0 ? (stream.progressMs / stream.durationMs) * 100 : 0;

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
    <Paper p="xs" radius="lg" withBorder style={{ position: "relative", overflow: "hidden" }}>
      {stream.posterUrl && (
        <Box
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            width: "50%",
            backgroundImage: `url(${stream.posterUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center right",
            opacity: 0.25,
            maskImage: "linear-gradient(to left, black 20%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to left, black 20%, transparent 100%)",
            pointerEvents: "none",
          }}
        />
      )}
      <Stack gap={4} style={{ position: "relative" }}>
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
          <Group gap={4} wrap={compact ? "wrap" : "nowrap"}>
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

// --- Violations Section ---

function ViolationsList({ violations }: { violations: TracearrViolation[] }) {
  const t = useScopedI18n("widget.tracearr");

  return (
    <Stack gap={4}>
      <Text size="xs" fw={600} c="dimmed" tt="uppercase">
        {t("violations.title")}
      </Text>
      {violations.length === 0 ? (
        <Text size="xs" c="dimmed" ta="center">
          {t("violations.empty")}
        </Text>
      ) : (
        <Stack gap="xs">
          {violations.map((violation) => (
            <Paper key={violation.id} p="xs" radius="lg" withBorder>
              <Group justify="space-between" wrap="nowrap">
                <Group gap="xs" wrap="nowrap" style={{ overflow: "hidden" }}>
                  <IconAlertTriangle
                    size={14}
                    color={
                      violation.severity === "high"
                        ? "var(--mantine-color-red-6)"
                        : violation.severity === "medium"
                          ? "var(--mantine-color-orange-6)"
                          : "var(--mantine-color-yellow-6)"
                    }
                  />
                  <Avatar src={violation.user.avatarUrl} alt={violation.user.username} radius="xl" size="sm" />
                  <Stack gap={0} style={{ overflow: "hidden" }}>
                    <Text size="sm" fw={500} lineClamp={1}>
                      {violation.user.username}
                    </Text>
                    <Text size="xs" c="dimmed" lineClamp={1}>
                      {t("violations.rule")}: {violation.rule.name}
                    </Text>
                  </Stack>
                </Group>
                <Stack gap={4} align="center">
                  <Badge
                    size="xs"
                    variant="light"
                    color={
                      violation.severity === "high" ? "red" : violation.severity === "medium" ? "orange" : "yellow"
                    }
                  >
                    {violation.severity}
                  </Badge>
                  <Text size="xs" c="dimmed" lineClamp={1}>
                    {new Date(violation.createdAt).toLocaleDateString()}
                  </Text>
                </Stack>
              </Group>
            </Paper>
          ))}
        </Stack>
      )}
    </Stack>
  );
}

// --- Recent Activity Section ---

function RecentActivityList({ sessions }: { sessions: TracearrHistorySession[] }) {
  const t = useScopedI18n("widget.tracearr");

  return (
    <Stack gap={4}>
      <Text size="xs" fw={600} c="dimmed" tt="uppercase">
        {t("recentActivity.title")}
      </Text>
      {sessions.length === 0 ? (
        <Text size="xs" c="dimmed" ta="center">
          {t("recentActivity.empty")}
        </Text>
      ) : (
        <Stack gap="xs">
          {sessions.map((session) => {
            const mediaLabel =
              session.mediaType === "episode" && session.showTitle
                ? `${session.showTitle} - S${session.seasonNumber ?? 0}E${session.episodeNumber ?? 0}`
                : session.mediaTitle;

            return (
              <Paper key={session.id} p="sm" radius="lg" withBorder>
                <Group justify="space-between" wrap="nowrap">
                  <Group gap="xs" wrap="nowrap" style={{ overflow: "hidden" }}>
                    <Avatar src={session.user.avatarUrl} alt={session.user.username} radius="xl" size="sm" />
                    <Stack gap={0} style={{ overflow: "hidden" }}>
                      <Text size="sm" fw={500} lineClamp={1}>
                        {mediaLabel}
                      </Text>
                      <Text size="xs" c="dimmed" lineClamp={1}>
                        {session.user.username} • {session.serverName}
                      </Text>
                    </Stack>
                  </Group>
                  <Stack gap={4} align="center">
                    <Badge size="xs" variant="light" color={session.watched ? "green" : "blue"}>
                      {session.watched ? "Watched" : "Partial"}
                    </Badge>
                    <Text size="xs" c="dimmed" lineClamp={1}>
                      {new Date(session.startedAt).toLocaleDateString()}
                    </Text>
                  </Stack>
                </Group>
              </Paper>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}

// --- Utility ---

function formatDuration(milliseconds: number) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
