import { TRPCError } from "@trpc/server";

import type { WidgetKind } from "@homarr/definitions";
import { widgetDefaultSizes } from "@homarr/definitions";

/**
 * Placement helpers shared by the board automation endpoints.
 *
 * A board consists of one or more layouts (breakpoints), each with its own column count.
 * Every item has exactly one placement per layout, stored in the `item_layout` table.
 * Dynamic sections behave the same way and occupy space inside their parent section.
 */

const maximumScannedRows = 9999;

export interface PlacementLayout {
  id: string;
  name: string;
  columnCount: number;
}

export interface PlacementSection {
  id: string;
  kind: string;
  yOffset: number | null;
}

/** A rectangle that is already taken inside a specific section of a specific layout */
export interface OccupiedArea {
  elementId: string;
  layoutId: string;
  sectionId: string;
  xOffset: number;
  yOffset: number;
  width: number;
  height: number;
}

export interface PlacementInput {
  sectionId?: string;
  xOffset?: number;
  yOffset?: number;
  width?: number;
  height?: number;
  layouts?: {
    layoutId: string;
    sectionId?: string;
    xOffset: number;
    yOffset: number;
    width: number;
    height: number;
  }[];
}

export interface ResolvedPlacement {
  layoutId: string;
  sectionId: string;
  xOffset: number;
  yOffset: number;
  width: number;
  height: number;
}

interface PlacementSectionLayout {
  layoutId: string;
  parentSectionId: string | null;
  xOffset: number;
  yOffset: number;
  width: number;
  height: number;
}

interface BoardLike {
  layouts: PlacementLayout[];
  sections: (PlacementSection & { layouts?: PlacementSectionLayout[] })[];
  items: {
    id: string;
    layouts: {
      layoutId: string;
      sectionId: string;
      xOffset: number;
      yOffset: number;
      width: number;
      height: number;
    }[];
  }[];
}

type BoardWithSectionLayouts = BoardLike;

/**
 * How many columns are available inside a section.
 *
 * A dynamic section is a sub grid of its own width, so everything placed inside of it is bound
 * by that width and not by the column count of the whole board.
 */
const getColumnCountOfSection = (board: BoardLike, sectionId: string, layout: PlacementLayout) => {
  const section = board.sections.find((boardSection) => boardSection.id === sectionId);

  if (section?.kind !== "dynamic") {
    return layout.columnCount;
  }

  const sectionLayout = section.layouts?.find((entry) => entry.layoutId === layout.id);

  return sectionLayout?.width ?? layout.columnCount;
};

/**
 * Collects every area of the board that is already taken.
 * Dynamic sections are included because they consume space inside their parent section.
 */
export const collectOccupiedAreas = (board: BoardWithSectionLayouts, ignoredElementIds: string[] = []) => {
  const areas: OccupiedArea[] = [];

  for (const item of board.items) {
    if (ignoredElementIds.includes(item.id)) continue;

    for (const layout of item.layouts) {
      areas.push({ elementId: item.id, ...layout });
    }
  }

  for (const section of board.sections) {
    if (ignoredElementIds.includes(section.id)) continue;

    for (const sectionLayout of section.layouts ?? []) {
      if (!sectionLayout.parentSectionId) continue;

      areas.push({
        elementId: section.id,
        layoutId: sectionLayout.layoutId,
        sectionId: sectionLayout.parentSectionId,
        xOffset: sectionLayout.xOffset,
        yOffset: sectionLayout.yOffset,
        width: sectionLayout.width,
        height: sectionLayout.height,
      });
    }
  }

  return areas;
};

const overlaps = (first: Omit<OccupiedArea, "elementId" | "layoutId" | "sectionId">, second: OccupiedArea) =>
  first.xOffset < second.xOffset + second.width &&
  first.xOffset + first.width > second.xOffset &&
  first.yOffset < second.yOffset + second.height &&
  first.yOffset + first.height > second.yOffset;

const findCollision = (
  candidate: { xOffset: number; yOffset: number; width: number; height: number },
  areas: OccupiedArea[],
  layoutId: string,
  sectionId: string,
) => areas.find((area) => area.layoutId === layoutId && area.sectionId === sectionId && overlaps(candidate, area));

/**
 * Finds the first free position from top left that fits the given size.
 *
 * The cost of this must not depend on the size of the grid: a board can describe a large one and
 * walking every single cell would let a single request occupy the server for a long time. A free
 * slot can only begin where another one ends, which bounds both axes by the amount of content
 * rather than by the dimensions:
 *
 * - Its left edge is either column zero or the right edge of an occupied area.
 * - Its top edge is either row zero or the bottom edge of an occupied area.
 *
 * Everything below the lowest occupied row is empty, so appending there is the guaranteed fallback.
 */
