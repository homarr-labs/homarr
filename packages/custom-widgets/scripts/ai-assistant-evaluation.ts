import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { z } from "zod/v4";

import {
  getCustomWidgetComponent,
  getCustomWidgetComponentCatalog,
  getCustomWidgetExample,
  getCustomWidgetSharedProps,
  getCustomWidgetSkill,
} from "../src/core/authoring-resources";
import {
  customWidgetAuthoringDefinitionSchema,
  customWidgetDefinitionSchema,
  normalizeCustomWidgetAuthoringDefinition,
} from "../src/core/custom-jsx-schema";
import type { HomarrCustomWidgetV2 } from "../src/core/custom-jsx-schema";
import { CUSTOM_WIDGET_MCP_AUTHORING_PROMPT } from "../src/core/ai-prompt";
import { getCustomWidgetJsonSchema } from "../src/core/schema";
import type { CustomWidgetAiEvaluationCase } from "./ai-evaluation-cases";
import {
  DEFAULT_GENERATOR_MODEL,
  getAiProviderChatCompletionsUrl,
  getDeterministicEvaluationIssues,
  judgePasses,
  parseJudgeResult,
  requestCustomWidgetJudge,
} from "./ai-evaluation";
import type { CustomWidgetJudgeResult } from "./ai-evaluation";

const MAX_ASSISTANT_STEPS = 24;

interface OpenRouterToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

interface OpenRouterAssistantMessage {
  role: "assistant";
  content: string | null;
  tool_calls?: OpenRouterToolCall[];
}

type OpenRouterMessage =
  | { role: "system" | "user"; content: string }
  | OpenRouterAssistantMessage
  | { role: "tool"; tool_call_id: string; content: string };

interface OpenRouterResponse {
  choices?: Array<{ message?: OpenRouterAssistantMessage }>;
  error?: { message?: string };
}

interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

interface PreviewState {
  widget: HomarrCustomWidgetV2;
  testedQueries: Set<string>;
}

export const getRequiredAssistantEvaluationRequestParams = (request: HomarrCustomWidgetV2["requests"][string]) => {
  const serialized = JSON.stringify(request);
  return [
    ...new Set([
      ...Array.from(serialized.matchAll(/\{param:([^}]+)\}/gu), (match) => match[1]).filter(
        (name): name is string => name !== undefined,
      ),
      ...Array.from(serialized.matchAll(/"\$param":"([^"]+)"/gu), (match) => match[1]).filter(
        (name): name is string => name !== undefined,
      ),
    ]),
  ];
};

export const getAssistantEvaluationPreviewResponse = (
  testCase: CustomWidgetAiEvaluationCase,
  request: HomarrCustomWidgetV2["requests"][string],
) =>
  testCase.previewResponses?.find(({ pathIncludes }) => request.path.includes(pathIncludes))?.response ??
  testCase.sampleResponse;

export interface AssistantAttemptState {
  calledTools: string[];
  validatedDefinitions: Set<string>;
  previews: Map<string, PreviewState>;
  createdWidget: HomarrCustomWidgetV2 | null;
  finalText: string;
}

export interface CustomWidgetAssistantEvaluationResult {
  caseId: string;
  attempts: number;
  widget: HomarrCustomWidgetV2 | null;
  judge: CustomWidgetJudgeResult | null;
  outputDirectory: string;
  errors: string[];
  calledTools: string[];
}

const objectSchema = (properties: Record<string, unknown>, required: string[] = []) => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
});

