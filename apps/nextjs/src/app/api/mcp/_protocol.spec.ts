// @vitest-environment node

import { initTRPC, TRPCError } from "@trpc/server";
import { describe, expect, test, vi } from "vitest";
import { z } from "zod/v4";

import type { McpTool } from "@homarr/api/mcp";
import { extractMcpToolsFromProcedures } from "@homarr/api/mcp";
import type { McpMeta } from "../../../../../../packages/api/src/mcp-tools";

import { createMcpProtocolHandler } from "./_protocol";

vi.mock("@homarr/api/mcp", async () => import("../../../../../../packages/api/src/mcp-tools"));

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
  type: "query",
  pathInRouter: ["echo"],
  inputMode: "object",
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

describe.each([false, true])("MCP argument dispatch (modern=%s)", (modern) => {
  const trpc = initTRPC.context<{ user: string }>().meta<McpMeta>().create();
  const exposed = trpc.procedure.meta({ mcp: { enabled: true } });

  const call = async (
    handler: ReturnType<typeof createMcpProtocolHandler>,
    name: string,
    argumentsValue: Record<string, unknown>,
  ) => {
    let request = createRequest("tools/call", { name, arguments: argumentsValue }, name);
    if (!modern) {
      request = new Request("http://homarr.test/api/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: { name, arguments: argumentsValue },
        }),
      });
    }
    const response = await handler.fetch(request);
    expect(response.headers.has("Mcp-Session-Id")).toBe(false);
    return (await parseResponse(response)).result;
  };

  test("transforms once and does not coerce, insert defaults, or remove properties before tRPC", async () => {
    const transform = vi.fn((value: string) => `${value}!`);
    const execution = vi.fn((input: unknown) => input);
    const router = trpc.router({
      update: exposed
        .input(
          z.looseObject({
            name: z.string().transform(transform),
            limit: z.number().default(7),
          }),
        )
        .mutation(({ input }) => execution(input)),
    });
    const catalog = extractMcpToolsFromProcedures(router);
    expect(catalog.diagnostics).toEqual([]);
    const realCaller = router.createCaller({ user: "one" });
    const dispatch = vi.fn(realCaller.update);
    const handler = createMcpProtocolHandler({
      caller: { update: dispatch },
      tools: catalog.tools,
      version: "test",
      instructions: "test",
      formatToolError: () => "Invalid input",
    });
    const argumentsValue = { name: "hello", extra: "preserved" };
    const result = await call(handler, "update", argumentsValue);
    expect(result.isError).not.toBe(true);
    expect(dispatch).toHaveBeenCalledWith(argumentsValue);
    expect(transform).toHaveBeenCalledTimes(1);
    expect(execution).toHaveBeenCalledWith({ name: "hello!", limit: 7, extra: "preserved" });
    await call(handler, "update", { name: "hello", limit: "7" });
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(execution).toHaveBeenCalledTimes(1);
  });

  test("retains overlapping chained constraints, refinements, and empty object defaults", async () => {
    const execution = vi.fn((input: unknown) => input);
    const router = trpc.router({
      bounded: exposed
        .input(z.object({ count: z.number().min(2) }))
        .input(z.object({ count: z.number().max(5) }))
        .mutation(({ input }) => execution(input)),
      refined: exposed
        .input(z.object({ value: z.string().refine((value) => value !== "blocked") }))
        .mutation(({ input }) => execution(input)),
      defaults: exposed.input(z.object({ count: z.number().default(3) })).query(({ input }) => input),
      none: exposed.query(({ input }) => ({ absent: input === undefined })),
    });
    const catalog = extractMcpToolsFromProcedures(router);
    expect(catalog.diagnostics).toEqual([]);
    const handler = createMcpProtocolHandler({
      caller: router.createCaller({ user: "one" }),
      tools: catalog.tools,
      version: "test",
      instructions: "test",
      formatToolError: () => "Invalid input",
    });
    for (const count of [1, 6]) expect((await call(handler, "bounded", { count })).isError).toBe(true);
    expect((await call(handler, "refined", { value: "blocked" })).isError).toBe(true);
    expect(execution).not.toHaveBeenCalled();
    expect((await call(handler, "bounded", { count: 3 })).isError).not.toBe(true);
    expect(execution).toHaveBeenCalledWith({ count: 3 });
    expect((await call(handler, "defaults", {})).content).toEqual([{ type: "text", text: '{"count":3}' }]);
    expect((await call(handler, "none", {})).content).toEqual([{ type: "text", text: '{"absent":true}' }]);
  });

  test("enforces tRPC permissions before executing mutations", async () => {
    const mutation = vi.fn(() => "changed");
    const router = trpc.router({
      restricted: exposed
        .use(({ ctx, next }) => {
          if (ctx.user !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
          return next();
        })
        .input(z.object({}))
        .mutation(mutation),
    });
    const { tools, diagnostics } = extractMcpToolsFromProcedures(router);
    expect(diagnostics).toEqual([]);
    const handler = createMcpProtocolHandler({
      caller: router.createCaller({ user: "guest" }),
      tools,
      version: "test",
      instructions: "test",
      formatToolError: () => "Forbidden",
    });
    expect((await call(handler, "restricted", {})).isError).toBe(true);
    expect(mutation).not.toHaveBeenCalled();
  });

  test("isolates authenticated callers when reusing catalog schemas", async () => {
    const router = trpc.router({ who: exposed.query(({ ctx }) => ctx.user) });
    const { tools } = extractMcpToolsFromProcedures(router);
    const handlers = ["alice", "bob"].map((user) =>
      createMcpProtocolHandler({
        caller: router.createCaller({ user }),
        tools,
        version: "test",
        instructions: "test",
        formatToolError: () => "Failed",
      }),
    );
    const results = await Promise.all(handlers.map((handler) => call(handler, "who", {})));
    expect(results.map((result) => result.content)).toEqual([
      [{ type: "text", text: '"alice"' }],
      [{ type: "text", text: '"bob"' }],
    ]);
  });
});
