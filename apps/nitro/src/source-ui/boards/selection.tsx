import type { PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Alert, Text } from "@mantine/core";
import { useBoardRuntime } from "./runtime";
import { getGridColumns, getGridPlacements, validateBoardDraft } from "../../features/boards/draft";
import { getBoardAccess } from "../../features/boards/contracts";
import { getFirstEmptyPosition } from "./empty-position";
import { createClipboardItem } from "./create-item";
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
  const [message, setMessage] = useState<{ color: "red" | "blue"; value: string } | null>(null);
  const runtime = useBoardRuntime();
  const { board, layout, editing, resources, identity, onUpdate } = runtime;
  const currentRuntime = useRef(runtime);
  useLayoutEffect(() => {
    currentRuntime.current = runtime;
  }, [runtime]);
  const lifetime = useRef(0);
  useEffect(() => {
    lifetime.current += 1;
    return () => {
      lifetime.current += 1;
    };
  }, [editing, identity.resourceKey, layout.id]);
  useEffect(() => {
    setSelectedItemIds(
      (current) => new Set([...current].filter((id) => editing && board.items.some((item) => item.id === id))),
    );
  }, [board.items, editing]);
  useEffect(() => {
    if (selectedItemIds.size === 0) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedItemIds(new Set());
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedItemIds.size]);
  const toggleSelectItem = useCallback(
    (id: string) =>
      setSelectedItemIds((previous) => {
        const next = new Set(previous);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
    [],
  );
  const clearSelection = useCallback(() => setSelectedItemIds(new Set()), []);
  const isSelected = useCallback((id: string) => selectedItemIds.has(id), [selectedItemIds]);
  const copySelectedItems = useCallback(async () => {
    const selectedItems = board.items.filter((item) => selectedItemIds.has(item.id));
    if (selectedItems.length === 0) return;
    try {
      await navigator.clipboard.writeText(serializeBoardItemsForClipboard(selectedItems, layout.id));
      setMessage({ color: "blue", value: `${selectedItems.length} items copied` });
    } catch {
      setMessage({ color: "red", value: "Clipboard access failed. Use the browser clipboard shortcut." });
    }
  }, [board.items, layout.id, selectedItemIds]);
  const pasteItemsFromText = useCallback((value: string) => {
    const context = currentRuntime.current;
    if (!context.editing || !context.onUpdate) return;
    const payload = parseBoardItemClipboard(value);
    if (!payload) {
      setMessage({ color: "red", value: "The clipboard does not contain valid Homarr board items" });
      return;
    }
    try {
      const pastedIds = payload.items.map(() => context.resources.common.createId());
      const apply = (previous: typeof board) => {
        const active = currentRuntime.current;
        const access = getBoardAccess(active.board, active.identity);
        if (
          !active.editing ||
          active.board.id !== context.board.id ||
          active.layout.id !== context.layout.id ||
          active.identity.resourceKey !== context.identity.resourceKey ||
          (!access.modify && !active.syntheticPreview)
        )
          throw new Error("The board is no longer available for this paste");
        if (
          payload.items.some((item) => item.kind === "customApi") &&
          (!access.modify || !active.identity.permissions.includes("admin"))
        )
          throw new Error("Only current board modifiers with administrator permission can add Custom Widgets");
        let next = previous;
        payload.items.forEach((item, index) => {
          const id = pastedIds[index];
          if (!id) throw new Error("Missing pasted item ID");
          next = createClipboardItem(next, item, id, active.resources);
        });
        return validateBoardDraft(next, active.resources);
      };
      apply(context.board);
      context.onUpdate(apply);
      setSelectedItemIds(new Set(pastedIds));
      setMessage({ color: "blue", value: `${pastedIds.length} items pasted into the local draft. Not saved.` });
    } catch (error) {
      setMessage({ color: "red", value: error instanceof Error ? error.message : "Items cannot be pasted here" });
    }
  }, []);
  const pasteItems = useCallback(async () => {
    const generation = lifetime.current;
    try {
      const value = await navigator.clipboard.readText();
      if (generation === lifetime.current) pasteItemsFromText(value);
    } catch {
      if (generation === lifetime.current)
        setMessage({ color: "red", value: "Clipboard access failed. Use the browser paste shortcut." });
    }
  }, [pasteItemsFromText]);
  useEffect(() => {
    if (!editing) return;
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
  }, [editing, pasteItemsFromText]);
  useEffect(() => {
    if (!editing) return;
    const handleCopy = (event: ClipboardEvent) => {
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest("input, textarea, select, [contenteditable='true'], [role='textbox']")
      )
        return;
      const items = board.items.filter((item) => selectedItemIds.has(item.id));
      if (items.length === 0 || !event.clipboardData) return;
      try {
        event.clipboardData.setData("text/plain", serializeBoardItemsForClipboard(items, layout.id));
        event.preventDefault();
      } catch {
        setMessage({ color: "red", value: "Selected items could not be copied" });
      }
    };
    window.addEventListener("copy", handleCopy);
    return () => window.removeEventListener("copy", handleCopy);
  }, [board.items, editing, layout.id, selectedItemIds]);
  const removeSelectedItems = useCallback(() => {
    if (!editing || !onUpdate || selectedItemIds.size === 0) return;
    const idsToRemove = new Set(selectedItemIds);
    onUpdate((previous) => ({ ...previous, items: previous.items.filter((item) => !idsToRemove.has(item.id)) }));
    clearSelection();
    setMessage({ color: "blue", value: "Items removed from the local draft. Use Undo change to restore them." });
  }, [clearSelection, editing, onUpdate, selectedItemIds]);
  const moveSelectedItemsToSection = useCallback(
    (targetSectionId: string, maxRowCount?: number | null) => {
      if (!editing || !onUpdate || selectedItemIds.size === 0) return;
      const apply = (previous: typeof board) => {
        const targetSection = previous.sections.find((section) => section.id === targetSectionId);
        if (!targetSection) throw new Error("Destination section not found");
        const containerLayout =
          targetSection.kind === "container"
            ? targetSection.layouts.find((candidate) => candidate.layoutId === layout.id)
            : undefined;
        const columnCount = getGridColumns(previous, layout.id, targetSectionId, resources);
        const rowCount = containerLayout?.height ?? maxRowCount ?? 9999;
        if (columnCount === 0 || rowCount === 0) throw new Error("Items do not fit in the destination");
        const occupiedPositions = getGridPlacements(previous, layout.id, targetSectionId).map((placement) => ({
          id: placement.id,
          xOffset: placement.x,
          yOffset: placement.y,
          width: placement.w,
          height: placement.h,
        }));
        const movedLayouts = new Map<string, (typeof board.items)[number]["layouts"][number]>();
        for (const item of previous.items.filter((candidate) => selectedItemIds.has(candidate.id))) {
          const currentItemLayout = item.layouts.find((candidate) => candidate.layoutId === layout.id);
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
          const nextLayout = {
            ...currentItemLayout,
            sectionId: targetSectionId,
            xOffset: emptyPosition.xOffset,
            yOffset: emptyPosition.yOffset,
          };
          movedLayouts.set(item.id, nextLayout);
          occupiedPositions.push({ id: item.id, ...emptyPosition, width, height });
        }
        if (movedLayouts.size !== selectedItemIds.size)
          throw new Error("The whole selection does not fit. No items were moved.");
        return validateBoardDraft(
          {
            ...previous,
            items: previous.items.map((item) => {
              const movedLayout = movedLayouts.get(item.id);
              if (!movedLayout) return item;
              return {
                ...item,
                layouts: item.layouts.map((candidate) => (candidate.layoutId === layout.id ? movedLayout : candidate)),
              };
            }),
          },
          resources,
        );
      };
      try {
        apply(board);
        onUpdate(apply);
        clearSelection();
      } catch (error) {
        setMessage({ color: "red", value: error instanceof Error ? error.message : "Items cannot be moved here" });
      }
    },
    [board, clearSelection, editing, layout.id, onUpdate, resources, selectedItemIds],
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
  return (
    <BoardSelectionContext.Provider value={value}>
      {message && (
        <Alert color={message.color} withCloseButton onClose={() => setMessage(null)}>
          <Text size="sm">{message.value}</Text>
        </Alert>
      )}
      {children}
    </BoardSelectionContext.Provider>
  );
};
export const useBoardSelection = () => {
  const context = useContext(BoardSelectionContext);
  if (!context) throw new Error("BoardSelectionProvider is required");
  return context;
};
