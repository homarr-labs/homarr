import { useMemo } from "react";

import { useCurrentLayout, useRequiredBoard } from "@homarr/boards/context";

import type { ContainerSectionItem, SectionItem } from "~/app/[locale]/boards/_types";

export const useSectionItems = (sectionId: string): { innerSections: ContainerSectionItem[]; items: SectionItem[] } => {
  const board = useRequiredBoard();
  const currentLayoutId = useCurrentLayout();
  const index = useMemo(() => getSectionItemsIndex(board, currentLayoutId), [board, currentLayoutId]);

  return {
    innerSections: index.innerSectionsByParentId.get(sectionId) ?? EMPTY_INNER_SECTIONS,
    items: index.itemsBySectionId.get(sectionId) ?? EMPTY_ITEMS,
  };
};

interface SectionItemsIndex {
  innerSectionsByParentId: ReadonlyMap<string, ContainerSectionItem[]>;
  itemsBySectionId: ReadonlyMap<string, SectionItem[]>;
}

const sectionItemsIndexCache = new WeakMap<
  ReturnType<typeof useRequiredBoard>,
  Map<string, SectionItemsIndex>
>();
const EMPTY_INNER_SECTIONS: ContainerSectionItem[] = [];
const EMPTY_ITEMS: SectionItem[] = [];

const getSectionItemsIndex = (board: ReturnType<typeof useRequiredBoard>, layoutId: string): SectionItemsIndex => {
  const cachedByLayout = sectionItemsIndexCache.get(board);
  const cached = cachedByLayout?.get(layoutId);
  if (cached) return cached;

  const innerSectionsByParentId = new Map<string, ContainerSectionItem[]>();
  for (const section of board.sections) {
    if (section.kind !== "container") continue;
    const { layouts, ...definition } = section;
    const layout = layouts.find((candidate) => candidate.layoutId === layoutId);
    if (!layout) continue;
    const entries = innerSectionsByParentId.get(layout.parentSectionId) ?? [];
    entries.push({ ...layout, ...definition, type: "section" });
    innerSectionsByParentId.set(layout.parentSectionId, entries);
  }

  const itemsBySectionId = new Map<string, SectionItem[]>();
  for (const item of board.items) {
    const { layouts, ...definition } = item;
    const layout = layouts.find((candidate) => candidate.layoutId === layoutId);
    if (!layout) continue;
    const entries = itemsBySectionId.get(layout.sectionId) ?? [];
    entries.push({ ...layout, ...definition, type: "item" });
    itemsBySectionId.set(layout.sectionId, entries);
  }

  const index = { innerSectionsByParentId, itemsBySectionId };
  const nextByLayout = cachedByLayout ?? new Map();
  nextByLayout.set(layoutId, index);
  sectionItemsIndexCache.set(board, nextByLayout);
  return index;
};
