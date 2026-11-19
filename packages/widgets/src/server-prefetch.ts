import { createBoardWidgetPrefetch } from "@homarr/api/board-widget-prefetch";
import { api, rpc } from "@homarr/api/server";

export { getInitiallyVisibleWidgetKinds } from "@homarr/api/board-widget-prefetch";
export const { prefetchInitialWidgetData } = createBoardWidgetPrefetch(api, rpc);
