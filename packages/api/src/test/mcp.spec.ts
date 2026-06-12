import { expect, test, vi } from "vitest";
import { extractToolsFromProcedures } from "trpc-to-mcp";

import { appRouter } from "../router/app";
import { infoRouter } from "../router/info";
import { inviteRouter } from "../router/invite";
import { createTRPCRouter } from "../trpc";

vi.mock("@homarr/auth", () => ({}));

const mcpTestRouter = createTRPCRouter({
  app: appRouter,
  info: infoRouter,
  invite: inviteRouter,
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
  expect(toolNames).toContain("info_getInfo");
  expect(toolNames).toContain("invite_getAll");
});

test("MCP tools should have descriptions", () => {
  const tools = extractToolsFromProcedures(mcpTestRouter);

  for (const tool of tools) {
    expect(tool.description, `Tool ${tool.name} should have a description`).toBeTruthy();
  }
});
