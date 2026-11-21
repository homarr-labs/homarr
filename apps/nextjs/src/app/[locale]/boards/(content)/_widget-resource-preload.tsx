"use client";

import { useCurrentLayout, useRequiredBoard } from "@homarr/boards/context";
import { useActiveBoardTabId } from "@homarr/boards/tabs";

import { preloadBoardTabWidgets } from "~/components/board/tabs/preload-board-tab-widgets";

export const WidgetResourcePreload = () => {
  const board = useRequiredBoard();
  const layoutId = useCurrentLayout();
  const tabId = useActiveBoardTabId();
  if (typeof window !== "undefined") preloadBoardTabWidgets(board, layoutId, tabId);
  return null;
};
