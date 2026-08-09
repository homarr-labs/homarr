import { extractMcpToolsFromProcedures, mcpRouter } from "@homarr/api/mcp";

let cache: ReturnType<typeof extractMcpToolsFromProcedures> | null = null;

export function extractMcpTools() {
  if (cache) return cache;

  cache = extractMcpToolsFromProcedures(mcpRouter);

  return cache;
}
