"use client";

import { ActionIcon, Avatar, Card, Grid, Group, Space, Stack, Text, Tooltip } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import type { Icon } from "@tabler/icons-react";
import {
  IconDeviceTv,
  IconExternalLink,
  IconHourglass,
  IconLoaderQuarter,
  IconMovie,
  IconPlayerPlay,
  IconReceipt,
  IconThumbDown,
  IconThumbUp,
} from "@tabler/icons-react";
import combineClasses from "clsx";

import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import type { RequestStats } from "@homarr/integrations/types";
import { useScopedI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../../definition";
import { NoIntegrationDataError } from "../../errors/no-data-integration";
import classes from "./component.module.css";

export default function MediaServerWidget({
  integrationIds,
  isEditMode,
}: WidgetComponentProps<"mediaRequests-requestStats">) {
  const t = useScopedI18n("widget.mediaRequests-requestStats");
  const [requestStats] = clientApi.widget.mediaRequests.getStats.useSuspenseQuery(
    {
      integrationIds,
    },
    {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  );

  const { width, height, ref } = useElementSize();

  const board = useRequiredBoard();

  if (requestStats.users.length === 0 && requestStats.stats.length === 0) throw new NoIntegrationDataError();

  const data = [
    {
      name: "approved",
      icon: IconThumbUp,
      number: requestStats.stats.reduce((count, { approved }) => count + approved, 0),
    },
    {
      name: "pending",
      icon: IconHourglass,
      number: requestStats.stats.reduce((count, { pending }) => count + pending, 0),
    },
    {
      name: "processing",
      icon: IconLoaderQuarter,
      number: requestStats.stats.reduce((count, { processing }) => count + processing, 0),
    },
    {
      name: "declined",
      icon: IconThumbDown,
      number: requestStats.stats.reduce((count, { declined }) => count + declined, 0),
    },
    {
      name: "available",
      icon: IconPlayerPlay,
      number: requestStats.stats.reduce((count, { available }) => count + available, 0),
    },
    {
      name: "tv",
      icon: IconDeviceTv,
      number: requestStats.stats.reduce((count, { tv }) => count + tv, 0),
    },
    {
      name: "movie",
      icon: IconMovie,
      number: requestStats.stats.reduce((count, { movie }) => count + movie, 0),
    },
    {
      name: "total",
      icon: IconReceipt,
      number: requestStats.stats.reduce((count, { total }) => count + total, 0),
    },
  ] satisfies { name: keyof RequestStats; icon: Icon; number: number }[];

  return (
    <Stack
      className="mediaRequests-stats-layout"
      display="flex"
      h="100%"
      gap="sm"
      p="sm"
      align="center"
      style={{ pointerEvents: isEditMode ? "none" : undefined }}
    >
      <Text className="mediaRequests-stats-stats-title" fw={"bold"} size="md">
        {t("titles.stats.main")}
      </Text>
      <Grid className="mediaRequests-stats-stats-grid" gutter={10} w="100%">
        {data.map((stat) => (
          <Grid.Col
            className={combineClasses("mediaRequests-stats-stat-wrapper", `mediaRequests-stats-stat-${stat.name}`)}
            key={stat.name}
            span={3}
          >
            <Tooltip label={t(`titles.stats.${stat.name}`)}>
              <Card p={0} radius={board.itemRadius} className={classes.card}>
                <Stack className="mediaRequests-stats-stat-stack" align="center" gap={0} p="xs">
                  <stat.icon className="mediaRequests-stats-stat-icon" size={30} />
                  <Text className="mediaRequests-stats-stat-value" size="md">
                    {stat.number}
                  </Text>
                </Stack>
              </Card>
            </Tooltip>
          </Grid.Col>
        ))}
      </Grid>
      <Text className="mediaRequests-stats-users-title" fw={"bold"} size="md">
        {t("titles.users.main")}
      </Text>
      <Stack
        className="mediaRequests-stats-users-wrapper"
        flex={1}
        w="100%"
        ref={ref}
        display="flex"
        gap="sm"
        style={{ overflow: "hidden", justifyContent: "end" }}
      >
        {requestStats.users.slice(0, Math.max(Math.floor((height / width) * 5), 1)).map((user) => (
          <Card
            className={combineClasses(
              "mediaRequests-stats-users-user-wrapper",
              `mediaRequests-stats-users-user-${user.id}`,
              classes.card,
            )}
            key={user.id}
            p="sm"
            radius={board.itemRadius}
          >
            <Group className="mediaRequests-stats-users-user-group" h="100%" p={0} gap="sm" display="flex">
              <Tooltip label={user.integration.name}>
                <Avatar
                  className="mediaRequests-stats-users-user-avatar"
                  size="md"
                  src={user.avatar}
                  bd={`2px solid ${user.integration.kind === "overseerr" ? "#ECB000" : "#6677CC"}`}
                />
              </Tooltip>
              <Stack className="mediaRequests-stats-users-user-infos" gap={0}>
                <Text className="mediaRequests-stats-users-user-userName" fw={"bold"} size="md">
                  {user.displayName}
                </Text>
                <Text className="mediaRequests-stats-users-user-request-count" size="md">
                  {`${t("titles.users.requests")}: ${user.requestCount}`}
                </Text>
              </Stack>
              <Space flex={1} />
              <ActionIcon
                className="mediaRequests-stats-users-user-link-button"
                variant="light"
                color="var(--mantine-color-text)"
                size={40}
                component="a"
                radius={board.itemRadius}
                href={user.link}
              >
                <IconExternalLink className="mediaRequests-stats-users-user-link-icon" size={25} />
              </ActionIcon>
            </Group>
          </Card>
        ))}
      </Stack>
    </Stack>
  );
}
