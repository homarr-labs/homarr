import type { TRPCError } from "@trpc/server";
import { describe, expect, test, vi } from "vitest";
import { extractToolsFromProcedures } from "trpc-to-mcp";

import { mcpRouter } from "../mcp";

vi.mock("@homarr/auth", () => ({}));

const MCP_TOOL_ALLOWLIST = {
  query: [
    "apiKeys_getAll",
    "app_all",
    "app_byId",
    "app_getPaginated",
    "app_search",
    "bazarr_getBadges",
    "beszel_getAlerts",
    "beszel_getSystems",
    "beszel_getSystemStats",
    "board_getAllBoards",
    "calendar_findAllEvents",
    "customWidget_get",
    "customWidget_getAuthoringPrompt",
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
    "docker_logs",
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
    "board_savePartialBoardSettings",
    "board_setHomeBoard",
    "board_setMobileHomeBoard",
    "customWidget_delete",
    "customWidget_deleteLegacy",
    "customWidget_previewAction",
    "customWidget_templatePatch",
    "dnsHole_disable",
    "dnsHole_enable",
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
  return extractToolsFromProcedures(mcpRouter)
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
    const tools = extractToolsFromProcedures(mcpRouter);
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
    const tools = extractToolsFromProcedures(mcpRouter);
    for (const tool of tools) expect(tool.description, `Tool ${tool.name} should have a description`).toBeTruthy();
    expect(tools.find((tool) => tool.name === "customWidget_getAuthoringPrompt")?.description).toBe(
      "Get the current Custom Widget authoring instructions.",
    );
  });
});

describe("custom widget authoring procedure access", () => {
  const unauthenticatedCaller = mcpRouter.createCaller({
    db: null as never,
    deviceType: undefined,
    session: null,
  });

  test("executes promised public procedures without a session", async () => {
    await expect(unauthenticatedCaller.customWidget.schema()).resolves.toMatchObject({ type: "object" });
    await expect(unauthenticatedCaller.customWidget.getAuthoringPrompt()).resolves.toMatchObject({
      version: 2,
      prompt: expect.any(String),
    });
    await expect(unauthenticatedCaller.customWidget.getSkill()).resolves.toMatchObject({
      name: expect.any(String),
    });
  });

  test("rejects protected and permission-gated authoring procedures without a session", async () => {
    const calls = [
      unauthenticatedCaller.customWidget.list(),
      unauthenticatedCaller.customWidget.validate({ widget: {} }),
      unauthenticatedCaller.customWidget.secretSet({
        definitionId: "widget",
        secret: { sourceId: "default", kind: "apiKey", value: "secret" },
      }),
    ];
    for (const call of calls) {
      await expect(call).rejects.toEqual(expect.objectContaining<Partial<TRPCError>>({ code: "UNAUTHORIZED" }));
    }
  });

  test("enforces the dedicated permission on secret tools", async () => {
    const callerWithoutSecretPermission = mcpRouter.createCaller({
      db: null as never,
      deviceType: undefined,
      session: { user: { id: "user-1", permissions: ["custom-widget-manage"] } } as never,
    });
    await expect(
      callerWithoutSecretPermission.customWidget.secretSet({
        definitionId: "widget",
        secret: { sourceId: "default", kind: "apiKey", value: "secret" },
      }),
    ).rejects.toEqual(expect.objectContaining<Partial<TRPCError>>({ code: "FORBIDDEN" }));
  });
});