export const customWidgetAssistantEvaluationToolDefinitions: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "customWidget_getSkill",
      description:
        "Load the complete installed Custom Widget skill, including SKILL.md and every bundled reference. Call this before authoring.",
      parameters: objectSchema({}),
    },
  },
  {
    type: "function",
    function: {
      name: "customWidget_schema",
      description: "Get the authoritative installed Homarr Custom Widget v2 JSON Schema.",
      parameters: objectSchema({}),
    },
  },
  {
    type: "function",
    function: {
      name: "customWidget_getComponentCatalog",
      description:
        "Get the compact catalog of supported JSX components, shared props, and example IDs before selecting component documentation.",
      parameters: objectSchema({}),
    },
  },
  {
    type: "function",
    function: {
      name: "customWidget_getComponent",
      description:
        "Get installed documentation and safety rules for one named Custom JSX component. Fetch only a selected component, one tool call at a time, after any optional example.",
      parameters: objectSchema({ name: { type: "string" } }, ["name"]),
    },
  },
  {
    type: "function",
    function: {
      name: "customWidget_getSharedProps",
      description: "Get installed documentation for only the named shared Custom JSX props.",
      parameters: objectSchema({ names: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 64 } }, [
        "names",
      ]),
    },
  },
  {
    type: "function",
    function: {
      name: "customWidget_getExample",
      description:
        "Optionally get one installed Custom JSX example by catalog ID before requesting any component documentation.",
      parameters: objectSchema({ name: { type: "string" } }, ["name"]),
    },
  },
  {
    type: "function",
    function: {
      name: "customWidget_validate",
      description:
        "Validate one complete widget without saving it. Supply the complete definition in widget and prefer templateLines for multiline JSX.",
      parameters: objectSchema({ widget: { type: "object", additionalProperties: true } }, ["widget"]),
    },
  },
  {
    type: "function",
    function: {
      name: "customWidget_previewCreate",
      description:
        "Create a preview for the exact complete definition after validation. Returns every query that must be tested.",
      parameters: objectSchema(
        {
          definition: { type: "object", additionalProperties: true },
          secrets: { type: "array", items: { type: "object" }, maxItems: 0 },
        },
        ["definition"],
      ),
    },
  },
  {
    type: "function",
    function: {
      name: "customWidget_previewQuery",
      description:
        "Execute one query from a preview against the evaluation fixture. Call once for every query returned by previewCreate.",
      parameters: objectSchema(
        {
          sessionId: { type: "string" },
          requestId: { type: "string" },
          params: { type: "object", additionalProperties: true },
        },
        ["sessionId", "requestId"],
      ),
    },
  },
  {
    type: "function",
    function: {
      name: "customWidget_createFromPreview",
      description: "Persist the exact final tested preview. Every query in that preview must have succeeded first.",
      parameters: objectSchema({ previewSessionId: { type: "string" } }, ["previewSessionId"]),
    },
  },
];

const getDefinitionSignature = (widget: HomarrCustomWidgetV2) => JSON.stringify(widget);

function parseDefinition(value: unknown) {
  const authoring = customWidgetAuthoringDefinitionSchema.safeParse(value);
  if (!authoring.success) {
    return {
      success: false as const,
      issues: authoring.error.issues.map((issue) => ({
        path: issue.path.map(String).join("."),
        code: issue.code,
        message: issue.message,
      })),
    };
  }
  try {
    return { success: true as const, widget: normalizeCustomWidgetAuthoringDefinition(authoring.data) };
  } catch (error) {
    if (!(error instanceof z.ZodError)) throw error;
    return {
      success: false as const,
      issues: error.issues.map((issue) => ({
        path: issue.path.map(String).join("."),
        code: issue.code,
        message: issue.message,
      })),
    };
  }
}

