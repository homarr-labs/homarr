import { Group, Paper, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconDevices, IconNetwork, IconUsers, IconVideo } from "@tabler/icons-react";

import type { TracearrDashboardData } from "@homarr/integrations/types";
import { useScopedI18n } from "@homarr/translation/client";

export function StatsBar({
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
