"use client";

import type { ButtonProps, MantineColor } from "@mantine/core";
import { Avatar, Badge, Box, Button, Group, Stack, Text, Title } from "@mantine/core";
import { IconPlayerPlay, IconPlayerStop, IconRotateClockwise, IconTrash } from "@tabler/icons-react";
import type { MRT_ColumnDef } from "mantine-react-table";
import { MantineReactTable, useMantineReactTable } from "mantine-react-table";

import type { RouterOutputs } from "@homarr/api";
import { useTimeAgo } from "@homarr/common";
import type { DockerContainerState } from "@homarr/definitions";
import { useScopedI18n } from "@homarr/translation/client";
import { OverflowBadge } from "@homarr/ui";

const columns: MRT_ColumnDef<RouterOutputs["docker"]["getContainers"]["containers"][number]>[] = [
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
      return <ContainerStateBadge state={cell.row.original.state} />;
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
  const tDocker = useScopedI18n("docker");
  const relativeTime = useTimeAgo(timestamp);
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
      placeholder: tDocker("table.search", { count: containers.length }),
      style: { minWidth: 300 },
      autoFocus: true,
    },

    initialState: { density: "xs", showGlobalFilter: true },
    renderToolbarAlertBannerContent: ({ groupedAlert, table }) => {
      return (
        <Group gap={"sm"}>
          {groupedAlert}
          <Text fw={500}>
            {tDocker("table.selected", {
              selectCount: table.getSelectedRowModel().rows.length,
              totalCount: table.getRowCount(),
            })}
          </Text>
          <ContainerActionBar />
        </Group>
      );
    },

    columns,
  });
  return (
    <Stack>
      <Title order={3}>{tDocker("title")}</Title>
      <Text>{tDocker("table.updated", { when: relativeTime })}</Text>
      <MantineReactTable table={table} />
    </Stack>
  );
}

const ContainerActionBar = () => {
  const t = useScopedI18n("docker.action");
  const sharedButtonProps = {
    variant: "light",
    radius: "md",
  } satisfies Partial<ButtonProps>;

  return (
    <Group gap="xs">
      <Button leftSection={<IconPlayerPlay />} color="green" {...sharedButtonProps}>
        {t("start")}
      </Button>
      <Button leftSection={<IconPlayerStop />} color="red" {...sharedButtonProps}>
        {t("stop")}
      </Button>
      <Button leftSection={<IconRotateClockwise />} color="orange" {...sharedButtonProps}>
        {t("restart")}
      </Button>
      <Button leftSection={<IconTrash />} color="red" {...sharedButtonProps}>
        {t("remove")}
      </Button>
    </Group>
  );
};

const containerStates = {
  created: "cyan",
  running: "green",
  paused: "yellow",
  restarting: "orange",
  exited: "red",
  removing: "pink",
  dead: "dark",
} satisfies Record<DockerContainerState, MantineColor>;

const ContainerStateBadge = ({ state }: { state: DockerContainerState }) => {
  const t = useScopedI18n("docker.field.state.option");

  return (
    <Badge size="lg" radius="sm" variant="light" w={120} color={containerStates[state]}>
      {t(state)}
    </Badge>
  );
};
