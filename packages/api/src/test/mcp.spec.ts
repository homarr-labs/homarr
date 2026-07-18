import { expect, test, vi } from "vitest";
import { extractToolsFromProcedures } from "trpc-to-mcp";

import { appRouter } from "../router/app";
import { boardRouter } from "../router/board";
import { customWidgetRouter } from "../router/custom-widget/custom-widget-router";
import { infoRouter } from "../router/info";
import { inviteRouter } from "../router/invite";
import { serverSettingsRouter } from "../router/serverSettings";
import { createTRPCRouter } from "../trpc";

vi.mock("@homarr/auth", () => ({}));

const mcpTestRouter = createTRPCRouter({
  app: appRouter,
  board: boardRouter,
  customWidget: customWidgetRouter,
  info: infoRouter,
  invite: inviteRouter,
  serverSettings: serverSettingsRouter,
});

test("MCP tools should be extractable from the router", () => {
  const act = () => extractToolsFromProcedures(mcpTestRouter);

  expect(act).not.toThrow();
});

test("MCP tools should contain expected procedures", () => {
  const tools = extractToolsFromProcedures(mcpTestRouter);
  const toolNames = tools.map((tool) => tool.name);

  expect(tools.length).toBeGreaterThan(0);
  expect(toolNames).toContain("app_all");
  expect(toolNames).toContain("app_byId");
  expect(toolNames).toContain("app_create");
  expect(toolNames).toContain("board_savePartialBoardSettings");
  expect(toolNames).toContain("board_duplicateBoard");
  expect(toolNames).toContain("customWidget_schema");
  expect(toolNames).toContain("customWidget_validate");
  expect(toolNames).toContain("customWidget_list");
  expect(toolNames).toContain("customWidget_get");
  expect(toolNames).toContain("customWidget_templatePatch");
  expect(toolNames).toContain("customWidget_create");
  expect(toolNames).toContain("customWidget_update");
  expect(toolNames).toContain("customWidget_delete");
  expect(toolNames).toContain("customWidget_previewCreate");
  expect(toolNames).toContain("customWidget_previewQuery");
  expect(toolNames).toContain("customWidget_previewAction");
  expect(toolNames).toContain("customWidget_previewJournal");
  expect(toolNames).toContain("customWidget_secretSet");
  expect(toolNames).toContain("customWidget_secretRequestUser");
  expect(toolNames).toContain("customWidget_getAuthoringPrompt");
  expect(toolNames).toContain("customWidget_getSkill");
  expect(toolNames).not.toContain("customWidget_import");
  expect(toolNames).not.toContain("customWidget_export");
  expect(toolNames).not.toContain("customWidget_simulatePreviewAction");
  expect(toolNames).toContain("info_getInfo");
  expect(toolNames).toContain("invite_getAll");
  expect(toolNames).toContain("serverSettings_getBoardSettings");
  expect(toolNames).toContain("serverSettings_updateBoardSettings");
});

test("MCP tools should have descriptions", () => {
  const tools = extractToolsFromProcedures(mcpTestRouter);

  for (const tool of tools) {
    expect(tool.description, `Tool ${tool.name} should have a description`).toBeTruthy();
  }

  expect(tools.find((tool) => tool.name === "customWidget_getAuthoringPrompt")?.description).toBe(
    "Get the current Custom Widget authoring instructions.",
  );
});

test("custom widget public procedures remain available", () => {
  expect(Object.keys(customWidgetRouter["_def"].procedures)).toEqual(
    expect.arrayContaining([
      "list",
      "get",
      "available",
      "create",
      "update",
      "toggleEnabled",
      "delete",
      "duplicate",
      "export",
      "import",
      "schema",
      "validate",
      "readTemplate",
      "writeTemplate",
      "templatePatch",
      "previewCreate",
      "previewGet",
      "previewQuery",
      "previewAction",
      "setPreviewLiveActions",
      "previewJournal",
      "secretSet",
      "secretRequestUser",
      "secretClear",
      "getAuthoringPrompt",
      "getSkill",
    ]),
  );
});
