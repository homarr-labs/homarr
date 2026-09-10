import { initTRPC } from "@trpc/server";
import type { TRPCError } from "@trpc/server";
import { describe, expect, test, vi } from "vitest";
import { z } from "zod/v4";

import { mcpRouter } from "../mcp";
import type { McpMeta } from "../mcp-tools";
import { createMcpProtocolHandler } from "../../../../apps/nextjs/src/app/api/mcp/_protocol";
import { callMcpTool, extractMcpToolsFromProcedures } from "../mcp-tools";

vi.mock("@homarr/auth", () => ({}));

const MCP_TOOL_ALLOWLIST = {
  query: [
    "airQuality_atLocation",
    "apiKeys_getAll",
    "app_all",
    "app_byId",
    "app_getPaginated",
    "app_search",
    "bazarr_getBadges",
    "beszel_getAlerts",
    "beszel_getSystems",
    "beszel_getSystemStats",
    "board_catalog",
    "board_getAllBoards",
    "board_getBoardSettings",
    "board_search",
    "calendar_findAllEvents",
    "customWidget_get",
    "customWidget_getAuthoringPrompt",
    "customWidget_getComponent",
    "customWidget_getComponentCatalog",
    "customWidget_getComponents",
    "customWidget_findComponents",
    "customWidget_getExample",
    "customWidget_getReference",
    "customWidget_getSharedProps",
    "customWidget_getSkill",
    "customWidget_legacyMigrationPrompt",
    "customWidget_list",
    "customWidget_previewJournal",
    "customWidget_previewQuery",
    "customWidget_schema",
    "customWidget_validate",
    "customWidget_validateTemplate",
    "customWidget_workshopGet",
    "customWidget_workshopSearch",
    "dnsHole_summary",
    "docker_getContainers",
    "docker_getEndpoints",
    "docker_getServiceHealth",
    "docker_logs",
    "docker_reconcileServices",
    "downloads_getJobsAndStatuses",
    "healthMonitoring_getClusterHealthStatus",
    "healthMonitoring_getSystemHealthStatus",
    "healthMonitoring_listStorageVolumes",
    "icon_findIcons",
    "info_getInfo",
    "integration_all",
    "integration_byId",
    "integration_getKinds",
    "integration_getMediaRequestOptions",
    "integration_mediaRequestSearchTargets",
    "integration_search",
    "integration_searchInIntegration",
    "integration_searchMediaRequests",
    "invite_getAll",
    "kubernetes_contexts_getContexts",
    "kubernetes_ingresses_getIngresses",
    "kubernetes_pods_getPods",
    "mediaOrganizer_getData",
    "mediaRequests_getLatestRequests",
    "mediaRequests_getStats",
    "mediaServer_getCurrentStreams",
    "patchmon_getStats",
    "serverSettings_getBoardSettings",
    "serverSettings_getBranding",
    "searchEngine_catalog",
    "smartHome_entityDetails",
    "smartHome_entityState",
    "traefik_getDashboard",
    "user_getAll",
    "user_getById",
    "widgetSecrets_getConfiguredKinds",
    "wud_getStats",
  ],
  mutation: [
    "app_create",
    "app_delete",
    "app_update",
    "board_addItem",
    "board_changeBoardVisibility",
    "board_createBoard",
    "board_deleteBoard",
    "board_duplicateBoard",
    "board_renameBoard",
    "board_resetLayout",
    "board_savePartialBoardSettings",
    "board_setHomeBoard",
    "board_setMobileHomeBoard",
    "customWidget_delete",
    "customWidget_previewAction",
    "customWidget_previewReviseTemplate",
    "customWidget_templatePatch",
    "dnsHole_disable",
    "dnsHole_enable",
    "docker_refreshInventory",
    "docker_removeAll",
    "docker_restartAll",
    "docker_startAll",
    "docker_stopAll",
    "downloads_pause",
    "downloads_resume",
    "integration_create",
    "integration_delete",
    "integration_requestMedia",
    "invite_createInvite",
    "invite_deleteInvite",
    "mediaRequests_answerRequest",
    "serverSettings_updateBoardSettings",
    "smartHome_executeAutomation",
    "smartHome_switchEntity",
    "user_changeHeaderPreferences",
    "user_delete",
  ],
  secret: [
    "apiKeys_create",
    "apiKeys_delete",
    "customWidget_configurationRequestUser",
    "customWidget_create",
    "customWidget_createFromPreview",
    "customWidget_migrateLegacy",
    "customWidget_previewCreate",
    "customWidget_secretSet",
    "customWidget_sourceConfigure",
    "customWidget_update",
    "customWidget_workshopInstall",
    "user_create",
    "widgetSecrets_deleteSecret",
    "widgetSecrets_setSecret",
  ],
} as const;

