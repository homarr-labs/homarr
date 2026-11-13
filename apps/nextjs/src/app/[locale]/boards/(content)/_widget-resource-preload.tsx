"use client";

import type { WidgetKind } from "@homarr/definitions";
import { getRootSectionLane } from "@homarr/definitions";
import { useCurrentLayout, useRequiredBoard } from "@homarr/boards/context";
import { getBoardLayoutData } from "@homarr/boards/layout-data";
import { useActiveBoardTabId } from "@homarr/boards/tabs";
import { loadWidgetResources } from "@homarr/widgets/manifest";

export const WidgetResourcePreload = () => {
  const board = useRequiredBoard();
  const layoutId = useCurrentLayout();
  const tabId = useActiveBoardTabId();
  if (typeof window !== "undefined") {
    const data = getBoardLayoutData(board, layoutId);
    const pending = board.sections
      .filter(
        (section) =>
          section.kind === "empty" && (section.id === tabId || getRootSectionLane(section.xOffset) !== "main"),
      )
      .map((section) => section.id);
    const visited = new Set<string>();
    const kinds = new Set<WidgetKind>();
    for (const id of pending) {
      if (visited.has(id)) continue;
      visited.add(id);
      for (const item of data.itemsBySectionId.get(id) ?? []) kinds.add(item.kind);
      for (const section of data.innerSectionsByParentId.get(id) ?? []) {
        if (!section.collapsed) pending.push(section.id);
      }
    }
    for (const kind of kinds) void loadWidgetResources(kind).catch(() => undefined);
  }
  return null;
};
