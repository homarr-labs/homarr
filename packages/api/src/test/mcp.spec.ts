// @vitest-environment node

import { expect, test, vi } from "vitest";
import { extractToolsFromProcedures } from "trpc-to-mcp";

import { appRouter } from "../router/app";
import { boardRouter } from "../router/board";
import { customWidgetRouter } from "../router/custom-widget/custom-widget-router";
import { iconsRouter } from "../router/icons";
import { infoRouter } from "../router/info";
import { inviteRouter } from "../router/invite";
import { serverSettingsRouter } from "../router/serverSettings";
import { createTRPCRouter } from "../trpc";

vi.mock("@homarr/auth", () => ({}));
vi.mock("@homarr/common/server", () => ({
  decryptSecret: vi.fn(),
  encryptSecret: vi.fn(),
}));
vi.mock("@homarr/core/infrastructure/logs", () => ({
  createLogger: () => ({
    error: vi.fn(),
  }),
}));
vi.mock("@homarr/core/infrastructure/db/env", () => ({
  dbEnv: { DRIVER: "better-sqlite3" },
}));

const mcpTestRouter = createTRPCRouter({
  app: appRouter,
  board: boardRouter,
  customWidget: customWidgetRouter,
  icon: iconsRouter,
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
  expect(toolNames).toContain("board_getBoardSettings");
  expect(toolNames).toContain("board_duplicateBoard");
  expect(toolNames).toContain("customWidget_all");
  expect(toolNames).toContain("customWidget_byId");
  expect(toolNames).toContain("customWidget_create");
  expect(toolNames).toContain("customWidget_update");
  expect(toolNames).toContain("icon_findIcons");
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
});