type ToolClassification = keyof typeof MCP_TOOL_ALLOWLIST;

function expectedToolInventory() {
  return Object.entries(MCP_TOOL_ALLOWLIST)
    .flatMap(([classification, names]) =>
      names.map((name) => ({ name, classification: classification as ToolClassification })),
    )
    .toSorted((left, right) => left.name.localeCompare(right.name));
}

function actualToolInventory() {
  const secretTools = new Set<string>(MCP_TOOL_ALLOWLIST.secret);
  const procedures = mcpRouter["_def"].procedures as unknown as Record<
    string,
    { _def?: { type?: "query" | "mutation" } }
  >;
  return extractMcpToolsFromProcedures(mcpRouter)
    .tools.map((tool) => {
      const procedure = procedures[tool.pathInRouter.join(".")];
      const type = procedure?.["_def"]?.type;
      if (type !== "query" && type !== "mutation") throw new Error(`Unable to classify MCP tool '${tool.name}'`);
      return {
        name: tool.name,
        classification: secretTools.has(tool.name) ? ("secret" as const) : type,
      };
    })
    .toSorted((left, right) => left.name.localeCompare(right.name));
}

describe("production MCP router", () => {
  test("matches the reviewed tool and permission inventory exactly", () => {
    expect(actualToolInventory()).toEqual(expectedToolInventory());
  });

  test("keeps every secret-bearing tool behind a mutation procedure", () => {
    const tools = extractMcpToolsFromProcedures(mcpRouter).tools;
    const procedures = mcpRouter["_def"].procedures as unknown as Record<
      string,
      { _def?: { type?: "query" | "mutation" } }
    >;
    for (const name of MCP_TOOL_ALLOWLIST.secret) {
      const tool = tools.find((candidate) => candidate.name === name);
      expect(tool, `Missing reviewed secret tool '${name}'`).toBeDefined();
      const procedure = tool ? procedures[tool.pathInRouter.join(".")] : undefined;
      expect(procedure?.["_def"]?.type, `Secret tool '${name}' must remain a mutation`).toBe("mutation");
    }
  });

  test("gives every production tool a description", () => {
    const tools = extractMcpToolsFromProcedures(mcpRouter).tools;
    for (const tool of tools) expect(tool.description, `Tool ${tool.name} should have a description`).toBeTruthy();
    expect(tools.find((tool) => tool.name === "customWidget_getAuthoringPrompt")?.description).toBe(
      "Get the current Custom Widget authoring instructions.",
    );
  });
});

test("MCP tools are deterministically ordered and have valid production schemas", () => {
  expect(extractMcpToolsFromProcedures(mcpRouter).diagnostics).toEqual([]);
  const tools = extractMcpToolsFromProcedures(mcpRouter).tools;
  const toolNames = tools.map((tool) => tool.name);

  expect(toolNames).toEqual(toolNames.toSorted((left, right) => left.localeCompare(right)));
  expect(tools.every((tool) => tool.inputSchema.type === "object")).toBe(true);
});

