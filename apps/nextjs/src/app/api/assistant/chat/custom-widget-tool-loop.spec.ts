import { describe, expect, it, vi } from "vitest";
import { jsonSchema, simulateReadableStream, stepCountIs, streamText, tool } from "ai";
import type { UIMessage } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { parse, stringify } from "superjson";

import { getCustomWidgetSkillEntrypoint } from "@homarr/custom-widgets/authoring-resources";
import {
  assistantIntegrationResearchSchema,
  getAssistantIntegrationResearchOutput,
  getCustomWidgetJsonSchema,
} from "@homarr/custom-widgets/core";
import { repairAssistantToolInput } from "./assistant-tool-input-repair";
import { shouldRequireCustomWidgetAuthoringTool } from "./custom-widget-authoring-context";

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
  it("carries official research and an exact saved-integration probe into lifecycle authoring", async () => {
    const prompt = "Make me a Mealie widget";
    const userMessages: UIMessage[] = [
      {
        id: "mealie-request",
        role: "user",
        parts: [{ type: "text", text: prompt }],
      },
    ];
    const calls = [
      {
        toolCallId: "enable-integration",
        toolName: "homarr_enableToolGroups",
        input: '{"groups":["integration"]}',
      },
      { toolCallId: "integration-kinds", toolName: "integration_getKinds", input: "{}" },
      { toolCallId: "saved-integrations", toolName: "integration_all", input: "{}" },
      {
        toolCallId: "record-research",
        toolName: "customWidget_recordIntegrationResearch",
        input: JSON.stringify({
          status: "ready",
          service: "Mealie",
          connection: {
            type: "savedIntegration",
            integrationId: "integration-mealie",
            integrationName: "Family meals",
            integrationKind: "mealie",
          },
          authentication: "Bearer token from the saved integration adapter",
          officialSources: [
            { url: "https://docs.mealie.io/documentation/getting-started/api-usage/", title: "Mealie API" },
          ],
          endpoints: [
            {
              purpose: "Read today's meal plan",
              method: "GET",
              path: "/api/households/mealplans/today",
              query: [],
              responseShape: "Object with meal plan entries",
            },
          ],
          limitations: [],
        }),
      },
      {
        toolCallId: "probe-mealie",
        toolName: "integration_request",
        input: JSON.stringify({
          integrationId: "integration-mealie",
          method: "GET",
          path: "/api/households/mealplans/today",
        }),
      },
      { toolCallId: "skill", toolName: "customWidget_getSkill", input: "{}" },
      {
        toolCallId: "preview",
        toolName: "customWidget_previewCreate",
        input: JSON.stringify({
          definition: {
            $schema: "homarr-custom-widget-v2",
            name: "Mealie Today",
            sources: {
              default: { type: "integration", integrationKind: "mealie", integrationId: "integration-mealie" },
            },
            requests: { today: { path: "/api/households/mealplans/today" } },
            options: {},
            templateLines: ["<Text>{data.today?.items?.length ?? 0}</Text>"],
          },
        }),
      },
    ] as const;
    const model = new MockLanguageModelV4({
      doStream: calls.map((call) => ({
        stream: simulateReadableStream({
          chunks: [
            { type: "stream-start" as const, warnings: [] },
            { type: "tool-call" as const, ...call },
            finish("tool-calls"),
          ],
          chunkDelayInMs: null,
        }),
      })),
    });
    const emptySchema = jsonSchema({ type: "object", properties: {}, additionalProperties: false });
    const activeTools = calls.map(({ toolName }) => toolName);
    const result = streamText({
      model,
      messages: [{ role: "user", content: prompt }],
      tools: {
        homarr_enableToolGroups: tool({
          inputSchema: jsonSchema({
            type: "object",
            properties: { groups: { type: "array", items: { type: "string" } } },
            required: ["groups"],
            additionalProperties: false,
          }),
          execute: () => ({ enabledGroups: ["integration"] }),
        }),
        integration_getKinds: tool({
          inputSchema: emptySchema,
          execute: () => [{ kind: "mealie", supportsHttpRequests: true }],
        }),
        integration_all: tool({
          inputSchema: emptySchema,
          execute: () => [
            {
              id: "integration-mealie",
              name: "Family meals",
              kind: "mealie",
              permissions: { hasFullAccess: true },
            },
          ],
        }),
        customWidget_recordIntegrationResearch: tool({
          inputSchema: assistantIntegrationResearchSchema,
          execute: (input) => getAssistantIntegrationResearchOutput(input),
        }),
        integration_request: tool({
          inputSchema: jsonSchema({
            type: "object",
            properties: {
              integrationId: { type: "string" },
              method: { type: "string" },
              path: { type: "string" },
            },
            required: ["integrationId", "method", "path"],
            additionalProperties: false,
          }),
          execute: () => ({ ok: true, status: 200, data: { items: [{ id: "meal-1", recipe: { name: "Soup" } }] } }),
        }),
        customWidget_getSkill: tool({
          inputSchema: emptySchema,
          execute: () => ({ skillMd: "Use saved integration sources." }),
        }),
        customWidget_previewCreate: tool({
          inputSchema: jsonSchema({
            type: "object",
            properties: { definition: { type: "object" } },
            required: ["definition"],
            additionalProperties: false,
          }),
          execute: () => ({ success: true, previewSession: { id: "preview-1" }, queries: [] }),
        }),
      },
      prepareStep: ({ steps }) => ({
        activeTools,
        ...(shouldRequireCustomWidgetAuthoringTool(activeTools, steps, [], userMessages)
          ? { toolChoice: "required" as const }
          : {}),
      }),
      stopWhen: stepCountIs(calls.length),
    });

    await result.consumeStream();

    expect(model.doStreamCalls).toHaveLength(calls.length);
    expect(model.doStreamCalls.every(({ toolChoice }) => toolChoice?.type === "required")).toBe(true);
    const probePrompt = JSON.stringify(model.doStreamCalls[4]?.prompt);
    expect(probePrompt).toContain("https://docs.mealie.io/documentation/getting-started/api-usage/");
    expect(probePrompt).toContain("/api/households/mealplans/today");
    expect(probePrompt).toContain("integration-mealie");
    const skillPrompt = JSON.stringify(model.doStreamCalls[5]?.prompt);
    expect(skillPrompt).toContain('"name":"Soup"');
    expect(calls.map(({ toolName }) => String(toolName))).not.toContain("customWidget_validateTemplate");
    expect(calls.at(-1)?.toolName).toBe("customWidget_previewCreate");
  });

  it("requires the next lifecycle tool after valid discovery instead of accepting an empty stop", async () => {
    const noInputSchema = jsonSchema({ type: "object", properties: {}, additionalProperties: false });
    const prompt = "Create a Homarr Custom JSX v2 dashboard widget and save it";
    const userMessages: UIMessage[] = [
      {
        id: "widget-request",
        role: "user",
        parts: [{ type: "text", text: prompt }],
      },
    ];
    const activeTools = ["customWidget_getComponents", "customWidget_previewCreate"] as const;
    const model = new MockLanguageModelV4({
      doStream: [
        {
          stream: simulateReadableStream({
            chunks: [
              { type: "stream-start" as const, warnings: [] },
              {
                type: "tool-call" as const,
                toolCallId: "components-call",
                toolName: "customWidget_getComponents",
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
              {
                type: "tool-call" as const,
                toolCallId: "preview-call",
                toolName: "customWidget_previewCreate",
                input: "{}",
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
      messages: [{ role: "user", content: prompt }],
      tools: {
        customWidget_getComponents: tool({
          inputSchema: noInputSchema,
          execute: () => ({ components: [] }),
        }),
        customWidget_previewCreate: tool({
          inputSchema: noInputSchema,
          execute: () => ({ success: true, previewSession: { id: "preview-1" }, queries: [] }),
        }),
      },
      prepareStep: ({ steps }) =>
        shouldRequireCustomWidgetAuthoringTool(activeTools, steps, [], userMessages)
          ? { activeTools, toolChoice: "required" }
          : { activeTools },
      stopWhen: stepCountIs(2),
    });

    await result.consumeStream();
    expect(model.doStreamCalls).toHaveLength(2);
    expect(model.doStreamCalls[1]?.toolChoice).toEqual({ type: "required" });
  });

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
