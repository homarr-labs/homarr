"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import type { MantineColor } from "@mantine/core";
import { ActionIcon, Avatar, Badge, Box, Button, Group, Menu, Text, Tooltip } from "@mantine/core";
import {
  IconCategoryPlus,
  IconDots,
  IconFileText,
  IconPlayerPlay,
  IconPlayerStop,
  IconRefresh,
  IconRotateClockwise,
  IconTrash,
} from "@tabler/icons-react";
import type { MRT_ColumnDef, MRT_Row } from "mantine-react-table";
import { MantineReactTable } from "mantine-react-table";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { humanFileSize, useTimeAgo } from "@homarr/common";
import type { ContainerState } from "@homarr/docker";
import { containerStateColorMap, cpuUsageColor, memoryUsageColor, safeValue } from "@homarr/docker/shared";
import { useModalAction } from "@homarr/modals";
import { AddDockerAppToHomarr } from "@homarr/modals-collection";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import type { TranslationFunction } from "@homarr/translation";
import { useI18n, useScopedI18n } from "@homarr/translation/client";
import type { TablerIcon } from "@homarr/ui";
import { OverflowBadge } from "@homarr/ui";
import { useTranslatedMantineReactTable } from "@homarr/ui/hooks";

type DockerContainer = RouterOutputs["docker"]["getContainers"]["containers"][number];

const createContainerLogsPath = (container: Pick<DockerContainer, "id" | "name">) =>
  `/manage/tools/docker/logs/${container.id}?name=${encodeURIComponent(container.name)}`;

