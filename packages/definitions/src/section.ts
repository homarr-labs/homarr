export const sectionKinds = ["category", "empty", "dynamic"] as const;
export type SectionKind = (typeof sectionKinds)[number];

export const boardLanes = ["left", "main", "right"] as const;
export type BoardLane = (typeof boardLanes)[number];

export const rootSectionOffsets = {
  left: -1,
  main: 0,
  right: 1,
} as const satisfies Record<BoardLane, number>;

export const getRootSectionLane = (xOffset: number | null | undefined): BoardLane => {
  if (xOffset === rootSectionOffsets.left) return "left";
  if (xOffset === rootSectionOffsets.right) return "right";
  return "main";
};

export const getBoardLaneColumnCount = (
  layout: {
    columnCount: number;
    leftGutterColumnCount?: number | null;
    rightGutterColumnCount?: number | null;
  },
  lane: BoardLane,
) => {
  const total = Math.max(1, Math.floor(layout.columnCount));
  const left = Math.min(Math.max(0, Math.floor(layout.leftGutterColumnCount ?? 0)), total - 1);
  const right = Math.min(Math.max(0, Math.floor(layout.rightGutterColumnCount ?? 0)), total - left - 1);
  if (lane === "left") return left;
  if (lane === "right") return right;
  return total - left - right;
};
