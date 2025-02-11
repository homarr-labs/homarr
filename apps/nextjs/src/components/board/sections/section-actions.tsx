import { useCallback } from "react";

import { useUpdateBoard } from "@homarr/boards/updater";

interface MoveAndResizeInnerSection {
  innerSectionId: string;
  xOffset: number;
  yOffset: number;
  width: number;
  height: number;
}
interface MoveInnerSectionToSection {
  innerSectionId: string;
  sectionId: string;
  xOffset: number;
  yOffset: number;
  width: number;
  height: number;
}

export const useSectionActions = () => {
  const { updateBoard } = useUpdateBoard();

  const moveAndResizeInnerSection = useCallback(
    ({ innerSectionId, ...positionProps }: MoveAndResizeInnerSection) => {
      updateBoard((previous) => ({
        ...previous,
        sections: previous.sections.map((section) => {
          // Return same section if section is not the one we're moving
          if (section.id !== innerSectionId) return section;
          return {
            ...section,
            ...positionProps,
          };
        }),
      }));
    },
    [updateBoard],
  );

  const moveInnerSectionToSection = useCallback(
    ({ innerSectionId, sectionId, ...positionProps }: MoveInnerSectionToSection) => {
      updateBoard((previous) => {
        return {
          ...previous,
          sections: previous.sections.map((section) => {
            // Return section without changes when not the section we're moving
            if (section.id !== innerSectionId) return section;
            return {
              ...section,
              ...positionProps,
              parentSectionId: sectionId,
            };
          }),
        };
      });
    },
    [updateBoard],
  );

  return {
    moveAndResizeInnerSection,
    moveInnerSectionToSection,
  };
};