const createColumns = (t: TranslationFunction): MRT_ColumnDef<DockerContainer>[] => [
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
    accessorKey: "host",
    header: t("docker.field.host.label"),
    size: 140,
    Cell({ row }) {
      return (
        <Text truncate="end" title={row.original.host}>
          {row.original.host}
        </Text>
      );
    },
  },
  {
    accessorKey: "image",
    header: t("docker.field.containerImage.label"),
    maxSize: 200,
    Cell({ renderedCellValue, cell }) {
      return (
        <Tooltip label={cell.row.original.image} multiline maw={400}>
          <Box maw={200}>
            <Text truncate="end">{renderedCellValue}</Text>
          </Box>
        </Tooltip>
      );
    },
  },
  {
    accessorKey: "ports",
    header: t("docker.field.ports.label"),
    Cell({ cell }) {
      if (!cell.row.original.ports) return null;
      if (!cell.row.original.ports.length) return null;
      return (
        <OverflowBadge overflowCount={1} data={cell.row.original.ports.map((port) => port.PrivatePort.toString())} />
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

interface DockerTableProps {
  initialData?: RouterOutputs["docker"]["getContainers"];
}

export function DockerTable({ initialData }: DockerTableProps) {
  const t = useI18n();
  const tDocker = useScopedI18n("docker");
  const { data, isFetching, refetch } = clientApi.docker.getContainers.useQuery(undefined, {
    initialData,
    refetchOnMount: false,
  });
  const relativeTime = useTimeAgo(data?.timestamp ?? new Date());
  const mutate = useCallback(() => {
    void refetch().then((result) => {
      if (result.isError) {
        showErrorNotification({
          title: tDocker("action.refresh.notification.error.title"),
          message: tDocker("action.refresh.notification.error.message"),
        });
      } else {
        showSuccessNotification({
          title: tDocker("action.refresh.notification.success.title"),
          message: tDocker("action.refresh.notification.success.message"),
        });
      }
    });
  }, [refetch, tDocker]);

  const containers = data?.containers ?? [];

  const table = useTranslatedMantineReactTable({
    data: containers,
    state: { isLoading: isFetching },
    enableDensityToggle: false,
    enableColumnActions: false,
    enableColumnFilters: false,
    enablePagination: false,
    enableRowSelection: true,
    enableRowActions: true,
    positionActionsColumn: "last",
    positionToolbarAlertBanner: "top",
    enableTableFooter: false,
    enableBottomToolbar: false,
    positionGlobalFilter: "right",
    mantineSearchTextInputProps: {
      placeholder: tDocker("table.search", { count: String(containers.length) }),
      style: { minWidth: 300 },
      autoFocus: true,
    },

    initialState: { density: "xs", showGlobalFilter: true, columnVisibility: { cpuUsage: false, memoryUsage: false } },
    mantineTableBodyCellProps: { style: { padding: "4px 8px" } },
    mantineTableHeadCellProps: { style: { padding: "4px 8px" } },
    renderRowActions: ({ row }: { row: MRT_Row<DockerContainer> }) => <ContainerRowMenu container={row.original} />,
    renderTopToolbarCustomActions: () => (
      <Button
        variant="default"
        rightSection={<IconRefresh size="1rem" />}
        onClick={() => mutate()}
        loading={isFetching}
      >
        {tDocker("action.refresh.label")}
      </Button>
    ),
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

const containerActions: { action: "start" | "stop" | "restart" | "remove"; icon: TablerIcon; color: MantineColor }[] = [
  { action: "start", icon: IconPlayerPlay, color: "green" },
  { action: "stop", icon: IconPlayerStop, color: "red" },
  { action: "restart", icon: IconRotateClockwise, color: "orange" },
  { action: "remove", icon: IconTrash, color: "red" },
];

const ContainerRowMenu = ({ container }: { container: DockerContainer }) => {
  const t = useScopedI18n("docker.action");
  const router = useRouter();
  const utils = clientApi.useUtils();
  const { openModal } = useModalAction(AddDockerAppToHomarr);

  const useContainerAction = (action: "start" | "stop" | "restart" | "remove") =>
    clientApi.docker[`${action}All`].useMutation({
      async onSettled() {
        await utils.docker.getContainers.invalidate();
      },
      onSuccess() {
        showSuccessNotification({
          title: t(`${action}.notification.success.title`),
          message: t(`${action}.notification.success.message`),
        });
      },
      onError() {
        showErrorNotification({
          title: t(`${action}.notification.error.title`),
          message: t(`${action}.notification.error.message`),
        });
      },
    });

  const mutations = {
    start: useContainerAction("start"),
    stop: useContainerAction("stop"),
    restart: useContainerAction("restart"),
    remove: useContainerAction("remove"),
  };

  return (
    <Menu withinPortal position="bottom-end" shadow="sm">
      <Menu.Target>
        <ActionIcon variant="subtle" color="gray" onClick={(e) => e.stopPropagation()}>
          <IconDots size="1rem" />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          leftSection={<IconFileText size="1rem" />}
          onClick={() => router.push(createContainerLogsPath(container))}
        >
          {t("logs.label")}
        </Menu.Item>
        <Menu.Divider />
        {containerActions.map(({ action, icon: Icon, color }) => (
          <Menu.Item
            key={action}
            leftSection={<Icon size="1rem" />}
            color={color}
            onClick={() => mutations[action].mutate({ ids: [container.id] })}
          >
            {t(`${action}.label`)}
          </Menu.Item>
        ))}
        <Menu.Divider />
        <Menu.Item
          leftSection={<IconCategoryPlus size="1rem" />}
          color="red"
          onClick={() => openModal({ selectedContainers: [container] })}
        >
          {t("addToHomarr.label")}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};

interface ContainerActionBarProps {
  selectedContainers: DockerContainer[];
}

const ContainerActionBar = ({ selectedContainers }: ContainerActionBarProps) => {
  const t = useScopedI18n("docker.action");
  const { openModal } = useModalAction(AddDockerAppToHomarr);

  const selectedIds = selectedContainers.map((container) => container.id);

  return (
    <Group gap="xs">
      {containerActions.map(({ action, icon, color }) => (
        <ContainerActionBarButton key={action} icon={icon} color={color} action={action} selectedIds={selectedIds} />
      ))}
      <Button
        leftSection={<IconCategoryPlus />}
        color="red"
        onClick={() => openModal({ selectedContainers })}
        variant="light"
      >
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
