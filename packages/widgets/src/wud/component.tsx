"use client";

import { Avatar, Group, SimpleGrid, Stack, Text } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { getIconUrl } from "@homarr/definitions";

import type { WidgetComponentProps } from "../definition";

export default function WudWidget({ integrationIds }: WidgetComponentProps<"wud">) {
  const integrationId = integrationIds[0];

  if (!integrationId) {
    return null;
  }

  return <WudWidgetContent integrationId={integrationId} />;
}

const WudWidgetContent = ({ integrationId }: { integrationId: string }) => {
  const [data] = clientApi.widget.wud.getStats.useSuspenseQuery({ integrationId });

  const stats = data.stats;

  return (
    <Stack p="xs" gap="xs" h="100%">
      <Group gap="xs" wrap="nowrap" miw={0}>
        <Avatar size="sm" radius="md" src={getIconUrl("wud")} />
        <Text size="sm" c="dimmed" lineClamp={1}>
          What's Up Docker
        </Text>
      </Group>

      <SimpleGrid cols={2} spacing="xs">
        <Metric label="Monitored" value={stats.totalContainers} />
        <Metric label="Updates available" value={stats.updatesAvailable} />
      </SimpleGrid>
    </Stack>
  );
};

const Metric = ({ label, value }: { label: string; value: number }) => (
  <Stack gap={0} miw={0}>
    <Text size="md" fw={700} lineClamp={1}>
      {value}
    </Text>
    <Text size="xs" c="dimmed" lineClamp={1}>
      {label}
    </Text>
  </Stack>
);
