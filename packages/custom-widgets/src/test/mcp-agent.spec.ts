import type { LanguageModelV3GenerateResult } from "@ai-sdk/provider";
import { tool } from "ai";
import { MockLanguageModelV3 } from "ai/test";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod/v4";

import {
  createCustomWidgetMcpAgent,
  getCustomWidgetMcpToolExecutions,
  getCustomWidgetMcpWorkflowIssues,
} from "../../scripts/mcp-agent";

const usage = {
  inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 10, text: 10, reasoning: undefined },
};

const toolCall = (
  toolName: string,
  index: number,
  input: Record<string, unknown> = {},
): LanguageModelV3GenerateResult => ({
  content: [{ type: "tool-call", toolCallId: `call-${index}`, toolName, input: JSON.stringify(input) }],
  finishReason: { unified: "tool-calls", raw: undefined },
  usage,
  warnings: [],
});

const finalResult = (value: unknown): LanguageModelV3GenerateResult => ({
  content: [{ type: "text", text: JSON.stringify(value) }],
  finishReason: { unified: "stop", raw: undefined },
  usage,
  warnings: [],
});

const successfulExecutions = (tools: readonly string[]) =>
  tools.map((toolName) => ({ tool: toolName, succeeded: true }));
const mcpOutput = (value: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(value) }] });

