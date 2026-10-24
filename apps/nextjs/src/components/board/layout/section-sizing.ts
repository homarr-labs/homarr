import { calculateBoardUiScale } from "@homarr/boards/scale";
import type { BoardLane } from "@homarr/definitions";

import { CONTAINER_CARD_INSET, CONTAINER_HEADER_HEIGHT } from "./constants";
import { getLogicalGridSize } from "./geometry";

interface SectionHeaderOptions {
  collapsible: boolean;
  showLabel: boolean;
  title: string;
}

interface SectionSizingInput {
  section: { kind: "empty" } | { kind: "container"; options: SectionHeaderOptions };
  columnCount: number;
  canvasScale: number;
  parentContentScale: number;
  inlineInsetCount?: number;
  innerSections: readonly { yOffset: number; options: SectionHeaderOptions }[];
  purpose: "viewport" | "minimum";
}

/** Shared frame measurements; callers retain their distinct row rounding and viewport caps. */
export const getSectionSizing = ({
  section,
  columnCount,
  canvasScale,
  parentContentScale,
  inlineInsetCount = 2,
  innerSections,
  purpose,
}: SectionSizingInput) => {
  const parentScale = canvasScale * parentContentScale;
  // Only rendering guards unavailable scale and content width. Minimum sizing uses the raw values.
  const effectiveScale =
    purpose === "viewport" && (!Number.isFinite(parentScale) || parentScale <= 0) ? 1 : parentScale;
  const isContainer = section.kind === "container";
  const outerCardInset = isContainer ? (2 * CONTAINER_CARD_INSET) / effectiveScale : 0;
  const outerCardInlineInset = isContainer ? (inlineInsetCount * CONTAINER_CARD_INSET) / effectiveScale : 0;
  const fullGridWidth = getLogicalGridSize(columnCount);
  const contentWidth = fullGridWidth - outerCardInlineInset;
  const logicalWidth = purpose === "viewport" ? Math.max(1, contentWidth) : contentWidth;
  const contentScale = isContainer ? Math.max(0.01, Math.min(logicalWidth / fullGridWidth, 1)) : 1;
  const hasHeader = isContainer && section.options.collapsible && section.options.showLabel;
  const headerInset = hasHeader
    ? (CONTAINER_HEADER_HEIGHT * calculateBoardUiScale(canvasScale)) / parentContentScale
    : 0;
  let nestedHeaderInset = 0;
  let expandedOverhead = outerCardInset;
  if (hasHeader) expandedOverhead += headerInset;
  if (
    isContainer &&
    (section.options.collapsible || (section.options.showLabel && section.options.title)) &&
    innerSections.some(
      (child) =>
        child.yOffset === 0 &&
        (child.options.collapsible || (child.options.showLabel && child.options.title)) &&
        (!hasHeader || !child.options.collapsible || !child.options.showLabel),
    )
  ) {
    // Keep the extra gap whenever either adjacent header still floats over its border.
    nestedHeaderInset = (20 * calculateBoardUiScale(canvasScale)) / effectiveScale;
    expandedOverhead += nestedHeaderInset;
  }

  return {
    effectiveScale,
    logicalWidth,
    contentScale,
    outerCardInset,
    headerInset,
    nestedHeaderInset,
    expandedOverhead,
  };
};

/** Only a root side Lane lets a container omit the insets touching its inline edges. */
export const getContainerInlineInsetCount = (
  section: { xOffset: number; width: number },
  parentLane?: { lane: BoardLane; columnCount: number },
) => {
  let inlineInsetCount = 2;
  if (parentLane && parentLane.lane !== "main") {
    if (section.xOffset === 0) inlineInsetCount -= 1;
    if (section.xOffset + section.width === parentLane.columnCount) inlineInsetCount -= 1;
  }
  return inlineInsetCount;
};
