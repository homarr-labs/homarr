import type { Board } from "~/app/[locale]/boards/_types";

export interface MoveAndResizeItemInput {
  itemId: string;
  layoutId: string;
  xOffset: number;
  yOffset: number;
  width: number;
  height: number;
}

export const moveAndResizeItemCallback =
  ({ itemId, layoutId, ...layoutInput }: MoveAndResizeItemInput) =>
  (previous: Board): Board => {
    return {
      ...previous,
      items: previous.items.map((item) =>
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
