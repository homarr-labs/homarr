import { useCallback } from "react";

import { useUpdateBoard } from "@homarr/boards/updater";
import { createId } from "@homarr/db/client";

import type { DynamicSection, EmptySection } from "~/app/[locale]/boards/_types";

interface RemoveDynamicSection {
  id: string;
}

export const useDynamicSectionActions = () => {
  const { updateBoard } = useUpdateBoard();

  const addDynamicSection = useCallback(() => {
    updateBoard((previous) => {
      const lastSection = previous.sections
        .filter((section): section is EmptySection => section.kind === "empty")
        .sort((sectionA, sectionB) => sectionB.yOffset - sectionA.yOffset)[0];

      if (!lastSection) return previous;

      const newSection = {
        id: createId(),
        kind: "dynamic",
        height: 1,
        width: 1,
        items: [],
        parentSectionId: lastSection.id,
        // We omit xOffset and yOffset because gridstack will use the first available position
      } satisfies Omit<DynamicSection, "xOffset" | "yOffset">;

      return {
        ...previous,
        sections: previous.sections.concat(newSection as unknown as DynamicSection),
      };
    });
  }, [updateBoard]);

  const removeDynamicSection = useCallback(
    ({ id }: RemoveDynamicSection) => {
      updateBoard((previous) => {
        const sectionToRemove = previous.sections.find(
          (section): section is DynamicSection => section.id === id && section.kind === "dynamic",
        );
        if (!sectionToRemove) return previous;

        return {
          ...previous,
          sections: previous.sections
            .filter((section) => section.id !== id)
            .map((section) => {
              if (section.id === sectionToRemove.parentSectionId) {
                return {
                  ...section,
                  // Add items from the removed section to the parent section
                  items: section.items.concat(
                    sectionToRemove.items.map((item) => ({
                      ...item,
                      xOffset: sectionToRemove.xOffset + item.xOffset,
                      yOffset: sectionToRemove.yOffset + item.yOffset,
                    })),
                  ),
                };
              }

              if (section.kind === "dynamic" && section.parentSectionId === sectionToRemove.id) {
                // Change xOffset and yOffset of sections that were below the removed section and set parentSectionId to the parent of the removed section
                return {
                  ...section,
                  parentSectionId: sectionToRemove.parentSectionId,
                  yOffset: section.yOffset + sectionToRemove.yOffset,
                  xOffset: section.xOffset + sectionToRemove.xOffset,
                };
              }

              return section;
            }),
        };
      });
    },
    [updateBoard],
  );

  return {
    addDynamicSection,
    removeDynamicSection,
  };
};
