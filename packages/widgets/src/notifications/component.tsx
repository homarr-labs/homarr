"use client";

import { useMemo } from "react";
import { Avatar, Badge, Card, Flex, Group, ScrollArea, SimpleGrid, Stack, Text, Tooltip } from "@mantine/core";
import { IconClock } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { useTimeAgo } from "@homarr/common";
import { useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";

export default function NotificationsWidget({
  options,
  integrationIds,
  width,
  displayMode,
}: WidgetComponentProps<"notifications">) {
  const { data: notificationIntegrations = [] } = clientApi.widget.notifications.getNotifications.useQuery({
    ...options,
    integrationIds,
  });

  const t = useI18n();

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
  const isAdvanced = displayMode === "advanced";
  const columns = isAdvanced && width >= 720 ? 2 : 1;

  return (
    <ScrollArea className="scroll-area-w100" w="100%" h="100%" p={isAdvanced ? "md" : "xs"}>
      <Stack w="100%" gap="xs">
        {failedIntegrations.length > 0 && (
          <Group gap={4} wrap="wrap">
            {failedIntegrations.map((integration) => (
              <Tooltip key={integration.integration.id} label={integration.error} multiline maw={360}>
                <Badge color="red" variant="light" size="xs">
                  {integration.integration.name}: {t("common.error")}
                </Badge>
              </Tooltip>
            ))}
          </Group>
        )}
        {sortedNotifications.length > 0 ? (
          <SimpleGrid cols={columns} spacing={isAdvanced ? "md" : "xs"} verticalSpacing={isAdvanced ? "md" : "xs"}>
            {sortedNotifications.map((notification) => (
              <Card
                key={notification.compositeKey}
                component={notification.href ? "a" : "div"}
                href={notification.href}
                target={notification.href ? "_blank" : undefined}
                rel={notification.href ? "noopener noreferrer" : undefined}
                radius={board.itemRadius}
                w="100%"
                p={isAdvanced ? "md" : "xs"}
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

                  <Flex gap={isAdvanced ? "sm" : 6} direction="column" w="100%" miw={0}>
                    {notification.title && (
                      <Text fz={isAdvanced ? "md" : "sm"} fw={600} lh={1.25} lineClamp={2}>
                        {notification.title}
                      </Text>
                    )}
                    <Text c="dimmed" size="sm" lineClamp={isAdvanced ? 12 : 4} style={{ whiteSpace: "pre-line" }}>
                      {notification.body}
                    </Text>

                    <InfoDisplay
                      date={notification.time}
                      source={isAdvanced ? (notification.source?.name ?? notification.integrationName) : undefined}
                    />
                  </Flex>
                </Flex>
              </Card>
            ))}
          </SimpleGrid>
        ) : (
          <Text size="sm" c="dimmed">
            {t("widget.notifications.noItems")}
          </Text>
        )}
      </Stack>
    </ScrollArea>
  );
}

const InfoDisplay = ({ date, source }: { date: Date; source?: string }) => {
  const timeAgo = useTimeAgo(date, 30000); // update every 30sec

  return (
    <Group gap={5} align="center" wrap="nowrap">
      <IconClock size={"1rem"} color={"var(--mantine-color-dimmed)"} />
      <Text size="sm" c="dimmed">
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
