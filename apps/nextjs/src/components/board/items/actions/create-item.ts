import { getBoardLayouts } from "@homarr/boards/context";
import { createId } from "@homarr/common";
import type { Modify } from "@homarr/common/types";
import type { WidgetKind } from "@homarr/definitions";
import { widgetDefaultSizes } from "@homarr/definitions";

import type { Board, EmptySection, Item, ItemLayout } from "~/app/[locale]/boards/_types";
import { getFirstEmptyPosition } from "./empty-position";
import { getSectionElements } from "./section-elements";

export interface CreateItemInput {
  id?: string;
  kind: WidgetKind;
  options?: Record<string, unknown>;
  integrationIds?: string[];
}

export const createItemCallback =
  ({ id, kind, options = {}, integrationIds = [] }: CreateItemInput) =>
  (previous: Board): Board => {
    const firstSection = previous.sections
      .filter((section): section is EmptySection => section.kind === "empty")
      .toSorted((sectionA, sectionB) => sectionA.yOffset - sectionB.yOffset)
      .at(0);

    if (!firstSection) return previous;

    const widget = {
      id: id ?? createId(),
      kind,
      options,
      layouts: createItemLayouts(previous, firstSection, kind),
      integrationIds,
      advancedOptions: {
        title: null,
        customCssClasses: [],
        borderColor: "",
      },
    } satisfies Modify<
      Item,
      {
        kind: WidgetKind;
      }
    >;

    return {
      ...previous,
      items: previous.items.concat(widget),
    };
  };

const defaultItemSize = { width: 1, height: 1 };

const getWidgetItemSize = (kind: WidgetKind) => widgetDefaultSizes[kind] ?? defaultItemSize;

const createItemLayouts = (board: Board, currentSection: EmptySection, kind: WidgetKind): ItemLayout[] => {
  const layouts = getBoardLayouts(board);
  const itemSize = getWidgetItemSize(kind);

  return layouts.map((layoutId) => {
    const boardLayout = board.layouts.find((layout) => layout.id === layoutId);
    const elements = getSectionElements(board, { sectionId: currentSection.id, layoutId });

    const emptyPosition = boardLayout
      ? getFirstEmptyPosition(elements, boardLayout.columnCount, 9999, itemSize)
      : { xOffset: 0, yOffset: 0 };

    if (!emptyPosition) {
      throw new Error("Your board is full");
    }

    return {
      width: itemSize.width,
      height: itemSize.height,
      ...emptyPosition,
      sectionId: currentSection.id,
      layoutId,
    };
  });
};
