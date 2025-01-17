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

  if (requestStats.users.length === 0 && requestStats.stats.length === 0) throw new NoIntegrationDataError();

  //Add processing and available
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
      gap="2cqmin"
      p="2cqmin"
      align="center"
      style={{ pointerEvents: isEditMode ? "none" : undefined }}
    >
      <Text className="mediaRequests-stats-stats-title" size="6.5cqmin">
        {t("titles.stats.main")}
      </Text>
      <Grid className="mediaRequests-stats-stats-grid" gutter={0} w="100%">
        {data.map((stat) => (
          <Grid.Col
            className={combineClasses(
              classes.gridElement,
              "mediaRequests-stats-stat-wrapper",
              `mediaRequests-stats-stat-${stat.name}`,
            )}
            key={stat.name}
            span={3}
          >
            <Tooltip label={t(`titles.stats.${stat.name}`)}>
              <Stack className="mediaRequests-stats-stat-stack" align="center" gap="2cqmin" p="2cqmin">
                <stat.icon className="mediaRequests-stats-stat-icon" size="7.5cqmin" />
                <Text className="mediaRequests-stats-stat-value" size="5cqmin">
                  {stat.number}
                </Text>
              </Stack>
            </Tooltip>
          </Grid.Col>
        ))}
      </Grid>
      <Text className="mediaRequests-stats-users-title" size="6.5cqmin">
        {t("titles.users.main")}
      </Text>
      <Stack
        className="mediaRequests-stats-users-wrapper"
        flex={1}
        w="100%"
        ref={ref}
        display="flex"
        gap="2cqmin"
        style={{ overflow: "hidden" }}
      >
        {requestStats.users.slice(0, Math.max(Math.floor((height / width) * 5), 1)).map((user) => (
          <Card
            className={combineClasses(
              "mediaRequests-stats-users-user-wrapper",
              `mediaRequests-stats-users-user-${user.id}`,
            )}
            key={user.id}
            withBorder
            p="2cqmin"
            flex={1}
            mah="38.5cqmin"
            radius="2.5cqmin"
          >
            <Group className="mediaRequests-stats-users-user-group" h="100%" p={0} gap="2cqmin" display="flex">
              <Tooltip label={user.integration.name}>
                <Avatar
                  className="mediaRequests-stats-users-user-avatar"
                  size="12.5cqmin"
                  src={user.avatar}
                  bd={`0.5cqmin solid ${user.integration.kind === "overseerr" ? "#ECB000" : "#6677CC"}`}
                />
              </Tooltip>
              <Stack className="mediaRequests-stats-users-user-infos" gap="2cqmin">
                <Text className="mediaRequests-stats-users-user-userName" size="6cqmin">
                  {user.displayName}
                </Text>
                <Text className="mediaRequests-stats-users-user-request-count" size="4cqmin">
                  {`${t("titles.users.requests")}: ${user.requestCount}`}
                </Text>
              </Stack>
              <Space flex={1} />
              <ActionIcon
                className="mediaRequests-stats-users-user-link-button"
                variant="light"
                color="var(--mantine-color-text)"
                size="10cqmin"
                component="a"
                href={user.link}
              >
                <IconExternalLink className="mediaRequests-stats-users-user-link-icon" size="7.5cqmin" />
              </ActionIcon>
            </Group>
          </Card>
        ))}
      </Stack>
    </Stack>
  );
}
