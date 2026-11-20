"use client";

import { useCallback } from "react";

import { useBoardTabs } from "@homarr/boards/tabs";
import { useUpdateBoard } from "@homarr/boards/updater";
import { createId } from "@homarr/common";
import { maxBoardTabs } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";

import {
  addBoardTabCallback,
  moveBoardTabCallback,
  removeBoardTabCallback,
  renameBoardTabCallback,
} from "./tab-actions";

export const useBoardTabActions = () => {
  const { tabs, selectTab } = useBoardTabs();
  const { updateBoard } = useUpdateBoard();
  const t = useI18n("board.tabs");

  const canAddTab = tabs.length < maxBoardTabs;

  const addTab = useCallback(() => {
    if (!canAddTab) return;
    const id = createId();
    updateBoard(addBoardTabCallback({ id, name: t("untitled", { index: tabs.length + 1 }) }));
    selectTab(id);
  }, [canAddTab, selectTab, t, tabs.length, updateBoard]);

  const renameTab = useCallback(
    (id: string, name: string) => updateBoard(renameBoardTabCallback({ id, name })),
    [updateBoard],
  );

  const moveTab = useCallback(
    (id: string, offset: -1 | 1) => updateBoard(moveBoardTabCallback({ id, offset })),
    [updateBoard],
  );

  const removeTab = useCallback(
    (id: string) => {
      const index = tabs.findIndex((tab) => tab.id === id);
      const tab = tabs[index];
      const fallbackTab = tabs[index - 1];
      if (!tab || !fallbackTab) return;

      selectTab(fallbackTab.id);
      updateBoard(removeBoardTabCallback({ id }));
    },
    [selectTab, tabs, updateBoard],
  );

  return { canAddTab, addTab, renameTab, moveTab, removeTab };
};
