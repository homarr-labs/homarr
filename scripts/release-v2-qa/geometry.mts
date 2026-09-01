import type { LayoutRole } from "../../packages/definitions/index.ts";
import { getBoardLaneColumnCount, getRootSectionLane } from "../../packages/definitions/index.ts";

interface GeometryLayout {
  id: string;
  boardId: string;
  columnCount: number;
  leftGutterColumnCount: number;
  rightGutterColumnCount: number;
  role: LayoutRole;
}

interface GeometrySection {
  id: string;
  boardId: string;
  kind: "empty" | "container";
  xOffset: number | null;
}

interface GeometryPlacement {
  layoutId: string;
  sectionId: string;
  xOffset: number;
  yOffset: number;
  width: number;
  height: number;
}

interface GeometrySectionLayout extends GeometryPlacement {
  parentSectionId: string | null;
}

interface GeometryItemLayout extends GeometryPlacement {
  itemId: string;
  boardId: string;
}

export interface FixtureGeometry {
  layouts: GeometryLayout[];
  sections: GeometrySection[];
  sectionLayouts: GeometrySectionLayout[];
  itemLayouts: GeometryItemLayout[];
}

const placementIsValid = (placement: GeometryPlacement) =>
  Number.isInteger(placement.xOffset) &&
  Number.isInteger(placement.yOffset) &&
  Number.isInteger(placement.width) &&
  Number.isInteger(placement.height) &&
  placement.xOffset >= 0 &&
  placement.yOffset >= 0 &&
  placement.width >= 1 &&
  placement.height >= 1;

const placementsOverlap = (first: GeometryPlacement, second: GeometryPlacement) =>
  first.xOffset < second.xOffset + second.width &&
  second.xOffset < first.xOffset + first.width &&
  first.yOffset < second.yOffset + second.height &&
  second.yOffset < first.yOffset + first.height;

const compareItemLayouts = (first: GeometryItemLayout, second: GeometryItemLayout) => {
  if (first.itemId < second.itemId) return -1;
  if (first.itemId > second.itemId) return 1;
  return 0;
};

export const findFixtureGeometryErrors = (geometry: FixtureGeometry) => {
  const errors: string[] = [];
  const layoutsById = new Map(geometry.layouts.map((layout) => [layout.id, layout]));
  const sectionsById = new Map(geometry.sections.map((section) => [section.id, section]));
  const sectionLayoutsByKey = new Map<string, GeometrySectionLayout>();
  const itemsByDomain = new Map<string, GeometryItemLayout[]>();

  const addItemLayout = (itemLayout: GeometryItemLayout) => {
    const key = `${itemLayout.layoutId}\0${itemLayout.sectionId}`;
    const itemLayouts = itemsByDomain.get(key) ?? [];
    itemLayouts.push(itemLayout);
    itemsByDomain.set(key, itemLayouts);
  };

  for (const sectionLayout of geometry.sectionLayouts) {
    const key = `${sectionLayout.layoutId}\0${sectionLayout.sectionId}`;
    if (sectionLayoutsByKey.has(key)) {
      errors.push(`container ${sectionLayout.sectionId} has duplicate placement in layout ${sectionLayout.layoutId}`);
      continue;
    }
    sectionLayoutsByKey.set(key, sectionLayout);
  }

  const parentCapacity = (
    layout: GeometryLayout,
    parentSection: GeometrySection,
  ): { columns: number; kind: "lane" | "container" } | undefined => {
    if (parentSection.kind === "empty") {
      return {
        columns: getBoardLaneColumnCount(layout, getRootSectionLane(parentSection.xOffset)),
        kind: "lane",
      };
    }

    const parentLayout = sectionLayoutsByKey.get(`${layout.id}\0${parentSection.id}`);
    if (!parentLayout) return undefined;
    return { columns: parentLayout.width, kind: "container" };
  };

  for (const sectionLayout of geometry.sectionLayouts) {
    const layout = layoutsById.get(sectionLayout.layoutId);
    const section = sectionsById.get(sectionLayout.sectionId);
    const parent = sectionLayout.parentSectionId ? sectionsById.get(sectionLayout.parentSectionId) : undefined;
    if (!layout || !section || !parent) {
      errors.push(
        `container ${sectionLayout.sectionId} in layout ${sectionLayout.layoutId} has unknown geometry references`,
      );
      continue;
    }
    if (section.kind !== "container" || section.boardId !== layout.boardId || parent.boardId !== layout.boardId) {
      errors.push(`container ${section.id} in layout ${layout.id} crosses a board or root boundary`);
      continue;
    }
    if (!placementIsValid(sectionLayout)) {
      errors.push(`container ${section.id} in layout ${layout.id} has an invalid placement`);
      continue;
    }

    const capacity = parentCapacity(layout, parent);
    if (!capacity) {
      errors.push(`container ${section.id} in layout ${layout.id} has an unplaced parent container`);
    } else if (sectionLayout.xOffset + sectionLayout.width > capacity.columns) {
      errors.push(
        `container ${section.id} in layout ${layout.id} exceeds its ${capacity.columns}-column parent ${capacity.kind}`,
      );
    }

    const visited = new Set<string>();
    let currentSectionId: string | null = section.id;
    while (currentSectionId) {
      if (visited.has(currentSectionId)) {
        errors.push(`container cycle detected in layout ${layout.id} at ${currentSectionId}`);
        break;
      }
      visited.add(currentSectionId);
      const current = sectionsById.get(currentSectionId);
      if (!current || current.kind === "empty") break;
      currentSectionId = sectionLayoutsByKey.get(`${layout.id}\0${currentSectionId}`)?.parentSectionId ?? null;
    }
  }

  for (const itemLayout of geometry.itemLayouts) {
    const layout = layoutsById.get(itemLayout.layoutId);
    const parent = sectionsById.get(itemLayout.sectionId);
    if (!layout || !parent || itemLayout.boardId !== layout.boardId || parent.boardId !== layout.boardId) {
      errors.push(`item ${itemLayout.itemId} in layout ${itemLayout.layoutId} crosses a board or section boundary`);
      continue;
    }
    if (!placementIsValid(itemLayout)) {
      errors.push(`item ${itemLayout.itemId} in layout ${layout.id} has an invalid placement`);
      continue;
    }
    const capacity = parentCapacity(layout, parent);
    if (!capacity) {
      errors.push(`item ${itemLayout.itemId} in layout ${layout.id} has an unplaced parent container`);
      continue;
    }
    if (itemLayout.xOffset + itemLayout.width > capacity.columns) {
      errors.push(
        `item ${itemLayout.itemId} in layout ${layout.id} exceeds its ${capacity.columns}-column parent ${capacity.kind}`,
      );
      continue;
    }
    addItemLayout(itemLayout);
  }

  const sortedDomains = [...itemsByDomain.entries()].toSorted(([first], [second]) => {
    if (first < second) return -1;
    if (first > second) return 1;
    return 0;
  });
  for (const [domain, itemLayouts] of sortedDomains) {
    const separatorIndex = domain.indexOf("\0");
    const layoutId = domain.slice(0, separatorIndex);
    const sectionId = domain.slice(separatorIndex + 1);
    const sortedItemLayouts = itemLayouts.toSorted(compareItemLayouts);
    for (const [index, first] of sortedItemLayouts.entries()) {
      for (const second of sortedItemLayouts.slice(index + 1)) {
        if (!placementsOverlap(first, second)) continue;
        errors.push(`item ${first.itemId} overlaps item ${second.itemId} in layout ${layoutId} section ${sectionId}`);
      }
    }
  }

  return errors;
};
