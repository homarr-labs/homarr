import { useCallback } from "react";

import { useCurrentLayout } from "@homarr/boards/context";
import { useUpdateBoard } from "@homarr/boards/updater";

import type { Board } from "~/app/[locale]/boards/_types";

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
  const currentLayoutId = useCurrentLayout();

  const moveAndResizeInnerSection = useCallback(
    ({ innerSectionId, ...positionProps }: MoveAndResizeInnerSection) => {
      updateBoard((previous) => ({
        ...previous,
        sections: previous.sections.map((section) => {
          // Return same section if section is not the one we're moving
          if (section.id !== innerSectionId) return section;
          if (section.kind !== "dynamic") return section;

          return {
            ...section,
            layouts: section.layouts.map((layout) => {
              if (layout.layoutId !== currentLayoutId) return layout;
              return {
                ...layout,
                ...positionProps,
              };
            }),
          };
        }),
      }));
    },
    [currentLayoutId, updateBoard],
  );

  const moveInnerSectionToSection = useCallback(
    ({ innerSectionId, sectionId, ...positionProps }: MoveInnerSectionToSection) => {
      updateBoard((previous) => {
        if (wouldCreateSectionCycle(previous, { innerSectionId, sectionId, layoutId: currentLayoutId })) {
          return previous;
        }

        return {
          ...previous,
          sections: previous.sections.map((section) => {
            // Return section without changes when not the section we're moving
            if (section.id !== innerSectionId) return section;
            if (section.kind !== "dynamic") return section;

            return {
              ...section,
              layouts: section.layouts.map((layout) => {
                if (layout.layoutId !== currentLayoutId) return layout;
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
    [currentLayoutId, updateBoard],
  );

  return {
    moveAndResizeInnerSection,
    moveInnerSectionToSection,
  };
};

export const wouldCreateSectionCycle = (
  board: Board,
  { innerSectionId, sectionId, layoutId }: { innerSectionId: string; sectionId: string; layoutId: string },
) => {
  const visitedSectionIds = new Set<string>();
  let currentSectionId: string | null = sectionId;

  while (currentSectionId) {
    if (currentSectionId === innerSectionId) return true;
    if (visitedSectionIds.has(currentSectionId)) return true;
    visitedSectionIds.add(currentSectionId);

    const currentSection = board.sections.find((section) => section.id === currentSectionId);
    if (currentSection?.kind !== "dynamic") return false;

    currentSectionId = currentSection.layouts.find((layout) => layout.layoutId === layoutId)?.parentSectionId ?? null;
  }

  return false;
};
