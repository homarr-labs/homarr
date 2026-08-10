import { describe, expect, test } from "vitest";

import {
  getOpenRouterWebSearchRequests,
  getOpenRouterWebSearchSources,
  normalizeOpenRouterWebSearchSources,
  withOpenRouterToolRequestOptions,
  withOpenRouterWebSearch,
} from "./assistant-openrouter";

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

  test("runs OpenRouter function tools sequentially while preserving optional server web search", () => {
    expect(
      withOpenRouterToolRequestOptions(
        {
          model: "deepseek/deepseek-v4-flash-latest",
          tools: [{ type: "function", function: { name: "icon_findIcons", parameters: {} } }],
        },
        { webSearchEnabled: true },
      ),
    ).toMatchObject({
      parallel_tool_calls: false,
      tools: [{ type: "function", function: { name: "icon_findIcons" } }, { type: "openrouter:web_search" }],
    });
  });

  test("reads OpenRouter server-tool usage from a response", () => {
    expect(getOpenRouterWebSearchRequests({ usage: { server_tool_use: { web_search_requests: 2 } } })).toBe(2);
    expect(getOpenRouterWebSearchRequests({ usage: {} })).toBeUndefined();
    expect(getOpenRouterWebSearchRequests({ usage: { server_tool_use: { web_search_requests: -1 } } })).toBeUndefined();
  });

  test("extracts and deduplicates Chat Completions web-search citations", () => {
    expect(
      getOpenRouterWebSearchSources({
        choices: [
          {
            delta: {
              annotations: [
                {
                  type: "url_citation",
                  url_citation: {
                    url: "https://example.com/plex",
                    title: "Self-host Plex",
                    content: "A long excerpt that must not be persisted.",
                  },
                },
              ],
            },
          },
          {
            message: {
              annotations: [
                {
                  type: "url_citation",
                  url_citation: { url: "https://example.com/plex", title: "Duplicate" },
                },
                {
                  type: "url_citation",
                  url_citation: { url: "https://docs.plex.tv/install", title: "Plex documentation" },
                },
              ],
            },
          },
        ],
      }),
    ).toEqual([
      { url: "https://example.com/plex", title: "Self-host Plex" },
      { url: "https://docs.plex.tv/install", title: "Plex documentation" },
    ]);
  });

  test("rejects unsafe citations and normalizes persisted source metadata", () => {
    expect(
      getOpenRouterWebSearchSources({
        annotations: [
          { type: "url_citation", url_citation: { url: "javascript:alert(1)" } },
          { type: "url_citation", url_citation: { url: "https://user:password@example.com/private" } },
        ],
      }),
    ).toEqual([]);
    expect(
      normalizeOpenRouterWebSearchSources([
        { url: "https://example.com/result", title: " Result " },
        { url: "https://example.com/result" },
        { url: "file:///etc/passwd", title: "Unsafe" },
      ]),
    ).toEqual([{ url: "https://example.com/result", title: "Result" }]);
  });
});
