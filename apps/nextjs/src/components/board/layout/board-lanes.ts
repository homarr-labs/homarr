import { getBoardLayoutData } from "@homarr/boards/layout-data";
import type { BoardLane } from "@homarr/definitions";
import { getBoardLaneColumnCount, getRootSectionLane } from "@homarr/definitions";

import type { Board, EmptySection } from "~/app/[locale]/boards/_types";
import { getLogicalGridSize, getLayoutRowCount, normalizeGridPlacement } from "./geometry";
import { getCollapsedDisplayLayout } from "./reflow";
import type { GridPlacement } from "./types";

export { getBoardLaneColumnCount };

export const getRootSectionForLane = (board: Board, lane: BoardLane): EmptySection | undefined => {
  const roots = board.sections.filter(
    (section): section is EmptySection => section.kind === "empty" && getRootSectionLane(section.xOffset) === lane,
  );
  if (roots.length > 1) {
    throw new Error(`Board "${board.id}" has multiple ${lane} canvas roots`);
  }

  return roots[0];
};

export const getInitialBoardLogicalHeight = (board: Board, layoutId: string) => {
  const layout = board.layouts.find((candidate) => candidate.id === layoutId);
  if (!layout) return 0;
  const data = getBoardLayoutData(board, layoutId);

  const rowCounts = (["left", "main", "right"] as const).flatMap((lane) => {
    const columnCount = getBoardLaneColumnCount(layout, lane);
    const root = getRootSectionForLane(board, lane);
    if (columnCount === 0 || !root) return [];

    const innerSections = data.innerSectionsByParentId.get(root.id) ?? [];
    const placements: GridPlacement[] = [...(data.itemsBySectionId.get(root.id) ?? []), ...innerSections].map((entry) =>
      normalizeGridPlacement(
        {
          id: entry.id,
          type: entry.type,
          x: entry.xOffset,
          y: entry.yOffset,
          w: entry.width,
          h: entry.height,
        },
        columnCount,
      ),
    );
    const collapsedSectionIds = new Set(
      innerSections.filter((section) => section.collapsed && section.options.collapsible).map((section) => section.id),
    );
    const displayPlacements =
      collapsedSectionIds.size > 0
        ? getCollapsedDisplayLayout(placements, { columnCount, collapsedItemIds: collapsedSectionIds })
        : placements;

    return [getLayoutRowCount(displayPlacements)];
  });

  return getLogicalGridSize(Math.max(0, ...rowCounts));
};
