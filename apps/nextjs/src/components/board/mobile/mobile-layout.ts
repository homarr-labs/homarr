import type { Board, DynamicSectionItem, ItemLayout, SectionItem } from "~/app/[locale]/boards/_types";

export const mobileColumnCount = 2;
const mobileMaxHeight = 3;

type PositionedElement = DynamicSectionItem | SectionItem;
type PositionedLayout = {
  layoutId: string;
  xOffset: number;
  yOffset: number;
  width: number;
  height: number;
};

const comparePosition = (elementA: PositionedElement, elementB: PositionedElement) =>
  elementA.yOffset - elementB.yOffset || elementA.xOffset - elementB.xOffset;

const getMobileRootSections = (board: Board) =>
  board.sections
    .filter((section) => section.kind !== "dynamic")
    .toSorted((sectionA, sectionB) => sectionA.yOffset - sectionB.yOffset || sectionA.xOffset - sectionB.xOffset);

export const getMobileRootSection = (board: Board) =>
  getMobileRootSections(board)[0] ?? {
    id: "mobile",
    kind: "empty" as const,
    xOffset: 0,
    yOffset: 0,
  };

const getLayout = <TLayout extends PositionedLayout>(
  layouts: TLayout[],
  desktopLayoutId: string,
  layoutPriority: Map<string, number>,
) =>
  layouts.find((layout) => layout.layoutId === desktopLayoutId) ??
  layouts.toSorted(
    (layoutA, layoutB) => (layoutPriority.get(layoutB.layoutId) ?? -1) - (layoutPriority.get(layoutA.layoutId) ?? -1),
  )[0];

export const createMobileBoardItems = (board: Board, desktopLayoutId: string): SectionItem[] => {
  const rootSections = getMobileRootSections(board);
  const defaultSectionId = rootSections[0]?.id ?? "mobile";
  const layoutPriority = new Map(
    board.layouts
      .toSorted(
        (layoutA, layoutB) => layoutA.breakpoint - layoutB.breakpoint || layoutA.columnCount - layoutB.columnCount,
      )
      .map((layout, index) => [layout.id, index]),
  );

  const items = board.items.map(({ layouts, ...item }, index): SectionItem => {
    const layout =
      getLayout(layouts, desktopLayoutId, layoutPriority) ??
      ({
        layoutId: desktopLayoutId,
        xOffset: 0,
        yOffset: index,
        width: 1,
        height: 1,
        sectionId: defaultSectionId,
      } satisfies ItemLayout);

    return { ...item, ...layout, type: "item" };
  });

  const dynamicSections = board.sections
    .filter((section) => section.kind === "dynamic")
    .map(({ layouts, ...section }): DynamicSectionItem | null => {
      const layout = getLayout(layouts, desktopLayoutId, layoutPriority);
      return layout ? { ...section, ...layout, type: "section" } : null;
    })
    .filter((section) => section !== null);

  const elementsBySection = new Map<string, PositionedElement[]>();
  for (const element of [...items, ...dynamicSections]) {
    const parentSectionId = element.type === "item" ? element.sectionId : element.parentSectionId;
    const elements = elementsBySection.get(parentSectionId) ?? [];
    elements.push(element);
    elementsBySection.set(parentSectionId, elements);
  }

  const result: SectionItem[] = [];
  const visitedItems = new Set<string>();
  const visitedSections = new Set<string>();

  const appendSectionItems = (sectionId: string) => {
    if (visitedSections.has(sectionId)) return;
    visitedSections.add(sectionId);

    for (const element of (elementsBySection.get(sectionId) ?? []).toSorted(comparePosition)) {
      if (element.type === "section") {
        appendSectionItems(element.id);
        continue;
      }

      if (!visitedItems.has(element.id)) {
        visitedItems.add(element.id);
        result.push(element);
      }
    }
  };

  rootSections.forEach((section) => appendSectionItems(section.id));
  dynamicSections.toSorted(comparePosition).forEach((section) => appendSectionItems(section.id));
  items.toSorted(comparePosition).forEach((item) => {
    if (!visitedItems.has(item.id)) result.push(item);
  });

  return result.map((item, index) => ({
    ...item,
    xOffset: 0,
    yOffset: index,
    width: Math.max(1, Math.min(item.width, mobileColumnCount)),
    height: Math.max(1, Math.min(item.height, mobileMaxHeight)),
  }));
};

export const createMobileBoardPreviewItems = (board: Board, desktopLayoutId: string) =>
  createMobileBoardItems(board, desktopLayoutId).map((item) => ({
    id: item.id,
    kind: item.kind,
    width: item.width,
    height: item.height,
    title: item.advancedOptions.title,
  }));
