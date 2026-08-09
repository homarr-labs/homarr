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
