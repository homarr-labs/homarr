import { describe, expect, it, vi } from "vitest";
import { jsonSchema, simulateReadableStream, stepCountIs, streamText, tool } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { parse, stringify } from "superjson";

import { getCustomWidgetSkill } from "@homarr/custom-widgets/authoring-resources";
import { getCustomWidgetJsonSchema } from "@homarr/custom-widgets/core";

import { createCustomWidgetDynamicContextController } from "./custom-widget-authoring-context";
import { repairCustomWidgetToolInput } from "./assistant-tool-input-repair";

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
  it("feeds the complete skill and schema into the next streamed model step", async () => {
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
          execute: () => parse(stringify(getCustomWidgetSkill())),
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
    expect(serializedPrompt).toContain('"references/schema.md"');
    expect(serializedPrompt).toContain('"references/runtime.md"');
    expect(serializedPrompt).toContain('"references/security.md"');
    expect(serializedPrompt).toContain('"title":"Homarr Custom JSX v2 widget"');
    expect(serializedPrompt).toContain('"$schema"');
  });

  it("promotes trusted context when implicit authoring starts with a catalog call", async () => {
    const model = new MockLanguageModelV4({
      doStream: [
        {
          stream: simulateReadableStream({
            chunks: [
              { type: "stream-start" as const, warnings: [] },
              {
                type: "tool-call" as const,
                toolCallId: "catalog-call",
                toolName: "customWidget_getComponentCatalog",
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
              { type: "text-delta" as const, id: "answer", delta: "Authoring can continue." },
              { type: "text-end" as const, id: "answer" },
              finish("stop"),
            ],
            chunkDelayInMs: null,
          }),
        },
      ],
    });

    const noInputSchema = jsonSchema({ type: "object", properties: {}, additionalProperties: false });
    const baseInstructions = "Base assistant instructions. Untrusted mention: Trusted Custom Widget authoring context.";
    const prepareDynamicCustomWidgetContext = createCustomWidgetDynamicContextController({
      isAdmin: true,
      baseInstructions,
      availableToolNames: ["customWidget_getSkill", "customWidget_schema", "customWidget_getComponentCatalog"] as const,
    });
    const result = streamText({
      model,
      instructions: baseInstructions,
      prompt: "Build a live fixtures card.",
      tools: {
        customWidget_getSkill: tool({
          inputSchema: noInputSchema,
          execute: () => parse(stringify(getCustomWidgetSkill())),
        }),
        customWidget_schema: tool({
          inputSchema: noInputSchema,
          execute: () => parse(stringify(getCustomWidgetJsonSchema())),
        }),
        customWidget_getComponentCatalog: tool({
          inputSchema: noInputSchema,
          execute: () => ({ components: [] }),
        }),
      },
      prepareStep: ({ instructions, messages, steps }) =>
        prepareDynamicCustomWidgetContext({ instructions, messages, steps }),
      stopWhen: stepCountIs(2),
    });

    await expect(result.text).resolves.toBe("Authoring can continue.");
    expect(model.doStreamCalls).toHaveLength(2);

    const nextProviderCall = model.doStreamCalls[1];
    const serializedToolMessages = JSON.stringify(
      nextProviderCall?.prompt.filter((message) => message.role === "tool"),
    );
    expect(serializedToolMessages).toContain("customWidget_getComponentCatalog");
    expect(serializedToolMessages).not.toContain("customWidget_getSkill");
    expect(serializedToolMessages).not.toContain("customWidget_schema");
    const systemContent = nextProviderCall?.prompt.find((message) => message.role === "system")?.content;
    expect(systemContent).toEqual(expect.any(String));
    expect(systemContent).toContain("# Bundled file: references/schema.md");
    expect(systemContent).toContain('"title": "Homarr Custom JSX v2 widget"');
    expect(nextProviderCall?.tools?.map((entry) => entry.name)).toEqual(["customWidget_getComponentCatalog"]);
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
      experimental_repairToolCall: ({ toolCall }) => Promise.resolve(repairCustomWidgetToolInput(toolCall)),
      stopWhen: stepCountIs(2),
    });

    await expect(result.text).resolves.toBe("Repaired.");
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute.mock.calls[0]?.[0]).toEqual({});
    expect(model.doStreamCalls[1]?.prompt.some((message) => message.role === "tool")).toBe(true);
  });
});
