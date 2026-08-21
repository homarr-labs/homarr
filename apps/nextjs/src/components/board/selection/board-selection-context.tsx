"use client";

import type { PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Button, Group, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";

import { useCurrentLayout, useRequiredBoard } from "@homarr/boards/context";
import { useEditMode } from "@homarr/boards/edit-mode";
import { useUpdateBoard } from "@homarr/boards/updater";
import { getBoardLaneColumnCount, getRootSectionLane } from "@homarr/definitions";
import { showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";

import type { ContainerSection, ItemLayout } from "~/app/[locale]/boards/_types";
import { getFirstEmptyPosition } from "~/components/board/items/actions/empty-position";
import { playPopSound, playTrashSound } from "../audio/board-sounds";

interface BoardSelectionContextValue {
  selectedItemIds: Set<string>;
  toggleSelectItem: (id: string) => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
  removeSelectedItems: () => void;
  moveSelectedItemsToSection: (sectionId: string) => void;
}

const BoardSelectionContext = createContext<BoardSelectionContextValue | null>(null);

export const BoardSelectionProvider = ({ children }: PropsWithChildren) => {
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [isEditMode] = useEditMode();
  const board = useRequiredBoard();
  const currentLayoutId = useCurrentLayout();
  const { updateBoard } = useUpdateBoard();
  const t = useI18n();

  // Clear selection if leaving edit mode
  useEffect(() => {
    if (!isEditMode) {
      setSelectedItemIds(new Set());
    }
  }, [isEditMode]);

  // Clear selection on Escape key
  useEffect(() => {
    if (selectedItemIds.size === 0) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedItemIds(new Set());
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedItemIds.size]);

  const toggleSelectItem = useCallback((id: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    playPopSound();
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedItemIds(new Set());
  }, []);

  const isSelected = useCallback((id: string) => selectedItemIds.has(id), [selectedItemIds]);

  const removeSelectedItems = useCallback(() => {
    if (selectedItemIds.size === 0) return;

    const idsToRemove = Array.from(selectedItemIds);
    const count = idsToRemove.length;
    const removedItems = board.items.filter((item) => idsToRemove.includes(item.id));

    playTrashSound();
    clearSelection();

    updateBoard((previous) => ({
      ...previous,
      items: previous.items.filter((item) => !idsToRemove.includes(item.id)),
    }));

    const notificationId = `batch-remove-${Date.now()}`;
    showSuccessNotification({
      id: notificationId,
      title: t("common.success"),
      message: (
        <Group justify="space-between" wrap="nowrap">
          <Text size="sm">{count === 1 ? "1 item removed" : `${count} items removed`}</Text>
          <Button
            variant="subtle"
            size="compact-xs"
            onClick={() => {
              updateBoard((previous) => ({
                ...previous,
                items: [...previous.items, ...removedItems],
              }));
              notifications.hide(notificationId);
            }}
          >
            {t("common.action.undo")}
          </Button>
        </Group>
      ),
      autoClose: 10_000,
    });
  }, [board.items, clearSelection, selectedItemIds, t, updateBoard]);

  const moveSelectedItemsToSection = useCallback(
    (targetSectionId: string) => {
      if (selectedItemIds.size === 0) return;

      const idsToMove = Array.from(selectedItemIds);

      updateBoard((previous) => {
        const targetSection = previous.sections.find((section) => section.id === targetSectionId);
        if (!targetSection) return previous;

        const itemsToMove = previous.items.filter((item) => idsToMove.includes(item.id));
        const untouchedItems = previous.items.filter((item) => !idsToMove.includes(item.id));

        // Map of itemId -> layoutId -> new ItemLayout
        const updatedItemLayoutsMap = new Map<string, Map<string, ItemLayout>>();
        for (const item of itemsToMove) {
          updatedItemLayoutsMap.set(item.id, new Map());
        }

        const acceptedItemIds = new Set<string>();
        const layoutsToProcess = previous.layouts.toSorted(
          (left, right) => Number(right.id === currentLayoutId) - Number(left.id === currentLayoutId),
        );

        for (const boardLayout of layoutsToProcess) {
          const containerLayout =
            targetSection.kind === "container"
              ? targetSection.layouts.find((layout) => layout.layoutId === boardLayout.id)
              : undefined;
          const columnCount =
            targetSection.kind === "container"
              ? (containerLayout?.width ?? 0)
              : getBoardLaneColumnCount(boardLayout, getRootSectionLane(targetSection.xOffset));
          const rowCount = containerLayout?.height ?? 9999;

          if (columnCount === 0 || rowCount === 0) continue;

          // Collect existing elements in targetSection for this layout (excluding items to move)
          const existingContainers = previous.sections
            .filter((section): section is ContainerSection => section.kind === "container")
            .flatMap((section) => {
              const layout = section.layouts.find(
                (l) => l.layoutId === boardLayout.id && l.parentSectionId === targetSection.id,
              );
              return layout
                ? [
                    {
                      id: section.id,
                      xOffset: layout.xOffset,
                      yOffset: layout.yOffset,
                      width: layout.width,
                      height: layout.height,
                    },
                  ]
                : [];
            });

          const existingItems = previous.items.flatMap((item) => {
            const layout = item.layouts.find((layout) => {
              return layout.layoutId === boardLayout.id && layout.sectionId === targetSection.id;
            });
            return layout
              ? [
                  {
                    id: item.id,
                    xOffset: layout.xOffset,
                    yOffset: layout.yOffset,
                    width: layout.width,
                    height: layout.height,
                  },
                ]
              : [];
          });

          const occupiedPositions = [...existingContainers, ...existingItems];

          // Place each item being moved into the first available space. The current
          // layout decides which selected items can participate in the move; items
          // that do not fit there remain untouched in every layout.
          for (const item of itemsToMove) {
            if (boardLayout.id !== currentLayoutId && !acceptedItemIds.has(item.id)) continue;

            const currentItemLayout = item.layouts.find((layout) => layout.layoutId === boardLayout.id);
            if (!currentItemLayout) continue;

            const previousPositionIndex = occupiedPositions.findIndex((position) => position.id === item.id);
            const previousPosition =
              previousPositionIndex >= 0 ? occupiedPositions.splice(previousPositionIndex, 1).at(0) : undefined;
            const { width, height } = currentItemLayout;
            if (width > columnCount || height > rowCount) {
              if (previousPosition) occupiedPositions.push(previousPosition);
              continue;
            }

            const emptyPosition = getFirstEmptyPosition(occupiedPositions, columnCount, rowCount, { width, height });
            if (!emptyPosition) {
              if (previousPosition) occupiedPositions.push(previousPosition);
              continue;
            }

            if (boardLayout.id === currentLayoutId) acceptedItemIds.add(item.id);

            const newLayout: ItemLayout = {
              layoutId: boardLayout.id,
              sectionId: targetSectionId,
              xOffset: emptyPosition.xOffset,
              yOffset: emptyPosition.yOffset,
              width,
              height,
            };

            occupiedPositions.push({
              id: item.id,
              xOffset: emptyPosition.xOffset,
              yOffset: emptyPosition.yOffset,
              width,
              height,
            });

            updatedItemLayoutsMap.get(item.id)?.set(boardLayout.id, newLayout);
          }
        }

        const updatedMovedItems = itemsToMove.map((item) => {
          const itemLayoutsMap = updatedItemLayoutsMap.get(item.id);
          const newLayouts = item.layouts.map((layout) => itemLayoutsMap?.get(layout.layoutId) ?? layout);
          return {
            ...item,
            layouts: newLayouts,
          };
        });

        return {
          ...previous,
          items: [...untouchedItems, ...updatedMovedItems],
        };
      });

      clearSelection();
    },
    [clearSelection, currentLayoutId, selectedItemIds, updateBoard],
  );

  const value = useMemo(
    () => ({
      selectedItemIds,
      toggleSelectItem,
      clearSelection,
      isSelected,
      removeSelectedItems,
      moveSelectedItemsToSection,
    }),
    [clearSelection, isSelected, moveSelectedItemsToSection, removeSelectedItems, selectedItemIds, toggleSelectItem],
  );

  return <BoardSelectionContext.Provider value={value}>{children}</BoardSelectionContext.Provider>;
};

export const useBoardSelection = () => {
  const context = useContext(BoardSelectionContext);
  if (!context) {
    throw new Error("useBoardSelection must be used within a BoardSelectionProvider");
  }
  return context;
};
