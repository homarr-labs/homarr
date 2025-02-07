import { getCurrentLayout, useRequiredBoard } from "@homarr/boards/context";

import type { DynamicSectionItem, Section, SectionItem } from "~/app/[locale]/boards/_types";

export const useSectionItems = (sectionId: string): { innerSections: DynamicSectionItem[]; items: SectionItem[] } => {
  const board = useRequiredBoard();
  const innerSections = board.sections
    .filter(
      (innerSection): innerSection is Exclude<Section, { kind: "category" } | { kind: "empty" }> =>
        innerSection.kind === "dynamic",
    )
    .map(({ layouts, ...innerSection }) => {
      const currentLayoutId = getCurrentLayout(board);
      const layout = layouts.find((layout) => layout.layoutId === currentLayoutId);

      if (!layout) return null;

      return {
        ...layout,
        ...innerSection,
        type: "section" as const,
      };
    })
    .filter((item) => item !== null)
    .filter((innerSection) => innerSection.parentSectionId === sectionId);

  const items = board.items
    .map(({ layouts, ...item }) => {
      const currentLayoutId = getCurrentLayout(board);
      const layout = layouts.find((layout) => layout.layoutId === currentLayoutId);
      if (!layout) return null;

      return {
        ...layout,
        ...item,
        type: "item" as const,
      };
    })
    .filter((item) => item !== null)
    .filter((item) => item.sectionId === sectionId);

  return {
    innerSections,
    items,
  };
};
