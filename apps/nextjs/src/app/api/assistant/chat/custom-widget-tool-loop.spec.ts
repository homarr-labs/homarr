import { describe, expect, it, vi } from "vitest";
import { jsonSchema, simulateReadableStream, stepCountIs, streamText, tool } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { parse, stringify } from "superjson";

import { getCustomWidgetSkillEntrypoint } from "@homarr/custom-widgets/authoring-resources";
import { getCustomWidgetJsonSchema } from "@homarr/custom-widgets/core";

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

describe("Custom Widget assistant tool loop", () => {
  it("feeds the compact skill entrypoint and an explicitly requested schema into the next model step", async () => {
    const streamErrors = vi.fn();
    const model = new MockLanguageModelV4({
      doStream: [
        {
          stream: simulateReadableStream({
            chunks: [
              { type: "stream-start" as const, warnings: [] },
              {
                type: "tool-call" as const,
                toolCallId: "skill-call",
                toolName: "customWidget_getSkill",
                input: "{}",
              },
              {
                type: "tool-call" as const,
                toolCallId: "schema-call",
                toolName: "customWidget_schema",
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
              { type: "text-delta" as const, id: "answer", delta: "Custom Widget resources loaded." },
              { type: "text-end" as const, id: "answer" },
              finish("stop"),
            ],
            chunkDelayInMs: null,
          }),
        },
      ],
    });

    const noInputSchema = jsonSchema({ type: "object", properties: {}, additionalProperties: false });
    const result = streamText({
      model,
      prompt: "Create a Custom Widget.",
      tools: {
        customWidget_getSkill: tool({
          inputSchema: noInputSchema,
          execute: () => parse(stringify(getCustomWidgetSkillEntrypoint())),
        }),
        customWidget_schema: tool({
          inputSchema: noInputSchema,
          execute: () => parse(stringify(getCustomWidgetJsonSchema())),
        }),
      },
      stopWhen: stepCountIs(2),
      onError: streamErrors,
    });

    await expect(result.text).resolves.toBe("Custom Widget resources loaded.");
    expect(streamErrors).not.toHaveBeenCalled();
    expect(model.doStreamCalls).toHaveLength(2);

    const nextStepPrompt = model.doStreamCalls[1]?.prompt;
    expect(() => JSON.stringify(nextStepPrompt)).not.toThrow();
    const serializedPrompt = JSON.stringify(nextStepPrompt);
    expect(serializedPrompt).toContain('"name":"homarr-custom-widget"');
    expect(serializedPrompt).toContain('"tool":"customWidget_getReference"');
    expect(serializedPrompt).toContain('"name":"runtime"');
    expect(serializedPrompt).not.toContain("# Bundled file:");
    expect(serializedPrompt).toContain('"title":"Homarr Custom JSX v2 widget"');
    expect(serializedPrompt).toContain('"$schema"');
  });

  it("repairs malformed no-input provider arguments and executes the resource tool", async () => {
    const execute = vi.fn((_input: unknown) => ({ name: "homarr-custom-widget" }));
    const model = new MockLanguageModelV4({
      doStream: [
        {
          stream: simulateReadableStream({
            chunks: [
              { type: "stream-start" as const, warnings: [] },
              {
                type: "tool-call" as const,
                toolCallId: "skill-call",
                toolName: "customWidget_getSkill",
                input: "{",
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
              { type: "text-delta" as const, id: "answer", delta: "Repaired." },
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
      prompt: "Load the skill.",
      tools: {
        customWidget_getSkill: tool({
          inputSchema: jsonSchema({ type: "object", properties: {}, additionalProperties: false }),
          execute,
        }),
      },
      experimental_repairToolCall: ({ toolCall }) => Promise.resolve(repairAssistantToolInput(toolCall)),
      stopWhen: stepCountIs(2),
    });

    await expect(result.text).resolves.toBe("Repaired.");
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute.mock.calls[0]?.[0]).toEqual({});
    expect(model.doStreamCalls[1]?.prompt.some((message) => message.role === "tool")).toBe(true);
  });
});
