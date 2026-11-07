import { getBoardTabForSection, getBoardTabs } from "@homarr/boards/tabs";
import { getBoardLaneColumnCount, maxBoardTabs, rootSectionOffsets } from "@homarr/definitions";

import type { Board, EmptySection, ItemLayout } from "~/app/[locale]/boards/_types";
import { getFirstEmptyPosition } from "~/components/board/items/actions/empty-position";
import { getSectionElements } from "~/components/board/items/actions/section-elements";
import { getSectionGridPlacements } from "~/components/board/sections/grid/section-grid-placements";
import { commitSectionGridsCallback } from "~/components/board/sections/grid/use-grid-layout-actions";
import type {
  CommitSectionGridInput,
  SectionGridPlacement,
} from "~/components/board/sections/grid/use-grid-layout-actions";

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
  for (const section of board.sections) {
    if (section.kind !== "container" || section.layouts.length === 0) continue;
    if (section.layouts.every((layout) => getBoardTabForSection(board, layout.layoutId, section.id)?.id === tabId)) {
      sectionIds.add(section.id);
    }
  }
  return sectionIds;
};

export const removeBoardTabCallback =
  ({ id }: { id: string }) =>
  (board: Board): Board => {
    const tabs = getBoardTabs(board);
    const index = tabs.findIndex((tab) => tab.id === id);
    const fallbackTab = tabs[index - 1];
    if (!fallbackTab) return board;

    const removedSectionIds = getBoardTabSectionIds(board, id);
    const remaining = {
      ...board,
      sections: board.sections.filter((section) => !removedSectionIds.has(section.id)),
      items: board.items.filter(
        (item) =>
          item.layouts.length === 0 ||
          !item.layouts.every((layout) => getBoardTabForSection(board, layout.layoutId, layout.sectionId)?.id === id),
      ),
    };
    const snapshots: CommitSectionGridInput[] = [];
    for (const layout of board.layouts) {
      const orphaned: SectionGridPlacement[] = [
        ...remaining.sections.flatMap((section): SectionGridPlacement[] => {
          if (section.kind !== "container") return [];
          const placement = section.layouts.find((candidate) => candidate.layoutId === layout.id);
          if (!placement || !removedSectionIds.has(placement.parentSectionId)) return [];
          return [
            {
              id: section.id,
              type: "section",
              x: placement.xOffset,
              y: placement.yOffset,
              w: placement.width,
              h: placement.height,
            },
          ];
        }),
        ...remaining.items.flatMap((item): SectionGridPlacement[] => {
          const placement = item.layouts.find((candidate) => candidate.layoutId === layout.id);
          if (!placement || !removedSectionIds.has(placement.sectionId)) return [];
          return [
            {
              id: item.id,
              type: "item",
              x: placement.xOffset,
              y: placement.yOffset,
              w: placement.width,
              h: placement.height,
            },
          ];
        }),
      ];
      if (orphaned.length === 0) continue;
      const placements = getSectionGridPlacements(remaining, layout.id, fallbackTab.id);
      const occupied = placements.map(({ x, y, w, h }) => ({ xOffset: x, yOffset: y, width: w, height: h }));
      const columnCount = getBoardLaneColumnCount(layout, "main");
      for (const placement of orphaned) {
        const size = { width: placement.w, height: placement.h };
        const position = getFirstEmptyPosition(occupied, columnCount, undefined, size);
        if (!position) return board;
        occupied.push({ ...position, ...size });
        placements.push({ ...placement, x: position.xOffset, y: position.yOffset });
      }
      snapshots.push({ layoutId: layout.id, sectionId: fallbackTab.id, placements });
    }
    return commitSectionGridsCallback(snapshots)(remaining);
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
