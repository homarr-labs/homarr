import { getBoardLayoutData, getContainerMinimumSizes } from "@homarr/boards/layout-data";
import type { Board, ContainerSectionItem } from "@homarr/boards/layout-data";
import { calculateBoardUiScale } from "@homarr/boards/scale";
import { getBoardLaneColumnCount, getRootSectionLane } from "@homarr/definitions";

import {
  CONTAINER_HEADER_HEIGHT,
  getCollapsedDisplayLayout,
  getLayoutRowCount,
  getLogicalGridSize,
  LOGICAL_GRID_PITCH,
} from "~/components/board/layout";
import { resolveSmartContainerMembership } from "@homarr/validation/smart-container";
import { projectSmartContainerState, getSmartContainerGridPlacements } from "../smart-container/smart-container-layout";
import {
  canShowSmartContainerPeeks,
  getSmartContainerDisplayRows,
  getSmartContainerChromeHeight,
} from "../smart-container/constants";
import { createGridRowProjection } from "./grid-row-projection";

export const CONTAINER_CARD_INSET = 5;

interface ContainerGridMetricsInput {
  section: ContainerSectionItem;
  innerSections: readonly ContainerSectionItem[];
  canvasScale: number;
  parentContentScale: number;
  inlineInsetCount?: number;
  blockInsetCount?: number;
  collapsed?: boolean;
  hasHeader?: boolean;
}

export const getContainerGridMetrics = ({
  section,
  innerSections,
  canvasScale,
  parentContentScale,
  inlineInsetCount = 2,
  blockInsetCount = 2,
  collapsed = false,
  hasHeader = section.options.collapsible && section.options.showLabel,
}: ContainerGridMetricsInput) => {
  const effectiveScale = canvasScale * parentContentScale;
  const fullWidth = getLogicalGridSize(section.width);
  const logicalWidth = Math.max(1, fullWidth - (inlineInsetCount * CONTAINER_CARD_INSET) / effectiveScale);
  const contentScale = Math.max(0.01, Math.min(logicalWidth / fullWidth, 1));
  let headerInset = 0;
  if (hasHeader && !collapsed)
    headerInset = (CONTAINER_HEADER_HEIGHT * calculateBoardUiScale(canvasScale)) / parentContentScale;
  let nestedHeaderInset = 0;
  if (
    (section.options.collapsible || (section.options.showLabel && section.options.title)) &&
    innerSections.some(
      (child) =>
        child.yOffset === 0 &&
        (child.options.collapsible || (child.options.showLabel && child.options.title)) &&
        (!hasHeader || !child.options.collapsible || !child.options.showLabel),
    )
  )
    nestedHeaderInset = (20 * calculateBoardUiScale(canvasScale)) / effectiveScale;
  const overhead = (blockInsetCount * CONTAINER_CARD_INSET) / effectiveScale + headerInset + nestedHeaderInset;
  return { logicalWidth, contentScale, nestedHeaderInset, overhead };
};

const minimumHeightsCache = new WeakMap<
  Board,
  Map<string, { canvasScale: number; collapsedSectionIds: ReadonlySet<string>; heights: ReadonlyMap<string, number> }>
>();

