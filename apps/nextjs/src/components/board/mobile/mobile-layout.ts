import type { Board, CategorySection, DynamicSectionItem, ItemLayout, SectionItem } from "~/app/[locale]/boards/_types";

export const mobileColumnCount = 2;
const mobileMaxHeight = 3;
const mobileSectionAnchorPrefix = "mobile-board-section-";

type PositionedElement = DynamicSectionItem | SectionItem;
type PositionedLayout = {
  layoutId: string;
  xOffset: number;
  yOffset: number;
  width: number;
  height: number;
};

export type MobileBoardSectionHeading = {
  type: "sectionHeading";
  id: string;
  sectionId: string;
  title: string;
  anchorId: string;
  headingLevel: 2 | 3 | 4 | 5 | 6;
};

export type MobileBoardElement = SectionItem | MobileBoardSectionHeading;

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

export const getMobileSectionAnchorId = (sectionId: string) => `${mobileSectionAnchorPrefix}${sectionId}`;

const getLayout = <TLayout extends PositionedLayout>(
  layouts: TLayout[],
  desktopLayoutId: string,
  layoutPriority: Map<string, number>,
) =>
  layouts.find((layout) => layout.layoutId === desktopLayoutId) ??
  layouts.toSorted(
    (layoutA, layoutB) => (layoutPriority.get(layoutB.layoutId) ?? -1) - (layoutPriority.get(layoutA.layoutId) ?? -1),
  )[0];

const createSectionHeading = (
  section: CategorySection | DynamicSectionItem,
  headingDepth: number,
): MobileBoardSectionHeading | null => {
  const title = (section.kind === "category" ? section.name : section.options.title).trim();
  if (title.length === 0) return null;

  return {
    type: "sectionHeading",
    id: `section-heading-${section.id}`,
    sectionId: section.id,
    title,
    anchorId: getMobileSectionAnchorId(section.id),
    headingLevel: Math.min(headingDepth + 2, 6) as MobileBoardSectionHeading["headingLevel"],
  };
};

export const createMobileBoardElements = (board: Board, desktopLayoutId: string): MobileBoardElement[] => {
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

  const result: MobileBoardElement[] = [];
  const visitedItems = new Set<string>();
  const visitedSections = new Set<string>();

  const createSectionElements = (
    section: CategorySection | DynamicSectionItem | (typeof rootSections)[number],
    headingDepth = 0,
  ): { elements: MobileBoardElement[]; items: SectionItem[] } => {
    if (visitedSections.has(section.id)) return { elements: [], items: [] };
    const sectionId = section.id;
    visitedSections.add(sectionId);
    const heading = section.kind === "empty" ? null : createSectionHeading(section, headingDepth);

    const sectionElements: MobileBoardElement[] = [];
    const sectionItems: SectionItem[] = [];
    for (const element of (elementsBySection.get(sectionId) ?? []).toSorted(comparePosition)) {
      if (element.type === "section") {
        const nestedResult = createSectionElements(element, heading ? headingDepth + 1 : headingDepth);
        sectionElements.push(...nestedResult.elements);
        sectionItems.push(...nestedResult.items);
        continue;
      }

      if (!visitedItems.has(element.id)) {
        visitedItems.add(element.id);
        sectionElements.push(element);
        sectionItems.push(element);
      }
    }

    if (sectionItems.length === 0) return { elements: [], items: [] };

    return {
      elements: heading ? [heading, ...sectionElements] : sectionElements,
      items: sectionItems,
    };
  };

  rootSections.forEach((section) => result.push(...createSectionElements(section).elements));
  dynamicSections
    .toSorted(comparePosition)
    .forEach((section) => result.push(...createSectionElements(section).elements));
  items.toSorted(comparePosition).forEach((item) => {
    if (!visitedItems.has(item.id)) result.push(item);
  });

  let itemIndex = 0;
  return result.map((element) => {
    if (element.type === "sectionHeading") return element;

    return {
      ...element,
      xOffset: 0,
      yOffset: itemIndex++,
      width: Math.max(1, Math.min(element.width, mobileColumnCount)),
      height: Math.max(1, Math.min(element.height, mobileMaxHeight)),
    };
  });
};

export const createMobileBoardItems = (board: Board, desktopLayoutId: string): SectionItem[] =>
  createMobileBoardElements(board, desktopLayoutId).filter(
    (element): element is SectionItem => element.type === "item",
  );
