import { getBoardLayouts } from "@homarr/boards/context";
import { createId } from "@homarr/common";
import { getRootSectionLane } from "@homarr/definitions";
import { dynamicSectionOptionsSchema } from "@homarr/validation/shared";

import type { Board, DynamicSection, DynamicSectionLayout, EmptySection } from "~/app/[locale]/boards/_types";
import { getBoardLaneColumnCount } from "~/components/board/layout";
import { getFirstEmptyPosition } from "~/components/board/items/actions/empty-position";
import { getSectionElements } from "~/components/board/items/actions/section-elements";

export const addDynamicSectionCallback = () => (board: Board) => {
  const firstSection = board.sections
    .filter(
      (section): section is EmptySection => section.kind === "empty" && getRootSectionLane(section.xOffset) === "main",
    )
    .toSorted((sectionA, sectionB) => sectionA.yOffset - sectionB.yOffset)
    .at(0);

  if (!firstSection) return board;

  const sectionLayouts = createDynamicSectionLayouts(board, firstSection);
  const newSection = {
    id: createId(),
    kind: "dynamic",
    collapsed: false,
    options: dynamicSectionOptionsSchema.parse(undefined),
    layouts: sectionLayouts,
  } satisfies DynamicSection;

  return {
    ...board,
    sections: board.sections.concat(newSection as unknown as DynamicSection),
  };
};

const createDynamicSectionLayouts = (board: Board, currentSection: EmptySection): DynamicSectionLayout[] => {
  const layouts = getBoardLayouts(board);

  return layouts.map((layoutId) => {
    const boardLayout = board.layouts.find((layout) => layout.id === layoutId);
    const elements = getSectionElements(board, { sectionId: currentSection.id, layoutId });
    const columnCount = boardLayout ? getBoardLaneColumnCount(boardLayout, "main") : 1;
    const size = {
      width: Math.min(4, columnCount),
      height: 3,
    };

    const emptyPosition = boardLayout
      ? getFirstEmptyPosition(elements, columnCount, undefined, size)
      : { xOffset: 0, yOffset: 0 };

    if (!emptyPosition) {
      throw new Error("Your board is full");
    }

    return {
      ...size,
      ...emptyPosition,
      parentSectionId: currentSection.id,
      layoutId,
    };
  });
};
