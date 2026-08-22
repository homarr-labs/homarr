"use client";

import type { PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Button, Group, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";

import { useCurrentLayout, useRequiredBoard } from "@homarr/boards/context";
import { useEditMode } from "@homarr/boards/edit-mode";
import { usePersistBoard } from "@homarr/boards/updater";
import { createId } from "@homarr/common";
import { getBoardLaneColumnCount, getRootSectionLane } from "@homarr/definitions";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";

import type { ContainerSection, ItemLayout } from "~/app/[locale]/boards/_types";
import { createItemCallback } from "~/components/board/items/actions/create-item";
import { getFirstEmptyPosition } from "~/components/board/items/actions/empty-position";
import { playPopSound, playTrashSound } from "../audio/board-sounds";
import {
  isBoardItemClipboardText,
  parseBoardItemClipboard,
  serializeBoardItemsForClipboard,
} from "./board-item-clipboard";

interface BoardSelectionContextValue {
  selectedItemIds: Set<string>;
  toggleSelectItem: (id: string) => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
  copySelectedItems: () => Promise<void>;
  pasteItems: () => Promise<void>;
  removeSelectedItems: () => void;
  moveSelectedItemsToSection: (sectionId: string, maxRowCount?: number | null) => void;
}

const BoardSelectionContext = createContext<BoardSelectionContextValue | null>(null);

export const BoardSelectionProvider = ({ children }: PropsWithChildren) => {
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [isEditMode] = useEditMode();
  const board = useRequiredBoard();
  const currentLayoutId = useCurrentLayout();
  const { updateAndPersistBoard } = usePersistBoard(board);
  const tCommon = useI18n("common");
  const tSelection = useI18n("item.selection");

  const persistBoard = useCallback(
    (updater: (previous: typeof board) => typeof board) =>
      updateAndPersistBoard(updater, {
        onError: () => {
          showErrorNotification({
            title: tSelection("saveErrorTitle"),
            message: tSelection("saveErrorMessage"),
          });
        },
      }),
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

  const copySelectedItems = useCallback(async () => {
    const selectedItems = board.items.filter((item) => selectedItemIds.has(item.id));
    if (selectedItems.length === 0) return;

    try {
      const value = serializeBoardItemsForClipboard(selectedItems, currentLayoutId);
      await navigator.clipboard.writeText(value);
      showSuccessNotification({
        title: tCommon("success"),
        message: tSelection("copied", { count: selectedItems.length }),
      });
    } catch {
      showErrorNotification({
        title: tCommon("error"),
        message: tSelection("copyError"),
      });
    }
  }, [board.items, currentLayoutId, selectedItemIds, tCommon, tSelection]);

  const pasteItemsFromText = useCallback(
    (value: string) => {
      const payload = parseBoardItemClipboard(value);
      if (!payload) {
        showErrorNotification({ title: tCommon("error"), message: tSelection("pasteInvalid") });
        return;
      }

      const pastedIds = payload.items.map(() => createId());
      let didPasteAll = false;
      persistBoard((previous) => {
        let next = previous;
        try {
          payload.items.forEach((item, index) => {
            const id = pastedIds[index];
            if (!id) throw new Error("Missing pasted item ID");
            next = createItemCallback({ ...item, id })(next);
          });
        } catch {
          return previous;
        }

        didPasteAll = next.items.length === previous.items.length + payload.items.length;
        return didPasteAll ? next : previous;
      });

      if (!didPasteAll) {
        showErrorNotification({ title: tCommon("error"), message: tSelection("pasteUnavailable") });
        return;
      }

      setSelectedItemIds(new Set(pastedIds));
      playPopSound();
      showSuccessNotification({
        title: tCommon("success"),
        message: tSelection("pasted", { count: pastedIds.length }),
      });
    },
    [persistBoard, tCommon, tSelection],
  );

  const pasteItems = useCallback(async () => {
    try {
      pasteItemsFromText(await navigator.clipboard.readText());
    } catch {
      showErrorNotification({ title: tCommon("error"), message: tSelection("pasteError") });
    }
  }, [pasteItemsFromText, tCommon, tSelection]);

  useEffect(() => {
    if (!isEditMode) return;

    const handlePaste = (event: ClipboardEvent) => {
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest("input, textarea, select, [contenteditable='true'], [role='textbox']")
      )
        return;

      const value = event.clipboardData?.getData("text/plain") ?? "";
      if (!isBoardItemClipboardText(value)) return;
      event.preventDefault();
      pasteItemsFromText(value);
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [isEditMode, pasteItemsFromText]);

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
      title: tCommon("success"),
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
            {tCommon("action.undo")}
          </Button>
        </Group>
      ),
      autoClose: 10_000,
    });
  }, [board.items, clearSelection, persistBoard, selectedItemIds, tCommon, tSelection]);

  const moveSelectedItemsToSection = useCallback(
    (targetSectionId: string, maxRowCount?: number | null) => {
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
        const rowCount = containerLayout?.height ?? maxRowCount ?? 9999;
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
      copySelectedItems,
      pasteItems,
      removeSelectedItems,
      moveSelectedItemsToSection,
    }),
    [
      clearSelection,
      copySelectedItems,
      isSelected,
      moveSelectedItemsToSection,
      pasteItems,
      removeSelectedItems,
      selectedItemIds,
      toggleSelectItem,
    ],
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
