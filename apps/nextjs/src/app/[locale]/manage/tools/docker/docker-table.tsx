"use client";

import type { MantineColor } from "@mantine/core";
import { Avatar, Badge, Box, Button, Group, Text } from "@mantine/core";
import { IconPlayerPlay, IconPlayerStop, IconRotateClockwise, IconTrash } from "@tabler/icons-react";
import type { MRT_ColumnDef } from "mantine-react-table";
import { MantineReactTable } from "mantine-react-table";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useTimeAgo } from "@homarr/common";
import type { DockerContainerState } from "@homarr/definitions";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import type { TranslationFunction } from "@homarr/translation";
import { useI18n, useScopedI18n } from "@homarr/translation/client";
import type { TablerIcon } from "@homarr/ui";
import { OverflowBadge } from "@homarr/ui";
import { useTranslatedMantineReactTable } from "@homarr/ui/hooks";

const createColumns = (
  t: TranslationFunction,
): MRT_ColumnDef<RouterOutputs["docker"]["getContainers"]["containers"][number]>[] => [
  {
    accessorKey: "name",
    header: t("docker.field.name.label"),
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
    header: t("docker.field.state.label"),
    size: 120,
    Cell({ cell }) {
      return <ContainerStateBadge state={cell.row.original.state} />;
    },
  },
  {
    accessorKey: "image",
    header: t("docker.field.containerImage.label"),
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
    header: t("docker.field.ports.label"),
    Cell({ cell }) {
      return (
        <OverflowBadge overflowCount={1} data={cell.row.original.ports.map((port) => port.PrivatePort.toString())} />
      );
    },
  },
];

export function DockerTable(initialData: RouterOutputs["docker"]["getContainers"]) {
  const t = useI18n();
  const tDocker = useScopedI18n("docker");
  const { data } = clientApi.docker.getContainers.useQuery(undefined, {
    initialData,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const relativeTime = useTimeAgo(data.timestamp);
  const table = useTranslatedMantineReactTable({
    data: data.containers,
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
      placeholder: tDocker("table.search", { count: data.containers.length }),
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
          <ContainerActionBar selectedIds={table.getSelectedRowModel().rows.map((row) => row.original.id)} />
        </Group>
      );
    },

    columns: createColumns(t),
  });

  return (
    <>
      <Text>{tDocker("table.updated", { when: relativeTime })}</Text>
      <MantineReactTable table={table} />
    </>
  );
}

interface ContainerActionBarProps {
  selectedIds: string[];
}

const ContainerActionBar = ({ selectedIds }: ContainerActionBarProps) => {
  return (
    <Group gap="xs">
      <ContainerActionBarButton icon={IconPlayerPlay} color="green" action="start" selectedIds={selectedIds} />
      <ContainerActionBarButton icon={IconPlayerStop} color="red" action="stop" selectedIds={selectedIds} />
      <ContainerActionBarButton icon={IconRotateClockwise} color="orange" action="restart" selectedIds={selectedIds} />
      <ContainerActionBarButton icon={IconTrash} color="red" action="remove" selectedIds={selectedIds} />
    </Group>
  );
};

interface ContainerActionBarButtonProps {
  icon: TablerIcon;
  color: MantineColor;
  action: "start" | "stop" | "restart" | "remove";
  selectedIds: string[];
}

const ContainerActionBarButton = (props: ContainerActionBarButtonProps) => {
  const t = useScopedI18n("docker.action");
  const { mutateAsync, isPending } = clientApi.docker[`${props.action}All`].useMutation();
  const utils = clientApi.useUtils();

  const handleClickAsync = async () => {
    await mutateAsync(
      { ids: props.selectedIds },
      {
        async onSettled() {
          await utils.docker.getContainers.invalidate();
        },
        onSuccess() {
          showSuccessNotification({
            title: t(`${props.action}.notification.success.title`),
            message: t(`${props.action}.notification.success.message`),
          });
        },
        onError() {
          showErrorNotification({
            title: t(`${props.action}.notification.error.title`),
            message: t(`${props.action}.notification.error.message`),
          });
        },
      },
    );
  };

  return (
    <Button
      leftSection={<props.icon />}
      color={props.color}
      onClick={handleClickAsync}
      loading={isPending}
      variant="light"
      radius="md"
    >
      {t(`${props.action}.label`)}
    </Button>
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
