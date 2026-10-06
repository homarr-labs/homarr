import { extractMcpToolsFromProcedures, mcpRouter } from "@homarr/api/mcp";
import { createLogger } from "@homarr/core/infrastructure/logs";

const logger = createLogger({ module: "mcp-catalog" });
let cache: ReturnType<typeof extractMcpToolsFromProcedures> | null = null;

export function extractMcpTools() {
  if (cache) return cache.tools;
  cache = extractMcpToolsFromProcedures(mcpRouter);
  for (const diagnostic of cache.diagnostics) logger.warn("MCP tool omitted from catalog", diagnostic);
  return cache.tools;
}
