// @vitest-environment node

import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticate: vi.fn(),
  ipAddress: vi.fn(() => "127.0.0.1"),
  toolProcedure: vi.fn(),
  loggerWarn: vi.fn(),
  buildPrompt: vi.fn((request?: string, documentationUrl?: string) =>
    [`Request: ${request ?? ""}`, `Documentation: ${documentationUrl ?? ""}`].join("\n"),
  ),
  getComponent: vi.fn((name: string) => (name === "Text Input" ? { name, safety: "allowed" } : null)),
}));

vi.mock("next/server", () => ({ userAgent: () => ({ ua: "MCP route test" }) }));
vi.mock("@homarr/api/mcp", () => ({
  createTRPCContext: vi.fn(() => ({})),
}));
vi.mock("@homarr/auth/api-key", () => ({
  API_KEY_HEADER_NAME: "ApiKey",
  getSessionFromApiKeyAsync: mocks.authenticate,
}));
vi.mock("@homarr/common", () => ({ extractBaseUrlFromHeaders: () => "http://localhost" }));
vi.mock("@homarr/common/server", () => ({ ipAddressFromHeaders: mocks.ipAddress }));
vi.mock("@homarr/core/infrastructure/logs", () => ({
  createLogger: () => ({ info: vi.fn(), warn: mocks.loggerWarn, error: vi.fn() }),
}));
vi.mock("@homarr/custom-widgets/authoring-prompt", () => ({ buildCustomWidgetMcpPrompt: mocks.buildPrompt }));
vi.mock("@homarr/custom-widgets/authoring-resources", () => ({
  getCustomWidgetComponent: mocks.getComponent,
  getCustomWidgetComponentCatalog: () => ({ components: [{ name: "Text Input" }] }),
  getCustomWidgetExample: (name: string) =>
    name === "status-card" ? { id: "status-card", title: "Status card", template: "<Text>Status</Text>" } : null,
  getCustomWidgetSkillContent: () => "# Custom Widget Skill",
}));
vi.mock("@homarr/custom-widgets/core", () => ({
  customJsxExamples: [{ id: "status-card", title: "Status card", template: "<Text>Status</Text>" }],
  getCustomWidgetJsonSchema: () => ({ type: "object", title: "Custom Widget" }),
}));
vi.mock("@homarr/db", () => ({ db: {} }));
vi.mock("~/versions/package-reader", () => ({ getPackageVersion: () => "test-version" }));
vi.mock("../_extract-tools", () => ({
  getMcpRuntimeAsync: async () => ({
    router: { createCaller: vi.fn(() => ({ board: { getAllBoards: mocks.toolProcedure } })) },
    procedureTypes: new Map([["board.getAllBoards", "query"]]),
    tools: [
      {
        name: "board_getAllBoards",
        description: "List boards",
        pathInRouter: ["board", "getAllBoards"],
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "customWidget_list",
        description: "List Custom Widgets",
        pathInRouter: ["customWidget", "list"],
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "customWidget_workshopSearch",
        description: "Search Workshop",
        pathInRouter: ["customWidget", "workshopSearch"],
        inputSchema: { type: "object", properties: {} },
      },
    ],
  }),
}));

import { POST } from "./route";

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number | null;
  result?: Record<string, unknown>;
  error?: { code: number; message: string };
}

beforeEach(() => {
  mocks.authenticate.mockResolvedValue({ user: { id: "user-1", permissions: ["admin"] } });
  mocks.buildPrompt.mockClear();
  mocks.getComponent.mockClear();
  mocks.ipAddress.mockClear();
  mocks.ipAddress.mockReturnValue("127.0.0.1");
  mocks.toolProcedure.mockReset();
  mocks.toolProcedure.mockResolvedValue([]);
  mocks.loggerWarn.mockClear();
});

async function callMcp(method: string, params: Record<string, unknown> = {}, id = 1) {
  const request = new Request("http://localhost/api/mcp/mcp", {
    method: "POST",
    headers: {
      Accept: "application/json, text/event-stream",
      ApiKey: "key.secret",
      "Content-Type": "application/json",
      "X-Forwarded-For": "198.51.100.10",
      "X-Real-IP": "127.0.0.1",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
  });
  const response = await POST(request as never);
  const text = await response.text();
  const data = response.headers.get("content-type")?.includes("text/event-stream")
    ? text
        .split("\n")
        .find((line: string) => line.startsWith("data: "))
        ?.slice("data: ".length)
    : text;
  if (!data) throw new Error(`MCP response did not contain JSON-RPC data: ${text}`);
  return { response, body: JSON.parse(data) as JsonRpcResponse };
}

describe("authenticated MCP prompt protocol", () => {
  test("initializes and advertises prompt and resource capabilities", async () => {
    const { response, body } = await callMcp("initialize", {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: "route-test", version: "1.0.0" },
    });

    expect(response.status).toBe(200);
    expect(body.error).toBeUndefined();
    expect(body.result).toMatchObject({
      protocolVersion: expect.any(String),
      capabilities: { prompts: {}, resources: {} },
      serverInfo: { name: "homarr", version: "test-version" },
    });
    expect(mocks.authenticate).toHaveBeenCalledWith({}, "key.secret", "127.0.0.1", "MCP route test");
    expect(mocks.ipAddress).toHaveBeenCalledWith(expect.any(Headers));
  });

  test("lists and interpolates the custom-widget authoring prompt", async () => {
    const listed = await callMcp("prompts/list");
    expect(listed.body.result).toEqual({
      prompts: [
        {
          name: "homarr-custom-widget-author",
          description: "Author and iterate on one Homarr Custom JSX v2 widget.",
          arguments: [
            { name: "request", description: "The widget the user wants.", required: false },
            { name: "documentationUrl", description: "External API documentation URL.", required: false },
          ],
        },
      ],
    });

    const rendered = await callMcp("prompts/get", {
      name: "homarr-custom-widget-author",
      arguments: { request: "Build a status card", documentationUrl: "https://docs.example.test/api" },
    });
    expect(rendered.body.result).toMatchObject({
      description: "Current Homarr Custom Widget authoring workflow.",
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: "Request: Build a status card\nDocumentation: https://docs.example.test/api",
          },
        },
      ],
    });
    expect(mocks.buildPrompt).toHaveBeenCalledWith("Build a status card", "https://docs.example.test/api");
  });
});

