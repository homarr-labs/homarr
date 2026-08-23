"use client";

import { useMemo, useState } from "react";
import { RestrictToHorizontalAxis } from "@dnd-kit/abstract/modifiers";
import { PointerActivationConstraints } from "@dnd-kit/dom";
import type { DragEndEvent } from "@dnd-kit/react";
import { DragDropProvider, DragOverlay, KeyboardSensor, PointerSensor } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import {
  ActionIcon,
  Avatar,
  Box,
  Button,
  Card,
  Divider,
  Group,
  Menu,
  Paper,
  SegmentedControl,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import {
  IconBrandDocker,
  IconEye,
  IconEyeOff,
  IconHome,
  IconLayoutDashboard,
  IconPencil,
  IconPlus,
  IconReplace,
  IconRobot,
  IconSearch,
  IconSettings,
  IconSunMoon,
  IconUserCircle,
  IconX,
} from "@tabler/icons-react";

import type { BoardPreviewData } from "@homarr/boards/layout-preview";
import { useI18n } from "@homarr/translation/client";
import type {
  HeaderBuiltinItemId,
  HeaderItem,
  HeaderPreferences,
  HeaderZoneId,
  HeaderZones,
} from "@homarr/validation/user";
import {
  createBoardHeaderItem,
  createBuiltinHeaderItem,
  getDefaultHeaderZone,
  getHeaderItemKey,
  getHeaderItems,
  getHeaderItemZone,
  headerBuiltinItemIds,
  headerZoneIds,
  isRequiredHeaderItem,
} from "@homarr/validation/user";

import { BoardLayoutThumbnail } from "~/components/board/board-layout-thumbnail";
import { HomarrLogo } from "~/components/layout/logo/homarr-logo";
import classes from "./header-composer.module.css";

interface HeaderComposerProps {
  value: HeaderPreferences;
  onChange: (value: HeaderPreferences) => void;
  boards: { id: string; name: string; logoImageUrl: string | null; preview: BoardPreviewData | null }[];
  homeBoardId: string | null;
  mobileHomeBoardId: string | null;
}

type PreviewSize = "desktop" | "mobile";

type HeaderStripEntry =
  | { id: string; kind: "divider"; zone: HeaderZoneId }
  | { id: string; item: HeaderItem; kind: "item" };

const headerSortableSensors = [
  PointerSensor.configure({
    activationConstraints: [new PointerActivationConstraints.Distance({ value: 6 })],
  }),
  KeyboardSensor,
];
const headerSortableModifiers = [RestrictToHorizontalAxis];
const headerSortableGroup = "header-composer";

export const HeaderComposer = ({ value, onChange, boards, homeBoardId, mobileHomeBoardId }: HeaderComposerProps) => {
  const [previewSize, setPreviewSize] = useState<PreviewSize>("desktop");
  const [draggedItemKey, setDraggedItemKey] = useState<string | null>(null);
  const [selectedItemKey, setSelectedItemKey] = useState<string | null>(null);
  const t = useI18n("management.page.user.setting.general.header");
  const boardsById = useMemo(() => new Map(boards.map((board) => [board.id, board])), [boards]);
  const activeItems = getHeaderItems(value.zones);
  const stripEntries = createHeaderStripEntries(value.zones);
  const activeItemKeySet = new Set(activeItems.map(getHeaderItemKey));
  const inactiveBuiltinIds = headerBuiltinItemIds.filter((itemId) => {
    const item = createBuiltinHeaderItem(itemId);
    return !isRequiredHeaderItem(item) && !activeItemKeySet.has(getHeaderItemKey(item));
  });
  const availableBoards = boards.filter(
    (board) => !activeItemKeySet.has(getHeaderItemKey(createBoardHeaderItem(board.id))),
  );
  const draggedItem = findHeaderItem(activeItems, draggedItemKey);
  const selectedItem = findHeaderItem(activeItems, selectedItemKey);
  let previewBoardId = homeBoardId;
  if (previewSize === "mobile") previewBoardId = mobileHomeBoardId ?? homeBoardId;
  const previewBoard = boardsById.get(previewBoardId ?? "") ?? boards.at(0);

  const itemLabel = (item: HeaderItem) => {
    if (item.type === "board") return boardsById.get(item.boardId)?.name ?? t("items.boardUnavailable");
    return t(`items.${item.id}` as never);
  };

  const updateZones = (zones: HeaderZones) => onChange({ ...value, zones });

  const removeItem = (item: HeaderItem) => {
    if (isRequiredHeaderItem(item)) return;
    const zone = getHeaderItemZone(value.zones, item);
    if (!zone) return;
    const itemKey = getHeaderItemKey(item);
    updateZones({
      ...value.zones,
      [zone]: value.zones[zone].filter((candidate) => getHeaderItemKey(candidate) !== itemKey),
    });
    setSelectedItemKey(null);
  };

  const addItem = (item: HeaderItem) => {
    const itemKey = getHeaderItemKey(item);
    if (activeItemKeySet.has(itemKey)) return;
    const zone = getDefaultHeaderZone(item);
    updateZones({ ...value.zones, [zone]: [...value.zones[zone], item] });
    setSelectedItemKey(itemKey);
  };

  const handleDragEnd = ({ canceled, operation }: DragEndEvent) => {
    setDraggedItemKey(null);
    const source = operation.source;
    if (canceled || !isSortable(source)) return;
    if (source.initialIndex === source.index) return;

    const nextEntries = moveHeaderStripEntry(stripEntries, source.initialIndex, source.index);
    updateZones(createHeaderZonesFromStripEntries(nextEntries));
  };

  return (
    <Card className={classes.composer} padding={0} radius="lg" withBorder>
      <Stack gap={0}>
        <Group className={classes.heading} justify="space-between" align="flex-start" wrap="wrap">
          <Stack gap={4}>
            <Group gap="xs">
              <ThemeIcon variant="light" radius="md" size="lg">
                <IconLayoutDashboard size={18} />
              </ThemeIcon>
              <Text fw={700} size="lg">
                {t("title")}
              </Text>
            </Group>
            <Text c="dimmed" size="sm">
              {t("description")}
            </Text>
          </Stack>
          <Group gap="xs">
            <SegmentedControl
              size="xs"
              value={previewSize}
              onChange={(next) => setPreviewSize(next as PreviewSize)}
              data={[
                { value: "desktop", label: t("device.desktop") },
                { value: "mobile", label: t("device.mobile") },
              ]}
            />
            <Tooltip label={value.visible ? t("action.hide") : t("action.show")}>
              <ActionIcon
                size="lg"
                variant={value.visible ? "default" : "filled"}
                aria-label={value.visible ? t("action.hide") : t("action.show")}
                onClick={() => onChange({ ...value, visible: !value.visible })}
              >
                {value.visible ? <IconEye size={18} /> : <IconEyeOff size={18} />}
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>

        <Box className={classes.stage} data-size={previewSize} data-visible={value.visible}>
          <Paper className={classes.device} radius="lg" withBorder>
            {value.visible ? (
              <DragDropProvider
                onDragStart={({ operation }) => setDraggedItemKey(operation.source?.id.toString() ?? null)}
                onDragEnd={handleDragEnd}
              >
                <div className={classes.previewHeader}>
                  <div className={classes.stripScroller}>
                    <div className={classes.sortableStrip}>
                      {stripEntries.map((entry, index) => {
                        if (entry.kind === "divider") {
                          return (
                            <SortableZoneDivider
                              key={entry.id}
                              entry={entry}
                              index={index}
                              label={t(`zones.${entry.zone}` as never)}
                              showMobileBurger={entry.zone === "left"}
                            />
                          );
                        }

                        const item = entry.item;
                        return (
                          <SortableHeaderItem
                            key={entry.id}
                            item={item}
                            index={index}
                            label={itemLabel(item)}
                            previewSize={previewSize}
                            searchDisplay={value.searchDisplay}
                            boardLogo={
                              item.type === "board" ? (boardsById.get(item.boardId)?.logoImageUrl ?? null) : null
                            }
                            configureLabel={t("action.configure", { item: itemLabel(item) })}
                            selected={selectedItemKey === entry.id}
                            onSelect={setSelectedItemKey}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
                <DragOverlay dropAnimation={null}>
                  {draggedItem ? (
                    <HeaderItemPreview
                      item={draggedItem}
                      label={itemLabel(draggedItem)}
                      compact={previewSize === "mobile"}
                      searchDisplay={value.searchDisplay}
                      boardLogo={
                        draggedItem.type === "board" ? boardsById.get(draggedItem.boardId)?.logoImageUrl : null
                      }
                      overlay
                    />
                  ) : null}
                </DragOverlay>
              </DragDropProvider>
            ) : (
              <div className={classes.hiddenPreview}>
                <ThemeIcon className={classes.floatingAccount} radius="xl" size="xl" aria-label={t("items.user")}>
                  <IconUserCircle size={22} />
                </ThemeIcon>
              </div>
            )}
            <div className={classes.dashboardPreview}>
              <BoardLayoutThumbnail
                preview={previewBoard?.preview ?? null}
                label={previewBoard ? t("preview.board", { name: previewBoard.name }) : t("preview.empty")}
                className={classes.dashboardLayout}
              />
            </div>
          </Paper>
        </Box>

        <Stack className={classes.tray} gap="sm">
          {selectedItem ? (
            <Paper className={classes.configuration} p="sm" radius="md" withBorder>
              <Group justify="space-between" gap="sm" wrap="wrap">
                <Stack gap={0}>
                  <Text fw={650} size="sm">
                    {itemLabel(selectedItem)}
                  </Text>
                  <Text c="dimmed" size="xs">
                    {t("configuration.description")}
                  </Text>
                </Stack>
                <Group gap="xs">
                  {selectedItem.type === "builtin" && selectedItem.id === "search" ? (
                    <SegmentedControl
                      size="xs"
                      value={value.searchDisplay}
                      onChange={(searchDisplay) =>
                        onChange({ ...value, searchDisplay: searchDisplay as HeaderPreferences["searchDisplay"] })
                      }
                      data={[
                        { value: "input", label: t("configuration.searchDisplay.input") },
                        { value: "icon", label: t("configuration.searchDisplay.icon") },
                      ]}
                    />
                  ) : null}
                  {!isRequiredHeaderItem(selectedItem) ? (
                    <Button
                      size="xs"
                      variant="subtle"
                      color="red"
                      leftSection={<IconX size={14} />}
                      onClick={() => removeItem(selectedItem)}
                    >
                      {t("action.remove", { item: itemLabel(selectedItem) })}
                    </Button>
                  ) : (
                    <Text c="dimmed" size="xs">
                      {t("available.requiredAlways")}
                    </Text>
                  )}
                </Group>
              </Group>
            </Paper>
          ) : null}

          <Group justify="space-between" gap="xs">
            <Stack gap={0}>
              <Text fw={650} size="sm">
                {t("available.title")}
              </Text>
              <Text c="dimmed" size="xs">
                {t("available.description")}
              </Text>
            </Stack>
            <Menu position="bottom-end" withinPortal>
              <Menu.Target>
                <Button
                  size="xs"
                  variant="default"
                  leftSection={<IconPlus size={14} />}
                  disabled={availableBoards.length === 0}
                >
                  {t("available.boardShortcut")}
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>{t("available.chooseBoard")}</Menu.Label>
                {availableBoards.map((board) => (
                  <Menu.Item
                    key={board.id}
                    leftSection={
                      <Avatar src={board.logoImageUrl} size="xs" radius="sm">
                        <IconLayoutDashboard size={14} />
                      </Avatar>
                    }
                    onClick={() => addItem(createBoardHeaderItem(board.id))}
                  >
                    {board.name}
                  </Menu.Item>
                ))}
              </Menu.Dropdown>
            </Menu>
          </Group>
          <Group gap="xs">
            {inactiveBuiltinIds.length === 0 ? (
              <Text c="dimmed" size="sm">
                {t("available.allAdded")}
              </Text>
            ) : (
              inactiveBuiltinIds.map((itemId) => {
                const item = createBuiltinHeaderItem(itemId);
                const Icon = getBuiltinItemIcon(itemId);
                return (
                  <Tooltip key={itemId} label={t("available.add", { item: itemLabel(item) })}>
                    <ActionIcon
                      size="lg"
                      variant="default"
                      aria-label={t("available.add", { item: itemLabel(item) })}
                      onClick={() => addItem(item)}
                    >
                      <Icon size={19} stroke={1.7} />
                    </ActionIcon>
                  </Tooltip>
                );
              })
            )}
          </Group>
        </Stack>
      </Stack>
    </Card>
  );
};

interface SortableZoneDividerProps {
  entry: Extract<HeaderStripEntry, { kind: "divider" }>;
  index: number;
  label: string;
  showMobileBurger: boolean;
}

const SortableZoneDivider = ({ entry, index, label, showMobileBurger }: SortableZoneDividerProps) => {
  const { isDropTarget, ref } = useSortable({
    id: entry.id,
    index,
    group: headerSortableGroup,
    data: { kind: entry.kind, zone: entry.zone },
    disabled: { draggable: true, droppable: false },
    transition: null,
  });

  return (
    <div
      ref={ref}
      className={classes.zoneDelimiter}
      data-divider-zone={entry.zone}
      data-drop-target={isDropTarget || undefined}
    >
      <Divider label={label} labelPosition="center" />
      <div className={classes.zoneBoundary}>
        {showMobileBurger ? <MobileBurger /> : null}
        <span aria-hidden />
      </div>
    </div>
  );
};

const MobileBurger = () => (
  <div className={classes.mobileBurger} aria-hidden>
    <span />
    <span />
    <span />
  </div>
);

interface SortableHeaderItemProps {
  item: HeaderItem;
  index: number;
  label: string;
  previewSize: PreviewSize;
  searchDisplay: HeaderPreferences["searchDisplay"];
  boardLogo: string | null;
  configureLabel: string;
  selected: boolean;
  onSelect: (itemKey: string) => void;
}

const SortableHeaderItem = ({
  item,
  index,
  label,
  previewSize,
  searchDisplay,
  boardLogo,
  configureLabel,
  selected,
  onSelect,
}: SortableHeaderItemProps) => {
  const itemKey = getHeaderItemKey(item);
  const { handleRef, isDragging, isDropTarget, ref } = useSortable({
    id: itemKey,
    index,
    group: headerSortableGroup,
    data: { kind: "item", item },
    sensors: headerSortableSensors,
    modifiers: headerSortableModifiers,
  });

  return (
    <div
      ref={ref}
      className={classes.sortableItem}
      data-dragging={isDragging || undefined}
      data-drop-target={isDropTarget || undefined}
      data-entry-id={itemKey}
      data-selected={selected || undefined}
    >
      <button
        ref={handleRef}
        type="button"
        className={classes.itemButton}
        data-kind={item.type === "builtin" ? item.id : "board"}
        data-compact={previewSize === "mobile" || undefined}
        data-wide={
          item.type === "builtin" && item.id === "search" && searchDisplay === "input" && previewSize === "desktop"
            ? true
            : undefined
        }
        aria-label={configureLabel}
        onClick={() => onSelect(itemKey)}
      >
        <HeaderItemPreview
          item={item}
          label={label}
          compact={previewSize === "mobile"}
          searchDisplay={searchDisplay}
          boardLogo={boardLogo}
        />
      </button>
    </div>
  );
};

const HeaderItemPreview = ({
  item,
  label,
  compact,
  searchDisplay,
  boardLogo,
  overlay = false,
}: {
  item: HeaderItem;
  label: string;
  compact: boolean;
  searchDisplay: HeaderPreferences["searchDisplay"];
  boardLogo: string | null | undefined;
  overlay?: boolean;
}) => {
  const content = (
    <PreviewItem item={item} label={label} compact={compact} searchDisplay={searchDisplay} boardLogo={boardLogo} />
  );
  if (!overlay) return content;

  return (
    <div
      className={classes.dragOverlay}
      data-kind={item.type === "builtin" ? item.id : "board"}
      data-wide={
        item.type === "builtin" && item.id === "search" && searchDisplay === "input" && !compact ? true : undefined
      }
    >
      {content}
    </div>
  );
};

const PreviewItem = ({
  item,
  label,
  compact,
  searchDisplay,
  boardLogo,
}: {
  item: HeaderItem;
  label: string;
  compact: boolean;
  searchDisplay: HeaderPreferences["searchDisplay"];
  boardLogo: string | null | undefined;
}) => {
  if (item.type === "board") {
    return (
      <Avatar src={boardLogo} size={22} radius="sm">
        <IconLayoutDashboard size={17} />
      </Avatar>
    );
  }

  if (item.id === "logo") return <HomarrLogo size={26} />;

  if (item.id === "search") {
    const showInput = searchDisplay === "input" && !compact;
    return (
      <div className={classes.searchPreview} data-input={showInput || undefined}>
        <IconSearch size={18} />
        {showInput ? <span>{label}…</span> : null}
      </div>
    );
  }

  const Icon = getBuiltinItemIcon(item.id);
  return <Icon size={20} stroke={1.7} />;
};

const createHeaderStripEntries = (zones: HeaderZones): HeaderStripEntry[] =>
  headerZoneIds.flatMap((zone) => [
    ...zones[zone].map((item) => ({ id: getHeaderItemKey(item), item, kind: "item" as const })),
    { id: `header-divider:${zone}`, kind: "divider" as const, zone },
  ]);

const createHeaderZonesFromStripEntries = (entries: HeaderStripEntry[]): HeaderZones => {
  const zones: HeaderZones = { left: [], center: [], right: [] };
  let activeZone: HeaderZoneId = "left";

  for (const entry of entries) {
    if (entry.kind === "divider") {
      const dividerIndex = headerZoneIds.indexOf(entry.zone);
      const nextZone = headerZoneIds.at(dividerIndex + 1);
      if (nextZone) activeZone = nextZone;
      continue;
    }
    zones[activeZone].push(entry.item);
  }

  return zones;
};

const moveHeaderStripEntry = (entries: HeaderStripEntry[], from: number, to: number): HeaderStripEntry[] => {
  if (from === to || from < 0 || from >= entries.length || to < 0 || to >= entries.length) return entries;

  const reorderedEntries = entries.slice();
  const [movedEntry] = reorderedEntries.splice(from, 1);
  if (!movedEntry || movedEntry.kind !== "item") return entries;
  reorderedEntries.splice(to, 0, movedEntry);
  return reorderedEntries;
};

const findHeaderItem = (items: HeaderItem[], id: string | null): HeaderItem | undefined => {
  if (id === null) return undefined;
  return items.find((item) => getHeaderItemKey(item) === id);
};

const getBuiltinItemIcon = (itemId: HeaderBuiltinItemId) => {
  if (itemId === "search") return IconSearch;
  if (itemId === "home") return IconHome;
  if (itemId === "boardSwitcher") return IconReplace;
  if (itemId === "assistant") return IconRobot;
  if (itemId === "docker") return IconBrandDocker;
  if (itemId === "boardEdit") return IconPencil;
  if (itemId === "boardSettings") return IconSettings;
  if (itemId === "settings") return IconSettings;
  if (itemId === "themeToggle") return IconSunMoon;
  if (itemId === "user") return IconUserCircle;
  return IconLayoutDashboard;
};
