import { getBoardLaneColumnCount, getRootSectionLane } from "@homarr/definitions";

import type { Board, ContainerSection } from "~/app/[locale]/boards/_types";
import { resolvePinnedGridCollisions } from "~/components/board/sections/grid/dnd";
import type { SectionGridPlacement } from "~/components/board/sections/grid/use-grid-layout-actions";

export interface RemoveContainerInput {
  id: string;
}

export const removeContainerCallback =
  ({ id }: RemoveContainerInput) =>
  (board: Board): Board => {
    const sectionToRemove = board.sections.find(
      (section): section is ContainerSection => section.id === id && section.kind === "container",
    );
    if (!sectionToRemove) return board;

    const flattened = {
      ...board,
      sections: board.sections
        .filter((section) => section.id !== id)
        .map((section) => {
          if (section.kind !== "container") return section;

          return {
            ...section,
            layouts: section.layouts.map((layout) => {
              if (layout.parentSectionId !== sectionToRemove.id) return layout;

              const removedSectionLayout = sectionToRemove.layouts.find(
                (layoutToRemove) => layoutToRemove.layoutId === layout.layoutId,
              );
              if (!removedSectionLayout) throw new Error("Layout not found");

              return {
                ...layout,
                xOffset: layout.xOffset + removedSectionLayout.xOffset,
                yOffset: layout.yOffset + removedSectionLayout.yOffset,
                parentSectionId: removedSectionLayout.parentSectionId,
              };
            }),
          };
        }),
      items: board.items.map((item) => ({
        ...item,
        layouts: item.layouts.map((layout) => {
          if (layout.sectionId !== sectionToRemove.id) return layout;

          const removedSectionLayout = sectionToRemove.layouts.find(
            (layoutToRemove) => layoutToRemove.layoutId === layout.layoutId,
          );
          if (!removedSectionLayout) throw new Error("Layout not found");

          return {
            ...layout,
            xOffset: layout.xOffset + removedSectionLayout.xOffset,
            yOffset: layout.yOffset + removedSectionLayout.yOffset,
            sectionId: removedSectionLayout.parentSectionId,
          };
        }),
      })),
    };

    return resolveFlattenedLayouts(flattened, sectionToRemove, board);
  };

const resolveFlattenedLayouts = (board: Board, removed: ContainerSection, original: Board): Board => {
  const resolvedByLayoutAndId = new Map<string, SectionGridPlacement>();

  for (const removedLayout of removed.layouts) {
    const movedIds = [
      ...original.items.flatMap((item) => {
        const layout = item.layouts.find((candidate) => candidate.layoutId === removedLayout.layoutId);
        return layout?.sectionId === removed.id ? [item.id] : [];
      }),
      ...original.sections.flatMap((section) => {
        if (section.kind !== "container") return [];
        const layout = section.layouts.find((candidate) => candidate.layoutId === removedLayout.layoutId);
        return layout?.parentSectionId === removed.id ? [section.id] : [];
      }),
    ];
    const pinnedId = movedIds.toSorted()[0];
    if (!pinnedId) continue;

    const columnCount = getParentColumnCount(board, removedLayout.layoutId, removedLayout.parentSectionId);
    if (!columnCount) continue;
    const placements = getSectionPlacements(board, removedLayout.layoutId, removedLayout.parentSectionId);
    const pinned = placements.find((placement) => placement.id === pinnedId);
    if (!pinned) continue;

    for (const placement of resolvePinnedGridCollisions(placements, pinned, columnCount)) {
      resolvedByLayoutAndId.set(`${removedLayout.layoutId}:${placement.id}`, placement);
    }
  }

  if (resolvedByLayoutAndId.size === 0) return board;
  return {
    ...board,
    items: board.items.map((item) => ({
      ...item,
      layouts: item.layouts.map((layout) => {
        const placement = resolvedByLayoutAndId.get(`${layout.layoutId}:${item.id}`);
        return placement?.type === "item"
          ? {
              ...layout,
              xOffset: placement.x,
              yOffset: placement.y,
              width: placement.w,
              height: placement.h,
            }
          : layout;
      }),
    })),
    sections: board.sections.map((section) =>
      section.kind !== "container"
        ? section
        : {
            ...section,
            layouts: section.layouts.map((layout) => {
              const placement = resolvedByLayoutAndId.get(`${layout.layoutId}:${section.id}`);
              return placement?.type === "section"
                ? {
                    ...layout,
                    xOffset: placement.x,
                    yOffset: placement.y,
                    width: placement.w,
                    height: placement.h,
                  }
                : layout;
            }),
          },
    ),
  };
};

const getSectionPlacements = (board: Board, layoutId: string, sectionId: string): SectionGridPlacement[] => [
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

const getParentColumnCount = (board: Board, layoutId: string, sectionId: string) => {
  const section = board.sections.find((candidate) => candidate.id === sectionId);
  if (!section) return null;
  if (section.kind === "container") {
    return section.layouts.find((layout) => layout.layoutId === layoutId)?.width ?? null;
  }
  const layout = board.layouts.find((candidate) => candidate.id === layoutId);
  return layout ? getBoardLaneColumnCount(layout, getRootSectionLane(section.xOffset)) : null;
};
