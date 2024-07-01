"use client";

import { useMemo } from "react";
import { Avatar, Box, Group, Text } from "@mantine/core";
import { useListState } from "@mantine/hooks";
import type { MRT_ColumnDef } from "mantine-react-table";
import { MantineReactTable, useMantineReactTable } from "mantine-react-table";

import { clientApi } from "@homarr/api/client";
import type { StreamSession } from "@homarr/integrations";

import type { WidgetComponentProps } from "../definition";

export default function MediaServerWidget({
  serverData,
  integrationIds,
  isEditMode,
}: WidgetComponentProps<"mediaServer">) {
  const [currentStreams, currentStreamsHandlers] = useListState<{ integrationId: string; sessions: StreamSession[] }>(
    serverData?.initialData ?? [],
  );
  const columns = useMemo<MRT_ColumnDef<StreamSession>[]>(
    () => [
      {
        accessorKey: "sessionName",
        header: "Name",
      },
      {
        accessorKey: "user.username",
        header: "User",
        Cell: ({ row }) => (
          <Group gap={"xs"}>
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
              <div>
                <span>{row.original.currentlyPlaying.name}</span>
              </div>
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
        currentStreamsHandlers.applyWhere(
          (pair) => pair.integrationId == data.integrationId,
          (pair) => {
            return {
              ...pair,
              sessions: data.data,
            };
          },
        );
      },
    },
  );

  // Only render the flat list of sessions when the currentStreams change
  // Otherwise it will always create a new array reference and cause the table to re-render
  const flatSessions = useMemo(() => currentStreams.flatMap((pair) => pair.sessions), [currentStreams]);

  const table = useMantineReactTable({
    columns,
    data: flatSessions,
    enableRowSelection: false,
    enableColumnOrdering: false,
    enableFullScreenToggle: false,
    enableGlobalFilter: false,
    enableDensityToggle: false,
    enableFilters: false,
    enablePagination: true,
    enableSorting: true,
    enableHiding: false,
    enableTopToolbar: false,
    enableColumnActions: false,
    enableStickyHeader: true,
    initialState: {
      density: "xs",
    },
    mantinePaperProps: {
      display: "flex",
      h: "100%",
      withBorder: false,
      style: {
        flexDirection: "column",
      },
    },
    mantineTableProps: {
      style: {
        tableLayout: "fixed",
      },
    },
    mantineTableContainerProps: {
      style: {
        flexGrow: 5,
      },
    },
  });

  return (
    <Box h="100%">
      <MantineReactTable table={table} />
    </Box>
  );
}
