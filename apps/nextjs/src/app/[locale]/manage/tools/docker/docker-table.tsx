"use client";

import { useRouter } from "next/navigation";
import type { MantineColor } from "@mantine/core";
import { ActionIcon, Alert, Avatar, Badge, Box, Button, Group, Menu, Stack, Text, Tooltip } from "@mantine/core";
import {
  IconAlertTriangle,
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
import { formatBytes, useTimeAgo } from "@homarr/common";
import { invariantTechnicalLabels } from "@homarr/definitions";
import type { ContainerState, DockerEndpointCapability } from "@homarr/docker";
import { containerStateColorMap, cpuUsageColor, memoryUsageColor, safeValue } from "@homarr/docker/shared";
import { useModalAction } from "@homarr/modals";
import { AddDockerAppToHomarr, useDockerContainerRemovalConfirmation } from "@homarr/modals-collection";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import type { ScopedTranslationFunction } from "@homarr/translation";
import { useI18n } from "@homarr/translation/client";
import type { TablerIcon } from "@homarr/ui";
import { OverflowBadge } from "@homarr/ui";
import { useTranslatedMantineReactTable } from "@homarr/ui/hooks";

type DockerContainer = RouterOutputs["docker"]["getContainers"]["containers"][number];
type DockerEndpoint = RouterOutputs["docker"]["getContainers"]["endpoints"][number];

const createContainerLogsPath = (container: Pick<DockerContainer, "endpointId" | "id" | "name">) =>
  `/manage/tools/docker/logs/${container.id}?name=${encodeURIComponent(container.name)}&endpointId=${encodeURIComponent(container.endpointId)}`;

const getContainerTarget = ({ endpointId, id }: DockerContainer) => ({ endpointId, id });

const showContainerActionResult = (
  action: "start" | "stop" | "restart" | "remove",
  containers: DockerContainer[],
  results: RouterOutputs["docker"]["startAll"],
  t: ScopedTranslationFunction<"docker.action">,
) => {
  const failures = results.filter((result) => !result.success);
  if (failures.length === 0) {
    showSuccessNotification({
      title: t(`${action}.notification.success.title`),
      message: t(`${action}.notification.success.message`),
    });
    return;
  }

  const failedNames = failures.map(
    ({ target }) =>
      containers.find(({ endpointId, id }) => endpointId === target.endpointId && id === target.id)?.name ?? target.id,
  );
  showErrorNotification({
    title: t("result.failure.title"),
    message: t("result.failure.message", {
      failed: String(failures.length),
      total: String(results.length),
      names: failedNames.join(", "),
    }),
  });
};

const createColumns = (
  tDocker: ScopedTranslationFunction<"docker">,
  tCommon: ScopedTranslationFunction<"common">,
): MRT_ColumnDef<DockerContainer>[] => [
  {
    accessorKey: "name",
    header: tCommon("field.name"),
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
    header: tDocker("field.state.label"),
    size: 120,
    Cell({ cell }) {
      return <ContainerStateBadge state={cell.row.original.state} />;
    },
  },
  {
    accessorKey: "host",
    header: tDocker("field.host.label"),
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
    header: tDocker("field.containerImage.label"),
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
    header: tDocker("field.ports.label"),
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
    header: invariantTechnicalLabels.cpu,
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
    header: tDocker("field.stats.memory.label"),
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
          {formatBytes(bytesUsage)}
        </Text>
      );
    },
  },
];

interface DockerTableProps {
  initialData?: RouterOutputs["docker"]["getContainers"];
}

