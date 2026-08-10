import { describe, expect, test, vi } from "vitest";
import { jsonSchema, simulateReadableStream, stepCountIs, streamText, tool } from "ai";
import { MockLanguageModelV4 } from "ai/test";

import { repairAssistantToolInput } from "./assistant-tool-input-repair";

const usage = {
  inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 5, text: 5, reasoning: 0 },
};

const finish = (unified: "stop" | "tool-calls") => ({
  type: "finish" as const,
  finishReason: { unified, raw: unified },
  usage,
});

describe("Assistant tool loop", () => {
  test("keeps a valid icon search alongside another agent tool result", async () => {
    const findIcons = vi.fn(() => ({
      countIcons: 1,
      icons: [
        {
          slug: "homarr-labs/dashboard-icons",
          icons: [{ name: "homarr.svg", url: "https://cdn.example.com/homarr.svg" }],
        },
      ],
    }));
    const getBoardSettings = vi.fn(() => ({ id: "board-1", name: "Home" }));
    const model = new MockLanguageModelV4({
      doStream: [
        {
          stream: simulateReadableStream({
            chunks: [
              { type: "stream-start" as const, warnings: [] },
              {
                type: "tool-call" as const,
                toolCallId: "icon-call",
                toolName: "icon_findIcons",
                input: '{"searchText":"homarr"}',
              },
              {
                type: "tool-call" as const,
                toolCallId: "board-call",
                toolName: "board_getBoardSettings",
                input: '{"id":"board-1"}',
              },
              finish("tool-calls"),
            ],
            chunkDelayInMs: null,
          }),
        },
        {
          stream: simulateReadableStream({
            chunks: [
              { type: "stream-start" as const, warnings: [] },
              { type: "text-start" as const, id: "answer" },
              { type: "text-delta" as const, id: "answer", delta: "Both tools completed." },
              { type: "text-end" as const, id: "answer" },
              finish("stop"),
            ],
            chunkDelayInMs: null,
          }),
        },
      ],
    });
    const result = streamText({
      model,
      prompt: "Find the Homarr icon and inspect my board.",
      tools: {
        icon_findIcons: tool({
          inputSchema: jsonSchema({
            type: "object",
            properties: {
              searchText: { type: "string" },
              limitPerGroup: { type: "number", minimum: 1, maximum: 500, default: 12 },
            },
            additionalProperties: false,
          }),
          execute: findIcons,
        }),
        board_getBoardSettings: tool({
          inputSchema: jsonSchema({
            type: "object",
            properties: { id: { type: "string" } },
            required: ["id"],
            additionalProperties: false,
          }),
          execute: getBoardSettings,
        }),
      },
      stopWhen: stepCountIs(2),
    });

    await expect(result.text).resolves.toBe("Both tools completed.");
    expect(findIcons).toHaveBeenCalledWith(
      { searchText: "homarr" },
      expect.objectContaining({ toolCallId: "icon-call" }),
    );
    expect(getBoardSettings).toHaveBeenCalledTimes(1);
    const nextPrompt = JSON.stringify(model.doStreamCalls[1]?.prompt);
    expect(nextPrompt).toContain("homarr.svg");
    expect(nextPrompt).toContain('"id":"board-1"');
  });

  test("repairs and executes an icon search whose streamed object is missing its closing delimiter", async () => {
    const findIcons = vi.fn(() => ({
      countIcons: 1,
      icons: [
        {
          slug: "homarr-labs/dashboard-icons",
          icons: [{ name: "homarr.svg", url: "https://cdn.example.com/homarr.svg" }],
        },
      ],
    }));
    const model = new MockLanguageModelV4({
      doStream: [
        {
          stream: simulateReadableStream({
            chunks: [
              { type: "stream-start" as const, warnings: [] },
              {
                type: "tool-call" as const,
                toolCallId: "icon-call",
                toolName: "icon_findIcons",
                input: '{"searchText":"homarr"',
              },
              finish("tool-calls"),
            ],
            chunkDelayInMs: null,
          }),
        },
        {
          stream: simulateReadableStream({
            chunks: [
              { type: "stream-start" as const, warnings: [] },
              { type: "text-start" as const, id: "answer" },
              { type: "text-delta" as const, id: "answer", delta: "The icon search completed." },
              { type: "text-end" as const, id: "answer" },
              finish("stop"),
            ],
            chunkDelayInMs: null,
          }),
        },
      ],
    });
    const result = streamText({
      model,
      prompt: "Find the Homarr icon.",
      tools: {
        icon_findIcons: tool({
          inputSchema: jsonSchema({
            type: "object",
            properties: { searchText: { type: "string" } },
            additionalProperties: false,
          }),
          execute: findIcons,
        }),
      },
      experimental_repairToolCall: ({ toolCall }) => Promise.resolve(repairAssistantToolInput(toolCall)),
      stopWhen: stepCountIs(2),
    });

    await expect(result.text).resolves.toBe("The icon search completed.");
    expect(findIcons).toHaveBeenCalledWith(
      { searchText: "homarr" },
      expect.objectContaining({ toolCallId: "icon-call" }),
    );
  });
});
