"use client";

import type { CSSProperties, ReactNode } from "react";
import { useId, useMemo, useState } from "react";
import type { DragEndEvent, UniqueIdentifier } from "@dnd-kit/core";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
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
  VisuallyHidden,
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

export const HeaderComposer = ({ value, onChange, boards, homeBoardId, mobileHomeBoardId }: HeaderComposerProps) => {
  const dndContextId = useId();
  const [previewSize, setPreviewSize] = useState<PreviewSize>("desktop");
  const [draggedItemKey, setDraggedItemKey] = useState<string | null>(null);
  const [selectedItemKey, setSelectedItemKey] = useState<string | null>(null);
  const t = useI18n("management.page.user.setting.general.header");
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space"] },
    }),
  );
  const boardsById = useMemo(() => new Map(boards.map((board) => [board.id, board])), [boards]);
  const activeItems = getHeaderItems(value.zones);
  const visibleItemKeys = activeItems.map(getHeaderItemKey);
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

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setDraggedItemKey(null);
    if (!over) return;
    const item = findHeaderItem(activeItems, active.id);
    if (!item) return;
    const sourceZone = getHeaderItemZone(value.zones, item);
    const targetZone = getDropZone(value.zones, over.id);
    if (!sourceZone || !targetZone) return;

    const targetItem = findHeaderItem(activeItems, over.id);
    let targetIndex = value.zones[targetZone].length;
    if (targetItem) {
      targetIndex = value.zones[targetZone].findIndex((candidate) => isSameItem(candidate, targetItem));
      const translatedRect = active.rect.current.translated;
      const activeCenter = translatedRect ? translatedRect.left + translatedRect.width / 2 : null;
      const targetCenter = over.rect.left + over.rect.width / 2;
      if (activeCenter !== null && activeCenter > targetCenter) targetIndex += 1;
    }
    if (targetIndex < 0) return;
    updateZones(moveHeaderItem(value.zones, item, targetZone, targetIndex));
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
              <DndContext
                id={dndContextId}
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={({ active }) => setDraggedItemKey(String(active.id))}
                onDragCancel={() => setDraggedItemKey(null)}
                onDragEnd={handleDragEnd}
              >
                <div className={classes.previewHeader}>
                  <div className={classes.stripScroller}>
                    <div className={classes.sortableStrip}>
                      <SortableContext items={visibleItemKeys} strategy={horizontalListSortingStrategy}>
                        {headerZoneIds.map((zone) => (
                          <ZoneSegment
                            key={zone}
                            zone={zone}
                            label={t(`zones.${zone}` as never)}
                            emptyLabel={t("action.dropIntoZone", { zone: t(`zones.${zone}` as never) })}
                            leading={zone === "left" ? <MobileBurger /> : null}
                            items={value.zones[zone]}
                            previewSize={previewSize}
                            searchDisplay={value.searchDisplay}
                            selectedItemKey={selectedItemKey}
                            itemLabel={itemLabel}
                            boardLogo={(boardId) => boardsById.get(boardId)?.logoImageUrl ?? null}
                            configureLabel={(item) => t("action.configure", { item: itemLabel(item) })}
                            onSelect={setSelectedItemKey}
                          />
                        ))}
                      </SortableContext>
                    </div>
                  </div>
                </div>
                <DragOverlay zIndex={1000}>
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
              </DndContext>
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

interface ZoneSegmentProps {
  zone: HeaderZoneId;
  label: string;
  emptyLabel: string;
  leading: ReactNode;
  items: HeaderItem[];
  previewSize: PreviewSize;
  searchDisplay: HeaderPreferences["searchDisplay"];
  selectedItemKey: string | null;
  itemLabel: (item: HeaderItem) => string;
  boardLogo: (boardId: string) => string | null;
  configureLabel: (item: HeaderItem) => string;
  onSelect: (itemKey: string) => void;
}

