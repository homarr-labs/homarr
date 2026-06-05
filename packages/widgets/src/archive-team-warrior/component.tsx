"use client";

import { Avatar, Badge, Card, Group, SimpleGrid, Stack, Text } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { humanFileSize } from "@homarr/common";
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
    <Stack p="xs" gap="xs" h="100%">
      <Group justify="space-between" align="center" wrap="nowrap">
        <Group gap="xs" wrap="nowrap" miw={0}>
          <Avatar size="sm" radius="md" src={getIconUrl("archiveTeamWarrior")} />
          <Text size="sm" c="dimmed" lineClamp={1}>
            {projectName}
          </Text>
        </Group>

        <Badge size="sm" color={status.status === "Running" ? "green" : "gray"}>
          {status.status}
        </Badge>
      </Group>

      {options.showBroadcastMessage && status.broadcastMessage && (
        <Card withBorder p="xs">
          <Text size="xs" lineClamp={3}>
            {status.broadcastMessage}
          </Text>
        </Card>
      )}

      <SimpleGrid cols={2} spacing="xs">
        <Metric label="Running" value={status.counts.running} />
        <Metric label="Done" value={status.counts.completed} />
        <Metric label="Failed" value={status.counts.failed} />
        <Metric label="Canceled" value={status.counts.canceled} />
      </SimpleGrid>

      {status.bandwidth && (
        <SimpleGrid cols={2} spacing="xs">
          <Metric label="Download" value={formatBandwidth(status.bandwidth.receiving)} />
          <Metric label="Upload" value={formatBandwidth(status.bandwidth.sending)} />
        </SimpleGrid>
      )}
    </Stack>
  );
};

const Metric = ({ label, value }: { label: string; value: number | string }) => (
  <Stack gap={0} miw={0}>
    <Text size="md" fw={700} lineClamp={1}>
      {value}
    </Text>
    <Text size="xs" c="dimmed" lineClamp={1}>
      {label}
    </Text>
  </Stack>
);

const formatBandwidth = (value?: number) => humanFileSize(Math.round(value ?? 0), "/s");
