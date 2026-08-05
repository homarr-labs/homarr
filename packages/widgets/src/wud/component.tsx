"use client";

import { ActionIcon, Avatar, Badge, Card, Center, Group, RingProgress, Stack, Text, Tooltip } from "@mantine/core";
import { IconBrandDocker, IconExternalLink, IconServer } from "@tabler/icons-react";
import combineClasses from "clsx";

import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { getIconUrl } from "@homarr/definitions";
import type { WudContainerUpdate } from "@homarr/integrations";
import { useScopedI18n } from "@homarr/translation/client";

import { WidgetEmptyState } from "../common/empty-state";
import type { WidgetComponentProps } from "../definition";
import classes from "./component.module.css";

export default function WudWidget({ integrationIds, options, width }: WidgetComponentProps<"wud">) {
  const integrationId = integrationIds[0];
  if (!integrationId) return null;
  return <WudWidgetContent integrationId={integrationId} options={options} width={width} />;
}

const WudWidgetContent = ({
  integrationId,
  options,
  width,
}: {
  integrationId: string;
  options: WidgetComponentProps<"wud">["options"];
  width: number;
}) => {
  const t = useScopedI18n("widget.wud");
  const [data] = clientApi.widget.wud.getStats.useSuspenseQuery({ integrationId });
  const board = useRequiredBoard();

  const isTiny = width < 256;
  const stats = data.stats;

  if (stats.totalContainers === 0) return <WidgetEmptyState />;

  const updatePercentage = Math.round((stats.updatesAvailable / stats.totalContainers) * 100);
  const badgeColor = stats.updatesAvailable === 0 ? "green" : progressColor(updatePercentage);
  const showUpdateList = options.showUpdateList && stats.updates.length > 0;

  const ring = (
    <RingProgress
      roundCaps
      size={isTiny ? 50 : 100}
      thickness={isTiny ? 4 : 8}
      label={
        <Center style={{ flexDirection: "column" }}>
          <Text size={isTiny ? "8px" : "xs"} fw={700}>
            {updatePercentage}%
          </Text>
          <IconBrandDocker size={isTiny ? 8 : 16} />
        </Center>
      }
      sections={[{ value: updatePercentage, color: progressColor(updatePercentage) }]}
    />
  );

  const summary = (
    <Stack gap={4} align={options.layout === "vertical" ? "center" : "flex-start"}>
      <Group gap={4} wrap="nowrap">
        <IconServer size="1rem" />
        <Text size="xs" c="dimmed">
          {stats.totalContainers} {t("monitored")}
        </Text>
      </Group>
      <Badge color={badgeColor} variant="light">
        {t("updatesAvailable", { count: stats.updatesAvailable })}
      </Badge>
    </Stack>
  );

  return (
    <Stack p="xs" gap="xs" h="100%">
      {options.showTitle && (
        <Group gap="xs" wrap="nowrap" justify="space-between" miw={0}>
          <Group gap="xs" wrap="nowrap" miw={0}>
            <Avatar size={20} radius="sm" src={getIconUrl("wud")} />
            <Text size="sm" c="dimmed" lineClamp={1}>
              {t("title")}
            </Text>
          </Group>
          {stats.updatesAvailable > 0 && (
            <Badge color={badgeColor} variant="filled" circle={stats.updatesAvailable < 10}>
              {stats.updatesAvailable}
            </Badge>
          )}
        </Group>
      )}

      {options.layout === "horizontal" ? (
        <Group justify="center" wrap="nowrap" gap="md">
          {options.showRing && ring}
          {summary}
        </Group>
      ) : (
        <Stack align="center" gap="xs">
          {options.showRing && ring}
          {summary}
        </Stack>
      )}

      {showUpdateList && (
        <Stack gap={4} style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
          {stats.updates.map((update) => (
            <UpdateCard key={update.id} update={update} radius={board.itemRadius} className={classes.card} />
          ))}
        </Stack>
      )}
    </Stack>
  );
};

const progressColor = (percentage: number) => {
  if (percentage < 40) return "green";
  else if (percentage < 60) return "yellow";
  else if (percentage < 90) return "orange";
  else return "red";
};

const SHA256_DIGEST_PREFIX = "sha256:";
const SHA256_DIGEST_LENGTH = SHA256_DIGEST_PREFIX.length + 64;
const DIGEST_DISPLAY_HEX_CHARS = 12;
const GENERIC_MAX_LENGTH = 20;
const GENERIC_DISPLAY_LENGTH = 17;

const truncateVersion = (value: string | null): string | null => {
  if (!value) return value;

  if (value.startsWith(SHA256_DIGEST_PREFIX) && value.length === SHA256_DIGEST_LENGTH) {
    return `${value.slice(0, SHA256_DIGEST_PREFIX.length + DIGEST_DISPLAY_HEX_CHARS)}…`;
  }

  if (value.length > GENERIC_MAX_LENGTH) {
    return `${value.slice(0, GENERIC_DISPLAY_LENGTH)}…`;
  }

  return value;
};

const buildVersionText = (currentVersion: string | null, newVersion: string | null) =>
  currentVersion && newVersion ? `${currentVersion} → ${newVersion}` : newVersion;

const UpdateCard = ({
  update,
  radius,
  className,
}: {
  update: WudContainerUpdate;
  radius: string | undefined;
  className: string | undefined;
}) => {
  const fullVersionText = buildVersionText(update.currentVersion, update.newVersion);
  const versionText = buildVersionText(
    truncateVersion(update.currentVersion),
    truncateVersion(update.newVersion),
  );

  return (
    <Card className={combineClasses(className)} radius={radius} p="xs" style={{ overflow: "visible" }}>
      <Group justify="space-between" wrap="nowrap" gap="xs" miw={0}>
        <Text size="xs" fw={500} lineClamp={1} miw={0}>
          {update.name}
        </Text>
        <Group gap={4} wrap="nowrap">
          {versionText && (
            <Tooltip label={fullVersionText} disabled={versionText === fullVersionText}>
              <Badge size="xs" variant="light" color="gray" style={{ whiteSpace: "nowrap" }}>
                {versionText}
              </Badge>
            </Tooltip>
          )}
          {update.link && (
            <ActionIcon
              component="a"
              href={update.link}
              target="_blank"
              rel="noreferrer noopener"
              variant="subtle"
              color="gray"
              size="sm"
            >
              <IconExternalLink size="0.9rem" />
            </ActionIcon>
          )}
        </Group>
      </Group>
    </Card>
  );
};
