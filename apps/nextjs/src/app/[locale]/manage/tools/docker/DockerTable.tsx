"use client";

import { Badge, Box, Button, Group, Stack, Text } from "@mantine/core";
import {
  IconPlayerPlay,
  IconPlayerStop,
  IconRotateClockwise,
  IconTrash,
} from "@tabler/icons-react";
import type { MRT_ColumnDef } from "mantine-react-table";
import { MantineReactTable, useMantineReactTable } from "mantine-react-table";
import type { DockerContainer } from "node_modules/@homarr/api/src/router/docker";

import type { RouterOutputs } from "@homarr/api";
import { useTimeAgo } from "@homarr/common";

function ContainerActionBar() {
  return (
    <Group gap="xs">
      <Button
        leftSection={<IconRotateClockwise />}
        variant="light"
        color="orange"
        radius="md"
      >
        Restart
      </Button>
      <Button
        leftSection={<IconPlayerStop />}
        variant="light"
        color="red"
        radius="md"
      >
        Stop
      </Button>
      <Button
        leftSection={<IconPlayerPlay />}
        variant="light"
        color="green"
        radius="md"
      >
        Start
      </Button>
      <Button
        leftSection={<IconTrash />}
        variant="light"
        color="red"
        radius="md"
      >
        Remove
      </Button>
    </Group>
  );
}

function ContainerState({ state }: { state: string }) {
  const options = {
    size: "md",
    radius: "md",
    variant: "outline",
  };
  switch (state) {
    case "running": {
      return (
        <Badge color="green" {...options}>
          Running
        </Badge>
      );
    }
    case "created": {
      return (
        <Badge color="cyan" {...options}>
          Created
        </Badge>
      );
    }
    case "exited": {
      return (
        <Badge color="red" {...options}>
          Exited
        </Badge>
      );
    }
    default: {
      return (
        <Badge color="purple" {...options}>
          {state}
        </Badge>
      );
    }
  }
}

const columns: MRT_ColumnDef<DockerContainer>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "state",
    header: "State",
    Cell({ cell }) {
      return <ContainerState state={cell.getValue<string>()} />;
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
];

export function DockerTable({
  containers,
  timestamp,
}: RouterOutputs["docker"]["getContainers"]) {
  // Note: Clever way to get the return type of a TRPC promise
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