test("publishes both Custom Widget template input formats", () => {
  const tool = extractMcpToolsFromProcedures(mcpRouter).tools.find(
    (candidate) => candidate.name === "customWidget_validateTemplate",
  );

  expect(tool?.inputSchema.properties).toMatchObject({
    template: expect.any(Object),
    templateLines: expect.any(Object),
  });
});

describe("custom widget authoring procedure access", () => {
  const unauthenticatedCaller = mcpRouter.createCaller({
    db: null as never,
    deviceType: undefined,
    session: null,
  });

  test("rejects every authoring procedure without a session", async () => {
    const calls = [
      unauthenticatedCaller.customWidget.schema(),
      unauthenticatedCaller.customWidget.getAuthoringPrompt(),
      unauthenticatedCaller.customWidget.getComponentCatalog(),
      unauthenticatedCaller.customWidget.findComponents({ query: "search input" }),
      unauthenticatedCaller.customWidget.getComponent({ name: "Stack" }),
      unauthenticatedCaller.customWidget.getExample({ name: "service-dashboard" }),
      unauthenticatedCaller.customWidget.getReference({ name: "runtime" }),
      unauthenticatedCaller.customWidget.getSharedProps({ names: ["p"] }),
      unauthenticatedCaller.customWidget.getSkill(),
      unauthenticatedCaller.customWidget.list(),
      unauthenticatedCaller.customWidget.validate({ widget: {} }),
      unauthenticatedCaller.customWidget.validateTemplate({ template: "<Text>Hi</Text>" }),
      unauthenticatedCaller.customWidget.createFromPreview({ previewSessionId: "preview" }),
      unauthenticatedCaller.customWidget.previewReviseTemplate({
        sessionId: "preview",
        template: "<Text>Hi</Text>",
      }),
      unauthenticatedCaller.customWidget.secretSet({
        definitionId: "widget",
        secret: { sourceId: "default", kind: "apiKey", value: "secret" },
      }),
    ];
    for (const call of calls) {
      await expect(call).rejects.toEqual(expect.objectContaining<Partial<TRPCError>>({ code: "UNAUTHORIZED" }));
    }
  });

  test("rejects authoring and secret tools for authenticated non-admins", async () => {
    const nonAdminCaller = mcpRouter.createCaller({
      db: null as never,
      deviceType: undefined,
      session: { user: { id: "user-1", permissions: ["board-modify-all"] } } as never,
    });
    const calls = [
      nonAdminCaller.customWidget.schema(),
      nonAdminCaller.customWidget.getAuthoringPrompt(),
      nonAdminCaller.customWidget.getComponentCatalog(),
      nonAdminCaller.customWidget.findComponents({ query: "search input" }),
      nonAdminCaller.customWidget.getComponent({ name: "Stack" }),
      nonAdminCaller.customWidget.getExample({ name: "service-dashboard" }),
      nonAdminCaller.customWidget.getReference({ name: "runtime" }),
      nonAdminCaller.customWidget.getSharedProps({ names: ["p"] }),
      nonAdminCaller.customWidget.getSkill(),
      nonAdminCaller.customWidget.validateTemplate({ template: "<Text>Hi</Text>" }),
      nonAdminCaller.customWidget.createFromPreview({ previewSessionId: "preview" }),
      nonAdminCaller.customWidget.previewReviseTemplate({
        sessionId: "preview",
        template: "<Text>Hi</Text>",
      }),
      nonAdminCaller.customWidget.secretSet({
        definitionId: "widget",
        secret: { sourceId: "default", kind: "apiKey", value: "secret" },
      }),
    ];
    for (const call of calls) {
      await expect(call).rejects.toEqual(expect.objectContaining<Partial<TRPCError>>({ code: "FORBIDDEN" }));
    }
  });

  test("allows admins to read authoring resources", async () => {
    const adminCaller = mcpRouter.createCaller({
      db: null as never,
      deviceType: undefined,
      session: { user: { id: "admin-1", permissions: ["admin"] } } as never,
    });
    await expect(adminCaller.customWidget.schema()).resolves.toMatchObject({ type: "object" });
    await expect(adminCaller.customWidget.getAuthoringPrompt()).resolves.toMatchObject({
      version: 2,
      prompt: expect.any(String),
    });
    await expect(adminCaller.customWidget.getSkill()).resolves.toMatchObject({
      name: expect.any(String),
    });
    await expect(adminCaller.customWidget.getReference({ name: "runtime" })).resolves.toMatchObject({
      name: "runtime",
      content: expect.stringContaining("SubFetch"),
    });
    await expect(adminCaller.customWidget.validateTemplate({ template: "<Text>Hi</Text>" })).resolves.toMatchObject({
      valid: true,
    });
    await expect(
      adminCaller.customWidget.validateTemplate({
        template:
          '<Stack><SubFetch requestId="search" params={{ query: inputs.search }}}>{(result) => <Text>{result.totalResults}</Text>}</SubFetch></Stack>',
      }),
    ).resolves.toMatchObject({
      valid: false,
      diagnostics: [expect.objectContaining({ sourceExcerpt: expect.stringContaining("}}>") })],
      nextStep: expect.stringContaining("Repair the reported JSX errors"),
    });
    await expect(adminCaller.customWidget.getComponentCatalog()).resolves.toMatchObject({
      components: expect.arrayContaining([expect.objectContaining({ name: "Stack" })]),
      examples: expect.arrayContaining([expect.objectContaining({ id: "service-dashboard" })]),
    });
    await expect(adminCaller.customWidget.findComponents({ query: "TextInput SubFetch" })).resolves.toMatchObject({
      components: expect.arrayContaining([
        expect.objectContaining({ name: "TextInput" }),
        expect.objectContaining({ name: "SubFetch" }),
      ]),
    });
    await expect(adminCaller.customWidget.getComponent({ name: "Stack" })).resolves.toMatchObject({
      name: "Stack",
      props: expect.anything(),
    });
    await expect(adminCaller.customWidget.getExample({ name: "service-dashboard" })).resolves.toMatchObject({
      id: "service-dashboard",
      widget: expect.objectContaining({
        $schema: "homarr-custom-widget-v2",
        templateLines: expect.any(Array),
      }),
    });
    await expect(adminCaller.customWidget.getExample({ name: "pokedex" })).resolves.toMatchObject({
      id: "pokedex",
      widget: expect.objectContaining({
        name: "Pokédex",
        templateLines: expect.arrayContaining([expect.stringContaining("<Stack")]),
      }),
    });
    await expect(adminCaller.customWidget.getSharedProps({ names: ["p", "m"] })).resolves.toMatchObject({
      props: [expect.objectContaining({ name: "p" }), expect.objectContaining({ name: "m" })],
      notFound: [],
    });
    await expect(adminCaller.customWidget.getComponent({ name: "NotAComponent" })).rejects.toEqual(
      expect.objectContaining<Partial<TRPCError>>({ code: "NOT_FOUND" }),
    );
    await expect(adminCaller.customWidget.getExample({ name: "not-an-example" })).rejects.toEqual(
      expect.objectContaining<Partial<TRPCError>>({ code: "NOT_FOUND" }),
    );
  });
});

