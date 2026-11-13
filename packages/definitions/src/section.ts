import { generateResponsiveGridFor } from "@homarr/common";
import type { GridAlgorithmItem } from "@homarr/common";

import type { LayoutRole } from "./board";

export const sectionKinds = ["empty", "container"] as const;
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

export const maxBoardTabs = 5;

interface RootSectionLike {
  id: string;
  kind: string;
  xOffset?: number | null;
  yOffset?: number | null;
}

export const compareRootSections = (first: RootSectionLike, second: RootSectionLike) =>
  (first.xOffset ?? 0) - (second.xOffset ?? 0) ||
  (first.yOffset ?? 0) - (second.yOffset ?? 0) ||
  first.id.localeCompare(second.id);

export const getBoardTabSections = <TSection extends RootSectionLike>(sections: readonly TSection[]) =>
  sections
    .filter((section) => section.kind === "empty" && getRootSectionLane(section.xOffset) === "main")
    .toSorted(compareRootSections);

interface LaneGeometry {
  columnCount: number;
  leftGutterColumnCount?: number | null;
  rightGutterColumnCount?: number | null;
  role?: LayoutRole;
}

export const getBoardLaneColumnCount = (layout: LaneGeometry, lane: BoardLane) => {
  const total = Math.max(1, Math.floor(layout.columnCount));
  const left =
    layout.role === "mobile" ? 0 : Math.min(Math.max(0, Math.floor(layout.leftGutterColumnCount ?? 0)), total - 1);
  const right =
    layout.role === "mobile"
      ? 0
      : Math.min(Math.max(0, Math.floor(layout.rightGutterColumnCount ?? 0)), total - left - 1);
  if (lane === "left") return left;
  if (lane === "right") return right;
  return total - left - right;
};

interface ProjectRootSectionsInput {
  sections: readonly RootSectionLike[];
  elements: readonly GridAlgorithmItem[];
  source: LaneGeometry;
  target: LaneGeometry;
}

export const projectRootSections = ({ sections, elements, source, target }: ProjectRootSectionsInput) => {
  const roots = sections.filter((section) => section.kind === "empty").toSorted(compareRootSections);
  const tabs = roots.filter((root) => getRootSectionLane(root.xOffset) === "main");
  const firstTab = tabs[0];
  if (!firstTab) return null;

  const railRootByLane = new Map<BoardLane, RootSectionLike>();
  for (const root of roots) {
    const lane = getRootSectionLane(root.xOffset);
    if (lane !== "main" && !railRootByLane.has(lane)) railRootByLane.set(lane, root);
  }
  const laneByRootId = new Map(roots.map((root) => [root.id, getRootSectionLane(root.xOffset)] as const));
  const getTargetLane = (lane: BoardLane): BoardLane =>
    lane !== "main" && getBoardLaneColumnCount(target, lane) === 0 ? "main" : lane;

  const remappedElements = elements.map((element) => {
    const sourceLane = laneByRootId.get(element.sectionId);
    if (!sourceLane || sourceLane === "main") return element;
    const targetLane = getTargetLane(sourceLane);
    const targetRoot = targetLane === "main" ? firstTab : (railRootByLane.get(targetLane) ?? firstTab);
    return { ...element, sectionId: targetRoot.id };
  });

  const projectRoot = (rootId: string, width: number, sourceLanes: readonly BoardLane[]) => {
    const activeSourceLanes = sourceLanes.filter((lane) => getBoardLaneColumnCount(source, lane) > 0);
    const singleSourceLane = activeSourceLanes.length === 1 ? activeSourceLanes[0] : undefined;
    const previousWidth = singleSourceLane
      ? getBoardLaneColumnCount(source, singleSourceLane)
      : Number.MAX_SAFE_INTEGER;
    return generateResponsiveGridFor({ items: remappedElements, previousWidth, width, sectionId: rootId }).items;
  };

  const lanesFoldingInto = (lane: BoardLane) =>
    boardLanes.filter(
      (sourceLane) => (sourceLane === "main" || railRootByLane.has(sourceLane)) && getTargetLane(sourceLane) === lane,
    );

  return boardLanes.flatMap((lane) => {
    const width = getBoardLaneColumnCount(target, lane);
    if (width === 0) return [];
    if (lane !== "main") {
      const root = railRootByLane.get(lane);
      return root ? projectRoot(root.id, width, lanesFoldingInto(lane)) : [];
    }

    return tabs.flatMap((tab) => {
      if (tab.id === firstTab.id) return projectRoot(tab.id, width, lanesFoldingInto("main"));
      return projectRoot(tab.id, width, ["main"]);
    });
  });
};
