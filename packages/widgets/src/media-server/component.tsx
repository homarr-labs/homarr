"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import { Avatar, Flex, Group, Stack, Text, Title } from "@mantine/core";
import { IconDeviceTv, IconHeadphones, IconMovie, IconVideo } from "@tabler/icons-react";
import type { MRT_ColumnDef } from "mantine-react-table";
import { MantineReactTable } from "mantine-react-table";

import { clientApi } from "@homarr/api/client";
import { getIconUrl, integrationDefs } from "@homarr/definitions";
import type { StreamSession } from "@homarr/integrations";
import { createModal, useModalAction } from "@homarr/modals";
import { useScopedI18n } from "@homarr/translation/client";
import type { TablerIcon } from "@homarr/ui";
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

        Cell: ({ row }) => (
          <Text size="xs" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
            {row.original.sessionName}
          </Text>
        ),
      },
      {
        accessorKey: "user.username",
        header: "User",

        Cell: ({ row }) => (
          <Group gap="xs">
            <Avatar size={20} src={row.original.user.profilePictureUrl} />
            <Text size="xs">{row.original.user.username}</Text>
          </Group>
        ),
      },
      {
        accessorKey: "currentlyPlaying", // currentlyPlaying.name can be undefined which results in a warning. This is why we use currentlyPlaying instead of currentlyPlaying.name
        header: "Currently playing",

        Cell: ({ row }) => {
          if (!row.original.currentlyPlaying) return null;

          const Icon = mediaTypeIconMap[row.original.currentlyPlaying.type];

          return (
            <Group gap="xs" align="center">
              <Icon size={16} />
              <Text size="xs" lineClamp={1}>
                {row.original.currentlyPlaying.name}
              </Text>
            </Group>
          );
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
    enableColumnPinning: true,
    initialState: {
      density: "xs",
      columnPinning: {
        right: ["currentlyPlaying"],
      },
    },
    mantineTableHeadProps: {
      fz: "xs",
    },
    mantineTableHeadCellProps: {
      py: 4,
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
        openModal(
          {
            item: row.original,
          },
          {
            title: row.original.sessionName,
          },
        );
      },
      py: 4,
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

const itemInfoModal = createModal<{ item: StreamSession }>(({ innerProps }) => {
  const t = useScopedI18n("widget.mediaServer.items");
  const Icon = innerProps.item.currentlyPlaying ? mediaTypeIconMap[innerProps.item.currentlyPlaying.type] : null;

  return (
    <Stack align="center">
      <Flex direction="column" gap="xs" align="center">
        {Icon && innerProps.item.currentlyPlaying !== null && (
          <Group gap="sm" align="center">
            <Icon size={24} />
            <Title order={2}>{innerProps.item.currentlyPlaying.name}</Title>
          </Group>
        )}
        {innerProps.item.currentlyPlaying?.episodeName && (
          <Group>
            <Title order={4}>{innerProps.item.currentlyPlaying.episodeName}</Title>
            {innerProps.item.currentlyPlaying.seasonName && (
              <>
                {" - "}
                <Title order={4}>{innerProps.item.currentlyPlaying.seasonName}</Title>
              </>
            )}
          </Group>
        )}
      </Flex>
      <NormalizedLine
        itemKey={t("user")}
        value={
          <Group gap="sm" align="center">
            <Avatar size="sm" src={innerProps.item.user.profilePictureUrl} />{" "}
            <Text>{innerProps.item.user.username}</Text>
          </Group>
        }
      />
      <NormalizedLine itemKey={t("name")} value={<Text>{innerProps.item.sessionName}</Text>} />
      <NormalizedLine itemKey={t("id")} value={<Text>{innerProps.item.sessionId}</Text>} />
    </Stack>
  );
}).withOptions({
  defaultTitle() {
    return "";
  },
  size: "lg",
  centered: true,
});

const NormalizedLine = ({ itemKey, value }: { itemKey: string; value: ReactNode }) => {
  return (
    <Group w="100%" align="top" justify="space-between">
      <Text>{itemKey}:</Text>
      {value}
    </Group>
  );
};

const mediaTypeIconMap = {
  movie: IconMovie,
  tv: IconDeviceTv,
  video: IconVideo,
  audio: IconHeadphones,
} satisfies Record<Exclude<StreamSession["currentlyPlaying"], null>["type"], TablerIcon>;
