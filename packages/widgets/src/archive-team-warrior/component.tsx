"use client";

import { Avatar, Badge, Card, Group, SimpleGrid, Stack, Text } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { getIconUrl } from "@homarr/definitions";

import type { WidgetComponentProps } from "../definition";

export default function ArchiveTeamWarriorWidget({
  integrationIds,
  options,
}: WidgetComponentProps<"archiveTeamWarrior">) {
  const integrationId = integrationIds[0];

  if (!integrationId) {
    return null;
  }

  return <ArchiveTeamWarriorWidgetContent integrationId={integrationId} options={options} />;
}

const ArchiveTeamWarriorWidgetContent = ({
  integrationId,
  options,
}: {
  integrationId: string;
  options: WidgetComponentProps<"archiveTeamWarrior">["options"];
}) => {
  const [data] = clientApi.widget.archiveTeamWarrior.getStatus.useSuspenseQuery({
    integrationId,
  });

  const utils = clientApi.useUtils();

  clientApi.widget.archiveTeamWarrior.subscribeStatus.useSubscription(
    { integrationId },
    {
      onData: (next) => {
        utils.widget.archiveTeamWarrior.getStatus.setData({ integrationId }, next);
      },
    },
  );

  const status = data.status;
  const projectName = status.project?.title ?? status.selectedProject ?? "No project selected";

  return (
    <Stack p="sm" gap="sm">
      <Group justify="space-between" align="start" wrap="nowrap">
        <Group gap="sm" wrap="nowrap">
          <Avatar size="sm" radius="md" src={getIconUrl("archiveTeamWarrior")} />
          <Stack gap={0}>
            <Text fw={700} lineClamp={1}>
              ArchiveTeam Warrior
            </Text>
            <Text size="xs" c="dimmed" lineClamp={1}>
              {projectName}
            </Text>
          </Stack>
        </Group>

        <Badge color={status.status === "Running" ? "green" : "gray"}>{status.status}</Badge>
      </Group>

      {options.showBroadcastMessage && status.broadcastMessage && (
        <Card withBorder p="xs">
          <Text size="xs" lineClamp={3}>
            {status.broadcastMessage}
          </Text>
        </Card>
      )}

      <SimpleGrid cols={4}>
        <Metric label="Running" value={status.counts.running} />
        <Metric label="Done" value={status.counts.completed} />
        <Metric label="Failed" value={status.counts.failed} />
        <Metric label="Canceled" value={status.counts.canceled} />
      </SimpleGrid>

      {status.bandwidth && (
        <Group grow>
          <Metric label="Download" value={formatBytesPerSecond(status.bandwidth.receiving)} />
          <Metric label="Upload" value={formatBytesPerSecond(status.bandwidth.sending)} />
        </Group>
      )}

      {status.runnerStatus && (
        <Text size="xs" c="dimmed">
          Runner: {status.runnerStatus}
        </Text>
      )}
    </Stack>
  );
};

const Metric = ({ label, value }: { label: string; value: number | string }) => (
  <Stack gap={0}>
    <Text size="lg" fw={700}>
      {value}
    </Text>
    <Text size="xs" c="dimmed">
      {label}
    </Text>
  </Stack>
);

const formatBytesPerSecond = (value?: number) => {
  if (!value) return "0 KB/s";

  if (value >= 1024 * 1024) {
    return `${(value / 1024 / 1024).toFixed(1)} MB/s`;
  }

  return `${Math.round(value / 1024)} KB/s`;
};
