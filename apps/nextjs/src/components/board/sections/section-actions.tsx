import { useCallback } from "react";

import { useUpdateBoard } from "~/app/[locale]/boards/(content)/_client";

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
      console.log("moveAndResizeInnerSection", innerSectionId, positionProps);
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
      console.log("moveInnerSectionToSection", innerSectionId, sectionId, positionProps);
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
