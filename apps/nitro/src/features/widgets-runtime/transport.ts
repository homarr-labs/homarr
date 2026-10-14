import { createORPCClient } from "@orpc/client";
import type { RouterClient } from "@orpc/server";

import type { createWidgetProcedures } from "@homarr/api/nitro/routers/widgets";

import { createWidgetRpcLink } from "./transport-link";

export type WidgetRpcClient = RouterClient<{ widget: ReturnType<typeof createWidgetProcedures> }>;

export function createWidgetRpcClient(url: URL): WidgetRpcClient {
  return createORPCClient<WidgetRpcClient>(createWidgetRpcLink(url));
}
