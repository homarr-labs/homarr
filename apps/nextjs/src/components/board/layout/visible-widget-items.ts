import { getBoardLayoutData } from "@homarr/boards/layout-data";
import type { Board, SectionItem } from "@homarr/boards/layout-data";

import { getBoardLaneColumnCount, getRootSectionForLane } from "./board-lanes";

export const getVisibleWidgetItems = (board: Board, layoutId: string, tabId: string | undefined) => {
  const layout = board.layouts.find((candidate) => candidate.id === layoutId);
  if (!layout) return [];

  const pending = tabId ? [tabId] : [];
  for (const lane of ["left", "right"] as const) {
    if (getBoardLaneColumnCount(layout, lane) === 0) continue;
    const root = getRootSectionForLane(board, lane);
    if (root) pending.push(root.id);
  }

  const { itemsBySectionId, innerSectionsByParentId } = getBoardLayoutData(board, layoutId);
  const items: SectionItem[] = [];
  const visited = new Set<string>();
  for (const id of pending) {
    if (visited.has(id)) continue;
    visited.add(id);
    for (const item of itemsBySectionId.get(id) ?? []) items.push(item);
    for (const section of innerSectionsByParentId.get(id) ?? []) {
      if (!section.options.collapsible || !section.collapsed) pending.push(section.id);
    }
  }

  return items;
};
