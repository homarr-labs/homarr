"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Center,
  getDefaultZIndex,
  Group,
  Menu,
  Portal,
  Stack,
  Text,
  Tooltip,
  VisuallyHidden,
} from "@mantine/core";
import {
  IconBrandDocker,
  IconCategoryPlus,
  IconDots,
  IconFileText,
  IconPlayerPlay,
  IconPlayerStop,
  IconRefresh,
  IconRotateClockwise,
  IconTrash,
} from "@tabler/icons-react";
import type { DataTableColumn, DataTableSortStatus } from "mantine-datatable";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { constructBoardPermissions } from "@homarr/auth/shared";
import { useOptionalBoard } from "@homarr/boards/context";
import { formatBytes, useTimeAgo } from "@homarr/common";
import type { ContainerState } from "@homarr/docker";
import { containerStateColorMap, cpuUsageColor, memoryUsageColor, safeValue } from "@homarr/docker/shared";
import { useModalAction } from "@homarr/modals";
import { AddDockerAppToHomarr } from "@homarr/modals-collection";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";
import { iconSizes } from "@homarr/ui";

import type { WidgetComponentProps } from "../definition";
import { getUsableWidgetQueryData } from "../common/query-state";
import actionTargetClasses from "../common/action-target.module.css";
import { HomarrDataTable } from "../common/homarr-data-table";
import { usePersistedTableLayout, useTableLayoutPersistence } from "../common/use-persisted-table-layout";
import { getDockerColumnVisibility, getDockerFooterVisibility } from "./layout";

type DockerContainer = RouterOutputs["docker"]["getContainers"]["containers"][number];
type ContainerAction = "start" | "stop" | "restart" | "remove";

interface ContextMenuState {
  x: number;
  y: number;
  container: DockerContainer;
}

interface ContainerActionHandlers {
  onAction: (action: ContainerAction, container: DockerContainer) => void;
  onAddToHomarr: (container: DockerContainer) => void;
  onOpenLogs: (container: DockerContainer) => void;
}

const columnAccessors = ["name", "state", "host", "cpuUsage", "memoryUsage", "actions"] as const;
const containerMenuWidth = 240;

const createContainerLogsPath = (container: Pick<DockerContainer, "id" | "name">) =>
  `/manage/tools/docker/logs/${container.id}?name=${encodeURIComponent(container.name)}`;

const ContainerStateBadge = ({ state }: { state: ContainerState }) => {
  const t = useScopedI18n("docker.field.state.option");

  return (
    <Badge size="xs" radius="sm" variant="light" color={containerStateColorMap[state]}>
      {t(state)}
    </Badge>
  );
};

const ContainerStateDot = ({ state }: { state: ContainerState }) => {
  const t = useScopedI18n("docker.field.state.option");
  const label = t(state);

  return (
    <Tooltip label={label} withArrow>
      <Box component="span" style={{ display: "inline-flex", flexShrink: 0 }}>
        <Box
          component="span"
          aria-hidden="true"
          w={8}
          h={8}
          bg={`${containerStateColorMap[state]}.6`}
          style={{ borderRadius: "50%" }}
        />
        <VisuallyHidden>{label}</VisuallyHidden>
      </Box>
    </Tooltip>
  );
};

const createColumns = (
  t: ReturnType<typeof useScopedI18n<"docker">>,
  handlers: ContainerActionHandlers,
  sortingEnabled: boolean,
  inlineState: boolean,
): DataTableColumn<DockerContainer>[] => [
  {
    accessor: "name",
    title: t("field.name.label"),
    width: 180,
    ellipsis: true,
    sortable: sortingEnabled,
    render: (container) => (
      <Group gap="xs" wrap="nowrap" style={{ overflow: "hidden" }}>
        {inlineState && <ContainerStateDot state={container.state} />}
        <Avatar
          variant="outline"
          radius="sm"
          size={20}
          styles={{ image: { objectFit: "contain" } }}
          src={container.iconUrl}
          style={{ flexShrink: 0 }}
        >
          {container.name.at(0)?.toUpperCase()}
        </Avatar>
        <Text size="sm" truncate>
          {container.name}
        </Text>
      </Group>
    ),
  },
  {
    accessor: "state",
    title: t("field.state.label"),
    width: 100,
    sortable: sortingEnabled,
    render: (container) => <ContainerStateBadge state={container.state} />,
  },
  {
    accessor: "host",
    title: t("field.host.label"),
    width: 120,
    sortable: sortingEnabled,
    ellipsis: true,
    render: (container) => (
      <Text size="xs" truncate title={container.host}>
        {container.host}
      </Text>
    ),
  },
  {
    accessor: "cpuUsage",
    title: t("field.stats.cpu.label"),
    width: 80,
    sortable: sortingEnabled,
    render: (container) => {
      const cpuUsage = safeValue(container.cpuUsage);
      return (
        <Text size="xs" c={cpuUsageColor(cpuUsage, container.state)}>
          {cpuUsage.toFixed(2)}%
        </Text>
      );
    },
  },
  {
    accessor: "memoryUsage",
    title: t("field.stats.memory.label"),
    width: 100,
    sortable: sortingEnabled,
    render: (container) => {
      const memoryUsage = safeValue(container.memoryUsage);
      return (
        <Text size="xs" c={memoryUsageColor(memoryUsage, container.state)}>
          {formatBytes(memoryUsage)}
        </Text>
      );
    },
  },
  {
    accessor: "actions",
    title: "",
    width: 44,
    textAlign: "right",
    render: (container) => <ContainerMenuButton container={container} handlers={handlers} />,
  },
];

