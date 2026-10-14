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
  IconLayoutGrid,
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

import { useI18n } from "../../../../../packages/translation/src/standalone/client";
import type {
  HeaderBuiltinItemId,
  HeaderItem,
  HeaderPreferences,
  HeaderZoneId,
  HeaderZones,
} from "../../../../../packages/validation/src/header-preferences";
import {
  createBoardHeaderItem,
  createBuiltinHeaderItem,
  getDefaultHeaderZone,
  getHeaderItemKey,
  getHeaderItems,
  getHeaderItemZone,
  headerBuiltinItemIds,
  isRequiredHeaderItem,
} from "../../../../../packages/validation/src/header-preferences";

import classes from "./header-composer.module.css";

export interface HeaderComposerBoard {
  readonly id: string;
  readonly name: string;
  readonly logoImageUrl: string | null;
}

export interface HeaderComposerProps {
  readonly value: HeaderPreferences;
  readonly onChange: (value: HeaderPreferences) => void;
  readonly boards: readonly HeaderComposerBoard[];
  readonly homeBoardId: string | null;
  readonly mobileHomeBoardId: string | null;
  readonly appName: string;
  readonly logo: ReactNode;
  readonly disabled?: boolean;
  readonly renderBoardPreview?: (input: {
    readonly boardId: string | null;
    readonly label: string;
    readonly className: string;
  }) => ReactNode;
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
  PointerSensor.configure({ activationConstraints: [new PointerActivationConstraints.Distance({ value: 6 })] }),
  KeyboardSensor,
];
const headerSortableGroup = "header-composer";
const headerSortablePlugins = [SortableKeyboardPlugin];
const headerGuideZones = ["left", "center", "right"] as const;

function readDropData(input: unknown): HeaderDropData | null {
  if (!input || typeof input !== "object" || !("kind" in input) || !("zone" in input)) return null;
  const { kind, zone } = input;
  if (zone !== "left" && zone !== "center" && zone !== "right") return null;
  if (kind === "zone") return { kind, zone };
  if (kind !== "item" || !("itemKey" in input) || !("index" in input)) return null;
  const { itemKey, index } = input;
  if (typeof itemKey !== "string" || typeof index !== "number" || !Number.isInteger(index) || index < 0) return null;
  return { kind, zone, itemKey, index };
}

