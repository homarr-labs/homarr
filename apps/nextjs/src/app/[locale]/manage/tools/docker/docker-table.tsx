"use client";

import type { MantineColor } from "@mantine/core";
import { Avatar, Badge, Box, Button, Group, Text } from "@mantine/core";
import {
  IconCategoryPlus,
  IconFileText,
  IconPlayerPlay,
  IconPlayerStop,
  IconRefresh,
  IconRotateClockwise,
  IconTrash,
} from "@tabler/icons-react";
import type { MRT_ColumnDef } from "mantine-react-table";
import { MantineReactTable } from "mantine-react-table";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { humanFileSize, useTimeAgo } from "@homarr/common";
import type { ContainerState } from "@homarr/docker";
import { containerStateColorMap, cpuUsageColor, memoryUsageColor, safeValue } from "@homarr/docker/shared";
import { useModalAction } from "@homarr/modals";
import { AddDockerAppToHomarr, DockerLogsModal } from "@homarr/modals-collection";
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
        <Group gap="xs" wrap="nowrap">
          <Avatar
            variant="outline"
            radius="sm"
            size="md"
            styles={{ image: { objectFit: "contain" } }}
            src={row.original.iconUrl}
          >
            {row.original.name.at(0)?.toUpperCase()}
          </Avatar>
          <Text truncate="end" maw={500}>
            {renderedCellValue}
          </Text>
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
    Cell({ renderedCellValue, cell }) {
      return (
        <Box maw={200}>
          <Text truncate="end" title={cell.row.original.image}>
            {renderedCellValue}
          </Text>
        </Box>
      );
    },
  },
  {
    accessorKey: "ports",
    header: t("docker.field.ports.label"),
    Cell({ cell }) {
      const ports = cell.row.original.ports;
      if (!ports || ports.length === 0) return null;
      return (
        <OverflowBadge overflowCount={1} data={ports.map((port) => port.PrivatePort.toString())} />
      );
    },
  },
  {
    id: "cpuUsage",
    accessorKey: "cpuUsage",
    size: 120,
    header: t("docker.field.stats.cpu.label"),
    enableHiding: true,
    sortingFn: (rowA, rowB) => {
      const cpuUsageA = safeValue(rowA.original.cpuUsage);
      const cpuUsageB = safeValue(rowB.original.cpuUsage);

      return cpuUsageA - cpuUsageB;
    },
    Cell({ row }) {
      const cpuUsage = safeValue(row.original.cpuUsage);

      return (
        <Text size="sm" c={cpuUsageColor(cpuUsage, row.original.state)}>
          {cpuUsage.toFixed(2)}%
        </Text>
      );
    },
  },
  {
    id: "memoryUsage",
    accessorKey: "memoryUsage",
    size: 140,
    header: t("docker.field.stats.memory.label"),
    enableHiding: true,
    sortingFn: (rowA, rowB) => {
      const memoryUsageA = safeValue(rowA.original.memoryUsage);
      const memoryUsageB = safeValue(rowB.original.memoryUsage);

      return memoryUsageA - memoryUsageB;
    },
    Cell({ row }) {
      const bytesUsage = safeValue(row.original.memoryUsage);

      return (
        <Text size="sm" c={memoryUsageColor(bytesUsage, row.original.state)}>
          {humanFileSize(bytesUsage)}
        </Text>
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
      placeholder: tDocker("table.search", { count: String(data.containers.length) }),
      style: { minWidth: 300 },
      autoFocus: true,
    },

    initialState: { density: "xs", showGlobalFilter: true, columnVisibility: { cpuUsage: false, memoryUsage: false } },
    renderTopToolbarCustomActions: () => {
      const utils = clientApi.useUtils();
      const { mutate, isPending } = clientApi.docker.invalidate.useMutation({
        async onSuccess() {
          await utils.docker.getContainers.invalidate();
          showSuccessNotification({
            title: tDocker("action.refresh.notification.success.title"),
            message: tDocker("action.refresh.notification.success.message"),
          });
        },
        onError() {
          showErrorNotification({
            title: tDocker("action.refresh.notification.error.title"),
            message: tDocker("action.refresh.notification.error.message"),
          });
        },
      });

      return (
        <Button
          variant="default"
          rightSection={<IconRefresh size="1rem" />}
          onClick={() => mutate()}
          loading={isPending}
        >
          {tDocker("action.refresh.label")}
        </Button>
      );
    },
    renderToolbarAlertBannerContent: ({ groupedAlert, table }) => {
      const dockerContainers = table.getSelectedRowModel().rows.map((row) => row.original);
      return (
        <Group gap={"sm"}>
          {groupedAlert}
          <Text fw={500}>
            {tDocker("table.selected", {
              selectCount: String(table.getSelectedRowModel().rows.length),
              totalCount: String(table.getRowCount()),
            })}
          </Text>
          <ContainerActionBar selectedContainers={dockerContainers} />
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
  selectedContainers: RouterOutputs["docker"]["getContainers"]["containers"];
}

const ContainerActionBar = ({ selectedContainers }: ContainerActionBarProps) => {
  const t = useScopedI18n("docker.action");
  const { openModal } = useModalAction(AddDockerAppToHomarr);
  const { openModal: openLogsModal } = useModalAction(DockerLogsModal);
  const handleClick = () => {
    openModal({
      selectedContainers,
    });
  };

  const selectedIds = selectedContainers.map((container) => container.id);

  const handleShowLogs = () => {
    const targetContainer = selectedContainers.at(0);
    if (!targetContainer) return;
    openLogsModal(
      { id: targetContainer.id, name: targetContainer.name },
      { title: t("logs.modal.title", { name: targetContainer.name }) },
    );
  };

  return (
    <Group gap="xs">
      <ContainerActionBarButton icon={IconPlayerPlay} color="green" action="start" selectedIds={selectedIds} />
      <ContainerActionBarButton icon={IconPlayerStop} color="red" action="stop" selectedIds={selectedIds} />
      <ContainerActionBarButton icon={IconRotateClockwise} color="orange" action="restart" selectedIds={selectedIds} />
      <ContainerActionBarButton icon={IconTrash} color="red" action="remove" selectedIds={selectedIds} />
      <Button
        leftSection={<IconFileText />}
        color="blue"
        onClick={handleShowLogs}
        disabled={selectedContainers.length !== 1}
        variant="light"
        radius="md"
      >
        {t("logs.label")}
      </Button>
      <Button leftSection={<IconCategoryPlus />} color={"red"} onClick={handleClick} variant="light" radius="md">
        {t("addToHomarr.label")}
      </Button>
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
  const utils = clientApi.useUtils();

  const { mutateAsync, isPending } = clientApi.docker[`${props.action}All`].useMutation({
    async onSettled() {
      await utils.docker.getContainers.invalidate();
    },
  });

  const handleClickAsync = async () => {
    await mutateAsync(
      { ids: props.selectedIds },
      {
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

const ContainerStateBadge = ({ state }: { state: ContainerState }) => {
  const t = useScopedI18n("docker.field.state.option");

  return (
    <Badge size="lg" radius="sm" variant="light" w={120} color={containerStateColorMap[state]}>
      {t(state)}
    </Badge>
  );
};