/** Display heights include exact header/inset space, never rounded into saved grid rows. */
export const getContainerGridMinimumHeights = (
  board: Board,
  layoutId: string,
  canvasScale: number,
  collapsedSectionIds: ReadonlySet<string>,
  reclaimSmartSpace = false,
) => {
  const cacheKey = JSON.stringify([layoutId, reclaimSmartSpace]);
  const cachedByLayout = minimumHeightsCache.get(board);
  const cached = cachedByLayout?.get(cacheKey);
  if (cached?.canvasScale === canvasScale && cached.collapsedSectionIds === collapsedSectionIds) return cached.heights;
  const data = getBoardLayoutData(board, layoutId);
  const logicalMinimums = getContainerMinimumSizes(board, layoutId);
  const boardLayout = board.layouts.find((layout) => layout.id === layoutId);
  const minimumHeights = new Map<string, number>();
  const visiting = new Set<string>();
  const resolve = (section: ContainerSectionItem, parentContentScale = 1, insets = { inline: 2, block: 2 }): number => {
    const existing = minimumHeights.get(section.id);
    if (existing !== undefined) return existing;
    if (visiting.has(section.id)) return section.height;
    visiting.add(section.id);
    const innerSections = data.innerSectionsByParentId.get(section.id) ?? [];
    const items = data.itemsBySectionId.get(section.id) ?? [];
    const metrics = getContainerGridMetrics({
      section,
      innerSections,
      canvasScale,
      parentContentScale,
      inlineInsetCount: insets.inline,
      blockInsetCount: insets.block,
    });
    const heights = new Map<string, number>();
    const children = [
      ...items,
      ...innerSections.map((child) => {
        const minimum = logicalMinimums.get(child.id);
        let height = child.height;
        if (!child.options.scrollable && !child.options.smart?.enabled) height = Math.max(height, minimum?.height ?? 1);
        const resolved = { ...child, height };
        heights.set(child.id, resolve(resolved, parentContentScale * metrics.contentScale));
        return resolved;
      }),
    ];
    let logicalPlacements = getCollapsedDisplayLayout(
      children.map((child) => ({
        type: child.type,
        id: child.id,
        x: child.xOffset,
        y: child.yOffset,
        w: child.width,
        h: child.height,
      })),
      { columnCount: section.width, collapsedItemIds: new Set() },
    );
    const smart = section.options.smart;
    let smartChrome = 0;
    const reclaim = reclaimSmartSpace && smart?.enabled && smart.reclaimSpace && smart.states.length > 0;
    if (reclaim) {
      const states = resolveSmartContainerMembership(smart.states, new Set(items.map((item) => item.id)));
      const state =
        states.find((entry) => entry.id === smart.fallbackStateId) ??
        states.find((entry) => entry.enabled) ??
        states[0];
      const initial = projectSmartContainerState({
        state,
        items,
        columnCount: section.width,
        rowBudget: section.height,
        options: smart,
        authored: false,
        expandedItemId: null,
        activities: {},
        now: 0,
      });
      logicalPlacements = getSmartContainerGridPlacements(logicalPlacements, initial);
      const hasHeader = section.options.collapsible && section.options.showLabel;
      const showPeeks = canShowSmartContainerPeeks(smart, section.height, hasHeader, canvasScale);
      smartChrome =
        (getSmartContainerChromeHeight(showPeeks) * calculateBoardUiScale(canvasScale)) / parentContentScale;
    }
    const collapsedIds = new Set(
      innerSections
        .filter((child) => child.options.collapsible && collapsedSectionIds.has(child.id))
        .map((child) => child.id),
    );
    const collapsedRowCountById = new Map(
      innerSections
        .filter((child) => child.options.showLabel && collapsedIds.has(child.id))
        .map((child) => [
          child.id,
          (CONTAINER_HEADER_HEIGHT + CONTAINER_CARD_INSET + 10) /
            (canvasScale * parentContentScale * metrics.contentScale * LOGICAL_GRID_PITCH),
        ]),
    );
    if (reclaimSmartSpace) {
      for (const child of innerSections) {
        const rows = heights.get(child.id);
        if (!child.options.smart?.enabled || rows === undefined || rows >= child.height || collapsedIds.has(child.id))
          continue;
        collapsedIds.add(child.id);
        collapsedRowCountById.set(child.id, rows);
      }
    }
    const collapsedPlacements = getCollapsedDisplayLayout(logicalPlacements, {
      columnCount: section.width,
      collapsedItemIds: collapsedIds,
      collapsedRowCountById,
    });
    const projection = createGridRowProjection(
      collapsedPlacements,
      new Map([...heights].filter(([id]) => !collapsedIds.has(id))),
    );
    let height = 1;
    if (reclaim) {
      const rows = Math.max(1, getLayoutRowCount(collapsedPlacements));
      const contentHeight = getLogicalGridSize(projection.getDisplayRow(rows)) * metrics.contentScale;
      height = getSmartContainerDisplayRows(section.height, contentHeight, metrics.overhead + smartChrome);
    } else if (smart?.enabled) {
      height = Math.max(1, section.height);
    } else if (!section.options.scrollable) {
      const rowCount = Math.max(1, section.height, getLayoutRowCount(collapsedPlacements));
      height = Math.max(
        height,
        (getLogicalGridSize(projection.getDisplayRow(rowCount)) * metrics.contentScale + metrics.overhead) /
          LOGICAL_GRID_PITCH,
      );
    }
    visiting.delete(section.id);
    minimumHeights.set(section.id, height);
    return height;
  };
  for (const root of board.sections) {
    if (root.kind !== "empty") continue;
    for (const section of data.innerSectionsByParentId.get(root.id) ?? []) {
      let inlineInsetCount = 2;
      let blockInsetCount = 2;
      const lane = getRootSectionLane(root.xOffset);
      if (lane !== "main" && boardLayout) {
        if (section.yOffset === 0) blockInsetCount -= 1;
        if (section.xOffset === 0) inlineInsetCount -= 1;
        if (section.xOffset + section.width === getBoardLaneColumnCount(boardLayout, lane)) inlineInsetCount -= 1;
      }
      resolve(section, 1, { inline: inlineInsetCount, block: blockInsetCount });
    }
  }
  const nextByLayout = cachedByLayout ?? new Map();
  nextByLayout.set(cacheKey, { canvasScale, collapsedSectionIds, heights: minimumHeights });
  minimumHeightsCache.set(board, nextByLayout);
  return minimumHeights;
};
