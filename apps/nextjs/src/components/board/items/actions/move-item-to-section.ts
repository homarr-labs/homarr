import { canPlaceSmartContainerItem, getSmartContainerMemberIds } from "@homarr/validation/smart-container";

import type { Board } from "~/app/[locale]/boards/_types";

export interface MoveItemToSectionInput {
  itemId: string;
  layoutId: string;
  sectionId: string;
  xOffset: number;
  yOffset: number;
  width: number;
  height: number;
}

export const moveItemToSectionCallback =
  ({ itemId, layoutId, ...layoutInput }: MoveItemToSectionInput) =>
  (board: Board): Board => {
    const destination = board.sections.find((section) => section.id === layoutInput.sectionId);
    if (
      destination?.kind === "container" &&
      destination.options.smart?.enabled &&
      !getSmartContainerMemberIds(destination, board.items).has(itemId) &&
      !canPlaceSmartContainerItem(destination, board.items)
    ) {
      return board;
    }
    return {
      ...board,
      items: board.items.map((item) =>
        item.id !== itemId
          ? item
          : {
              ...item,
              layouts: item.layouts.map((layout) =>
                layout.layoutId !== layoutId
                  ? layout
                  : {
                      ...layout,
                      ...layoutInput,
                    },
              ),
            },
      ),
    };
  };
