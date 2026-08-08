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
 * Commits complete section snapshots in one cache update. One drag or resize
 * can move several neighbours and can cross section boundaries, so the whole
 * transaction must remain atomic.
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
        let hasChanges = false;
        const items = previous.items.map((item) => {
          const layouts = item.layouts.map((layout) => {
            const resolved = byId.get(`${layout.layoutId}:${item.id}`);
            if (!resolved || resolved.placement.type !== "item") return layout;
            const { placement, sectionId } = resolved;
            if (
              layout.sectionId === sectionId &&
              layout.xOffset === placement.x &&
              layout.yOffset === placement.y &&
              layout.width === placement.w &&
              layout.height === placement.h
            ) {
              return layout;
            }

            return {
              ...layout,
              sectionId,
              xOffset: placement.x,
              yOffset: placement.y,
              width: placement.w,
              height: placement.h,
            };
          });

          if (!layouts.some((layout, index) => layout !== item.layouts[index])) return item;
          hasChanges = true;
          return { ...item, layouts };
        });
        const sections = previous.sections.map((innerSection) => {
          if (innerSection.kind !== "container") return innerSection;
          const layouts = innerSection.layouts.map((layout) => {
            const resolved = byId.get(`${layout.layoutId}:${innerSection.id}`);
            if (!resolved || resolved.placement.type !== "section") return layout;
            const { placement, sectionId } = resolved;
            if (
              layout.parentSectionId === sectionId &&
              layout.xOffset === placement.x &&
              layout.yOffset === placement.y &&
              layout.width === placement.w &&
              layout.height === placement.h
            ) {
              return layout;
            }

            return {
              ...layout,
              parentSectionId: sectionId,
              xOffset: placement.x,
              yOffset: placement.y,
              width: placement.w,
              height: placement.h,
            };
          });

          if (!layouts.some((layout, index) => layout !== innerSection.layouts[index])) return innerSection;
          hasChanges = true;
          return { ...innerSection, layouts };
        });

        return hasChanges ? { ...previous, items, sections } : previous;
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
