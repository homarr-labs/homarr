import { createId } from "@homarr/db/client";

import type { Board, DynamicSection, EmptySection } from "~/app/[locale]/boards/_types";
import { getFirstEmptyPosition } from "./empty-position";

export interface DuplicateItemInput {
  itemId: string;
}

export const duplicateItemCallback =
  ({ itemId }: DuplicateItemInput) =>
  (previous: Board): Board => {
    const itemToDuplicate = previous.sections
      .flatMap((section) => section.items.map((item) => ({ ...item, sectionId: section.id })))
      .find((item) => item.id === itemId);
    if (!itemToDuplicate) return previous;

    const currentSection = previous.sections.find((section) => section.id === itemToDuplicate.sectionId);
    if (!currentSection) return previous;

    const dynamicSectionsOfCurrentSection = previous.sections.filter(
      (section): section is DynamicSection =>
        section.kind === "dynamic" && section.parentSectionId === currentSection.id,
    );
    const elements = [...currentSection.items, ...dynamicSectionsOfCurrentSection];
    let sectionId = currentSection.id;
    let emptyPosition = getFirstEmptyPosition(
      elements,
      currentSection.kind === "dynamic" ? currentSection.width : previous.columnCount,
      currentSection.kind === "dynamic" ? currentSection.height : undefined,
      {
        width: itemToDuplicate.width,
        height: itemToDuplicate.height,
      },
    );

    if (!emptyPosition) {
      const firstSection = previous.sections
        .filter((section): section is EmptySection => section.kind === "empty")
        .sort((sectionA, sectionB) => sectionA.yOffset - sectionB.yOffset)
        .at(0);

      if (!firstSection) return previous;

      const dynamicSectionsOfFirstSection = previous.sections.filter(
        (section): section is DynamicSection =>
          section.kind === "dynamic" && section.parentSectionId === firstSection.id,
      );
      const elements = [...firstSection.items, ...dynamicSectionsOfFirstSection];
      emptyPosition = getFirstEmptyPosition(elements, previous.columnCount, undefined, {
        width: itemToDuplicate.width,
        height: itemToDuplicate.height,
      });
      if (!emptyPosition) {
        console.error("Your board is full");
        return previous;
      }

      sectionId = firstSection.id;
    }

    const widget = structuredClone(itemToDuplicate);
    widget.id = createId();
    widget.xOffset = emptyPosition.xOffset;
    widget.yOffset = emptyPosition.yOffset;
    widget.sectionId = sectionId;

    const result = {
      ...previous,
      sections: previous.sections.map((section) => {
        // Return same section if item is not in it
        if (section.id !== sectionId) return section;
        return {
          ...section,
          items: section.items.concat(widget),
        };
      }),
    };

    return result;
  };