describe("Custom Widget MCP agent", () => {
  it("runs a repair, preview, and persistence workflow before structured success", async () => {
    const calls: string[] = [];
    let validationCount = 0;
    const makeTool = (name: string) =>
      tool({
        description: name,
        inputSchema: z.object({ requestId: z.string().optional() }),
        execute: vi.fn(() => {
          calls.push(name);
          if (name === "customWidget_validate") {
            validationCount += 1;
            return mcpOutput({ valid: validationCount > 1 });
          }
          if (name === "customWidget_previewCreate") return mcpOutput({ success: true });
          if (name === "customWidget_previewQuery" || name === "customWidget_previewAction") {
            return mcpOutput({ ok: true });
          }
          return mcpOutput({});
        }),
      });
    const sequence = [
      "customWidget_getAuthoringPrompt",
      "customWidget_getSkill",
      "customWidget_schema",
      "customWidget_validate",
      "customWidget_validate",
      "customWidget_previewCreate",
      "customWidget_previewQuery",
      "customWidget_previewQuery",
      "customWidget_previewAction",
      "customWidget_previewJournal",
      "customWidget_create",
    ];
    const output = {
      status: "pass" as const,
      summary: "The repaired widget passed validation and preview checks and was persisted.",
      definitionId: "widget-1",
      previewUrl: "http://localhost:3000/manage/custom-widgets/preview/session-1",
      iterations: 2,
      evidence: [...new Set(sequence)].map((name) => ({
        tool: name,
        outcome: name === "customWidget_validate" ? ("repaired" as const) : ("passed" as const),
        detail: `${name} completed.`,
      })),
      remainingIssues: [],
    };
    let queryIndex = 0;
    const responses = [
      ...sequence.map((toolName, index) => {
        if (toolName === "customWidget_previewQuery") {
          queryIndex += 1;
          return toolCall(toolName, index, { requestId: `query-${queryIndex}` });
        }
        if (toolName === "customWidget_previewAction") return toolCall(toolName, index, { requestId: "action-1" });
        return toolCall(toolName, index);
      }),
      finalResult(output),
    ];
    let responseIndex = 0;
    const model = new MockLanguageModelV3({
      doGenerate: async () => responses[responseIndex++] ?? finalResult(output),
    });
    const tools = Object.fromEntries(sequence.map((name) => [name, makeTool(name)]));

    const result = await createCustomWidgetMcpAgent({ model, tools }).generate({ prompt: "Build a widget" });
    expect(result.output).toEqual(output);
    expect(calls).toEqual(sequence);
    expect(model.doGenerateCalls.at(-1)?.responseFormat).toMatchObject({ type: "json" });
    const toolExecutions = getCustomWidgetMcpToolExecutions(result.steps);
    expect(toolExecutions.filter(({ tool: toolName }) => toolName === "customWidget_validate")).toEqual([
      { tool: "customWidget_validate", succeeded: false },
      { tool: "customWidget_validate", succeeded: true },
    ]);
    expect(
      toolExecutions
        .filter(({ tool: toolName }) => toolName === "customWidget_previewQuery")
        .map(({ requestId }) => requestId),
    ).toEqual(["query-1", "query-2"]);
    expect(
      getCustomWidgetMcpWorkflowIssues({
        output: result.output,
        toolExecutions,
        persist: true,
        requiredQueryCount: 2,
        requiredActionCount: 1,
      }),
    ).toEqual([]);
  });

  it("uses the current definition and updates it in the edit workflow", async () => {
    const calls: string[] = [];
    const sequence = [
      "customWidget_getAuthoringPrompt",
      "customWidget_getSkill",
      "customWidget_schema",
      "customWidget_get",
      "customWidget_validate",
      "customWidget_previewCreate",
      "customWidget_previewQuery",
      "customWidget_previewJournal",
      "customWidget_update",
    ];
    const output = {
      status: "pass" as const,
      summary: "The existing widget passed its edited preview and was updated.",
      definitionId: "widget-1",
      previewUrl: "http://localhost:3000/manage/custom-widgets/preview/session-2",
      iterations: 1,
      evidence: sequence.map((name) => ({ tool: name, outcome: "passed" as const, detail: `${name} completed.` })),
      remainingIssues: [],
    };
    const responses = [
      ...sequence.map((toolName, index) =>
        toolCall(toolName, index, toolName === "customWidget_previewQuery" ? { requestId: "query-1" } : {}),
      ),
      finalResult(output),
    ];
    let responseIndex = 0;
    const model = new MockLanguageModelV3({
      doGenerate: async () => responses[responseIndex++] ?? finalResult(output),
    });
    const tools = Object.fromEntries(
      sequence.map((name) => [
        name,
        tool({
          description: name,
          inputSchema: z.object({ requestId: z.string().optional() }),
          execute: () => {
            calls.push(name);
            if (name === "customWidget_validate") return mcpOutput({ valid: true });
            if (name === "customWidget_previewCreate") return mcpOutput({ success: true });
            if (name === "customWidget_previewQuery") return mcpOutput({ ok: true });
            return mcpOutput({});
          },
        }),
      ]),
    );

    const result = await createCustomWidgetMcpAgent({ model, tools }).generate({ prompt: "Edit widget-1" });
    expect(result.output).toEqual(output);
    expect(
      getCustomWidgetMcpWorkflowIssues({
        output: result.output,
        toolExecutions: getCustomWidgetMcpToolExecutions(result.steps),
        persist: true,
        definitionId: "widget-1",
      }),
    ).toEqual([]);
  });

  it("rejects a passing summary that skipped real MCP checks", () => {
    expect(
      getCustomWidgetMcpWorkflowIssues({
        output: {
          status: "pass",
          summary: "Looks good.",
          definitionId: null,
          previewUrl: null,
          iterations: 1,
          evidence: [{ tool: "customWidget_validate", outcome: "passed", detail: "Valid." }],
          remainingIssues: ["Preview was not tested."],
        },
        toolExecutions: successfulExecutions(["customWidget_validate"]),
        persist: false,
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining("customWidget_previewCreate"),
        "A passing result cannot contain remaining issues",
      ]),
    );
  });

  it("rejects fabricated evidence and persistence before the final preview checks", () => {
    const toolsUsed = [
      "customWidget_getAuthoringPrompt",
      "customWidget_getSkill",
      "customWidget_schema",
      "customWidget_validate",
      "customWidget_create",
      "customWidget_previewCreate",
      "customWidget_previewQuery",
      "customWidget_previewJournal",
    ];

    expect(
      getCustomWidgetMcpWorkflowIssues({
        output: {
          status: "pass",
          summary: "The widget was tested.",
          definitionId: "widget-1",
          previewUrl: "http://localhost:3000/manage/custom-widgets/preview/session-3",
          iterations: 1,
          evidence: [
            ...toolsUsed.map((name) => ({ tool: name, outcome: "passed" as const, detail: `${name} completed.` })),
            { tool: "customWidget_previewAction", outcome: "passed", detail: "The model claimed an action passed." },
          ],
          remainingIssues: [],
        },
        toolExecutions: successfulExecutions(toolsUsed),
        persist: true,
      }),
    ).toEqual(
      expect.arrayContaining([
        "customWidget_create must run after all required preview checks",
        "Structured evidence names a tool that was not used: customWidget_previewAction",
      ]),
    );
  });

  it("accepts a repaired preview followed by final validation and a fresh preview", () => {
    const toolsUsed = [
      "customWidget_getAuthoringPrompt",
      "customWidget_getSkill",
      "customWidget_schema",
      "customWidget_validate",
      "customWidget_previewCreate",
      "customWidget_validate",
      "customWidget_previewCreate",
      "customWidget_previewQuery",
      "customWidget_previewJournal",
    ];

    expect(
      getCustomWidgetMcpWorkflowIssues({
        output: {
          status: "pass",
          summary: "The repaired widget passed a fresh preview.",
          definitionId: null,
          previewUrl: "http://localhost:3000/manage/custom-widgets/preview/session-repaired",
          iterations: 2,
          evidence: [...new Set(toolsUsed)].map((name) => ({
            tool: name,
            outcome: name === "customWidget_validate" ? ("repaired" as const) : ("passed" as const),
            detail: `${name} completed.`,
          })),
          remainingIssues: [],
        },
        toolExecutions: successfulExecutions(toolsUsed),
        persist: false,
      }),
    ).toEqual([]);
  });

  it("does not report journal ordering when the journal was never run", () => {
    const toolsUsed = [
      "customWidget_getAuthoringPrompt",
      "customWidget_getSkill",
      "customWidget_schema",
      "customWidget_validate",
      "customWidget_previewCreate",
      "customWidget_previewQuery",
    ];

    const issues = getCustomWidgetMcpWorkflowIssues({
      output: {
        status: "pass",
        summary: "The agent incorrectly skipped the journal.",
        definitionId: null,
        previewUrl: "http://localhost:3000/manage/custom-widgets/preview/session-no-journal",
        iterations: 1,
        evidence: toolsUsed.map((name) => ({
          tool: name,
          outcome: "passed" as const,
          detail: `${name} completed.`,
        })),
        remainingIssues: [],
      },
      toolExecutions: successfulExecutions(toolsUsed),
      persist: false,
    });

    expect(issues).toContain("Required tool was not used: customWidget_previewJournal");
    expect(issues).not.toContain("customWidget_previewJournal must run after all preview requests");
  });

  it("allows secure preview configuration to pause before authenticated requests can run", () => {
    const toolsUsed = [
      "customWidget_getAuthoringPrompt",
      "customWidget_getSkill",
      "customWidget_schema",
      "customWidget_validate",
      "customWidget_previewCreate",
      "customWidget_configurationRequestUser",
    ];

    expect(
      getCustomWidgetMcpWorkflowIssues({
        output: {
          status: "needs-user-configuration",
          summary: "The definition is valid and the authenticated preview is waiting for secure user input.",
          definitionId: null,
          previewUrl: "http://localhost:3000/manage/custom-widgets/preview/session-4",
          iterations: 1,
          evidence: [...new Set(toolsUsed)].map((name) => ({
            tool: name,
            outcome: "passed" as const,
            detail: `${name} completed.`,
          })),
          remainingIssues: [],
        },
        toolExecutions: successfulExecutions(toolsUsed),
        persist: false,
      }),
    ).toEqual([]);
  });

  it("never exposes a credential-writing tool to the model", async () => {
    const forbiddenTool = tool({
      description: "Write a plaintext secret",
      inputSchema: z.object({ secret: z.string() }),
      execute: vi.fn(),
    });
    const safeTool = tool({
      description: "Request secure user configuration",
      inputSchema: z.object({}),
      execute: vi.fn(),
    });
    const model = new MockLanguageModelV3({
      doGenerate: async () =>
        finalResult({
          status: "fail",
          summary: "No source values were supplied.",
          definitionId: null,
          previewUrl: null,
          iterations: 1,
          evidence: [
            { tool: "customWidget_configurationRequestUser", outcome: "pending", detail: "User input needed." },
          ],
          remainingIssues: ["Source configuration is required."],
        }),
    });

    await createCustomWidgetMcpAgent({
      model,
      tools: {
        customWidget_sourceConfigure: forbiddenTool,
        customWidget_secretSet: forbiddenTool,
        customWidget_configurationRequestUser: safeTool,
      },
    }).generate({ prompt: "Create an authenticated widget" });

    const exposedTools = model.doGenerateCalls[0]?.tools?.map(({ name }) => name);
    expect(exposedTools).toContain("customWidget_configurationRequestUser");
    expect(exposedTools).not.toContain("customWidget_sourceConfigure");
    expect(exposedTools).not.toContain("customWidget_secretSet");
  });
});