describe("authenticated MCP resource protocol", () => {
  test("lists concrete resources and URI templates with reviewed MIME types", async () => {
    const listed = await callMcp("resources/list");
    expect(listed.body.result).toEqual({
      resources: [
        { uri: "homarr://custom-widgets/schema", name: "Custom Widget schema", mimeType: "application/schema+json" },
        { uri: "homarr://custom-widgets/components", name: "Custom Widget components", mimeType: "application/json" },
        { uri: "homarr://custom-widgets/skill", name: "Custom Widget skill", mimeType: "text/markdown" },
        {
          uri: "homarr://custom-widgets/examples/status-card",
          name: "Custom Widget example: Status card",
          mimeType: "application/json",
        },
      ],
    });

    const templates = await callMcp("resources/templates/list");
    expect(templates.body.result).toEqual({
      resourceTemplates: [
        expect.objectContaining({
          uriTemplate: "homarr://custom-widgets/components/{name}",
          mimeType: "application/json",
        }),
        expect.objectContaining({
          uriTemplate: "homarr://custom-widgets/examples/{name}",
          mimeType: "application/json",
        }),
      ],
    });
  });

  test.each([
    ["homarr://custom-widgets/schema", "application/schema+json", { type: "object", title: "Custom Widget" }],
    ["homarr://custom-widgets/components", "application/json", { components: [{ name: "Text Input" }] }],
    ["homarr://custom-widgets/skill", "text/markdown", "# Custom Widget Skill"],
    [
      "homarr://custom-widgets/examples/status-card",
      "application/json",
      { id: "status-card", title: "Status card", template: "<Text>Status</Text>" },
    ],
    ["homarr://custom-widgets/components/Text%20Input", "application/json", { name: "Text Input", safety: "allowed" }],
  ])("dispatches %s with its MIME type", async (uri, mimeType, expected) => {
    const { body } = await callMcp("resources/read", { uri });
    const contents = body.result?.contents as Array<{ uri: string; mimeType: string; text: string }> | undefined;
    const content = contents?.[0];
    expect(content).toMatchObject({ uri, mimeType });
    expect(mimeType === "text/markdown" ? content?.text : JSON.parse(content?.text ?? "null")).toEqual(expected);
  });
});

describe("non-admin MCP discovery", () => {
  test("does not list or expose Custom Widget tools, prompts or resources", async () => {
    mocks.authenticate.mockResolvedValue({ user: { id: "user-1", permissions: ["board-view-all"] } });

    const tools = await callMcp("tools/list");
    expect(((tools.body.result?.tools ?? []) as Array<{ name: string }>).map(({ name }) => name)).toEqual([
      "board_getAllBoards",
    ]);

    const prompts = await callMcp("prompts/list");
    expect(prompts.body.result).toBeUndefined();
    expect(prompts.body.error).toBeDefined();

    const resources = await callMcp("resources/list");
    expect(resources.body.result).toBeUndefined();
    expect(resources.body.error).toBeDefined();

    const templates = await callMcp("resources/templates/list");
    expect(templates.body.result).toBeUndefined();
    expect(templates.body.error).toBeDefined();

    const prompt = await callMcp("prompts/get", { name: "homarr-custom-widget-author" });
    expect(prompt.body.result).toBeUndefined();
    expect(prompt.body.error).toBeDefined();

    const resource = await callMcp("resources/read", { uri: "homarr://custom-widgets/schema" });
    expect(resource.body.result).toBeUndefined();
    expect(resource.body.error).toBeDefined();
  });
});

describe("MCP protocol errors", () => {
  test.each([
    ["prompts/get", { name: "unknown" }],
    ["resources/read", { uri: "homarr://custom-widgets/unknown" }],
  ])("returns JSON-RPC errors for unknown %s targets", async (method, params) => {
    const { body } = await callMcp(method, params);
    expect(body.result).toBeUndefined();
    expect(body.error).toEqual(expect.objectContaining({ code: expect.any(Number), message: expect.any(String) }));
  });

  test("returns a protocol error for a malformed resource request", async () => {
    const { body } = await callMcp("resources/read", {});
    expect(body.result).toBeUndefined();
    expect(body.error).toEqual(expect.objectContaining({ code: -32603, message: expect.any(String) }));
  });

  test("does not log sensitive tool error messages", async () => {
    const failure = Object.assign(new Error("request to https://user:secret@example.test/private failed"), {
      code: "BAD_GATEWAY",
    });
    mocks.toolProcedure.mockRejectedValue(failure);

    const { body } = await callMcp("tools/call", { name: "board_getAllBoards", arguments: {} });

    expect(JSON.stringify(body)).not.toContain("user:secret");
    expect(mocks.loggerWarn).toHaveBeenCalledWith("MCP tool execution failed", {
      tool: "board_getAllBoards",
      errorName: "Error",
      errorCode: "BAD_GATEWAY",
    });
    const metadata = mocks.loggerWarn.mock.calls.at(-1)?.[1] as Record<string, unknown>;
    expect(metadata).not.toHaveProperty("error");
    expect(metadata).not.toHaveProperty("message");
  });
});
