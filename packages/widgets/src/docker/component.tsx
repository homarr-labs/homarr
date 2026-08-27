"use client";

import "./styles.css";

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
import { invariantTechnicalLabels } from "@homarr/definitions";
import { useSession } from "@homarr/auth/client";
import { constructBoardPermissions } from "@homarr/auth/shared";
import { useOptionalBoard } from "@homarr/boards/context";
import { formatBytes, useTimeAgo } from "@homarr/common";
import type { ContainerState, DockerEndpointCapability } from "@homarr/docker";
import { containerStateColorMap, cpuUsageColor, memoryUsageColor, safeValue } from "@homarr/docker/shared";
import { useModalAction } from "@homarr/modals";
import { AddDockerAppToHomarr, useDockerContainerRemovalConfirmation } from "@homarr/modals-collection";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import { zoomCompensatedSize } from "@homarr/ui";

import type { WidgetComponentProps } from "../definition";
import { getUsableWidgetQueryData } from "../common/query-state";
import actionTargetClasses from "../common/action-target.module.css";
import { HomarrDataTable } from "../common/homarr-data-table";
import { usePersistedTableLayout, useTableLayoutPersistence } from "../common/use-persisted-table-layout";
import { getDockerColumnVisibility, getDockerFooterVisibility } from "./layout";

type DockerContainer = RouterOutputs["docker"]["getContainers"]["containers"][number];
type DockerEndpoint = RouterOutputs["docker"]["getContainers"]["endpoints"][number];
type ContainerAction = "start" | "stop" | "restart" | "remove";

interface ContextMenuState {
  x: number;
  y: number;
  container: DockerContainer;
}

interface ContainerActionHandlers {
  canUse: (container: DockerContainer, capability: DockerEndpointCapability) => boolean;
  onAction: (action: ContainerAction, container: DockerContainer) => void;
  onAddToHomarr: (container: DockerContainer) => void;
  onOpenLogs: (container: DockerContainer) => void;
}

const columnAccessors = ["name", "state", "host", "cpuUsage", "memoryUsage", "actions"] as const;
const containerMenuWidth = 240;

// The *button* sizes stay small and fixed - row height is set by the tallest cell, and the
// actions button is repeated once per row, so any growth here multiplies across every row and
// tanks how many containers fit on screen. The *icon* sizes are rendered larger than their
// button via absolute positioning (see ContainerMenuButton/footer refresh below) - an
// absolutely-positioned element is removed from normal flow, so it doesn't count toward its
// ancestor's height even though it visually overflows the button. This lets the icon look
// properly sized without the button (and therefore the row) growing to match.
const rowActionButtonSize = 22;
const rowActionIconVisualSize = 32;
const footerRefreshButtonSize = 24;
const footerRefreshIconVisualSize = 18;

const createContainerLogsPath = (container: Pick<DockerContainer, "endpointId" | "id" | "name">) =>
  `/manage/tools/docker/logs/${container.id}?name=${encodeURIComponent(container.name)}&endpointId=${encodeURIComponent(container.endpointId)}`;

const getContainerTarget = ({ endpointId, id }: DockerContainer) => ({ endpointId, id });

const getContainersQueryInput = (endpointIds: string[]) => {
  if (endpointIds.length === 0) return undefined;
  return { endpointIds };
};

const ContainerStateBadge = ({ state }: { state: ContainerState }) => {
  const t = useI18n("docker.field.state.option");

  return (
    <Badge
      size="xs"
      radius="sm"
      variant="light"
      color={containerStateColorMap[state]}
      styles={{ label: { lineHeight: 1.2 } }}
    >
      {t(state)}
    </Badge>
  );
};

