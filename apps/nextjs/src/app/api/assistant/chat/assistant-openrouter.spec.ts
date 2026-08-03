import { describe, expect, test } from "vitest";

import { withOpenRouterWebSearch } from "./assistant-openrouter";

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
        { type: "openrouter:web_search", parameters: { max_results: 5 } },
      ],
    });
  });

  test("does not register the web search tool twice", () => {
    const body = { tools: [{ type: "openrouter:web_search", parameters: { max_results: 3 } }] };

    expect(withOpenRouterWebSearch(body)).toBe(body);
  });
});
