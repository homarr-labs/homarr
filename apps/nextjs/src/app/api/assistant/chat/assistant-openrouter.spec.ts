import { describe, expect, test } from "vitest";

import { getOpenRouterWebSearchRequests, withOpenRouterWebSearch } from "./assistant-openrouter";

describe("withOpenRouterWebSearch", () => {
  test("adds the current OpenRouter server tool alongside Homarr function tools", () => {
    expect(
      withOpenRouterWebSearch({
        model: "deepseek/deepseek-v4-flash-latest",
        tools: [{ type: "function", function: { name: "board_addItem", parameters: {} } }],
      }),
    ).toMatchObject({
      tools: [
        { type: "function", function: { name: "board_addItem" } },
        { type: "openrouter:web_search", parameters: { max_results: 5, max_uses: 3 } },
      ],
    });
  });

  test("does not register the web search tool twice", () => {
    const body = { tools: [{ type: "openrouter:web_search", parameters: { max_results: 3 } }] };

    expect(withOpenRouterWebSearch(body)).toBe(body);
  });

  test("reads OpenRouter server-tool usage from a response", () => {
    expect(getOpenRouterWebSearchRequests({ usage: { server_tool_use: { web_search_requests: 2 } } })).toBe(2);
    expect(getOpenRouterWebSearchRequests({ usage: {} })).toBeUndefined();
    expect(getOpenRouterWebSearchRequests({ usage: { server_tool_use: { web_search_requests: -1 } } })).toBeUndefined();
  });
});
