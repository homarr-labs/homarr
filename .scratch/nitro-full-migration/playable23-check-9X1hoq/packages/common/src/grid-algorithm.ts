export interface GridAlgorithmItem {
  id: string;
  type: "item" | "section";
  width: number;
  height: number;
  xOffset: number;
  yOffset: number;
  sectionId: string;
}

interface GridAlgorithmInput {
  items: GridAlgorithmItem[];
  width: number;
  previousWidth: number;
  sectionId: string;
}

interface GridAlgorithmOutput {
  height: number;
  items: GridAlgorithmItem[];
}

export const generateResponsiveGridFor = ({
  items,
  previousWidth,
  width,
  sectionId,
}: GridAlgorithmInput): GridAlgorithmOutput =>
  generateResponsiveGridForSection({ items, previousWidth, width, sectionId }, new Set());

const generateResponsiveGridForSection = (
  { items, previousWidth, width, sectionId }: GridAlgorithmInput,
  ancestorSectionIds: ReadonlySet<string>,
): GridAlgorithmOutput => {
  if (ancestorSectionIds.has(sectionId)) return { height: 0, items: [] };

  const nextAncestorSectionIds = new Set(ancestorSectionIds).add(sectionId);
  const itemsOfCurrentSection = items
    .filter((item) => item.sectionId === sectionId)
    .toSorted((itemA, itemB) =>
      itemA.yOffset === itemB.yOffset ? itemA.xOffset - itemB.xOffset : itemA.yOffset - itemB.yOffset,
    );
  const normalizedItems = normalizeItems(itemsOfCurrentSection, width);

  if (itemsOfCurrentSection.length === 0) return { height: 0, items: [] };

  const newItems: GridAlgorithmItem[] = [];
  const dynamicSectionHeightMap = new Map<string, number>();
  for (const dynamicSection of normalizedItems.filter((item) => item.type === "section")) {
    const result = generateResponsiveGridForSection(
      {
        items,
        previousWidth: dynamicSection.previousWidth,
        width: dynamicSection.width,
        sectionId: dynamicSection.id,
      },
      nextAncestorSectionIds,
    );
    newItems.push(...result.items);
    dynamicSectionHeightMap.set(dynamicSection.id, result.height);
  }

  if (width >= previousWidth) {
    return {
      height: Math.max(...itemsOfCurrentSection.map((item) => item.yOffset + item.height)),
      items: newItems.concat(normalizedItems),
    };
  }

  const occupied2d: boolean[][] = [];
  for (const item of normalizedItems) {
    const itemWithHeight = {
      ...item,
      height: item.type === "section" ? Math.max(dynamicSectionHeightMap.get(item.id) ?? 1, item.height) : item.height,
    };
    const position = nextFreeSpot(occupied2d, itemWithHeight, width);
    if (!position) throw new Error("No free spot available");

    addItemToOccupied(occupied2d, itemWithHeight, position, width);
    newItems.push({ ...itemWithHeight, xOffset: position.x, yOffset: position.y });
  }

  return { height: occupied2d.length, items: newItems };
};

const normalizeItems = (items: GridAlgorithmItem[], columnCount: number) =>
  items.map((item) => ({ ...item, previousWidth: item.width, width: Math.min(columnCount, item.width) }));

const addItemToOccupied = (
  occupied2d: boolean[][],
  item: GridAlgorithmItem,
  position: { x: number; y: number },
  columnCount: number,
) => {
  for (let yOffset = 0; yOffset < item.height; yOffset++) {
    let row = occupied2d[position.y + yOffset];
    if (!row) {
      row = Array.from({ length: columnCount }, () => false);
      occupied2d.push(row);
    }
    for (let xOffset = 0; xOffset < item.width; xOffset++) row[position.x + xOffset] = true;
  }
};

const nextFreeSpot = (occupied2d: boolean[][], item: GridAlgorithmItem, columnCount: number) => {
  for (let offsetY = 0; offsetY < 99999; offsetY++) {
    for (let offsetX = 0; offsetX < columnCount; offsetX++) {
      if (offsetX + item.width <= columnCount && isFree(occupied2d, item, { x: offsetX, y: offsetY })) {
        return { x: offsetX, y: offsetY };
      }
    }
  }
  return null;
};

const isFree = (occupied2d: boolean[][], item: GridAlgorithmItem, position: { x: number; y: number }) => {
  for (let yOffset = 0; yOffset < item.height; yOffset++) {
    const row = occupied2d[position.y + yOffset];
    if (!row) return true;
    for (let xOffset = 0; xOffset < item.width; xOffset++) {
      if (row[position.x + xOffset]) return false;
    }
  }
  return true;
};
