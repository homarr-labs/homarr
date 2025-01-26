import { useRequiredBoard } from "@homarr/boards/context";

import type { Section } from "~/app/[locale]/boards/_types";

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
