import { getLayoutResizeSource } from "@homarr/common";
import type { GridAlgorithmItem } from "@homarr/common";
import type { LayoutRole, WidgetKind } from "@homarr/definitions";
import { projectRootSections } from "@homarr/definitions";

export interface BoardPreviewLayout {
  id: string;
  columnCount: number;
  leftGutterColumnCount: number;
  rightGutterColumnCount: number;
  breakpoint: number;
  role: LayoutRole;
  resizeSource?: string | null;
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
  primaryColor?: string | null;
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
      yOffset?: number | null;
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
  const currentElements = getElementsForLayout(board, sourceLayout.id);
  let serializedSource: string | null | undefined;
  if (sourceLayout.id === targetLayout.id) {
    serializedSource = board.layouts.find((layout) => layout.id === sourceLayout.id)?.resizeSource;
  }
  const source = getLayoutResizeSource(sourceLayout, currentElements, serializedSource);
  const elements = source.elements;

  if (
    sourceLayout.id === targetLayout.id &&
    sourceLayout.columnCount === targetLayout.columnCount &&
    sourceLayout.leftGutterColumnCount === targetLayout.leftGutterColumnCount &&
    sourceLayout.rightGutterColumnCount === targetLayout.rightGutterColumnCount
  ) {
    return currentElements;
  }

  return (
    projectRootSections({ sections: board.sections, elements, source: source.geometry, target: targetLayout }) ?? []
  );
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
