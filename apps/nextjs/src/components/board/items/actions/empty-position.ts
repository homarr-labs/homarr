import type { SectionItem } from "~/app/[locale]/boards/_types";

export const getFirstEmptyPosition = (
  elements: Pick<SectionItem, "yOffset" | "xOffset" | "width" | "height">[],
  columnCount: number,
  rowCount = 9999,
  size: { width: number; height: number } = { width: 1, height: 1 },
) => {
  for (let yOffset = 0; yOffset < rowCount + 1 - size.height; yOffset++) {
    for (let xOffset = 0; xOffset < columnCount + 1 - size.width; xOffset++) {
      if (isPositionEmpty(elements, { xOffset, yOffset }, size)) {
        return { xOffset, yOffset };
      }
    }
  }
  return undefined;
};

export const getNearestEmptyPosition = (
  elements: Pick<SectionItem, "yOffset" | "xOffset" | "width" | "height">[],
  columnCount: number,
  rowCount: number,
  preferred: { xOffset: number; yOffset: number },
  size: { width: number; height: number },
) => {
  const maxX = columnCount - size.width;
  const maxY = rowCount - size.height;
  if (maxX < 0 || maxY < 0) return undefined;

  const clamped = {
    xOffset: Math.min(Math.max(0, preferred.xOffset), maxX),
    yOffset: Math.min(Math.max(0, preferred.yOffset), maxY),
  };
  if (isPositionEmpty(elements, clamped, size)) return clamped;

  const lastOccupiedRow = elements.reduce((maximum, element) => Math.max(maximum, element.yOffset + element.height), 0);
  const searchMaxY = Math.min(maxY, Math.max(clamped.yOffset + 20, lastOccupiedRow + size.height));
  let best: { xOffset: number; yOffset: number; distance: number } | undefined;

  for (let yOffset = 0; yOffset <= searchMaxY; yOffset++) {
    for (let xOffset = 0; xOffset <= maxX; xOffset++) {
      if (!isPositionEmpty(elements, { xOffset, yOffset }, size)) continue;
      const distance = Math.abs(xOffset - clamped.xOffset) + Math.abs(yOffset - clamped.yOffset);
      if (!best || distance < best.distance) best = { xOffset, yOffset, distance };
    }
  }

  return best && { xOffset: best.xOffset, yOffset: best.yOffset };
};

const isPositionEmpty = (
  elements: Pick<SectionItem, "yOffset" | "xOffset" | "width" | "height">[],
  position: { xOffset: number; yOffset: number },
  size: { width: number; height: number },
) =>
  !elements.some(
    (element) =>
      element.yOffset < position.yOffset + size.height &&
      element.yOffset + element.height > position.yOffset &&
      element.xOffset < position.xOffset + size.width &&
      element.xOffset + element.width > position.xOffset,
  );
