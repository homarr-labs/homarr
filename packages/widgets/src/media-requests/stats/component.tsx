import { ActionIcon, Avatar, Card, Grid, Group, Space, Stack, Text, Tooltip } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import {
  IconDeviceTv,
  IconExternalLink,
  IconHourglass,
  IconMovie,
  IconReceipt,
  IconThumbDown,
  IconThumbUp,
} from "@tabler/icons-react";
import combineClasses from "clsx";

import { useScopedI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../../definition";
import classes from "./component.module.css";
import type { RequestUser } from "../../../../integrations/src/interfaces/media-requests/media-request";

export default function MediaServerWidget({
  isEditMode,
  serverData,
}: WidgetComponentProps<"mediaRequests-requestStats">) {
  //Uncomment this when there is actual serverData
  //if (!serverData?.initialData) return null;

  const t = useScopedI18n("widget.mediaRequests-requestStats");
  const tCommon = useScopedI18n("common");

  const { width, height, ref } = useElementSize();

  const data = [
    {
      name: "approved", //Extrapolability between "approved","pending","declined" and "total", needs 3/4
      icon: IconThumbUp,
      number: 123,
    },
    {
      name: "pending", //Extrapolability between "approved","pending","declined" and "total", needs 3/4
      icon: IconHourglass,
      number: 4,
    },
    {
      name: "declined", //Extrapolability between "approved","pending","declined" and "total", needs 3/4
      icon: IconThumbDown,
      number: 5,
    },
    {
      name: "shows", //Extrapolability if movies present
      icon: IconDeviceTv,
      number: 67,
    },
    {
      name: "movies", //Extrapolability if shows present
      icon: IconMovie,
      number: 56,
    },
    {
      name: "total", //Extrapolability between "approved","pending","declined" and "total", needs 3/4
      icon: IconReceipt,
      number: 132,
    },
  ];

  //Replace all this here with user list from serverData
  const usersData = Array.from({ length: 5 }).fill({
    id: 1,
    profilePictureUrl: "",
    username: "tester",
    link: "",
    app: "overseerr",
    userRequestCount: "1000",
  }) as ({
    app: string;
    userRequestCount: number; //<-- I'd suggest adding both to "RequestUser" as optional fields
  } & RequestUser)[];

  const users = usersData //Insert "serverData.users" here
    .sort((userA, userB) => (userA.userRequestCount > userB.userRequestCount ? -1 : 1))
    .slice(0, Math.max(Math.trunc((height / width) * 5), 1));

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
            span={4}
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
        {users.map((user) => (
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
              <Tooltip label={user.app}>
                <Avatar
                  className="mediaRequests-stats-users-user-avatar"
                  size="12.5cqmin"
                  src={user.profilePictureUrl}
                  bd={`0.5cqmin solid ${user.app === "overseerr" ? "#ECB000" : "#6677CC"}`}
                />
              </Tooltip>
              <Stack className="mediaRequests-stats-users-user-infos" gap="2cqmin">
                <Text className="mediaRequests-stats-users-user-userName" size="6cqmin">
                  {user.username}
                </Text>
                <Text className="mediaRequests-stats-users-user-request-count" size="4cqmin">
                  {tCommon("rtl", { value: t("titles.users.requests"), symbol: tCommon("symbols.colon") }) +
                    user.userRequestCount}
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