const compareContainers = (
  first: DockerContainer,
  second: DockerContainer,
  accessor: DataTableSortStatus<DockerContainer>["columnAccessor"],
) => {
  if (accessor === "cpuUsage") return safeValue(first.cpuUsage) - safeValue(second.cpuUsage);
  if (accessor === "memoryUsage") return safeValue(first.memoryUsage) - safeValue(second.memoryUsage);

  const firstValue = first[accessor as "name" | "state" | "host"];
  const secondValue = second[accessor as "name" | "state" | "host"];
  return String(firstValue ?? "").localeCompare(String(secondValue ?? ""));
};

const useContainerAction = (action: ContainerAction) => {
  const t = useScopedI18n("docker.action");
  const utils = clientApi.useUtils();

  return clientApi.docker[`${action}All`].useMutation({
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
};

export default function DockerWidget({
  options,
  width,
  isEditMode,
  displayMode,
  boardId,
  itemId,
  setOptions,
}: WidgetComponentProps<"dockerContainers">) {
  const t = useScopedI18n("docker");
  const tWidget = useScopedI18n("widget.dockerContainers");
  const { openModal } = useModalAction(AddDockerAppToHomarr);
  const board = useOptionalBoard();
  const { data: session } = useSession();
  const hasChangeAccess = board ? constructBoardPermissions(board, session).hasChangeAccess : false;
  const isAdvanced = displayMode === "advanced";

  const containersQuery = clientApi.docker.getContainers.useQuery();
  const data = getUsableWidgetQueryData(containersQuery);
  const { refetch, isFetching } = containersQuery;
  const containers = useMemo(() => data?.containers ?? [], [data?.containers]);
  const timestamp = useMemo(() => data?.timestamp ?? new Date(), [data?.timestamp]);
  const relativeTime = useTimeAgo(timestamp);

  const { mutate: startContainer } = useContainerAction("start");
  const { mutate: stopContainer } = useContainerAction("stop");
  const { mutate: restartContainer } = useContainerAction("restart");
  const { mutate: removeContainer } = useContainerAction("remove");
  const handleContainerAction = useCallback(
    (action: ContainerAction, container: DockerContainer) => {
      if (action === "start") startContainer({ ids: [container.id] });
      else if (action === "stop") stopContainer({ ids: [container.id] });
      else if (action === "restart") restartContainer({ ids: [container.id] });
      else removeContainer({ ids: [container.id] });
    },
    [removeContainer, restartContainer, startContainer, stopContainer],
  );
  const handleOpenLogs = useCallback(
    (container: DockerContainer) => window.location.assign(createContainerLogsPath(container)),
    [],
  );
  const handleAddToHomarr = useCallback(
    (container: DockerContainer) => openModal({ selectedContainers: [container] }),
    [openModal],
  );
  const actionHandlers = useMemo<ContainerActionHandlers>(
    () => ({
      onAction: handleContainerAction,
      onAddToHomarr: handleAddToHomarr,
      onOpenLogs: handleOpenLogs,
    }),
    [handleAddToHomarr, handleContainerAction, handleOpenLogs],
  );

  const { mutate: saveItemOptions } = clientApi.widget.options.saveItemOptions.useMutation({
    onError: () =>
      showErrorNotification({
        title: tWidget("error.layoutSaveTitle"),
        message: tWidget("error.layoutSaveMessage"),
      }),
  });
  const persistLayout = useTableLayoutPersistence({
    boardId,
    hasChangeAccess,
    itemId,
    saveItemOptions,
    setOptions,
  });

  const defaultDirection = options.descendingDefaultSort ? "desc" : "asc";
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<DockerContainer>>({
    columnAccessor: options.defaultSort,
    direction: defaultDirection,
  });
  useEffect(() => {
    setSortStatus({ columnAccessor: options.defaultSort, direction: defaultDirection });
  }, [defaultDirection, options.defaultSort]);

  const sortedContainers = useMemo(() => {
    const multiplier = sortStatus.direction === "desc" ? -1 : 1;
    return [...containers].toSorted(
      (first, second) => compareContainers(first, second, sortStatus.columnAccessor) * multiplier,
    );
  }, [containers, sortStatus]);

  const totals = useMemo(
    () =>
      containers.reduce(
        (acc, container) => {
          acc.cpu += safeValue(container.cpuUsage);
          acc.memory += safeValue(container.memoryUsage);
          return acc;
        },
        { cpu: 0, memory: 0 },
      ),
    [containers],
  );

  const columnVisibility = useMemo(
    () => getDockerColumnVisibility(options.columns, width, isAdvanced),
    [isAdvanced, options.columns, width],
  );
  const inlineState =
    !isAdvanced && width < 340 && options.columns.includes("name") && options.columns.includes("state");
  const columns = useMemo(() => {
    const sortingEnabled = (isAdvanced || options.enableRowSorting) && !isEditMode;
    return createColumns(t, actionHandlers, sortingEnabled, inlineState).filter(
      ({ accessor }) => columnVisibility[String(accessor) as keyof typeof columnVisibility],
    );
  }, [actionHandlers, columnVisibility, inlineState, isAdvanced, isEditMode, options.enableRowSorting, t]);
  const { effectiveColumns, storeKey } = usePersistedTableLayout({
    columns,
    columnAccessors,
    columnOrder: options.columnOrder,
    columnWidths: options.columnWidths,
    itemId,
    storeKeyPrefix: "docker-containers",
    onLayoutChange: persistLayout,
  });

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const closeContextMenu = useCallback(() => setContextMenu(null), []);
  const handleContextMenu = useCallback(({ record, event }: { record: DockerContainer; event: React.MouseEvent }) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, container: record });
  }, []);

  if (!isAdvanced && options.columns.length === 0) {
    return (
      <Center h="100%">
        <Text>{t("error.noColumns")}</Text>
      </Center>
    );
  }

  const footerVisibility = getDockerFooterVisibility(width, isAdvanced);

  return (
    <Stack gap={0} h="100%" style={{ overflow: "hidden" }}>
      <Box style={{ flex: 1, minHeight: 0 }}>
        <HomarrDataTable
          isEditMode={isEditMode}
          cellPadding={width < 400 ? "2px 8px" : "4px 8px"}
          rowCursor="default"
          fetching={isFetching && containers.length === 0}
          fz={width < 400 ? "xs" : "sm"}
          records={sortedContainers}
          noRecordsText={tWidget("empty.noContainers")}
          columns={effectiveColumns}
          storeColumnsKey={storeKey}
          sortStatus={sortStatus}
          onSortStatusChange={(isAdvanced || options.enableRowSorting) && !isEditMode ? setSortStatus : undefined}
          idAccessor="id"
          onRowContextMenu={isEditMode ? undefined : handleContextMenu}
          onScroll={() => {
            if (contextMenu) closeContextMenu();
          }}
        />
      </Box>

      {footerVisibility.footer && (
        <Group
          justify="space-between"
          style={{
            borderTop: "0.0625rem solid var(--border-color)",
          }}
          p={4}
          wrap="nowrap"
        >
          <Group gap={4} wrap="nowrap">
            <IconBrandDocker style={iconSizes.xl} />
            <Text size="sm" truncate>
              {t("table.footer", { count: containers.length.toString() })}
            </Text>
          </Group>

          <Group gap="sm" wrap="nowrap" justify="flex-end" style={{ minWidth: 0 }}>
            {footerVisibility.cpu && (
              <Text size="sm" style={{ whiteSpace: "nowrap" }}>
                {t("table.totalCpu", { cpu: totals.cpu.toFixed(2) })}
              </Text>
            )}
            {footerVisibility.memory && (
              <Text size="sm" style={{ whiteSpace: "nowrap" }}>
                {t("table.totalMemory", { memory: formatBytes(totals.memory) })}
              </Text>
            )}
            <Tooltip label={t("table.refresh.lastUpdated", { when: relativeTime })}>
              <ActionIcon
                className={actionTargetClasses.root}
                size="lg"
                variant="transparent"
                c="var(--mantine-color-text)"
                loading={isFetching}
                onClick={() => void refetch()}
                aria-label={t("table.refresh.lastUpdated", { when: relativeTime })}
              >
                <IconRefresh size={22} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
      )}

      {contextMenu && <ContainerContextMenu state={contextMenu} handlers={actionHandlers} onClose={closeContextMenu} />}
    </Stack>
  );
}

