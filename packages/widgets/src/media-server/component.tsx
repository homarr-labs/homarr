"use client";

import { useMemo } from "react";
import { Avatar, Box, Flex, Group, Stack, Text, Title } from "@mantine/core";
import { IconDeviceAudioTape, IconDeviceTv, IconMovie, IconVideo } from "@tabler/icons-react";
import type { MRT_ColumnDef } from "mantine-react-table";
import { MantineReactTable } from "mantine-react-table";

import { clientApi } from "@homarr/api/client";
import { getIconUrl, integrationDefs } from "@homarr/definitions";
import type { StreamSession } from "@homarr/integrations";
import { createModal, useModalAction } from "@homarr/modals";
import { useScopedI18n } from "@homarr/translation/client";
import { useTranslatedMantineReactTable } from "@homarr/ui/hooks";

import type { WidgetComponentProps } from "../definition";

export default function MediaServerWidget({ integrationIds, isEditMode }: WidgetComponentProps<"mediaServer">) {
  const [currentStreams] = clientApi.widget.mediaServer.getCurrentStreams.useSuspenseQuery(
    {
      integrationIds,
    },
    {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  );
  const utils = clientApi.useUtils();

  const columns = useMemo<MRT_ColumnDef<StreamSession>[]>(
    () => [
      {
        accessorKey: "sessionName",
        header: "Name",
        mantineTableHeadCellProps: {
          style: {
            width: "30%",
          },
        },
        Cell: ({ row }) => (
          <Text size="md" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
            {row.original.sessionName}
          </Text>
        ),
      },
      {
        accessorKey: "user.username",
        header: "User",
        mantineTableHeadCellProps: {
          style: {
            width: "25%",
          },
        },
        Cell: ({ row }) => (
          <Group gap={"sm"}>
            <Avatar src={row.original.user.profilePictureUrl} size={30} />
            <Text size="md">{row.original.user.username}</Text>
          </Group>
        ),
      },
      {
        accessorKey: "currentlyPlaying", // currentlyPlaying.name can be undefined which results in a warning. This is why we use currentlyPlaying instead of currentlyPlaying.name
        header: "Currently playing",
        mantineTableHeadCellProps: {
          style: {
            width: "45%",
          },
        },
        Cell: ({ row }) => {
          if (row.original.currentlyPlaying) {
            return (
              <Box>
                <Text lineClamp={1}>{row.original.currentlyPlaying.name}</Text>
              </Box>
            );
          }

          return null;
        },
      },
    ],
    [],
  );

  clientApi.widget.mediaServer.subscribeToCurrentStreams.useSubscription(
    {
      integrationIds,
    },
    {
      enabled: !isEditMode,
      onData(data) {
        utils.widget.mediaServer.getCurrentStreams.setData({ integrationIds }, (previousData) => {
          return previousData?.map((pair) => {
            if (pair.integrationId === data.integrationId) {
              return {
                ...pair,
                sessions: data.data,
              };
            }
            return pair;
          });
        });
      },
    },
  );

  // Only render the flat list of sessions when the currentStreams change
  // Otherwise it will always create a new array reference and cause the table to re-render
  const flatSessions = useMemo(
    () =>
      currentStreams.flatMap((pair) =>
        pair.sessions.map((session) => ({
          ...session,
          integrationKind: pair.integrationKind,
          integrationName: integrationDefs[pair.integrationKind].name,
          integrationIcon: getIconUrl(pair.integrationKind),
        })),
      ),
    [currentStreams],
  );

  const { openModal } = useModalAction(itemInfoModal);
  const table = useTranslatedMantineReactTable({
    columns,
    data: flatSessions,
    enablePagination: false,
    enableTopToolbar: false,
    enableBottomToolbar: false,
    enableSorting: false,
    enableColumnActions: false,
    enableStickyHeader: false,
    enableColumnOrdering: false,
    enableRowSelection: false,
    enableFullScreenToggle: false,
    enableGlobalFilter: false,
    enableDensityToggle: false,
    enableFilters: false,
    enableHiding: false,
    initialState: {
      density: "xs",
    },
    mantinePaperProps: {
      flex: 1,
      withBorder: false,
      shadow: undefined,
    },
    mantineTableProps: {
      className: "media-server-widget-table",
      style: {
        tableLayout: "fixed",
      },
    },
    mantineTableContainerProps: {
      style: {
        height: "100%",
      },
    },
    mantineTableBodyCellProps: ({ row }) => ({
      onClick: () => {
        openModal({
          item: row.original,
          title:
            row.original.currentlyPlaying?.type === "movie" ? (
              <IconMovie size={36} />
            ) : row.original.currentlyPlaying?.type === "tv" ? (
              <IconDeviceTv size={36} />
            ) : row.original.currentlyPlaying?.type === "video" ? (
              <IconVideo size={36} />
            ) : (
              <IconDeviceAudioTape size={36} />
            ),
        });
      },
    }),
  });

  const uniqueIntegrations = Array.from(new Set(flatSessions.map((session) => session.integrationKind))).map((kind) => {
    const session = flatSessions.find((session) => session.integrationKind === kind);
    return {
      integrationKind: kind,
      integrationIcon: session?.integrationIcon,
      integrationName: session?.integrationName,
    };
  });

  return (
    <Stack gap={0} h="100%" display="flex">
      <MantineReactTable table={table} />
      <Group
        gap="xs"
        h={30}
        px="xs"
        pr="md"
        justify="flex-end"
        style={{
          borderTop: "1px solid var(--border-color)",
        }}
      >
        {uniqueIntegrations.map((integration) => (
          <Group key={integration.integrationKind} gap="xs" align="center">
            <Avatar className="media-server-icon" src={integration.integrationIcon} radius={"xs"} size="xs" />
            <Text className="media-server-name" size="sm">
              {integration.integrationName}
            </Text>
          </Group>
        ))}
      </Group>
    </Stack>
  );
}

const itemInfoModal = createModal<{ item: StreamSession; title: React.ReactNode }>(({ innerProps }) => {
  const t = useScopedI18n("widget.mediaServer.items");

  return (
    <Stack align="center">
      <Flex direction="column" gap="xs" align="center">
        <Title>{innerProps.title}</Title>
        <Title>{innerProps.item.currentlyPlaying?.name}</Title>
        <Group display="flex">
          <Title order={3}>{innerProps.item.currentlyPlaying?.episodeName}</Title>
          {innerProps.item.currentlyPlaying?.seasonName && (
            <>
              {" - "}
              <Title order={3}>{innerProps.item.currentlyPlaying.seasonName}</Title>
            </>
          )}
        </Group>
      </Flex>
      <NormalizedLine itemKey={t("user")} value={innerProps.item.user.username} />
      <NormalizedLine itemKey={t("name")} value={innerProps.item.sessionName} />
      <NormalizedLine itemKey={t("id")} value={innerProps.item.sessionId} />
    </Stack>
  );
}).withOptions({
  defaultTitle() {
    return "";
  },
  size: "auto",
  centered: true,
});

const NormalizedLine = ({ itemKey, value }: { itemKey: string; value: string }) => {
  return (
    <Group w="100%" align="top" justify="space-between">
      <Text>{itemKey}:</Text>
      <Text>{value}</Text>
    </Group>
  );
};
