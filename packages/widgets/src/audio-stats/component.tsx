"use client";

import { Badge, Group, ScrollArea, SimpleGrid, Stack, Text } from "@mantine/core";
import { getQueryKey } from "@trpc/react-query";

import { clientApi } from "@homarr/api/client";
import { formatBytes, formatDuration } from "@homarr/common";
import type { AudiobookshelfDashboardData } from "@homarr/integrations/types";

import { WidgetEmptyState } from "../common/empty-state";
import type { WidgetComponentProps } from "../definition";
import { setWidgetRuntimeQueries } from "../definition";
import { AudioStatsContent } from "./audio-stats-content";

export default function AudioStatsWidget({
  integrationIds,
  options,
  width,
  height,
  displayMode = "compact",
  widgetStateRef,
}: WidgetComponentProps<"audioStats">) {
  const statsInput = { integrationId: integrationIds[0] ?? "" };
  const { data: response } = clientApi.widget.audioStats.getStats.useQuery(statsInput);
  const streamsInput = { integrationIds, showOnlyPlaying: false };
  const streamsEnabled = displayMode === "advanced" && response?.kind === "navidrome";
  const { data: streamResults = [] } = clientApi.widget.mediaServer.getCurrentStreams.useQuery(streamsInput, {
    enabled: streamsEnabled,
  });
  setWidgetRuntimeQueries(widgetStateRef, [
    getQueryKey(clientApi.widget.audioStats.getStats, statsInput, "query"),
    ...(streamsEnabled ? [getQueryKey(clientApi.widget.mediaServer.getCurrentStreams, streamsInput, "query")] : []),
  ]);

  if (!response) return <WidgetEmptyState />;

  const summary = (
    <AudioStatsContent
      backend={response.kind}
      stats={response.data}
      options={{ ...options, compactMode: displayMode === "compact" && (options.compactMode || height < 160) }}
      width={width}
    />
  );
  if (displayMode === "compact") return summary;

  const sessions = streamResults.flatMap((result) =>
    result.sessions.map((session) => ({ integrationId: result.integrationId, session })),
  );
  const audiobookStats = response.kind === "audiobookshelf" ? (response.data as AudiobookshelfDashboardData) : null;
  return (
    <Stack h="100%" gap="lg" p="md">
      <div style={{ minHeight: 150 }}>{summary}</div>
      <ScrollArea style={{ flex: 1, minHeight: 0 }}>
        {response.kind === "navidrome" ? (
          <SimpleGrid cols={width >= 760 ? 2 : 1} spacing="xs">
            {sessions.map(({ integrationId, session }) => {
              const currentlyPlaying = session.currentlyPlaying;
              if (!currentlyPlaying) return null;
              return (
                <Group key={`${integrationId}:${session.sessionId}`} justify="space-between" wrap="nowrap" p="sm">
                  <Stack gap={0} style={{ minWidth: 0 }}>
                    <Text size="sm" fw={600} truncate>
                      {currentlyPlaying.name}
                    </Text>
                    <Text size="xs" c="dimmed" truncate>
                      {currentlyPlaying.seasonName ?? currentlyPlaying.albumName ?? session.user.username}
                    </Text>
                  </Stack>
                  <Badge variant="light">{session.sessionName}</Badge>
                </Group>
              );
            })}
          </SimpleGrid>
        ) : (
          <SimpleGrid cols={width >= 760 ? 2 : 1} spacing="xs">
            {(audiobookStats?.libraries ?? []).map((library) => (
              <Stack key={library.id} gap={2} p="sm">
                <Group justify="space-between" wrap="nowrap">
                  <Text size="sm" fw={600} truncate>
                    {library.name}
                  </Text>
                  <Badge size="xs" variant="light">
                    {library.totalItems}
                  </Badge>
                </Group>
                <Text size="xs" c="dimmed">
                  {library.totalDurationSeconds === null ? "—" : formatDuration(library.totalDurationSeconds * 1000)} ·{" "}
                  {library.totalSizeBytes === null ? "—" : formatBytes(library.totalSizeBytes)}
                </Text>
              </Stack>
            ))}
          </SimpleGrid>
        )}
      </ScrollArea>
    </Stack>
  );
}
