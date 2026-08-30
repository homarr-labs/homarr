import { describe, expect, test } from "vitest";
import { z } from "zod/v4";

import type { McpTool } from "@homarr/api/mcp";

import { filterAssistantMcpToolMatches, findAssistantMcpTools } from "./assistant-tool-discovery";

const createTool = (name: string, description: string, pathInRouter = name.split("_")): McpTool => ({
  name,
  description,
  pathInRouter,
  inputSchema: { type: "object", properties: {} },
  inputValidator: z.object({}),
});

describe("Assistant tool discovery", () => {
  const tools = [
    createTool("customWidget_previewCreate", "Validate a complete Custom Widget and create its preview."),
    createTool("customWidget_previewQuery", "Test a query from a Custom Widget preview."),
    createTool("customWidget_createFromPreview", "Persist the exact tested Custom Widget preview."),
    createTool("mediaRequests_search", "Search Seerr media requests."),
    createTool("board_getAllBoards", "List Homarr boards."),
  ];

  test("finds only the small relevant lifecycle subset", () => {
    expect(findAssistantMcpTools(tools, "custom widget preview and persist", 3).map(({ name }) => name)).toEqual([
      "customWidget_createFromPreview",
      "customWidget_previewCreate",
      "customWidget_previewQuery",
    ]);
  });

  test("uses service aliases without loading unrelated schemas", () => {
    expect(findAssistantMcpTools(tools, "Seerr movie requests").map(({ name }) => name)).toEqual([
      "mediaRequests_search",
    ]);
  });

  test("returns no tools when a query contains only ignored terms", () => {
    expect(findAssistantMcpTools(tools, "a an and the to")).toEqual([]);
  });

  test("keeps heavyweight authoring resources hidden unless explicitly requested", () => {
    const matches = [
      createTool("customWidget_getComponentCatalog", "Get the complete component catalog."),
      createTool("customWidget_schema", "Get the complete JSON Schema."),
      createTool("customWidget_findComponents", "Find focused components."),
    ];

    expect(filterAssistantMcpToolMatches(matches, "custom widget", true).map(({ name }) => name)).toEqual([
      "customWidget_findComponents",
    ]);
    expect(filterAssistantMcpToolMatches(matches, "full component catalog and live schema", true).map(({ name }) =>
      name,
    )).toEqual(["customWidget_getComponentCatalog", "customWidget_findComponents"]);
    expect(filterAssistantMcpToolMatches(matches, "custom widget", false)).toEqual(matches);
  });
});
