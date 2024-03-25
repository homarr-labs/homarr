import { useCallback } from "react";

import { useUpdateBoard } from "~/app/[locale]/boards/_client";

interface MoveSectionToSection {
  sectionId: string;
  xOffset: number;
  yOffset: number;
  width: number;
  height: number;
  targetSectionId: string;
}

interface MoveAndResizeSection {
  sectionId: string;
  xOffset: number;
  yOffset: number;
  width: number;
  height: number;
}

export const useSectionActions = () => {
  const { updateBoard } = useUpdateBoard();

  const moveSectionToSection = useCallback(
    ({
      sectionId,
      targetSectionId,
      ...positionProps
    }: MoveSectionToSection) => {
      updateBoard((previous) => {
        if (!previous) return previous;
        return {
          ...previous,
          sections: previous.sections.map((section) => {
            if (section.id !== sectionId || section.kind === "root")
              return section;
            return {
              ...section,
              ...positionProps,
              parentSectionId: targetSectionId,
            };
          }),
        };
      });
    },
    [updateBoard],
  );

  const moveAndResizeSection = useCallback(
    ({ sectionId, xOffset, yOffset, width, height }: MoveAndResizeSection) => {
      updateBoard((previous) => {
        if (!previous) return previous;
        return {
          ...previous,
          sections: previous.sections.map((section) => {
            if (section.id !== sectionId) return section;
            return {
              ...section,
              xOffset,
              yOffset,
              width,
              height,
            };
          }),
        };
      });
    },
    [updateBoard],
  );

  return {
    moveSectionToSection,
    moveAndResizeSection,
  };
};
