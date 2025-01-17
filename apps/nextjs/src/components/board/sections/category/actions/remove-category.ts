import type { Board, CategorySection, DynamicSection, EmptySection, Section } from "~/app/[locale]/boards/_types";

export interface RemoveCategoryInput {
  id: string;
}

export const removeCategoryCallback =
  (input: RemoveCategoryInput) =>
  (previous: Board): Board => {
    const currentCategory = previous.sections.find(
      (section): section is CategorySection => section.kind === "category" && section.id === input.id,
    );
    if (!currentCategory) {
      return previous;
    }

    const emptySectionsAbove = previous.sections.filter(
      (section): section is EmptySection => section.kind === "empty" && section.yOffset < currentCategory.yOffset,
    );
    const aboveSection = emptySectionsAbove.sort((sectionA, sectionB) => sectionB.yOffset - sectionA.yOffset).at(0);

    const emptySectionsBelow = previous.sections.filter(
      (section): section is EmptySection => section.kind === "empty" && section.yOffset > currentCategory.yOffset,
    );
    const removedSection = emptySectionsBelow.sort((sectionA, sectionB) => sectionA.yOffset - sectionB.yOffset).at(0);

    if (!aboveSection || !removedSection) {
      return previous;
    }

    // Calculate the yOffset for the items in the currentCategory and removedWrapper to add them with the same offset to the aboveWrapper
    const aboveYOffset = Math.max(
      calculateYHeightWithOffsetForItems(aboveSection),
      calculateYHeightWithOffsetForDynamicSections(previous.sections, aboveSection.id),
    );
    const categoryYOffset = Math.max(
      calculateYHeightWithOffsetForItems(currentCategory),
      calculateYHeightWithOffsetForDynamicSections(previous.sections, currentCategory.id),
    );

    const previousCategoryItems = currentCategory.items.map((item) => ({
      ...item,
      yOffset: item.yOffset + aboveYOffset,
    }));
    const previousBelowWrapperItems = removedSection.items.map((item) => ({
      ...item,
      yOffset: item.yOffset + aboveYOffset + categoryYOffset,
    }));

    return {
      ...previous,
      sections: [
        ...previous.sections.filter((section) => section.yOffset < aboveSection.yOffset && section.kind !== "dynamic"),
        {
          ...aboveSection,
          items: [...aboveSection.items, ...previousCategoryItems, ...previousBelowWrapperItems],
        },
        ...previous.sections
          .filter(
            (section): section is CategorySection | EmptySection =>
              section.yOffset > removedSection.yOffset && section.kind !== "dynamic",
          )
          .map((section) => ({
            ...section,
            position: section.yOffset - 2,
          })),
        ...previous.sections
          .filter((section): section is DynamicSection => section.kind === "dynamic")
          .map((dynamicSection) => {
            // Move dynamic sections from removed section to above section with required yOffset
            if (dynamicSection.parentSectionId === removedSection.id) {
              return {
                ...dynamicSection,
                yOffset: dynamicSection.yOffset + aboveYOffset + categoryYOffset,
                parentSectionId: aboveSection.id,
              };
            }

            // Move dynamic sections from category to above section with required yOffset
            if (dynamicSection.parentSectionId === currentCategory.id) {
              return {
                ...dynamicSection,
                yOffset: dynamicSection.yOffset + aboveYOffset,
                parentSectionId: aboveSection.id,
              };
            }

            return dynamicSection;
          }),
      ],
    };
  };

const calculateYHeightWithOffsetForDynamicSections = (sections: Section[], sectionId: string) => {
  return sections.reduce((acc, section) => {
    if (section.kind !== "dynamic" || section.parentSectionId !== sectionId) {
      return acc;
    }

    const yHeightWithOffset = section.yOffset + section.height;
    if (yHeightWithOffset > acc) return yHeightWithOffset;
    return acc;
  }, 0);
};

const calculateYHeightWithOffsetForItems = (section: Section) =>
  section.items.reduce((acc, item) => {
    const yHeightWithOffset = item.yOffset + item.height;
    if (yHeightWithOffset > acc) return yHeightWithOffset;
    return acc;
  }, 0);
