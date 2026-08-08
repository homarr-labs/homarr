import { generateResponsiveGridFor } from "@homarr/common";
import type { GridAlgorithmItem } from "@homarr/common";

import type { Board } from "./_types";

export type BoardLayout = Board["layouts"][number];

export const getRepresentativeLayoutWidth = (layout: BoardLayout, allLayouts: BoardLayout[]) => {
  if (layout.role === "mobile") return 390;
  if (layout.role === "base") return Math.max(1280, layout.breakpoint);

  const nextLayout = allLayouts
    .filter((candidate) => candidate.breakpoint > layout.breakpoint)
    .toSorted((layoutA, layoutB) => layoutA.breakpoint - layoutB.breakpoint)
    .at(0);

  return nextLayout ? Math.round((layout.breakpoint + nextLayout.breakpoint) / 2) : Math.max(1280, layout.breakpoint);
};

export const projectBoardLayout = (
  board: Board,
  sourceLayout: Pick<BoardLayout, "id" | "columnCount">,
  targetLayout: Pick<BoardLayout, "id" | "columnCount">,
) => {
  const elements = getElementsForLayout(board, sourceLayout.id);

  if (sourceLayout.id === targetLayout.id && sourceLayout.columnCount === targetLayout.columnCount) {
    return elements;
  }

  return board.sections
    .filter((section) => section.kind !== "dynamic")
    .flatMap(
      (section) =>
        generateResponsiveGridFor({
          items: elements,
          previousWidth: sourceLayout.columnCount,
          width: targetLayout.columnCount,
          sectionId: section.id,
        }).items,
    );
};

const getElementsForLayout = (board: Board, layoutId: string): GridAlgorithmItem[] => [
  ...board.items.flatMap((item) => {
    const layout = item.layouts.find((candidate) => candidate.layoutId === layoutId);
    return layout
      ? [
          {
            id: item.id,
            type: "item" as const,
            height: layout.height,
            width: layout.width,
            xOffset: layout.xOffset,
            yOffset: layout.yOffset,
            sectionId: layout.sectionId,
          },
        ]
      : [];
  }),
  ...board.sections.flatMap((section) => {
    if (section.kind !== "dynamic") return [];
    const layout = section.layouts.find((candidate) => candidate.layoutId === layoutId);
    return layout?.parentSectionId
      ? [
          {
            id: section.id,
            type: "section" as const,
            height: layout.height,
            width: layout.width,
            xOffset: layout.xOffset,
            yOffset: layout.yOffset,
            sectionId: layout.parentSectionId,
          },
        ]
      : [];
  }),
];