const ZoneSegment = ({
  zone,
  label,
  emptyLabel,
  leading,
  items,
  previewSize,
  searchDisplay,
  selectedItemKey,
  itemLabel,
  boardLogo,
  configureLabel,
  onSelect,
}: ZoneSegmentProps) => (
  <section className={classes.zoneSegment} data-zone={zone} aria-label={label}>
    <ZoneDelimiter zone={zone} label={label} />
    <div className={classes.zoneControls}>
      {leading}
      {items.map((item) => {
        const itemKey = getHeaderItemKey(item);
        return (
          <SortableHeaderItem
            key={itemKey}
            item={item}
            label={itemLabel(item)}
            previewSize={previewSize}
            searchDisplay={searchDisplay}
            boardLogo={item.type === "board" ? boardLogo(item.boardId) : null}
            configureLabel={configureLabel(item)}
            selected={selectedItemKey === itemKey}
            onSelect={onSelect}
          />
        );
      })}
      {items.length === 0 ? <EmptyZoneDropTarget zone={zone} label={emptyLabel} /> : null}
    </div>
  </section>
);

// Fixed reference point inside the shared sortable row; it never enters SortableContext.
const ZoneDelimiter = ({ zone, label }: { zone: HeaderZoneId; label: string }) => (
  <div className={classes.zoneDelimiter} data-zone={zone}>
    <Divider label={label} labelPosition="center" />
  </div>
);

const EmptyZoneDropTarget = ({ zone, label }: { zone: HeaderZoneId; label: string }) => {
  const { isOver, setNodeRef } = useDroppable({ id: getDropZoneId(zone) });

  return (
    <div ref={setNodeRef} className={classes.emptyZoneTarget} data-over={isOver || undefined}>
      <VisuallyHidden>{label}</VisuallyHidden>
      <span aria-hidden />
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
  label,
  previewSize,
  searchDisplay,
  boardLogo,
  configureLabel,
  selected,
  onSelect,
}: SortableHeaderItemProps) => {
  const itemKey = getHeaderItemKey(item);
  const { attributes, isDragging, listeners, setActivatorNodeRef, setNodeRef, transform, transition } = useSortable({
    id: itemKey,
  });
  const style = {
    transition,
    transform: transform ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)` : undefined,
    opacity: isDragging ? 0.2 : undefined,
  } satisfies CSSProperties;

  return (
    <div ref={setNodeRef} style={style} className={classes.sortableItem} data-selected={selected || undefined}>
      <button
        ref={setActivatorNodeRef}
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
        {...attributes}
        {...listeners}
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

const moveHeaderItem = (
  zones: HeaderZones,
  item: HeaderItem,
  targetZone: HeaderZoneId,
  targetIndex: number,
): HeaderZones => {
  const sourceZone = getHeaderItemZone(zones, item);
  if (!sourceZone) return zones;
  const sourceItems = zones[sourceZone];
  const sourceIndex = sourceItems.findIndex((candidate) => isSameItem(candidate, item));
  if (sourceIndex < 0) return zones;

  const sourceItemsWithoutMovedItem = sourceItems.filter((candidate) => !isSameItem(candidate, item));
  const targetItems = sourceZone === targetZone ? sourceItemsWithoutMovedItem : zones[targetZone];
  let normalizedTargetIndex = Math.min(Math.max(targetIndex, 0), targetItems.length);
  if (sourceZone === targetZone && sourceIndex < targetIndex) normalizedTargetIndex -= 1;
  if (sourceZone === targetZone && sourceIndex === normalizedTargetIndex) return zones;

  return {
    ...zones,
    [sourceZone]: sourceItemsWithoutMovedItem,
    [targetZone]: [...targetItems.slice(0, normalizedTargetIndex), item, ...targetItems.slice(normalizedTargetIndex)],
  };
};

const getDropZoneId = (zone: HeaderZoneId) => `header-zone-${zone}`;

const getDropZone = (zones: HeaderZones, id: UniqueIdentifier): HeaderZoneId | undefined => {
  const item = findHeaderItem(getHeaderItems(zones), id);
  if (item) return getHeaderItemZone(zones, item);
  return headerZoneIds.find((zone) => getDropZoneId(zone) === id);
};

const findHeaderItem = (items: HeaderItem[], id: UniqueIdentifier | null): HeaderItem | undefined => {
  if (id === null) return undefined;
  const itemKey = String(id);
  return items.find((item) => getHeaderItemKey(item) === itemKey);
};

const isSameItem = (first: HeaderItem, second: HeaderItem) => getHeaderItemKey(first) === getHeaderItemKey(second);

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
