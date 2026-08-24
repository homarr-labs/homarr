import type { TRPCError } from "@trpc/server";
import { describe, expect, test, vi } from "vitest";
import { z } from "zod/v4";

import { mcpRouter } from "../mcp";
import { extractMcpToolsFromProcedures } from "../mcp-tools";

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
    "customWidget_getExample",
    "customWidget_getSharedProps",
    "customWidget_getSkill",
    "customWidget_legacyMigrationPrompt",
    "customWidget_list",
    "customWidget_previewJournal",
    "customWidget_previewQuery",
    "customWidget_schema",
    "customWidget_validate",
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
    "mediaRequests_getLatestRequests",
    "mediaRequests_getStats",
    "mediaServer_getCurrentStreams",
    "patchmon_getStats",
    "serverSettings_getBoardSettings",
    "serverSettings_getBranding",
    "smartHome_entityDetails",
    "smartHome_entityState",
    "widgetSecrets_getConfiguredKinds",
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
    .map((tool) => {
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
    const tools = extractMcpToolsFromProcedures(mcpRouter);
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
    const tools = extractMcpToolsFromProcedures(mcpRouter);
    for (const tool of tools) expect(tool.description, `Tool ${tool.name} should have a description`).toBeTruthy();
    expect(tools.find((tool) => tool.name === "customWidget_getAuthoringPrompt")?.description).toBe(
      "Get the current Custom Widget authoring instructions.",
    );
  });
});

test("MCP tools are deterministically ordered and retain executable schemas", () => {
  const tools = extractMcpToolsFromProcedures(mcpRouter);
  const toolNames = tools.map((tool) => tool.name);

  expect(toolNames).toEqual(toolNames.toSorted((left, right) => left.localeCompare(right)));
  expect(tools.every((tool) => tool.inputValidator instanceof z.ZodObject)).toBe(true);
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
      unauthenticatedCaller.customWidget.getComponent({ name: "Stack" }),
      unauthenticatedCaller.customWidget.getExample({ name: "service-dashboard" }),
      unauthenticatedCaller.customWidget.getSharedProps({ names: ["p"] }),
      unauthenticatedCaller.customWidget.getSkill(),
      unauthenticatedCaller.customWidget.list(),
      unauthenticatedCaller.customWidget.validate({ widget: {} }),
      unauthenticatedCaller.customWidget.createFromPreview({ previewSessionId: "preview" }),
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
      nonAdminCaller.customWidget.getComponent({ name: "Stack" }),
      nonAdminCaller.customWidget.getExample({ name: "service-dashboard" }),
      nonAdminCaller.customWidget.getSharedProps({ names: ["p"] }),
      nonAdminCaller.customWidget.getSkill(),
      nonAdminCaller.customWidget.createFromPreview({ previewSessionId: "preview" }),
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
    await expect(adminCaller.customWidget.getComponentCatalog()).resolves.toMatchObject({
      components: expect.arrayContaining([expect.objectContaining({ name: "Stack" })]),
      examples: expect.arrayContaining([expect.objectContaining({ id: "service-dashboard" })]),
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
