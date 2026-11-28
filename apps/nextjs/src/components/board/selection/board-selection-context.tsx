"use client";

import type { PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Button, Group, Text } from "@mantine/core";
import { useCallbackRef, useIsomorphicEffect } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";

import { useCurrentLayout, useRequiredBoard } from "@homarr/boards/context";
import { useEditMode } from "@homarr/boards/edit-mode";
import { getBoardTabs, useActiveBoardTabId } from "@homarr/boards/tabs";
import { usePersistBoard } from "@homarr/boards/updater";
import { createId } from "@homarr/common";
import { getBoardLaneColumnCount, getRootSectionLane } from "@homarr/definitions";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import { LazyLoadFeedback } from "@homarr/ui/lazy-content";

import type { ContainerSection, ItemLayout } from "~/app/[locale]/boards/_types";
import { createItemCallback } from "~/components/board/items/actions/create-item";
import { getFirstEmptyPosition } from "~/components/board/items/actions/empty-position";
import { getCrossTabMoveSnapshots } from "~/components/board/items/actions/move-entry-across-tabs";
import { commitSectionGridsCallback } from "~/components/board/sections/grid/use-grid-layout-actions";
import { moveItemsToTabCallback } from "~/components/board/tabs/tab-actions";
import { playPopSound, playTrashSound } from "../audio/board-sounds";
import type { BoardItemClipboardPayload } from "./board-item-clipboard";
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
  moveSelectedItemsToTab: (tabId: string) => void;
}

const BoardSelectionContext = createContext<BoardSelectionContextValue | null>(null);

const isEditableTarget = (target: EventTarget | null) =>
  target instanceof Element &&
  target.closest("input, textarea, select, [contenteditable='true'], [role='textbox'], [role='dialog']") !== null;

const hasTextSelection = () => {
  const selection = window.getSelection();
  return selection !== null && !selection.isCollapsed && selection.toString().trim().length > 0;
};

