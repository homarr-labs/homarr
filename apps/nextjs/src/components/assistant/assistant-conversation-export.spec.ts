import { describe, expect, test } from "vitest";

import {
  buildAssistantConversationMarkdown,
  buildAssistantMessageMarkdown,
  getAssistantConversationExportFilename,
} from "./assistant-conversation-export";

describe("buildAssistantConversationMarkdown", () => {
  test("exports user, assistant, reasoning, tool, and server telemetry content", () => {
    const markdown = buildAssistantConversationMarkdown({
      thread: {
        id: "thread-12345678",
        title: "Icon debugging",
        modelId: "deepseek/deepseek-v4-flash",
        createdAt: "2026-08-10T08:00:00.000Z",
        updatedAt: "2026-08-10T08:01:00.000Z",
      },
      messages: [
        {
          id: "user-1",
          parentId: null,
          format: "ai-sdk/v6",
          content: { role: "user", parts: [{ type: "text", text: "Find the Homarr icon" }] },
        },
        {
          id: "assistant-1",
          parentId: "user-1",
          format: "ai-sdk/v6",
          content: {
            role: "assistant",
            parts: [
              { type: "reasoning", text: "I should search the local icon catalog." },
              {
                type: "dynamic-tool",
                toolName: "icon_findIcons",
                toolCallId: "tool-1",
                state: "output-available",
                input: { searchText: "homarr", apiKey: "must-not-leak" },
                output: {
                  icons: [{ name: "homarr.svg" }],
                  url: "https://user:password@example.com/icons?api_key=must-not-leak&query=homarr",
                },
              },
              { type: "text", text: "I found the icon." },
            ],
            metadata: {
              custom: {
                telemetry: { requestId: "request-1", inputTokens: 120, generationAccessToken: "must-not-leak" },
              },
            },
          },
        },
      ],
      exportedAt: new Date("2026-08-10T08:02:00.000Z"),
    });

    expect(markdown).toContain("## 1. User message");
    expect(markdown).toContain("Find the Homarr icon");
    expect(markdown).toContain("## 2. Assistant response");
    expect(markdown).toContain("<summary>Reasoning</summary>");
    expect(markdown).toContain("### Tool call: `icon_findIcons`");
    expect(markdown).toContain("- Tool calls: 1");
    expect(markdown).toContain('"searchText": "homarr"');
    expect(markdown).toContain('"inputTokens": 120');
    expect(markdown).toContain('"generationAccessToken": "[redacted]"');
    expect(markdown).toContain("https://redacted:redacted@example.com/icons?api_key=redacted&query=homarr");
    expect(markdown).not.toContain("must-not-leak");
  });

  test("normalizes assistant-ui tool calls with raw streamed input, results, errors, and server metadata", () => {
    const markdown = buildAssistantMessageMarkdown(
      {
        id: "assistant-runtime-1",
        parentId: "user-1",
        format: "assistant-ui/runtime",
        content: {
          id: "assistant-runtime-1",
          role: "assistant",
          createdAt: "2026-08-10T08:03:00.000Z",
          status: { type: "incomplete", reason: "error" },
          content: [
            {
              type: "tool-call",
              toolName: "icon_findIcons",
              toolCallId: "icon-call-1",
              args: { searchText: "homarr" },
              argsText: '{"searchText":"homarr"',
              result: { error: "Error in input stream" },
              isError: true,
              providerMetadata: { openrouter: { traceId: "trace-1" } },
            },
          ],
          metadata: { custom: { telemetry: { requestId: "request-2", cost: 0.001 } } },
        },
      },
      new Date("2026-08-10T08:04:00.000Z"),
    );

    expect(markdown).toContain("### Tool call: `icon_findIcons`");
    expect(markdown).toContain('"searchText": "homarr"');
    expect(markdown).toContain("Raw streamed input");
    expect(markdown).toContain("Error in input stream");
    expect(markdown).toContain("Tool diagnostics");
    expect(markdown).toContain('"traceId": "trace-1"');
    expect(markdown).toContain("Server metadata");
    expect(markdown).toContain('"requestId": "request-2"');
  });

  test("keeps system and unknown server messages available for debugging", () => {
    const markdown = buildAssistantConversationMarkdown({
      thread: { id: "thread-server", title: "Server records" },
      messages: [
        {
          id: "system-1",
          parentId: null,
          format: "ai-sdk/v6",
          content: { role: "system", parts: [{ type: "text", text: "System context snapshot" }] },
        },
        {
          id: "server-1",
          parentId: "system-1",
          format: "server/debug",
          content: { event: "stream-error", error: "Provider disconnected" },
        },
      ],
    });

    expect(markdown).toContain("## 1. System message");
    expect(markdown).toContain("System context snapshot");
    expect(markdown).toContain("## 2. Server message");
    expect(markdown).toContain('"event": "stream-error"');
    expect(markdown).toContain("Provider disconnected");
  });

  test("omits embedded attachment data and handles an empty conversation", () => {
    expect(
      buildAssistantConversationMarkdown({
        thread: { id: "thread-empty", title: null },
        messages: [],
        exportedAt: new Date("2026-08-10T08:02:00.000Z"),
      }),
    ).toContain("No messages have been stored");

    const markdown = buildAssistantConversationMarkdown({
      thread: { id: "thread-files", title: "Files" },
      messages: [
        {
          id: "user-file",
          parentId: null,
          format: "ai-sdk/v6",
          content: {
            role: "user",
            parts: [{ type: "data-debug", payload: "data:image/png;base64,AAAA" }],
          },
        },
      ],
    });
    expect(markdown).toContain("[image/png data omitted]");
    expect(markdown).not.toContain("base64,AAAA");
  });
});

describe("getAssistantConversationExportFilename", () => {
  test("creates a short portable Markdown filename", () => {
    expect(getAssistantConversationExportFilename("  Icônes & Debug  ", "abcdefgh12345678")).toBe(
      "icones-debug-abcdefgh.md",
    );
  });
});
