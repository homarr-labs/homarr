"use client";

import "./styles.css";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
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

import { invariantTechnicalLabels } from "@homarr/definitions";
import { useTimeAgo } from "@homarr/common";
import type { ContainerState, DockerEndpointCapability, DockerEndpointStatus, Port } from "@homarr/docker";
import { containerStateColorMap, cpuUsageColor, memoryUsageColor, safeValue } from "@homarr/docker/shared";
import { useI18n } from "@homarr/translation/client";

import actionTargetClasses from "../common/action-target.module.css";
import { matchesContainerFilter } from "./filter";
import { getDockerColumnVisibility, getDockerFooterVisibility } from "./layout";

export interface DockerContainer {
  id: string;
  endpointId: string;
  endpointName: string;
  resourceId: string;
  name: string;
  host: string;
  state: ContainerState;
  iconUrl: string | null;
  cpuUsage: number;
  memoryUsage: number;
  image: string;
  ports: Port[] | undefined;
}

export type ContainerAction = "start" | "stop" | "restart" | "remove";

interface ContextMenuState {
  x: number;
  y: number;
  container: DockerContainer;
}

export interface ContainerActionHandlers {
  canUse: (container: DockerContainer, capability: DockerEndpointCapability) => boolean;
  onAction: (action: ContainerAction, container: DockerContainer) => void;
  onAddToHomarr: (container: DockerContainer) => void;
  onOpenLogs: (container: DockerContainer) => void;
}

const columnAccessors = ["name", "state", "host", "cpuUsage", "memoryUsage", "actions"];
const containerMenuWidth = 240;

const rowActionButtonSize = 22;
const rowActionIconVisualSize = 32;
const footerRefreshButtonSize = 24;
const footerRefreshIconVisualSize = 18;

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
  formatBytes: (bytes: number) => string,
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

  const firstValue = Object.entries(first).find(([key]) => key === accessor)?.[1];
  const secondValue = Object.entries(second).find(([key]) => key === accessor)?.[1];
  return String(firstValue ?? "").localeCompare(String(secondValue ?? ""));
};

export interface DockerViewProps {
  options: {
    columns: Parameters<typeof getDockerColumnVisibility>[0];
    containerFilter: string[];
    filterIsWhitelist: boolean;
    filterCaseSensitive: boolean;
    filterAllowWildcards: boolean;
    descendingDefaultSort: boolean;
    defaultSort: "name" | "state" | "cpuUsage" | "memoryUsage";
    enableRowSorting: boolean;
    columnOrder: string;
    columnWidths: string;
  };
  data: { containers: DockerContainer[]; endpoints: DockerEndpointStatus[]; timestamp: Date } | undefined;
  width: number;
  isEditMode: boolean;
  displayMode?: "compact" | "advanced";
  displayScale?: number;
  itemId: string | undefined;
  isFetching: boolean;
  refreshInventory: { isPending: boolean; mutate: () => void };
  actionHandlers: ContainerActionHandlers;
  formatBytes: (bytes: number) => string;
  persistLayout: (layout: Record<string, unknown>) => void;
  HomarrDataTable: typeof import("../common/homarr-data-table").HomarrDataTable;
  usePersistedTableLayout: typeof import("../common/use-persisted-table-layout").usePersistedTableLayout;
  zoomCompensatedSize: (size: number) => CSSProperties;
}

export function DockerView({
  options,
  width,
  isEditMode,
  displayMode,
  displayScale = 1,
  itemId,
  data,
  isFetching,
  refreshInventory,
  actionHandlers,
  formatBytes,
  persistLayout,
  HomarrDataTable,
  usePersistedTableLayout,
  zoomCompensatedSize,
}: DockerViewProps) {
  const t = useI18n("docker");
  const tCommon = useI18n("common");
  const tWidget = useI18n("widget.dockerContainers");
  const isAdvanced = displayMode === "advanced";
  const responsiveWidth = width * displayScale;

  const containers = useMemo(
    () =>
      (data?.containers ?? []).filter((container) =>
        matchesContainerFilter(container.name, {
          containerFilter: options.containerFilter,
          filterIsWhitelist: options.filterIsWhitelist,
          filterCaseSensitive: options.filterCaseSensitive,
          filterAllowWildcards: options.filterAllowWildcards,
        }),
      ),
    [
      data?.containers,
      options.containerFilter,
      options.filterIsWhitelist,
      options.filterCaseSensitive,
      options.filterAllowWildcards,
    ],
  );
  const timestamp = useMemo(() => data?.timestamp ?? new Date(), [data?.timestamp]);
  const relativeTime = useTimeAgo(timestamp);

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
    () => getDockerColumnVisibility(options.columns, responsiveWidth, isAdvanced),
    [isAdvanced, options.columns, responsiveWidth],
  );
  const columns = useMemo(() => {
    const sortingEnabled = (isAdvanced || options.enableRowSorting) && !isEditMode;
    return createColumns(t, tCommon, actionHandlers, sortingEnabled, formatBytes).filter(({ accessor }) =>
      Object.entries(columnVisibility).some(([key, visible]) => key === String(accessor) && visible),
    );
  }, [actionHandlers, columnVisibility, formatBytes, isAdvanced, isEditMode, options.enableRowSorting, t, tCommon]);
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

  if (data?.containers.length === 0 && data.endpoints.some(({ status }) => status === "unavailable")) {
    return (
      <Center h="100%">
        <Text>{tWidget("error.endpointsUnavailable")}</Text>
      </Center>
    );
  }

  const footerVisibility = getDockerFooterVisibility(responsiveWidth, isAdvanced);

  return (
    <Stack gap={0} h="100%" style={{ overflow: "hidden" }}>
      <Box style={{ flex: 1, minHeight: 0 }}>
        <HomarrDataTable
          preserveColumnWidths
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
