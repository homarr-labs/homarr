import { Avatar, Badge, Group, Paper, Stack, Text } from "@mantine/core";

import type { TracearrHistorySession } from "@homarr/integrations/types";
import { useCurrentIntlLocale, useI18n } from "@homarr/translation/client";

import type { SourcedTracearrItem } from "./source";

type SourcedTracearrHistorySession = SourcedTracearrItem<TracearrHistorySession>;

export function RecentActivityList({
  sessions,
  showSource,
}: {
  sessions: SourcedTracearrHistorySession[];
  showSource: boolean;
}) {
  const t = useI18n("widget.tracearr");
  const locale = useCurrentIntlLocale();

  return (
    <Stack gap={4}>
      <Text size="xs" fw={600} c="dimmed">
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
              <Paper key={session.key} p="sm" radius="lg" bg="transparent">
                <Group justify="space-between" wrap="nowrap">
                  <Group gap="xs" wrap="nowrap" style={{ overflow: "hidden" }}>
                    <Avatar src={session.user.avatarUrl} alt={session.user.username} radius="xl" size="sm" />
                    <Stack gap={0} style={{ overflow: "hidden" }}>
                      <Text size="sm" fw={500} lineClamp={1}>
                        {mediaLabel}
                      </Text>
                      <Text size="xs" c="dimmed" lineClamp={1}>
                        {session.user.username} • {session.serverName}
                        {showSource ? ` • ${session.integrationName}` : ""}
                      </Text>
                    </Stack>
                  </Group>
                  <Stack gap={4} align="center">
                    <Badge size="xs" variant="light" color={session.watched ? "green" : "blue"}>
                      {session.watched ? t("recentActivity.watched") : t("recentActivity.partial")}
                    </Badge>
                    <Text size="xs" c="dimmed" lineClamp={1}>
                      {new Date(session.startedAt).toLocaleDateString(locale)}
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