const findFreePosition = (
  size: { width: number; height: number },
  areas: OccupiedArea[],
  layout: PlacementLayout,
  sectionId: string,
  columnCount: number,
) => {
  if (size.width > columnCount) return null;

  const relevantAreas = areas.filter((area) => area.layoutId === layout.id && area.sectionId === sectionId);
  const firstEmptyRow = relevantAreas.reduce((lowest, area) => Math.max(lowest, area.yOffset + area.height), 0);
  const scannedRows = Math.min(firstEmptyRow, maximumScannedRows);
  const candidateRows = [...new Set([0, ...relevantAreas.map((area) => area.yOffset + area.height)])]
    .filter((yOffset) => yOffset < scannedRows)
    .toSorted((first, second) => first - second);

  for (const yOffset of candidateRows) {
    const startingPoints = new Set([0]);

    for (const area of relevantAreas) {
      const sharesRows = area.yOffset < yOffset + size.height && area.yOffset + area.height > yOffset;
      if (sharesRows) {
        startingPoints.add(area.xOffset + area.width);
      }
    }

    for (const xOffset of [...startingPoints].toSorted((first, second) => first - second)) {
      if (xOffset + size.width > columnCount) continue;

      const candidate = { xOffset, yOffset, ...size };
      if (!findCollision(candidate, areas, layout.id, sectionId)) {
        return candidate;
      }
    }
  }

  // Nothing is placed below the last occupied row, so appending there always works
  return { xOffset: 0, yOffset: firstEmptyRow, ...size };
};

const resolveSectionId = (board: BoardLike, sectionId: string | undefined, context: string) => {
  if (sectionId) {
    const section = board.sections.find((boardSection) => boardSection.id === sectionId);
    if (!section) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `Section '${sectionId}' does not belong to this board` });
    }
    return section.id;
  }

  const emptySection = board.sections
    .filter((section) => section.kind === "empty")
    .toSorted((sectionA, sectionB) => (sectionA.yOffset ?? 0) - (sectionB.yOffset ?? 0))
    .at(0);

  if (!emptySection) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Board has no empty section to place ${context} in, provide a sectionId instead`,
    });
  }

  return emptySection.id;
};

/**
 * Resolves the placement of a single element for every layout of the board.
 *
 * - `layouts` entries are validated strictly, they are meant for full control.
 * - The shorthand (`width`, `height`, `xOffset`, `yOffset`) is applied to every layout and
 *   clamped to the column count of that layout so narrow breakpoints stay valid.
 * - Anything left unspecified falls back to the previous behaviour: default widget size,
 *   placed at the first free position of the first empty section.
 */
export const resolvePlacementForAllLayouts = ({
  board,
  placement,
  occupiedAreas,
  defaultSize,
  context = "the item",
}: {
  board: BoardLike;
  placement: PlacementInput;
  occupiedAreas: OccupiedArea[];
  defaultSize: { width: number; height: number };
  context?: string;
}): ResolvedPlacement[] => {
  const explicitLayoutIds = (placement.layouts ?? []).map(({ layoutId }) => layoutId);
  if (new Set(explicitLayoutIds).size !== explicitLayoutIds.length) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "A layout can only have one placement per element" });
  }

  for (const explicitLayout of placement.layouts ?? []) {
    if (!board.layouts.some((layout) => layout.id === explicitLayout.layoutId)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Layout '${explicitLayout.layoutId}' does not belong to this board`,
      });
    }
  }

  const resolved: ResolvedPlacement[] = [];

  for (const layout of board.layouts) {
    const explicit = placement.layouts?.find((entry) => entry.layoutId === layout.id);

    if (explicit) {
      const sectionId = resolveSectionId(board, explicit.sectionId ?? placement.sectionId, context);
      const columnCount = getColumnCountOfSection(board, sectionId, layout);

      if (explicit.width > columnCount) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Width ${explicit.width} exceeds the ${columnCount} columns available in layout '${layout.name}'`,
        });
      }

      if (explicit.xOffset + explicit.width > columnCount) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Position ${explicit.xOffset} with width ${explicit.width} exceeds the ${columnCount} columns available in layout '${layout.name}'`,
        });
      }

      const collision = findCollision(explicit, occupiedAreas, layout.id, sectionId);
      if (collision) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Position is already taken by '${collision.elementId}' in layout '${layout.name}'`,
        });
      }

      resolved.push({
        layoutId: layout.id,
        sectionId,
        xOffset: explicit.xOffset,
        yOffset: explicit.yOffset,
        width: explicit.width,
        height: explicit.height,
      });
      continue;
    }

    const sectionId = resolveSectionId(board, placement.sectionId, context);
    const columnCount = getColumnCountOfSection(board, sectionId, layout);
    const width = Math.min(placement.width ?? defaultSize.width, columnCount);
    const height = placement.height ?? defaultSize.height;

    if (placement.xOffset !== undefined || placement.yOffset !== undefined) {
      const xOffset = Math.min(placement.xOffset ?? 0, columnCount - width);
      const candidate = { xOffset, yOffset: placement.yOffset ?? 0, width, height };

      const collision = findCollision(candidate, occupiedAreas, layout.id, sectionId);
      if (collision) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Position is already taken by '${collision.elementId}' in layout '${layout.name}'`,
        });
      }

      resolved.push({ layoutId: layout.id, sectionId, ...candidate });
      continue;
    }

    const freePosition = findFreePosition({ width, height }, occupiedAreas, layout, sectionId, columnCount);

    if (!freePosition) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Board section is full, no free grid position available in layout '${layout.name}'`,
      });
    }

    resolved.push({ layoutId: layout.id, sectionId, ...freePosition });
  }

  return resolved;
};

export const getDefaultSizeForKind = (kind: WidgetKind) => widgetDefaultSizes[kind] ?? { width: 1, height: 1 };

/**
 * Marks the resolved placements as occupied so multiple elements can be placed in a single request.
 */
export const appendResolvedPlacements = (
  occupiedAreas: OccupiedArea[],
  elementId: string,
  placements: ResolvedPlacement[],
) => {
  occupiedAreas.push(...placements.map((placement) => ({ elementId, ...placement })));
};