const createColumns = (
  t: ReturnType<typeof useI18n<"docker">>,
  tCommon: ReturnType<typeof useI18n<"common">>,
  handlers: ContainerActionHandlers,
  sortingEnabled: boolean,
): DataTableColumn<DockerContainer>[] => [
  {
    accessor: "name",
    title: tCommon("field.name"),
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
        <Text size="sm" lh={1.2} truncate>
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
    title: invariantTechnicalLabels.cpu,
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
    width: rowActionButtonSize + 18,
    textAlign: "right",
    // The default `.homarr-data-table td { overflow: hidden }` (needed for name/host ellipsis
    // truncation) would clip the actions icon's intentional visual overflow - opt this one
    // cell out of it.
    cellsClassName: "docker-actions-cell",
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
  const t = useI18n("docker.action");
  const utils = clientApi.useUtils();

  return clientApi.docker[`${action}All`].useMutation({
    async onSettled() {
      await utils.docker.getContainers.invalidate();
    },
    onSuccess(results) {
      const failed = results.some((result) => !result.success);
      (failed ? showErrorNotification : showSuccessNotification)({
        title: t(`${action}.notification.${failed ? "error" : "success"}.title`),
        message: t(`${action}.notification.${failed ? "error" : "success"}.message`),
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
  const t = useI18n("docker");
  const tCommon = useI18n("common");
  const tWidget = useI18n("widget.dockerContainers");
  const { openModal } = useModalAction(AddDockerAppToHomarr);
  const confirmRemoval = useDockerContainerRemovalConfirmation();
  const board = useOptionalBoard();
  const { data: session } = useSession();
  const hasChangeAccess = board ? constructBoardPermissions(board, session).hasChangeAccess : false;
  const isAdvanced = displayMode === "advanced";

  const utils = clientApi.useUtils();
  const containersQuery = clientApi.docker.getContainers.useQuery(getContainersQueryInput(options.endpointIds));
  const data = getUsableWidgetQueryData(containersQuery);
  const { isFetching } = containersQuery;
  const refreshInventory = clientApi.docker.refreshInventory.useMutation({
    async onSuccess() {
      await Promise.all([
        utils.docker.getContainers.invalidate(),
        utils.docker.reconcileServices.invalidate(),
        utils.docker.getServiceHealth.invalidate(),
      ]);
    },
    onError() {
      showErrorNotification({
        title: t("action.refresh.notification.error.title"),
        message: t("action.refresh.notification.error.message"),
      });
    },
  });
  const containers = useMemo(() => data?.containers ?? [], [data?.containers]);
  const timestamp = useMemo(() => data?.timestamp ?? new Date(), [data?.timestamp]);
  const relativeTime = useTimeAgo(timestamp);

  const { mutate: startContainer } = useContainerAction("start");
  const { mutate: stopContainer } = useContainerAction("stop");
  const { mutate: restartContainer } = useContainerAction("restart");
  const { mutate: removeContainer } = useContainerAction("remove");
  const handleContainerAction = useCallback(
    (action: ContainerAction, container: DockerContainer) => {
      const target = { targets: [getContainerTarget(container)] };
      if (action === "start") startContainer(target);
      else if (action === "stop") stopContainer(target);
      else if (action === "restart") restartContainer(target);
      else confirmRemoval([container], () => removeContainer(target));
    },
    [confirmRemoval, removeContainer, restartContainer, startContainer, stopContainer],
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
      canUse: (container, capability) =>
        endpointHasCapability(
          data?.endpoints.find(({ id }) => id === container.endpointId),
          capability,
        ),
      onAction: handleContainerAction,
      onAddToHomarr: handleAddToHomarr,
      onOpenLogs: handleOpenLogs,
    }),
    [data?.endpoints, handleAddToHomarr, handleContainerAction, handleOpenLogs],
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
  const columns = useMemo(() => {
    const sortingEnabled = (isAdvanced || options.enableRowSorting) && !isEditMode;
    return createColumns(t, tCommon, actionHandlers, sortingEnabled).filter(
      ({ accessor }) => columnVisibility[String(accessor) as keyof typeof columnVisibility],
    );
  }, [actionHandlers, columnVisibility, isAdvanced, isEditMode, options.enableRowSorting, t, tCommon]);
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

  if (containers.length === 0 && data?.endpoints.some(({ status }) => status === "unavailable")) {
    return (
      <Center h="100%">
        <Text>{tWidget("error.endpointsUnavailable")}</Text>
      </Center>
    );
  }

  const footerVisibility = getDockerFooterVisibility(width, isAdvanced);

  return (
    <Stack gap={0} h="100%" style={{ overflow: "hidden" }}>
      <Box style={{ flex: 1, minHeight: 0 }}>
        <HomarrDataTable
          isEditMode={isEditMode}
          cellPadding={isAdvanced || width < 400 ? "2px 8px" : "4px 8px"}
          className="docker-table"
          rowCursor="default"
          fetching={isFetching && containers.length === 0}
          fz={width < 400 ? "xs" : "sm"}
          records={sortedContainers}
          noRecordsText={tWidget("empty.noContainers")}
          columns={effectiveColumns}
          storeColumnsKey={storeKey}
          sortStatus={sortStatus}
          onSortStatusChange={(isAdvanced || options.enableRowSorting) && !isEditMode ? setSortStatus : undefined}
          idAccessor="resourceId"
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
          py={2}
          px={8}
          wrap="nowrap"
        >
          <Group gap={4} wrap="nowrap">
            <IconBrandDocker size="var(--mantine-font-size-md)" style={{ flexShrink: 0 }} />
            <Text size="xs" truncate>
              {t("table.footer", { count: containers.length.toString() })}
            </Text>
          </Group>

          <Group gap="sm" wrap="nowrap" justify="flex-end" style={{ minWidth: 0 }}>
            {footerVisibility.cpu && (
              <Text size="xs" style={{ whiteSpace: "nowrap" }}>
                {t("table.totalCpu", { cpu: totals.cpu.toFixed(2) })}
              </Text>
            )}
            {footerVisibility.memory && (
              <Text size="xs" style={{ whiteSpace: "nowrap" }}>
                {t("table.totalMemory", { memory: formatBytes(totals.memory) })}
              </Text>
            )}
            <Tooltip label={t("table.refresh.lastUpdated", { when: relativeTime })}>
              <ActionIcon
                className={actionTargetClasses.root}
                size={footerRefreshButtonSize}
                variant="transparent"
                c="var(--mantine-color-text)"
                loading={isFetching || refreshInventory.isPending}
                onClick={() => refreshInventory.mutate()}
                aria-label={t("table.refresh.lastUpdated", { when: relativeTime })}
                style={{ position: "relative", overflow: "visible" }}
              >
                <IconRefresh
                  style={{
                    ...zoomCompensatedSize(footerRefreshIconVisualSize),
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                  }}
                />
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
  const t = useI18n("docker.action");
  const [opened, setOpened] = useState(false);
  const close = () => setOpened(false);

  return (
    <Menu opened={opened} onChange={setOpened} closeOnItemClick={false} withinPortal position="bottom-end" shadow="sm">
      <Menu.Target>
        <ActionIcon
          className={actionTargetClasses.root}
          variant="subtle"
          color="gray"
          size={rowActionButtonSize}
          aria-label={t("title")}
          onClick={(event) => event.stopPropagation()}
          style={{ position: "relative", overflow: "visible" }}
        >
          {/* Rendered larger than the button and pulled out of flow via absolute positioning,
              so it looks properly sized without the button - and therefore the row - growing
              to match (row height is set by the tallest cell, and this button repeats per row). */}
          <IconDots
            size={rowActionIconVisualSize}
            style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
          />
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
  const t = useI18n("docker.action");
  const tCommon = useI18n("common");
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
        leftSection={<IconFileText size="var(--mantine-font-size-sm)" />}
        disabled={!handlers.canUse(container, "logs")}
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
        leftSection={<StateIcon size="var(--mantine-font-size-sm)" />}
        disabled={!handlers.canUse(container, "lifecycle")}
        onClick={() => invokeAction(stateAction)}
      >
        {t(`${stateAction}.label`)}
      </Menu.Item>
      <Menu.Item
        color="orange"
        leftSection={<IconRotateClockwise size="var(--mantine-font-size-sm)" />}
        disabled={!handlers.canUse(container, "lifecycle")}
        onClick={() => invokeAction("restart")}
      >
        {t("restart.label")}
      </Menu.Item>
      <Menu.Item
        color="red"
        leftSection={<IconTrash size="var(--mantine-font-size-sm)" />}
        disabled={!handlers.canUse(container, "remove")}
        onClick={() => invokeAction("remove")}
      >
        {tCommon("action.remove")}
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item
        leftSection={<IconCategoryPlus size="var(--mantine-font-size-sm)" />}
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

const endpointHasCapability = (endpoint: DockerEndpoint | undefined, capability: DockerEndpointCapability) =>
  endpoint && "capabilities" in endpoint ? endpoint.capabilities.includes(capability) : true;

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
