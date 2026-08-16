"use client";

import { ActionIcon, Avatar, Badge, Box, Card, Grid, Group, ScrollArea, Stack, Text, Tooltip } from "@mantine/core";
import type { Icon } from "@tabler/icons-react";
import {
  IconDeviceTv,
  IconHourglass,
  IconLoaderQuarter,
  IconMovie,
  IconPlayerPlay,
  IconReceipt,
  IconSearch,
  IconThumbDown,
  IconThumbUp,
} from "@tabler/icons-react";
import combineClasses from "clsx";

import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import type { RequestStats } from "@homarr/integrations/types";
import { openMediaRequestSearch } from "@homarr/spotlight";
import { useScopedI18n } from "@homarr/translation/client";

import { WidgetEmptyState } from "../../common/empty-state";
import { getSafeApplicationUrl, SAFE_NEW_TAB_REL } from "../../common/application-url";
import { getUsableWidgetQueryData } from "../../common/query-state";
import actionTargetClasses from "../../common/action-target.module.css";
import { IntegrationErrorIndicator } from "../../common/integration-error-indicator";
import type { WidgetComponentProps } from "../../definition";
import { NoIntegrationDataError } from "../../errors/no-data-integration";
import classes from "./component.module.css";
import searchClasses from "../search-button.module.css";

const OVERSEERR_COLOR = "#ECB000";
const JELLYSEERR_COLOR = "#6677CC";

export default function MediaServerWidget({
  integrationIds,
  isEditMode,
  width,
  height,
}: WidgetComponentProps<"mediaRequests-requestStats">) {
  const t = useScopedI18n("widget.mediaRequests-requestStats");
  const requestStats = getUsableWidgetQueryData(clientApi.widget.mediaRequests.getStats.useQuery({ integrationIds }));

  const board = useRequiredBoard();

  if (!requestStats) return <WidgetEmptyState />;
  if (
    requestStats.users.length === 0 &&
    requestStats.stats.length === 0 &&
    requestStats.failedIntegrations.length === 0
  )
    throw new NoIntegrationDataError();

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

  const isTiny = width < 256 || height < 180;
  const showSectionTitles = height >= 180;
  const visibleStats = data.slice(0, height < 120 ? 4 : 8);
  const showIntegrationLegend = requestStats.integrations.length > 1 && height >= 240;

  return (
    <Box className={searchClasses.searchRoot}>
      <Box pos="absolute" top="xs" left="xs" style={{ zIndex: 2 }}>
        <IntegrationErrorIndicator results={requestStats.failedIntegrations} />
      </Box>
      {!isEditMode && <MediaRequestSearchButton integrationIds={integrationIds} />}
      <Stack
        className="mediaRequests-stats-layout"
        h="100%"
        gap="xs"
        p="sm"
        align="center"
        justify="space-between"
        style={{ pointerEvents: isEditMode ? "none" : undefined, overflow: "hidden" }}
      >
        <Stack gap={4} w="100%">
          {showSectionTitles && (
            <Text className="mediaRequests-stats-stats-title" fw={600} ta="center" size={isTiny ? "xs" : "sm"}>
              {t("titles.stats.main")}
            </Text>
          )}
          <Grid className="mediaRequests-stats-stats-grid" gap={4} w="100%">
            {visibleStats.map((stat) => (
              <Grid.Col
                className={combineClasses("mediaRequests-stats-stat-wrapper", `mediaRequests-stats-stat-${stat.name}`)}
                key={stat.name}
                span={isTiny ? 6 : 3}
              >
                <Tooltip label={t(`titles.stats.${stat.name}`)}>
                  <Card p={0} radius={board.itemRadius} className={classes.card}>
                    <Group className="mediaRequests-stats-stat-stack" justify="center" align="center" gap="xs" w="100%">
                      <stat.icon className="mediaRequests-stats-stat-icon" size="var(--mantine-font-size-md)" />
                      <Text className="mediaRequests-stats-stat-value" size="md">
                        {stat.number}
                      </Text>
                    </Group>
                  </Card>
                </Tooltip>
              </Grid.Col>
            ))}
          </Grid>
        </Stack>
        <Stack gap={4} w="100%" style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
          {showSectionTitles && (
            <Text className="mediaRequests-stats-users-title" fw={600} ta="center" size={isTiny ? "xs" : "sm"}>
              {t("titles.users.main")} ({t("titles.users.requests")})
            </Text>
          )}
          <ScrollArea className="mediaRequests-stats-users-wrapper" flex={1} mih={0} w="100%">
            <Stack gap={4}>
              {requestStats.users.map((user) => {
                const href = getSafeApplicationUrl(user.link);
                return (
                  <Card
                    component={href ? "a" : "div"}
                    href={href}
                    target={href ? "_blank" : undefined}
                    rel={href ? SAFE_NEW_TAB_REL : undefined}
                    className={combineClasses(
                      "mediaRequests-stats-users-user-wrapper",
                      `mediaRequests-stats-users-user-${user.id}`,
                      classes.card,
                      classes.userCard,
                    )}
                    key={`${user.integration.id}:${user.id}`}
                    p="xs"
                    radius={board.itemRadius}
                  >
                    <Group
                      className="mediaRequests-stats-users-user-group"
                      h="100%"
                      p={0}
                      gap="sm"
                      justify="space-between"
                    >
                      <Group gap={4} wrap="nowrap" miw={0}>
                        <Tooltip label={user.integration.name}>
                          <Avatar
                            className="mediaRequests-stats-users-user-avatar"
                            size={20}
                            src={user.avatar}
                            bd={`2px solid ${user.integration.kind === "overseerr" ? OVERSEERR_COLOR : JELLYSEERR_COLOR}`}
                          />
                        </Tooltip>
                        <Text className="mediaRequests-stats-users-user-userName" size="sm" truncate="end">
                          {user.displayName}
                        </Text>
                      </Group>

                      <Text className="mediaRequests-stats-users-user-request-count" size="md" fw={500}>
                        {user.requestCount}
                      </Text>
                    </Group>
                  </Card>
                );
              })}
            </Stack>
          </ScrollArea>
          {showIntegrationLegend && (
            <Group justify="center" gap={4}>
              {requestStats.integrations.map((integration) => (
                <Badge key={integration.id} size="xs" variant="light">
                  {integration.name}
                </Badge>
              ))}
            </Group>
          )}
        </Stack>
      </Stack>
    </Box>
  );
}

const MediaRequestSearchButton = ({ integrationIds }: { integrationIds: string[] }) => {
  const t = useScopedI18n("search.mode.media");

  return (
    <Tooltip label={t("action.search.label")}>
      <ActionIcon
        className={`${searchClasses.searchButton} ${actionTargetClasses.root}`}
        variant="light"
        size="sm"
        aria-label={t("action.search.label")}
        onClick={() => openMediaRequestSearch({ integrationIds })}
      >
        <IconSearch size="var(--mantine-font-size-md)" />
      </ActionIcon>
    </Tooltip>
  );
};