export function executeAssistantEvaluationTool(
  testCase: CustomWidgetAiEvaluationCase,
  state: AssistantAttemptState,
  name: string,
  input: Record<string, unknown>,
): unknown {
  const componentDocumentCount = state.calledTools.filter(
    (toolName) => toolName === "customWidget_getComponent",
  ).length;
  if (name === "customWidget_getExample") {
    if (componentDocumentCount > 0) {
      return {
        error:
          "An example must be loaded before component documentation. Keep the existing component-document budget and continue to customWidget_validate.",
      };
    }
    const example = typeof input.name === "string" ? getCustomWidgetExample(input.name) : null;
    if (!example) return { error: "Custom JSX example not found" };
    state.calledTools.push(name);
    const { template, ...widget } = example.widget;
    return { ...example, widget: { ...widget, templateLines: template.split("\n") } };
  }
  const componentDocumentLimit = state.calledTools.includes("customWidget_getExample") ? 4 : 8;
  if (name === "customWidget_getComponent" && componentDocumentCount >= componentDocumentLimit) {
    return {
      error:
        "The targeted component-document budget is exhausted. Continue with validation using the documentation already loaded.",
    };
  }
  state.calledTools.push(name);
  if (name === "customWidget_getSkill") return getCustomWidgetSkill();
  if (name === "customWidget_schema") return getCustomWidgetJsonSchema();
  if (name === "customWidget_getComponentCatalog") return getCustomWidgetComponentCatalog();
  if (name === "customWidget_getComponent") {
    const component = typeof input.name === "string" ? getCustomWidgetComponent(input.name) : null;
    return component ?? { error: "Custom JSX component not found" };
  }
  if (name === "customWidget_getSharedProps") {
    const names = Array.isArray(input.names)
      ? input.names.filter((entry): entry is string => typeof entry === "string")
      : [];
    return names.length > 0
      ? getCustomWidgetSharedProps(names)
      : { error: "At least one shared prop name is required" };
  }
  if (name === "customWidget_validate") {
    const parsed = parseDefinition(input.widget);
    if (!parsed.success) return { valid: false, issues: parsed.issues };
    state.validatedDefinitions.add(getDefinitionSignature(parsed.widget));
    return {
      valid: true,
      issues: [],
      summary: {
        name: parsed.widget.name,
        sourceIds: Object.keys(parsed.widget.sources),
        requestIds: Object.keys(parsed.widget.requests),
        optionIds: Object.keys(parsed.widget.options),
        templateLineCount: parsed.widget.template.split("\n").length,
      },
      nextStep: "Reuse this exact definition with customWidget_previewCreate and test every returned query.",
    };
  }
  if (name === "customWidget_previewCreate") {
    const parsed = parseDefinition(input.definition);
    if (!parsed.success) return { error: "Definition is invalid", issues: parsed.issues };
    if (!state.validatedDefinitions.has(getDefinitionSignature(parsed.widget))) {
      return { error: "Validate this exact complete definition before creating its preview." };
    }
    const id = `preview-${state.previews.size + 1}`;
    state.previews.set(id, { widget: parsed.widget, testedQueries: new Set() });
    return {
      success: true,
      previewSession: { id },
      previewPath: `/manage/custom-widgets/preview/${id}`,
      queries: Object.entries(parsed.widget.requests).flatMap(([requestId, request]) =>
        request.kind === "query"
          ? [
              {
                requestId,
                trigger: request.trigger,
                requiredParams: getRequiredAssistantEvaluationRequestParams(request),
                nextStep: `Call customWidget_previewQuery with sessionId '${id}' and requestId '${requestId}'.`,
              },
            ]
          : [],
      ),
    };
  }
  if (name === "customWidget_previewQuery") {
    const sessionId = typeof input.sessionId === "string" ? input.sessionId : "";
    const requestId = typeof input.requestId === "string" ? input.requestId : "";
    const preview = state.previews.get(sessionId);
    const request = preview?.widget.requests[requestId];
    if (!preview || request?.kind !== "query") return { error: "Preview query was not found" };
    const params =
      typeof input.params === "object" && input.params !== null && !Array.isArray(input.params)
        ? (input.params as Record<string, unknown>)
        : {};
    const missingParams = getRequiredAssistantEvaluationRequestParams(request).filter(
      (paramName) => !(paramName in params) || params[paramName] === null || params[paramName] === "",
    );
    if (missingParams.length > 0) {
      return { error: `Supply the required manual preview parameters: ${missingParams.join(", ")}` };
    }
    const response = getAssistantEvaluationPreviewResponse(testCase, request);
    if (response === undefined) return { error: `No deterministic preview response is configured for ${request.path}` };
    preview.testedQueries.add(requestId);
    return {
      ok: true,
      status: 200,
      data: response,
      request: { method: request.method, path: request.path },
    };
  }
  if (name === "customWidget_createFromPreview") {
    const sessionId = typeof input.previewSessionId === "string" ? input.previewSessionId : "";
    const preview = state.previews.get(sessionId);
    if (!preview) return { error: "Preview session not found" };
    const untested = Object.entries(preview.widget.requests).flatMap(([requestId, request]) =>
      request.kind === "query" && !preview.testedQueries.has(requestId) ? [requestId] : [],
    );
    if (untested.length > 0) return { error: `Test every preview query before creation: ${untested.join(", ")}` };
    const completedPreviewCycles = [...state.previews.values()].filter((candidate) =>
      Object.entries(candidate.widget.requests).every(
        ([requestId, request]) => request.kind !== "query" || candidate.testedQueries.has(requestId),
      ),
    ).length;
    const minimumPreviewCycles = testCase.minimumPreviewCycles ?? 1;
    if (completedPreviewCycles < minimumPreviewCycles) {
      return {
        error: `Complete at least ${minimumPreviewCycles} validated preview-and-query cycles before creation; ${completedPreviewCycles} completed. Revise the candidate meaningfully, validate it, create a fresh preview, and test every query again.`,
      };
    }
    state.createdWidget = customWidgetDefinitionSchema.parse(preview.widget);
    return {
      id: `created-${testCase.id}`,
      managementPath: `/manage/custom-widgets/edit/created-${testCase.id}`,
      nextAction: { type: "place-custom-widget", widgetKind: "customApi" },
    };
  }
  return { error: `Unknown evaluation tool '${name}'` };
}

