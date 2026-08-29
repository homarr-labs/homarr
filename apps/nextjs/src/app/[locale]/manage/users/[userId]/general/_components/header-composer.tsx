"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { PointerActivationConstraints } from "@dnd-kit/dom";
import { SortableKeyboardPlugin } from "@dnd-kit/dom/sortable";
import type { DragEndEvent } from "@dnd-kit/react";
import { DragDropProvider, DragOverlay, KeyboardSensor, PointerSensor, useDroppable } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import {
  ActionIcon,
  Avatar,
  Box,
  Button,
  Card,
  Group,
  Menu,
  Paper,
  SegmentedControl,
  Stack,
  Switch,
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
import { useSettings } from "@homarr/settings";
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

interface HeaderItemDragData {
  kind: "item";
  itemKey: string;
  zone: HeaderZoneId;
  index: number;
}

interface HeaderZoneDropData {
  kind: "zone";
  zone: HeaderZoneId;
}

type HeaderDropData = HeaderItemDragData | HeaderZoneDropData;

const headerSortableSensors = [
  PointerSensor.configure({
    activationConstraints: [new PointerActivationConstraints.Distance({ value: 6 })],
  }),
  KeyboardSensor,
];
const headerSortableGroup = "header-composer";
const headerSortablePlugins = [SortableKeyboardPlugin];
const headerGuideZones = ["left", "center", "right"] as const;

export const HeaderComposer = ({ value, onChange, boards, homeBoardId }: HeaderComposerProps) => {
  const [draggedItemKey, setDraggedItemKey] = useState<string | null>(null);
  const [selectedItemKey, setSelectedItemKey] = useState<string | null>(null);
  const zoneTableRef = useRef<HTMLDivElement>(null);
  const { branding } = useSettings();
  const t = useI18n("management.page.user.setting.general.header");
  const boardsById = useMemo(() => new Map(boards.map((board) => [board.id, board])), [boards]);
  const activeItems = getHeaderItems(value.zones);

  useEffect(() => {
    const zoneTable = zoneTableRef.current;
    if (!zoneTable) return;

    const clearSelectionFromEmptyArea = (event: PointerEvent) => {
      if (!(event.target instanceof Element)) return;
      if (event.target.closest("[data-header-composer-item]")) return;
      setSelectedItemKey(null);
    };

    zoneTable.addEventListener("pointerdown", clearSelectionFromEmptyArea);
    return () => zoneTable.removeEventListener("pointerdown", clearSelectionFromEmptyArea);
  }, []);
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
  const previewBoard = boardsById.get(homeBoardId ?? "") ?? boards.at(0);

  const toggleSelectedItem = (itemKey: string) => {
    setSelectedItemKey((currentItemKey) => {
      if (currentItemKey === itemKey) return null;
      return itemKey;
    });
  };

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
    const target = operation.target;
    if (canceled || !source || !target) return;

    const sourceData = source.data as HeaderItemDragData;
    const targetData = target.data as HeaderDropData;
    if (sourceData.kind !== "item") return;

    let targetIndex = value.zones[targetData.zone].length;
    if (targetData.kind === "item") {
      if (targetData.itemKey === sourceData.itemKey) return;
      targetIndex = targetData.index;
    }

    const nextZones = moveHeaderItem(value.zones, sourceData.itemKey, targetData.zone, targetIndex);
    if (nextZones === value.zones) return;
    updateZones(nextZones);
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
          <Group gap="sm">
            <Tooltip label={t("action.autoHideOnScrollDescription")} disabled={!value.visible}>
              <Switch
                size="sm"
                label={t("action.autoHideOnScroll")}
                checked={value.autoHideOnScroll}
                disabled={!value.visible}
                onChange={(event) => onChange({ ...value, autoHideOnScroll: event.currentTarget.checked })}
              />
            </Tooltip>
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

        <Box className={classes.stage} data-visible={value.visible}>
          <Paper className={classes.device} radius="lg" withBorder>
            {value.visible ? (
              <DragDropProvider
                onDragStart={({ operation }) => setDraggedItemKey(operation.source?.id.toString() ?? null)}
                onDragEnd={handleDragEnd}
              >
                <div className={classes.previewHeader}>
                  <div ref={zoneTableRef} className={classes.zoneTable}>
                    {headerGuideZones.map((zone) => (
                      <HeaderZoneColumn key={zone} zone={zone} label={t(`zones.${zone}` as never)}>
                        {value.zones[zone].map((item, index) => (
                          <SortableHeaderItem
                            key={getHeaderItemKey(item)}
                            item={item}
                            zone={zone}
                            index={index}
                            label={itemLabel(item)}
                            searchDisplay={value.searchDisplay}
                            logoDisplay={value.logoDisplay}
                            logoTitle={branding.appName}
                            boardLogo={
                              item.type === "board" ? (boardsById.get(item.boardId)?.logoImageUrl ?? null) : null
                            }
                            configureLabel={t("action.configure", { item: itemLabel(item) })}
                            selected={selectedItemKey === getHeaderItemKey(item)}
                            onSelect={toggleSelectedItem}
                          />
                        ))}
                      </HeaderZoneColumn>
                    ))}
                  </div>
                </div>
                <DragOverlay dropAnimation={null}>
                  {draggedItem ? (
                    <HeaderItemPreview
                      item={draggedItem}
                      label={itemLabel(draggedItem)}
                      compact={false}
                      searchDisplay={value.searchDisplay}
                      logoDisplay={value.logoDisplay}
                      logoTitle={branding.appName}
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
                  {selectedItem.type === "builtin" && selectedItem.id === "logo" ? (
                    <SegmentedControl
                      size="xs"
                      value={value.logoDisplay}
                      onChange={(logoDisplay) =>
                        onChange({ ...value, logoDisplay: logoDisplay as HeaderPreferences["logoDisplay"] })
                      }
                      data={[
                        { value: "logo", label: t("configuration.logoDisplay.logo") },
                        { value: "logoAndText", label: t("configuration.logoDisplay.logoAndText") },
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

interface HeaderZoneColumnProps {
  zone: HeaderZoneId;
  label: string;
  children: ReactNode;
}

const HeaderZoneColumn = ({ zone, label, children }: HeaderZoneColumnProps) => {
  const { isDropTarget, ref } = useDroppable({
    id: `header-zone:${zone}`,
    data: { kind: "zone", zone } satisfies HeaderZoneDropData,
  });

  return (
    <section ref={ref} className={classes.zoneColumn} data-drop-target={isDropTarget || undefined}>
      <Text className={classes.zoneColumnHeader} component="h4">
        {label}
      </Text>
      <div className={classes.zoneItems}>{children}</div>
    </section>
  );
};

interface SortableHeaderItemProps {
  item: HeaderItem;
  zone: HeaderZoneId;
  index: number;
  label: string;
  searchDisplay: HeaderPreferences["searchDisplay"];
  logoDisplay: HeaderPreferences["logoDisplay"];
  logoTitle: string;
  boardLogo: string | null;
  configureLabel: string;
  selected: boolean;
  onSelect: (itemKey: string) => void;
}

const SortableHeaderItem = ({
  item,
  zone,
  index,
  label,
  searchDisplay,
  logoDisplay,
  logoTitle,
  boardLogo,
  configureLabel,
  selected,
  onSelect,
}: SortableHeaderItemProps) => {
  const itemKey = getHeaderItemKey(item);
  const { handleRef, isDragging, isDropTarget, ref } = useSortable({
    id: itemKey,
    index,
    group: `${headerSortableGroup}:${zone}`,
    data: { kind: "item", itemKey, zone, index } satisfies HeaderItemDragData,
    sensors: headerSortableSensors,
    plugins: headerSortablePlugins,
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
        data-header-composer-item
        data-kind={item.type === "builtin" ? item.id : "board"}
        data-wide={
          (item.type === "builtin" &&
            ((item.id === "search" && searchDisplay === "input") ||
              (item.id === "logo" && logoDisplay === "logoAndText"))) ||
          undefined
        }
        aria-label={configureLabel}
        onClick={(event) => {
          event.stopPropagation();
          onSelect(itemKey);
        }}
      >
        <HeaderItemPreview
          item={item}
          label={label}
          compact={false}
          searchDisplay={searchDisplay}
          logoDisplay={logoDisplay}
          logoTitle={logoTitle}
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
  logoDisplay,
  logoTitle,
  boardLogo,
  overlay = false,
}: {
  item: HeaderItem;
  label: string;
  compact: boolean;
  searchDisplay: HeaderPreferences["searchDisplay"];
  logoDisplay: HeaderPreferences["logoDisplay"];
  logoTitle: string;
  boardLogo: string | null | undefined;
  overlay?: boolean;
}) => {
  const content = (
    <PreviewItem
      item={item}
      label={label}
      compact={compact}
      searchDisplay={searchDisplay}
      logoDisplay={logoDisplay}
      logoTitle={logoTitle}
      boardLogo={boardLogo}
    />
  );
  if (!overlay) return content;

  return (
    <div
      className={classes.dragOverlay}
      data-kind={item.type === "builtin" ? item.id : "board"}
      data-wide={
        (item.type === "builtin" &&
          !compact &&
          ((item.id === "search" && searchDisplay === "input") ||
            (item.id === "logo" && logoDisplay === "logoAndText"))) ||
        undefined
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
  logoDisplay,
  logoTitle,
  boardLogo,
}: {
  item: HeaderItem;
  label: string;
  compact: boolean;
  searchDisplay: HeaderPreferences["searchDisplay"];
  logoDisplay: HeaderPreferences["logoDisplay"];
  logoTitle: string;
  boardLogo: string | null | undefined;
}) => {
  if (item.type === "board") {
    return (
      <Avatar src={boardLogo} size={22} radius="sm">
        <IconLayoutDashboard size={17} />
      </Avatar>
    );
  }

  if (item.id === "logo") {
    return (
      <div className={classes.logoPreview} data-with-title={logoDisplay === "logoAndText" || undefined}>
        <HomarrLogo size={26} />
        {logoDisplay === "logoAndText" ? <span>{logoTitle}</span> : null}
      </div>
    );
  }

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
  itemKey: string,
  targetZone: HeaderZoneId,
  requestedTargetIndex: number,
): HeaderZones => {
  let sourceItem: HeaderItem | undefined;

  for (const zone of headerGuideZones) {
    sourceItem = zones[zone].find((item) => getHeaderItemKey(item) === itemKey);
    if (sourceItem) break;
  }

  if (!sourceItem) return zones;

  const nextZones: HeaderZones = {
    left: zones.left.filter((item) => getHeaderItemKey(item) !== itemKey),
    center: zones.center.filter((item) => getHeaderItemKey(item) !== itemKey),
    right: zones.right.filter((item) => getHeaderItemKey(item) !== itemKey),
  };
  const targetItems = nextZones[targetZone];
  const targetIndex = Math.max(0, Math.min(requestedTargetIndex, targetItems.length));
  nextZones[targetZone] = [...targetItems.slice(0, targetIndex), sourceItem, ...targetItems.slice(targetIndex)];
  return nextZones;
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
