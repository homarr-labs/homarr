"use client";

import "../widgets-common.css";
import "./styles.css";

import { useCallback, useMemo, useState } from "react";
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
import { DataTable } from "mantine-datatable";

import { clientApi } from "@homarr/api/client";
import { useIntegrationsWithInteractAccess } from "@homarr/auth/client";
import { formatByteRate, formatBytes, useIntegrationConnected } from "@homarr/common";
import { getIconUrl, getIntegrationKindsByCategory } from "@homarr/definitions";
import type { ExtendedClientStatus, ExtendedDownloadClientItem } from "@homarr/integrations";
import { showErrorNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";

dayjs.extend(relativeTime);

interface SizeConfig {
  fontSize: "xs" | "sm";
  iconSize: number;
  cellPadding: number;
  showSpeedColumns: boolean;
  showTimeColumn: boolean;
  showStateColumn: boolean;
}

const getSizeConfig = (width: number): SizeConfig => {
  if (width < 300) {
    return { fontSize: "xs", iconSize: 12, cellPadding: 2, showSpeedColumns: false, showTimeColumn: false, showStateColumn: false };
  }
  if (width < 500) {
    return { fontSize: "xs", iconSize: 14, cellPadding: 4, showSpeedColumns: false, showTimeColumn: true, showStateColumn: false };
  }
  return { fontSize: "sm", iconSize: 14, cellPadding: 4, showSpeedColumns: true, showTimeColumn: true, showStateColumn: true };
};

const stateColorMap: Record<ExtendedDownloadClientItem["state"], string> = {
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

const progressColor = (state: ExtendedDownloadClientItem["state"], progress: number): string => {
  if (state === "paused") return "yellow";
  if (progress >= 1) return "green";
  return "blue";
};

const rowBgAlpha: Record<ExtendedDownloadClientItem["state"], string | undefined> = {
  failed: "rgba(255, 0, 0, 0.04)",
  paused: "rgba(255, 200, 0, 0.03)",
  downloading: undefined,
  leeching: undefined,
  seeding: undefined,
  completed: undefined,
  processing: undefined,
  queued: undefined,
  stalled: undefined,
  unknown: undefined,
};

interface ContextMenuState {
  x: number;
  y: number;
  item: ExtendedDownloadClientItem;
}

export default function DownloadClientsWidget({
  isEditMode,
  integrationIds,
  options,
  width,
}: WidgetComponentProps<"downloads">) {
  const allInteractAccess = useIntegrationsWithInteractAccess();
  const integrationsWithInteractions = useMemo(
    () => allInteractAccess.flatMap(({ id }) => (integrationIds.includes(id) ? [id] : [])),
    [allInteractAccess, integrationIds],
  );

  const { data: currentItems = [], isFetching, isError } = clientApi.widget.downloads.getJobsAndStatuses.useQuery({
    integrationIds,
    limitPerIntegration: options.limitPerIntegration,
  });

  const t = useScopedI18n("widget.downloads");

  const [clientFilter, setClientFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [showStats, { toggle: toggleStats }] = useDisclosure(false);

  const utils = clientApi.useUtils();
  const mutationOptions = {
    onSettled: () => void utils.widget.downloads.getJobsAndStatuses.invalidate(),
    onError: () => showErrorNotification({ title: t("errors.actionFailed"), message: t("errors.actionFailedMessage") }),
  };
  const { mutate: mutateResumeItem } = clientApi.widget.downloads.resumeItem.useMutation(mutationOptions);
  const { mutate: mutatePauseItem } = clientApi.widget.downloads.pauseItem.useMutation(mutationOptions);
  const { mutate: mutateDeleteItem } = clientApi.widget.downloads.deleteItem.useMutation(mutationOptions);
  const { mutate: mutateResumeQueue } = clientApi.widget.downloads.resume.useMutation(mutationOptions);
  const { mutate: mutatePauseQueue } = clientApi.widget.downloads.pause.useMutation(mutationOptions);

  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<ExtendedDownloadClientItem>>({
    columnAccessor: options.defaultSort,
    direction: options.descendingDefaultSort ? "desc" : "asc",
  });

  const data = useMemo<ExtendedDownloadClientItem[]>(() => {
    return currentItems
      .filter(({ integration }) => integrationIds.includes(integration.id))
      .flatMap((pair) =>
        pair.data.items
          .filter(({ category }) =>
            options.categoryFilter.length === 0 ||
            options.filterIsWhitelist ===
              options.categoryFilter.some((filter) =>
                (Array.isArray(category) ? category : [category]).includes(filter),
              ),
          )
          .filter(({ type, progress, upSpeed }) => {
            if (progress < 1) return true;
            if (type === "torrent") return options.showCompletedTorrent && (upSpeed ?? 0) >= Number(options.activeTorrentThreshold) * 1024;
            if (type === "usenet") return options.showCompletedUsenet;
            return options.showCompletedHttp;
          })
          .filter(({ state }) =>
            (clientFilter.length === 0 || clientFilter.includes(pair.integration.id)) &&
            (statusFilter.length === 0 || statusFilter.includes(state)),
          )
          .map((item): ExtendedDownloadClientItem => {
            const received = item.received ?? Math.floor(item.size * item.progress);
            const ids = [pair.integration.id];
            return {
              integration: pair.integration,
              ...item,
              category: item.category !== undefined && item.category.length > 0 ? item.category : undefined,
              received,
              ratio: item.sent !== undefined && item.size > 0 ? item.sent / item.size : undefined,
              actions: integrationsWithInteractions.includes(pair.integration.id)
                ? {
                    resume: () => mutateResumeItem({ integrationIds: ids, item }),
                    pause: () => mutatePauseItem({ integrationIds: ids, item }),
                    delete: ({ fromDisk }) => mutateDeleteItem({ integrationIds: ids, item, fromDisk }),
                  }
                : undefined,
            };
          }),
      );
  }, [
    currentItems, integrationIds, integrationsWithInteractions,
    mutateDeleteItem, mutatePauseItem, mutateResumeItem,
    options.activeTorrentThreshold, options.categoryFilter, options.filterIsWhitelist,
    options.showCompletedTorrent, options.showCompletedUsenet, options.showCompletedHttp,
    clientFilter, statusFilter,
  ]);

  const sortedData = useMemo(() => {
    const accessor = sortStatus.columnAccessor as keyof ExtendedDownloadClientItem;
    const dir = sortStatus.direction === "desc" ? -1 : 1;
    return [...data].toSorted((a, b) => {
      const aVal = a[accessor] ?? 0;
      const bVal = b[accessor] ?? 0;
      if (accessor === "time") {
        const aTime = (aVal as number) === 0 ? Infinity : (aVal as number);
        const bTime = (bVal as number) === 0 ? Infinity : (bVal as number);
        return (aTime - bTime) * dir;
      }
      if (typeof aVal === "string" && typeof bVal === "string") return aVal.localeCompare(bVal) * dir;
      if (typeof aVal === "number" && typeof bVal === "number") return (aVal - bVal) * dir;
      return 0;
    });
  }, [data, sortStatus]);

  const clients = useMemo<ExtendedClientStatus[]>(() => {
    return currentItems
      .filter(({ integration }) => integrationIds.includes(integration.id))
      .map(({ integration, data: d }): ExtendedClientStatus => {
        const interact = integrationsWithInteractions.includes(integration.id);
        const isTorrent = getIntegrationKindsByCategory("torrent").some((kind) => kind === integration.kind);
        const { totalUp, totalDown } = d.items
          .filter(({ category }) =>
            !options.applyFilterToRatio || !d.status.types.includes("torrent") ||
            options.filterIsWhitelist === options.categoryFilter.some((filter) =>
              (Array.isArray(category) ? category : [category]).includes(filter),
            ),
          )
          .reduce(
            ({ totalUp, totalDown }, { sent, size, progress }) => ({
              totalUp: isTorrent ? (totalUp ?? 0) + (sent ?? 0) : undefined,
              totalDown: totalDown + size * progress,
            }),
            { totalDown: 0, totalUp: isTorrent ? 0 : undefined },
          );
        return {
          integration,
          interact,
          status: { totalUp, totalDown, ratio: totalUp === undefined || totalDown === 0 ? undefined : totalUp / totalDown, ...d.status },
        };
      });
  }, [currentItems, integrationIds, integrationsWithInteractions, options.applyFilterToRatio, options.categoryFilter, options.filterIsWhitelist]);

  const hasTorrents = data.some(({ type }) => type === "torrent");
  const hasMultipleClients = clients.length > 1;
  const hasMultipleTypes = new Set(data.map(({ type }) => type)).size > 1;

  const size = useMemo(() => getSizeConfig(width), [width]);
  const optionsColumnSet = useMemo(() => new Set<string>(options.columns), [options.columns]);

  const shouldIncludeColumn = useCallback(
    (accessor: string): boolean => {
      if (!optionsColumnSet.has(accessor)) return false;
      if ((accessor === "upSpeed" || accessor === "ratio" || accessor === "sent") && !hasTorrents) return false;
      if (accessor === "integration" && !hasMultipleClients) return false;
      if (accessor === "type" && !hasMultipleTypes) return false;
      if ((accessor === "downSpeed" || accessor === "upSpeed") && !size.showSpeedColumns) return false;
      if (accessor === "time" && !size.showTimeColumn) return false;
      if (accessor === "state" && !size.showStateColumn) return false;
      return true;
    },
    [optionsColumnSet, hasTorrents, hasMultipleClients, hasMultipleTypes, size],
  );

  const columns = useMemo((): DataTableColumn<ExtendedDownloadClientItem>[] => {
    const cols: (DataTableColumn<ExtendedDownloadClientItem> | false)[] = [
      shouldIncludeColumn("integration") && {
        accessor: "integration",
        title: "",
        width: 36,
        render: (record) => (
          <Tooltip label={record.integration.name} withArrow>
            <Avatar size={20} radius={0} src={getIconUrl(record.integration.kind)} />
          </Tooltip>
        ),
      },
      shouldIncludeColumn("name") && {
        accessor: "name",
        title: t("items.name.columnTitle"),
        sortable: true,
        ellipsis: true,
        width: "50%",
        render: (record) => (
          <Tooltip
            label={buildHoverTooltip(record, t)}
            multiline
            w={280}
            withArrow
            position="right"
            openDelay={400}
            transitionProps={{ transition: "fade", duration: 150 }}
            color="dark"
          >
            <Group gap={6} wrap="nowrap">
              <Badge size="xs" variant="dot" color={stateColorMap[record.state]} style={{ flexShrink: 0 }} />
              <Text size={size.fontSize} truncate fw={500}>{record.name}</Text>
            </Group>
          </Tooltip>
        ),
      },
      shouldIncludeColumn("progress") && {
        accessor: "progress",
        title: t("items.progress.columnTitle"),
        sortable: true,
        width: width < 400 ? 80 : 120,
        render: (record) => {
          const pct = Math.floor(record.progress * 100);
          const tooltipLabel = [
            `${formatBytes(record.received)} / ${formatBytes(record.size)}`,
            record.downSpeed ? `↓ ${formatByteRate(record.downSpeed)}` : null,
            record.time !== 0 ? `ETA: ${dayjs().add(record.time, "milliseconds").fromNow(true)}` : null,
          ].filter(Boolean).join(" · ");
          return (
            <Tooltip label={tooltipLabel} withArrow openDelay={300} position="top">
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
      shouldIncludeColumn("size") && {
        accessor: "size",
        title: t("items.size.columnTitle"),
        sortable: true,
        width: 80,
        noWrap: true,
        render: (record) => <Text size={size.fontSize}>{formatBytes(record.size)}</Text>,
      },
      shouldIncludeColumn("downSpeed") && {
        accessor: "downSpeed",
        title: t("items.downSpeed.columnTitle"),
        sortable: true,
        width: 90,
        noWrap: true,
        render: (record) => record.downSpeed ? (
          <Group gap={4} wrap="nowrap">
            <IconDownload size={12} style={{ flexShrink: 0, opacity: 0.5 }} />
            <Text size={size.fontSize} c="blue">{formatByteRate(record.downSpeed)}</Text>
          </Group>
        ) : null,
      },
      shouldIncludeColumn("upSpeed") && {
        accessor: "upSpeed",
        title: t("items.upSpeed.columnTitle"),
        sortable: true,
        width: 90,
        noWrap: true,
        render: (record) => record.upSpeed ? (
          <Group gap={4} wrap="nowrap">
            <IconUpload size={12} style={{ flexShrink: 0, opacity: 0.5 }} />
            <Text size={size.fontSize} c="green">{formatByteRate(record.upSpeed)}</Text>
          </Group>
        ) : null,
      },
      shouldIncludeColumn("time") && {
        accessor: "time",
        title: t("items.time.columnTitle"),
        sortable: true,
        width: 100,
        noWrap: true,
        render: (record) => {
          if (record.time === 0) return <Text size={size.fontSize} c="dimmed">∞</Text>;
          return <Text size={size.fontSize}>{dayjs().add(record.time).fromNow(true)}</Text>;
        },
      },
      shouldIncludeColumn("state") && {
        accessor: "state",
        title: t("items.state.columnTitle"),
        width: 90,
        render: (record) => (
          <Badge size="xs" variant="light" color={stateColorMap[record.state]}>
            {t(`states.${record.state}`)}
          </Badge>
        ),
      },
      shouldIncludeColumn("added") && {
        accessor: "added",
        title: t("items.added.columnTitle"),
        sortable: true,
        width: 90,
        noWrap: true,
        render: (record) => <Text size={size.fontSize}>{record.added ? dayjs(record.added).fromNow() : "—"}</Text>,
      },
      shouldIncludeColumn("ratio") && {
        accessor: "ratio",
        title: t("items.ratio.columnTitle"),
        sortable: true,
        width: 60,
        render: (record) => record.ratio !== undefined ? (
          <Text size={size.fontSize}>{record.ratio.toFixed(record.ratio >= 100 ? 0 : record.ratio >= 10 ? 1 : 2)}</Text>
        ) : null,
      },
      shouldIncludeColumn("received") && {
        accessor: "received",
        title: t("items.received.columnTitle"),
        sortable: true,
        width: 80,
        noWrap: true,
        render: (record) => <Text size={size.fontSize}>{formatBytes(record.received)}</Text>,
      },
      shouldIncludeColumn("sent") && {
        accessor: "sent",
        title: t("items.sent.columnTitle"),
        sortable: true,
        width: 80,
        noWrap: true,
        render: (record) => record.sent ? <Text size={size.fontSize}>{formatBytes(record.sent)}</Text> : null,
      },
      shouldIncludeColumn("category") && {
        accessor: "category",
        title: t("items.category.columnTitle"),
        width: 80,
        ellipsis: true,
        render: (record) => record.category ? (
          <Text size={size.fontSize} truncate>
            {Array.isArray(record.category) ? record.category.join(", ") : record.category}
          </Text>
        ) : null,
      },
      shouldIncludeColumn("index") && {
        accessor: "index",
        title: t("items.index.columnTitle"),
        sortable: true,
        width: 40,
        render: (record) => <Text size={size.fontSize}>{record.index}</Text>,
      },
      shouldIncludeColumn("type") && {
        accessor: "type",
        title: t("items.type.columnTitle"),
        sortable: true,
        width: 70,
        render: (record) => <Text size={size.fontSize} tt="capitalize">{record.type}</Text>,
      },
    ];
    return cols.filter(Boolean) as DataTableColumn<ExtendedDownloadClientItem>[];
  }, [shouldIncludeColumn, t, size, width]);

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
    return traffic.down > 0 ? traffic.up / traffic.down : 0;
  }, [clients]);

  const availableStatuses = useMemo(() => {
    return [...new Set(data.map(({ state }) => state))];
  }, [data]);

  const queueStats = useMemo(() => {
    const stateCounts: Record<string, number> = {};
    let totalSize = 0;
    let completedSize = 0;
    for (const item of data) {
      stateCounts[item.state] = (stateCounts[item.state] ?? 0) + 1;
      totalSize += item.size;
      completedSize += item.received ?? item.size * item.progress;
    }
    return { stateCounts, totalSize, completedSize, totalItems: data.length };
  }, [data]);

  if (options.columns.length === 0) {
    return (
      <Center h="100%">
        <Text>{t("errors.noColumns")}</Text>
      </Center>
    );
  }

  if (isError && currentItems.length === 0) {
    return (
      <Center h="100%">
        <Text c="red">{t("errors.noCommunications")}</Text>
      </Center>
    );
  }

  return (
    <Stack gap={0} h="100%" style={{ overflow: "hidden" }}>
      {showStats && (
        <GlobalStatsBar
          queueStats={queueStats}
          totalSpeed={totalSpeed}
          totalUpSpeed={totalUpSpeed}
          globalRatio={globalRatio}
          hasTorrents={hasTorrents}
          clients={clients}
        />
      )}

      <Box style={{ flex: 1, minHeight: 0, position: "relative" }}>
        <DataTable
          style={{ pointerEvents: isEditMode ? "none" : undefined }}
          withTableBorder={false}
          borderRadius={0}
          highlightOnHover
          striped="odd"
          stripedColor={{ dark: "dark.7", light: "gray.0" }}
          highlightOnHoverColor={{ dark: "dark.5", light: "gray.1" }}
          verticalAlign="center"
          fetching={isFetching && currentItems.length === 0}
          loaderBackgroundBlur={2}
          fz={size.fontSize}
          records={sortedData}
          columns={columns}
          textSelectionDisabled
          sortStatus={sortStatus}
          onSortStatusChange={setSortStatus}
          noRecordsText={t("errors.noItems")}
          idAccessor={(record) => `${record.integration.id}:${record.id}`}
          height="100%"
          className="downloads-table"
          defaultColumnProps={{
            noWrap: true,
            cellsStyle: () => ({ padding: `${size.cellPadding}px 8px` }),
          }}
          scrollAreaProps={{ type: "auto", scrollbarSize: 6 }}
          customRowAttributes={(_, index) => ({ "data-row-index": index })}
          onRowContextMenu={isEditMode ? undefined : handleContextMenu}
          rowBackgroundColor={(record) => rowBgAlpha[record.state] as string | undefined}
          rowExpansion={{
            trigger: "click",
            allowMultiple: true,
            collapseProps: {
              transitionDuration: 200,
              animateOpacity: true,
              transitionTimingFunction: "ease-out",
            },
            content: ({ record, collapse }) => <ExpandedRow item={record} collapse={collapse} />,
          }}
          onScroll={() => {
            if (contextMenu) closeContextMenu();
          }}
        />
      </Box>

      <WidgetFooter
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
        itemCount={sortedData.length}
        showStats={showStats}
        toggleStats={toggleStats}
      />

      {contextMenu && (
        <RowContextMenu
          state={contextMenu}
          onClose={closeContextMenu}
          t={t}
        />
      )}
    </Stack>
  );
}

function buildHoverTooltip(
  record: ExtendedDownloadClientItem,
  t: ReturnType<typeof useScopedI18n<"widget.downloads">>,
): React.ReactNode {
  const lines: { label: string; value: string }[] = [
    { label: t("items.size.detailsTitle"), value: `${formatBytes(record.received)} / ${formatBytes(record.size)}` },
    { label: t("items.state.detailsTitle"), value: t(`states.${record.state}`) },
  ];

  if (record.downSpeed) {
    lines.push({ label: t("items.downSpeed.detailsTitle"), value: formatByteRate(record.downSpeed) });
  }
  if (record.upSpeed) {
    lines.push({ label: t("items.upSpeed.detailsTitle"), value: formatByteRate(record.upSpeed) });
  }
  if (record.time !== 0) {
    lines.push({ label: "ETA", value: dayjs().add(record.time, "milliseconds").fromNow() });
  }
  if (record.ratio !== undefined) {
    lines.push({ label: t("items.ratio.detailsTitle"), value: record.ratio.toFixed(2) });
  }
  if (record.category) {
    lines.push({
      label: t("items.category.detailsTitle"),
      value: Array.isArray(record.category) ? record.category.join(", ") : record.category,
    });
  }

  return (
    <Stack gap={2}>
      <Text size="xs" fw={600} style={{ wordBreak: "break-all" }}>{record.name}</Text>
      <Divider my={2} />
      {lines.map(({ label, value }) => (
        <Group key={label} gap={4} justify="space-between">
          <Text size="xs" c="dimmed">{label}</Text>
          <Text size="xs" fw={500}>{value}</Text>
        </Group>
      ))}
    </Stack>
  );
}

function ExpandedRow({ item, collapse }: { item: ExtendedDownloadClientItem; collapse: () => void }) {
  const t = useScopedI18n("widget.downloads");

  const progressPercent = Math.floor(item.progress * 100);

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

        <Stack gap={4} style={{ flex: 1 }}>
          <Group gap="xs" wrap="nowrap">
            <Avatar size={16} radius={0} src={getIconUrl(item.integration.kind)} />
            <Text size="xs" fw={600} truncate>{item.name}</Text>
            <Badge size="xs" variant="light" color={stateColorMap[item.state]} ml="auto" style={{ flexShrink: 0 }}>
              {t(`states.${item.state}`)}
            </Badge>
          </Group>

          <SimpleGrid cols={3} spacing={4} verticalSpacing={2}>
            <DetailPair label={t("items.size.detailsTitle")} value={`${formatBytes(item.received)} / ${formatBytes(item.size)}`} />
            {item.downSpeed !== undefined && item.downSpeed > 0 && (
              <DetailPair label={t("items.downSpeed.detailsTitle")} value={formatByteRate(item.downSpeed)} icon={<IconDownload size={10} />} color="blue" />
            )}
            {item.upSpeed !== undefined && item.upSpeed > 0 && (
              <DetailPair label={t("items.upSpeed.detailsTitle")} value={formatByteRate(item.upSpeed)} icon={<IconUpload size={10} />} color="green" />
            )}
            {item.ratio !== undefined && <DetailPair label={t("items.ratio.detailsTitle")} value={item.ratio.toFixed(2)} />}
            <DetailPair
              label={t("items.time.detailsTitle")}
              value={item.time !== 0 ? dayjs().add(item.time, "milliseconds").fromNow() : "∞"}
            />
            {item.sent !== undefined && <DetailPair label={t("items.sent.detailsTitle")} value={formatBytes(item.sent)} />}
            {item.added !== undefined && <DetailPair label={t("items.added.detailsTitle")} value={dayjs(item.added).format("YYYY-MM-DD HH:mm")} />}
            {item.category && (
              <DetailPair
                label={t("items.category.detailsTitle")}
                value={Array.isArray(item.category) ? item.category.join(", ") : item.category}
              />
            )}
            <DetailPair label="ID" value={item.id} />
          </SimpleGrid>
        </Stack>
      </Group>
    </Box>
  );
}

function DetailPair({ label, value, icon, color }: { label: string; value: string; icon?: React.ReactNode; color?: string }) {
  return (
    <Group gap={4} wrap="nowrap">
      <Text size="xs" c="dimmed" style={{ whiteSpace: "nowrap", fontSize: 10 }}>{label}:</Text>
      <Group gap={2} wrap="nowrap">
        {icon}
        <Text size="xs" fw={500} c={color} truncate style={{ fontSize: 10 }}>{value}</Text>
      </Group>
    </Group>
  );
}

function GlobalStatsBar({
  queueStats,
  totalSpeed,
  totalUpSpeed,
  globalRatio,
  hasTorrents,
  clients,
}: {
  queueStats: { stateCounts: Record<string, number>; totalSize: number; completedSize: number; totalItems: number };
  totalSpeed: number;
  totalUpSpeed: number;
  globalRatio: number;
  hasTorrents: boolean;
  clients: ExtendedClientStatus[];
}) {
  const t = useScopedI18n("widget.downloads");
  const overallProgress = queueStats.totalSize > 0 ? queueStats.completedSize / queueStats.totalSize : 0;

  return (
    <Box px={8} py={6} style={{ borderBottom: "1px solid var(--mantine-color-default-border)" }}>
      <Group justify="space-between" gap="xs">
        <Group gap="md">
          <Tooltip label={t("stats.overallProgress")} withArrow>
            <Group gap={4}>
              <Progress value={Math.floor(overallProgress * 100)} color="blue" size="xs" w={40} />
              <Text size="xs" fw={600}>{`${Math.floor(overallProgress * 100)}%`}</Text>
            </Group>
          </Tooltip>

          <Tooltip label={t("stats.totalSize")} withArrow>
            <Group gap={4}>
              <IconDatabase size={12} style={{ opacity: 0.6 }} />
              <Text size="xs">{`${formatBytes(queueStats.completedSize)} / ${formatBytes(queueStats.totalSize)}`}</Text>
            </Group>
          </Tooltip>
        </Group>

        <Group gap="md">
          <Group gap={4}>
            <IconDownload size={12} style={{ opacity: 0.6 }} />
            <Text size="xs" fw={600} c="blue">{formatByteRate(totalSpeed)}</Text>
          </Group>
          {totalUpSpeed > 0 && (
            <Group gap={4}>
              <IconUpload size={12} style={{ opacity: 0.6 }} />
              <Text size="xs" fw={600} c="green">{formatByteRate(totalUpSpeed)}</Text>
            </Group>
          )}
          {hasTorrents && globalRatio > 0 && (
            <Text size="xs" c="dimmed">{`${t("globalRatio")}: ${globalRatio.toFixed(2)}`}</Text>
          )}
        </Group>

        <Group gap={6}>
          {Object.entries(queueStats.stateCounts).map(([state, count]) => (
            <Tooltip key={state} label={t(`states.${state as ExtendedDownloadClientItem["state"]}`)} withArrow>
              <Badge size="xs" variant="dot" color={stateColorMap[state as ExtendedDownloadClientItem["state"]]}>
                {count}
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

function RowContextMenu({ state, onClose, t }: {
  state: ContextMenuState;
  onClose: () => void;
  t: ReturnType<typeof useScopedI18n<"widget.downloads">>;
}) {
  const { item } = state;
  const isPaused = item.state === "paused";
  const hasActions = !!item.actions;
  const [showDeleteConfirm, { open: openDelete }] = useDisclosure(false);

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
        onContextMenu={(e) => { e.preventDefault(); onClose(); }}
      >
        <Menu opened shadow="md" position="bottom-start" withinPortal={false} onClose={onClose} closeOnItemClick={false}>
          <Menu.Target>
            <Box pos="fixed" style={{ left: state.x, top: state.y, width: 1, height: 1 }} />
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>{item.name.length > 40 ? `${item.name.slice(0, 40)}…` : item.name}</Menu.Label>

            <Menu.Item
              leftSection={<IconInfoCircle size={14} />}
              onClick={() => { navigator.clipboard.writeText(item.name); onClose(); }}
            >
              {t("contextMenu.copyName")}
            </Menu.Item>

            {item.id && (
              <Menu.Item
                leftSection={<IconCopy size={14} />}
                onClick={() => { navigator.clipboard.writeText(item.id); onClose(); }}
              >
                {t("contextMenu.copyId")}
              </Menu.Item>
            )}

            {hasActions && (
              <>
                <Menu.Divider />
                <Menu.Item
                  leftSection={isPaused ? <IconPlayerPlay size={14} /> : <IconPlayerPause size={14} />}
                  onClick={() => { (isPaused ? item.actions?.resume : item.actions?.pause)?.(); onClose(); }}
                >
                  {t(`actions.item.${isPaused ? "resume" : "pause"}`)}
                </Menu.Item>

                {!showDeleteConfirm ? (
                  <Menu.Item
                    color="red"
                    leftSection={<IconTrash size={14} />}
                    onClick={(e) => { e.stopPropagation(); openDelete(); }}
                  >
                    {t("actions.item.delete.title")}
                  </Menu.Item>
                ) : (
                  <>
                    <Menu.Item
                      color="red"
                      leftSection={<IconTrash size={14} />}
                      onClick={() => { item.actions?.delete({ fromDisk: false }); onClose(); }}
                    >
                      {t("actions.item.delete.entry")}
                    </Menu.Item>
                    <Menu.Item
                      color="red"
                      leftSection={<IconTrashX size={14} />}
                      onClick={() => { item.actions?.delete({ fromDisk: true }); onClose(); }}
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
  itemCount: number;
  showStats: boolean;
  toggleStats: () => void;
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
  itemCount,
  showStats,
  toggleStats,
}: WidgetFooterProps) {
  const t = useScopedI18n("widget.downloads");
  const [filterOpen, { toggle: toggleFilter }] = useDisclosure(false);
  const someInteract = clients.some(({ interact }) => interact);
  const hasActiveFilter = clientFilter.length > 0 || statusFilter.length > 0;

  const integrationsStatuses = clients.reduce(
    (acc, { status, integration: { id }, interact }) =>
      status && interact ? (acc[status.paused ? "paused" : "active"].push(id), acc) : acc,
    { paused: [] as string[], active: [] as string[] },
  );

  return (
    <Box style={{ borderTop: "1px solid var(--mantine-color-default-border)" }}>
      {filterOpen && (
        <Box px={8} py={6} style={{ borderBottom: "1px solid var(--mantine-color-default-border)" }}>
          <Stack gap={6}>
            {clients.length > 1 && (
              <Group gap={4}>
                <Text size="xs" fw={600} w={50}>{t("items.integration.columnTitle")}:</Text>
                <Group gap={4}>
                  {clients.map(({ integration }) => {
                    const active = clientFilter.includes(integration.id);
                    return (
                      <UnstyledButton
                        key={integration.id}
                        onClick={() =>
                          setClientFilter(active ? clientFilter.filter((id) => id !== integration.id) : [...clientFilter, integration.id])
                        }
                      >
                        <Badge
                          size="xs"
                          variant={active ? "filled" : "light"}
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
                <Text size="xs" fw={600} w={50}>{t("items.state.columnTitle")}:</Text>
                <Group gap={4}>
                  {availableStatuses.map((status) => {
                    const active = statusFilter.includes(status);
                    return (
                      <UnstyledButton
                        key={status}
                        onClick={() =>
                          setStatusFilter(active ? statusFilter.filter((s) => s !== status) : [...statusFilter, status])
                        }
                      >
                        <Badge size="xs" variant={active ? "filled" : "light"} color={stateColorMap[status]}>
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
          <Tooltip label={hasActiveFilter ? t("contextMenu.clearFilters") : t("footer.filter")}>
            <ActionIcon
              size="xs"
              variant={hasActiveFilter ? "filled" : "subtle"}
              onClick={() => {
                if (hasActiveFilter && !filterOpen) {
                  setClientFilter([]);
                  setStatusFilter([]);
                } else {
                  toggleFilter();
                }
              }}
            >
              {hasActiveFilter ? <IconFilterOff size={14} /> : <IconFilter size={14} />}
            </ActionIcon>
          </Tooltip>

          <Tooltip label={showStats ? t("stats.hide") : t("stats.show")}>
            <ActionIcon
              size="xs"
              variant={showStats ? "filled" : "subtle"}
              onClick={toggleStats}
            >
              {showStats ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
            </ActionIcon>
          </Tooltip>

          <Group gap={2}>
            {clients.map(({ integration }) => (
              <ClientIndicator key={integration.id} integration={integration} />
            ))}
          </Group>
        </Group>

        <Group gap={8}>
          {hasTorrents && globalRatio > 0 && (
            <Text size="xs" c="dimmed">{`${t("globalRatio")}: ${globalRatio.toFixed(2)}`}</Text>
          )}

          <Group gap={4}>
            {someInteract && (
              <Tooltip label={t("actions.clients.resume")}>
                <ActionIcon
                  size="xs"
                  variant="subtle"
                  color="green"
                  disabled={integrationsStatuses.paused.length === 0}
                  onClick={() => resumeQueue({ integrationIds: integrationsStatuses.paused })}
                >
                  <IconPlayerPlay size={14} />
                </ActionIcon>
              </Tooltip>
            )}

            <Group gap={2}>
              <Text size="xs" fw={600} c="blue">
                <IconDownload size={10} style={{ verticalAlign: "middle", marginRight: 2 }} />
                {formatByteRate(totalSpeed)}
              </Text>
              {totalUpSpeed > 0 && (
                <Text size="xs" fw={600} c="green">
                  <IconUpload size={10} style={{ verticalAlign: "middle", marginRight: 2 }} />
                  {formatByteRate(totalUpSpeed)}
                </Text>
              )}
            </Group>

            {someInteract && (
              <Tooltip label={t("actions.clients.pause")}>
                <ActionIcon
                  size="xs"
                  variant="subtle"
                  color="red"
                  disabled={integrationsStatuses.active.length === 0}
                  onClick={() => pauseQueue({ integrationIds: integrationsStatuses.active })}
                >
                  <IconPlayerPause size={14} />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>

          <Badge size="xs" variant="light" color="gray" circle>{itemCount}</Badge>
        </Group>
      </Group>
    </Box>
  );
}

function ClientIndicator({ integration }: { integration: ExtendedClientStatus["integration"] }) {
  const isConnected = useIntegrationConnected(integration.updatedAt, { timeout: 30000 });
  return (
    <Tooltip label={`${integration.name}${isConnected ? "" : " (disconnected)"}`}>
      <Avatar
        size={18}
        radius={0}
        src={getIconUrl(integration.kind)}
        style={{ filter: isConnected ? undefined : "grayscale(100%)", opacity: isConnected ? 1 : 0.5 }}
      />
    </Tooltip>
  );
}
