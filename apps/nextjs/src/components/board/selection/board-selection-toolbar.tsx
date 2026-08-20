"use client";

import { ActionIcon, Badge, Button, Group, Menu, Paper, Text, Tooltip } from "@mantine/core";
import { IconCheck, IconFolderShare, IconTrash, IconX } from "@tabler/icons-react";

import { useCurrentLayout, useRequiredBoard } from "@homarr/boards/context";
import { useEditMode } from "@homarr/boards/edit-mode";
import { getBoardLaneColumnCount, getRootSectionLane } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";

import type { EmptySection } from "~/app/[locale]/boards/_types";
import { useBoardSelection } from "./board-selection-context";

export const BoardSelectionToolbar = () => {
  const [isEditMode] = useEditMode();
  const { selectedItemIds, clearSelection, removeSelectedItems, moveSelectedItemsToSection } = useBoardSelection();
  const board = useRequiredBoard();
  const currentLayoutId = useCurrentLayout();
  const currentLayout = board.layouts.find((layout) => layout.id === currentLayoutId);
  const t = useI18n();

  if (!isEditMode || selectedItemIds.size === 0) return null;

  const count = selectedItemIds.size;

  const mainCanvasSection = board.sections
    .filter(
      (section): section is EmptySection => section.kind === "empty" && getRootSectionLane(section.xOffset) === "main",
    )
    .toSorted((sectionA, sectionB) => sectionA.yOffset - sectionB.yOffset)
    .at(0);

  const placementOptions = [
    ...(mainCanvasSection ? [{ value: mainCanvasSection.id, label: t("item.create.destination.mainCanvas") }] : []),
    ...board.sections.flatMap((section) => {
      if (section.kind !== "empty") return [];
      const lane = getRootSectionLane(section.xOffset);
      if (lane === "main" || !currentLayout || getBoardLaneColumnCount(currentLayout, lane) === 0) return [];
      return [
        {
          value: section.id,
          label: t(`item.create.destination.${lane === "left" ? "leftRail" : "rightRail"}`),
        },
      ];
    }),
    ...board.sections
      .filter((section) => section.kind === "container")
      .map((section) => ({
        value: section.id,
        label: section.options.title.trim() || t("section.container.untitled"),
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
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.24)",
        backdropFilter: "blur(12px)",
        border: "1px solid var(--mantine-color-default-border)",
        animation: "slideUp 200ms cubic-bezier(0.4, 0, 0.2, 1) forwards",
      }}
    >
      <Group gap="sm" wrap="nowrap">
        <Badge size="lg" radius="xl" variant="filled" color="primaryColor" leftSection={<IconCheck size={14} />}>
          {count === 1 ? "1 item" : `${count} items`}
        </Badge>

        {placementOptions.length > 1 && (
          <Menu position="top" withArrow shadow="md">
            <Menu.Target>
              <Button size="xs" variant="light" color="primaryColor" leftSection={<IconFolderShare size={15} />}>
                Move to section
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>Choose destination section</Menu.Label>
              {placementOptions.map((opt) => (
                <Menu.Item key={opt.value} onClick={() => moveSelectedItemsToSection(opt.value)}>
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
          Remove
        </Button>

        <Tooltip label="Deselect (Escape)" withArrow>
          <ActionIcon size="sm" variant="subtle" color="gray" onClick={clearSelection} aria-label="Clear selection">
            <IconX size={14} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Paper>
  );
};