function ContainerMenuButton({
  container,
  handlers,
}: {
  container: DockerContainer;
  handlers: ContainerActionHandlers;
}) {
  const t = useScopedI18n("docker.action");
  const [opened, setOpened] = useState(false);
  const close = () => setOpened(false);

  return (
    <Menu opened={opened} onChange={setOpened} closeOnItemClick={false} withinPortal position="bottom-end" shadow="sm">
      <Menu.Target>
        <ActionIcon
          className={actionTargetClasses.root}
          variant="subtle"
          color="gray"
          size="lg"
          aria-label={t("title")}
          onClick={(event) => event.stopPropagation()}
        >
          <IconDots size={22} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown w={containerMenuWidth} miw={containerMenuWidth} maw={containerMenuWidth}>
        <ContainerActionItems container={container} handlers={handlers} onClose={close} />
      </Menu.Dropdown>
    </Menu>
  );
}

function ContainerActionItems({
  container,
  handlers,
  onClose,
}: {
  container: DockerContainer;
  handlers: ContainerActionHandlers;
  onClose: () => void;
}) {
  const t = useScopedI18n("docker.action");
  const [confirmRemove, setConfirmRemove] = useState(false);
  const stateAction = container.state === "running" ? "stop" : "start";
  const StateIcon = stateAction === "stop" ? IconPlayerStop : IconPlayerPlay;

  const invokeAction = (action: ContainerAction) => {
    handlers.onAction(action, container);
    onClose();
  };

  return (
    <>
      <Menu.Label title={container.name} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {container.name}
      </Menu.Label>
      <Menu.Item
        leftSection={<IconFileText style={iconSizes.sm} />}
        onClick={() => {
          handlers.onOpenLogs(container);
          onClose();
        }}
      >
        {t("logs.label")}
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item
        color={stateAction === "start" ? "green" : "red"}
        leftSection={<StateIcon style={iconSizes.sm} />}
        onClick={() => invokeAction(stateAction)}
      >
        {t(`${stateAction}.label`)}
      </Menu.Item>
      <Menu.Item color="orange" leftSection={<IconRotateClockwise style={iconSizes.sm} />} onClick={() => invokeAction("restart")}>
        {t("restart.label")}
      </Menu.Item>
      {!confirmRemove ? (
        <Menu.Item color="red" leftSection={<IconTrash style={iconSizes.sm} />} onClick={() => setConfirmRemove(true)}>
          {t("remove.label")}
        </Menu.Item>
      ) : (
        <Menu.Item color="red" leftSection={<IconTrash style={iconSizes.sm} />} onClick={() => invokeAction("remove")}>
          {t("remove.confirm")}
        </Menu.Item>
      )}
      <Menu.Divider />
      <Menu.Item
        leftSection={<IconCategoryPlus style={iconSizes.sm} />}
        onClick={() => {
          handlers.onAddToHomarr(container);
          onClose();
        }}
      >
        {t("addToHomarr.label")}
      </Menu.Item>
    </>
  );
}

function ContainerContextMenu({
  state,
  handlers,
  onClose,
}: {
  state: ContextMenuState;
  handlers: ContainerActionHandlers;
  onClose: () => void;
}) {
  return (
    <Portal>
      <Box
        pos="fixed"
        top={0}
        left={0}
        w="100vw"
        h="100vh"
        style={{ zIndex: getDefaultZIndex("popover") }}
        onClick={onClose}
        onContextMenu={(event) => {
          event.preventDefault();
          onClose();
        }}
      >
        <Menu
          opened
          shadow="md"
          position="bottom-start"
          withinPortal={false}
          closeOnItemClick={false}
          onClose={onClose}
        >
          <Menu.Target>
            <Box pos="fixed" style={{ left: state.x, top: state.y, width: 1, height: 1 }} />
          </Menu.Target>
          <Menu.Dropdown
            w={containerMenuWidth}
            miw={containerMenuWidth}
            maw={containerMenuWidth}
            onClick={(event) => event.stopPropagation()}
          >
            <ContainerActionItems container={state.container} handlers={handlers} onClose={onClose} />
          </Menu.Dropdown>
        </Menu>
      </Box>
    </Portal>
  );
}
