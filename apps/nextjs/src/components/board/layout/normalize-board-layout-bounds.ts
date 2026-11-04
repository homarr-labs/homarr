import { getBoardSectionColumnCount } from "@homarr/validation/board-layout-bounds";

import type { Board } from "~/app/[locale]/boards/_types";

export const normalizeBoardLayoutBounds = (board: Board): Board => {
  let items = board.items;
  let sections = board.sections;
  let hasChanges = false;

  for (const layout of board.layouts) {
    const visited = new Set<string>();
    const normalizeSection = (sectionId: string, columnCount: number) => {
      if (columnCount < 1 || visited.has(sectionId)) return;
      visited.add(sectionId);

      const normalizePlacement = <T extends { xOffset: number; width: number }>(placement: T): T => {
        const width = Math.max(1, Math.min(placement.width, columnCount));
        const xOffset = Math.max(0, Math.min(placement.xOffset, columnCount - width));
        if (width === placement.width && xOffset === placement.xOffset) return placement;
        hasChanges = true;
        return { ...placement, width, xOffset };
      };

      items = items.map((item) => {
        const layouts = item.layouts.map((placement) => {
          if (placement.layoutId !== layout.id || placement.sectionId !== sectionId) return placement;
          return normalizePlacement(placement);
        });
        if (layouts.every((placement, index) => placement === item.layouts[index])) return item;
        return { ...item, layouts };
      });

      sections = sections.map((section) => {
        if (section.kind !== "container") return section;
        const layouts = section.layouts.map((placement) => {
          if (placement.layoutId !== layout.id || placement.parentSectionId !== sectionId) return placement;
          return normalizePlacement(placement);
        });
        if (layouts.every((placement, index) => placement === section.layouts[index])) return section;
        return { ...section, layouts };
      });

      for (const section of sections) {
        if (section.kind !== "container") continue;
        const placement = section.layouts.find(
          (candidate) => candidate.layoutId === layout.id && candidate.parentSectionId === sectionId,
        );
        if (placement) normalizeSection(section.id, placement.width);
      }
    };

    for (const section of sections) {
      if (section.kind !== "empty") continue;
      const columnCount = getBoardSectionColumnCount(board, layout.id, section.id);
      if (columnCount !== null) normalizeSection(section.id, columnCount);
    }
  }

  if (!hasChanges) return board;
  return { ...board, items, sections };
};
