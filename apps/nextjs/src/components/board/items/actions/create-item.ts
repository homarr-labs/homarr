import type { Modify } from "@homarr/common/types";
import { createId } from "@homarr/db/client";
import type { WidgetKind } from "@homarr/definitions";

import type { Board, EmptySection, Item, ItemLayout } from "~/app/[locale]/boards/_types";
import { getBoardLayouts } from "~/app/[locale]/boards/(content)/_context";
import { getFirstEmptyPosition } from "./empty-position";
import { getSectionElements } from "./section-elements";

export interface CreateItemInput {
  kind: WidgetKind;
}

export const createItemCallback =
  ({ kind }: CreateItemInput) =>
  (previous: Board): Board => {
    const firstSection = previous.sections
      .filter((section): section is EmptySection => section.kind === "empty")
      .sort((sectionA, sectionB) => sectionA.yOffset - sectionB.yOffset)
      .at(0);

    if (!firstSection) return previous;

    const widget = {
      id: createId(),
      kind,
      options: {},
      layouts: createItemLayouts(previous, firstSection),
      integrationIds: [],
      advancedOptions: {
        customCssClasses: [],
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

const createItemLayouts = (board: Board, currentSection: EmptySection): ItemLayout[] => {
  const layouts = getBoardLayouts(board);

  return layouts.map((layoutId) => {
    const boardLayout = board.layouts.find((layout) => layout.id === layoutId);
    const elements = getSectionElements(board, { sectionId: currentSection.id, layoutId });

    const emptyPosition = boardLayout
      ? getFirstEmptyPosition(elements, boardLayout.columnCount)
      : { xOffset: 0, yOffset: 0 };

    if (!emptyPosition) {
      throw new Error("Your board is full");
    }

    return {
      width: 1,
      height: 1,
      ...emptyPosition,
      sectionId: currentSection.id,
      layoutId,
    };
  });
};
