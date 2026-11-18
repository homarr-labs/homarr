import { getBoardLayoutData } from "@homarr/boards/layout-data";

import type { Board } from "~/app/[locale]/boards/_types";

export const getSectionElements = (board: Board, { sectionId, layoutId }: { sectionId: string; layoutId: string }) => {
  const { itemsBySectionId, innerSectionsByParentId } = getBoardLayoutData(board, layoutId);
  return [...(itemsBySectionId.get(sectionId) ?? []), ...(innerSectionsByParentId.get(sectionId) ?? [])];
};