export function DockerTable({ initialData }: DockerTableProps) {
  const tDocker = useI18n("docker");
  const tCommon = useI18n("common");
  const utils = clientApi.useUtils();
  const { data, isFetching } = clientApi.docker.getContainers.useQuery(undefined, {
    initialData,
    refetchOnMount: false,
  });
  const refreshInventory = clientApi.docker.refreshInventory.useMutation({
    async onSuccess() {
      await Promise.all([
        utils.docker.getContainers.invalidate(),
        utils.docker.reconcileServices.invalidate(),
        utils.docker.getServiceHealth.invalidate(),
      ]);
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
  const relativeTime = useTimeAgo(data?.timestamp ?? new Date());

  const containers = data?.containers ?? [];
  const unavailableEndpoints = data?.endpoints.filter(({ status }) => status === "unavailable") ?? [];

  const table = useTranslatedMantineReactTable({
    data: containers,
    getRowId: (row) => row.resourceId,
    state: { isLoading: isFetching || refreshInventory.isPending },
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
    // MRT's built-in full-screen mode does not stretch the table to fill the
    // viewport, so with few containers it renders as a thin strip (#6230). Disable
    // it, matching the other management tables (users, invites).
    enableFullScreenToggle: false,
    positionGlobalFilter: "right",
    mantineSearchTextInputProps: {
      placeholder: tDocker("table.search", { count: String(containers.length) }),
      style: { minWidth: 300 },
      autoFocus: true,
    },

    initialState: { density: "xs", showGlobalFilter: true, columnVisibility: { cpuUsage: false, memoryUsage: false } },
    mantineTableBodyCellProps: { style: { padding: "4px 8px" } },
    mantineTableHeadCellProps: { style: { padding: "4px 8px" } },
    renderRowActions: ({ row }: { row: MRT_Row<DockerContainer> }) => (
      <ContainerRowMenu
        container={row.original}
        endpoint={data?.endpoints.find(({ id }) => id === row.original.endpointId)}
      />
    ),
    renderTopToolbarCustomActions: () => (
      <Button
        variant="default"
        rightSection={<IconRefresh size="1rem" />}
        onClick={() => refreshInventory.mutate()}
        loading={isFetching || refreshInventory.isPending}
      >
        {tCommon("action.refresh")}
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
          <ContainerActionBar selectedContainers={dockerContainers} endpoints={data?.endpoints ?? []} />
        </Group>
      );
    },

    columns: createColumns(tDocker, tCommon),
  });

  return (
    <Stack gap="xs">
      {unavailableEndpoints.length > 0 && (
        <Alert color="yellow" icon={<IconAlertTriangle size={16} />}>
          {tDocker("error.endpointUnavailable", {
            count: String(unavailableEndpoints.length),
            names: unavailableEndpoints.map(({ name }) => name).join(", "),
          })}
        </Alert>
      )}
      <Text>{tDocker("table.updated", { when: relativeTime })}</Text>
      <MantineReactTable table={table} />
    </Stack>
  );
}

const containerActions: { action: "start" | "stop" | "restart" | "remove"; icon: TablerIcon; color: MantineColor }[] = [
  { action: "start", icon: IconPlayerPlay, color: "green" },
  { action: "stop", icon: IconPlayerStop, color: "red" },
  { action: "restart", icon: IconRotateClockwise, color: "orange" },
  { action: "remove", icon: IconTrash, color: "red" },
];

const ContainerRowMenu = ({ container, endpoint }: { container: DockerContainer; endpoint?: DockerEndpoint }) => {
  const t = useI18n("docker.action");
  const tCommon = useI18n("common");
  const router = useRouter();
  const utils = clientApi.useUtils();
  const { openModal } = useModalAction(AddDockerAppToHomarr);
  const confirmRemoval = useDockerContainerRemovalConfirmation();
  const getActionLabel = (action: "start" | "stop" | "restart" | "remove") => {
    if (action === "remove") return tCommon("action.remove");
    return t(`${action}.label`);
  };

  const useContainerAction = (action: "start" | "stop" | "restart" | "remove") =>
    clientApi.docker[`${action}All`].useMutation({
      async onSettled() {
        await utils.docker.getContainers.invalidate();
      },
      onSuccess(results) {
        showContainerActionResult(action, [container], results, t);
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
          disabled={!endpointHasCapability(endpoint, "logs")}
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
            disabled={!endpointHasCapability(endpoint, action === "remove" ? "remove" : "lifecycle")}
            onClick={() => {
              const runAction = () => mutations[action].mutate({ targets: [getContainerTarget(container)] });
              if (action === "remove") confirmRemoval([container], runAction);
              else runAction();
            }}
          >
            {getActionLabel(action)}
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
  endpoints: DockerEndpoint[];
}

const ContainerActionBar = ({ selectedContainers, endpoints }: ContainerActionBarProps) => {
  const t = useI18n("docker.action");
  const { openModal } = useModalAction(AddDockerAppToHomarr);

  return (
    <Group gap="xs">
      {containerActions.map(({ action, icon, color }) => (
        <ContainerActionBarButton
          key={action}
          icon={icon}
          color={color}
          action={action}
          selectedContainers={selectedContainers}
          endpoints={endpoints}
        />
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
  selectedContainers: DockerContainer[];
  endpoints: DockerEndpoint[];
}

const ContainerActionBarButton = (props: ContainerActionBarButtonProps) => {
  const t = useI18n("docker.action");
  const tCommon = useI18n("common");
  const utils = clientApi.useUtils();
  const confirmRemoval = useDockerContainerRemovalConfirmation();
  const requiredCapability = props.action === "remove" ? "remove" : "lifecycle";
  const isAllowed = props.selectedContainers.every((container) =>
    endpointHasCapability(
      props.endpoints.find(({ id }) => id === container.endpointId),
      requiredCapability,
    ),
  );

  const { mutateAsync, isPending } = clientApi.docker[`${props.action}All`].useMutation({
    async onSettled() {
      await utils.docker.getContainers.invalidate();
    },
  });

  const handleClickAsync = async () => {
    const runActionAsync = async () => {
      await mutateAsync(
        { targets: props.selectedContainers.map(getContainerTarget) },
        {
          onSuccess(results) {
            showContainerActionResult(props.action, props.selectedContainers, results, t);
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

    if (props.action === "remove") {
      confirmRemoval(props.selectedContainers, runActionAsync);
      return;
    }
    await runActionAsync();
  };

  return (
    <Button
      leftSection={<props.icon />}
      color={props.color}
      onClick={handleClickAsync}
      loading={isPending}
      disabled={!isAllowed}
      variant="light"
    >
      {props.action === "remove" ? tCommon("action.remove") : t(`${props.action}.label`)}
    </Button>
  );
};

const endpointHasCapability = (endpoint: DockerEndpoint | undefined, capability: DockerEndpointCapability) =>
  endpoint && "capabilities" in endpoint ? endpoint.capabilities.includes(capability) : true;

const ContainerStateBadge = ({ state }: { state: ContainerState }) => {
  const t = useI18n("docker.field.state.option");

  return (
    <Badge size="lg" radius="sm" variant="light" w={120} color={containerStateColorMap[state]}>
      {t(state)}
    </Badge>
  );
};
