import type { LayoutRole, SectionKind } from "@homarr/definitions";
import { getBoardLaneColumnCount, getRootSectionLane } from "@homarr/definitions";

interface BoardLayoutBoundsContext {
  layouts: readonly {
    id: string;
    name: string;
    columnCount: number;
    leftGutterColumnCount?: number | null;
    rightGutterColumnCount?: number | null;
    role?: LayoutRole;
  }[];
  sections: readonly {
    id: string;
    kind: SectionKind;
    xOffset?: number | null;
    layouts?: readonly { layoutId: string; width: number }[];
  }[];
}

export const getBoardSectionColumnCount = (
  board: BoardLayoutBoundsContext,
  layoutId: string,
  sectionId: string,
): number | null => {
  const layout = board.layouts.find((candidate) => candidate.id === layoutId);
  const section = board.sections.find((candidate) => candidate.id === sectionId);
  if (!layout || !section) return null;
  if (section.kind === "empty") return getBoardLaneColumnCount(layout, getRootSectionLane(section.xOffset));
  return section.layouts?.find((candidate) => candidate.layoutId === layoutId)?.width ?? null;
};

export const getBoardPlacementBoundsIssue = (
  board: BoardLayoutBoundsContext,
  placement: { layoutId: string; xOffset: number; width: number },
  sectionId: string,
  name: string,
): string | null => {
  const columnCount = getBoardSectionColumnCount(board, placement.layoutId, sectionId);
  const layoutName = board.layouts.find((layout) => layout.id === placement.layoutId)?.name ?? placement.layoutId;
  if (columnCount === null) {
    return `${name} references an unknown layout or section in layout "${layoutName}"`;
  }
  if (placement.xOffset < 0 || placement.width < 1 || placement.xOffset + placement.width > columnCount) {
    return `${name} exceeds section "${sectionId}" bounds in layout "${layoutName}": xOffset ${placement.xOffset} + width ${placement.width} must fit within ${columnCount} columns`;
  }
  return null;
};

export const getBoardLayoutBoundsIssue = (
  board: BoardLayoutBoundsContext & {
    items: readonly {
      id: string;
      layouts: readonly { layoutId: string; sectionId: string; xOffset: number; width: number }[];
    }[];
    sections: readonly {
      id: string;
      kind: SectionKind;
      layouts?: readonly { layoutId: string; parentSectionId: string | null; xOffset: number; width: number }[];
    }[];
  },
): string | null => {
  for (const section of board.sections) {
    if (section.kind !== "container") continue;
    for (const placement of section.layouts ?? []) {
      const issue = getBoardPlacementBoundsIssue(
        board,
        placement,
        placement.parentSectionId ?? "",
        `Section "${section.id}"`,
      );
      if (issue) return issue;
    }
  }
  for (const item of board.items) {
    for (const placement of item.layouts) {
      const issue = getBoardPlacementBoundsIssue(board, placement, placement.sectionId, `Item "${item.id}"`);
      if (issue) return issue;
    }
  }
  return null;
};
