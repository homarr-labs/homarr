import type { Board, DynamicSectionItem, EmptySection, SectionItem } from "~/app/[locale]/boards/_types";

type BoardLayout = Board["layouts"][number];
type StaticGridElement = SectionItem | DynamicSectionItem;

const STATIC_GRID_ITEM_INSET = 20;
const DEFAULT_SMALL_VIEWPORT_WIDTH = 360;
const DEFAULT_LARGE_VIEWPORT_WIDTH = 1280;

export const getStaticGridLayouts = (layouts: Board["layouts"]) =>
  [...layouts].toSorted((layoutA, layoutB) => layoutA.breakpoint - layoutB.breakpoint);

const escapeCssString = (value: string) => value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');

export const getStaticLayoutSelectionCss = (boardId: string, layouts: Board["layouts"]) => {
  const sortedLayouts = getStaticGridLayouts(layouts);
  const initialLayout = sortedLayouts.at(0);

  if (!initialLayout) return "";

  const scope = `[data-static-board="${escapeCssString(boardId)}"]`;
  const css = [
    `${scope} .static-board-layout { display: none; }`,
    `${scope} .static-board-layout[data-static-layout="${escapeCssString(initialLayout.id)}"] { display: block; }`,
  ];

  for (const layout of sortedLayouts.slice(1)) {
    css.push(
      `@media (min-width: ${layout.breakpoint}px) { ${scope} .static-board-layout { display: none; } ${scope} .static-board-layout[data-static-layout="${escapeCssString(layout.id)}"] { display: block; } }`,
    );
  }

  return css.join("\n");
};

export const getFullWidthSortedSections = (board: Board) =>
  board.sections
    .filter(
      (section): section is EmptySection | Extract<Board["sections"][number], { kind: "category" }> =>
        section.kind === "empty" || section.kind === "category",
    )
    .sort((sectionA, sectionB) => sectionA.yOffset - sectionB.yOffset);

export const getSectionItemsForLayout = (board: Board, sectionId: string, layoutId: string): SectionItem[] => {
  return board.items
    .map(({ layouts, ...item }) => {
      const layout = layouts.find((candidate) => candidate.layoutId === layoutId);
      if (!layout) return null;
      return { ...layout, ...item, type: "item" as const };
    })
    .filter((item): item is SectionItem => item !== null && item.sectionId === sectionId);
};

export const getDynamicSectionsForLayout = (
  board: Board,
  sectionId: string,
  layoutId: string,
): DynamicSectionItem[] => {
  return board.sections
    .filter((section) => section.kind === "dynamic")
    .map(({ layouts, ...section }) => {
      const layout = layouts.find((candidate) => candidate.layoutId === layoutId);
      if (!layout) return null;
      return { ...layout, ...section, type: "section" as const };
    })
    .filter((entry): entry is DynamicSectionItem => entry !== null && entry.parentSectionId === sectionId);
};

export const getStaticGridElements = (board: Board, sectionId: string, layoutId: string): StaticGridElement[] => {
  return [
    ...getSectionItemsForLayout(board, sectionId, layoutId),
    ...getDynamicSectionsForLayout(board, sectionId, layoutId),
  ].toSorted((itemA, itemB) => {
    if (itemA.yOffset === itemB.yOffset) return itemA.xOffset - itemB.xOffset;
    return itemA.yOffset - itemB.yOffset;
  });
};

export const getStaticGridRowCount = (items: StaticGridElement[], fixedRowCount?: number) => {
  return fixedRowCount ?? Math.max(...items.map((item) => item.yOffset + item.height));
};

export const getEstimatedGridWidth = (layout: BoardLayout, nextLayout?: BoardLayout) => {
  if (nextLayout) {
    const upperBound = Math.max(nextLayout.breakpoint - 1, DEFAULT_SMALL_VIEWPORT_WIDTH);
    return Math.max(DEFAULT_SMALL_VIEWPORT_WIDTH, Math.round((layout.breakpoint + upperBound) / 2));
  }

  return Math.max(layout.breakpoint, DEFAULT_LARGE_VIEWPORT_WIDTH);
};

export const getFallbackDimensions = (
  item: Pick<StaticGridElement, "width" | "height">,
  estimatedGridWidth: number,
  columnCount: number,
) => {
  const cellSize = estimatedGridWidth / columnCount;

  return {
    width: Math.max(0, item.width * cellSize - STATIC_GRID_ITEM_INSET),
    height: Math.max(0, item.height * cellSize - STATIC_GRID_ITEM_INSET),
  };
};
