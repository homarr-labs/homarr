import { getBoardTabForSection } from "@homarr/boards/tabs";

import type { Board, ContainerSection } from "~/app/[locale]/boards/_types";
import { getSectionGridColumnCount, getSectionGridPlacements } from "../../sections/grid/section-grid-placements";
import type { CommitSectionGridInput } from "../../sections/grid/use-grid-layout-actions";
import type { MovableEntry } from "../item-move-modal";
import { getFirstEmptyPosition } from "./empty-position";

export const getEntryMinimumSize = (board: Board, layoutId: string, entry: MovableEntry) => {
  if (entry.type === "item") return { width: 1, height: 1 };
  const children = getSectionGridPlacements(board, layoutId, entry.id);
  return {
    width: entry.minW ?? Math.max(1, ...children.map((child) => child.x + child.w)),
    height: entry.minH ?? Math.max(1, ...children.map((child) => child.y + child.h)),
  };
};

export const isSameOrDescendant = (board: Board, layoutId: string, candidateId: string, ancestorId: string) => {
  let current: string | undefined = candidateId;
  const visited = new Set<string>();
  while (current && !visited.has(current)) {
    if (current === ancestorId) return true;
    visited.add(current);
    const section = board.sections.find((candidate) => candidate.id === current && candidate.kind === "container");
    if (!section || section.kind !== "container") return false;
    current = section.layouts.find((layout) => layout.layoutId === layoutId)?.parentSectionId;
  }
  return false;
};

interface CrossTabMoveInput {
  board: Board;
  currentLayoutId: string;
  entry: MovableEntry;
  sourceSectionId: string;
  targetSectionId: string;
}

export const getCrossTabMoveSnapshots = ({
  board,
  currentLayoutId,
  entry,
  sourceSectionId,
  targetSectionId,
}: CrossTabMoveInput): CommitSectionGridInput[] | null => {
  const sourceTab = getBoardTabForSection(board, currentLayoutId, sourceSectionId);
  const targetTab = getBoardTabForSection(board, currentLayoutId, targetSectionId);
  if (!sourceTab || !targetTab || sourceTab.id === targetTab.id) return [];

  const snapshots: CommitSectionGridInput[] = [];
  for (const layout of board.layouts) {
    if (layout.id === currentLayoutId) continue;
    const sourceLayout =
      entry.type === "item"
        ? board.items
            .find((item) => item.id === entry.id)
            ?.layouts.find((candidate) => candidate.layoutId === layout.id)
        : board.sections
            .find((section): section is ContainerSection => section.kind === "container" && section.id === entry.id)
            ?.layouts.find((candidate) => candidate.layoutId === layout.id);
    if (!sourceLayout) continue;
    const sourceId = "sectionId" in sourceLayout ? sourceLayout.sectionId : sourceLayout.parentSectionId;
    const targetId =
      getBoardTabForSection(board, layout.id, targetSectionId)?.id === targetTab.id ? targetSectionId : targetTab.id;
    if (sourceId === targetId) continue;
    if (entry.type === "section" && isSameOrDescendant(board, layout.id, targetId, entry.id)) return null;

    const columnCount = getSectionGridColumnCount(board, layout.id, targetId);
    if (columnCount === null || columnCount === 0) return null;
    const target = board.sections.find((section) => section.id === targetId);
    const maxRowCount =
      target?.kind === "container"
        ? target.layouts.find((candidate) => candidate.layoutId === layout.id)?.height
        : null;
    if (maxRowCount === undefined) return null;
    const minimum = getEntryMinimumSize(board, layout.id, { ...entry, minW: undefined, minH: undefined });
    if (minimum.width > columnCount) return null;
    const size = {
      width: Math.max(minimum.width, Math.min(sourceLayout.width, columnCount)),
      height: Math.max(minimum.height, sourceLayout.height),
    };
    const placements = getSectionGridPlacements(board, layout.id, targetId).filter(
      (placement) => placement.id !== entry.id,
    );
    const occupied = placements.map(({ x, y, w, h }) => ({ xOffset: x, yOffset: y, width: w, height: h }));
    const position = getFirstEmptyPosition(occupied, columnCount, maxRowCount ?? undefined, size);
    if (!position) return null;

    snapshots.push(
      {
        layoutId: layout.id,
        sectionId: sourceId,
        placements: getSectionGridPlacements(board, layout.id, sourceId).filter(
          (placement) => placement.id !== entry.id,
        ),
      },
      {
        layoutId: layout.id,
        sectionId: targetId,
        placements: [
          ...placements,
          { id: entry.id, type: entry.type, x: position.xOffset, y: position.yOffset, w: size.width, h: size.height },
        ],
      },
    );
  }
  return snapshots;
};
