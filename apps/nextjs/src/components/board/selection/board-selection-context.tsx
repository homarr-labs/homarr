"use client";

import type { PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Button, Group, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";

import { useCurrentLayout, useRequiredBoard } from "@homarr/boards/context";
import { useEditMode } from "@homarr/boards/edit-mode";
import { useUpdateBoard } from "@homarr/boards/updater";
import { showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";

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

      updateBoard((previous) => ({
        ...previous,
        items: previous.items.map((item) =>
          !idsToMove.includes(item.id)
            ? item
            : {
                ...item,
                layouts: item.layouts.map((layout) =>
                  layout.layoutId !== currentLayoutId
                    ? layout
                    : {
                        ...layout,
                        sectionId: targetSectionId,
                      },
                ),
              },
        ),
      }));

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
