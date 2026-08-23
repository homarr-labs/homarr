export { createTRPCContext } from "./trpc";
export { extractMcpToolsFromProcedures } from "./mcp-tools";
export type { McpTool } from "./mcp-tools";

import { createLogger } from "@homarr/core/infrastructure/logs";
import { ErrorWithMetadata } from "@homarr/core/infrastructure/logs/error";

import { createTRPCRouter } from "./trpc";
import { appRouter as appRouterForApps } from "./router/app";
import { apiKeysRouter } from "./router/apiKeys";
import { boardRouter } from "./router/board";
import { customWidgetRouter } from "./router/custom-widget/custom-widget-router";
import { dockerRouter } from "./router/docker/docker-router";
import { iconsRouter } from "./router/icons";
import { infoRouter } from "./router/info";
import { integrationRouter } from "./router/integration/integration-router";
import { inviteRouter } from "./router/invite";
import { serverSettingsRouter } from "./router/serverSettings";
import { loadMcpWidgetRoutersAsync } from "./router/widgets/registry";

const logger = createLogger({ module: "mcpRouter" });

const createMcpRouterAsync = async () => {
  const startedAt = Date.now();
  const widgetRouters = await loadMcpWidgetRoutersAsync();

  const router = createTRPCRouter({
    app: appRouterForApps,
    apiKeys: apiKeysRouter,
    board: boardRouter,
    customWidget: customWidgetRouter,
    docker: dockerRouter,
    icon: iconsRouter,
    info: infoRouter,
    integration: integrationRouter,
    invite: inviteRouter,
    serverSettings: serverSettingsRouter,
    ...widgetRouters,
  });

  logger.info("Materialized MCP router", {
    durationMs: Date.now() - startedAt,
    widgetRouters: Object.keys(widgetRouters),
  });
  return router;
};

export type McpRouter = Awaited<ReturnType<typeof createMcpRouterAsync>>;

let mcpRouterPromise: Promise<McpRouter> | null = null;

export async function getMcpRouterAsync(): Promise<McpRouter> {
  if (mcpRouterPromise) return await mcpRouterPromise;

  const loadPromise = createMcpRouterAsync();
  mcpRouterPromise = loadPromise;

  try {
    return await loadPromise;
  } catch (error) {
    if (mcpRouterPromise === loadPromise) mcpRouterPromise = null;
    logger.error(new ErrorWithMetadata("Failed to materialize MCP router", {}, { cause: error }));
    throw error;
  }
}
