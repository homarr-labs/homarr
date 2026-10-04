import { describe, expect, test } from "vitest";
import type { TextStreamPart } from "ai";

import {
  createOpenRouterCitationStreamTransform,
  getOpenRouterWebSearchRequests,
  getOpenRouterWebSearchSources,
  normalizeOpenRouterWebSearchSources,
  withOpenRouterProviderRouting,
  withOpenRouterToolRequestOptions,
  withOpenRouterWebSearch,
} from "./assistant-openrouter";

describe("withOpenRouterWebSearch", () => {
  test("prefers DeepInfra FP8 with fallback for DeepSeek V4.1 only", () => {
    expect(withOpenRouterProviderRouting({ model: "deepseek/deepseek-v4.1-flash" })).toMatchObject({
      provider: {
        order: ["deepinfra/fp8"],
        quantizations: ["fp8"],
        allow_fallbacks: true,
      },
    });
    const luna = { model: "openai/gpt-5.6-luna" };
    expect(withOpenRouterProviderRouting(luna)).toBe(luna);
  });

  test("adds the current OpenRouter server tool alongside Homarr function tools", () => {
    expect(
      withOpenRouterWebSearch({
        model: "deepseek/deepseek-v4-flash-latest",
        tools: [{ type: "function", function: { name: "board_addItem", parameters: {} } }],
      }),
    ).toMatchObject({
      tools: [
        { type: "function", function: { name: "board_addItem" } },
        {
          type: "openrouter:web_search",
          parameters: {
            max_results: 6,
            max_uses: 3,
            max_total_results: 12,
            max_characters: 6_000,
            search_context_size: "medium",
          },
        },
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
          model: "deepseek/deepseek-v4.1-flash",
          tools: [{ type: "function", function: { name: "icon_findIcons", parameters: {} } }],
        },
        { webSearchEnabled: true },
      ),
    ).toMatchObject({
      parallel_tool_calls: false,
      max_tool_calls: 5,
      provider: { order: ["deepinfra/fp8"], quantizations: ["fp8"], allow_fallbacks: true },
      tools: [{ type: "function", function: { name: "icon_findIcons" } }, { type: "openrouter:web_search" }],
    });
  });

  test("allows parallel read-only preview queries", () => {
    expect(
      withOpenRouterToolRequestOptions(
        {
          tools: [{ type: "function", function: { name: "customWidget_previewQuery", parameters: {} } }],
        },
        { webSearchEnabled: false },
      ),
    ).toMatchObject({ parallel_tool_calls: true });
  });

  test.each([
    "customWidget_getExample",
    "integration_all",
    "customWidget_previewAction",
    "customWidget_createFromPreview",
  ])("keeps %s sequential", (name) => {
    expect(
      withOpenRouterToolRequestOptions(
        { tools: [{ type: "function", function: { name, parameters: {} } }] },
        { webSearchEnabled: false },
      ),
    ).toMatchObject({ parallel_tool_calls: false });
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

  test("emits deduplicated citations immediately after the matching text delta", async () => {
    const chunks: TextStreamPart<{}>[] = [
      {
        type: "raw",
        rawValue: {
          choices: [
            {
              delta: {
                annotations: [
                  {
                    type: "url_citation",
                    url_citation: { url: "https://docs.example.com/api", title: "API documentation" },
                  },
                ],
              },
            },
          ],
        },
      },
      { type: "text-delta", id: "answer", text: "Grounded answer." },
      {
        type: "raw",
        rawValue: {
          choices: [
            {
              delta: {
                annotations: [
                  {
                    type: "url_citation",
                    url_citation: { url: "https://docs.example.com/api", title: "Duplicate" },
                  },
                ],
              },
            },
          ],
        },
      },
      { type: "text-delta", id: "answer", text: " More text." },
    ];
    const output = [];
    const stream = new ReadableStream<TextStreamPart<{}>>({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(chunk);
        controller.close();
      },
    }).pipeThrough(createOpenRouterCitationStreamTransform()({ tools: {}, stopStream() {} }));
    for await (const chunk of stream) output.push(chunk);

    expect(output.map(({ type }) => type)).toEqual(["raw", "text-delta", "source", "raw", "text-delta"]);
    expect(output[2]).toEqual({
      type: "source",
      sourceType: "url",
      id: "openrouter-source-1",
      url: "https://docs.example.com/api",
      title: "API documentation",
    });
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