export function getAssistantEvaluationLifecycleIssues(state: AssistantAttemptState) {
  const required = [
    "customWidget_getSkill",
    "customWidget_schema",
    "customWidget_getComponentCatalog",
    "customWidget_validate",
    "customWidget_previewCreate",
    "customWidget_previewQuery",
    "customWidget_createFromPreview",
  ];
  const issues = required.flatMap((name) =>
    state.calledTools.includes(name) ? [] : [`The assistant never called ${name}.`],
  );
  const componentDocumentCount = state.calledTools.filter((name) => name === "customWidget_getComponent").length;
  if (componentDocumentCount > 8) {
    issues.push(
      `The assistant fetched ${componentDocumentCount} component documents before creation; use at most eight targeted component documents.`,
    );
  }
  return issues;
}

export function createAssistantEvaluationState(): AssistantAttemptState {
  return {
    calledTools: [],
    validatedDefinitions: new Set(),
    previews: new Map(),
    createdWidget: null,
    finalText: "",
  };
}

function buildAssistantPrompt(testCase: CustomWidgetAiEvaluationCase, feedback: readonly string[]) {
  const sections = [
    testCase.request,
    `Verified API documentation: ${testCase.documentationUrl}`,
    `Verified API notes:\n${testCase.apiNotes}`,
  ];
  if (testCase.sampleResponse !== undefined) {
    sections.push(`Representative preview response:\n${JSON.stringify(testCase.sampleResponse, null, 2)}`);
  }
  if (testCase.previewResponses?.length) {
    sections.push(
      `Representative preview responses:\n${testCase.previewResponses
        .map(({ pathIncludes, response }) => `${pathIncludes}:\n${JSON.stringify(response, null, 2)}`)
        .join("\n\n")}`,
    );
  }
  if (feedback.length > 0) {
    sections.push(
      `A previous independent review found these problems. Correct them in a fresh complete lifecycle:\n${feedback.join("\n")}`,
    );
  }
  sections.push(
    "Use the available Custom Widget tools and continue automatically until the exact tested preview is created. Do not merely return JSON or instructions.",
  );
  return sections.join("\n\n");
}

async function callAssistantStep(args: {
  apiKey: string;
  baseUrl?: string;
  model: string;
  messages: OpenRouterMessage[];
  tools: ToolDefinition[];
  toolChoice?: string;
}): Promise<OpenRouterAssistantMessage> {
  const response = await fetch(getAiProviderChatCompletionsUrl(args.baseUrl), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://homarr.dev",
      "X-Title": "Homarr Custom Widget Assistant Evaluation",
    },
    body: JSON.stringify({
      model: args.model,
      messages: args.messages,
      tools: args.tools,
      tool_choice: args.toolChoice ? { type: "function", function: { name: args.toolChoice } } : "auto",
      temperature: 0.1,
      max_tokens: 12_000,
      reasoning: { effort: "low", exclude: true },
    }),
    signal: AbortSignal.timeout(180_000),
  });
  const payload = (await response.json()) as OpenRouterResponse;
  if (!response.ok) {
    throw new Error(`AI provider request failed (${response.status}): ${payload.error?.message ?? "Unknown error"}`);
  }
  const message = payload.choices?.[0]?.message;
  if (!message) throw new Error("AI provider returned no assistant message");
  return message;
}

export const getAssistantEvaluationRecoveryToolName = (state: AssistantAttemptState, minimumPreviewCycles = 1) => {
  for (const requiredTool of ["customWidget_getSkill", "customWidget_schema", "customWidget_getComponentCatalog"]) {
    if (!state.calledTools.includes(requiredTool)) return requiredTool;
  }
  if (state.validatedDefinitions.size === 0) return "customWidget_validate";
  const latestPreview = [...state.previews.entries()].at(-1);
  if (!latestPreview) return "customWidget_previewCreate";
  const [previewId, preview] = latestPreview;
  const untestedQuery = Object.entries(preview.widget.requests).find(
    ([requestId, request]) => request.kind === "query" && !preview.testedQueries.has(requestId),
  );
  if (untestedQuery) return "customWidget_previewQuery";
  const completedPreviewCycles = [...state.previews.values()].filter((candidate) =>
    Object.entries(candidate.widget.requests).every(
      ([requestId, request]) => request.kind !== "query" || candidate.testedQueries.has(requestId),
    ),
  ).length;
  if (completedPreviewCycles < minimumPreviewCycles) return "customWidget_validate";
  if (previewId && !state.createdWidget) return "customWidget_createFromPreview";
  return undefined;
};

