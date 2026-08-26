"use client";

import { useMemo } from "react";
import { Avatar, Badge, Card, Flex, Group, ScrollArea, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconClock } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { useTimeAgo } from "@homarr/common";
import { useI18n } from "@homarr/translation/client";
import { iconSizes } from "@homarr/ui";

import { getSafeApplicationUrl, SAFE_NEW_TAB_REL } from "../common/application-url";
import { getUsableWidgetQueryData } from "../common/query-state";
import type { WidgetComponentProps } from "../definition";
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

  const sortedNotifications = useMemo(
    () =>
      notificationIntegrations
        .flatMap((integration) =>
          integration.data.map((notification) => ({
            ...notification,
            compositeKey: `${integration.integration.id}:${notification.id}`,
            integrationName: integration.integration.name,
          })),
        )
        .sort((entryA, entryB) => entryB.time.getTime() - entryA.time.getTime()),
    [notificationIntegrations],
  );
  const failedIntegrations = notificationIntegrations.filter(
    (integration): integration is typeof integration & { error: string } => Boolean(integration.error),
  );
  const isDense = width < 280 || height < 180;
  const isRoomy = width >= 360 && height >= 220;
  const bodyLineClamp = height < 112 ? 1 : isDense ? 2 : height >= 300 ? 8 : 4;
  const notificationDisplay = getNotificationDisplay({
    displayMode,
    hideLogos: options.hideLogos,
    isRoomy,
    bodyLineClamp,
  });
  const columns = width >= 720 ? 2 : 1;
  const spacing = isRoomy ? "sm" : "xs";

  return (
    <ScrollArea className="scroll-area-w100" w="100%" h="100%" p="xs">
      <Stack w="100%" gap="xs">
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
                  component={href ? "a" : "div"}
                  href={href}
                  target={href ? "_blank" : undefined}
                  rel={href ? SAFE_NEW_TAB_REL : undefined}
                  className={columns > 1 ? classes.card : classes.row}
                  radius={board.itemRadius}
                  w="100%"
                  p={isRoomy ? "sm" : isDense ? 6 : "xs"}
                  style={{
                    color: "inherit",
                    textDecoration: "none",
                  }}
                >
                  <Flex gap={isDense ? "xs" : "sm"} align="flex-start" w="100%">
                    {notificationDisplay.showLogos && notification.source?.iconUrl && (
                      <Avatar
                        src={notification.source.iconUrl}
                        alt={notification.source.name}
                        size={isDense ? "xs" : "sm"}
                        radius={board.itemRadius}
                      />
                    )}

                    <Flex gap={isRoomy ? "sm" : isDense ? 4 : 6} direction="column" w="100%" miw={0}>
                      {notification.title && (
                        <Text fz={isRoomy ? "md" : "sm"} fw={600} lh={1.25} lineClamp={isDense ? 1 : 2}>
                          {notification.title}
                        </Text>
                      )}
                      <Text
                        c="dimmed"
                        size={isDense ? "xs" : "sm"}
                        lineClamp={notificationDisplay.bodyLineClamp}
                        style={{ whiteSpace: "pre-line" }}
                      >
                        {notification.body}
                      </Text>

                      <InfoDisplay
                        date={notification.time}
                        source={
                          notificationDisplay.showSource
                            ? (notification.source?.name ?? notification.integrationName)
                            : undefined
                        }
                        dense={isDense}
                      />
                    </Flex>
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
      <IconClock
        aria-hidden
        style={dense ? iconSizes.xs : iconSizes.md}
        color="var(--mantine-color-dimmed)"
      />
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
