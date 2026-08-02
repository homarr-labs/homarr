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
  height,
  displayMode,
}: WidgetComponentProps<"notifications">) {
  const { data: notificationIntegrations = [], isPending } = clientApi.widget.notifications.getNotifications.useQuery({
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
  const isDense = !isAdvanced && (width < 280 || height < 180);
  const bodyLineClamp = isAdvanced ? 12 : height < 112 ? 1 : isDense ? 2 : 4;
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
        {isPending ? (
          <Flex justify="center" align="center" mih={96} p="sm">
            <Text size="sm" c="dimmed" ta="center">
              {t("common.action.loading")}
            </Text>
          </Flex>
        ) : sortedNotifications.length > 0 ? (
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
                p={isAdvanced ? "md" : isDense ? 6 : "xs"}
                bg={isAdvanced ? undefined : "transparent"}
                style={{
                  color: "inherit",
                  textDecoration: "none",
                  borderBottom: isAdvanced
                    ? undefined
                    : "1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-4))",
                }}
              >
                <Flex gap={isDense ? "xs" : "sm"} align="flex-start" w="100%">
                  {!options.hideLogos && notification.source?.iconUrl && (
                    <Avatar
                      src={notification.source.iconUrl}
                      alt={notification.source.name}
                      size={isDense ? "xs" : "sm"}
                      radius={board.itemRadius}
                    />
                  )}

                  <Flex gap={isAdvanced ? "sm" : isDense ? 4 : 6} direction="column" w="100%" miw={0}>
                    {notification.title && (
                      <Text fz={isAdvanced ? "md" : "sm"} fw={600} lh={1.25} lineClamp={isDense ? 1 : 2}>
                        {notification.title}
                      </Text>
                    )}
                    <Text
                      c="dimmed"
                      size={isDense ? "xs" : "sm"}
                      lineClamp={bodyLineClamp}
                      style={{ whiteSpace: "pre-line" }}
                    >
                      {notification.body}
                    </Text>

                    <InfoDisplay
                      date={notification.time}
                      source={isAdvanced ? (notification.source?.name ?? notification.integrationName) : undefined}
                      dense={isDense}
                    />
                  </Flex>
                </Flex>
              </Card>
            ))}
          </SimpleGrid>
        ) : (
          <Flex justify="center" align="center" mih={96} p="sm">
            <Text size="sm" c="dimmed" ta="center">
              {t("widget.notifications.noItems")}
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
      <IconClock aria-hidden size={dense ? 12 : "1rem"} color="var(--mantine-color-dimmed)" />
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
