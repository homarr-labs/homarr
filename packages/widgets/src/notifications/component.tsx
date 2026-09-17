"use client";

import { useMemo } from "react";
import { ActionIcon, Avatar, Badge, Card, Flex, Group, ScrollArea, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconClock, IconExternalLink, IconTrash } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useIntegrationsWithInteractAccess } from "@homarr/auth/client";
import { showErrorNotification } from "@homarr/notifications";
import { useRequiredBoard } from "@homarr/boards/context";
import { useTimeAgo } from "@homarr/common";
import { useI18n } from "@homarr/translation/client";
import { iconSizes } from "@homarr/ui";

import { getSafeApplicationUrl, SAFE_NEW_TAB_REL } from "../common/application-url";
import { getUsableWidgetQueryData } from "../common/query-state";
import type { WidgetComponentProps } from "../definition";
import { NotificationBody } from "./notification-body";
import { getNotificationDisplay } from "./display";
import classes from "./component.module.css";

export default function NotificationsWidget({
  options,
  integrationIds,
  width,
  height,
  displayMode,
}: WidgetComponentProps<"notifications">) {
  const notificationsQuery = clientApi.widget.notifications.getNotifications.useQuery({
    ...options,
    integrationIds,
  });
  const notificationData = getUsableWidgetQueryData(notificationsQuery);
  const notificationIntegrations = useMemo(() => notificationData ?? [], [notificationData]);
  const { isPending } = notificationsQuery;

  const t = useI18n("widget.notifications");
  const tCommon = useI18n("common");

  const board = useRequiredBoard();
  const interactIntegrations = useIntegrationsWithInteractAccess();
  const utils = clientApi.useUtils();
  const deleteNotification = clientApi.widget.notifications.deleteNotification.useMutation({
    onSuccess: () => utils.widget.notifications.getNotifications.invalidate(),
    onError: () => showErrorNotification({ title: t("deleteFailed"), message: t("deleteFailedMessage") }),
  });

  const sortedNotifications = useMemo(
    () =>
      notificationIntegrations
        .flatMap((integration) =>
          integration.data.map((notification) => ({
            ...notification,
            compositeKey: `${integration.integration.id}:${notification.id}`,
            integrationName: integration.integration.name,
            integrationId: integration.integration.id,
            integrationKind: integration.integration.kind,
          })),
        )
        .sort((entryA, entryB) => entryB.time.getTime() - entryA.time.getTime()),
    [notificationIntegrations],
  );
  const failedIntegrations = notificationIntegrations.filter(
    (integration): integration is typeof integration & { error: string } => Boolean(integration.error),
  );
  const isAdvanced = displayMode === "advanced";
  const isDense = width < 280 || height < 180;
  const isRoomy = width >= 360 && height >= 220;
  const bodyLineClamp = height < 112 ? 1 : isDense ? 2 : height >= 300 ? 8 : 4;
  const notificationDisplay = getNotificationDisplay({
    displayMode,
    hideLogos: options.hideLogos,
    isRoomy: isAdvanced && isRoomy,
    bodyLineClamp: isAdvanced ? bodyLineClamp : 4,
  });
  const columns = isAdvanced && width >= 720 ? 2 : 1;
  const spacing = !isAdvanced || isRoomy ? "sm" : "xs";

  return (
    <ScrollArea className="scroll-area-w100" w="100%" h="100%" p={isAdvanced ? "xs" : "sm"}>
      <Stack w="100%" gap={isAdvanced ? "xs" : "sm"}>
        {failedIntegrations.length > 0 && (
          <Group gap={4} wrap="wrap">
            {failedIntegrations.map((integration) => (
              <Badge key={integration.integration.id} color="red" variant="light" size="xs">
                {integration.integration.name}: {tCommon("error")}
              </Badge>
            ))}
          </Group>
        )}
        {isPending ? (
          <Flex justify="center" align="center" mih={96} p="sm">
            <Text size="sm" c="dimmed" ta="center">
              {tCommon("action.loading")}
            </Text>
          </Flex>
        ) : sortedNotifications.length > 0 ? (
          <SimpleGrid cols={columns} spacing={spacing} verticalSpacing={spacing}>
            {sortedNotifications.map((notification) => {
              const href = getSafeApplicationUrl(notification.href);
              return (
                <Card
                  key={notification.compositeKey}
                  className={isAdvanced ? (columns > 1 ? classes.card : classes.row) : undefined}
                  radius={board.itemRadius}
                  w="100%"
                  p={!isAdvanced || isRoomy ? "sm" : isDense ? 6 : "xs"}
                  style={{
                    color: "inherit",
                    textDecoration: "none",
                  }}
                >
                  <Flex gap={!isAdvanced || !isDense ? "sm" : "xs"} align="flex-start" w="100%">
                    {notificationDisplay.showLogos && notification.source?.iconUrl && (
                      <Avatar
                        src={notification.source.iconUrl}
                        alt={notification.source.name}
                        size={isAdvanced && isDense ? "xs" : "sm"}
                        radius={board.itemRadius}
                      />
                    )}

                    <Flex gap={!isAdvanced || isRoomy ? "sm" : isDense ? 4 : 6} direction="column" w="100%" miw={0}>
                      {notification.title && (
                        <Text
                          fz={isAdvanced && isRoomy ? "md" : "sm"}
                          fw={isAdvanced ? 600 : undefined}
                          lh={isAdvanced ? 1.25 : "sm"}
                          lineClamp={isAdvanced && isDense ? 1 : 2}
                        >
                          {notification.title}
                        </Text>
                      )}
                      <NotificationBody
                        body={notification.body}
                        contentType={notification.contentType}
                        format={options.messageFormat}
                        lineClamp={notificationDisplay.bodyLineClamp}
                        dense={isAdvanced && isDense}
                      />

                      <InfoDisplay
                        date={notification.time}
                        source={
                          notificationDisplay.showSource
                            ? (notification.source?.name ?? notification.integrationName)
                            : undefined
                        }
                        dense={isAdvanced && isDense}
                      />
                    </Flex>
                    <Stack gap={4}>
                      {href && (
                        <ActionIcon
                          component="a"
                          href={href}
                          target="_blank"
                          rel={SAFE_NEW_TAB_REL}
                          variant="subtle"
                          color="gray"
                          aria-label={t("openService")}
                          title={t("openService")}
                        >
                          <IconExternalLink size={16} />
                        </ActionIcon>
                      )}
                      {notification.integrationKind === "gotify" &&
                        interactIntegrations.some(({ id }) => id === notification.integrationId) && (
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            aria-label={t("deleteNotification")}
                            title={t("deleteNotification")}
                            disabled={deleteNotification.isPending}
                            onClick={() =>
                              deleteNotification.mutate({
                                integrationId: notification.integrationId,
                                notificationId: notification.id,
                              })
                            }
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        )}
                    </Stack>
                  </Flex>
                </Card>
              );
            })}
          </SimpleGrid>
        ) : (
          <Flex justify="center" align="center" mih={96} p="sm">
            <Text size="sm" c="dimmed" ta="center">
              {t("noItems")}
            </Text>
          </Flex>
        )}
      </Stack>
    </ScrollArea>
  );
}

const InfoDisplay = ({ date, source, dense }: { date: Date; source?: string; dense: boolean }) => {
  const timeAgo = useTimeAgo(date, 30000); // update every 30sec

  return (
    <Group gap={5} align="center" wrap="nowrap">
      <IconClock aria-hidden style={dense ? iconSizes.xs : iconSizes.md} color="var(--mantine-color-dimmed)" />
      <Text size={dense ? "xs" : "sm"} c="dimmed">
        {timeAgo}
      </Text>
      {source && <Text c="dimmed">•</Text>}
      {source && (
        <Text size="xs" c="dimmed" truncate="end">
          {source}
        </Text>
      )}
    </Group>
  );
};
