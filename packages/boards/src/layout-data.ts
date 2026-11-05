import type { RouterOutputs } from "@homarr/api";
import type { WidgetKind } from "@homarr/definitions";

export type Board = RouterOutputs["board"]["getHomeBoard"];
export type Section = Board["sections"][number];
export type Item = Board["items"][number];
export type ItemLayout = Item["layouts"][number];
export type SectionItem = Omit<Item, "layouts"> & ItemLayout & { type: "item" };
export type EmptySection = Extract<Section, { kind: "empty" }>;
export type ContainerSection = Extract<Section, { kind: "container" }>;
export type ContainerSectionLayout = ContainerSection["layouts"][number];
export type ContainerSectionItem = Omit<ContainerSection, "layouts"> & ContainerSectionLayout & { type: "section" };
export type ItemOfKind<TKind extends WidgetKind> = Extract<Item, { kind: TKind }>;

interface BoardLayoutData {
  sectionsById: ReadonlyMap<string, Section>;
  innerSectionsByParentId: ReadonlyMap<string, ContainerSectionItem[]>;
  itemsBySectionId: ReadonlyMap<string, SectionItem[]>;
}

interface MinimumSize {
  width: number;
  height: number;
}

const layoutDataCache = new WeakMap<Board, Map<string, BoardLayoutData>>();
const minimumSizesCache = new WeakMap<BoardLayoutData, ReadonlyMap<string, MinimumSize>>();

// Board cache updates replace the board object, so a projection is shared by
// every section and layout consumer until the next board update.
export const getBoardLayoutData = (board: Board, layoutId: string): BoardLayoutData => {
  const cachedByLayout = layoutDataCache.get(board);
  const cached = cachedByLayout?.get(layoutId);
  if (cached) return cached;

  const sectionsById = new Map<string, Section>();
  const innerSectionsByParentId = new Map<string, ContainerSectionItem[]>();
  for (const section of board.sections) {
    sectionsById.set(section.id, section);
    if (section.kind !== "container") continue;
    const { layouts, ...definition } = section;
    const layout = layouts.find((candidate) => candidate.layoutId === layoutId);
    if (!layout) continue;
    const entries = innerSectionsByParentId.get(layout.parentSectionId) ?? [];
    entries.push({ ...layout, ...definition, type: "section" });
    innerSectionsByParentId.set(layout.parentSectionId, entries);
  }

  const itemsBySectionId = new Map<string, SectionItem[]>();
  for (const item of board.items) {
    const { layouts, ...definition } = item;
    const layout = layouts.find((candidate) => candidate.layoutId === layoutId);
    if (!layout) continue;
    const entries = itemsBySectionId.get(layout.sectionId) ?? [];
    entries.push({ ...layout, ...definition, type: "item" });
    itemsBySectionId.set(layout.sectionId, entries);
  }

  const data = { sectionsById, innerSectionsByParentId, itemsBySectionId };
  const nextByLayout = cachedByLayout ?? new Map();
  nextByLayout.set(layoutId, data);
  layoutDataCache.set(board, nextByLayout);
  return data;
};

export const getContainerMinimumSizes = (board: Board, layoutId: string): ReadonlyMap<string, MinimumSize> => {
  const data = getBoardLayoutData(board, layoutId);
  const cached = minimumSizesCache.get(data);
  if (cached) return cached;

  const minimumBySectionId = new Map<string, MinimumSize>();
  const visiting = new Set<string>();
  const resolve = (sectionId: string): MinimumSize => {
    const existing = minimumBySectionId.get(sectionId);
    if (existing) return existing;
    if (visiting.has(sectionId)) return { width: 1, height: 1 };
    visiting.add(sectionId);

    const section = data.sectionsById.get(sectionId);
    const isScrollable = section?.kind === "container" && section.options.scrollable;
    let width = 1;
    let height = 1;
    for (const item of data.itemsBySectionId.get(sectionId) ?? []) {
      width = Math.max(width, item.xOffset + item.width);
      if (!isScrollable) height = Math.max(height, item.yOffset + item.height);
    }
    for (const child of data.innerSectionsByParentId.get(sectionId) ?? []) {
      const minimum = resolve(child.id);
      width = Math.max(width, child.xOffset + Math.max(child.width, minimum.width));
      // Scrollable containers retain their content width floor while their
      // height remains independent of content below the visible viewport.
      if (!isScrollable) height = Math.max(height, child.yOffset + Math.max(child.height, minimum.height));
    }

    const minimum = { width, height };
    visiting.delete(sectionId);
    minimumBySectionId.set(sectionId, minimum);
    return minimum;
  };

  for (const section of data.sectionsById.values()) {
    if (section.kind === "container") resolve(section.id);
  }

  minimumSizesCache.set(data, minimumBySectionId);
  return minimumBySectionId;
};
