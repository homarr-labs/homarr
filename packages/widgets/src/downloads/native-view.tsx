"use client";

import "../widgets-common.css";
import "./styles.css";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Center,
  Divider,
  Group,
  Menu,
  Portal,
  Progress,
  RingProgress,
  SimpleGrid,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconChevronDown,
  IconChevronUp,
  IconCopy,
  IconDatabase,
  IconDownload,
  IconFilter,
  IconFilterOff,
  IconInfoCircle,
  IconPlayerPause,
  IconPlayerPlay,
  IconTrash,
  IconTrashX,
  IconUpload,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import type { DataTableColumn, DataTableSortStatus } from "mantine-datatable";

import type { RouterInputs, RouterOutputs } from "@homarr/api";
import type { ExtendedClientStatus, ExtendedDownloadClientItem } from "@homarr/integrations";
import type { ScopedTranslationFunction } from "@homarr/translation";
import type { getIconUrl, getIntegrationKindsByCategory } from "@homarr/definitions";
import type { ComponentProps, ReactNode } from "react";

import type { WidgetComponentProps } from "../definition";
import type { HomarrDataTable } from "../common/homarr-data-table";
import { formatLocalizedDateTime } from "../common/locale";
import {
  DOWNLOAD_COLUMN_ACCESSORS,
  filterDownloadItemsByStatus,
  getAvailableDownloadStates,
  getDownloadColumnAccessors,
  getDownloadsStatsDisplay,
} from "./helpers";

dayjs.extend(relativeTime);

type DownloadsT = ScopedTranslationFunction<"widget.downloads">;
type DownloadState = ExtendedDownloadClientItem["state"];

interface SizeConfig {
  fontSize: "xs" | "sm";
  iconSize: number;
  cellPadding: number;
  showSpeedColumns: boolean;
  showTimeColumn: boolean;
  showStateColumn: boolean;
}

interface ContextMenuState {
  x: number;
  y: number;
  item: ExtendedDownloadClientItem;
}

interface ColumnContext {
  optionsColumnSet: Set<string>;
  hasTorrents: boolean;
  hasMultipleClients: boolean;
  hasMultipleTypes: boolean;
  isAdvanced: boolean;
  size: SizeConfig;
}

const SIZE_BREAKPOINTS: { maxWidth: number; config: SizeConfig }[] = [
  {
    maxWidth: 300,
    config: {
      fontSize: "xs",
      iconSize: 12,
      cellPadding: 2,
      showSpeedColumns: false,
      showTimeColumn: false,
      showStateColumn: false,
    },
  },
  {
    maxWidth: 500,
    config: {
      fontSize: "xs",
      iconSize: 14,
      cellPadding: 4,
      showSpeedColumns: false,
      showTimeColumn: true,
      showStateColumn: false,
    },
  },
];

const DEFAULT_SIZE_CONFIG: SizeConfig = {
  fontSize: "sm",
  iconSize: 14,
  cellPadding: 4,
  showSpeedColumns: true,
  showTimeColumn: true,
  showStateColumn: true,
};

const stateColorMap: Record<DownloadState, string> = {
  downloading: "blue",
  leeching: "blue",
  seeding: "green",
  completed: "green",
  processing: "cyan",
  queued: "gray",
  paused: "yellow",
  stalled: "orange",
  failed: "red",
  unknown: "gray",
};

const columnVisibilityChecks: Partial<Record<string, (ctx: ColumnContext) => boolean>> = {
  upSpeed: (ctx) => ctx.hasTorrents && ctx.size.showSpeedColumns,
  ratio: (ctx) => ctx.hasTorrents,
  sent: (ctx) => ctx.hasTorrents,
  integration: (ctx) => ctx.isAdvanced || ctx.hasMultipleClients,
  type: (ctx) => ctx.isAdvanced || ctx.hasMultipleTypes,
  downSpeed: (ctx) => ctx.size.showSpeedColumns,
  time: (ctx) => ctx.size.showTimeColumn,
  state: (ctx) => ctx.size.showStateColumn,
};

const speedColumnConfig = {
  down: { Icon: IconDownload, color: "blue" as const },
  up: { Icon: IconUpload, color: "green" as const },
} as const;

export function getSizeConfig(width: number, _height = Number.POSITIVE_INFINITY, isAdvanced = false): SizeConfig {
  if (isAdvanced) return DEFAULT_SIZE_CONFIG;
  for (const { maxWidth, config } of SIZE_BREAKPOINTS) {
    if (width < maxWidth) return config;
  }
  return DEFAULT_SIZE_CONFIG;
}

function progressColor(state: DownloadState, progress: number): string {
  if (state === "paused") return "yellow";
  if (progress >= 1) return "green";
  return "blue";
}

function toCategoryArray(category: string | string[]): string[] {
  if (Array.isArray(category)) return category;
  return [category];
}

function matchesCategoryFilter(
  category: string | string[] | undefined,
  categoryFilter: string[],
  filterIsWhitelist: boolean,
): boolean {
  if (categoryFilter.length === 0) return true;
  const matches = categoryFilter.some((filter) => toCategoryArray(category ?? "").includes(filter));
  return filterIsWhitelist === matches;
}

function formatCategoryDisplay(category: string | string[] | undefined): string | undefined {
  if (!category) return undefined;
  if (Array.isArray(category)) return category.join(", ");
  return category;
}

function formatRatio(ratio: number): string {
  if (ratio >= 100) return ratio.toFixed(0);
  if (ratio >= 10) return ratio.toFixed(1);
  return ratio.toFixed(2);
}

function formatSizePair(
  used: number,
  total: number,
  formatBytesPair: (used: number, total: number) => { used: string; total: string },
): string {
  const formatted = formatBytesPair(used, total);
  return `${formatted.used} / ${formatted.total}`;
}

