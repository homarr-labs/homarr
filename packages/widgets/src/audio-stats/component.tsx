"use client";

import { Badge, Box, Group, ScrollArea, SimpleGrid, Stack, Text } from "@mantine/core";
import { getQueryKey } from "@trpc/react-query";

import { clientApi } from "@homarr/api/client";
import { formatBytes, formatDuration } from "@homarr/common";
import type { AudiobookshelfDashboardData } from "@homarr/integrations/types";

import { WidgetEmptyState } from "../common/empty-state";
import { IntegrationErrorIndicator } from "../common/integration-error-indicator";
import type { WidgetComponentProps } from "../definition";
import { useWidgetRuntimeQueries } from "../runtime-hooks";
import { AudioStatsContent } from "./audio-stats-content";

export default function AudioStatsWidget({
  integrationIds,
  options,
  width,
  height,
  displayScale = 1,
  displayMode = "compact",
  widgetRuntimeRef,
}: WidgetComponentProps<"audioStats">) {
  const statsInput = { integrationId: integrationIds[0] ?? "" };
  const { data: response, error: statsError } = clientApi.widget.audioStats.getStats.useQuery(statsInput);
  const streamsInput = { integrationIds: [statsInput.integrationId], showOnlyPlaying: true };
  const streamsEnabled = displayMode === "advanced" && response?.kind === "navidrome";
  const { data: streamResults, error: streamsError } = clientApi.widget.mediaServer.getCurrentStreams.useQuery(
    streamsInput,
    { enabled: streamsEnabled },
  );
  useWidgetRuntimeQueries(widgetRuntimeRef, [
    getQueryKey(clientApi.widget.audioStats.getStats, statsInput, "query"),
    ...(streamsEnabled ? [getQueryKey(clientApi.widget.mediaServer.getCurrentStreams, streamsInput, "query")] : []),
  ]);

  if (statsError && response === undefined) throw statsError;
  if (streamsEnabled && streamsError && streamResults === undefined) throw streamsError;
  const currentStreams = streamResults ?? [];
  if (!response) return <WidgetEmptyState />;

  let responsiveWidth = width;
  let responsiveHeight = height;
  if (displayMode === "compact" && Number.isFinite(displayScale) && displayScale > 0) {
    responsiveWidth *= displayScale;
    responsiveHeight *= displayScale;
  }

  const summary = (
    <AudioStatsContent
      backend={response.kind}
      stats={response.data}
      options={{ ...options, compactMode: displayMode === "compact" && options.compactMode }}
      showAllStats={displayMode === "advanced"}
      advanced={displayMode === "advanced"}
      width={responsiveWidth}
      height={responsiveHeight}
    />
  );
  if (displayMode === "compact") {
    return (
      <Box h="100%" pos="relative">
        {summary}
      </Box>
    );
  }

  const sessions = currentStreams.flatMap((result) =>
    result.sessions.map((session) => ({ integrationId: result.integrationId, session })),
  );
  const audiobookStats = response.kind === "audiobookshelf" ? (response.data as AudiobookshelfDashboardData) : null;
  const advancedGridColumns = width >= 760 ? 2 : 1;
  const hasStreamErrors = currentStreams.some(({ error }) => Boolean(error));
  return (
    <Stack h="100%" gap="lg" p="md">
      <div style={{ minHeight: 150 }}>{summary}</div>
      {hasStreamErrors && (
        <Group justify="flex-end">
          <IntegrationErrorIndicator results={currentStreams} />
        </Group>
      )}
      <ScrollArea style={{ flex: 1, minHeight: 0 }}>
        {response.kind === "navidrome" ? (
          <SimpleGrid cols={advancedGridColumns} spacing="xs">
            {sessions.map(({ integrationId, session }) => {
              const currentlyPlaying = session.currentlyPlaying;
              if (!currentlyPlaying) return null;
              return (
                <Group key={`${integrationId}:${session.sessionId}`} justify="space-between" wrap="nowrap" p="sm">
                  <Stack gap={0} style={{ minWidth: 0, flex: 1 }}>
                    <Text size="sm" fw={600} truncate>
                      {currentlyPlaying.name}
                    </Text>
                    <Text size="xs" c="dimmed" truncate>
                      {currentlyPlaying.seasonName ?? currentlyPlaying.albumName ?? session.user?.username ?? "—"}
                    </Text>
                  </Stack>
                  <Badge
                    variant="light"
                    maw="40%"
                    h="auto"
                    py={4}
                    style={{ flexShrink: 0 }}
                    styles={{ label: { whiteSpace: "normal", overflowWrap: "anywhere", lineHeight: 1.2 } }}
                  >
                    {session.sessionName}
                  </Badge>
                </Group>
              );
            })}
          </SimpleGrid>
        ) : (
          <SimpleGrid cols={advancedGridColumns} spacing="xs">
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
