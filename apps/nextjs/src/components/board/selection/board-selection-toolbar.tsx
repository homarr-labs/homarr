"use client";

import {
  ActionIcon,
  Avatar,
  Button,
  Divider,
  Group,
  HoverCard,
  Menu,
  Paper,
  ScrollArea,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { IconCheck, IconClipboard, IconCopy, IconFolderShare, IconTrash, IconX } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useCurrentLayout, useRequiredBoard } from "@homarr/boards/context";
import { useEditMode } from "@homarr/boards/edit-mode";
import { getBoardLaneColumnCount, getRootSectionLane, getWidgetName } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";
import { widgetCatalogIcons } from "@homarr/widgets/catalog";

import type { EmptySection } from "~/app/[locale]/boards/_types";
import { useRegisteredGridEditors } from "~/components/board/sections/grid/grid-editor-registry";
import { useBoardSelection } from "./board-selection-context";

const MAX_AVATARS_DISPLAYED = 5;

export const BoardSelectionToolbar = () => {
  const [isEditMode] = useEditMode();
  const {
    selectedItemIds,
    clearSelection,
    copySelectedItems,
    pasteItems,
    removeSelectedItems,
    moveSelectedItemsToSection,
  } = useBoardSelection();
  const board = useRequiredBoard();
  const registeredGridEditors = useRegisteredGridEditors();
  const currentLayoutId = useCurrentLayout();
  const currentLayout = board.layouts.find((layout) => layout.id === currentLayoutId);
  const t = useI18n();
  const tSelection = useI18n("item.selection");

  const selectedItems = board.items.filter((item) => selectedItemIds.has(item.id));
  const hasAppWidgets = selectedItems.some((item) => item.kind === "app");
  const { data: selectableApps } = clientApi.app.selectable.useQuery(undefined, {
    enabled: hasAppWidgets,
  });

  if (!isEditMode || selectedItemIds.size === 0) return null;

  const appMap = new Map((selectableApps ?? []).map((app) => [app.id, app]));

  // Sort items so apps appear first
  const sortedSelectedItems = selectedItems.toSorted((itemA, itemB) => {
    if (itemA.kind === "app" && itemB.kind !== "app") return -1;
    if (itemA.kind !== "app" && itemB.kind === "app") return 1;
    return 0;
  });

  const getItemDetails = (item: (typeof selectedItems)[number]) => {
    let displayName = item.advancedOptions.title?.trim();
    let iconUrl: string | undefined = undefined;
    const IconComponent = widgetCatalogIcons[item.kind] ?? IconCheck;

    if (item.kind === "app") {
      const appId = (item.options as { appId?: string })?.appId;
      const app = appId ? appMap.get(appId) : undefined;
      if (!displayName) {
        displayName = app?.name || getWidgetName("app", t);
      }
      if (app?.iconUrl) {
        iconUrl = app.iconUrl;
      }
    }

    if (!displayName) {
      displayName = getWidgetName(item.kind, t);
    }

    return { displayName, iconUrl, IconComponent, kind: item.kind };
  };

  const visibleItems = sortedSelectedItems.slice(0, MAX_AVATARS_DISPLAYED);
  const overflowCount = sortedSelectedItems.length - visibleItems.length;

  const mainCanvasSection = board.sections
    .filter(
      (section): section is EmptySection => section.kind === "empty" && getRootSectionLane(section.xOffset) === "main",
    )
    .toSorted((sectionA, sectionB) => sectionA.yOffset - sectionB.yOffset)
    .at(0);

  const placementOptions = [
    ...(mainCanvasSection
      ? [
          {
            value: mainCanvasSection.id,
            label: t("item.create.destination.mainCanvas"),
            maxRowCount: null,
          },
        ]
      : []),
    ...board.sections.flatMap((section) => {
      if (section.kind !== "empty") return [];
      const lane = getRootSectionLane(section.xOffset);
      if (lane === "main" || !currentLayout || getBoardLaneColumnCount(currentLayout, lane) === 0) return [];
      return [
        {
          value: section.id,
          label: t(`item.create.destination.${lane === "left" ? "leftRail" : "rightRail"}`),
          maxRowCount: registeredGridEditors.get(section.id)?.placementMaxRowCount,
        },
      ];
    }),
    ...board.sections
      .filter((section) => section.kind === "container")
      .map((section) => ({
        value: section.id,
        label: section.options.title.trim() || t("section.container.untitled"),
        maxRowCount: section.layouts.find((layout) => layout.layoutId === currentLayoutId)?.height,
      })),
  ];

  return (
    <Paper
      withBorder
      shadow="xl"
      radius="xl"
      p="xs"
      bg="light-dark(var(--mantine-color-body), var(--mantine-color-dark-7))"
      style={{
        position: "fixed",
        bottom: 28,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1000,
        width: "max-content",
        maxWidth: "calc(100vw - 1rem)",
        boxShadow: "0 12px 40px rgba(0, 0, 0, 0.28)",
        backdropFilter: "blur(14px)",
        border: "1px solid var(--mantine-color-default-border)",
        animation: "slideUp 200ms cubic-bezier(0.4, 0, 0.2, 1) forwards",
      }}
    >
      <Group gap="xs" wrap="nowrap">
        {/* Avatar Group with HoverCard Popover showing all items */}
        <HoverCard position="top" withArrow shadow="xl" radius="md" openDelay={100} closeDelay={200} withinPortal>
          <HoverCard.Target>
            <UnstyledButton
              display="inline-flex"
              aria-label={tSelection("summary", { count: sortedSelectedItems.length })}
              style={{ alignItems: "center", borderRadius: "var(--mantine-radius-xl)" }}
            >
              <Avatar.Group>
                {visibleItems.map((item) => {
                  const { displayName, iconUrl, IconComponent } = getItemDetails(item);
                  return (
                    <Avatar
                      key={item.id}
                      src={iconUrl}
                      radius="xl"
                      size={32}
                      color="primaryColor"
                      variant="light"
                      styles={{ image: { objectFit: "contain", padding: 2 } }}
                      alt={displayName}
                    >
                      {!iconUrl && <IconComponent size={16} />}
                    </Avatar>
                  );
                })}
                {overflowCount > 0 && (
                  <Avatar radius="xl" size={32} color="gray" variant="filled">
                    +{overflowCount}
                  </Avatar>
                )}
              </Avatar.Group>
            </UnstyledButton>
          </HoverCard.Target>

          <HoverCard.Dropdown p={6} style={{ width: 220 }}>
            <Stack gap={4}>
              <Text size="10px" fw={700} c="dimmed" tt="uppercase" px={4}>
                {tSelection("selected", { count: sortedSelectedItems.length })}
              </Text>

              <ScrollArea.Autosize mah={176} type="auto">
                <Stack gap={2}>
                  {sortedSelectedItems.map((item) => {
                    const { displayName, iconUrl, IconComponent } = getItemDetails(item);
                    return (
                      <Group key={item.id} gap={6} wrap="nowrap" px={4} py={2}>
                        <Avatar
                          src={iconUrl}
                          radius="sm"
                          size={22}
                          color="primaryColor"
                          variant="light"
                          styles={{ image: { objectFit: "contain", padding: 2 } }}
                          alt={displayName}
                        >
                          {!iconUrl && <IconComponent size={12} />}
                        </Avatar>
                        <Text size="xs" fw={500} truncate>
                          {displayName}
                        </Text>
                      </Group>
                    );
                  })}
                </Stack>
              </ScrollArea.Autosize>
            </Stack>
          </HoverCard.Dropdown>
        </HoverCard>

        <Divider orientation="vertical" />

        {/* Actions */}
        <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
          <Button
            size="xs"
            variant="light"
            color="blue"
            leftSection={<IconCopy size={15} />}
            onClick={() => void copySelectedItems()}
          >
            {tSelection("copy")}
          </Button>

          <Tooltip label={tSelection("pasteShortcut")} withArrow>
            <Button
              size="xs"
              variant="light"
              color="blue"
              leftSection={<IconClipboard size={15} />}
              onClick={() => void pasteItems()}
            >
              {tSelection("paste")}
            </Button>
          </Tooltip>

          {placementOptions.length > 1 && (
            <Menu position="top" withArrow shadow="md">
              <Menu.Target>
                <Button size="xs" variant="light" color="primaryColor" leftSection={<IconFolderShare size={15} />}>
                  {tSelection("move")}
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>{tSelection("moveTo")}</Menu.Label>
                {placementOptions.map((opt) => (
                  <Menu.Item
                    key={opt.value}
                    disabled={opt.maxRowCount === undefined}
                    onClick={() => moveSelectedItemsToSection(opt.value, opt.maxRowCount)}
                  >
                    {opt.label}
                  </Menu.Item>
                ))}
              </Menu.Dropdown>
            </Menu>
          )}

          <Button
            size="xs"
            variant="light"
            color="red"
            leftSection={<IconTrash size={15} />}
            onClick={removeSelectedItems}
          >
            {tSelection("delete")}
          </Button>

          <Tooltip label={tSelection("clearShortcut")} withArrow>
            <ActionIcon
              size="sm"
              variant="subtle"
              color="gray"
              onClick={clearSelection}
              aria-label={tSelection("clear")}
            >
              <IconX size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>
    </Paper>
  );
};