export const HeaderComposer = ({
  value,
  onChange,
  boards,
  homeBoardId,
  appName,
  logo,
  disabled = false,
  renderBoardPreview,
}: HeaderComposerProps) => {
  const [draggedItemKey, setDraggedItemKey] = useState<string | null>(null);
  const [selectedItemKey, setSelectedItemKey] = useState<string | null>(null);
  const zoneTableRef = useRef<HTMLDivElement>(null);
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
  }, [value.visible]);
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
  const previewLabel = previewBoard ? t("preview.board", { name: previewBoard.name }) : t("preview.empty");

  const toggleSelectedItem = (itemKey: string) => {
    setSelectedItemKey((currentItemKey) => {
      if (currentItemKey === itemKey) return null;
      return itemKey;
    });
  };
  const itemLabel = (item: HeaderItem) => {
    if (item.type === "board") return boardsById.get(item.boardId)?.name ?? t("items.boardUnavailable");
    return t(`items.${item.id}`);
  };
  const updateZones = (zones: HeaderZones) => {
    if (!disabled) onChange({ ...value, zones });
  };
  const removeItem = (item: HeaderItem) => {
    if (disabled || isRequiredHeaderItem(item)) return;
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
    if (disabled || activeItemKeySet.has(itemKey)) return;
    const zone = getDefaultHeaderZone(item);
    updateZones({ ...value.zones, [zone]: [...value.zones[zone], item] });
    setSelectedItemKey(itemKey);
  };
  const handleDragEnd = ({ canceled, operation }: DragEndEvent) => {
    setDraggedItemKey(null);
    const source = operation.source;
    const target = operation.target;
    if (disabled || canceled || !source || !target) return;
    const sourceData = readDropData(source.data);
    const targetData = readDropData(target.data);
    if (!sourceData || sourceData.kind !== "item" || !targetData) return;
    let targetIndex = value.zones[targetData.zone].length;
    if (targetData.kind === "item") {
      if (targetData.itemKey === sourceData.itemKey) return;
      targetIndex = targetData.index;
    }
    const nextZones = moveHeaderItem(value.zones, sourceData.itemKey, targetData.zone, targetIndex);
    if (nextZones !== value.zones) updateZones(nextZones);
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
            <Tooltip label={value.visible ? t("action.hide") : t("action.show")}>
              <ActionIcon
                size="lg"
                variant={value.visible ? "default" : "filled"}
                disabled={disabled}
                aria-label={value.visible ? t("action.hide") : t("action.show")}
                onClick={() => {
                  if (!disabled) onChange({ ...value, visible: !value.visible });
                }}
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
                      <HeaderZoneColumn key={zone} zone={zone} label={t(`zones.${zone}`)} disabled={disabled}>
                        {value.zones[zone].map((item, index) => (
                          <SortableHeaderItem
                            key={getHeaderItemKey(item)}
                            item={item}
                            zone={zone}
                            index={index}
                            label={itemLabel(item)}
                            searchDisplay={value.searchDisplay}
                            logoDisplay={value.logoDisplay}
                            logoTitle={appName}
                            logo={logo}
                            boardLogo={
                              item.type === "board" ? (boardsById.get(item.boardId)?.logoImageUrl ?? null) : null
                            }
                            configureLabel={t("action.configure", { item: itemLabel(item) })}
                            selected={selectedItemKey === getHeaderItemKey(item)}
                            onSelect={toggleSelectedItem}
                            disabled={disabled}
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
                      logoTitle={appName}
                      logo={logo}
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
              {renderBoardPreview ? (
                renderBoardPreview({
                  boardId: previewBoard?.id ?? null,
                  label: previewLabel,
                  className: classes.dashboardLayout ?? "",
                })
              ) : (
                <Box
                  className={classes.dashboardLayout}
                  component="figure"
                  aria-label={previewLabel}
                  display="grid"
                  style={{ placeItems: "center" }}
                >
                  <IconLayoutGrid size={28} stroke={1.4} aria-hidden />
                </Box>
              )}
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
                      disabled={disabled}
                      value={value.searchDisplay}
                      onChange={(searchDisplay) => {
                        if (!disabled && (searchDisplay === "input" || searchDisplay === "icon"))
                          onChange({ ...value, searchDisplay });
                      }}
                      data={[
                        { value: "input", label: t("configuration.searchDisplay.input") },
                        { value: "icon", label: t("configuration.searchDisplay.icon") },
                      ]}
                    />
                  ) : null}
                  {selectedItem.type === "builtin" && selectedItem.id === "logo" ? (
                    <SegmentedControl
                      size="xs"
                      disabled={disabled}
                      value={value.logoDisplay}
                      onChange={(logoDisplay) => {
                        if (!disabled && (logoDisplay === "logo" || logoDisplay === "logoAndText"))
                          onChange({ ...value, logoDisplay });
                      }}
                      data={[
                        { value: "logo", label: t("configuration.logoDisplay.logo") },
                        { value: "logoAndText", label: t("configuration.logoDisplay.logoAndText") },
                      ]}
                    />
                  ) : null}
                  {!isRequiredHeaderItem(selectedItem) ? (
                    <Button
                      type="button"
                      size="xs"
                      variant="subtle"
                      color="red"
                      disabled={disabled}
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
                  type="button"
                  size="xs"
                  variant="default"
                  leftSection={<IconPlus size={14} />}
                  disabled={disabled || availableBoards.length === 0}
                >
                  {t("available.boardShortcut")}
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>{t("available.chooseBoard")}</Menu.Label>
                {availableBoards.map((board) => (
                  <Menu.Item
                    key={board.id}
                    disabled={disabled}
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
                      disabled={disabled}
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

const HeaderZoneColumn = ({
  zone,
  label,
  children,
  disabled,
}: {
  zone: HeaderZoneId;
  label: string;
  children: ReactNode;
  disabled: boolean;
}) => {
  const { isDropTarget, ref } = useDroppable({
    id: `header-zone:${zone}`,
    disabled,
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

interface HeaderItemPreviewProps {
  item: HeaderItem;
  label: string;
  compact: boolean;
  searchDisplay: HeaderPreferences["searchDisplay"];
  logoDisplay: HeaderPreferences["logoDisplay"];
  logoTitle: string;
  logo: ReactNode;
  boardLogo: string | null | undefined;
}

interface SortableHeaderItemProps extends Omit<HeaderItemPreviewProps, "compact"> {
  zone: HeaderZoneId;
  index: number;
  configureLabel: string;
  selected: boolean;
  disabled: boolean;
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
  logo,
  boardLogo,
  configureLabel,
  selected,
  disabled,
  onSelect,
}: SortableHeaderItemProps) => {
  const itemKey = getHeaderItemKey(item);
  const { handleRef, isDragging, isDropTarget, ref } = useSortable({
    id: itemKey,
    index,
    group: `${headerSortableGroup}:${zone}`,
    disabled,
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
        disabled={disabled}
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
          logo={logo}
          boardLogo={boardLogo}
        />
      </button>
    </div>
  );
};

const HeaderItemPreview = ({ overlay = false, ...props }: HeaderItemPreviewProps & { overlay?: boolean }) => {
  const { item, compact, searchDisplay, logoDisplay } = props;
  const content = <PreviewItem {...props} />;
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
  logo,
  boardLogo,
}: HeaderItemPreviewProps) => {
  if (item.type === "board")
    return (
      <Avatar src={boardLogo} size={22} radius="sm">
        <IconLayoutDashboard size={17} />
      </Avatar>
    );
  if (item.id === "logo")
    return (
      <div className={classes.logoPreview} data-with-title={logoDisplay === "logoAndText" || undefined}>
        {logo}
        {logoDisplay === "logoAndText" ? <span>{logoTitle}</span> : null}
      </div>
    );
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

export const moveHeaderItem = (
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
