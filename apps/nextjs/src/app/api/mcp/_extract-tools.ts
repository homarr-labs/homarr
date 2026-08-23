import type { McpRouter, McpTool } from "@homarr/api/mcp";
import { extractMcpToolsFromProcedures, getMcpRouterAsync } from "@homarr/api/mcp";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { ErrorWithMetadata } from "@homarr/core/infrastructure/logs/error";

const logger = createLogger({ module: "mcpTools" });

export type McpProcedureType = "query" | "mutation";

export interface McpRuntime {
  router: McpRouter;
  tools: McpTool[];
  procedureTypes: ReadonlyMap<string, McpProcedureType>;
}

const createMcpRuntimeAsync = async (): Promise<McpRuntime> => {
  const startedAt = Date.now();
  const router = await getMcpRouterAsync();
  const tools = extractMcpToolsFromProcedures(router);
  const procedures = router["_def"].procedures as unknown as Record<string, { ["_def"]?: { type?: McpProcedureType } }>;
  const procedureTypes = new Map<string, McpProcedureType>();

  for (const [path, procedure] of Object.entries(procedures)) {
    const type = procedure["_def"]?.type;
    if (type === "query" || type === "mutation") procedureTypes.set(path, type);
  }

  logger.info("Extracted MCP tools", {
    durationMs: Date.now() - startedAt,
    toolCount: tools.length,
  });
  return { router, tools, procedureTypes };
};

let mcpRuntimePromise: Promise<McpRuntime> | null = null;

export async function getMcpRuntimeAsync(): Promise<McpRuntime> {
  if (mcpRuntimePromise) return await mcpRuntimePromise;

  const loadPromise = createMcpRuntimeAsync();
  mcpRuntimePromise = loadPromise;

  try {
    return await loadPromise;
  } catch (error) {
    if (mcpRuntimePromise === loadPromise) mcpRuntimePromise = null;
    logger.error(new ErrorWithMetadata("Failed to extract MCP tools", {}, { cause: error }));
    throw error;
  }
}

export async function extractMcpTools(): Promise<McpTool[]> {
  const { tools } = await getMcpRuntimeAsync();
  return tools;
}
