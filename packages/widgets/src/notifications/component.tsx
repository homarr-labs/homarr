"use client";

import { useMemo, useState } from "react";
import { ActionIcon, Avatar, Badge, Button, Card, Flex, Group, ScrollArea, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconClock, IconExternalLink, IconRefresh, IconTrash } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useIntegrationsWithInteractAccess } from "@homarr/auth/client";
import { showErrorNotification } from "@homarr/notifications";
import { useOptionalBoard } from "@homarr/boards/context";
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
  displayScale = 1,
}: WidgetComponentProps<"notifications">) {
  const notificationsQueryInput = { ...options, integrationIds, forceRefresh: true };
  const notificationsQuery = clientApi.widget.notifications.getNotifications.useQuery(notificationsQueryInput);
  const notificationData = getUsableWidgetQueryData(notificationsQuery);
  const notificationIntegrations = useMemo(() => notificationData ?? [], [notificationData]);
  const { isPending } = notificationsQuery;

  const t = useI18n("widget.notifications");
  const tCommon = useI18n("common");

  const board = useOptionalBoard();
  const interactIntegrations = useIntegrationsWithInteractAccess();
  const utils = clientApi.useUtils();
  const [bulkDeleteState, setBulkDeleteState] = useState<
    { status: "idle" } | { status: "confirming"; scope: string } | { status: "deleting" }
  >({ status: "idle" });
  const deleteNotification = clientApi.widget.notifications.deleteNotification.useMutation({
    onSuccess: () => utils.widget.notifications.getNotifications.invalidate(),
    onError: () => showErrorNotification({ title: t("deleteFailed"), message: t("deleteFailedMessage") }),
  });
  const refreshNotifications = async () => {
    setBulkDeleteState({ status: "idle" });
    try {
      await notificationsQuery.refetch({ throwOnError: true });
    } catch {
      showErrorNotification({ title: t("refreshFailed"), message: t("refreshFailedMessage") });
    }
  };

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
  const canDeleteNotification = (notification: (typeof sortedNotifications)[number]) =>
    (notification.integrationKind === "gotify" || notification.integrationKind === "homeAssistant") &&
    interactIntegrations.some((integration) => integration.id === notification.integrationId);
  const deletableNotifications = sortedNotifications.filter(canDeleteNotification);
  const bulkDeleteScope = JSON.stringify(
    deletableNotifications.map(({ integrationId, id }) => [integrationId, id]),
  );
  const isConfirmingBulkDelete =
    bulkDeleteState.status === "confirming" && bulkDeleteState.scope === bulkDeleteScope;
  const isDeletingAll = bulkDeleteState.status === "deleting";
  // ponytail: Second clicks stay armed for unchanged IDs; add expiry if delayed confirmations should be revoked.
  const bulkDeleteConfirmationMessage = t("deleteAllConfirmationMessage", {
    count: String(deletableNotifications.length),
    integrations: [...new Set(deletableNotifications.map(({ integrationName }) => integrationName))].join(", "),
  });
  const deleteAllNotifications = async () => {
    setBulkDeleteState({ status: "deleting" });
    try {
      const results = await Promise.allSettled(
        deletableNotifications.map(({ integrationId, id: notificationId }) =>
          utils.client.widget.notifications.deleteNotification.mutate({ integrationId, notificationId }),
        ),
      );
      if (results.some((result) => result.status === "rejected")) {
        showErrorNotification({
          title: t("deleteAllFailed"),
          message: t("deleteAllFailedMessage"),
        });
      }
      await utils.widget.notifications.getNotifications.invalidate();
    } catch {
      showErrorNotification({ title: t("refreshFailed"), message: t("refreshFailedMessage") });
    } finally {
      setBulkDeleteState({ status: "idle" });
    }
  };
  const handleDeleteAllNotifications = () => {
    if (isConfirmingBulkDelete) {
      void deleteAllNotifications();
    } else {
      setBulkDeleteState({ status: "confirming", scope: bulkDeleteScope });
    }
  };
  const deleteOneNotification = (integrationId: string, notificationId: string) => {
    setBulkDeleteState({ status: "idle" });
    deleteNotification.mutate({ integrationId, notificationId });
  };
  const failedIntegrations = notificationIntegrations.filter(
    (integration): integration is typeof integration & { error: string } => Boolean(integration.error),
  );
  const isAdvanced = displayMode === "advanced";
  let responsiveWidth = width;
  let responsiveHeight = height;
  if (!isAdvanced) {
    responsiveWidth *= displayScale;
    responsiveHeight *= displayScale;
  }
  const isDense = responsiveWidth < 280 || responsiveHeight < 180;
  const isRoomy = width >= 360 && height >= 220;
  const bodyLineClamp = responsiveHeight < 180 ? 1 : isDense ? 2 : responsiveHeight >= 300 ? 8 : 4;
  const notificationDisplay = getNotificationDisplay({
    displayMode,
    hideLogos: options.hideLogos,
    isRoomy: isAdvanced && isRoomy,
    bodyLineClamp,
  });
  const columns = isAdvanced && width >= 720 ? 2 : 1;
  const spacing = !isAdvanced || isRoomy ? "sm" : "xs";

  return (
    <ScrollArea className="scroll-area-w100" w="100%" h="100%" p={isDense ? 4 : "xs"}>
      <Stack w="100%" gap="xs">
        <Group justify="flex-end" gap="xs" h={24} wrap="nowrap" preventGrowOverflow={false}>
          {deletableNotifications.length > 0 && (
            <Button
              size="compact-xs"
              variant={isConfirmingBulkDelete ? "filled" : "subtle"}
              color="red"
              leftSection={<IconTrash style={iconSizes.md} />}
              aria-label={
                isConfirmingBulkDelete ? bulkDeleteConfirmationMessage : t("deleteAllNotifications")
              }
              title={isConfirmingBulkDelete ? bulkDeleteConfirmationMessage : t("deleteAllNotifications")}
              loading={isDeletingAll}
              disabled={deleteNotification.isPending || notificationsQuery.isFetching}
              onClick={handleDeleteAllNotifications}
            >
              {isConfirmingBulkDelete ? t("deleteAllConfirmationPrompt") : t("deleteAllButton")}
            </Button>
          )}
          <ActionIcon
            size="sm"
            variant="subtle"
            color="gray"
            aria-label={tCommon("action.refresh")}
            title={tCommon("action.refresh")}
            loading={notificationsQuery.isFetching}
            disabled={isDeletingAll || deleteNotification.isPending}
            onClick={() => void refreshNotifications()}
          >
            <IconRefresh style={iconSizes.md} />
          </ActionIcon>
        </Group>
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
              let actionLabel = t("deleteNotification");
              if (notification.integrationKind === "homeAssistant") actionLabel = t("dismissNotification");
              return (
                <Card
                  key={notification.compositeKey}
                  className={isAdvanced ? (columns > 1 ? classes.card : classes.row) : undefined}
                  radius={board?.itemRadius ?? undefined}
                  w="100%"
                  p={isDense ? 6 : "sm"}
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
                        size={isDense ? "xs" : "sm"}
                        radius={board?.itemRadius ?? undefined}
                      />
                    )}

                    <Flex gap={isDense ? 4 : "sm"} direction="column" w="100%" miw={0}>
                      {notification.title && (
                        <Text
                          fz={isAdvanced && isRoomy ? "md" : "sm"}
                          fw={isAdvanced ? 600 : undefined}
                          lh={isAdvanced ? 1.25 : "sm"}
                          lineClamp={isDense ? 1 : 2}
                          title={notification.title}
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
                          notificationDisplay.showSource || notificationIntegrations.length > 1
                            ? (notification.source?.name ?? notification.integrationName)
                            : undefined
                        }
                        dense={isDense}
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
                          <IconExternalLink style={iconSizes.md} />
                        </ActionIcon>
                      )}
                      {canDeleteNotification(notification) && (
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          aria-label={actionLabel}
                          title={actionLabel}
                          disabled={deleteNotification.isPending || isDeletingAll || notificationsQuery.isFetching}
                          onClick={() =>
                            deleteOneNotification(notification.integrationId, notification.id)
                          }
                        >
                          <IconTrash style={iconSizes.md} />
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
      <Text size={dense ? "xs" : "sm"} c="dimmed" truncate={dense}>
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
