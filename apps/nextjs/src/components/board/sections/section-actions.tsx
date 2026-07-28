import { useCallback } from "react";

import { useUpdateBoard } from "@homarr/boards/updater";

interface MoveAndResizeInnerSection {
  innerSectionId: string;
  layoutId: string;
  xOffset: number;
  yOffset: number;
  width: number;
  height: number;
}
interface MoveInnerSectionToSection {
  innerSectionId: string;
  layoutId: string;
  sectionId: string;
  xOffset: number;
  yOffset: number;
  width: number;
  height: number;
}

export const useSectionActions = () => {
  const { updateBoard } = useUpdateBoard();

  const moveAndResizeInnerSection = useCallback(
    ({ innerSectionId, layoutId, ...positionProps }: MoveAndResizeInnerSection) => {
      updateBoard((previous) => ({
        ...previous,
        sections: previous.sections.map((section) => {
          // Return same section if section is not the one we're moving
          if (section.id !== innerSectionId) return section;
          if (section.kind !== "dynamic") return section;

          return {
            ...section,
            layouts: section.layouts.map((layout) => {
              if (layout.layoutId !== layoutId) return layout;
              return {
                ...layout,
                ...positionProps,
              };
            }),
          };
        }),
      }));
    },
    [updateBoard],
  );

  const moveInnerSectionToSection = useCallback(
    ({ innerSectionId, layoutId, sectionId, ...positionProps }: MoveInnerSectionToSection) => {
      updateBoard((previous) => {
        return {
          ...previous,
          sections: previous.sections.map((section) => {
            // Return section without changes when not the section we're moving
            if (section.id !== innerSectionId) return section;
            if (section.kind !== "dynamic") return section;

            return {
              ...section,
              layouts: section.layouts.map((layout) => {
                if (layout.layoutId !== layoutId) return layout;
                return {
                  ...layout,
                  ...positionProps,
                  parentSectionId: sectionId,
                };
              }),
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
