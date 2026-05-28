import { Avatar, Badge, Group, Paper, Stack, Text } from "@mantine/core";

import type { TracearrHistorySession } from "@homarr/integrations/types";
import { useScopedI18n } from "@homarr/translation/client";

export function RecentActivityList({ sessions }: { sessions: TracearrHistorySession[] }) {
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
                      {session.watched ? t("recentActivity.watched") : t("recentActivity.partial")}
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
