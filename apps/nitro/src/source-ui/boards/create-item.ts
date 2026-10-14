import type { Board, BoardDomainResources, BoardRoot } from "../../features/boards/contracts";
import { getGridColumns, getGridPlacements } from "../../features/boards/draft";
import type { BoardItemClipboardPayload } from "./board-item-clipboard";
import { getFirstEmptyPosition } from "./empty-position";

export const createClipboardItem = (
  previous: Board,
  item: BoardItemClipboardPayload["items"][number],
  id: string,
  resources: BoardDomainResources,
): Board => {
  if ([...previous.items, ...previous.sections].some((entry) => entry.id === id))
    throw new Error("Pasted item ID already exists");
  const targetSection = previous.sections
    .filter(
      (section): section is BoardRoot =>
        section.kind === "empty" && resources.definitions.getRootSectionLane(section.xOffset) === "main",
    )
    .toSorted((first, second) => first.yOffset - second.yOffset)
    .at(0);
  if (!targetSection) throw new Error("The main canvas requires layout repair");
  const layouts = previous.layouts.map((layout) => {
    const columnCount = getGridColumns(previous, layout.id, targetSection.id, resources);
    if (columnCount < 1) throw new Error("The main canvas requires layout repair");
    const size = { width: Math.min(item.size.width, columnCount), height: item.size.height };
    const elements = getGridPlacements(previous, layout.id, targetSection.id).map((placement) => ({
      xOffset: placement.x,
      yOffset: placement.y,
      width: placement.w,
      height: placement.h,
    }));
    const emptyPosition = getFirstEmptyPosition(elements, columnCount, undefined, size);
    if (!emptyPosition) throw new Error("Your board is full");
    return { ...size, ...emptyPosition, sectionId: targetSection.id, layoutId: layout.id };
  });
  return {
    ...previous,
    items: previous.items.concat({
      id,
      kind: item.kind,
      options: item.options,
      integrationIds: item.integrationIds,
      advancedOptions: item.advancedOptions,
      layouts,
    }),
  };
};
