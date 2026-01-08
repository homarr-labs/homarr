import type { Board } from "~/app/[locale]/boards/_types";

export const getSectionElements = (board: Board, { sectionId, layoutId }: { sectionId: string; layoutId: string }) => {
  const dynamicSectionsOfFirstSection = board.sections
    .filter((section) => section.kind === "dynamic")

    .map(({ layouts, ...section }) => ({ ...section, ...layouts.find((layout) => layout.layoutId === layoutId)! }))
    .filter((section) => section.parentSectionId === sectionId);
  const items = board.items
    .map(({ layouts, ...item }) => ({
      ...item,

      ...layouts.find((layout) => layout.layoutId === layoutId)!,
    }))
    .filter((item) => item.sectionId === sectionId);

  return [...items, ...dynamicSectionsOfFirstSection];
};
