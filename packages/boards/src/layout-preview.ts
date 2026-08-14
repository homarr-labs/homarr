import { generateResponsiveGridFor } from "@homarr/common";
import type { GridAlgorithmItem } from "@homarr/common";
import type { BoardLane, LayoutRole, WidgetKind } from "@homarr/definitions";
import { boardLanes, getBoardLaneColumnCount, getRootSectionLane } from "@homarr/definitions";

export interface BoardPreviewLayout {
  id: string;
  columnCount: number;
  leftGutterColumnCount: number;
  rightGutterColumnCount: number;
  breakpoint: number;
  role: LayoutRole;
}

interface BoardPreviewItemLayout {
  layoutId: string;
  sectionId: string;
  xOffset: number;
  yOffset: number;
  width: number;
  height: number;
}

interface BoardPreviewSectionLayout {
  layoutId: string;
  parentSectionId: string | null;
  xOffset: number;
  yOffset: number;
  width: number;
  height: number;
}

export interface BoardPreviewData {
  layouts: readonly BoardPreviewLayout[];
  sections: readonly BoardPreviewSection[];
  items: readonly {
    id: string;
    kind?: WidgetKind;
    iconUrl?: string | null;
    layouts: readonly BoardPreviewItemLayout[];
  }[];
}

type BoardPreviewSection =
  | {
      id: string;
      kind: "empty";
      xOffset: number | null;
      layouts?: readonly BoardPreviewSectionLayout[];
    }
  | {
      id: string;
      kind: "container";
      xOffset?: number | null;
      layouts: readonly BoardPreviewSectionLayout[];
    };

type LayoutGeometry = Pick<
  BoardPreviewLayout,
  "id" | "columnCount" | "leftGutterColumnCount" | "rightGutterColumnCount"
>;

export const getRepresentativeLayoutWidth = (layout: BoardPreviewLayout, allLayouts: readonly BoardPreviewLayout[]) => {
  if (layout.role === "mobile") return 390;
  if (layout.role === "base") return Math.max(1280, layout.breakpoint);

  const nextLayout = allLayouts
    .filter((candidate) => candidate.breakpoint > layout.breakpoint)
    .toSorted((layoutA, layoutB) => layoutA.breakpoint - layoutB.breakpoint)
    .at(0);

  return nextLayout ? Math.round((layout.breakpoint + nextLayout.breakpoint) / 2) : Math.max(1280, layout.breakpoint);
};

export const projectBoardLayout = (
  board: BoardPreviewData,
  sourceLayout: LayoutGeometry,
  targetLayout: LayoutGeometry,
) => {
  const elements = getElementsForLayout(board, sourceLayout.id);

  if (
    sourceLayout.id === targetLayout.id &&
    sourceLayout.columnCount === targetLayout.columnCount &&
    sourceLayout.leftGutterColumnCount === targetLayout.leftGutterColumnCount &&
    sourceLayout.rightGutterColumnCount === targetLayout.rightGutterColumnCount
  ) {
    return elements;
  }

  const emptyRoots = board.sections
    .filter((section) => section.kind === "empty")
    .toSorted((first, second) => (first.xOffset ?? 0) - (second.xOffset ?? 0) || first.id.localeCompare(second.id));
  const rootByLane = new Map<BoardLane, (typeof emptyRoots)[number]>();
  for (const root of emptyRoots) {
    const lane = getRootSectionLane(root.xOffset);
    if (!rootByLane.has(lane)) rootByLane.set(lane, root);
  }

  const mainRoot = rootByLane.get("main");
  if (!mainRoot) return [];

  const sourceRootById = new Map(
    emptyRoots.map((section) => [section.id, getRootSectionLane(section.xOffset)] as const),
  );
  const targetLaneBySourceLane = new Map<BoardLane, BoardLane>(
    boardLanes.map((lane) => [
      lane,
      lane !== "main" && getBoardLaneColumnCount(targetLayout, lane) === 0 ? "main" : lane,
    ]),
  );
  const remappedElements = elements.map((element) => {
    const sourceLane = sourceRootById.get(element.sectionId);
    if (!sourceLane) return element;
    const targetLane = targetLaneBySourceLane.get(sourceLane) ?? "main";
    return { ...element, sectionId: (rootByLane.get(targetLane) ?? mainRoot).id };
  });

  return boardLanes.flatMap((lane) => {
    const root = rootByLane.get(lane);
    const width = getBoardLaneColumnCount(targetLayout, lane);
    if (!root || width === 0) return [];

    const sourceLanes = boardLanes.filter(
      (sourceLane) =>
        rootByLane.has(sourceLane) &&
        getBoardLaneColumnCount(sourceLayout, sourceLane) > 0 &&
        targetLaneBySourceLane.get(sourceLane) === lane,
    );
    const previousWidth =
      sourceLanes.length === 1
        ? getBoardLaneColumnCount(sourceLayout, sourceLanes[0] ?? "main")
        : Number.MAX_SAFE_INTEGER;

    return generateResponsiveGridFor({
      items: remappedElements,
      previousWidth,
      width,
      sectionId: root.id,
    }).items;
  });
};

const getElementsForLayout = (board: BoardPreviewData, layoutId: string): GridAlgorithmItem[] => [
  ...board.items.flatMap((item) => {
    const layout = item.layouts.find((candidate) => candidate.layoutId === layoutId);
    return layout
      ? [
          {
            id: item.id,
            type: "item" as const,
            height: layout.height,
            width: layout.width,
            xOffset: layout.xOffset,
            yOffset: layout.yOffset,
            sectionId: layout.sectionId,
          },
        ]
      : [];
  }),
  ...board.sections.flatMap((section) => {
    if (section.kind !== "container") return [];
    const layout = section.layouts.find((candidate) => candidate.layoutId === layoutId);
    return layout?.parentSectionId
      ? [
          {
            id: section.id,
            type: "section" as const,
            height: layout.height,
            width: layout.width,
            xOffset: layout.xOffset,
            yOffset: layout.yOffset,
            sectionId: layout.parentSectionId,
          },
        ]
      : [];
  }),
];
