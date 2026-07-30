"use client";

import "./styles.css";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionIcon, Avatar, Badge, Box, Center, Group, Menu, Portal, Stack, Text, Tooltip } from "@mantine/core";
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
import { DataTable, useDataTableColumns } from "mantine-datatable";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { formatBytes, useTimeAgo } from "@homarr/common";
import type { ContainerState } from "@homarr/docker";
import { containerStateColorMap, cpuUsageColor, memoryUsageColor, safeValue } from "@homarr/docker/shared";
import { useModalAction } from "@homarr/modals";
import { AddDockerAppToHomarr } from "@homarr/modals-collection";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";

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

const createContainerLogsPath = (container: Pick<DockerContainer, "id" | "name">) =>
  `/manage/tools/docker/logs/${container.id}?name=${encodeURIComponent(container.name)}`;

export const parseColumnOrder = (value: string): string[] => {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];

    const allowed = new Set<string>(columnAccessors);
    return parsed.filter(
      (accessor, index): accessor is string =>
        typeof accessor === "string" && allowed.has(accessor) && parsed.indexOf(accessor) === index,
    );
  } catch {
    return [];
  }
};

export const parseColumnWidths = (value: string): Record<string, number> => {
  if (!value) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};

    const allowed = new Set<string>(columnAccessors);
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, number] =>
          allowed.has(entry[0]) && typeof entry[1] === "number" && Number.isFinite(entry[1]) && entry[1] > 0,
      ),
    );
  } catch {
    return {};
  }
};

const ContainerStateBadge = ({ state }: { state: ContainerState }) => {
  const t = useScopedI18n("docker.field.state.option");

  return (
    <Badge size="xs" radius="sm" variant="light" color={containerStateColorMap[state]}>
      {t(state)}
    </Badge>
  );
};

