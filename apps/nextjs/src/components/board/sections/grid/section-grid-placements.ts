import { getBoardLayoutData } from "@homarr/boards/layout-data";
import { getBoardLaneColumnCount, getRootSectionLane } from "@homarr/definitions";

import type { Board } from "~/app/[locale]/boards/_types";
import type { SectionGridPlacement } from "./use-grid-layout-actions";

export const getSectionGridPlacements = (board: Board, layoutId: string, sectionId: string): SectionGridPlacement[] => {
  const data = getBoardLayoutData(board, layoutId);
  return [...(data.itemsBySectionId.get(sectionId) ?? []), ...(data.innerSectionsByParentId.get(sectionId) ?? [])].map(
    (entry) => ({
      id: entry.id,
      type: entry.type,
      x: entry.xOffset,
      y: entry.yOffset,
      w: entry.width,
      h: entry.height,
    }),
  );
};

export const getSectionGridColumnCount = (board: Board, layoutId: string, sectionId: string): number | null => {
  const section = getBoardLayoutData(board, layoutId).sectionsById.get(sectionId);
  if (!section) return null;
  if (section.kind === "container") {
    return section.layouts.find((layout) => layout.layoutId === layoutId)?.width ?? null;
  }

  const layout = board.layouts.find((candidate) => candidate.id === layoutId);
  return layout ? getBoardLaneColumnCount(layout, getRootSectionLane(section.xOffset)) : null;
};