async function callAssistantStepWithRecovery(args: {
  apiKey: string;
  baseUrl?: string;
  model: string;
  messages: OpenRouterMessage[];
  tools: ToolDefinition[];
  state: AssistantAttemptState;
  testCase: CustomWidgetAiEvaluationCase;
}) {
  try {
    const message = await callAssistantStep(args);
    if ((message.tool_calls?.length ?? 0) > 0 || (args.state.createdWidget && (message.content ?? "").trim())) {
      return message;
    }
  } catch (error) {
    if (!(error instanceof Error) || (error.name !== "TimeoutError" && error.name !== "AbortError")) throw error;
  }

  const toolChoice = getAssistantEvaluationRecoveryToolName(args.state, args.testCase.minimumPreviewCycles ?? 1);
  if (!toolChoice || !args.tools.some(({ function: definition }) => definition.name === toolChoice)) {
    throw new Error(
      "The model returned a prose-only, empty, or timed-out step before completing the Custom Widget lifecycle.",
    );
  }
  process.stdout.write(`    recovering with required tool: ${toolChoice}\n`);
  const recovered = await callAssistantStep({ ...args, toolChoice });
  if ((!recovered.tool_calls || recovered.tool_calls.length === 0) && !(recovered.content ?? "").trim()) {
    throw new Error("The model returned an empty assistant step before completing the Custom Widget lifecycle.");
  }
  return recovered;
}

async function runAssistantAttempt(args: {
  testCase: CustomWidgetAiEvaluationCase;
  apiKey: string;
  baseUrl?: string;
  model: string;
  feedback: readonly string[];
}) {
  const state = createAssistantEvaluationState();
  const messages: OpenRouterMessage[] = [
    {
      role: "system",
      content: `${CUSTOM_WIDGET_MCP_AUTHORING_PROMPT}\n\nThis is a tool-driven evaluation. You must begin by loading the complete installed skill, live schema, and component catalog through their tools. Do not stop until customWidget_createFromPreview succeeds.`,
    },
    { role: "user", content: buildAssistantPrompt(args.testCase, args.feedback) },
  ];

  for (let step = 0; step < MAX_ASSISTANT_STEPS; step += 1) {
    const componentDocumentCount = state.calledTools.filter((name) => name === "customWidget_getComponent").length;
    const componentDocumentLimit = state.calledTools.includes("customWidget_getExample") ? 4 : 8;
    const tools =
      componentDocumentCount >= componentDocumentLimit
        ? customWidgetAssistantEvaluationToolDefinitions.filter(
            ({ function: definition }) => definition.name !== "customWidget_getComponent",
          )
        : customWidgetAssistantEvaluationToolDefinitions;
    const message = await callAssistantStepWithRecovery({
      apiKey: args.apiKey,
      baseUrl: args.baseUrl,
      model: args.model,
      messages,
      tools,
      state,
      testCase: args.testCase,
    });
    if ((!message.tool_calls || message.tool_calls.length === 0) && !(message.content ?? "").trim()) {
      throw new Error("The model returned an empty assistant step before completing the Custom Widget lifecycle.");
    }
    messages.push(message);
    if (!message.tool_calls || message.tool_calls.length === 0) {
      state.finalText = message.content ?? "";
      break;
    }
    for (const toolCall of message.tool_calls) {
      process.stdout.write(`    tool: ${toolCall.function.name}\n`);
      let output: unknown;
      try {
        const parsed: unknown = JSON.parse(toolCall.function.arguments);
        let input: Record<string, unknown> = {};
        if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
          input = Object.fromEntries(Object.entries(parsed));
        }
        output = executeAssistantEvaluationTool(args.testCase, state, toolCall.function.name, input);
      } catch (error) {
        output = { error: error instanceof Error ? error.message : "Tool input was not valid JSON" };
      }
      messages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(output) });
    }
    if (state.createdWidget) {
      break;
    }
  }
  return { state, messages };
}

