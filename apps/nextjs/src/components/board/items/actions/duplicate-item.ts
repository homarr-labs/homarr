import { createId } from "@homarr/common";
import { getBoardTabs } from "@homarr/boards/tabs";
import { getRootSectionLane } from "@homarr/definitions";

import type { Board, ItemLayout, Section } from "~/app/[locale]/boards/_types";
import { getBoardLaneColumnCount } from "~/components/board/layout";
import { getFirstEmptyPosition } from "./empty-position";
import { getSectionElements } from "./section-elements";

export interface DuplicateItemInput {
  itemId: string;
  fallbackSectionId?: string;
}

export const duplicateItemCallback =
  ({ itemId, fallbackSectionId }: DuplicateItemInput) =>
  (previous: Board): Board => {
    const itemToDuplicate = previous.items.find((item) => item.id === itemId);
    if (!itemToDuplicate) return previous;

    const clonedItem = structuredClone(itemToDuplicate);
    const clonedLayouts = clonedItem.layouts.map((layout) => ({
      ...layout,
      ...getNextPosition(previous, layout, fallbackSectionId),
    }));

    return {
      ...previous,
      items: previous.items.concat({
        ...clonedItem,
        id: createId(),
        layouts: clonedLayouts,
      }),
    };
  };

const getNextPosition = (
  board: Board,
  layout: ItemLayout,
  fallbackSectionId: string | undefined,
): { xOffset: number; yOffset: number; sectionId: string } => {
  const currentSection = board.sections.find((section) => section.id === layout.sectionId);
  if (currentSection) {
    const emptySectionPosition = getEmptySectionPosition(board, layout, currentSection);
    if (emptySectionPosition) {
      return {
        ...emptySectionPosition,
        sectionId: currentSection.id,
      };
    }
  }

  const tabs = getBoardTabs(board);
  const firstSection = tabs.find((tab) => tab.id === fallbackSectionId) ?? tabs.at(0);

  if (!firstSection) {
    throw new Error("Your board is full. reason='no first section'");
  }

  const emptySectionPosition = getEmptySectionPosition(board, layout, firstSection);

  if (!emptySectionPosition) {
    throw new Error("Your board is full. reason='no empty positions'");
  }

  return {
    ...emptySectionPosition,
    sectionId: firstSection.id,
  };
};

const getEmptySectionPosition = (
  board: Board,
  layout: ItemLayout,
  section: Section,
): { xOffset: number; yOffset: number } | undefined => {
  const boardLayout = board.layouts.find((candidate) => candidate.id === layout.layoutId);
  if (!boardLayout) return;

  const sectionElements = getSectionElements(board, { sectionId: section.id, layoutId: layout.layoutId });
  if (section.kind === "empty") {
    const columnCount = getBoardLaneColumnCount(boardLayout, getRootSectionLane(section.xOffset));

    const size = {
      width: layout.width,
      height: layout.height,
    };
    return getFirstEmptyPosition(sectionElements, columnCount, undefined, size);
  }

  const sectionLayout = section.layouts.find((candidate) => candidate.layoutId === layout.layoutId);
  if (!sectionLayout) return;

  return getFirstEmptyPosition(sectionElements, sectionLayout.width, sectionLayout.height, {
    width: layout.width,
    height: layout.height,
  });
};
