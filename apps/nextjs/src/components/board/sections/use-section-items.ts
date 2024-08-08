import type { Section } from "~/app/[locale]/boards/_types";
import { useRequiredBoard } from "~/app/[locale]/boards/(content)/_context";

export const useSectionItems = (section: Section) => {
  const board = useRequiredBoard();
  const innerSections = board.sections.filter(
    (innerSection): innerSection is Exclude<Section, { kind: "category" } | { kind: "empty" }> =>
      innerSection.kind === "dynamic" && innerSection.parentSectionId === section.id,
  );

  return {
    innerSections,
    itemIds: section.items.map((item) => item.id).concat(innerSections.map((section) => section.id)),
  };
};
