import { describe, expect, test } from "vitest";
import type { ModelMessage, UIMessage } from "ai";

import {
  compactAssistantStepMessages,
  convertAssistantMessagesToModelMessages,
  getAssistantStepContextMaxCharacters,
} from "./assistant-message-conversion";

describe("getAssistantStepContextMaxCharacters", () => {
  test("uses model context without starving large-context tool loops", () => {
    expect(getAssistantStepContextMaxCharacters()).toBe(48_000);
    expect(getAssistantStepContextMaxCharacters(32_000)).toBe(48_000);
    expect(getAssistantStepContextMaxCharacters(128_000)).toBe(240_000);
    expect(getAssistantStepContextMaxCharacters(262_144)).toBe(240_000);
  });

  test("retains a large recent tool transcript for large-context models", () => {
    const messages: ModelMessage[] = [
      {
        role: "assistant",
        content: [
          {
            type: "tool-call",
            toolCallId: "component-docs",
            toolName: "customWidget_getComponents",
            input: { names: ["Card"] },
          },
        ],
      },
      {
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: "component-docs",
            toolName: "customWidget_getComponents",
            output: { type: "json", value: { marker: "KEEP-LARGE-CONTEXT", docs: "x".repeat(60_000) } },
          },
        ],
      },
      { role: "user", content: [{ type: "text", text: "Continue building it." }] },
    ];

    const maxCharacters = getAssistantStepContextMaxCharacters(262_144);
    expect(JSON.stringify(compactAssistantStepMessages(messages, maxCharacters))).toContain("KEEP-LARGE-CONTEXT");
  });
});

