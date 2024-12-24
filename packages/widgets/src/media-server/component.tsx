"use client";

import { useMemo, useState } from "react";
import type { MantineStyleProp } from "@mantine/core";
import { Avatar, Box, Center, Flex, Group, Image, Modal, Stack, Text, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconDeviceAudioTape, IconDeviceTv, IconMovie, IconVideo } from "@tabler/icons-react";
import type { MRT_ColumnDef } from "mantine-react-table";
import { MantineReactTable } from "mantine-react-table";

import { clientApi } from "@homarr/api/client";
import { integrationDefs } from "@homarr/definitions";
import type { StreamSession } from "@homarr/integrations";
import { useScopedI18n } from "@homarr/translation/client";
import { useTranslatedMantineReactTable } from "@homarr/ui/hooks";

import type { WidgetComponentProps } from "../definition";

export default function MediaServerWidget({ integrationIds, isEditMode }: WidgetComponentProps<"mediaServer">) {
  const [clickedIndex, setClickedIndex] = useState<number>(0);
  const [opened, { open, close }] = useDisclosure(false);
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
          <Text style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{row.original.sessionName}</Text>
        ),
      },
      {
        accessorKey: "user.username",
        header: "User",
        Cell: ({ row }) => (
          <Group gap={"2cqmin"}>
            <Avatar src={row.original.user.profilePictureUrl} size={"sm"} />
            <Text>{row.original.user.username}</Text>
          </Group>
        ),
      },
      {
        accessorKey: "currentlyPlaying", // currentlyPlaying.name can be undefined which results in a warning. This is why we use currentlyPlaying instead of currentlyPlaying.name
        header: "Currently playing",
        Cell: ({ row }) => {
          if (row.original.currentlyPlaying) {
            return (
              <Box>
                <Text style={{ whiteSpace: "normal" }}>{row.original.currentlyPlaying.name}</Text>
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
        })),
      ),
    [currentStreams],
  );

  const baseStyle: MantineStyleProp = {
    "--total-width": "calc(100cqw / var(--total-width))",
    "--ratio-width": "calc(100cqw / var(--total-width))",
    "--space-size": "calc(var(--ratio-width) * 0.1)", //Standard gap and spacing value
    "--text-fz": "calc(var(--ratio-width) * 0.45)", //General Font Size
    "--mrt-base-background-color": "transparent",
  };

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
        setClickedIndex(row.index);
        open();
      },
    }),
  });

  return (
    <Stack gap={0} h="100%" display="flex" style={baseStyle}>
      <MantineReactTable table={table} />
      {flatSessions[0]?.integrationKind && (
        <Group
          gap="1cqmin"
          h="var(--ratio-width)"
          px="var(--space-size)"
          pr="5cqmin"
          justify="flex-end"
          style={{
            borderTop: "0.0625rem solid var(--border-color)",
          }}
        >
          <Image
            className="media-server-icon"
            src={integrationDefs[flatSessions[0].integrationKind].iconUrl}
            w="sm"
            h="sm"
            fit="contain"
          />
          <Text className="media-server-name" size="sm">
            {integrationDefs[flatSessions[0].integrationKind].name}
          </Text>
        </Group>
      )}
      <ItemInfoModal items={flatSessions} currentIndex={clickedIndex} opened={opened} onClose={close} />
    </Stack>
  );
}

interface ItemInfoModalProps {
  items: StreamSession[];
  currentIndex: number;
  opened: boolean;
  onClose: () => void;
}

const ItemInfoModal = ({ items, currentIndex, opened, onClose }: ItemInfoModalProps) => {
  const t = useScopedI18n("widget.mediaServer.items");
  const item = useMemo<StreamSession | undefined>(() => items[currentIndex], [items, currentIndex]);
  const currentlyPlayingType =
    item?.currentlyPlaying?.type === "movie" ? (
      <IconMovie size={20} />
    ) : item?.currentlyPlaying?.type === "tv" ? (
      <IconDeviceTv size={20} />
    ) : item?.currentlyPlaying?.type === "video" ? (
      <IconVideo size={20} />
    ) : item?.currentlyPlaying?.type === "audio" ? (
      <IconDeviceAudioTape size={20} />
    ) : null;

  return (
    <Modal opened={opened} onClose={onClose} centered title={currentlyPlayingType} size="auto">
      {item === undefined ? (
        <Center>{"No item found"}</Center>
      ) : (
        <Stack align="center">
          <Flex direction="column" gap="xs" align="center">
            <Title>{item.currentlyPlaying?.name}</Title>
            <Title order={3}>
              {item.currentlyPlaying?.episodeName} (
              {item.currentlyPlaying?.seasonName && item.currentlyPlaying.seasonName})
            </Title>
          </Flex>
          <NormalizedLine itemKey={t("user")} value={item.user.username} />
          <NormalizedLine itemKey={t("name")} value={item.sessionName} />
          <NormalizedLine itemKey={t("id")} value={item.sessionId} />
        </Stack>
      )}
    </Modal>
  );
};

const NormalizedLine = ({ itemKey, value }: { itemKey: string; value: string }) => {
  return (
    <Group w="100%" align="top" justify="space-between">
      <Text>{itemKey}</Text>
      <Text>{value}</Text>
    </Group>
  );
};
