"use client";

import type { PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Button, Group, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";

import { useCurrentLayout, useRequiredBoard } from "@homarr/boards/context";
import { useEditMode } from "@homarr/boards/edit-mode";
import { usePersistBoard } from "@homarr/boards/updater";
import { getBoardLaneColumnCount, getRootSectionLane } from "@homarr/definitions";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n, useScopedI18n } from "@homarr/translation/client";

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
  const { updateAndPersistBoard } = usePersistBoard(board);
  const t = useI18n();
  const tSelection = useScopedI18n("item.selection");

  const persistBoard = useCallback(
    (updater: (previous: typeof board) => typeof board) => {
      updateAndPersistBoard(updater, {
        onError: () => {
          showErrorNotification({
            title: tSelection("saveErrorTitle"),
            message: tSelection("saveErrorMessage"),
          });
        },
      });
    },
    [tSelection, updateAndPersistBoard],
  );

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

    persistBoard((previous) => ({
      ...previous,
      items: previous.items.filter((item) => !idsToRemove.includes(item.id)),
    }));

    const notificationId = `batch-remove-${Date.now()}`;
    showSuccessNotification({
      id: notificationId,
      title: t("common.success"),
      message: (
        <Group justify="space-between" wrap="nowrap">
          <Text size="sm">{tSelection("removed", { count })}</Text>
          <Button
            variant="subtle"
            size="compact-xs"
            onClick={() => {
              persistBoard((previous) => ({
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
  }, [board.items, clearSelection, persistBoard, selectedItemIds, t, tSelection]);

  const moveSelectedItemsToSection = useCallback(
    (targetSectionId: string) => {
      if (selectedItemIds.size === 0) return;

      const idsToMove = new Set(selectedItemIds);
      let didMoveAll = false;

      persistBoard((previous) => {
        const targetSection = previous.sections.find((section) => section.id === targetSectionId);
        const boardLayout = previous.layouts.find((layout) => layout.id === currentLayoutId);
        if (!targetSection || !boardLayout) return previous;

        const containerLayout =
          targetSection.kind === "container"
            ? targetSection.layouts.find((layout) => layout.layoutId === currentLayoutId)
            : undefined;
        const columnCount =
          targetSection.kind === "container"
            ? (containerLayout?.width ?? 0)
            : getBoardLaneColumnCount(boardLayout, getRootSectionLane(targetSection.xOffset));
        const rowCount = containerLayout?.height ?? 9999;
        if (columnCount === 0 || rowCount === 0) return previous;

        const existingContainers = previous.sections
          .filter((section): section is ContainerSection => section.kind === "container")
          .flatMap((section) => {
            const layout = section.layouts.find(
              (candidate) => candidate.layoutId === currentLayoutId && candidate.parentSectionId === targetSection.id,
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
          const layout = item.layouts.find(
            (candidate) => candidate.layoutId === currentLayoutId && candidate.sectionId === targetSection.id,
          );
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
        const movedLayouts = new Map<string, ItemLayout>();

        for (const item of previous.items.filter((candidate) => idsToMove.has(candidate.id))) {
          const currentItemLayout = item.layouts.find((layout) => layout.layoutId === currentLayoutId);
          if (!currentItemLayout) continue;

          const previousPositionIndex = occupiedPositions.findIndex((position) => position.id === item.id);
          const previousPosition =
            previousPositionIndex >= 0 ? occupiedPositions.splice(previousPositionIndex, 1).at(0) : undefined;
          const { width, height } = currentItemLayout;
          const emptyPosition =
            width <= columnCount && height <= rowCount
              ? getFirstEmptyPosition(occupiedPositions, columnCount, rowCount, { width, height })
              : undefined;

          if (!emptyPosition) {
            if (previousPosition) occupiedPositions.push(previousPosition);
            continue;
          }

          const nextLayout: ItemLayout = {
            ...currentItemLayout,
            sectionId: targetSectionId,
            xOffset: emptyPosition.xOffset,
            yOffset: emptyPosition.yOffset,
          };
          movedLayouts.set(item.id, nextLayout);
          occupiedPositions.push({ id: item.id, ...emptyPosition, width, height });
        }

        if (movedLayouts.size !== idsToMove.size) return previous;
        didMoveAll = true;
        return {
          ...previous,
          items: previous.items.map((item) => {
            const movedLayout = movedLayouts.get(item.id);
            if (!movedLayout) return item;
            return {
              ...item,
              layouts: item.layouts.map((layout) => (layout.layoutId === currentLayoutId ? movedLayout : layout)),
            };
          }),
        };
      });

      if (didMoveAll) {
        clearSelection();
      } else {
        showErrorNotification({
          title: tSelection("moveUnavailableTitle"),
          message: tSelection("moveUnavailableMessage"),
        });
      }
    },
    [clearSelection, currentLayoutId, persistBoard, selectedItemIds, tSelection],
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
