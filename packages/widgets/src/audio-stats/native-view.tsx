"use client";

import { Badge, Box, Group, ScrollArea, SimpleGrid, Stack, Text } from "@mantine/core";
import type { RouterOutputs } from "@homarr/api";
import type { formatDuration } from "@homarr/common";
import type { ReactNode } from "react";
import type { WidgetComponentProps } from "../definition";
import { AudioStatsContentView } from "./native-view-content";
import type { AudioStatsContentViewProps } from "./native-view-content";

export interface AudioStatsViewProps {
  response: RouterOutputs["widget"]["audioStats"]["getStats"];
  currentStreams: RouterOutputs["widget"]["mediaServer"]["getCurrentStreams"];
  options: WidgetComponentProps<"audioStats">["options"];
  width: number;
  height: number;
  displayScale?: number;
  displayMode?: "compact" | "advanced";
  summaryBindings: Pick<
    AudioStatsContentViewProps,
    "t" | "getGridCols" | "getIconSize" | "getVisibleStats" | "zoomCompensatedSize"
  >;
  queryIndicators: ReactNode;
  formatDuration: typeof formatDuration;
  formatBytes: (bytes: number) => string;
}

export function AudioStatsView({
  response,
  currentStreams,
  options,
  width,
  height,
  displayScale = 1,
  displayMode = "compact",
  summaryBindings,
  queryIndicators,
  formatDuration,
  formatBytes,
}: AudioStatsViewProps) {
  let responsiveWidth = width;
  let responsiveHeight = height;
  if (displayMode === "compact" && Number.isFinite(displayScale) && displayScale > 0) {
    responsiveWidth *= displayScale;
    responsiveHeight *= displayScale;
  }

  const summary = (
    <AudioStatsContentView
      backend={response.kind}
      stats={response.data}
      options={{ ...options, compactMode: displayMode === "compact" && options.compactMode }}
      showAllStats={displayMode === "advanced"}
      advanced={displayMode === "advanced"}
      width={responsiveWidth}
      height={responsiveHeight}
      {...summaryBindings}
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
  const audiobookStats = response.kind === "audiobookshelf" && "libraries" in response.data ? response.data : null;
  const advancedGridColumns = width >= 760 ? 2 : 1;
  const hasStreamErrors = currentStreams.some(({ error }) => Boolean(error));
  return (
    <Stack h="100%" gap="lg" p="md">
      <div style={{ minHeight: 150 }}>{summary}</div>
      {hasStreamErrors && <Group justify="flex-end">{queryIndicators}</Group>}
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
