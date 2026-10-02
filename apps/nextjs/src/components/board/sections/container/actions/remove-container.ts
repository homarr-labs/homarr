import type { Board, ContainerSection } from "~/app/[locale]/boards/_types";
import { resolvePinnedGridCollisions } from "~/components/board/sections/grid/dnd";
import {
  getSectionGridColumnCount,
  getSectionGridPlacements,
} from "~/components/board/sections/grid/section-grid-placements";
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

    const removedLayoutsById = new Map(sectionToRemove.layouts.map((layout) => [layout.layoutId, layout]));
    const childLayoutIds = [
      ...board.sections.flatMap((section) =>
        section.kind === "container"
          ? section.layouts.flatMap((layout) =>
              layout.parentSectionId === sectionToRemove.id ? [layout.layoutId] : [],
            )
          : [],
      ),
      ...board.items.flatMap((item) =>
        item.layouts.flatMap((layout) => (layout.sectionId === sectionToRemove.id ? [layout.layoutId] : [])),
      ),
    ];
    const hasUnresolvableChildLayout = childLayoutIds.some((layoutId) => {
      const removedLayout = removedLayoutsById.get(layoutId);
      return (
        !removedLayout || !isValidFlattenDestination(board, sectionToRemove.id, layoutId, removedLayout.parentSectionId)
      );
    });
    if (hasUnresolvableChildLayout) return board;

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
              if (!removedSectionLayout) return layout;

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
          if (!removedSectionLayout) return layout;

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

const isValidFlattenDestination = (
  board: Board,
  removedSectionId: string,
  layoutId: string,
  destinationSectionId: string,
) => {
  const visited = new Set<string>();
  let sectionId = destinationSectionId;

  while (true) {
    if (sectionId === removedSectionId || visited.has(sectionId)) return false;
    visited.add(sectionId);

    const section = board.sections.find((candidate) => candidate.id === sectionId);
    if (!section) return false;
    if (section.kind !== "container") return true;

    const layout = section.layouts.find((candidate) => candidate.layoutId === layoutId);
    if (!layout) return false;
    sectionId = layout.parentSectionId;
  }
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
    const columnCount = getSectionGridColumnCount(board, removedLayout.layoutId, removedLayout.parentSectionId);
    if (!columnCount) continue;
    const placements = getSectionGridPlacements(board, removedLayout.layoutId, removedLayout.parentSectionId);
    const movedIdSet = new Set(movedIds);
    const pinned = placements
      .filter((placement) => movedIdSet.has(placement.id))
      .toSorted((first, second) => first.y - second.y || first.x - second.x || first.id.localeCompare(second.id))[0];
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
