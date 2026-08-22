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

  const rowCounts = (["left", "main", "right"] as const).flatMap((lane) => {
    const columnCount = getBoardLaneColumnCount(layout, lane);
    const root = getRootSectionForLane(board, lane);
    if (columnCount === 0 || !root) return [];

    const placements: GridPlacement[] = [
      ...board.items.flatMap((item) => {
        const itemLayout = item.layouts.find(
          (candidate) => candidate.layoutId === layoutId && candidate.sectionId === root.id,
        );
        return itemLayout
          ? [
              normalizeGridPlacement(
                {
                  id: item.id,
                  type: "item" as const,
                  x: itemLayout.xOffset,
                  y: itemLayout.yOffset,
                  w: itemLayout.width,
                  h: itemLayout.height,
                },
                columnCount,
              ),
            ]
          : [];
      }),
      ...board.sections.flatMap((section) => {
        if (section.kind !== "container") return [];
        const sectionLayout = section.layouts.find(
          (candidate) => candidate.layoutId === layoutId && candidate.parentSectionId === root.id,
        );
        return sectionLayout
          ? [
              normalizeGridPlacement(
                {
                  id: section.id,
                  type: "section" as const,
                  x: sectionLayout.xOffset,
                  y: sectionLayout.yOffset,
                  w: sectionLayout.width,
                  h: sectionLayout.height,
                },
                columnCount,
              ),
            ]
          : [];
      }),
    ];
    const collapsedSectionIds = new Set(
      board.sections
        .filter(
          (section) =>
            section.kind === "container" &&
            section.collapsed &&
            section.options.collapsible &&
            placements.some((placement) => placement.id === section.id),
        )
        .map((section) => section.id),
    );
    const displayPlacements =
      collapsedSectionIds.size > 0
        ? getCollapsedDisplayLayout(placements, { columnCount, collapsedItemIds: collapsedSectionIds })
        : placements;

    return [getLayoutRowCount(displayPlacements)];
  });

  return getLogicalGridSize(Math.max(0, ...rowCounts));
};
