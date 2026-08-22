"use client";

import { ActionIcon, Avatar, Badge, Card, Center, Group, RingProgress, Stack, Text, Tooltip } from "@mantine/core";
import { IconBrandDocker, IconExternalLink, IconServer } from "@tabler/icons-react";
import combineClasses from "clsx";

import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { getIconUrl } from "@homarr/definitions";
import type { WudContainerUpdate } from "@homarr/integrations";
import { useI18n } from "@homarr/translation/client";

import { WidgetEmptyState } from "../common/empty-state";
import { getSafeApplicationUrl, SAFE_NEW_TAB_REL } from "../common/application-url";
import type { WidgetComponentProps } from "../definition";
import classes from "./component.module.css";

export default function WudWidget({ integrationIds, options, width, displayMode }: WidgetComponentProps<"wud">) {
  const integrationId = integrationIds[0];
  if (!integrationId) return null;
  return (
    <WudWidgetContent
      integrationId={integrationId}
      options={options}
      width={width}
      isAdvanced={displayMode === "advanced"}
    />
  );
}

const WudWidgetContent = ({
  integrationId,
  options,
  width,
  isAdvanced,
}: {
  integrationId: string;
  options: WidgetComponentProps<"wud">["options"];
  width: number;
  isAdvanced: boolean;
}) => {
  const t = useI18n("widget.wud");
  const [data] = clientApi.widget.wud.getStats.useSuspenseQuery({ integrationId });
  const board = useRequiredBoard();

  const isTiny = !isAdvanced && width < 256;
  const stats = data.stats;

  if (stats.totalContainers === 0) return <WidgetEmptyState />;

  const updatePercentage = Math.round((stats.updatesAvailable / stats.totalContainers) * 100);
  const badgeColor = stats.updatesAvailable === 0 ? "green" : progressColor(updatePercentage);
  const showTitle = isAdvanced || options.showTitle;
  const showRing = isAdvanced || options.showRing;
  const showUpdateList = (isAdvanced || options.showUpdateList) && stats.updates.length > 0;

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

  const tinyContent = showRing ? (
    <Tooltip
      label={
        <Stack gap={2}>
          <Text size="xs">
            {stats.totalContainers} {t("monitored")}
          </Text>
          <Text size="xs">{t("updatesAvailable", { count: stats.updatesAvailable })}</Text>
        </Stack>
      }
      events={{ hover: true, focus: true, touch: false }}
    >
      <Center
        tabIndex={0}
        aria-label={`${stats.totalContainers} ${t("monitored")}, ${t("updatesAvailable", { count: stats.updatesAvailable })}`}
      >
        {ring}
      </Center>
    </Tooltip>
  ) : (
    <Center>
      <Badge color={badgeColor} variant="light">
        {t("updatesAvailable", { count: stats.updatesAvailable })}
      </Badge>
    </Center>
  );

  return (
    <Stack p="xs" gap="xs" h="100%">
      {showTitle && !isTiny && (
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

      {isTiny ? (
        tinyContent
      ) : options.layout === "horizontal" ? (
        <Group justify="center" wrap="nowrap" gap="md">
          {showRing && ring}
          {summary}
        </Group>
      ) : (
        <Stack align="center" gap="xs">
          {showRing && ring}
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
const GENERIC_MAX_LENGTH = 20;
const GENERIC_DISPLAY_LENGTH = 17;

const isDigestVersion = (value: string | null): boolean =>
  value !== null && value.startsWith(SHA256_DIGEST_PREFIX) && value.length === SHA256_DIGEST_LENGTH;

const truncateVersion = (value: string | null): string | null => {
  if (!value) return value;

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
  const t = useI18n("widget.wud");
  const href = getSafeApplicationUrl(update.link);
  const isDigestUpdate = isDigestVersion(update.newVersion);
  const fullVersionText = buildVersionText(update.currentVersion, update.newVersion);
  const versionText = isDigestUpdate
    ? t("updateAvailable")
    : buildVersionText(truncateVersion(update.currentVersion), truncateVersion(update.newVersion));
  const versionBadge = versionText ? (
    <Badge size="xs" variant="subtle" color="gray" style={{ whiteSpace: "nowrap" }}>
      {versionText}
    </Badge>
  ) : null;
  const showVersionTooltip = versionText !== null && !isDigestUpdate && versionText !== fullVersionText;

  return (
    <Card
      className={combineClasses(className)}
      radius={radius}
      p="xs"
      bg="transparent"
      style={{ overflow: "visible" }}
    >
      <Group justify="space-between" wrap="nowrap" gap="xs" miw={0}>
        <Text size="xs" fw={500} lineClamp={1} miw={0}>
          {update.name}
        </Text>
        <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
          {showVersionTooltip ? <Tooltip label={fullVersionText}>{versionBadge}</Tooltip> : versionBadge}
          {href && (
            <ActionIcon
              component="a"
              href={href}
              target="_blank"
              rel={SAFE_NEW_TAB_REL}
              variant="subtle"
              color="gray"
              size="sm"
              aria-label={t("openReleaseNotes")}
            >
              <IconExternalLink size="0.9rem" />
            </ActionIcon>
          )}
        </Group>
      </Group>
    </Card>
  );
};
