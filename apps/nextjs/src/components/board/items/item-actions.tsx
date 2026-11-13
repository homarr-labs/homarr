import { useCallback } from "react";

import { useCurrentLayout } from "@homarr/boards/context";
import { useActiveBoardTabId } from "@homarr/boards/tabs";
import { useUpdateBoard } from "@homarr/boards/updater";
import type { BoardItemAdvancedOptions } from "@homarr/validation/shared";

import type { CreateItemInput } from "./actions/create-item";
import { createItemCallback } from "./actions/create-item";
import type { DuplicateItemInput } from "./actions/duplicate-item";
import { duplicateItemCallback } from "./actions/duplicate-item";
import type { MoveAndResizeItemInput } from "./actions/move-and-resize-item";
import { moveAndResizeItemCallback } from "./actions/move-and-resize-item";
import type { MoveItemToSectionInput } from "./actions/move-item-to-section";
import { moveItemToSectionCallback } from "./actions/move-item-to-section";
import type { RemoveItemInput } from "./actions/remove-item";
import { removeItemCallback } from "./actions/remove-item";

interface UpdateItemOptions {
  itemId: string;
  newOptions: Record<string, unknown>;
}

interface UpdateItemAdvancedOptions {
  itemId: string;
  newAdvancedOptions: BoardItemAdvancedOptions;
}

interface UpdateItemIntegrations {
  itemId: string;
  newIntegrations: string[];
}

export const useItemActions = () => {
  const { updateBoard } = useUpdateBoard();
  const currentLayoutId = useCurrentLayout();
  const activeTabId = useActiveBoardTabId();

  const createItem = useCallback(
    (input: CreateItemInput) =>
      updateBoard(createItemCallback({ ...input, targetSectionId: input.targetSectionId ?? activeTabId })),
    [activeTabId, updateBoard],
  );

  const duplicateItem = useCallback(
    ({ itemId }: DuplicateItemInput) => {
      updateBoard(duplicateItemCallback({ itemId, fallbackSectionId: activeTabId }));
    },
    [activeTabId, updateBoard],
  );

  const updateItemOptions = useCallback(
    ({ itemId, newOptions }: UpdateItemOptions) => {
      updateBoard((previous) => ({
        ...previous,
        items: previous.items.map((item) => (item.id !== itemId ? item : { ...item, options: newOptions })),
      }));
    },
    [updateBoard],
  );

  const updateItemAdvancedOptions = useCallback(
    ({ itemId, newAdvancedOptions }: UpdateItemAdvancedOptions) => {
      updateBoard((previous) => ({
        ...previous,
        items: previous.items.map((item) =>
          item.id !== itemId ? item : { ...item, advancedOptions: newAdvancedOptions },
        ),
      }));
    },
    [updateBoard],
  );

  const updateItemIntegrations = useCallback(
    ({ itemId, newIntegrations }: UpdateItemIntegrations) => {
      updateBoard((previous) => ({
        ...previous,
        items: previous.items.map((item) =>
          item.id !== itemId || !("integrationIds" in item) ? item : { ...item, integrationIds: newIntegrations },
        ),
      }));
    },
    [updateBoard],
  );

  const moveAndResizeItem = useCallback(
    (input: Omit<MoveAndResizeItemInput, "layoutId">) => {
      updateBoard(moveAndResizeItemCallback({ ...input, layoutId: currentLayoutId }));
    },
    [currentLayoutId, updateBoard],
  );

  const moveItemToSection = useCallback(
    (input: Omit<MoveItemToSectionInput, "layoutId">) => {
      updateBoard(moveItemToSectionCallback({ ...input, layoutId: currentLayoutId }));
    },
    [currentLayoutId, updateBoard],
  );

  const removeItem = useCallback(
    ({ itemId }: RemoveItemInput) => {
      updateBoard(removeItemCallback({ itemId }));
    },
    [updateBoard],
  );

  return {
    moveAndResizeItem,
    moveItemToSection,
    removeItem,
    updateItemOptions,
    updateItemAdvancedOptions,
    updateItemIntegrations,
    duplicateItem,
    createItem,
  };
};
