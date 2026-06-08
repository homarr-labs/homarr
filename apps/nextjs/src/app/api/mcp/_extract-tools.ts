import { extractToolsFromProcedures } from "trpc-to-mcp";

import { mcpRouter } from "@homarr/api/mcp";

let cache: ReturnType<typeof extractToolsFromProcedures> | null = null;

export function extractMcpTools() {
  if (cache) return cache;

  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].includes("[TRPC-TO-MCP]")) return;
    originalWarn.apply(console, args);
  };

  try {
    cache = extractToolsFromProcedures(mcpRouter);
  } finally {
    console.warn = originalWarn;
  }

  return cache;
}