describe("MCP catalog diagnostics", () => {
  const trpc = initTRPC.meta<McpMeta>().create();
  const exposed = trpc.procedure.meta({ mcp: { enabled: true } });

  test("omits unsupported parsers and malformed schemas without losing valid tools", () => {
    const router = trpc.router({
      good: exposed.input(z.object({ name: z.string() })).query(() => "ok"),
      date: exposed.input(z.object({ date: z.date() })).query(() => "unused"),
      scalar: exposed.input(z.string()).query(() => "unused"),
      parser: exposed.input({ parse: (value: unknown) => value }).query(() => "unused"),
      malformed: exposed
        .input(z.object({ value: z.string().meta({ type: "invalid-json-type" }) }))
        .query(() => "unused"),
    });
    const catalog = extractMcpToolsFromProcedures(router);
    expect(catalog.tools.map((tool) => tool.name)).toEqual(["good"]);
    expect(catalog.diagnostics).toEqual([
      { name: "date", path: "date", reason: "invalid_schema" },
      { name: "malformed", path: "malformed", reason: "invalid_schema" },
      { name: "parser", path: "parser", reason: "unsupported_input" },
      { name: "scalar", path: "scalar", reason: "unsupported_input" },
    ]);
  });

  test("omits all duplicate names even when one procedure has an invalid schema", () => {
    const shared = trpc.procedure.meta({ mcp: { enabled: true, name: "shared" } });
    const catalog = extractMcpToolsFromProcedures(
      trpc.router({
        first: shared.query(() => "first"),
        second: shared.input(z.object({ date: z.date() })).query(() => "second"),
        good: exposed.query(() => "good"),
        invalidName: trpc.procedure.meta({ mcp: { enabled: true, name: "bad name" } }).query(() => "unused"),
      }),
    );
    expect(catalog.tools.map((tool) => tool.name)).toEqual(["good"]);
    expect(catalog.diagnostics.filter((diagnostic) => diagnostic.reason === "duplicate_name")).toEqual([
      { name: "shared", path: "first", reason: "duplicate_name" },
      { name: "shared", path: "second", reason: "duplicate_name" },
    ]);
    expect(catalog.diagnostics).toContainEqual({ name: "bad name", path: "invalidName", reason: "invalid_name" });
  });

  test("distinguishes empty object input from no input for shared Assistant dispatch", async () => {
    const router = trpc.router({
      none: exposed.query(({ input }) => input),
      explicitNone: exposed.input(z.undefined()).query(({ input }) => input),
      object: exposed.input(z.object({ value: z.string().default("default") })).query(({ input }) => input),
      optional: exposed
        .input(z.object({ value: z.string().default("default") }).optional())
        .query(({ input }) => input),
    });
    const catalog = extractMcpToolsFromProcedures(router);
    expect(catalog.diagnostics).toEqual([]);
    for (const tool of catalog.tools) {
      const result = await callMcpTool(router.createCaller({}), tool, {});
      if (tool.inputMode === "none") expect(result).toBeUndefined();
      else expect(result).toEqual({ value: "default" });
    }
  });
});

