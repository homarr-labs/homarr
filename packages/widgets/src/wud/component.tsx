"use client";

import { Anchor, Avatar, Group, ScrollArea, SimpleGrid, Stack, Text } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { getIconUrl } from "@homarr/definitions";
import type { WudContainerUpdate } from "@homarr/integrations";
import { useScopedI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";

export default function WudWidget({ integrationIds, options }: WidgetComponentProps<"wud">) {
  const integrationId = integrationIds[0];

  if (!integrationId) {
    return null;
  }

  return <WudWidgetContent integrationId={integrationId} options={options} />;
}

const WudWidgetContent = ({
  integrationId,
  options,
}: {
  integrationId: string;
  options: WidgetComponentProps<"wud">["options"];
}) => {
  const t = useScopedI18n("widget.wud");
  const [data] = clientApi.widget.wud.getStats.useSuspenseQuery({ integrationId });

  const stats = data.stats;
  const showUpdateList = options.showUpdateList && stats.updates.length > 0;

  const metrics = (
    <>
      <Metric label={t("monitored")} value={stats.totalContainers} />
      <Metric label={t("updatesAvailable")} value={stats.updatesAvailable} />
    </>
  );

  return (
    <Stack p="xs" gap="xs" h="100%">
      {options.showTitle && (
        <Group gap="xs" wrap="nowrap" miw={0}>
          <Avatar size="sm" radius="md" src={getIconUrl("wud")} />
          <Text size="sm" c="dimmed" lineClamp={1}>
            {t("title")}
          </Text>
        </Group>
      )}

      {options.layout === "horizontal" ? (
        <SimpleGrid cols={2} spacing="xs">
          {metrics}
        </SimpleGrid>
      ) : (
        <Stack gap="xs">{metrics}</Stack>
      )}

      {showUpdateList && (
        <ScrollArea style={{ flex: 1, minHeight: 0 }} scrollbars="y">
          <Stack gap={4}>
            {stats.updates.map((update) => (
              <UpdateRow key={update.id} update={update} updateAvailableFallback={t("updateAvailable")} />
            ))}
          </Stack>
        </ScrollArea>
      )}
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

const UpdateRow = ({
  update,
  updateAvailableFallback,
}: {
  update: WudContainerUpdate;
  updateAvailableFallback: string;
}) => {
  const versionText =
    update.currentVersion && update.newVersion
      ? `${update.currentVersion} → ${update.newVersion}`
      : (update.newVersion ?? updateAvailableFallback);

  const content = (
    <Group gap="xs" wrap="nowrap" justify="space-between" miw={0}>
      <Text size="xs" fw={500} lineClamp={1} miw={0}>
        {update.name}
      </Text>
      <Text size="xs" c="dimmed" style={{ whiteSpace: "nowrap" }}>
        {versionText}
      </Text>
    </Group>
  );

  return update.link ? (
    <Anchor href={update.link} target="_blank" rel="noreferrer noopener" underline="never" c="inherit">
      {content}
    </Anchor>
  ) : (
    content
  );
};
