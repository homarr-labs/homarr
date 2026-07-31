"use client";

import { useCallback } from "react";

import { useUpdateBoard } from "@homarr/boards/updater";

import type { GridPlacement } from "~/components/board/layout";

export interface SectionGridPlacement extends GridPlacement {
  type: "item" | "section";
  minW?: number;
  minH?: number;
}

export interface CommitSectionGridInput {
  layoutId: string;
  sectionId: string;
  placements: readonly SectionGridPlacement[];
}

/**
 * Commits a complete section snapshot in one cache update. GridStack can move
 * several neighbours for one gesture, so persisting only the active item would
 * lose its collision result.
 */
export const useGridLayoutActions = () => {
  const { updateBoard } = useUpdateBoard();

  const commitSectionGrids = useCallback(
    (snapshots: readonly CommitSectionGridInput[]) => {
      const byId = new Map(
        snapshots.flatMap(({ layoutId, sectionId, placements }) =>
          placements.map((placement) => [`${layoutId}:${placement.id}`, { layoutId, sectionId, placement }] as const),
        ),
      );
      updateBoard((previous) => {
        return {
          ...previous,
          items: previous.items.map((item) => {
            const layouts = item.layouts.map((layout) => {
              const resolved = byId.get(`${layout.layoutId}:${item.id}`);
              if (!resolved || resolved.placement.type !== "item") return layout;
              const { placement, sectionId } = resolved;

              return {
                ...layout,
                sectionId,
                xOffset: placement.x,
                yOffset: placement.y,
                width: placement.w,
                height: placement.h,
              };
            });

            return layouts.some((layout, index) => layout !== item.layouts[index]) ? { ...item, layouts } : item;
          }),
          sections: previous.sections.map((innerSection) => {
            if (innerSection.kind !== "dynamic") return innerSection;
            const layouts = innerSection.layouts.map((layout) => {
              const resolved = byId.get(`${layout.layoutId}:${innerSection.id}`);
              if (!resolved || resolved.placement.type !== "section") return layout;
              const { placement, sectionId } = resolved;

              return {
                ...layout,
                parentSectionId: sectionId,
                xOffset: placement.x,
                yOffset: placement.y,
                width: placement.w,
                height: placement.h,
              };
            });

            return layouts.some((layout, index) => layout !== innerSection.layouts[index])
              ? { ...innerSection, layouts }
              : innerSection;
          }),
        };
      });
    },
    [updateBoard],
  );

  const commitSectionGrid = useCallback(
    (snapshot: CommitSectionGridInput) => {
      commitSectionGrids([snapshot]);
    },
    [commitSectionGrids],
  );

  return { commitSectionGrid, commitSectionGrids };
};
