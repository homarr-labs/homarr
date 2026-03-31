import { Badge, Box, Group, Paper, Progress, Stack, Text, Tooltip } from "@mantine/core";
import { IconPlayerPause, IconPlayerPlay } from "@tabler/icons-react";

import { formatDuration } from "@homarr/common";
import type { TracearrStream } from "@homarr/integrations/types";
import { useScopedI18n } from "@homarr/translation/client";

export function StreamsList({ streams, width }: { streams: TracearrStream[]; width: number }) {
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
  const t = useScopedI18n("widget.tracearr");
  const progressPercent =
    stream.durationMs && stream.durationMs > 0 ? (stream.progressMs / stream.durationMs) * 100 : 0;

  const mediaLabel =
    stream.mediaType === "episode" && stream.showTitle
      ? `${stream.showTitle} - S${stream.seasonNumber ?? 0}E${stream.episodeNumber ?? 0} - ${stream.mediaTitle}`
      : stream.mediaTitle;

  const videoDecisionLabel =
    stream.videoDecision === "directplay"
      ? t("streams.videoDecision.directPlay")
      : stream.videoDecision === "transcode"
        ? t("streams.videoDecision.transcode")
        : stream.videoDecision === "copy"
          ? t("streams.videoDecision.directStream")
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
