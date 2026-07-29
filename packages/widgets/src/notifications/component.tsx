"use client";

import { useMemo } from "react";
import { Avatar, Card, Flex, Group, ScrollArea, Stack, Text } from "@mantine/core";
import { IconClock } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { useTimeAgo } from "@homarr/common";
import { useScopedI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";

export default function NotificationsWidget({ options, integrationIds }: WidgetComponentProps<"notifications">) {
  const { data: notificationIntegrations = [] } = clientApi.widget.notifications.getNotifications.useQuery({
    ...options,
    integrationIds,
  });

  const t = useScopedI18n("widget.notifications");

  const board = useRequiredBoard();

  const sortedNotifications = useMemo(
    () =>
      notificationIntegrations
        .flatMap((integration) => integration.data)
        .sort((entryA, entryB) => entryB.time.getTime() - entryA.time.getTime()),
    [notificationIntegrations],
  );

  return (
    <ScrollArea className="scroll-area-w100" w="100%" p="sm">
      <Stack w={"100%"} gap="sm">
        {sortedNotifications.length > 0 ? (
          sortedNotifications.map((notification) => (
            <Card
              key={notification.id}
              component={notification.href ? "a" : "div"}
              href={notification.href}
              target={notification.href ? "_blank" : undefined}
              rel={notification.href ? "noopener noreferrer" : undefined}
              radius={board.itemRadius}
              w="100%"
              p="sm"
              style={{ color: "inherit", textDecoration: "none" }}
            >
              <Flex gap="sm" align="flex-start" w="100%">
                {!options.hideLogos && notification.source?.iconUrl && (
                  <Avatar
                    src={notification.source.iconUrl}
                    alt={notification.source.name}
                    size="sm"
                    radius={board.itemRadius}
                  />
                )}

                <Flex gap="sm" direction="column" w="100%">
                  {notification.title && (
                    <Text fz="sm" lh="sm" lineClamp={2}>
                      {notification.title}
                    </Text>
                  )}
                  <Text c="dimmed" size="sm" lineClamp={4} style={{ whiteSpace: "pre-line" }}>
                    {notification.body}
                  </Text>

                  <InfoDisplay date={notification.time} />
                </Flex>
              </Flex>
            </Card>
          ))
        ) : (
          <Text size="sm" c="dimmed">
            {t("noItems")}
          </Text>
        )}
      </Stack>
    </ScrollArea>
  );
}

const InfoDisplay = ({ date }: { date: Date }) => {
  const timeAgo = useTimeAgo(date, 30000); // update every 30sec

  return (
    <Group gap={5} align={"center"}>
      <IconClock size={"1rem"} color={"var(--mantine-color-dimmed)"} />
      <Text size="sm" c="dimmed">
        {timeAgo}
      </Text>
    </Group>
  );
};
