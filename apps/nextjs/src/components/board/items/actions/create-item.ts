import { getBoardLayouts } from "@homarr/boards/context";
import { createId } from "@homarr/common";
import type { Modify } from "@homarr/common/types";
import { getRootSectionLane } from "@homarr/definitions";
import type { WidgetKind } from "@homarr/definitions";
import { widgetDefaultSizes } from "@homarr/definitions";

import type { Board, EmptySection, Item, ItemLayout } from "~/app/[locale]/boards/_types";
import { getBoardLaneColumnCount } from "~/components/board/layout";
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
      .filter(
        (section): section is EmptySection =>
          section.kind === "empty" && getRootSectionLane(section.xOffset) === "main",
      )
      .toSorted((sectionA, sectionB) => sectionA.yOffset - sectionB.yOffset)
      .at(0);

    if (!firstSection) return previous;

    const itemLayouts = createItemLayouts(previous, firstSection, kind);
    const widget = {
      id: id ?? createId(),
      kind,
      options,
      layouts: itemLayouts,
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
    const columnCount = boardLayout ? getBoardLaneColumnCount(boardLayout, "main") : itemSize.width;
    const size = {
      width: Math.min(itemSize.width, columnCount),
      height: itemSize.height,
    };

    const emptyPosition = boardLayout
      ? getFirstEmptyPosition(elements, columnCount, undefined, size)
      : { xOffset: 0, yOffset: 0 };

    if (!emptyPosition) {
      throw new Error("Your board is full");
    }

    return {
      width: size.width,
      height: size.height,
      ...emptyPosition,
      sectionId: currentSection.id,
      layoutId,
    };
  });
};
