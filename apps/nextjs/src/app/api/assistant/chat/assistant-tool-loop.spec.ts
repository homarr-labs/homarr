import { describe, expect, test, vi } from "vitest";
import { jsonSchema, simulateReadableStream, stepCountIs, streamText, tool } from "ai";
import { MockLanguageModelV4 } from "ai/test";

import { browserToolContracts } from "~/components/assistant/assistant-tool-contracts";

import { repairAssistantToolInput } from "./assistant-tool-input-repair";
import { toAssistantToolOutput } from "./assistant-tool-output";
import { getValidatedAssistantToolSchema } from "./assistant-tool-schema";

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

  test("normalizes rich tRPC results before the next model step", async () => {
    const streamErrors = vi.fn();
    const inspect = vi.fn(() =>
      toAssistantToolOutput({
        updatedAt: new Date("2026-08-10T00:00:00.000Z"),
        optional: undefined,
        exactCount: 28_154n,
        groups: new Map([["icons", new Set(["homarr.svg", "homarr.png"])]]),
      }),
    );
    const model = new MockLanguageModelV4({
      doStream: [
        {
          stream: simulateReadableStream({
            chunks: [
              { type: "stream-start" as const, warnings: [] },
              {
                type: "tool-call" as const,
                toolCallId: "inspect-call",
                toolName: "inspect",
                input: "{}",
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
              { type: "text-delta" as const, id: "answer", delta: "The rich result is valid." },
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
      prompt: "Inspect rich Homarr data.",
      tools: {
        inspect: tool({
          inputSchema: jsonSchema({ type: "object", properties: {}, additionalProperties: false }),
          execute: inspect,
        }),
      },
      stopWhen: stepCountIs(2),
      onError: streamErrors,
    });

    await expect(result.text).resolves.toBe("The rich result is valid.");
    expect(streamErrors).not.toHaveBeenCalled();
    expect(inspect).toHaveBeenCalledTimes(1);
    const nextPrompt = JSON.stringify(model.doStreamCalls[1]?.prompt);
    expect(nextPrompt).toContain('"updatedAt":"2026-08-10T00:00:00.000Z"');
    expect(nextPrompt).toContain('"optional":null');
    expect(nextPrompt).toContain('"exactCount":"28154"');
    expect(nextPrompt).toContain('"groups":[["icons",["homarr.svg","homarr.png"]]]');
  });

  test("validates browser tool arguments before a human tool can render them", async () => {
    const model = new MockLanguageModelV4({
      doStream: [
        {
          stream: simulateReadableStream({
            chunks: [
              { type: "stream-start" as const, warnings: [] },
              {
                type: "tool-call" as const,
                toolCallId: "ask-call",
                toolName: "ask_user",
                input: JSON.stringify({
                  question: "Where should this go?",
                  options: [
                    { id: "place", description: "Add it to the dashboard.", kind: "affirmative" },
                    { id: "leave", description: "Leave it unplaced.", kind: "negative" },
                  ],
                  allowOther: false,
                }),
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
              {
                type: "tool-call" as const,
                toolCallId: "ask-call-repaired",
                toolName: "ask_user",
                input: JSON.stringify({
                  question: "Wohin soll das Widget?",
                  options: [
                    { id: "place", label: "Dashboard hinzufügen", kind: "affirmative" },
                    { id: "leave", label: "Nicht platzieren", kind: "negative" },
                  ],
                  allowOther: false,
                }),
              },
              finish("tool-calls"),
            ],
            chunkDelayInMs: null,
          }),
        },
      ],
    });

    const result = streamText({
      model,
      prompt: "Ask where to place the widget.",
      tools: {
        ask_user: tool({ inputSchema: getValidatedAssistantToolSchema(browserToolContracts.ask_user.parameters) }),
      },
      stopWhen: stepCountIs(2),
    });

    const steps = await result.steps;
    expect(steps[0]?.toolCalls[0]).toMatchObject({
      toolName: "ask_user",
      invalid: true,
    });
    expect(steps[0]?.toolCalls[0]?.input).toMatchObject({
      options: [{ id: "place" }, { id: "leave" }],
    });
    expect(steps).toHaveLength(2);
    expect(JSON.stringify(model.doStreamCalls[1]?.prompt)).toContain("Invalid input for tool ask_user");
    expect(steps[1]?.toolCalls[0]).toMatchObject({
      toolName: "ask_user",
      input: {
        options: [
          { id: "place", label: "Dashboard hinzufügen", kind: "affirmative" },
          { id: "leave", label: "Nicht platzieren", kind: "negative" },
        ],
      },
    });
    expect(steps[1]?.toolCalls[0]).not.toHaveProperty("invalid");
  });

  test("accepts localized browser option labels through the same schema", () => {
    expect(
      browserToolContracts.ask_user.parameters.safeParse({
        question: "Wohin soll das Widget?",
        options: [
          { id: "place", label: "Dashboard hinzufügen", kind: "affirmative" },
          { id: "leave", label: "Nicht platzieren", kind: "negative" },
        ],
        allowOther: false,
      }).success,
    ).toBe(true);
  });
});
