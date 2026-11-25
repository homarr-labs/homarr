"use client";

import { useCallback } from "react";

import { useUpdateBoard } from "@homarr/boards/updater";
import {
  getSmartContainerMemberIds,
  getUnassignedSmartContainerItemCount,
  resolveSmartContainerMembership,
} from "@homarr/validation/smart-container";

import type { Board } from "~/app/[locale]/boards/_types";
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
export const commitSectionGridsCallback =
  (snapshots: readonly CommitSectionGridInput[]) =>
  (previous: Board): Board => {
    const byId = new Map(
      snapshots.flatMap(({ layoutId, sectionId, placements }) =>
        placements.map((placement) => [`${layoutId}:${placement.id}`, { layoutId, sectionId, placement }] as const),
      ),
    );
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

    if (!hasChanges) return previous;

    for (const section of sections) {
      if (section.kind !== "container" || !section.options.smart?.enabled) continue;
      const before = getSmartContainerMemberIds(section, previous.items);
      const after = getSmartContainerMemberIds(section, items);
      if ([...after].every((id) => before.has(id))) continue;

      const states = section.options.smart.states;
      const resolved = resolveSmartContainerMembership(states, after);
      if (getUnassignedSmartContainerItemCount(resolved, after) > 0) return previous;
    }
    return { ...previous, items, sections };
  };

export const useGridLayoutActions = () => {
  const { updateBoard } = useUpdateBoard();

  const commitSectionGrids = useCallback(
    (snapshots: readonly CommitSectionGridInput[]) => {
      let hasChanges = false;
      updateBoard((previous) => {
        const next = commitSectionGridsCallback(snapshots)(previous);
        hasChanges = next !== previous;
        return next;
      });
      return hasChanges;
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
