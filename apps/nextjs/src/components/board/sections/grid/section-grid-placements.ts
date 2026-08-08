import { getBoardLaneColumnCount, getRootSectionLane } from "@homarr/definitions";

import type { Board } from "~/app/[locale]/boards/_types";
import type { SectionGridPlacement } from "./use-grid-layout-actions";

export const getSectionGridPlacements = (board: Board, layoutId: string, sectionId: string): SectionGridPlacement[] => [
  ...board.items.flatMap((item) => {
    const layout = item.layouts.find((candidate) => candidate.layoutId === layoutId);
    return layout?.sectionId === sectionId
      ? [
          {
            id: item.id,
            type: "item" as const,
            x: layout.xOffset,
            y: layout.yOffset,
            w: layout.width,
            h: layout.height,
          },
        ]
      : [];
  }),
  ...board.sections.flatMap((section) => {
    if (section.kind !== "container") return [];
    const layout = section.layouts.find((candidate) => candidate.layoutId === layoutId);
    return layout?.parentSectionId === sectionId
      ? [
          {
            id: section.id,
            type: "section" as const,
            x: layout.xOffset,
            y: layout.yOffset,
            w: layout.width,
            h: layout.height,
          },
        ]
      : [];
  }),
];

export const getSectionGridColumnCount = (board: Board, layoutId: string, sectionId: string): number | null => {
  const section = board.sections.find((candidate) => candidate.id === sectionId);
  if (!section) return null;
  if (section.kind === "container") {
    return section.layouts.find((layout) => layout.layoutId === layoutId)?.width ?? null;
  }

  const layout = board.layouts.find((candidate) => candidate.id === layoutId);
  return layout ? getBoardLaneColumnCount(layout, getRootSectionLane(section.xOffset)) : null;
};
