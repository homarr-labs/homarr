import type { LanguageModel, ToolSet } from "ai";
import { Output, stepCountIs, ToolLoopAgent } from "ai";
import { z } from "zod/v4";

import type { CustomWidgetAiEvaluationCase } from "./ai-evaluation-cases";

export const CUSTOM_WIDGET_MCP_AGENT_TOOLS = [
  "customWidget_get",
  "customWidget_getAuthoringPrompt",
  "customWidget_getSkill",
  "customWidget_schema",
  "customWidget_validate",
  "customWidget_previewCreate",
  "customWidget_previewQuery",
  "customWidget_previewAction",
  "customWidget_previewJournal",
  "customWidget_create",
  "customWidget_update",
  "customWidget_configurationRequestUser",
] as const;

export const customWidgetMcpAgentResultSchema = z.strictObject({
  status: z.enum(["pass", "needs-user-configuration", "fail"]),
  summary: z.string().min(1).max(1_000),
  definitionId: z.string().min(1).nullable(),
  previewUrl: z.url().nullable(),
  iterations: z.number().int().min(1).max(20),
  evidence: z
    .array(
      z.strictObject({
        tool: z.string().min(1).max(128),
        outcome: z.enum(["passed", "repaired", "pending", "failed"]),
        detail: z.string().min(1).max(500),
      }),
    )
    .min(1)
    .max(30),
  remainingIssues: z.array(z.string().min(1).max(500)).max(10),
});

export type CustomWidgetMcpAgentResult = z.infer<typeof customWidgetMcpAgentResultSchema>;

export interface CustomWidgetMcpToolExecution {
  tool: string;
  succeeded: boolean;
  requestId?: string;
}

interface AgentToolStep {
  toolCalls: ReadonlyArray<{ toolCallId: string; toolName: string; input: unknown }>;
  toolResults: ReadonlyArray<{ toolCallId: string; toolName: string; output: unknown }>;
}

const AGENT_INSTRUCTIONS = `You are the Homarr Custom Widget release evaluator. Use only the supplied Custom Widget MCP tools.

Read the live authoring prompt, skill, and schema before authoring. Never invent a tool, API route, validation result, preview result, or credential. Validate every revision. Create a preview, execute every load query that can run, simulate actions instead of causing side effects, and inspect the preview journal. Repair validation, request, runtime, and template problems and repeat the failed checks.

Never put plaintext credentials in a widget, response, summary, or tool argument. For an authenticated source without existing credentials, create a user configuration request with customWidget_configurationRequestUser and report needs-user-configuration. Do not call secret-writing tools.

Revise unsaved definitions in your working context; do not mutate a stored template while debugging. Persist only when the user prompt explicitly says persistence is allowed and all runnable checks pass. For edits, read the current definition first and update the same definition. Return the required structured result with evidence tied to successful tool calls. A pass must have no remaining issues.`;

export function selectCustomWidgetMcpTools(tools: Readonly<Record<string, unknown>>): ToolSet {
  return Object.fromEntries(
    CUSTOM_WIDGET_MCP_AGENT_TOOLS.flatMap((name) => (tools[name] ? [[name, tools[name]]] : [])),
  ) as ToolSet;
}

export function createCustomWidgetMcpAgent(args: { model: LanguageModel; tools: Readonly<Record<string, unknown>> }) {
  return new ToolLoopAgent({
    model: args.model,
    tools: selectCustomWidgetMcpTools(args.tools),
    instructions: AGENT_INSTRUCTIONS,
    stopWhen: stepCountIs(20),
    temperature: 0,
    output: Output.object({ schema: customWidgetMcpAgentResultSchema }),
  });
}

export function buildCustomWidgetMcpAgentPrompt(args: {
  testCase: CustomWidgetAiEvaluationCase;
  persist: boolean;
  definitionId?: string;
}) {
  const task = args.definitionId
    ? `Edit and debug Custom Widget definition ${args.definitionId}.`
    : "Create and debug a new Custom Widget.";
  return `${task}

User request:
${args.testCase.request}

Verified API notes:
${args.testCase.apiNotes}

API documentation:
${args.testCase.documentationUrl}

Persistence is ${args.persist ? "allowed after every runnable check passes" : "not allowed; stop after the validated preview"}.`;
}

