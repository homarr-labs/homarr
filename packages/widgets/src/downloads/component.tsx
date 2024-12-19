"use client";

import "../widgets-common.css";

import { useCallback, useMemo, useState } from "react";
import type { MantineStyleProp } from "@mantine/core";
import {
  ActionIcon,
  Avatar,
  AvatarGroup,
  Button,
  Center,
  Chip,
  Divider,
  Group,
  Modal,
  Paper,
  Popover,
  Progress,
  Space,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import type { IconProps } from "@tabler/icons-react";
import {
  IconAlertTriangle,
  IconCirclesRelation,
  IconFilter,
  IconInfinity,
  IconInfoCircle,
  IconPlayerPause,
  IconPlayerPlay,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import type { MRT_ColumnDef, MRT_VisibilityState } from "mantine-react-table";
import { MantineReactTable, useMantineReactTable } from "mantine-react-table";

import { clientApi } from "@homarr/api/client";
import { useIntegrationsWithInteractAccess } from "@homarr/auth/client";
import { humanFileSize, useIntegrationConnected } from "@homarr/common";
import { getIconUrl, getIntegrationKindsByCategory } from "@homarr/definitions";
import type { ExtendedClientStatus, ExtendedDownloadClientItem } from "@homarr/integrations";
import { useScopedI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";

interface QuickFilter {
  integrationKinds: string[];
  statuses: ExtendedDownloadClientItem["state"][];
}

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

const actionIconIconStyle: IconProps["style"] = {
  height: "var(--ai-icon-size)",
  width: "var(--ai-icon-size)",
};

const standardIconStyle: IconProps["style"] = {
  height: "var(--icon-size)",
  width: "var(--icon-size)",
};

export default function DownloadClientsWidget({
  isEditMode,
  integrationIds,
  options,
  setOptions,
}: WidgetComponentProps<"downloads">) {
  const integrationsWithInteractions = useIntegrationsWithInteractAccess().flatMap(({ id }) =>
    integrationIds.includes(id) ? [id] : [],
  );

  const [currentItems] = clientApi.widget.downloads.getJobsAndStatuses.useSuspenseQuery(
    {
      integrationIds,
    },
    {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: false,
    },
  );
  const utils = clientApi.useUtils();

  //Translations
  const t = useScopedI18n("widget.downloads");
  const tCommon = useScopedI18n("common");

  //Item modal state and selection
  const [clickedIndex, setClickedIndex] = useState<number>(0);
  const [opened, { open, close }] = useDisclosure(false);

  //User quick settings for filters
  const [quickFilters, setQuickFilters] = useState<QuickFilter>({ integrationKinds: [], statuses: [] });
  const availableStatuses = useMemo<QuickFilter["statuses"]>(() => {
    //Redefine list of available statuses from current items
    const statuses = Array.from(new Set(currentItems.flatMap(({ data }) => data.items.map(({ state }) => state))));
    //Reset user filters accordingly to remove unavailable statuses
    setQuickFilters(({ integrationKinds: names, statuses: prevStatuses }) => {
      return { integrationKinds: names, statuses: prevStatuses.filter((status) => statuses.includes(status)) };
    });
    return statuses;
  }, [currentItems]);

  //Get API mutation functions
  const { mutate: mutateResumeItem } = clientApi.widget.downloads.resumeItem.useMutation();
  const { mutate: mutatePauseItem } = clientApi.widget.downloads.pauseItem.useMutation();
  const { mutate: mutateDeleteItem } = clientApi.widget.downloads.deleteItem.useMutation();

  //Subscribe to dynamic data changes
  clientApi.widget.downloads.subscribeToJobsAndStatuses.useSubscription(
    {
      integrationIds,
    },
    {
      onData: (data) => {
        utils.widget.downloads.getJobsAndStatuses.setData({ integrationIds }, (prevData) => {
          return prevData?.map((item) => {
            if (item.integration.id !== data.integration.id) return item;

            return {
              data: data.data,
              integration: {
                ...data.integration,
                updatedAt: new Date(),
              },
            };
          });
        });
      },
    },
  );

  //Flatten Data array for which each element has it's integration, data (base + calculated) and actions. Memoized on data subscription
  const data = useMemo<ExtendedDownloadClientItem[]>(
    () =>
      currentItems
        //Insure it is only using selected integrations
        .filter(({ integration }) => integrationIds.includes(integration.id))
        //Construct normalized items list
        .flatMap((pair) =>
          //Apply user white/black list
          pair.data.items
            .filter(
              ({ category }) =>
                options.filterIsWhitelist ===
                options.categoryFilter.some((filter) =>
                  (Array.isArray(category) ? category : [category]).includes(filter),
                ),
            )
            //Filter completed items following widget option
            .filter(
              ({ type, progress, upSpeed }) =>
                (type === "torrent" &&
                  ((progress === 1 &&
                    options.showCompletedTorrent &&
                    (upSpeed ?? 0) >= Number(options.activeTorrentThreshold) * 1024) ||
                    progress !== 1)) ||
                (type === "usenet" && ((progress === 1 && options.showCompletedUsenet) || progress !== 1)),
            )
            //Filter following user quick setting
            .filter(
              ({ state }) =>
                (quickFilters.integrationKinds.length === 0 ||
                  quickFilters.integrationKinds.includes(pair.integration.name)) &&
                (quickFilters.statuses.length === 0 || quickFilters.statuses.includes(state)),
            )
            //Add extrapolated data and actions if user is allowed interaction
            .map((item): ExtendedDownloadClientItem => {
              const received = Math.floor(item.size * item.progress);
              const integrationIds = [pair.integration.id];
              return {
                integration: pair.integration,
                ...item,
                category: item.category !== undefined && item.category.length > 0 ? item.category : undefined,
                received,
                ratio: item.sent !== undefined ? item.sent / received : undefined,
                //Only add if permission to use mutations
                actions: integrationsWithInteractions.includes(pair.integration.id)
                  ? {
                      resume: () => mutateResumeItem({ integrationIds, item }),
                      pause: () => mutatePauseItem({ integrationIds, item }),
                      delete: ({ fromDisk }) => mutateDeleteItem({ integrationIds, item, fromDisk }),
                    }
                  : undefined,
              };
            }),
        )
        //flatMap already sorts by integration by nature, add sorting by integration type (usenet | torrent)
        .sort(({ type: typeA }, { type: typeB }) => typeA.length - typeB.length),
    [
      currentItems,
      integrationIds,
      integrationsWithInteractions,
      mutateDeleteItem,
      mutatePauseItem,
      mutateResumeItem,
      options.activeTorrentThreshold,
      options.categoryFilter,
      options.filterIsWhitelist,
      options.showCompletedTorrent,
      options.showCompletedUsenet,
      quickFilters,
    ],
  );

  //Flatten Clients Array for which each elements has the integration and general client infos.
  const clients = useMemo<ExtendedClientStatus[]>(
    () =>
      currentItems
        .filter(({ integration }) => integrationIds.includes(integration.id))
        .flatMap(({ integration, data }): ExtendedClientStatus => {
          const interact = integrationsWithInteractions.includes(integration.id);
          const isTorrent = getIntegrationKindsByCategory("torrent").some((kind) => kind === integration.kind);
          /** Derived from current items */
          const { totalUp, totalDown } = data.items
            .filter(
              ({ category }) =>
                !options.applyFilterToRatio ||
                data.status.type !== "torrent" ||
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
            integration,
            interact,
            status: {
              totalUp,
              totalDown,
              ratio: totalUp === undefined ? undefined : totalUp / totalDown,
              ...data.status,
            },
          };
        })
        .sort(
          ({ status: statusA }, { status: statusB }) =>
            (statusA?.type.length ?? Infinity) - (statusB?.type.length ?? Infinity),
        ),
    [
      currentItems,
      integrationIds,
      integrationsWithInteractions,
      options.applyFilterToRatio,
      options.categoryFilter,
      options.filterIsWhitelist,
    ],
  );

  //Check existing types between torrents and usenet
  const integrationTypes: ExtendedDownloadClientItem["type"][] = [];
  if (data.some(({ type }) => type === "torrent")) integrationTypes.push("torrent");
  if (data.some(({ type }) => type === "usenet")) integrationTypes.push("usenet");

  //Set the visibility of columns depending on widget settings and available data/integrations.
  const columnVisibility: MRT_VisibilityState = {
    id: options.columns.includes("id"),
    actions: options.columns.includes("actions") && integrationsWithInteractions.length > 0,
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
    0,
  );

  //Default styling behavior for stopping interaction when editing. (Applied everywhere except the table header)
  const editStyle: MantineStyleProp = {
    pointerEvents: isEditMode ? "none" : undefined,
  };

  //General style sizing as vars that should apply or be applied to all elements
  const baseStyle: MantineStyleProp = {
    "--total-width": totalWidth,
    "--ratio-width": "calc(100cqw / var(--total-width))",
    "--space-size": "calc(var(--ratio-width) * 0.1)", //Standard gap and spacing value
    "--text-fz": "calc(var(--ratio-width) * 0.45)", //General Font Size
    "--button-fz": "var(--text-fz)",
    "--icon-size": "calc(var(--ratio-width) * 2 / 3)", //Normal icon size
    "--ai-icon-size": "calc(var(--ratio-width) * 0.5)", //Icon inside action icons size
    "--button-size": "calc(var(--ratio-width) * 0.75)", //Action Icon, button and avatar size
    "--image-size": "var(--button-size)",
    "--mrt-base-background-color": "transparent",
  };

  //Base element in common with all columns
  const columnsDefBase = useCallback(
    ({
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
        width: "var(--column-width)",
        height: "var(--ratio-width)",
        padding: "var(--space-size)",
        transition: "unset",
        "--key-width": columnsRatios[key],
        "--column-width": "calc((var(--key-width)/var(--total-width) * 100cqw))",
      };
      return {
        id: key,
        accessorKey: key,
        header: key,
        size: columnsRatios[key],
        mantineTableBodyCellProps: { style, align },
        mantineTableHeadCellProps: {
          style,
          align: isEditMode ? "center" : align,
        },
        Header: () => (showHeader && !isEditMode ? <Text fw={700}>{t(`items.${key}.columnTitle`)}</Text> : ""),
      };
    },
    [isEditMode, t],
  );

  //Make columns and cell elements, Memoized to data with deps on data and EditMode
  const columns = useMemo<MRT_ColumnDef<ExtendedDownloadClientItem>[]>(
    () => [
      {
        ...columnsDefBase({ key: "actions", showHeader: false, align: "center" }),
        enableSorting: false,
        Cell: ({ cell, row }) => {
          const actions = cell.getValue<ExtendedDownloadClientItem["actions"]>();
          const pausedAction = row.original.state === "paused" ? "resume" : "pause";
          const [opened, { open, close }] = useDisclosure(false);

          return actions ? (
            <Group wrap="nowrap" gap="var(--space-size)">
              <Tooltip label={t(`actions.item.${pausedAction}`)}>
                <ActionIcon variant="light" radius={999} onClick={actions[pausedAction]} size="var(--button-size)">
                  {pausedAction === "resume" ? (
                    <IconPlayerPlay style={actionIconIconStyle} />
                  ) : (
                    <IconPlayerPause style={actionIconIconStyle} />
                  )}
                </ActionIcon>
              </Tooltip>
              <Tooltip label={t("actions.item.delete.title")}>
                <ActionIcon color="red" radius={999} onClick={open} size="var(--button-size)">
                  <IconTrash style={actionIconIconStyle} />
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
            </Group>
          ) : (
            <ActionIcon radius={999} disabled size="var(--button-size)">
              <IconX style={actionIconIconStyle} />
            </ActionIcon>
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
                <IconInfoCircle style={standardIconStyle} />
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
          return downSpeed && <Text>{humanFileSize(downSpeed, "/s")}</Text>;
        },
      },
      {
        ...columnsDefBase({ key: "id", showHeader: false, align: "center" }),
        enableSorting: false,
        Cell: ({ cell }) => {
          const id = cell.getValue<ExtendedDownloadClientItem["id"]>();
          return (
            <Tooltip label={id}>
              <IconCirclesRelation style={standardIconStyle} />
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
              <Avatar size="var(--image-size)" radius={0} src={getIconUrl(integration.kind)} />
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
            <Stack w="100%" align="center" gap="var(--space-size)">
              <Text lh="var(--text-fz)">
                {new Intl.NumberFormat("en", { style: "percent", notation: "compact", unitDisplay: "narrow" }).format(
                  progress,
                )}
              </Text>
              <Progress
                h="calc(var(--ratio-width)*0.25)"
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
          return sent && <Text>{humanFileSize(sent)}</Text>;
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
          return time === 0 ? <IconInfinity style={standardIconStyle} /> : <Text>{dayjs().add(time).fromNow()}</Text>;
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
          return upSpeed && <Text>{humanFileSize(upSpeed, "/s")}</Text>;
        },
      },
    ],
    [columnsDefBase, t, tCommon],
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
        "--sortButtonSize": "var(--button-size)",
        "--dragButtonSize": "var(--button-size)",
      },
    },
    mantineTableBodyProps: { style: editStyle },
    mantineTableBodyCellProps: ({ cell, row }) => ({
      onClick: () => {
        setClickedIndex(row.index);
        if (cell.column.id !== "actions") open();
      },
    }),
    onColumnOrderChange: (order) => {
      //Order has a tendency to add the disabled column at the end of the the real ordered array
      const columnOrder = (order as typeof options.columns).filter((column) => options.columns.includes(column));
      setOptions({ newOptions: { columns: columnOrder } });
    },
    initialState: {
      sorting: [{ id: options.defaultSort, desc: options.descendingDefaultSort }],
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

  //Used for Global Torrent Ratio
  const globalTraffic = clients
    .filter(({ integration: { kind } }) =>
      getIntegrationKindsByCategory("torrent").some((integrationKind) => integrationKind === kind),
    )
    .reduce(
      ({ up, down }, { status }) => ({
        up: up + (status?.totalUp ?? 0),
        down: down + (status?.totalDown ?? 0),
      }),
      { up: 0, down: 0 },
    );

  if (options.columns.length === 0)
    return (
      <Center h="100%">
        <Text fz="7.5cqw">{t("errors.noColumns")}</Text>
      </Center>
    );

  //The actual widget
  return (
    <Stack gap={0} h="100%" display="flex" style={baseStyle}>
      <MantineReactTable table={table} />
      <Group
        h="var(--ratio-width)"
        px="var(--space-size)"
        justify={integrationTypes.includes("torrent") ? "space-between" : "end"}
        style={{
          borderTop: "0.0625rem solid var(--border-color)",
        }}
      >
        {integrationTypes.includes("torrent") && (
          <Group pt="var(--space-size)">
            <Text>{`${t("globalRatio")}:`}</Text>
            <Text>{(globalTraffic.up / globalTraffic.down).toFixed(2)}</Text>
          </Group>
        )}
        <ClientsControl
          clients={clients}
          style={editStyle}
          filters={quickFilters}
          setFilters={setQuickFilters}
          availableStatuses={availableStatuses}
        />
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
  const item = useMemo<ExtendedDownloadClientItem | undefined>(() => items[currentIndex], [items, currentIndex]);
  const t = useScopedI18n("widget.downloads.states");
  //The use case for "No item found" should be impossible, hence no translation
  return (
    <Modal opened={opened} onClose={onClose} centered title={item?.id ?? "ERROR"} size="auto">
      {item === undefined ? (
        <Center>{"No item found"}</Center>
      ) : (
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
            values={item.upSpeed === undefined ? undefined : humanFileSize(item.upSpeed, "/s")}
          />
          <NormalizedLine
            itemKey="downSpeed"
            values={item.downSpeed === undefined ? undefined : humanFileSize(item.downSpeed, "/s")}
          />
          <NormalizedLine itemKey="sent" values={item.sent === undefined ? undefined : humanFileSize(item.sent)} />
          <NormalizedLine itemKey="received" values={humanFileSize(item.received)} />
          <NormalizedLine itemKey="size" values={humanFileSize(item.size)} />
          <NormalizedLine
            itemKey="progress"
            values={new Intl.NumberFormat("en", {
              style: "percent",
              notation: "compact",
              unitDisplay: "narrow",
            }).format(item.progress)}
          />
          <NormalizedLine itemKey="ratio" values={item.ratio} />
          <NormalizedLine itemKey="added" values={item.added === undefined ? "unknown" : dayjs(item.added).format()} />
          <NormalizedLine itemKey="time" values={item.time !== 0 ? dayjs().add(item.time).format() : "∞"} />
          <NormalizedLine itemKey="category" values={item.category} />
        </Stack>
      )}
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
  const t = useScopedI18n("widget.downloads.items");
  if (typeof values !== "number" && (values === undefined || values.length === 0)) return null;
  return (
    <Group w="100%" display="flex" align="top" justify="space-between" wrap="nowrap">
      <Text>{`${t(`${itemKey}.detailsTitle`)}:`}</Text>
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
  filters: QuickFilter;
  setFilters: (filters: QuickFilter) => void;
  availableStatuses: QuickFilter["statuses"];
  style?: MantineStyleProp;
}

const ClientsControl = ({ clients, filters, setFilters, availableStatuses, style }: ClientsControlProps) => {
  const integrationsStatuses = clients.reduce(
    (acc, { status, integration: { id }, interact }) =>
      status && interact ? (acc[status.paused ? "paused" : "active"].push(id), acc) : acc,
    { paused: [] as string[], active: [] as string[] },
  );
  const someInteract = clients.some(({ interact }) => interact);
  const totalSpeed = humanFileSize(
    clients.reduce((count, { status }) => count + (status?.rates.down ?? 0), 0),
    "/s",
  );
  const chipStyle = {
    "--chip-fz": "var(--button-fz)",
    "--chip-size": "calc(var(--ratio-width) * 0.9)",
    "--chip-icon-size": "calc(var(--chip-fz)*2/3)",
    "--chip-padding": "var(--chip-fz)",
    "--chip-checked-padding": "var(--chip-icon-size)",
    "--chip-spacing": "var(--space-size)",
  };
  const { mutate: mutateResumeQueue } = clientApi.widget.downloads.resume.useMutation();
  const { mutate: mutatePauseQueue } = clientApi.widget.downloads.pause.useMutation();
  const [opened, { open, close }] = useDisclosure(false);
  const t = useScopedI18n("widget.downloads");
  return (
    <Group gap="var(--space-size)" style={style}>
      <Popover withinPortal={false} offset={0}>
        <Popover.Target>
          <ActionIcon size="var(--button-size)" radius={999} variant="light">
            <IconFilter style={actionIconIconStyle} />
          </ActionIcon>
        </Popover.Target>
        <Popover.Dropdown
          w="calc(var(--ratio-width)*4)"
          p="var(--space-size)"
          bg="var(--background-color)"
          style={{ "--popover-border-color": "var(--border-color)" }}
        >
          <Stack gap="var(--space-size)" align="center" pb="var(--space-size)">
            <Text fw="700">{t("items.integration.columnTitle")}</Text>
            <Chip.Group
              multiple
              value={filters.integrationKinds}
              onChange={(names) => setFilters({ ...filters, integrationKinds: names })}
            >
              {clients.map(({ integration }) => (
                <Chip style={chipStyle} key={integration.id} value={integration.name}>
                  {integration.name}
                </Chip>
              ))}
            </Chip.Group>
            <Text fw="700">{t("items.state.columnTitle")}</Text>
            <Chip.Group
              multiple
              value={filters.statuses}
              onChange={(statuses) => setFilters({ ...filters, statuses: statuses as typeof filters.statuses })}
            >
              {availableStatuses.map((status) => (
                <Chip style={chipStyle} key={status} value={status}>
                  {t(`states.${status}`)}
                </Chip>
              ))}
            </Chip.Group>
          </Stack>
        </Popover.Dropdown>
      </Popover>
      <AvatarGroup mx="calc(var(--space-size)*2)" spacing="calc(var(--space-size)*2)">
        {clients.map((client) => (
          <ClientAvatar key={client.integration.id} client={client} />
        ))}
      </AvatarGroup>
      {someInteract && (
        <Tooltip label={t("actions.clients.resume")}>
          <ActionIcon
            size="var(--button-size)"
            radius={999}
            disabled={integrationsStatuses.paused.length === 0}
            variant="light"
            onClick={() => mutateResumeQueue({ integrationIds: integrationsStatuses.paused })}
          >
            <IconPlayerPlay style={actionIconIconStyle} />
          </ActionIcon>
        </Tooltip>
      )}
      <Button
        variant="light"
        radius={999}
        h="var(--button-size)"
        px="calc(var(--space-size)*2)"
        fw="500"
        onClick={open}
        styles={{ label: { height: "fit-content", paddingBottom: "calc(var(--space-size)*0.75)" } }}
      >
        {totalSpeed}
      </Button>
      {someInteract && (
        <Tooltip label={t("actions.clients.pause")}>
          <ActionIcon
            size="var(--button-size)"
            radius={999}
            disabled={integrationsStatuses.active.length === 0}
            variant="light"
            onClick={() => mutatePauseQueue({ integrationIds: integrationsStatuses.active })}
          >
            <IconPlayerPause style={actionIconIconStyle} />
          </ActionIcon>
        </Tooltip>
      )}
      <Modal opened={opened} onClose={close} title={t("actions.clients.modalTitle")} centered size="auto">
        <Stack gap="10px">
          {clients.map((client) => (
            <Stack key={client.integration.id} gap="10px">
              <Divider />
              <Group wrap="nowrap" w="100%">
                <Paper withBorder radius={999}>
                  <Group gap={5} pl={10} pr={15} fz={16} w={275} justify="space-between" wrap="nowrap">
                    <Avatar radius={0} src={getIconUrl(client.integration.kind)} />
                    {client.status ? (
                      <Tooltip disabled={client.status.ratio === undefined} label={client.status.ratio?.toFixed(2)}>
                        <Stack gap={0} pt={5} h={60} justify="center" flex={1}>
                          {client.status.rates.up !== undefined ? (
                            <Group display="flex" justify="center" c="green" w="100%" gap={5}>
                              <Text flex={1} ta="right">
                                {`↑ ${humanFileSize(client.status.rates.up, "/s")}`}
                              </Text>
                              <Text>{"-"}</Text>
                              <Text flex={1} ta="left">
                                {humanFileSize(client.status.totalUp ?? 0)}
                              </Text>
                            </Group>
                          ) : undefined}
                          <Group display="flex" justify="center" c="blue" w="100%" gap={5}>
                            <Text flex={1} ta="right">
                              {`↓ ${humanFileSize(client.status.rates.down, "/s")}`}
                            </Text>
                            <Text>{"-"}</Text>
                            <Text flex={1} ta="left">
                              {humanFileSize(Math.floor(client.status.totalDown ?? 0))}
                            </Text>
                          </Group>
                        </Stack>
                      </Tooltip>
                    ) : (
                      <Text c="red" ta="center">
                        {t("errors.noCommunications")}
                      </Text>
                    )}
                  </Group>
                </Paper>
                <Text lineClamp={1} fz={22}>
                  {client.integration.name}
                </Text>
                <Space flex={1} />
                {client.status && client.interact ? (
                  <Tooltip label={t(`actions.client.${client.status.paused ? "resume" : "pause"}`)}>
                    <ActionIcon
                      radius={999}
                      variant="light"
                      size="lg"
                      onClick={() => {
                        (client.status?.paused ? mutateResumeQueue : mutatePauseQueue)({
                          integrationIds: [client.integration.id],
                        });
                      }}
                    >
                      {client.status.paused ? <IconPlayerPlay /> : <IconPlayerPause />}
                    </ActionIcon>
                  </Tooltip>
                ) : (
                  <ActionIcon radius={999} variant="light" size="lg" disabled>
                    <IconX />
                  </ActionIcon>
                )}
              </Group>
            </Stack>
          ))}
        </Stack>
      </Modal>
    </Group>
  );
};

interface ClientAvatarProps {
  client: ExtendedClientStatus;
}

const ClientAvatar = ({ client }: ClientAvatarProps) => {
  const isConnected = useIntegrationConnected(client.integration.updatedAt, { timeout: 30000 });

  return (
    <Avatar
      key={client.integration.id}
      src={getIconUrl(client.integration.kind)}
      style={{ filter: !isConnected ? "grayscale(100%)" : undefined }}
      size="var(--image-size)"
      p="calc(var(--space-size)*0.5)"
      bd={`calc(var(--space-size)*0.5) solid ${client.status ? "transparent" : "var(--mantine-color-red-filled)"}`}
    />
  );
};
