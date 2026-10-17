import { useMemo } from "react";

import { useCurrentLayout, useRequiredBoard } from "@homarr/boards/context";
import { getBoardLayoutData } from "@homarr/boards/layout-data";

import type { ContainerSectionItem, SectionItem } from "~/app/[locale]/boards/_types";

export const useSectionItems = (sectionId: string): { innerSections: ContainerSectionItem[]; items: SectionItem[] } => {
  const board = useRequiredBoard();
  const currentLayoutId = useCurrentLayout();
  const index = useMemo(() => getBoardLayoutData(board, currentLayoutId), [board, currentLayoutId]);

  return {
    innerSections: index.innerSectionsByParentId.get(sectionId) ?? EMPTY_INNER_SECTIONS,
    items: index.itemsBySectionId.get(sectionId) ?? EMPTY_ITEMS,
  };
};

const EMPTY_INNER_SECTIONS: ContainerSectionItem[] = [];
const EMPTY_ITEMS: SectionItem[] = [];