test.each([false, true])(
  "production catalog registers through the real protocol handler (modern=%s)",
  async (modern) => {
    const { tools, diagnostics } = extractMcpToolsFromProcedures(mcpRouter);
    expect(diagnostics).toEqual([]);
    const handler = createMcpProtocolHandler({
      caller: {},
      tools,
      version: "test",
      instructions: "test",
      formatToolError: () => "Tool failed",
    });
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    };
    const params: Record<string, unknown> = {};
    if (modern) {
      headers["Mcp-Method"] = "tools/list";
      headers["Mcp-Name"] = "homarr";
      params["_meta"] = {
        "io.modelcontextprotocol/protocolVersion": "2026-07-28",
        "io.modelcontextprotocol/clientInfo": { name: "catalog-test", version: "1" },
        "io.modelcontextprotocol/clientCapabilities": {},
      };
    }
    const response = await handler.fetch(
      new Request("http://homarr.test/api/mcp", {
        method: "POST",
        headers,
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params }),
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.has("Mcp-Session-Id")).toBe(false);
    const body = await response.text();
    let payload = body;
    if (response.headers.get("Content-Type")?.includes("text/event-stream")) {
      payload =
        body
          .split("\n")
          .find((line) => line.startsWith("data: "))
          ?.slice(6) ?? "";
    }
    const result = JSON.parse(payload) as {
      error?: unknown;
      result: { tools: { name: string; inputSchema: unknown }[] };
    };
    expect(result.error).toBeUndefined();
    expect(result.result.tools.map((tool) => ({ name: tool.name, inputSchema: tool.inputSchema }))).toEqual(
      tools.map((tool) => ({ name: tool.name, inputSchema: tool.inputSchema })),
    );
  },
);