const createColumns = (
  t: ReturnType<typeof useScopedI18n<"docker">>,
  handlers: ContainerActionHandlers,
  sortingEnabled: boolean,
): DataTableColumn<DockerContainer>[] => [
  {
    accessor: "name",
    title: t("field.name.label"),
    width: 180,
    ellipsis: true,
    sortable: sortingEnabled,
    render: (container) => (
      <Group gap="xs" wrap="nowrap" style={{ overflow: "hidden" }}>
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
  boardId,
  itemId,
  setOptions,
}: WidgetComponentProps<"dockerContainers">) {
  const t = useScopedI18n("docker");
  const tWidget = useScopedI18n("widget.dockerContainers");
  const router = useRouter();
  const { openModal } = useModalAction(AddDockerAppToHomarr);
  const isTiny = width <= 256;

  const { data, refetch, isFetching } = clientApi.docker.getContainers.useQuery();
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
    (container: DockerContainer) => router.push(createContainerLogsPath(container)),
    [router],
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
  const persistLayout = useCallback(
    (newOptions: Partial<Pick<typeof options, "columnOrder" | "columnWidths">>) => {
      setOptions({ newOptions });
      if (boardId && itemId) saveItemOptions({ boardId, itemId, newOptions });
    },
    [boardId, itemId, saveItemOptions, setOptions],
  );

  const savedOrder = useMemo(() => parseColumnOrder(options.columnOrder), [options.columnOrder]);
  const savedWidths = useMemo(() => parseColumnWidths(options.columnWidths), [options.columnWidths]);

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

  const selectedColumns = useMemo(() => new Set<string>(options.columns), [options.columns]);
  const columns = useMemo(() => {
    const sortingEnabled = options.enableRowSorting && !isEditMode;
    return createColumns(t, actionHandlers, sortingEnabled).filter(({ accessor }) =>
      selectedColumns.has(String(accessor)),
    );
  }, [actionHandlers, isEditMode, options.enableRowSorting, selectedColumns, t]);
  const visibleAccessors = useMemo(() => columns.map(({ accessor }) => String(accessor)), [columns]);
  const visibleAccessorSet = useMemo(() => new Set(visibleAccessors), [visibleAccessors]);
  const restoredOrder = useMemo(
    () => [
      ...savedOrder.filter((accessor) => visibleAccessorSet.has(accessor)),
      ...visibleAccessors.filter((accessor) => !savedOrder.includes(accessor)),
    ],
    [savedOrder, visibleAccessors, visibleAccessorSet],
  );
  const storeKey = `docker-containers-${itemId ?? "preview"}-${[...visibleAccessors].toSorted().join(",")}`;
  const { effectiveColumns, columnsOrder, columnsWidth, setColumnsOrder, setMultipleColumnWidths } =
    useDataTableColumns<DockerContainer>({
      key: storeKey,
      columns,
    });

  const lastStoreKey = useRef(storeKey);
  const hydrated = useRef(false);
  useEffect(() => {
    if (lastStoreKey.current !== storeKey) {
      lastStoreKey.current = storeKey;
      hydrated.current = false;
    }
    if (hydrated.current) return;

    if (restoredOrder.length > 0) setColumnsOrder(restoredOrder);
    const visibleWidths = Object.entries(savedWidths)
      .filter(([accessor]) => visibleAccessorSet.has(accessor))
      .map(([accessor, columnWidth]) => ({ accessor, width: columnWidth }));
    if (visibleWidths.length > 0) setMultipleColumnWidths(visibleWidths);

    requestAnimationFrame(() => {
      hydrated.current = true;
    });
  }, [restoredOrder, savedWidths, setColumnsOrder, setMultipleColumnWidths, storeKey, visibleAccessorSet]);

  const previousOrder = useRef(columnsOrder);
  const previousWidths = useRef(columnsWidth);
  useEffect(() => {
    if (!hydrated.current) return;

    const orderChanged = JSON.stringify(columnsOrder) !== JSON.stringify(previousOrder.current);
    const widthsChanged = JSON.stringify(columnsWidth) !== JSON.stringify(previousWidths.current);
    previousOrder.current = columnsOrder;
    previousWidths.current = columnsWidth;
    if (!orderChanged && !widthsChanged) return;

    const newLayout: Partial<Pick<typeof options, "columnOrder" | "columnWidths">> = {};
    if (orderChanged) {
      const fullOrder = [...savedOrder, ...columnAccessors.filter((accessor) => !savedOrder.includes(accessor))];
      const reorderedVisibleColumns = [...columnsOrder];
      const mergedOrder = fullOrder.map((accessor) =>
        visibleAccessorSet.has(accessor) ? (reorderedVisibleColumns.shift() ?? accessor) : accessor,
      );
      newLayout.columnOrder = JSON.stringify(mergedOrder);
    }
    if (widthsChanged) {
      const widthMap: Record<string, number> = { ...savedWidths };
      for (const entry of columnsWidth) {
        const accessor = Object.keys(entry)[0];
        if (!accessor || !visibleAccessorSet.has(accessor)) continue;
        const columnWidth = entry[accessor as keyof typeof entry];
        if (typeof columnWidth === "number" && Number.isFinite(columnWidth) && columnWidth > 0) {
          widthMap[accessor] = columnWidth;
        } else if (typeof columnWidth === "string" && columnWidth.endsWith("px")) {
          const parsedWidth = Number.parseInt(columnWidth, 10);
          if (Number.isFinite(parsedWidth) && parsedWidth > 0) widthMap[accessor] = parsedWidth;
        }
      }
      newLayout.columnWidths = JSON.stringify(widthMap);
    }
    persistLayout(newLayout);
  }, [columnsOrder, columnsWidth, persistLayout, savedOrder, savedWidths, visibleAccessorSet]);

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const closeContextMenu = useCallback(() => setContextMenu(null), []);
  const handleContextMenu = useCallback(({ record, event }: { record: DockerContainer; event: React.MouseEvent }) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, container: record });
  }, []);

  if (options.columns.length === 0) {
    return (
      <Center h="100%">
        <Text>{t("error.noColumns")}</Text>
      </Center>
    );
  }

  return (
    <Stack gap={0} h="100%" style={{ overflow: "hidden" }}>
      <Box style={{ flex: 1, minHeight: 0 }}>
        <DataTable
          style={{ pointerEvents: isEditMode ? "none" : undefined }}
          withTableBorder={false}
          borderRadius={0}
          highlightOnHover
          striped="odd"
          stripedColor={{ dark: "dark.7", light: "gray.0" }}
          highlightOnHoverColor={{ dark: "dark.5", light: "gray.1" }}
          verticalAlign="center"
          fetching={isFetching && containers.length === 0}
          loaderBackgroundBlur={2}
          fz={width < 400 ? "xs" : "sm"}
          records={sortedContainers}
          columns={effectiveColumns}
          storeColumnsKey={storeKey}
          textSelectionDisabled
          sortStatus={sortStatus}
          onSortStatusChange={options.enableRowSorting && !isEditMode ? setSortStatus : undefined}
          idAccessor="id"
          height="100%"
          className="docker-containers-table"
          defaultColumnProps={{
            noWrap: true,
            draggable: true,
            resizable: true,
            cellsStyle: () => ({ padding: width < 400 ? "2px 8px" : "4px 8px" }),
          }}
          scrollAreaProps={{ type: "auto", scrollbarSize: 6 }}
          onRowContextMenu={isEditMode ? undefined : handleContextMenu}
          onScroll={() => {
            if (contextMenu) closeContextMenu();
          }}
        />
      </Box>

      {!isTiny && (
        <Group justify="space-between" style={{ borderTop: "0.0625rem solid var(--border-color)" }} p={4} wrap="nowrap">
          <Group gap={4} wrap="nowrap">
            <IconBrandDocker size={20} style={{ flexShrink: 0 }} />
            <Text size="sm" truncate>
              {t("table.footer", { count: containers.length.toString() })}
            </Text>
          </Group>

          <Group gap="sm" wrap="nowrap" justify="flex-end" style={{ minWidth: 0 }}>
            <Text size="sm" style={{ whiteSpace: "nowrap" }}>
              {t("table.totalCpu", { cpu: totals.cpu.toFixed(2) })}
            </Text>
            <Text size="sm" style={{ whiteSpace: "nowrap" }}>
              {t("table.totalMemory", { memory: formatBytes(totals.memory) })}
            </Text>
            <Tooltip label={t("table.refresh.lastUpdated", { when: relativeTime })}>
              <ActionIcon
                size="sm"
                variant="transparent"
                c="var(--mantine-color-text)"
                loading={isFetching}
                onClick={() => void refetch()}
                aria-label={t("table.refresh.lastUpdated", { when: relativeTime })}
              >
                <IconRefresh size={16} />
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
          variant="subtle"
          color="gray"
          size="sm"
          aria-label={t("title")}
          onClick={(event) => event.stopPropagation()}
        >
          <IconDots size={16} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
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
      <Menu.Label>{container.name}</Menu.Label>
      <Menu.Item
        leftSection={<IconFileText size={14} />}
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
        leftSection={<StateIcon size={14} />}
        onClick={() => invokeAction(stateAction)}
      >
        {t(`${stateAction}.label`)}
      </Menu.Item>
      <Menu.Item color="orange" leftSection={<IconRotateClockwise size={14} />} onClick={() => invokeAction("restart")}>
        {t("restart.label")}
      </Menu.Item>
      {!confirmRemove ? (
        <Menu.Item color="red" leftSection={<IconTrash size={14} />} onClick={() => setConfirmRemove(true)}>
          {t("remove.label")}
        </Menu.Item>
      ) : (
        <Menu.Item color="red" leftSection={<IconTrash size={14} />} onClick={() => invokeAction("remove")}>
          {t("remove.confirm")}
        </Menu.Item>
      )}
      <Menu.Divider />
      <Menu.Item
        leftSection={<IconCategoryPlus size={14} />}
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
        style={{ zIndex: 1000 }}
        onClick={onClose}
        onContextMenu={(event) => {
          event.preventDefault();
          onClose();
        }}
      >
        <Menu opened shadow="md" position="bottom-start" withinPortal={false} closeOnItemClick={false}>
          <Menu.Target>
            <Box pos="fixed" style={{ left: state.x, top: state.y, width: 1, height: 1 }} />
          </Menu.Target>
          <Menu.Dropdown onClick={(event) => event.stopPropagation()}>
            <ContainerActionItems container={state.container} handlers={handlers} onClose={onClose} />
          </Menu.Dropdown>
        </Menu>
      </Box>
    </Portal>
  );
}