export const BoardSelectionProvider = ({ children }: PropsWithChildren) => {
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [isEditMode] = useEditMode();
  const board = useRequiredBoard();
  const currentLayoutId = useCurrentLayout();
  const activeTabId = useActiveBoardTabId();
  const { updateAndPersistBoard } = usePersistBoard(board);
  const tCommon = useI18n("common");
  const tSelection = useI18n("item.selection");
  const pasteSession = useRef<AbortSignal | null>(null);
  const [pasteFeedback, setPasteFeedback] = useState<{ onRetry?: () => void } | null>(null);

  useIsomorphicEffect(() => {
    setPasteFeedback(null);
    if (!isEditMode) return;

    const controller = new AbortController();
    pasteSession.current = controller.signal;
    return () => {
      controller.abort();
      pasteSession.current = null;
    };
  }, [board.id, board.name, isEditMode]);

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

  useEffect(() => {
    setSelectedItemIds((previous) => {
      if (previous.size === 0) return previous;
      return new Set();
    });
  }, [isEditMode, activeTabId, currentLayoutId]);

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

  const applyPastedItems = useCallbackRef((payload: BoardItemClipboardPayload, targetTabId: string) => {
    const pastedIds = payload.items.map(() => createId());
    let didPasteAll = false;
    persistBoard((previous) => {
      if (!getBoardTabs(previous).some(({ id }) => id === targetTabId)) return previous;

      let next = previous;
      try {
        for (const [index, item] of payload.items.entries()) {
          const id = pastedIds[index];
          if (!id) throw new Error("Missing pasted item ID");
          next = createItemCallback({ ...item, id, targetSectionId: targetTabId })(next);
          const createdItem = next.items.at(-1);
          if (createdItem?.id !== id || createdItem.layouts.some((layout) => layout.sectionId !== targetTabId)) {
            return previous;
          }
        }
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

    if (activeTabId === targetTabId) setSelectedItemIds(new Set(pastedIds));
    playPopSound();
    showSuccessNotification({
      title: tCommon("success"),
      message: tSelection("pasted", { count: pastedIds.length }),
    });
  });

  const pasteItemsFromText = useCallback(
    async function validateAndPaste(value: string, targetTabId: string, signal: AbortSignal) {
      if (signal.aborted) return;

      const loading = {};
      setPasteFeedback(loading);
      let payload: BoardItemClipboardPayload | null;
      try {
        payload = await parseBoardItemClipboard(value);
      } catch {
        if (signal.aborted) return;
        setPasteFeedback((current) => {
          if (current !== loading) return current;
          return { onRetry: () => void validateAndPaste(value, targetTabId, signal) };
        });
        return;
      }
      if (signal.aborted) return;
      setPasteFeedback((current) => {
        if (current !== loading) return current;
        return null;
      });
      if (!payload) {
        showErrorNotification({ title: tCommon("error"), message: tSelection("pasteInvalid") });
        return;
      }

      applyPastedItems(payload, targetTabId);
    },
    [applyPastedItems, tCommon, tSelection],
  );

  const pasteItems = useCallback(async () => {
    const signal = pasteSession.current;
    if (!signal || !activeTabId) return;

    try {
      await pasteItemsFromText(await navigator.clipboard.readText(), activeTabId, signal);
    } catch {
      if (!signal.aborted) showErrorNotification({ title: tCommon("error"), message: tSelection("pasteError") });
    }
  }, [activeTabId, pasteItemsFromText, tCommon, tSelection]);

  useIsomorphicEffect(() => {
    if (!isEditMode || !activeTabId) return;

    const handlePaste = (event: ClipboardEvent) => {
      const signal = pasteSession.current;
      if (!signal || isEditableTarget(event.target)) return;

      const value = event.clipboardData?.getData("text/plain") ?? "";
      if (!isBoardItemClipboardText(value)) return;
      event.preventDefault();
      void pasteItemsFromText(value, activeTabId, signal);
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [activeTabId, isEditMode, pasteItemsFromText]);

  const removeSelectedItems = useCallback(() => {
    if (selectedItemIds.size === 0) return;

    const count = selectedItemIds.size;
    const removedItems = board.items.filter((item) => selectedItemIds.has(item.id));

    playTrashSound();
    clearSelection();

    persistBoard((previous) => ({
      ...previous,
      items: previous.items.filter((item) => !selectedItemIds.has(item.id)),
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
        let next = {
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
        for (const item of previous.items) {
          if (!idsToMove.has(item.id)) continue;
          const sourceLayout = item.layouts.find((layout) => layout.layoutId === currentLayoutId);
          if (!sourceLayout) return previous;
          const snapshots = getCrossTabMoveSnapshots({
            board: next,
            currentLayoutId,
            entry: { ...sourceLayout, id: item.id, type: "item" },
            sourceSectionId: sourceLayout.sectionId,
            targetSectionId,
          });
          if (!snapshots) return previous;
          next = commitSectionGridsCallback(snapshots)(next);
        }
        didMoveAll = true;
        return next;
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

  const moveSelectedItemsToTab = useCallback(
    (tabId: string) => {
      if (selectedItemIds.size === 0) return;

      const itemIds = new Set(selectedItemIds);
      let didMoveAll = false;
      persistBoard((previous) => {
        const next = moveItemsToTabCallback({ itemIds, tabId })(previous);
        didMoveAll = next !== previous;
        return next;
      });

      if (!didMoveAll) {
        showErrorNotification({
          title: tSelection("moveUnavailableTitle"),
          message: tSelection("moveUnavailableMessage"),
        });
        return;
      }

      clearSelection();
      showSuccessNotification({
        title: tCommon("success"),
        message: tSelection("movedToTab", { count: itemIds.size }),
      });
    },
    [clearSelection, persistBoard, selectedItemIds, tCommon, tSelection],
  );

  useEffect(() => {
    if (!isEditMode || selectedItemIds.size === 0) return;

    const handleClipboard = (event: ClipboardEvent) => {
      if (!event.clipboardData || isEditableTarget(event.target) || hasTextSelection()) return;

      const selectedItems = board.items.filter((item) => selectedItemIds.has(item.id));
      let value: string;
      try {
        value = serializeBoardItemsForClipboard(selectedItems, currentLayoutId);
      } catch {
        return;
      }

      event.clipboardData.setData("text/plain", value);
      event.preventDefault();
      if (event.type === "cut") {
        removeSelectedItems();
        return;
      }

      showSuccessNotification({
        title: tCommon("success"),
        message: tSelection("copied", { count: selectedItems.length }),
      });
    };

    window.addEventListener("copy", handleClipboard);
    window.addEventListener("cut", handleClipboard);
    return () => {
      window.removeEventListener("copy", handleClipboard);
      window.removeEventListener("cut", handleClipboard);
    };
  }, [board.items, currentLayoutId, isEditMode, removeSelectedItems, selectedItemIds, tCommon, tSelection]);

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
      moveSelectedItemsToTab,
    }),
    [
      clearSelection,
      copySelectedItems,
      isSelected,
      moveSelectedItemsToSection,
      moveSelectedItemsToTab,
      pasteItems,
      removeSelectedItems,
      selectedItemIds,
      toggleSelectItem,
    ],
  );

  return (
    <BoardSelectionContext.Provider value={value}>
      {isEditMode && pasteFeedback && <LazyLoadFeedback onRetry={pasteFeedback.onRetry} />}
      {children}
    </BoardSelectionContext.Provider>
  );
};

export const useBoardSelection = () => {
  const context = useContext(BoardSelectionContext);
  if (!context) {
    throw new Error("useBoardSelection must be used within a BoardSelectionProvider");
  }
  return context;
};