function showCompletedItem(
  item: Pick<ExtendedDownloadClientItem, "type" | "progress" | "upSpeed">,
  options: WidgetComponentProps<"downloads">["options"],
): boolean {
  if (item.progress < 1) return true;
  if (item.type === "torrent") {
    return options.showCompletedTorrent && (item.upSpeed ?? 0) >= Number(options.activeTorrentThreshold) * 1024;
  }
  if (item.type === "usenet") return options.showCompletedUsenet;
  return options.showCompletedHttp;
}

function shouldIncludeColumn(accessor: string, ctx: ColumnContext): boolean {
  if (!ctx.optionsColumnSet.has(accessor)) return false;
  const check = columnVisibilityChecks[accessor];
  if (check && !check(ctx)) return false;
  return true;
}

function toggleArrayItem<T>(array: T[], value: T): T[] {
  if (array.includes(value)) return array.filter((entry) => entry !== value);
  return [...array, value];
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}…`;
}

function getSortMultiplier(direction: DataTableSortStatus<ExtendedDownloadClientItem>["direction"]): number {
  if (direction === "desc") return -1;
  return 1;
}

function compareSortValues(
  accessor: keyof ExtendedDownloadClientItem,
  aVal: ExtendedDownloadClientItem[keyof ExtendedDownloadClientItem],
  bVal: ExtendedDownloadClientItem[keyof ExtendedDownloadClientItem],
  multiplier: number,
): number {
  if (accessor === "time") {
    let aTime = typeof aVal === "number" ? aVal : 0;
    let bTime = typeof bVal === "number" ? bVal : 0;
    if (aTime === 0) aTime = Infinity;
    if (bTime === 0) bTime = Infinity;
    return (aTime - bTime) * multiplier;
  }
  if (typeof aVal === "string" && typeof bVal === "string") return aVal.localeCompare(bVal) * multiplier;
  if (typeof aVal === "number" && typeof bVal === "number") return (aVal - bVal) * multiplier;
  return 0;
}

function buildProgressTooltip(
  record: ExtendedDownloadClientItem,
  formatBytesPair: (used: number, total: number) => { used: string; total: string },
  formatByteRate: (bytes: number) => string,
): string {
  const parts = [formatSizePair(record.received, record.size, formatBytesPair)];
  if (record.downSpeed) parts.push(`↓ ${formatByteRate(record.downSpeed)}`);
  if (record.time !== 0) parts.push(`ETA: ${dayjs().add(record.time, "milliseconds").fromNow(true)}`);
  return parts.join(" · ");
}

function SpeedCell({
  speed,
  fontSize,
  direction,
  formatByteRate,
}: {
  speed: number | undefined;
  fontSize: SizeConfig["fontSize"];
  direction: keyof typeof speedColumnConfig;
  formatByteRate: DownloadsPresentationBindings["formatByteRate"];
}) {
  if (!speed) return null;
  const { Icon, color } = speedColumnConfig[direction];
  return (
    <Group gap={4} wrap="nowrap">
      <Icon size="var(--mantine-font-size-xs)" style={{ flexShrink: 0, opacity: 0.5 }} />
      <Text size={fontSize} c={color}>
        {formatByteRate(speed)}
      </Text>
    </Group>
  );
}

export interface DownloadsPresentationBindings {
  t: DownloadsT;
  locale: string;
  formatByteRate: (bytes: number) => string;
  formatBytes: (bytes: number) => string;
  formatBytesPair: (used: number, total: number) => { used: string; total: string };
  getIconUrl: typeof getIconUrl;
  getIntegrationKindsByCategory: typeof getIntegrationKindsByCategory;
  renderClientIndicator: (integration: ExtendedClientStatus["integration"]) => ReactNode;
  copyText: (text: string) => void;
}

export type DownloadsTableViewProps = ComponentProps<typeof HomarrDataTable<ExtendedDownloadClientItem>>;
export type DownloadsTableRenderer = (props: DownloadsTableViewProps) => ReactNode;

export interface DownloadsViewProps {
  currentItems: RouterOutputs["widget"]["downloads"]["getJobsAndStatuses"] | undefined;
  isFetching: boolean;
  isInitialPending: boolean;
  loadingState: ReactNode;
  queryIndicators: ReactNode;
  isEditMode: boolean;
  integrationIds: string[];
  options: WidgetComponentProps<"downloads">["options"];
  width: number;
  height: number;
  displayMode?: "compact" | "advanced";
  integrationInteractSet: ReadonlySet<string>;
  bindings: DownloadsPresentationBindings;
  renderLayout: (
    columns: DataTableColumn<ExtendedDownloadClientItem>[],
    render: (renderTable: DownloadsTableRenderer) => ReactNode,
  ) => ReactNode;
  mutateResumeItem: (input: RouterInputs["widget"]["downloads"]["resumeItem"]) => void;
  mutatePauseItem: (input: RouterInputs["widget"]["downloads"]["pauseItem"]) => void;
  mutateDeleteItem: (input: RouterInputs["widget"]["downloads"]["deleteItem"]) => void;
  mutateResumeQueue: (input: RouterInputs["widget"]["downloads"]["resume"]) => void;
  mutatePauseQueue: (input: RouterInputs["widget"]["downloads"]["pause"]) => void;
}

export function DownloadsView({
  isEditMode,
  integrationIds,
  options,
  width,
  height,
  displayMode,
  currentItems,
  isFetching,
  isInitialPending,
  loadingState,
  queryIndicators,
  integrationInteractSet,
  bindings,
  renderLayout,
  mutateResumeItem,
  mutatePauseItem,
  mutateDeleteItem,
  mutateResumeQueue,
  mutatePauseQueue,
}: DownloadsViewProps) {
  const { formatByteRate, formatBytes, formatBytesPair, getIconUrl, getIntegrationKindsByCategory, t } = bindings;
  const availableItems = useMemo(() => currentItems?.filter((item) => item.data !== null) ?? [], [currentItems]);

  const [clientFilter, setClientFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [showStats, { toggle: toggleStats }] = useDisclosure(false);
  const isAdvanced = displayMode === "advanced";
  const statsDisplay = getDownloadsStatsDisplay(showStats, isAdvanced);

  let defaultSortDirection: DataTableSortStatus<ExtendedDownloadClientItem>["direction"] = "asc";
  if (options.descendingDefaultSort) defaultSortDirection = "desc";
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<ExtendedDownloadClientItem>>(() => ({
    columnAccessor: options.defaultSort,
    direction: defaultSortDirection,
  }));
  const hasMountedSortDefaults = useRef(false);
  useEffect(() => {
    if (!hasMountedSortDefaults.current) {
      hasMountedSortDefaults.current = true;
      return;
    }
    setSortStatus({ columnAccessor: options.defaultSort, direction: defaultSortDirection });
  }, [options.defaultSort, defaultSortDirection]);

  const eligibleData = useMemo<ExtendedDownloadClientItem[]>(() => {
    return availableItems
      .filter(({ integration }) => integrationIds.includes(integration.id))
      .flatMap((pair) =>
        pair.data.items
          .filter(({ category }) => matchesCategoryFilter(category, options.categoryFilter, options.filterIsWhitelist))
          .filter((item) => showCompletedItem(item, options))
          .filter(() => clientFilter.length === 0 || clientFilter.includes(pair.integration.id))
          .map((item): ExtendedDownloadClientItem => {
            const received = item.received ?? Math.floor(item.size * item.progress);
            const ids = [pair.integration.id];
            let category: string | string[] | undefined = item.category;
            if (category !== undefined && category.length === 0) category = undefined;

            let ratio: number | undefined;
            if (item.sent !== undefined && item.size > 0) ratio = item.sent / item.size;

            let actions: ExtendedDownloadClientItem["actions"];
            if (integrationInteractSet.has(pair.integration.id)) {
              actions = {
                resume: () => mutateResumeItem({ integrationIds: ids, item }),
                pause: () => mutatePauseItem({ integrationIds: ids, item }),
                delete: ({ fromDisk }) => mutateDeleteItem({ integrationIds: ids, item, fromDisk }),
              };
            }

            return { integration: pair.integration, ...item, category, received, ratio, actions };
          }),
      );
  }, [
    availableItems,
    integrationIds,
    integrationInteractSet,
    mutateDeleteItem,
    mutatePauseItem,
    mutateResumeItem,
    options,
    clientFilter,
  ]);

  const data = useMemo(() => filterDownloadItemsByStatus(eligibleData, statusFilter), [eligibleData, statusFilter]);

  const sortedData = useMemo(() => {
    const accessor = DOWNLOAD_COLUMN_ACCESSORS.find((value) => value === sortStatus.columnAccessor);
    if (!accessor) return data;
    const multiplier = getSortMultiplier(sortStatus.direction);
    return [...data].toSorted((a, b) => {
      const aVal = a[accessor] ?? 0;
      const bVal = b[accessor] ?? 0;
      return compareSortValues(accessor, aVal, bVal, multiplier);
    });
  }, [data, sortStatus]);

  const clients = useMemo<ExtendedClientStatus[]>(() => {
    return availableItems
      .filter(({ integration }) => integrationIds.includes(integration.id))
      .map(({ integration, data: clientData }): ExtendedClientStatus => {
        const interact = integrationInteractSet.has(integration.id);
        const isTorrent = getIntegrationKindsByCategory("torrent").some((kind) => kind === integration.kind);
        const applyRatioFilter = options.applyFilterToRatio && clientData.status.types.includes("torrent");

        let initialTotalUp: number | undefined;
        if (isTorrent) initialTotalUp = 0;

        const { totalUp, totalDown } = clientData.items
          .filter(({ category }) => {
            if (!applyRatioFilter) return true;
            return matchesCategoryFilter(category, options.categoryFilter, options.filterIsWhitelist);
          })
          .reduce(
            (acc, { sent, size, progress }) => {
              let nextTotalUp: number | undefined;
              if (isTorrent) nextTotalUp = (acc.totalUp ?? 0) + (sent ?? 0);
              return {
                totalUp: nextTotalUp,
                totalDown: acc.totalDown + size * progress,
              };
            },
            { totalDown: 0, totalUp: initialTotalUp },
          );

        let ratio: number | undefined;
        if (totalUp !== undefined && totalDown !== 0) ratio = totalUp / totalDown;

        return {
          integration,
          interact,
          status: { totalUp, totalDown, ratio, ...clientData.status },
        };
      });
  }, [
    availableItems,
    integrationIds,
    integrationInteractSet,
    options.applyFilterToRatio,
    options.categoryFilter,
    options.filterIsWhitelist,
    getIntegrationKindsByCategory,
  ]);

  const hasTorrents = data.some(({ type }) => type === "torrent");
  const hasMultipleClients = clients.length > 1;
  const hasMultipleTypes = new Set(data.map(({ type }) => type)).size > 1;

  const size = useMemo(() => getSizeConfig(width, height, isAdvanced), [height, isAdvanced, width]);
  const optionsColumnSet = useMemo(
    () => new Set<string>(getDownloadColumnAccessors(options.columns, isAdvanced)),
    [isAdvanced, options.columns],
  );
  const columnContext = useMemo<ColumnContext>(
    () => ({ optionsColumnSet, hasTorrents, hasMultipleClients, hasMultipleTypes, isAdvanced, size }),
    [optionsColumnSet, hasTorrents, hasMultipleClients, hasMultipleTypes, isAdvanced, size],
  );

  let progressColumnWidth = 120;
  if (width < 400) progressColumnWidth = 80;

  const columns = useMemo((): DataTableColumn<ExtendedDownloadClientItem>[] => {
    const includeColumn = (accessor: string) => shouldIncludeColumn(accessor, columnContext);
    const cols: (DataTableColumn<ExtendedDownloadClientItem> | false)[] = [
      includeColumn("integration") && {
        accessor: "integration",
        title: "",
        width: 36,
        render: (record) => (
          <Tooltip key={displayMode} label={record.integration.name} withArrow>
            <Avatar size={20} radius={0} src={getIconUrl(record.integration.kind)} />
          </Tooltip>
        ),
      },
      includeColumn("name") && {
        accessor: "name",
        title: t("items.name.columnTitle"),
        sortable: true,
        ellipsis: true,
        width: 240,
        render: (record) => (
          <Tooltip
            key={displayMode}
            label={buildHoverTooltip(record, t, formatBytesPair, formatByteRate)}
            multiline
            w={280}
            withArrow
            position="bottom-start"
            openDelay={400}
            transitionProps={{ transition: "fade", duration: 150 }}
            color="dark"
          >
            <Group gap={6} wrap="nowrap" style={{ overflow: "hidden" }}>
              <Box
                w={8}
                h={8}
                style={{
                  borderRadius: "50%",
                  backgroundColor: `var(--mantine-color-${stateColorMap[record.state]}-filled)`,
                  flexShrink: 0,
                }}
              />
              <Text size={size.fontSize} truncate fw={500}>
                {record.name}
              </Text>
            </Group>
          </Tooltip>
        ),
      },
      includeColumn("progress") && {
        accessor: "progress",
        title: t("items.progress.columnTitle"),
        sortable: true,
        width: progressColumnWidth,
        render: (record) => {
          const pct = Math.floor(record.progress * 100);
          return (
            <Tooltip
              key={displayMode}
              label={buildProgressTooltip(record, formatBytesPair, formatByteRate)}
              withArrow
              openDelay={300}
              position="top"
              color="dark"
            >
              <Group gap={4} wrap="nowrap" style={{ flex: 1 }}>
                <Text size="xs" fw={500} w={36} ta="right" style={{ flexShrink: 0 }}>
                  {`${pct}%`}
                </Text>
                <Progress
                  value={pct}
                  color={progressColor(record.state, record.progress)}
                  size="sm"
                  style={{ flex: 1 }}
                />
              </Group>
            </Tooltip>
          );
        },
      },
      includeColumn("size") && {
        accessor: "size",
        title: t("items.size.columnTitle"),
        sortable: true,
        width: 80,
        noWrap: true,
        render: (record) => <Text size={size.fontSize}>{formatBytes(record.size)}</Text>,
      },
      includeColumn("downSpeed") && {
        accessor: "downSpeed",
        title: t("items.downSpeed.columnTitle"),
        sortable: true,
        width: 90,
        noWrap: true,
        render: (record) => (
          <SpeedCell
            speed={record.downSpeed}
            fontSize={size.fontSize}
            direction="down"
            formatByteRate={formatByteRate}
          />
        ),
      },
      includeColumn("upSpeed") && {
        accessor: "upSpeed",
        title: t("items.upSpeed.columnTitle"),
        sortable: true,
        width: 90,
        noWrap: true,
        render: (record) => (
          <SpeedCell speed={record.upSpeed} fontSize={size.fontSize} direction="up" formatByteRate={formatByteRate} />
        ),
      },
      includeColumn("time") && {
        accessor: "time",
        title: t("items.time.columnTitle"),
        sortable: true,
        width: 100,
        noWrap: true,
        render: (record) => {
          if (record.time === 0)
            return (
              <Text size={size.fontSize} c="dimmed">
                ∞
              </Text>
            );
          return <Text size={size.fontSize}>{dayjs().add(record.time, "milliseconds").fromNow(true)}</Text>;
        },
      },
      includeColumn("state") && {
        accessor: "state",
        title: t("items.state.columnTitle"),
        width: 90,
        render: (record) => (
          <Badge size="xs" variant="dot" color={stateColorMap[record.state]}>
            {t(`states.${record.state}`)}
          </Badge>
        ),
      },
      includeColumn("added") && {
        accessor: "added",
        title: t("items.added.columnTitle"),
        sortable: true,
        width: 90,
        noWrap: true,
        render: (record) => {
          if (!record.added) return <Text size={size.fontSize}>—</Text>;
          return <Text size={size.fontSize}>{dayjs(record.added).fromNow()}</Text>;
        },
      },
      includeColumn("ratio") && {
        accessor: "ratio",
        title: t("items.ratio.columnTitle"),
        sortable: true,
        width: 60,
        render: (record) => {
          if (record.ratio === undefined) return null;
          return <Text size={size.fontSize}>{formatRatio(record.ratio)}</Text>;
        },
      },
      includeColumn("received") && {
        accessor: "received",
        title: t("items.received.columnTitle"),
        sortable: true,
        width: 80,
        noWrap: true,
        render: (record) => <Text size={size.fontSize}>{formatBytes(record.received)}</Text>,
      },
      includeColumn("sent") && {
        accessor: "sent",
        title: t("items.sent.columnTitle"),
        sortable: true,
        width: 80,
        noWrap: true,
        render: (record) => {
          if (!record.sent) return null;
          return <Text size={size.fontSize}>{formatBytes(record.sent)}</Text>;
        },
      },
      includeColumn("category") && {
        accessor: "category",
        title: t("items.category.columnTitle"),
        width: 80,
        ellipsis: true,
        render: (record) => {
          const display = formatCategoryDisplay(record.category);
          if (!display) return null;
          return (
            <Text size={size.fontSize} truncate>
              {display}
            </Text>
          );
        },
      },
      includeColumn("index") && {
        accessor: "index",
        title: t("items.index.columnTitle"),
        sortable: true,
        width: 40,
        render: (record) => <Text size={size.fontSize}>{record.index}</Text>,
      },
      includeColumn("type") && {
        accessor: "type",
        title: t("items.type.columnTitle"),
        sortable: true,
        width: 70,
        render: (record) => (
          <Text size={size.fontSize} tt="capitalize">
            {record.type}
          </Text>
        ),
      },
    ];
    return cols.filter((column): column is DataTableColumn<ExtendedDownloadClientItem> => column !== false);
  }, [
    columnContext,
    displayMode,
    formatByteRate,
    formatBytes,
    formatBytesPair,
    progressColumnWidth,
    size,
    t,
    getIconUrl,
  ]);

  const handleContextMenu = useCallback(
    ({ record, event }: { record: ExtendedDownloadClientItem; event: React.MouseEvent }) => {
      event.preventDefault();
      setContextMenu({ x: event.clientX, y: event.clientY, item: record });
    },
    [],
  );

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const totalSpeed = clients.reduce((sum, c) => sum + (c.status?.rates.down ?? 0), 0);
  const totalUpSpeed = clients.reduce((sum, c) => sum + (c.status?.rates.up ?? 0), 0);
  const globalRatio = useMemo(() => {
    const traffic = clients
      .filter(({ integration: { kind } }) => getIntegrationKindsByCategory("torrent").some((k) => k === kind))
      .reduce(
        ({ up, down }, { status }) => ({ up: up + (status?.totalUp ?? 0), down: down + (status?.totalDown ?? 0) }),
        { up: 0, down: 0 },
      );
    if (traffic.down <= 0) return 0;
    return traffic.up / traffic.down;
  }, [clients, getIntegrationKindsByCategory]);

  const availableStatuses = useMemo(() => getAvailableDownloadStates(eligibleData), [eligibleData]);

  const queueStats = useMemo(() => {
    const stateCounts: Record<string, number> = {};
    let totalSize = 0;
    let completedSize = 0;
    for (const item of data) {
      stateCounts[item.state] = (stateCounts[item.state] ?? 0) + 1;
      totalSize += item.size;
      completedSize += item.received ?? item.size * item.progress;
    }
    return { stateCounts, states: getAvailableDownloadStates(data), totalSize, completedSize, totalItems: data.length };
  }, [data]);

  return renderLayout(columns, (renderTable) => {
    if (!isAdvanced && options.columns.length === 0) {
      return (
        <Box h="100%" pos="relative">
          <Box pos="absolute" top={4} right={8} style={{ zIndex: 2 }}>
            {queryIndicators}
          </Box>
          <Center h="100%">
            <Text>{t("errors.noColumns")}</Text>
          </Center>
        </Box>
      );
    }

    if (isInitialPending) return loadingState;

    let rowContextMenuHandler: typeof handleContextMenu | undefined = handleContextMenu;
    if (isEditMode) rowContextMenuHandler = undefined;

    return (
      <Stack gap={0} h="100%" style={{ overflow: "hidden" }}>
        {statsDisplay.visible && (
          <GlobalStatsBar
            key={`stats-${displayMode}`}
            queueStats={queueStats}
            totalSpeed={totalSpeed}
            totalUpSpeed={totalUpSpeed}
            globalRatio={globalRatio}
            hasTorrents={hasTorrents}
            clients={clients}
            bindings={bindings}
          />
        )}

        <Box style={{ flex: 1, minHeight: 0, position: "relative" }}>
          <Box pos="absolute" top={4} right={8} style={{ zIndex: 2 }}>
            {queryIndicators}
          </Box>
          {renderTable({
            preserveColumnWidths: true,
            isEditMode,
            cellPadding: `${size.cellPadding}px 8px`,
            fetching: isFetching && (currentItems?.length ?? 0) === 0,
            fz: size.fontSize,
            records: sortedData,
            columns,
            sortStatus,
            onSortStatusChange: setSortStatus,
            noRecordsText: t("errors.noItems"),
            idAccessor: (record) => `${record.integration.id}:${record.id}`,
            className: "downloads-table",
            customRowAttributes: (_, index) => ({ "data-row-index": index }),
            onRowContextMenu: rowContextMenuHandler,
            rowExpansion: {
              trigger: "click",
              allowMultiple: true,
              collapseProps: {
                transitionDuration: 200,
                animateOpacity: true,
                transitionTimingFunction: "ease-out",
              },
              content: ({ record, collapse }) => <ExpandedRow item={record} collapse={collapse} bindings={bindings} />,
            },
            onScroll: () => {
              if (contextMenu) closeContextMenu();
            },
          })}
        </Box>

        <WidgetFooter
          key={`footer-${displayMode}`}
          clients={clients}
          totalSpeed={totalSpeed}
          totalUpSpeed={totalUpSpeed}
          globalRatio={globalRatio}
          hasTorrents={hasTorrents}
          clientFilter={clientFilter}
          setClientFilter={setClientFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          availableStatuses={availableStatuses}
          pauseQueue={mutatePauseQueue}
          resumeQueue={mutateResumeQueue}
          showStats={statsDisplay.visible}
          toggleStats={statsDisplay.canToggle ? toggleStats : undefined}
          bindings={bindings}
        />

        {contextMenu && (
          <RowContextMenu state={contextMenu} onClose={closeContextMenu} t={t} copyText={bindings.copyText} />
        )}
      </Stack>
    );
  });
}

function buildHoverTooltip(
  record: ExtendedDownloadClientItem,
  t: DownloadsT,
  formatBytesPair: (used: number, total: number) => { used: string; total: string },
  formatByteRate: (bytes: number) => string,
): React.ReactNode {
  const lines: { label: string; value: string }[] = [
    { label: t("items.size.detailsTitle"), value: formatSizePair(record.received, record.size, formatBytesPair) },
    { label: t("items.state.detailsTitle"), value: t(`states.${record.state}`) },
  ];

  if (record.downSpeed) {
    lines.push({ label: t("items.downSpeed.detailsTitle"), value: formatByteRate(record.downSpeed) });
  }
  if (record.upSpeed) {
    lines.push({ label: t("items.upSpeed.detailsTitle"), value: formatByteRate(record.upSpeed) });
  }
  if (record.time !== 0) {
    lines.push({ label: t("items.time.eta"), value: dayjs().add(record.time, "milliseconds").fromNow() });
  }
  if (record.ratio !== undefined) {
    lines.push({ label: t("items.ratio.detailsTitle"), value: record.ratio.toFixed(2) });
  }
  const categoryDisplay = formatCategoryDisplay(record.category);
  if (categoryDisplay) {
    lines.push({ label: t("items.category.detailsTitle"), value: categoryDisplay });
  }

  return (
    <Stack gap={2}>
      <Text size="xs" fw={600} style={{ wordBreak: "break-all" }}>
        {record.name}
      </Text>
      <Divider my={2} />
      {lines.map(({ label, value }) => (
        <Group key={label} gap={4} justify="space-between">
          <Text size="xs" c="dimmed">
            {label}
          </Text>
          <Text size="xs" fw={500}>
            {value}
          </Text>
        </Group>
      ))}
    </Stack>
  );
}

function ExpandedRow({
  item,
  collapse,
  bindings,
}: {
  item: ExtendedDownloadClientItem;
  collapse: () => void;
  bindings: DownloadsPresentationBindings;
}) {
  const { t, locale, formatByteRate, formatBytes, formatBytesPair, getIconUrl } = bindings;
  const progressPercent = Math.floor(item.progress * 100);
  const categoryDisplay = formatCategoryDisplay(item.category);

  let timeDisplay = "∞";
  if (item.time !== 0) timeDisplay = dayjs().add(item.time, "milliseconds").fromNow();

  return (
    <Box
      px="sm"
      py="xs"
      style={{ borderBottom: "1px solid var(--mantine-color-default-border)", cursor: "pointer" }}
      onClick={collapse}
    >
      <Group gap="md" align="flex-start" wrap="nowrap">
        <RingProgress
          size={52}
          thickness={5}
          roundCaps
          sections={[{ value: progressPercent, color: progressColor(item.state, item.progress) }]}
          label={<Text size="xs" ta="center" fw={700}>{`${progressPercent}%`}</Text>}
        />

        <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
          <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
            <Avatar size="var(--mantine-font-size-md)" radius={0} src={getIconUrl(item.integration.kind)} />
            <Text size="sm" fw={600} truncate style={{ minWidth: 0 }}>
              {item.name}
            </Text>
            <Badge size="xs" variant="dot" color={stateColorMap[item.state]} ml="auto" style={{ flexShrink: 0 }}>
              {t(`states.${item.state}`)}
            </Badge>
          </Group>

          <SimpleGrid cols={3} spacing="xs" verticalSpacing={4} style={{ minWidth: 0 }}>
            <DetailPair
              label={t("items.size.detailsTitle")}
              value={formatSizePair(item.received, item.size, formatBytesPair)}
            />
            {item.downSpeed !== undefined && item.downSpeed > 0 && (
              <DetailPair
                label={t("items.downSpeed.detailsTitle")}
                value={formatByteRate(item.downSpeed)}
                icon={<IconDownload size="var(--mantine-font-size-xs)" />}
                color="blue"
              />
            )}
            {item.upSpeed !== undefined && item.upSpeed > 0 && (
              <DetailPair
                label={t("items.upSpeed.detailsTitle")}
                value={formatByteRate(item.upSpeed)}
                icon={<IconUpload size="var(--mantine-font-size-xs)" />}
                color="green"
              />
            )}
            {item.ratio !== undefined && (
              <DetailPair label={t("items.ratio.detailsTitle")} value={item.ratio.toFixed(2)} />
            )}
            <DetailPair label={t("items.time.detailsTitle")} value={timeDisplay} />
            {item.sent !== undefined && (
              <DetailPair label={t("items.sent.detailsTitle")} value={formatBytes(item.sent)} />
            )}
            {item.added !== undefined && (
              <DetailPair label={t("items.added.detailsTitle")} value={formatLocalizedDateTime(item.added, locale)} />
            )}
            {categoryDisplay && <DetailPair label={t("items.category.detailsTitle")} value={categoryDisplay} />}
            <DetailPair label={t("items.id.detailsTitle")} value={item.id} />
          </SimpleGrid>
        </Stack>
      </Group>
    </Box>
  );
}

function DetailPair({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  color?: string;
}) {
  return (
    <Stack gap={0} style={{ minWidth: 0, overflow: "hidden" }}>
      <Text size="xs" c="dimmed" truncate>
        {label}:
      </Text>
      <Group gap={2} wrap="nowrap" style={{ minWidth: 0 }}>
        {icon}
        <Text size="sm" fw={500} c={color} truncate style={{ minWidth: 0 }}>
          {value}
        </Text>
      </Group>
    </Stack>
  );
}

function GlobalStatsBar({
  queueStats,
  totalSpeed,
  totalUpSpeed,
  globalRatio,
  hasTorrents,
  clients,
  bindings,
}: {
  queueStats: {
    stateCounts: Record<string, number>;
    states: DownloadState[];
    totalSize: number;
    completedSize: number;
    totalItems: number;
  };
  totalSpeed: number;
  totalUpSpeed: number;
  globalRatio: number;
  hasTorrents: boolean;
  clients: ExtendedClientStatus[];
  bindings: DownloadsPresentationBindings;
}) {
  const { t, formatByteRate, formatBytesPair } = bindings;

  let overallProgress = 0;
  if (queueStats.totalSize > 0) overallProgress = queueStats.completedSize / queueStats.totalSize;
  const overallProgressPct = Math.floor(overallProgress * 100);

  return (
    <Box px={8} py={6} style={{ borderBottom: "1px solid var(--mantine-color-default-border)" }}>
      <Group justify="space-between" gap="xs">
        <Group gap="md">
          <Tooltip label={t("stats.overallProgress")} withArrow>
            <Group gap={4}>
              <Progress value={overallProgressPct} color="blue" size="xs" w={40} />
              <Text size="xs" fw={600}>{`${overallProgressPct}%`}</Text>
            </Group>
          </Tooltip>

          <Tooltip label={t("stats.totalSize")} withArrow>
            <Group gap={4}>
              <IconDatabase size="var(--mantine-font-size-xs)" style={{ opacity: 0.6 }} />
              <Text size="xs">{formatSizePair(queueStats.completedSize, queueStats.totalSize, formatBytesPair)}</Text>
            </Group>
          </Tooltip>
        </Group>

        <Group gap="md">
          <Group gap={4}>
            <IconDownload size="var(--mantine-font-size-xs)" style={{ opacity: 0.6 }} />
            <Text size="xs" fw={600} c="blue">
              {formatByteRate(totalSpeed)}
            </Text>
          </Group>
          {totalUpSpeed > 0 && (
            <Group gap={4}>
              <IconUpload size="var(--mantine-font-size-xs)" style={{ opacity: 0.6 }} />
              <Text size="xs" fw={600} c="green">
                {formatByteRate(totalUpSpeed)}
              </Text>
            </Group>
          )}
          {hasTorrents && globalRatio > 0 && (
            <Text size="xs" c="dimmed">{`${t("globalRatio")}: ${globalRatio.toFixed(2)}`}</Text>
          )}
        </Group>

        <Group gap={6}>
          {queueStats.states.map((state) => (
            <Tooltip key={state} label={t(`states.${state}`)} withArrow>
              <Badge size="xs" variant="dot" color={stateColorMap[state]}>
                {queueStats.stateCounts[state]}
              </Badge>
            </Tooltip>
          ))}
          <Text size="xs" c="dimmed">
            {t("stats.clients", { count: clients.length })}
          </Text>
        </Group>
      </Group>
    </Box>
  );
}

function RowContextMenu({
  state,
  onClose,
  t,
  copyText,
}: {
  state: ContextMenuState;
  onClose: () => void;
  t: DownloadsT;
  copyText: DownloadsPresentationBindings["copyText"];
}) {
  const { item } = state;
  const isPaused = item.state === "paused";
  const hasActions = !!item.actions;
  const [showDeleteConfirm, { open: openDelete }] = useDisclosure(false);

  let PauseResumeIcon = IconPlayerPause;
  let pauseResumeInvoke = item.actions?.pause;
  let pauseResumeLabel = t("actions.item.pause");
  if (isPaused) {
    PauseResumeIcon = IconPlayerPlay;
    pauseResumeInvoke = item.actions?.resume;
    pauseResumeLabel = t("actions.item.resume");
  }

  return (
    <Portal>
      <Box
        pos="fixed"
        top={0}
        left={0}
        w="100vw"
        h="100vh"
        style={{ zIndex: "var(--mantine-z-index-popover)" }}
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      >
        <Menu
          opened
          shadow="md"
          position="bottom-start"
          withinPortal={false}
          onClose={onClose}
          closeOnItemClick={false}
        >
          <Menu.Target>
            <Box pos="fixed" style={{ left: state.x, top: state.y, width: 1, height: 1 }} />
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>{truncateText(item.name, 40)}</Menu.Label>

            <Menu.Item
              leftSection={<IconInfoCircle size="var(--mantine-font-size-sm)" />}
              onClick={() => {
                copyText(item.name);
                onClose();
              }}
            >
              {t("contextMenu.copyName")}
            </Menu.Item>

            {item.id && (
              <Menu.Item
                leftSection={<IconCopy size="var(--mantine-font-size-sm)" />}
                onClick={() => {
                  copyText(item.id);
                  onClose();
                }}
              >
                {t("contextMenu.copyId")}
              </Menu.Item>
            )}

            {hasActions && (
              <>
                <Menu.Divider />
                <Menu.Item
                  leftSection={<PauseResumeIcon size="var(--mantine-font-size-sm)" />}
                  onClick={() => {
                    pauseResumeInvoke?.();
                    onClose();
                  }}
                >
                  {pauseResumeLabel}
                </Menu.Item>

                {!showDeleteConfirm && (
                  <Menu.Item
                    color="red"
                    leftSection={<IconTrash size="var(--mantine-font-size-sm)" />}
                    onClick={(e) => {
                      e.stopPropagation();
                      openDelete();
                    }}
                  >
                    {t("actions.item.delete.title")}
                  </Menu.Item>
                )}

                {showDeleteConfirm && (
                  <>
                    <Menu.Item
                      color="red"
                      leftSection={<IconTrash size="var(--mantine-font-size-sm)" />}
                      onClick={() => {
                        item.actions?.delete({ fromDisk: false });
                        onClose();
                      }}
                    >
                      {t("actions.item.delete.entry")}
                    </Menu.Item>
                    <Menu.Item
                      color="red"
                      leftSection={<IconTrashX size="var(--mantine-font-size-sm)" />}
                      onClick={() => {
                        item.actions?.delete({ fromDisk: true });
                        onClose();
                      }}
                    >
                      {t("actions.item.delete.entryAndFiles")}
                    </Menu.Item>
                  </>
                )}
              </>
            )}
          </Menu.Dropdown>
        </Menu>
      </Box>
    </Portal>
  );
}

interface WidgetFooterProps {
  clients: ExtendedClientStatus[];
  totalSpeed: number;
  totalUpSpeed: number;
  globalRatio: number;
  hasTorrents: boolean;
  clientFilter: string[];
  setClientFilter: (ids: string[]) => void;
  statusFilter: string[];
  setStatusFilter: (statuses: string[]) => void;
  availableStatuses: ExtendedDownloadClientItem["state"][];
  pauseQueue: (args: { integrationIds: string[] }) => void;
  resumeQueue: (args: { integrationIds: string[] }) => void;
  showStats: boolean;
  toggleStats?: () => void;
  bindings: DownloadsPresentationBindings;
}

function WidgetFooter({
  clients,
  totalSpeed,
  totalUpSpeed,
  globalRatio,
  hasTorrents,
  clientFilter,
  setClientFilter,
  statusFilter,
  setStatusFilter,
  availableStatuses,
  pauseQueue,
  resumeQueue,
  showStats,
  toggleStats,
  bindings,
}: WidgetFooterProps) {
  const { t, formatByteRate, getIconUrl, renderClientIndicator } = bindings;
  const [filterOpen, { toggle: toggleFilter }] = useDisclosure(false);
  const someInteract = clients.some(({ interact }) => interact);
  const hasActiveFilter = clientFilter.length > 0 || statusFilter.length > 0;

  const integrationsStatuses: { paused: string[]; active: string[] } = { paused: [], active: [] };
  for (const {
    status,
    integration: { id },
    interact,
  } of clients) {
    if (!status || !interact) continue;
    if (status.paused) integrationsStatuses.paused.push(id);
    else integrationsStatuses.active.push(id);
  }

  let filterTooltip = t("footer.filter");
  if (hasActiveFilter) filterTooltip = t("contextMenu.clearFilters");

  let filterIconVariant: "filled" | "subtle" = "subtle";
  if (hasActiveFilter) filterIconVariant = "filled";

  let statsTooltip = t("stats.show");
  if (showStats) statsTooltip = t("stats.hide");

  let statsIconVariant: "filled" | "subtle" = "subtle";
  if (showStats) statsIconVariant = "filled";

  let FilterIcon = IconFilter;
  if (hasActiveFilter) FilterIcon = IconFilterOff;

  let StatsIcon = IconChevronDown;
  if (showStats) StatsIcon = IconChevronUp;

  return (
    <Box style={{ borderTop: "1px solid var(--mantine-color-default-border)" }}>
      {filterOpen && (
        <Box px={8} py={6} style={{ borderBottom: "1px solid var(--mantine-color-default-border)" }}>
          <Stack gap={6}>
            {clients.length > 1 && (
              <Group gap={4}>
                <Text size="xs" fw={600} style={{ flexShrink: 0 }}>
                  {t("items.integration.columnTitle")}:
                </Text>
                <Group gap={4} wrap="wrap">
                  {clients.map(({ integration }) => {
                    const active = clientFilter.includes(integration.id);
                    let variant: "filled" | "light" = "light";
                    if (active) variant = "filled";
                    return (
                      <UnstyledButton
                        key={integration.id}
                        aria-pressed={active}
                        aria-label={integration.name}
                        onClick={() => setClientFilter(toggleArrayItem(clientFilter, integration.id))}
                      >
                        <Badge
                          size="xs"
                          variant={variant}
                          leftSection={<Avatar size={12} radius={0} src={getIconUrl(integration.kind)} />}
                        >
                          {integration.name}
                        </Badge>
                      </UnstyledButton>
                    );
                  })}
                </Group>
              </Group>
            )}
            {availableStatuses.length > 1 && (
              <Group gap={4}>
                <Text size="xs" fw={600} style={{ flexShrink: 0 }}>
                  {t("items.state.columnTitle")}:
                </Text>
                <Group gap={4} wrap="wrap">
                  {availableStatuses.map((status) => {
                    const active = statusFilter.includes(status);
                    let variant: "filled" | "light" = "light";
                    if (active) variant = "filled";
                    return (
                      <UnstyledButton
                        key={status}
                        aria-pressed={active}
                        aria-label={t(`states.${status}`)}
                        onClick={() => setStatusFilter(toggleArrayItem(statusFilter, status))}
                      >
                        <Badge size="xs" variant={variant} color={stateColorMap[status]}>
                          {t(`states.${status}`)}
                        </Badge>
                      </UnstyledButton>
                    );
                  })}
                </Group>
              </Group>
            )}
          </Stack>
        </Box>
      )}

      <Group px={8} py={4} justify="space-between">
        <Group gap={6}>
          <Tooltip label={filterTooltip}>
            <ActionIcon
              size="xs"
              variant={filterIconVariant}
              aria-label={filterTooltip}
              onClick={() => {
                if (hasActiveFilter && !filterOpen) {
                  setClientFilter([]);
                  setStatusFilter([]);
                } else {
                  toggleFilter();
                }
              }}
            >
              <FilterIcon size="var(--mantine-font-size-sm)" />
            </ActionIcon>
          </Tooltip>

          {toggleStats ? (
            <Tooltip label={statsTooltip}>
              <ActionIcon size="xs" variant={statsIconVariant} aria-label={statsTooltip} onClick={toggleStats}>
                <StatsIcon size="var(--mantine-font-size-sm)" />
              </ActionIcon>
            </Tooltip>
          ) : null}

          <Group gap={2}>
            {clients.map(({ integration }) => (
              <Fragment key={integration.id}>{renderClientIndicator(integration)}</Fragment>
            ))}
          </Group>
        </Group>

        <Group gap={8}>
          {!showStats && hasTorrents && globalRatio > 0 && (
            <Text size="xs" c="dimmed">{`${t("globalRatio")}: ${globalRatio.toFixed(2)}`}</Text>
          )}

          <Group gap={4}>
            {someInteract && (
              <Tooltip label={t("actions.clients.resume")}>
                <ActionIcon
                  size="xs"
                  variant="subtle"
                  color="green"
                  aria-label={t("actions.clients.resume")}
                  disabled={integrationsStatuses.paused.length === 0}
                  onClick={() => resumeQueue({ integrationIds: integrationsStatuses.paused })}
                >
                  <IconPlayerPlay size="var(--mantine-font-size-sm)" />
                </ActionIcon>
              </Tooltip>
            )}

            {!showStats && (
              <Group gap={2}>
                <Text size="xs" fw={600} c="blue">
                  <IconDownload
                    size="var(--mantine-font-size-xs)"
                    style={{ verticalAlign: "middle", marginRight: 2 }}
                  />
                  {formatByteRate(totalSpeed)}
                </Text>
                {totalUpSpeed > 0 && (
                  <Text size="xs" fw={600} c="green">
                    <IconUpload
                      size="var(--mantine-font-size-xs)"
                      style={{ verticalAlign: "middle", marginRight: 2 }}
                    />
                    {formatByteRate(totalUpSpeed)}
                  </Text>
                )}
              </Group>
            )}

            {someInteract && (
              <Tooltip label={t("actions.clients.pause")}>
                <ActionIcon
                  size="xs"
                  variant="subtle"
                  color="red"
                  aria-label={t("actions.clients.pause")}
                  disabled={integrationsStatuses.active.length === 0}
                  onClick={() => pauseQueue({ integrationIds: integrationsStatuses.active })}
                >
                  <IconPlayerPause size="var(--mantine-font-size-sm)" />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>
        </Group>
      </Group>
    </Box>
  );
}