describe("convertAssistantMessagesToModelMessages", () => {
  test("preserves provider search references across approval continuation without replaying metadata", async () => {
    const messages: UIMessage[] = [
      {
        id: "researched",
        role: "assistant",
        metadata: { generationAccessToken: "DO-NOT-REPLAY" },
        parts: [
          { type: "text", text: "The documented endpoint is GET /today." },
          { type: "source-url", sourceId: "source-1", url: "https://example.com/api", title: "API docs" },
          { type: "source-url", sourceId: "source-2", url: "https://example.com/api" },
          { type: "source-url", sourceId: "unsafe", url: "https://secret:password@example.com/api" },
        ],
      },
    ];
    const serialized = JSON.stringify(await convertAssistantMessagesToModelMessages(messages));
    expect(serialized).toContain("https://example.com/api");
    expect(serialized.match(/https:\/\/example.com\/api/g)).toHaveLength(1);
    expect(serialized).not.toContain("DO-NOT-REPLAY");
    expect(serialized).not.toContain("secret:password");
    expect(serialized).toContain("not page contents");
  });

  test("bounds replayed references and never turns user sources into provider search evidence", async () => {
    const sources = Array.from({ length: 20 }, (_, index) => ({
      type: "source-url" as const,
      sourceId: `source-${index}`,
      url: `https://example.com/${index}`,
    }));
    const result = await convertAssistantMessagesToModelMessages([
      { id: "user", role: "user", parts: [{ type: "text", text: "Continue" }, ...sources] },
      { id: "assistant", role: "assistant", parts: sources },
    ]);
    expect(JSON.stringify(result[0])).not.toContain("provider web-search");
    const serialized = JSON.stringify(result);
    expect(serialized.match(/Earlier provider web-search/g)).toHaveLength(12);
    expect(serialized).not.toContain("https://example.com/12");
  });

  test("drops an interrupted tool call while preserving completed tool results", async () => {
    const messages: UIMessage[] = [
      {
        id: "user-1",
        role: "user",
        parts: [{ type: "text", text: "Find Homarr icons." }],
      },
      {
        id: "assistant-1",
        role: "assistant",
        parts: [
          {
            type: "tool-icon_findIcons",
            toolCallId: "cancelled-call",
            state: "input-available",
            input: { searchText: "homarr" },
          },
          {
            type: "tool-board_getBoardSettings",
            toolCallId: "completed-call",
            state: "output-available",
            input: { id: "board-1" },
            output: { id: "board-1", name: "Home" },
          },
        ],
      },
      {
        id: "user-2",
        role: "user",
        parts: [{ type: "text", text: "Continue." }],
      },
    ];

    const result = await convertAssistantMessagesToModelMessages(messages);
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain("cancelled-call");
    expect(serialized).toContain("completed-call");
    expect(serialized).toContain('"name":"Home"');
    expect(result.at(-1)).toEqual({ role: "user", content: [{ type: "text", text: "Continue." }] });
  });

  test("compacts oversized custom widget preview query results from conversation history", async () => {
    const oversizedData = Array.from({ length: 1_000 }, (_, index) => ({
      id: index,
      title: `Result ${index}`,
      description: "x".repeat(100),
    }));
    const messages: UIMessage[] = [
      {
        id: "assistant-1",
        role: "assistant",
        parts: [
          {
            type: "dynamic-tool",
            toolName: "customWidget_previewQuery",
            toolCallId: "preview-query-1",
            state: "output-available",
            input: { sessionId: "preview-1", requestId: "results", params: {} },
            output: { ok: true, status: 200, data: oversizedData },
          },
        ],
      },
      {
        id: "user-1",
        role: "user",
        parts: [{ type: "text", text: "Continue building the widget." }],
      },
    ];

    const result = await convertAssistantMessagesToModelMessages(messages);
    const serialized = JSON.stringify(result);

    expect(serialized).toContain('"truncated":true');
    expect(serialized).toContain('"status":200');
    expect(serialized).toContain("Continue building the widget.");
    expect(serialized.length).toBeLessThan(10_000);
  });

  test("drops reloadable Custom Widget documentation from later requests", async () => {
    const messages: UIMessage[] = [
      {
        id: "assistant-1",
        role: "assistant",
        parts: [
          {
            type: "dynamic-tool",
            toolName: "customWidget_schema",
            toolCallId: "schema-1",
            state: "output-available",
            input: {},
            output: { title: "Large live schema" },
          },
          {
            type: "dynamic-tool",
            toolName: "customWidget_previewCreate",
            toolCallId: "preview-1",
            state: "output-available",
            input: { definition: { name: "Seerr research" } },
            output: { previewSession: { id: "preview-1" } },
          },
        ],
      },
      {
        id: "user-1",
        role: "user",
        parts: [{ type: "text", text: "Test the preview queries." }],
      },
    ];

    const serialized = JSON.stringify(await convertAssistantMessagesToModelMessages(messages));

    expect(serialized).not.toContain("Large live schema");
    expect(serialized).toContain("customWidget_previewCreate");
    expect(serialized).toContain("Test the preview queries.");
  });

  test("prunes obsolete authoring calls inside a long-running tool loop", async () => {
    const messages: UIMessage[] = [
      {
        id: "user-1",
        role: "user",
        parts: [{ type: "text", text: "Create two advanced Seerr widgets." }],
      },
      {
        id: "assistant-1",
        role: "assistant",
        parts: [
          {
            type: "dynamic-tool",
            toolName: "customWidget_getComponent",
            toolCallId: "old-component",
            state: "output-available",
            input: { name: "Select" },
            output: { name: "Select", props: "old component documentation".repeat(1_000) },
          },
        ],
      },
      {
        id: "assistant-2",
        role: "assistant",
        parts: [
          {
            type: "dynamic-tool",
            toolName: "customWidget_validateTemplate",
            toolCallId: "old-validation",
            state: "output-available",
            input: { template: "<Stack>old template</Stack>".repeat(1_000) },
            output: { valid: true },
          },
        ],
      },
      {
        id: "assistant-3",
        role: "assistant",
        parts: [
          {
            type: "dynamic-tool",
            toolName: "customWidget_previewCreate",
            toolCallId: "current-preview",
            state: "output-available",
            input: { definition: { name: "Seerr research", template: "<Stack>current</Stack>" } },
            output: { previewSession: { id: "preview-1" }, queries: [{ requestId: "search" }] },
          },
        ],
      },
    ];

    const converted = await convertAssistantMessagesToModelMessages(messages);
    const compacted = compactAssistantStepMessages(converted, 1);
    const serialized = JSON.stringify(compacted);

    expect(serialized).not.toContain("old-component");
    expect(serialized).not.toContain("old-validation");
    expect(serialized).toContain("current-preview");
    expect(serialized).toContain("preview-1");
  });

  test("keeps parallel reference results and a later cached context result", () => {
    const messages: ModelMessage[] = [
      {
        role: "assistant",
        content: [
          {
            type: "tool-call",
            toolCallId: "schema-reference",
            toolName: "customWidget_getReference",
            input: { name: "schema" },
          },
          {
            type: "tool-call",
            toolCallId: "runtime-reference",
            toolName: "customWidget_getReference",
            input: { name: "runtime" },
          },
        ],
      },
      {
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: "schema-reference",
            toolName: "customWidget_getReference",
            output: { type: "json", value: { name: "schema", content: "schema reference" } },
          },
          {
            type: "tool-result",
            toolCallId: "runtime-reference",
            toolName: "customWidget_getReference",
            output: { type: "json", value: { name: "runtime", content: "runtime reference" } },
          },
        ],
      },
      {
        role: "assistant",
        content: [
          {
            type: "tool-call",
            toolCallId: "runtime-cache-hit",
            toolName: "customWidget_getReference",
            input: { name: "runtime" },
          },
        ],
      },
      {
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: "runtime-cache-hit",
            toolName: "customWidget_getReference",
            output: {
              type: "json",
              value: { contextAlreadyLoaded: true, nextStep: "Reuse the earlier runtime result." },
            },
          },
        ],
      },
    ];

    for (const maxCharacters of [48_000, 1]) {
      const serialized = JSON.stringify(compactAssistantStepMessages(messages, maxCharacters));

      expect(serialized).toContain("schema-reference");
      expect(serialized).toContain("schema reference");
      expect(serialized).toContain("runtime-reference");
      expect(serialized).toContain("runtime reference");
      expect(serialized).toContain("runtime-cache-hit");
      expect(serialized).toContain("contextAlreadyLoaded");
    }
  });

  test("drops duplicate Custom Widget calls when a provider ignores sequential tool settings", () => {
    const messages: ModelMessage[] = [
      {
        role: "assistant",
        content: [
          {
            type: "tool-call",
            toolCallId: "first-preview",
            toolName: "customWidget_previewCreate",
            input: { definition: { name: "First" } },
          },
          {
            type: "tool-call",
            toolCallId: "duplicate-preview",
            toolName: "customWidget_previewCreate",
            input: { definition: { name: "Duplicate", template: "x".repeat(20_000) } },
          },
          {
            type: "tool-call",
            toolCallId: "regular-tool",
            toolName: "homarr_enableToolGroups",
            input: { groups: ["board"] },
          },
        ],
      },
      {
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: "first-preview",
            toolName: "customWidget_previewCreate",
            output: { type: "json", value: { previewSession: { id: "preview-1" } } },
          },
          {
            type: "tool-result",
            toolCallId: "duplicate-preview",
            toolName: "customWidget_previewCreate",
            output: { type: "json", value: { error: "Sequential call rejected" } },
          },
          {
            type: "tool-result",
            toolCallId: "regular-tool",
            toolName: "homarr_enableToolGroups",
            output: { type: "json", value: { enabledGroups: ["board"] } },
          },
        ],
      },
    ];

    const serialized = JSON.stringify(compactAssistantStepMessages(messages));

    expect(serialized).toContain("first-preview");
    expect(serialized).not.toContain("regular-tool");
    expect(serialized).not.toContain("duplicate-preview");
    expect(serialized.length).toBeLessThan(2_000);
  });
});
