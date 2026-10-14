"use client";

import { useMemo } from "react";
import type { CSSProperties } from "react";
import { ActionIcon, Avatar, Badge, Card, Flex, Group, ScrollArea, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconClock, IconExternalLink, IconTrash } from "@tabler/icons-react";

import type { IntegrationKind } from "@homarr/definitions";
import type { Notification } from "@homarr/integrations";
import { useTimeAgo } from "@homarr/common";
import { useI18n } from "@homarr/translation/client";

import { getSafeApplicationUrl, SAFE_NEW_TAB_REL } from "../common/application-url";
import { NotificationBody } from "./notification-body";
import { getNotificationDisplay } from "./display";
import classes from "./component.module.css";

export interface NotificationsViewProps {
  options: { hideLogos: boolean; messageFormat: "auto" | "plain" | "markdown" | "html" };
  notificationData:
    | {
        integration: { id: string; name: string; kind: IntegrationKind };
        data: Notification[];
        error?: string;
      }[]
    | undefined;
  width: number;
  height: number;
  displayMode?: "compact" | "advanced";
  displayScale?: number;
  isPending: boolean;
  itemRadius: string | undefined;
  interactIntegrations: { id: string }[];
  deleteNotification: {
    isPending: boolean;
    mutate: (input: { integrationId: string; notificationId: string }) => void;
  };
  iconSizes: Record<"xs" | "md", CSSProperties>;
}

export function NotificationsView({
  options,
  notificationData,
  width,
  height,
  displayMode,
  displayScale = 1,
  isPending,
  itemRadius,
  interactIntegrations,
  deleteNotification,
  iconSizes,
}: NotificationsViewProps) {
  const notificationIntegrations = useMemo(() => notificationData ?? [], [notificationData]);

  const t = useI18n("widget.notifications");
  const tCommon = useI18n("common");

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
                  radius={itemRadius}
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
                        radius={itemRadius}
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
                          notificationDisplay.showSource
                            ? (notification.source?.name ?? notification.integrationName)
                            : undefined
                        }
                        dense={isDense}
                        iconSizes={iconSizes}
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

const InfoDisplay = ({
  date,
  source,
  dense,
  iconSizes,
}: {
  date: Date;
  source?: string;
  dense: boolean;
  iconSizes: NotificationsViewProps["iconSizes"];
}) => {
  const timeAgo = useTimeAgo(date, 30000);

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
