import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";

import type { McpTool } from "@homarr/api/mcp";

interface CreateMcpProtocolHandlerOptions {
  caller: unknown;
  tools: McpTool[];
  version: string;
  instructions: string;
  configureServer?: (server: McpServer) => void;
  formatToolError: (error: unknown, toolName: string) => string;
  onToolError?: (toolName: string, error: unknown) => void;
  onProtocolError?: (error: Error) => void;
}

const resolveProcedure = (caller: unknown, path: string[]) =>
  path.reduce<unknown>(
    (current, segment) =>
      (typeof current === "object" || typeof current === "function") && current !== null
        ? (current as Record<string, unknown>)[segment]
        : undefined,
    caller,
  );

export const createMcpProtocolHandler = ({
  caller,
  tools,
  version,
  instructions,
  configureServer,
  formatToolError,
  onToolError,
  onProtocolError,
}: CreateMcpProtocolHandlerOptions) =>
  createMcpHandler(
    () => {
      const server = new McpServer(
        { name: "homarr", version },
        {
          capabilities: { tools: {} },
          instructions,
          cacheHints: {
            "tools/list": { ttlMs: 300_000, cacheScope: "private" },
          },
        },
      );

      for (const tool of tools) {
        server.registerTool(
          tool.name,
          {
            description: tool.description,
            inputSchema: tool.inputValidator,
          },
          async (args) => {
            try {
              const procedure = resolveProcedure(caller, tool.pathInRouter);
              if (typeof procedure !== "function") {
                return {
                  content: [{ type: "text" as const, text: `Tool "${tool.name}" is not callable` }],
                  isError: true,
                };
              }

              const input = Object.keys(args).length > 0 ? args : undefined;
              const result = await (procedure as (value: unknown) => Promise<unknown>)(input);
              return {
                content: [{ type: "text" as const, text: JSON.stringify(result) }],
              };
            } catch (error) {
              onToolError?.(tool.name, error);
              return {
                content: [
                  { type: "text" as const, text: JSON.stringify({ error: formatToolError(error, tool.name) }) },
                ],
                isError: true,
              };
            }
          },
        );
      }

      configureServer?.(server);

      return server;
    },
    {
      legacy: "stateless",
      onerror: onProtocolError,
    },
  );
