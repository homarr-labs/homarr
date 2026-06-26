"use client";

import { Avatar, Badge, Card, Group, SimpleGrid, Stack, Text } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { humanFileSize } from "@homarr/common";

import type { WidgetComponentProps } from "../definition";

const archiveTeamWarriorIconUrl = "https://cdn.jsdelivr.net/gh/selfhst/icons/png/archiveteam-warrior.png";

export default function ArchiveTeamWarriorWidget({ options }: WidgetComponentProps<"archiveTeamWarrior">) {
  return <ArchiveTeamWarriorWidgetContent url={options.url} options={options} />;
}

const ArchiveTeamWarriorWidgetContent = ({
  url,
  options,
}: {
  url: string;
  options: WidgetComponentProps<"archiveTeamWarrior">["options"];
}) => {
  const [data] = clientApi.widget.archiveTeamWarrior.getStatus.useSuspenseQuery({
    url,
  });

  const utils = clientApi.useUtils();

  clientApi.widget.archiveTeamWarrior.subscribeStatus.useSubscription(
    { url },
    {
      onData: (next) => {
        utils.widget.archiveTeamWarrior.getStatus.setData({ url }, next);
      },
    },
  );

  const status = data.status;
  const projectName = status.project?.title ?? status.selectedProject ?? "No project selected";

  return (
    <Stack p="xs" gap="xs" h="100%">
      <Group justify="space-between" align="center" wrap="nowrap">
        <Group gap="xs" wrap="nowrap" miw={0}>
          <Avatar size="sm" radius="md" src={archiveTeamWarriorIconUrl} />
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
