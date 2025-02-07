import type { Board } from "~/app/[locale]/boards/_types";
import { getCurrentLayout } from "~/app/[locale]/boards/(content)/_context";

export interface MoveAndResizeItemInput {
  itemId: string;
  xOffset: number;
  yOffset: number;
  width: number;
  height: number;
}

export const moveAndResizeItemCallback =
  ({ itemId, ...layoutInput }: MoveAndResizeItemInput) =>
  (previous: Board): Board => {
    const currentLayout = getCurrentLayout(previous);

    return {
      ...previous,
      items: previous.items.map((item) =>
        item.id !== itemId
          ? item
          : {
              ...item,
              layouts: item.layouts.map((layout) =>
                layout.layoutId !== currentLayout
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
