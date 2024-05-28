"use client";

import type { ButtonProps, MantineColor } from "@mantine/core";
import { Avatar, Badge, Box, Button, Group, Stack, Text } from "@mantine/core";
import { IconPlayerPlay, IconPlayerStop, IconRotateClockwise, IconTrash } from "@tabler/icons-react";
import type { MRT_ColumnDef } from "mantine-react-table";
import { MantineReactTable, useMantineReactTable } from "mantine-react-table";
import type { DockerContainer } from "node_modules/@homarr/api/src/router/docker";

import type { RouterOutputs } from "@homarr/api";
import { useTimeAgo } from "@homarr/common";
import type { DockerContainerStatus } from "@homarr/definitions";
import { OverflowBadge } from "@homarr/ui";

const columns: MRT_ColumnDef<DockerContainer>[] = [
  {
    accessorKey: "name",
    header: "Name",
    Cell({ renderedCellValue, row }) {
      return (
        <Group gap="xs">
          <Avatar variant="outline" radius="lg" size="md" src={row.original.iconUrl}>
            {row.original.name.at(0)?.toUpperCase()}
          </Avatar>
          <Text>{renderedCellValue}</Text>
        </Group>
      );
    },
  },
  {
    accessorKey: "state",
    header: "Status",
    size: 120,
    Cell({ cell }) {
      return <ContainerStatusBadge status={cell.row.original.state} />;
    },
  },
  {
    accessorKey: "image",
    header: "Image",
    maxSize: 200,
    Cell({ renderedCellValue }) {
      return (
        <Box maw={200}>
          <Text truncate="end">{renderedCellValue}</Text>
        </Box>
      );
    },
  },
  {
    accessorKey: "ports",
    header: "Ports",
    Cell({ cell }) {
      return (
        <OverflowBadge overflowCount={1} data={cell.row.original.ports.map((port) => port.PrivatePort.toString())} />
      );
    },
  },
];

export function DockerTable({ containers, timestamp }: RouterOutputs["docker"]["getContainers"]) {
  const relateiveTime = useTimeAgo(timestamp, "en");
  const table = useMantineReactTable({
    data: containers,
    enableDensityToggle: false,
    enableColumnActions: false,
    enableColumnFilters: false,
    enablePagination: false,
    enableRowSelection: true,
    positionToolbarAlertBanner: "top",
    enableTableFooter: false,
    enableBottomToolbar: false,
    positionGlobalFilter: "right",
    mantineSearchTextInputProps: {
      placeholder: `Search ${containers.length} containers`,
      style: { minWidth: 300 },
      autoFocus: true,
    },

    initialState: { density: "xs", showGlobalFilter: true },
    renderToolbarAlertBannerContent: ({ groupedAlert, table }) => {
      const selectedRows = table.getSelectedRowModel();
      const totalRows = table.getRowCount();
      const selectedCount = selectedRows.rows.length;

      return (
        <Group gap={"sm"}>
          {groupedAlert}
          <Text fw={500}>
            {selectedCount} of {totalRows} containers selected
          </Text>
          <ContainerActionBar />
        </Group>
      );
    },

    columns,
  });
  return (
    <Stack>
      <h3>Containers</h3>
      <p>Updated {relateiveTime}</p>
      <MantineReactTable table={table} />
    </Stack>
  );
}

const ContainerActionBar = () => {
  const sharedButtonProps = {
    variant: "light",
    radius: "md",
  } satisfies Partial<ButtonProps>;

  return (
    <Group gap="xs">
      <Button leftSection={<IconRotateClockwise />} color="orange" {...sharedButtonProps}>
        Restart
      </Button>
      <Button leftSection={<IconPlayerStop />} color="red" {...sharedButtonProps}>
        Stop
      </Button>
      <Button leftSection={<IconPlayerPlay />} color="green" {...sharedButtonProps}>
        Start
      </Button>
      <Button leftSection={<IconTrash />} color="red" {...sharedButtonProps}>
        Remove
      </Button>
    </Group>
  );
};

const containerStatus = {
  created: "cyan",
  running: "green",
  paused: "yellow",
  restarting: "orange",
  exited: "red",
  removing: "pink",
  dead: "dark",
} satisfies Record<DockerContainerStatus, MantineColor>;

const ContainerStatusBadge = ({ status }: { status: DockerContainerStatus }) => {
  return (
    <Badge size="lg" radius="sm" variant="light" w={120} color={containerStatus[status]}>
      {status}
    </Badge>
  );
};
