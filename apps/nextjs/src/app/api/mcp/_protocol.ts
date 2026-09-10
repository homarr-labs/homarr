import { createMcpHandler, fromJsonSchema, McpServer } from "@modelcontextprotocol/server";

import { callMcpTool } from "@homarr/api/mcp";
import type { McpTool } from "@homarr/api/mcp";

import { toAssistantToolOutput } from "../assistant/chat/assistant-tool-output";

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
            inputSchema: fromJsonSchema(tool.inputSchema as Parameters<typeof fromJsonSchema>[0]),
          },
          async (args) => {
            try {
              const result = await callMcpTool(caller, tool, args);
              return {
                content: [
                  {
                    type: "text" as const,
                    text: JSON.stringify(toAssistantToolOutput(result)),
                  },
                ],
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
