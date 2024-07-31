"use client";

import "../widgets-common.css";

import { useMemo, useState } from "react";
import type { MantineStyleProp } from "@mantine/core";
import {
  ActionIcon,
  Avatar,
  AvatarGroup,
  Button,
  Center,
  Divider,
  Group,
  Modal,
  Paper,
  Progress,
  Space,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { useDisclosure, useListState } from "@mantine/hooks";
import {
  IconAlertTriangle,
  IconCirclesRelation,
  IconInfinity,
  IconInfoCircle,
  IconPlayerPause,
  IconPlayerPlay,
  IconTrash,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import type { MRT_ColumnDef, MRT_VisibilityState } from "mantine-react-table";
import { MantineReactTable, useMantineReactTable } from "mantine-react-table";

import { clientApi } from "@homarr/api/client";
import { humanFileSize } from "@homarr/common";
import { getIconUrl } from "@homarr/definitions";
import type {
  DownloadClientData,
  ExtendedClientStatus,
  ExtendedDownloadClientItem,
  SanitizedIntegration,
} from "@homarr/integrations";
import { useScopedI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";

//TODO:
// - NzbGet API not working I think
// - Data Subscription permission issues                    <- Need help
// - table tbody hide under thead and keep transparency     <- Need help
// - Add integrations to shouldHide options                 <- Potential help needed
// - default sorting option                                 <- but I don't wannaaaaa....
// - Move columns ratio table to css vars
// - tests maybe?
// - Unexpected value xxxxx parsing width/height attribute  <- Need help (Actually impacts all widgets using cq and var sizes...), Not critical

//Ratio table for relative width between columns
const columnsRatios: Record<keyof ExtendedDownloadClientItem, number> = {
  actions: 2,
  added: 4,
  category: 1,
  downSpeed: 3,
  id: 1,
  index: 1,
  integration: 1,
  name: 8,
  progress: 4,
  ratio: 2,
  received: 3,
  sent: 3,
  size: 3,
  state: 3,
  time: 4,
  type: 2,
  upSpeed: 3,
};

export default function DownloadClientsWidget({
  isEditMode,
  integrationIds,
  options,
  serverData,
  setOptions,
}: WidgetComponentProps<"downloads">) {
  const [currentItems, currentItemsHandlers] = useListState<{
    integration: SanitizedIntegration;
    data: DownloadClientData;
  }>(serverData?.initialData.data ?? []);

  //Translations
  const t = useScopedI18n("widget.downloads");
  const tCommon = useScopedI18n("common");
  const noIntegrationError = useScopedI18n("integration.permission")("use");
  //Item modal state and selection
  const [clickedIndex, setClickedIndex] = useState<number>(0);
  const [opened, { open, close }] = useDisclosure(false);

  if (integrationIds.length === 0)
    return (
      <Center h="100%">
        <Text fz="7.5cqw">{noIntegrationError}</Text>
      </Center>
    );

  if (options.columns.length === 0)
    return (
      <Center h="100%">
        <Text fz="7.5cqw">{t("errors.noColumns")}</Text>
      </Center>
    );

  //Get API mutation functions
  const { mutate: mutateResumeItem } = clientApi.widget.downloads.resumeItem.useMutation();
  const { mutate: mutatePauseItem } = clientApi.widget.downloads.pauseItem.useMutation();
  const { mutate: mutateDeleteItem } = clientApi.widget.downloads.deleteItem.useMutation();

  //Subrscribe to dynamic data changes
  clientApi.widget.downloads.subscribeToData.useSubscription(
    {
      integrationIds,
    },
    {
      onData: (data) => {
        currentItemsHandlers.applyWhere(
          (pair) => pair.integration.id === data.integration.id,
          (pair) => {
            return {
              ...pair,
              data: data.data,
            };
          },
        );
      },
    },
  );

  //Flatten Data array for which each element has it's integration, data (base + calculated) and actions. Memoized on data subscription
  const data = useMemo<ExtendedDownloadClientItem[]>(
    () =>
      currentItems
        .filter(({ integration }) => integrationIds.includes(integration.id))
        .flatMap((pair) =>
          pair.data.items
            .filter(
              ({ category }) =>
                options.filterIsWhitelist ===
                options.categoryFilter.some((filter) =>
                  (Array.isArray(category) ? category : [category]).includes(filter),
                ),
            )
            .filter(
              ({ type, progress, upSpeed }) =>
                (type === "torrent" &&
                  ((progress === 1 &&
                    options.showCompletedTorrent &&
                    (upSpeed ?? 0) >= Number(options.activeTorrentThreshold) * 1024) ||
                    progress !== 1)) ||
                (type === "usenet" && ((progress === 1 && options.showCompletedUsenet) || progress !== 1)),
            )
            .map((item): ExtendedDownloadClientItem => {
              const received = Math.floor(item.size * item.progress);
              return {
                integration: pair.integration,
                ...item,
                category: item.category !== undefined && item.category.length > 0 ? item.category : undefined,
                received,
                ratio: item.sent !== undefined ? item.sent / received : undefined,
                actions: {
                  resume: () => mutateResumeItem({ integrationIds: [pair.integration.id], item }),
                  pause: () => mutatePauseItem({ integrationIds: [pair.integration.id], item }),
                  delete: ({ fromDisk }) => mutateDeleteItem({ integrationIds: [pair.integration.id], item, fromDisk }),
                },
              };
            }),
        ),
    [currentItems, integrationIds, options],
  );

  //Flatten Clients Array for which each elements has the integration and general client infos.
  const clients = useMemo<ExtendedClientStatus[]>(
    () =>
      currentItems
        .filter(({ integration }) => integrationIds.includes(integration.id))
        .flatMap((pair): ExtendedClientStatus => {
          const isTorrent = ["qBittorrent", "deluge", "transmission"].includes(pair.integration.kind);
          /** Derived from current items */
          const { totalUp, totalDown } = pair.data.items
            .filter(
              ({ category }) =>
                !options.applyFilterToRatio ||
                pair.data.status.type !== "torrent" ||
                options.filterIsWhitelist ===
                  options.categoryFilter.some((filter) =>
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
            integration: pair.integration,
            totalUp,
            totalDown,
            ratio: totalUp === undefined ? undefined : totalUp / totalDown,
            ...pair.data.status,
          };
        })
        .sort(({ type: typeA }, { type: typeB }) => typeA.length - typeB.length),
    [currentItems, integrationIds, options],
  );

  //Check existing types between torrents and usenet
  const integrationTypes: string[] = [];
  if (data.some(({ type }) => type === "torrent")) integrationTypes.push("torrent");
  if (data.some(({ type }) => type === "usenet")) integrationTypes.push("usenet");

  //Set the visibility of columns depending on widget settings and available data.
  const columnVisibility: MRT_VisibilityState = {
    id: options.columns.includes("id"),
    actions: options.columns.includes("actions"),
    added: options.columns.includes("added"),
    category: options.columns.includes("category"),
    downSpeed: options.columns.includes("downSpeed"),
    index: options.columns.includes("index"),
    integration: options.columns.includes("integration") && clients.length > 1,
    name: options.columns.includes("name"),
    progress: options.columns.includes("progress"),
    ratio: options.columns.includes("ratio") && integrationTypes.includes("torrent"),
    received: options.columns.includes("received"),
    sent: options.columns.includes("sent") && integrationTypes.includes("torrent"),
    size: options.columns.includes("size"),
    state: options.columns.includes("state"),
    time: options.columns.includes("time"),
    type: options.columns.includes("type") && integrationTypes.length > 1,
    upSpeed: options.columns.includes("upSpeed") && integrationTypes.includes("torrent"),
  } satisfies Record<keyof ExtendedDownloadClientItem, boolean>;

  //Set a relative width using ratio table
  const totalWidth = options.columns.reduce(
    (count: number, column) => (columnVisibility[column] ? count + columnsRatios[column] : count),
    0, //<-- out of table spacing value
  );

  //Default styling behavior for stopping interaction when editing. (Applied everywhere except the table header)
  const editStyle: MantineStyleProp = {
    pointerEvents: isEditMode ? "none" : undefined,
  };

  //General style sizing as vars
  const baseStyle: MantineStyleProp = {
    "--totalWidth": totalWidth,
    "--ratioWidth": "calc(100cqw / var(--totalWidth))",
    "--text-fz": "calc(var(--ratioWidth) * 0.45)",
    "--button-fz": "calc(var(--ratioWidth)* 0.6)",
    "--mrt-base-background-color": "transparent",
  };

  //Base element in common with all columns
  const columnsDefBase = ({
    key,
    showHeader,
    align,
  }: {
    key: keyof ExtendedDownloadClientItem;
    showHeader: boolean;
    align?: "center" | "left" | "right" | "justify" | "char";
  }): MRT_ColumnDef<ExtendedDownloadClientItem> => {
    const style: MantineStyleProp = {
      minWidth: 0,
      width: "var(--width)",
      height: "var(--ratioWidth)",
      padding: "calc(var(--ratioWidth) * 0.2)",
      transition: "unset",
      "--keyWidth": columnsRatios[key],
      "--width": "calc((var(--keyWidth)/var(--totalWidth) * 100cqw))",
      align: "center",
    };
    return {
      id: key,
      accessorKey: key,
      header: key,
      size: columnsRatios[key],
      mantineTableBodyCellProps: { style, align },
      mantineTableHeadCellProps: {
        style: { ...style, "--mrt-base-background-color": "var(--background-color)" },
        align,
      },
      Header: () => (showHeader && !isEditMode ? <Text fw={700}>{t(`items.${key}.columnTitle`)}</Text> : ""),
    };
  };

  //Make columns and cell elements, Memoized to data with deps on data and EditMode
  const columns = useMemo<MRT_ColumnDef<ExtendedDownloadClientItem>[]>(
    () => [
      {
        ...columnsDefBase({ key: "actions", showHeader: false, align: "center" }),
        enableSorting: false,
        Cell: ({ cell, row }) => {
          const actions = cell.getValue<ExtendedDownloadClientItem["actions"]>();
          const isPaused = row.original.state === "paused";
          const [opened, { open, close }] = useDisclosure(false);
          return (
            <Group wrap="nowrap" gap="calc(var(--ratioWidth)*0.1)">
              <Tooltip label={t(`actions.item.${isPaused ? "resume" : "pause"}`)}>
                <ActionIcon
                  variant="light"
                  radius={999}
                  onClick={isPaused ? actions.resume : actions.pause}
                  size="calc(var(--ratioWidth)*0.75)"
                >
                  {isPaused ? (
                    <IconPlayerPlay size="calc(var(--ratioWidth)*0.5)" />
                  ) : (
                    <IconPlayerPause size="calc(var(--ratioWidth)*0.5)" />
                  )}
                </ActionIcon>
              </Tooltip>
              <Modal opened={opened} onClose={close} title={t("actions.item.delete.modalTitle")} size="auto" centered>
                <Group>
                  <Button
                    color="red"
                    onClick={() => {
                      close();
                      actions.delete({ fromDisk: false });
                    }}
                  >
                    {t("actions.item.delete.entry")}
                  </Button>
                  <Button
                    color="red"
                    onClick={() => {
                      close();
                      actions.delete({ fromDisk: true });
                    }}
                    leftSection={<IconAlertTriangle />}
                  >
                    {t("actions.item.delete.entryAndFiles")}
                  </Button>
                  <Button color="green" onClick={close}>
                    {tCommon("action.cancel")}
                  </Button>
                </Group>
              </Modal>
              <Tooltip label={t("actions.item.delete.title")}>
                <ActionIcon color="red" radius={999} onClick={open} size="calc(var(--ratioWidth)*0.75)">
                  <IconTrash size="calc(var(--ratioWidth)*0.5)" />
                </ActionIcon>
              </Tooltip>
            </Group>
          );
        },
      },
      {
        ...columnsDefBase({ key: "added", showHeader: true, align: "center" }),
        sortUndefined: "last",
        Cell: ({ cell }) => {
          const added = cell.getValue<ExtendedDownloadClientItem["added"]>();
          return <Text>{added !== undefined ? dayjs(added).fromNow() : "unknown"}</Text>;
        },
      },
      {
        ...columnsDefBase({ key: "category", showHeader: false, align: "center" }),
        sortUndefined: "last",
        Cell: ({ cell }) => {
          const category = cell.getValue<ExtendedDownloadClientItem["category"]>();
          return (
            category !== undefined && (
              <Tooltip label={category}>
                <IconInfoCircle />
              </Tooltip>
            )
          );
        },
      },
      {
        ...columnsDefBase({ key: "downSpeed", showHeader: true, align: "right" }),
        sortUndefined: "last",
        Cell: ({ cell }) => {
          const downSpeed = cell.getValue<ExtendedDownloadClientItem["downSpeed"]>();
          return <Text>{downSpeed !== undefined && humanFileSize(downSpeed)?.toString().concat("/s")}</Text>;
        },
      },
      {
        ...columnsDefBase({ key: "id", showHeader: false }),
        enableSorting: false,
        Cell: ({ cell }) => {
          const id = cell.getValue<ExtendedDownloadClientItem["id"]>();
          return (
            <Tooltip label={id}>
              <IconCirclesRelation />
            </Tooltip>
          );
        },
      },
      {
        ...columnsDefBase({ key: "index", showHeader: true, align: "center" }),
        Cell: ({ cell }) => {
          const index = cell.getValue<ExtendedDownloadClientItem["index"]>();
          return <Text>{index}</Text>;
        },
      },
      {
        ...columnsDefBase({ key: "integration", showHeader: false, align: "center" }),
        Cell: ({ cell }) => {
          const integration = cell.getValue<ExtendedDownloadClientItem["integration"]>();
          return (
            <Tooltip label={integration.name}>
              <Avatar size="calc(var(--ratioWidth)*0.6)" radius={0} src={getIconUrl(integration.kind)} />
            </Tooltip>
          );
        },
      },
      {
        ...columnsDefBase({ key: "name", showHeader: true }),
        Cell: ({ cell }) => {
          const name = cell.getValue<ExtendedDownloadClientItem["name"]>();
          return (
            <Text lineClamp={1} style={{ wordBreak: "break-all" }}>
              {name}
            </Text>
          );
        },
      },
      {
        ...columnsDefBase({ key: "progress", showHeader: true, align: "center" }),
        Cell: ({ cell, row }) => {
          const progress = cell.getValue<ExtendedDownloadClientItem["progress"]>();
          return (
            <Stack w="100%" gap={0} align="center" pt="calc(var(--ratioWidth)*0.1)">
              <Text lh="calc(var(--ratioWidth)*0.35)">
                {new Intl.NumberFormat("en", { style: "percent", notation: "compact", unitDisplay: "narrow" }).format(
                  progress,
                )}
              </Text>
              <Progress
                h="calc(var(--ratioWidth)*0.25)"
                w="100%"
                value={progress * 100}
                color={row.original.state === "paused" ? "yellow" : progress === 1 ? "green" : "blue"}
                radius={999}
              />
            </Stack>
          );
        },
      },
      {
        ...columnsDefBase({ key: "ratio", showHeader: true, align: "center" }),
        sortUndefined: "last",
        Cell: ({ cell }) => {
          const ratio = cell.getValue<ExtendedDownloadClientItem["ratio"]>();
          return ratio !== undefined && <Text>{ratio.toFixed(ratio >= 100 ? 0 : ratio >= 10 ? 1 : 2)}</Text>;
        },
      },
      {
        ...columnsDefBase({ key: "received", showHeader: true, align: "right" }),
        Cell: ({ cell }) => {
          const received = cell.getValue<ExtendedDownloadClientItem["received"]>();
          return <Text>{humanFileSize(received)}</Text>;
        },
      },
      {
        ...columnsDefBase({ key: "sent", showHeader: true, align: "right" }),
        sortUndefined: "last",
        Cell: ({ cell }) => {
          const sent = cell.getValue<ExtendedDownloadClientItem["sent"]>();
          return sent !== undefined && <Text>{humanFileSize(sent)}</Text>;
        },
      },
      {
        ...columnsDefBase({ key: "size", showHeader: true, align: "right" }),
        Cell: ({ cell }) => {
          const size = cell.getValue<ExtendedDownloadClientItem["size"]>();
          return <Text>{humanFileSize(size)}</Text>;
        },
      },
      {
        ...columnsDefBase({ key: "state", showHeader: true }),
        enableSorting: false,
        Cell: ({ cell }) => {
          const state = cell.getValue<ExtendedDownloadClientItem["state"]>();
          return <Text>{t(`states.${state}`)}</Text>;
        },
      },
      {
        ...columnsDefBase({ key: "time", showHeader: true, align: "center" }),
        Cell: ({ cell }) => {
          const time = cell.getValue<ExtendedDownloadClientItem["time"]>();
          return time === 0 ? (
            <IconInfinity size="calc(var(--ratioWidth)*2/3)" />
          ) : (
            <Text>{dayjs().add(time).fromNow()}</Text>
          );
        },
      },
      {
        ...columnsDefBase({ key: "type", showHeader: true }),
        Cell: ({ cell }) => {
          const type = cell.getValue<ExtendedDownloadClientItem["type"]>();
          return <Text>{type}</Text>;
        },
      },
      {
        ...columnsDefBase({ key: "upSpeed", showHeader: true, align: "right" }),
        sortUndefined: "last",
        Cell: ({ cell }) => {
          const upSpeed = cell.getValue<ExtendedDownloadClientItem["upSpeed"]>();
          return upSpeed !== undefined && <Text>{humanFileSize(upSpeed)?.toString().concat("/s")}</Text>;
        },
      },
    ],
    [clickedIndex, isEditMode, data, integrationIds, options],
  );

  //Table build and config
  const table = useMantineReactTable({
    columns,
    data,
    enablePagination: false,
    enableTopToolbar: false,
    enableBottomToolbar: false,
    enableColumnActions: false,
    enableSorting: options.enableRowSorting && !isEditMode,
    enableMultiSort: true,
    enableStickyHeader: false,
    enableColumnOrdering: isEditMode,
    enableRowVirtualization: true,
    rowVirtualizerOptions: { overscan: 5 },
    mantinePaperProps: { flex: 1, withBorder: false, shadow: undefined },
    mantineTableContainerProps: { style: { height: "100%" } },
    mantineTableProps: {
      className: "downloads-widget-table",
      style: {
        "--sortButtonSize": "calc(var(--ratioWidth)*0.6)",
        "--dragButtonSize": "calc(var(--ratioWidth)*0.6)",
      },
    },
    mantineTableBodyProps: { style: editStyle },
    mantineTableBodyCellProps: ({ cell, row }) => ({
      onClick: () => {
        setClickedIndex(row.index);
        cell.column.id !== "actions" && open();
      },
    }),
    onColumnOrderChange: (order) => {
      const columnOrder = (order as typeof options.columns).filter((column) => options.columns.includes(column));
      setOptions({ newOptions: { columns: columnOrder } });
    },
    initialState: {
      columnVisibility: {
        actions: false,
        added: false,
        category: false,
        downSpeed: false,
        id: false,
        index: false,
        integration: false,
        name: false,
        progress: false,
        ratio: false,
        received: false,
        sent: false,
        size: false,
        state: false,
        time: false,
        type: false,
        upSpeed: false,
      } satisfies Record<keyof ExtendedDownloadClientItem, boolean>,
      columnOrder: options.columns,
    },
    state: {
      columnVisibility,
      columnOrder: options.columns,
    },
  });

  const isLangRtl = tCommon("rtl", { value: "0", symbol: "1" }).startsWith("1");
  const globalTrafic = clients
    .filter(({ integration: { kind } }) => ["qBittorrent", "deluge", "transmission"].includes(kind))
    .reduce(
      ({ up, down }, { totalUp, totalDown }) => ({
        up: up + (totalUp ?? 0),
        down: down + (totalDown ?? 0),
      }),
      { up: 0, down: 0 },
    );

  //The actual widget
  return (
    <Stack gap={0} h="100%" display="flex" style={baseStyle}>
      <MantineReactTable table={table} />
      <Group
        p="calc(var(--ratioWidth)*0.2)"
        justify={integrationTypes.includes("torrent") ? "space-between" : "end"}
        style={{ flexDirection: isLangRtl ? "row-reverse" : "row" }}
      >
        {integrationTypes.includes("torrent") && (
          <Group style={{ flexDirection: isLangRtl ? "row-reverse" : "row" }}>
            <Text>{tCommon("rtl", { value: t("globalRatio"), symbol: tCommon("symbols.colon") })}</Text>
            <Text>{(globalTrafic.up / globalTrafic.down).toFixed(2)}</Text>
          </Group>
        )}
        <ClientsControl clients={clients} style={editStyle} />
      </Group>
      <ItemInfoModal items={data} currentIndex={clickedIndex} opened={opened} onClose={close} />
    </Stack>
  );
}

interface ItemInfoModalProps {
  items: ExtendedDownloadClientItem[];
  currentIndex: number;
  opened: boolean;
  onClose: () => void;
}

const ItemInfoModal = ({ items, currentIndex, opened, onClose }: ItemInfoModalProps) => {
  const item = useMemo<ExtendedDownloadClientItem | undefined>(() => items[currentIndex], [items, currentIndex, opened]);
  const t = useScopedI18n("widget.downloads.states");
  return (
    <Modal opened={opened} onClose={onClose} centered title={item?.id ?? "ERROR"} size="auto">
        {item === undefined ? <Center>{"No item found"}</Center> :
      <Stack align="center">
        <Title>{item.name}</Title>
        <Group>
          <Avatar src={getIconUrl(item.integration.kind)} />
          <Text>{`${item.integration.name} (${item.integration.kind})`}</Text>
        </Group>
        <NormalizedLine itemKey="index" values={item.index} />
        <NormalizedLine itemKey="type" values={item.type} />
        <NormalizedLine itemKey="state" values={t(item.state)} />
        <NormalizedLine
          itemKey="upSpeed"
          values={item.upSpeed === undefined ? undefined : humanFileSize(item.upSpeed)?.toString().concat("/s")}
        />
        <NormalizedLine
          itemKey="downSpeed"
          values={item.downSpeed === undefined ? undefined : humanFileSize(item.downSpeed)?.toString().concat("/s")}
        />
        <NormalizedLine itemKey="sent" values={item.sent === undefined ? undefined : humanFileSize(item.sent)} />
        <NormalizedLine itemKey="received" values={humanFileSize(item.received)} />
        <NormalizedLine itemKey="size" values={humanFileSize(item.size)} />
        <NormalizedLine
          itemKey="progress"
          values={new Intl.NumberFormat("en", { style: "percent", notation: "compact", unitDisplay: "narrow" }).format(
            item.progress,
          )}
        />
        <NormalizedLine itemKey="ratio" values={item.ratio} />
        <NormalizedLine itemKey="added" values={item.added === undefined ? "unknown" : dayjs(item.added).format()} />
        <NormalizedLine itemKey="time" values={dayjs().add(item.time).format()} />
        <NormalizedLine itemKey="category" values={item.category} />
      </Stack>}
    </Modal>
  );
};

const NormalizedLine = ({
  itemKey,
  values,
}: {
  itemKey: Exclude<keyof ExtendedDownloadClientItem, "integration" | "actions" | "name" | "id">;
  values?: number | string | string[];
}) => {
  if (typeof values !== "number" && (values === undefined || values.length === 0)) return null;
  const t = useScopedI18n("widget.downloads.items");
  const tCommon = useScopedI18n("common");
  const translatedKey = t(`${itemKey}.detailsTitle`);
  const isLangRtl = tCommon("rtl", { value: "0", symbol: "1" }).startsWith("1"); //Maybe make a common "isLangRtl" somewhere
  const keyString = tCommon("rtl", { value: translatedKey, symbol: tCommon("symbols.colon") });
  return (
    <Group
      w="100%"
      display="flex"
      style={{ flexDirection: isLangRtl ? "row-reverse" : "row" }}
      align="top"
      justify="space-between"
      wrap="nowrap"
    >
      <Text>{keyString}</Text>
      {Array.isArray(values) ? (
        <Stack>
          {values.map((value) => (
            <Text key={value}>{value}</Text>
          ))}
        </Stack>
      ) : (
        <Text>{values}</Text>
      )}
    </Group>
  );
};

interface ClientsControlProps {
  clients: ExtendedClientStatus[];
  style?: MantineStyleProp;
}

const ClientsControl = ({ clients, style }: ClientsControlProps) => {
  const pausedIntegrations: string[] = [];
  const activeIntegrations: string[] = [];
  clients.forEach((client) =>
    client.paused ? pausedIntegrations.push(client.integration.id) : activeIntegrations.push(client.integration.id),
  );
  const totalSpeed = humanFileSize(clients.reduce((count, { rates: { down } }) => count + down, 0))?.toString().concat("/s");
  const { mutate: mutateResumeQueue } = clientApi.widget.downloads.resume.useMutation();
  const { mutate: mutatePauseQueue } = clientApi.widget.downloads.pause.useMutation();
  const [opened, { open, close }] = useDisclosure(false);
  const t = useScopedI18n("widget.downloads.actions");
  return (
    <Group gap="calc(var(--ratioWidth)*0.1)" style={{ ...style }}>
      <AvatarGroup>
        {clients.map((client) => (
          <Avatar key={client.integration.id} size="var(--ratioWidth)" src={getIconUrl(client.integration.kind)} />
        ))}
      </AvatarGroup>
      <Tooltip label={t("clients.resume")}>
        <ActionIcon
          size="var(--ratioWidth)"
          radius={999}
          disabled={pausedIntegrations.length === 0}
          variant="light"
          onClick={() => mutateResumeQueue({ integrationIds: pausedIntegrations })}
        >
          <IconPlayerPlay size="calc(var(--ratioWidth)*0.75)" />
        </ActionIcon>
      </Tooltip>
      <Modal opened={opened} onClose={close} title={t("clients.modalTitle")} centered size="auto">
        <Stack gap="10px">
          {clients.map((client) => (
            <Stack key={client.integration.id} gap="10px">
              <Divider />
              <Group wrap="nowrap" w="100%">
                <Paper withBorder radius={999}>
                  <Group gap={5} pl={10} pr={15} fz={16} w={275} justify="space-between">
                    <Avatar radius={0} src={getIconUrl(client.integration.kind)} />
                    <Stack gap={0} pt={5} h={60} justify="center" flex={1}>
                      {client.rates.up !== undefined ? (
                        <Group display="flex" justify="center" c="green" w="100%" gap={5}>
                          <Text flex={1} ta="right">
                            {`↑ ${humanFileSize(client.rates.up)}/s`}
                          </Text>
                          <Text>{"-"}</Text>
                          <Text flex={1} ta="left">
                            {humanFileSize(client.totalUp ?? 0)}
                          </Text>
                        </Group>
                      ) : undefined}
                      <Group display="flex" justify="center" c="blue" w="100%" gap={5}>
                        <Text flex={1} ta="right">
                          {`↓ ${humanFileSize(client.rates.down)}/s`}
                        </Text>
                        <Text>{"-"}</Text>
                        <Text flex={1} ta="left">
                          {humanFileSize(Math.floor(client.totalDown ?? 0))}
                        </Text>
                      </Group>
                    </Stack>
                  </Group>
                </Paper>
                <Text lineClamp={1} fz={22}>
                  {client.integration.name}
                </Text>
                <Space flex={1} />
                <Tooltip label={t(`client.${client.paused ? "resume" : "pause"}`)}>
                  <ActionIcon
                    radius={999}
                    variant="light"
                    size="lg"
                    onClick={() => {
                      (client.paused ? mutateResumeQueue : mutatePauseQueue)({
                        integrationIds: [client.integration.id],
                      });
                    }}
                  >
                    {client.paused ? <IconPlayerPlay /> : <IconPlayerPause />}
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Stack>
          ))}
        </Stack>
      </Modal>
      <Button
        variant="default"
        h="var(--ratioWidth)"
        radius={999}
        px="calc(var(--ratioWidth)*0.2)"
        pt="calc(var(--ratioWidth)*0.1)"
        pb={0}
        fw="500"
        onClick={open}
      >
        {totalSpeed}
      </Button>
      <Tooltip label={t("clients.pause")}>
        <ActionIcon
          size="var(--ratioWidth)"
          radius={999}
          disabled={activeIntegrations.length === 0}
          variant="light"
          onClick={() => mutatePauseQueue({ integrationIds: activeIntegrations })}
        >
          <IconPlayerPause size="calc(var(--ratioWidth)*0.75)" />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
};
