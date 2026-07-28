"use client";

import { useMemo } from "react";
import { Avatar, Box, Card, Flex, Group, ScrollArea, Stack, Text } from "@mantine/core";
import { IconClock } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { useTimeAgo } from "@homarr/common";
import { useScopedI18n } from "@homarr/translation/client";

import { WidgetMobileLoading, WidgetMobileSummary } from "../common/mobile-summary";
import { hasWidgetDataWarning, throwOnInitialQueryError, WidgetDataState } from "../common/query-state";
import type { WidgetComponentProps } from "../definition";

export default function NotificationsWidget({
  options,
  integrationIds,
  displayMode,
}: WidgetComponentProps<"notifications">) {
  const {
    data: notificationIntegrations,
    error,
    isPending,
  } = clientApi.widget.notifications.getNotifications.useQuery({
    ...options,
    integrationIds,
  });

  const t = useScopedI18n("widget.notifications");

  const board = useRequiredBoard();

  const sortedNotifications = useMemo(
    () =>
      (notificationIntegrations ?? [])
        .flatMap((integration) => integration.data)
        .sort((entryA, entryB) => entryB.time.getTime() - entryA.time.getTime()),
    [notificationIntegrations],
  );

  if (isPending) return <WidgetMobileLoading />;
  throwOnInitialQueryError(error, notificationIntegrations !== undefined);
  const hasWarning = hasWidgetDataWarning({
    error,
    expectedIntegrationCount: integrationIds.length,
    receivedIntegrationCount: notificationIntegrations?.length,
  });

  if (displayMode === "mobileSummary") {
    const latestNotification = sortedNotifications[0];
    const summary = latestNotification ? (
      <NotificationMobileSummary notification={latestNotification} isStale={hasWarning} />
    ) : (
      <WidgetMobileSummary value={0} label={t("name")} description={t("noItems")} isStale={hasWarning} />
    );

    if (!latestNotification?.href) return summary;

    return (
      <Box
        component="a"
        href={latestNotification.href}
        target="_blank"
        rel="noopener noreferrer"
        h="100%"
        display="block"
        style={{ color: "inherit", textDecoration: "none" }}
      >
        {summary}
      </Box>
    );
  }

  const content = (
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
  return <WidgetDataState hasWarning={hasWarning}>{content}</WidgetDataState>;
}

const NotificationMobileSummary = ({
  notification,
  isStale,
}: {
  notification: {
    title: string | null;
    body: string;
    time: Date;
  };
  isStale: boolean;
}) => {
  const timeAgo = useTimeAgo(notification.time, 30000);

  return <WidgetMobileSummary value={notification.title ?? notification.body} label={timeAgo} isStale={isStale} />;
};

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
