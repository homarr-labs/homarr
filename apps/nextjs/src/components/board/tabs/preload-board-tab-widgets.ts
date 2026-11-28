import type { Board } from "@homarr/boards/layout-data";
import { loadWidgetResources } from "@homarr/widgets/manifest";

import { getVisibleWidgetItems } from "../layout/visible-widget-items";

export const preloadBoardTabWidgets = (board: Board, layoutId: string, tabId: string | undefined) => {
  const kinds = new Set(getVisibleWidgetItems(board, layoutId, tabId).map((item) => item.kind));
  for (const kind of kinds) void loadWidgetResources(kind).catch(() => undefined);
};
