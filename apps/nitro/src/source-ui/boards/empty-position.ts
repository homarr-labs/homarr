interface PositionedItem {
  yOffset: number;
  xOffset: number;
  width: number;
  height: number;
}
export const getFirstEmptyPosition = (
  elements: PositionedItem[],
  columnCount: number,
  rowCount = 9999,
  size: { width: number; height: number } = { width: 1, height: 1 },
) => {
  for (let yOffset = 0; yOffset < rowCount + 1 - size.height; yOffset++) {
    for (let xOffset = 0; xOffset < columnCount + 1 - size.width; xOffset++) {
      const isOccupied = elements.some(
        (element) =>
          element.yOffset < yOffset + size.height &&
          element.yOffset + element.height > yOffset &&
          element.xOffset < xOffset + size.width &&
          element.xOffset + element.width > xOffset,
      );
      if (!isOccupied) return { xOffset, yOffset };
    }
  }
  return undefined;
};