export async function evaluateCustomWidgetAssistantCase(args: {
  testCase: CustomWidgetAiEvaluationCase;
  apiKey: string;
  baseUrl?: string;
  outputRoot: string;
  maxLoops: number;
  generatorModel?: string;
  judgeModel?: string;
}): Promise<CustomWidgetAssistantEvaluationResult> {
  const caseDirectory = path.join(args.outputRoot, `assistant-${args.testCase.id}`);
  await mkdir(caseDirectory, { recursive: true });
  const errors: string[] = [];
  const feedback: string[] = [];
  let bestWidget: HomarrCustomWidgetV2 | null = null;
  let bestJudge: CustomWidgetJudgeResult | null = null;
  let bestCalledTools: string[] = [];

  for (let attempt = 1; attempt <= args.maxLoops; attempt += 1) {
    process.stdout.write(`  assistant attempt ${attempt}/${args.maxLoops}\n`);
    let run: Awaited<ReturnType<typeof runAssistantAttempt>>;
    try {
      run = await runAssistantAttempt({
        testCase: args.testCase,
        apiKey: args.apiKey,
        baseUrl: args.baseUrl,
        model: args.generatorModel ?? DEFAULT_GENERATOR_MODEL,
        feedback,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown assistant evaluation error";
      errors.push(`Attempt ${attempt}: ${message}`);
      feedback.splice(0, feedback.length, message);
      continue;
    }
    await writeFile(path.join(caseDirectory, `trace-${attempt}.json`), JSON.stringify(run.messages, null, 2), "utf8");
    const lifecycleIssues = getAssistantEvaluationLifecycleIssues(run.state);
    if (!run.state.createdWidget || lifecycleIssues.length > 0) {
      const issues = [
        ...lifecycleIssues,
        ...(run.state.createdWidget ? [] : ["The assistant did not create the final tested preview."]),
      ];
      errors.push(`Attempt ${attempt}: lifecycle failed — ${issues.join(" ")}`);
      feedback.splice(0, feedback.length, ...issues);
      continue;
    }
    const deterministicIssues = getDeterministicEvaluationIssues(args.testCase, run.state.createdWidget);
    if (deterministicIssues.length > 0) {
      const issues = deterministicIssues.map(({ message }) => message);
      errors.push(`Attempt ${attempt}: deterministic checks failed — ${issues.join("; ")}`);
      feedback.splice(0, feedback.length, ...issues);
      continue;
    }

    await writeFile(
      path.join(caseDirectory, `widget-${attempt}.json`),
      JSON.stringify(run.state.createdWidget, null, 2),
      "utf8",
    );
    let judgeRaw: string;
    try {
      judgeRaw = await requestCustomWidgetJudge({
        testCase: args.testCase,
        widget: run.state.createdWidget,
        apiKey: args.apiKey,
        baseUrl: args.baseUrl,
        judgeModel: args.judgeModel,
      });
      await writeFile(path.join(caseDirectory, `judge-${attempt}.json`), judgeRaw, "utf8");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown judge error";
      errors.push(`Attempt ${attempt}: judge request failed — ${message}`);
      feedback.splice(0, feedback.length, "Return a complete polished widget for another independent review.");
      continue;
    }
    let judgeResult: CustomWidgetJudgeResult;
    try {
      judgeResult = parseJudgeResult(judgeRaw);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown judge parse error";
      errors.push(`Attempt ${attempt}: judge response invalid — ${message}`);
      feedback.splice(0, feedback.length, "Return a complete polished widget for another independent review.");
      continue;
    }
    if (!bestJudge || judgeResult.total > bestJudge.total) {
      bestWidget = run.state.createdWidget;
      bestJudge = judgeResult;
      bestCalledTools = run.state.calledTools;
    }
    if (judgePasses(judgeResult)) {
      return {
        caseId: args.testCase.id,
        attempts: attempt,
        widget: run.state.createdWidget,
        judge: judgeResult,
        outputDirectory: caseDirectory,
        errors,
        calledTools: run.state.calledTools,
      };
    }
    const issues = judgeResult.highestImpactFixes.length ? judgeResult.highestImpactFixes : judgeResult.problems;
    errors.push(`Attempt ${attempt}: judge ${judgeResult.total}/100 — ${issues.join("; ")}`);
    feedback.splice(0, feedback.length, ...issues);
  }

  return {
    caseId: args.testCase.id,
    attempts: args.maxLoops,
    widget: bestWidget,
    judge: bestJudge,
    outputDirectory: caseDirectory,
    errors,
    calledTools: bestCalledTools,
  };
}