export function getCustomWidgetMcpToolExecutions(steps: readonly AgentToolStep[]): CustomWidgetMcpToolExecution[] {
  const results = new Map(
    steps.flatMap(({ toolResults }) => toolResults).map((result) => [result.toolCallId, result] as const),
  );
  return steps.flatMap(({ toolCalls }) =>
    toolCalls.map((call) => {
      const requestId = asRecord(call.input)?.requestId;
      return {
        tool: call.toolName,
        succeeded: isSuccessfulMcpToolOutput(call.toolName, results.get(call.toolCallId)?.output),
        ...(typeof requestId === "string" ? { requestId } : {}),
      };
    }),
  );
}

export function getCustomWidgetMcpWorkflowIssues(args: {
  output: CustomWidgetMcpAgentResult;
  toolExecutions: readonly CustomWidgetMcpToolExecution[];
  persist: boolean;
  definitionId?: string;
  requiredQueryCount?: number;
  requiredActionCount?: number;
}) {
  const issues: string[] = [];
  const firstIndex = (tool: string) => args.toolExecutions.findIndex((entry) => entry.tool === tool);
  const firstSuccessfulIndex = (tool: string) =>
    args.toolExecutions.findIndex((entry) => entry.tool === tool && entry.succeeded);
  const lastSuccessfulIndex = (tool: string) =>
    args.toolExecutions.findLastIndex((entry) => entry.tool === tool && entry.succeeded);
  const hasTool = (tool: string) => firstIndex(tool) >= 0;
  const hasSuccessfulTool = (tool: string) => firstSuccessfulIndex(tool) >= 0;
  const required = [
    "customWidget_getAuthoringPrompt",
    "customWidget_getSkill",
    "customWidget_schema",
    "customWidget_validate",
  ];
  if (args.definitionId) required.unshift("customWidget_get");
  if (args.output.status === "pass") {
    required.push("customWidget_previewCreate", "customWidget_previewQuery", "customWidget_previewJournal");
    if ((args.requiredActionCount ?? 0) > 0) required.push("customWidget_previewAction");
    if (args.persist) required.push(args.definitionId ? "customWidget_update" : "customWidget_create");
  }
  if (args.output.status === "needs-user-configuration") {
    required.push("customWidget_configurationRequestUser");
    if (!args.persist && !args.definitionId) required.push("customWidget_previewCreate");
    if (args.persist && !args.definitionId) required.push("customWidget_create");
  }
  for (const tool of required) {
    if (!hasTool(tool)) issues.push(`Required tool was not used: ${tool}`);
    else if (!hasSuccessfulTool(tool)) issues.push(`Required tool did not complete successfully: ${tool}`);
  }

  const firstValidation = firstSuccessfulIndex("customWidget_validate");
  const finalValidation = lastSuccessfulIndex("customWidget_validate");
  for (const tool of ["customWidget_getAuthoringPrompt", "customWidget_getSkill", "customWidget_schema"]) {
    if (hasSuccessfulTool(tool) && firstValidation >= 0 && firstSuccessfulIndex(tool) > firstValidation) {
      issues.push(`${tool} must run before the first validation`);
    }
  }
  if (
    args.definitionId &&
    hasSuccessfulTool("customWidget_get") &&
    firstValidation >= 0 &&
    firstSuccessfulIndex("customWidget_get") > firstValidation
  ) {
    issues.push("customWidget_get must run before validating an edit");
  }
  const previewCreate = firstSuccessfulIndex("customWidget_previewCreate");
  const finalPreviewCreate = lastSuccessfulIndex("customWidget_previewCreate");
  if (finalValidation >= 0 && finalPreviewCreate >= 0 && finalValidation > finalPreviewCreate) {
    issues.push("The final validation must run before customWidget_previewCreate");
  }
  const previewChecks = [
    "customWidget_previewQuery",
    ...((args.requiredActionCount ?? 0) > 0 ? ["customWidget_previewAction"] : []),
    "customWidget_previewJournal",
  ];
  for (const tool of previewChecks) {
    if (hasSuccessfulTool(tool) && previewCreate >= 0 && firstSuccessfulIndex(tool) < previewCreate) {
      issues.push(`${tool} must run after customWidget_previewCreate`);
    }
  }
  if (args.output.status === "pass") {
    for (const [tool, requiredCount] of [
      ["customWidget_previewQuery", args.requiredQueryCount ?? 1],
      ["customWidget_previewAction", args.requiredActionCount ?? 0],
    ] as const) {
      const completed = args.toolExecutions.filter((entry) => entry.tool === tool && entry.succeeded);
      const distinctRequestIds = new Set(completed.flatMap(({ requestId }) => (requestId ? [requestId] : [])));
      const completedCount = distinctRequestIds.size > 0 ? distinctRequestIds.size : completed.length;
      if (completedCount < requiredCount) {
        issues.push(`${tool} completed ${completedCount} time(s); expected at least ${requiredCount}`);
      }
    }
    const finalJournal = lastSuccessfulIndex("customWidget_previewJournal");
    if (finalJournal >= 0) {
      for (const tool of ["customWidget_previewQuery", "customWidget_previewAction"]) {
        if (lastSuccessfulIndex(tool) > finalJournal) {
          issues.push("customWidget_previewJournal must run after all preview requests");
          break;
        }
      }
    }
  }

  const persistenceTool = args.definitionId ? "customWidget_update" : "customWidget_create";
  if (args.persist && args.output.status === "pass" && hasSuccessfulTool(persistenceTool)) {
    const lastPreviewCheck = Math.max(...previewChecks.map(lastSuccessfulIndex));
    if (lastSuccessfulIndex(persistenceTool) < lastPreviewCheck) {
      issues.push(`${persistenceTool} must run after all required preview checks`);
    }
  }
  if (!args.persist) {
    for (const tool of ["customWidget_create", "customWidget_update"]) {
      if (hasTool(tool)) issues.push(`${tool} was used even though persistence was not allowed`);
    }
  }

  const evidenceTools = new Set(args.output.evidence.map(({ tool }) => tool));
  for (const evidence of args.output.evidence) {
    const tool = evidence.tool;
    if (!hasTool(tool)) issues.push(`Structured evidence names a tool that was not used: ${tool}`);
    else if (evidence.outcome !== "failed" && !hasSuccessfulTool(tool)) {
      issues.push(`Structured evidence claims a successful outcome for a failed tool: ${tool}`);
    }
  }
  for (const tool of required) {
    if (hasSuccessfulTool(tool) && !evidenceTools.has(tool)) {
      issues.push(`Structured evidence is missing the required tool: ${tool}`);
    }
  }
  if (args.output.status === "pass" && args.output.remainingIssues.length > 0) {
    issues.push("A passing result cannot contain remaining issues");
  }
  if (args.output.status === "pass" && args.output.previewUrl === null) {
    issues.push("A passing result must include the tested preview URL");
  }
  if (args.persist && args.output.definitionId === null) {
    issues.push("A persisted result must include the definition ID");
  }
  if (args.output.status === "needs-user-configuration") {
    if (!hasSuccessfulTool("customWidget_configurationRequestUser")) {
      issues.push("User configuration status requires customWidget_configurationRequestUser");
    } else if (!evidenceTools.has("customWidget_configurationRequestUser")) {
      issues.push("Structured evidence is missing customWidget_configurationRequestUser");
    }
    const configurationRequest = lastSuccessfulIndex("customWidget_configurationRequestUser");
    const targetCreation = args.persist ? lastSuccessfulIndex(persistenceTool) : previewCreate;
    if (!args.definitionId && targetCreation >= 0 && configurationRequest < targetCreation) {
      issues.push("customWidget_configurationRequestUser must run after its definition or preview target exists");
    }
  }
  return issues;
}

function isSuccessfulMcpToolOutput(tool: string, output: unknown) {
  const record = asRecord(output);
  if (!record || record.isError === true) return false;
  const payload = decodeMcpTextPayload(record) ?? record;
  if (tool === "customWidget_validate") return asRecord(payload)?.valid === true;
  if (tool === "customWidget_previewCreate") return asRecord(payload)?.success === true;
  if (tool === "customWidget_previewQuery" || tool === "customWidget_previewAction") {
    return asRecord(payload)?.ok === true;
  }
  return output !== undefined;
}

function decodeMcpTextPayload(output: Record<string, unknown>) {
  if (!Array.isArray(output.content)) return undefined;
  const text = output.content
    .flatMap((part) => {
      const record = asRecord(part);
      return record?.type === "text" && typeof record.text === "string" ? [record.text] : [];
    })
    .join("");
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}
