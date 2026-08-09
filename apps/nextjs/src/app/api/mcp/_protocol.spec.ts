// @vitest-environment node

import { describe, expect, test, vi } from "vitest";
import { z } from "zod/v4";

import type { McpTool } from "@homarr/api/mcp";

import { createMcpProtocolHandler } from "./_protocol";

const modernMetadata = {
  "io.modelcontextprotocol/protocolVersion": "2026-07-28",
  "io.modelcontextprotocol/clientInfo": { name: "homarr-test", version: "1.0.0" },
  "io.modelcontextprotocol/clientCapabilities": {},
};

const createRequest = (method: string, params: Record<string, unknown> = {}, name = "homarr") =>
  new Request("http://homarr.test/api/mcp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "Mcp-Method": method,
      "Mcp-Name": name,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params: { ...params, _meta: modernMetadata },
    }),
  });

const parseResponse = async (response: Response) => {
  expect(response.status).toBe(200);
  const body = await response.text();
  const json = response.headers.get("Content-Type")?.includes("text/event-stream")
    ? body
        .split("\n")
        .find((line) => line.startsWith("data: "))
        ?.slice(6)
    : body;
  expect(json).toBeTruthy();

  return JSON.parse(json ?? "") as {
    result: Record<string, unknown>;
  };
};

const echoValidator = z.object({ message: z.string() });
const echoTool: McpTool = {
  name: "echo",
  description: "Echo a message",
  pathInRouter: ["echo"],
  inputValidator: echoValidator,
  inputSchema: z.toJSONSchema(echoValidator),
};

const createTestHandler = () => {
  const echo = vi.fn(async (input: unknown) => input);
  const handler = createMcpProtocolHandler({
    caller: { echo },
    tools: [echoTool],
    version: "1.0.0",
    instructions: "Test server",
    formatToolError: () => "Tool failed",
  });

  return { echo, handler };
};

describe("MCP v2 protocol", () => {
  test("discovers the stateless 2026-07-28 server", async () => {
    const { handler } = createTestHandler();
    const response = await parseResponse(await handler.fetch(createRequest("server/discover")));

    expect(response.result.supportedVersions).toEqual(["2026-07-28"]);
    expect(response.result).toMatchObject({ resultType: "complete", cacheScope: "private" });
  });

  test("returns a deterministic, privately cacheable tool catalog", async () => {
    const { handler } = createTestHandler();
    const response = await parseResponse(await handler.fetch(createRequest("tools/list")));

    expect(response.result).toMatchObject({
      resultType: "complete",
      ttlMs: 300_000,
      cacheScope: "private",
      tools: [{ name: "echo", description: "Echo a message" }],
    });
  });

  test("validates and calls Homarr procedures without a protocol session", async () => {
    const { echo, handler } = createTestHandler();
    const response = await parseResponse(
      await handler.fetch(createRequest("tools/call", { name: "echo", arguments: { message: "hello" } }, "echo")),
    );

    expect(echo).toHaveBeenCalledWith({ message: "hello" });
    expect(response.result.content).toEqual([{ type: "text", text: '{"message":"hello"}' }]);
  });

  test("passes the tool name to safe error formatting", async () => {
    const formatToolError = vi.fn((_error: unknown, toolName: string) => `${toolName} input was invalid`);
    const handler = createMcpProtocolHandler({
      caller: {
        echo: vi.fn(async () => {
          throw new Error("private details");
        }),
      },
      tools: [echoTool],
      version: "1.0.0",
      instructions: "Test server",
      formatToolError,
    });
    const response = await parseResponse(
      await handler.fetch(createRequest("tools/call", { name: "echo", arguments: { message: "hello" } }, "echo")),
    );

    expect(formatToolError).toHaveBeenCalledWith(expect.any(Error), "echo");
    expect(response.result).toMatchObject({
      isError: true,
      content: [{ type: "text", text: '{"error":"echo input was invalid"}' }],
    });
  });

  test("keeps stateless compatibility with 2025 Streamable HTTP clients", async () => {
    const { handler } = createTestHandler();
    const request = new Request("http://homarr.test/api/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-03-26",
          capabilities: {},
          clientInfo: { name: "legacy-test", version: "1.0.0" },
        },
      }),
    });

    const initializeResponse = await handler.fetch(request);
    expect(initializeResponse.headers.has("Mcp-Session-Id")).toBe(false);
    const response = await parseResponse(initializeResponse);
    expect(response.result.protocolVersion).toBe("2025-03-26");

    const listResponse = await handler.fetch(
      new Request("http://homarr.test/api/mcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
        },
        body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" }),
      }),
    );
    expect(listResponse.headers.has("Mcp-Session-Id")).toBe(false);
    expect((await parseResponse(listResponse)).result.tools).toEqual([expect.objectContaining({ name: "echo" })]);
  });
});
