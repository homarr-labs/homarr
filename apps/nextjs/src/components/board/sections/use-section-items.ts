import type { DynamicSectionItem, Section, SectionItem } from "~/app/[locale]/boards/_types";
import { useRequiredBoard } from "~/app/[locale]/boards/(content)/_context";

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const getCurrentLayout = <TLayout>(layouts: TLayout[]) => layouts.at(0)!;

export const useSectionItems = (sectionId: string): { innerSections: DynamicSectionItem[]; items: SectionItem[] } => {
  const board = useRequiredBoard();
  const innerSections = board.sections
    .filter(
      (innerSection): innerSection is Exclude<Section, { kind: "category" } | { kind: "empty" }> =>
        innerSection.kind === "dynamic",
    )
    .map(({ layouts, ...innerSection }) => {
      const layout = getCurrentLayout(layouts);

      return {
        ...layout,
        ...innerSection,
        type: "section" as const,
      };
    })
    .filter((innerSection) => innerSection.parentSectionId === sectionId);

  const items = board.items
    .map(({ layouts, ...item }) => {
      const layout = getCurrentLayout(layouts);

      return {
        ...layout,
        ...item,
        type: "item" as const,
      };
    })
    .filter((item) => item.sectionId === sectionId);

  return {
    innerSections,
    items,
  };
};
