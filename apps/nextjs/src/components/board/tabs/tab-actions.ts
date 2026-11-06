import { getBoardTabs } from "@homarr/boards/tabs";
import { getBoardLaneColumnCount, maxBoardTabs, rootSectionOffsets } from "@homarr/definitions";

import type { Board, EmptySection, ItemLayout } from "~/app/[locale]/boards/_types";
import { getFirstEmptyPosition } from "~/components/board/items/actions/empty-position";
import { getSectionElements } from "~/components/board/items/actions/section-elements";

export const addBoardTabCallback =
  ({ id, name }: { id: string; name: string }) =>
  (board: Board): Board => {
    const tabs = getBoardTabs(board);
    if (tabs.length >= maxBoardTabs) return board;

    const tab: EmptySection = {
      id,
      kind: "empty",
      xOffset: rootSectionOffsets.main,
      yOffset: Math.max(0, ...tabs.map((candidate) => candidate.yOffset)) + 1,
      name,
    };
    return { ...board, sections: [...board.sections, tab] };
  };

export const renameBoardTabCallback =
  ({ id, name }: { id: string; name: string }) =>
  (board: Board): Board => ({
    ...board,
    sections: board.sections.map((section) => {
      if (section.id !== id || section.kind !== "empty") return section;
      return { ...section, name: name.trim() || null };
    }),
  });

export const moveBoardTabCallback =
  ({ id, offset }: { id: string; offset: -1 | 1 }) =>
  (board: Board): Board => {
    const tabs = getBoardTabs(board);
    const index = tabs.findIndex((tab) => tab.id === id);
    const targetIndex = index + offset;
    const tab = tabs[index];
    const target = tabs[targetIndex];
    if (index <= 0 || targetIndex <= 0 || !tab || !target) return board;

    const reordered = tabs.with(index, target).with(targetIndex, tab);
    const yOffsetById = new Map(reordered.map((candidate, position) => [candidate.id, position]));
    return {
      ...board,
      sections: board.sections.map((section) => {
        const yOffset = yOffsetById.get(section.id);
        if (yOffset === undefined || section.kind !== "empty") return section;
        return { ...section, yOffset };
      }),
    };
  };

export const getBoardTabSectionIds = (board: Board, tabId: string) => {
  const sectionIds = new Set([tabId]);
  let previousSize = 0;
  while (sectionIds.size !== previousSize) {
    previousSize = sectionIds.size;
    for (const section of board.sections) {
      if (section.kind !== "container") continue;
      if (section.layouts.some((layout) => sectionIds.has(layout.parentSectionId))) sectionIds.add(section.id);
    }
  }
  return sectionIds;
};

export const removeBoardTabCallback =
  ({ id }: { id: string }) =>
  (board: Board): Board => {
    const tabs = getBoardTabs(board);
    if (tabs[0]?.id === id || !tabs.some((tab) => tab.id === id)) return board;

    const removedSectionIds = getBoardTabSectionIds(board, id);
    return {
      ...board,
      sections: board.sections.filter((section) => !removedSectionIds.has(section.id)),
      items: board.items.filter((item) => !item.layouts.some((layout) => removedSectionIds.has(layout.sectionId))),
    };
  };

export const moveItemsToTabCallback =
  ({ itemIds, tabId }: { itemIds: ReadonlySet<string>; tabId: string }) =>
  (board: Board): Board => {
    const tab = getBoardTabs(board).find((candidate) => candidate.id === tabId);
    if (!tab) return board;

    const movedLayoutsByItemId = new Map<string, ItemLayout[]>();
    for (const layout of board.layouts) {
      const columnCount = getBoardLaneColumnCount(layout, "main");
      const occupied: Pick<ItemLayout, "xOffset" | "yOffset" | "width" | "height">[] = getSectionElements(board, {
        sectionId: tab.id,
        layoutId: layout.id,
      });

      for (const item of board.items) {
        if (!itemIds.has(item.id)) continue;
        const itemLayout = item.layouts.find((candidate) => candidate.layoutId === layout.id);
        if (!itemLayout || itemLayout.sectionId === tab.id) continue;

        const size = { width: Math.min(itemLayout.width, columnCount), height: itemLayout.height };
        const position = getFirstEmptyPosition(occupied, columnCount, undefined, size);
        if (!position) return board;

        const movedLayout = { ...itemLayout, ...size, ...position, sectionId: tab.id };
        occupied.push(movedLayout);
        movedLayoutsByItemId.set(item.id, [...(movedLayoutsByItemId.get(item.id) ?? []), movedLayout]);
      }
    }

    return {
      ...board,
      items: board.items.map((item) => {
        const movedLayouts = movedLayoutsByItemId.get(item.id);
        if (!movedLayouts) return item;
        return {
          ...item,
          layouts: item.layouts.map(
            (layout) => movedLayouts.find((candidate) => candidate.layoutId === layout.layoutId) ?? layout,
          ),
        };
      }),
    };
  };
