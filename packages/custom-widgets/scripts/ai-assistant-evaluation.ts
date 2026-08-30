import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { z } from "zod/v4";

import {
  findCustomWidgetComponents,
  getCustomWidgetContextRequestKey,
  getCustomWidgetSkillEntrypoint,
  getCustomWidgetSkillReference,
  getCustomWidgetComponent,
  getCustomWidgetComponentCatalog,
  getCustomWidgetComponents,
  getCustomWidgetExample,
  getCustomWidgetSharedProps,
} from "../src/core/authoring-resources";
import {
  customWidgetAuthoringDefinitionSchema,
  customWidgetDefinitionSchema,
  normalizeCustomJsxAuthoringTemplate,
  normalizeCustomWidgetAuthoringDefinition,
} from "../src/core/custom-jsx-schema";
import { normalizeCustomWidgetLifecycleToolInput } from "../src/core/assistant-tool-input";
import { getCustomWidgetPhaseToolNames } from "../src/core/assistant-authoring-phase";
import {
  appendActiveCustomWidgetToolInstruction,
  selectSequentialCustomWidgetToolCalls,
} from "../src/core/assistant-tool-step";
import type { HomarrCustomWidgetV2 } from "../src/core/custom-jsx-schema";
import { CUSTOM_WIDGET_ASSISTANT_POLICY, CUSTOM_WIDGET_TOOL_STAGING_INSTRUCTION } from "../src/core/ai-prompt";
import { getCustomWidgetJsonSchema } from "../src/core/schema";
import { addCustomJsxDiagnosticSourceExcerpts, validateCustomJsxTemplate } from "../src/jsx";
import type { CustomWidgetAiEvaluationCase } from "./ai-evaluation-cases";
import {
  DEFAULT_GENERATOR_MODEL,
  getAiProviderChatCompletionsUrl,
  getDeterministicEvaluationMatches,
  getDeterministicEvaluationSuiteIssues,
  judgePasses,
  parseJudgeResult,
  requestCustomWidgetJudge,
} from "./ai-evaluation";
import type { CustomWidgetJudgeResult } from "./ai-evaluation";

const MAX_ASSISTANT_STEPS = 40;
const defaultAssistantEvaluationMaxOutputTokens = 32_768;
export const assistantEvaluationToolRequestOptions = {
  tool_choice: "auto",
  parallel_tool_calls: false,
} as const;
export const assistantEvaluationReasoningOptions = { effort: "medium", exclude: true } as const;

export function getAssistantEvaluationMaxOutputTokens(configuredValue: string | undefined) {
  if (configuredValue === undefined) return defaultAssistantEvaluationMaxOutputTokens;
  const configured = Number(configuredValue);
  if (!Number.isInteger(configured) || configured <= 0) return defaultAssistantEvaluationMaxOutputTokens;
  return Math.min(defaultAssistantEvaluationMaxOutputTokens, Math.max(4_096, configured));
}

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

const assistantEvaluationContextMaxCharacters = 48_000;
const reloadableEvaluationToolNames = new Set([
  "customWidget_schema",
  "customWidget_getComponentCatalog",
  "customWidget_findComponents",
  "customWidget_getComponent",
  "customWidget_getComponents",
  "customWidget_getSharedProps",
  "customWidget_getExample",
]);
const validationEvaluationToolNames = new Set(["customWidget_validateTemplate"]);
const previewEvaluationToolNames = new Set([
  "customWidget_previewCreate",
  "customWidget_previewReviseTemplate",
  "customWidget_previewQuery",
  "customWidget_previewAction",
  "customWidget_previewJournal",
]);

const getEvaluationToolRetentionSteps = (toolName: string) => {
  if (reloadableEvaluationToolNames.has(toolName)) return 2;
  if (validationEvaluationToolNames.has(toolName)) return 1;
  if (previewEvaluationToolNames.has(toolName)) return 3;
  return null;
};

export function compactAssistantEvaluationMessages(
  messages: OpenRouterMessage[],
  maxCharacters = assistantEvaluationContextMaxCharacters,
) {
  if (JSON.stringify(messages).length <= maxCharacters) return messages;
  const assistantMessageIndexes = messages.flatMap((message, index) =>
    message.role === "assistant" && message.tool_calls?.length ? [index] : [],
  );
  const assistantStepByMessageIndex = new Map(
    assistantMessageIndexes.map((messageIndex, step) => [messageIndex, step]),
  );
  const lastAssistantStep = assistantMessageIndexes.length - 1;
  const removedToolCallIds = new Set<string>();
  const compacted: OpenRouterMessage[] = [];
  for (const [messageIndex, message] of messages.entries()) {
    if (message.role === "tool") {
      if (!removedToolCallIds.has(message.tool_call_id)) compacted.push(message);
      continue;
    }
    if (message.role !== "assistant" || !message.tool_calls?.length) {
      compacted.push(message);
      continue;
    }
    const assistantStep = assistantStepByMessageIndex.get(messageIndex) ?? lastAssistantStep;
    const toolCalls = message.tool_calls.filter((toolCall) => {
      const retentionSteps = getEvaluationToolRetentionSteps(toolCall.function.name);
      const keep = retentionSteps === null || lastAssistantStep - assistantStep < retentionSteps;
      if (!keep) removedToolCallIds.add(toolCall.id);
      return keep;
    });
    if (toolCalls.length > 0 || (message.content ?? "").trim()) {
      compacted.push({ ...message, tool_calls: toolCalls.length > 0 ? toolCalls : undefined });
    }
  }
  return compacted;
}

interface OpenRouterResponse {
  choices?: Array<{ message?: OpenRouterAssistantMessage }>;
  error?: { message?: string };
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
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
  signature: string;
  revision: number;
  testedQueries: Set<string>;
  testedActions: Set<string>;
  journal: Array<{
    requestId: string;
    kind: "query" | "action";
    method: string;
    path: string;
    status: number | null;
    simulated: boolean;
  }>;
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
  testCase.previewResponses?.find(
    ({ pathIncludes, kind, method }) =>
      request.path.includes(pathIncludes) &&
      (kind === undefined || request.kind === kind) &&
      (method === undefined || request.method === method),
  )?.response ?? testCase.sampleResponse;

interface AssistantEvaluationToolCall {
  name: string;
  input: Record<string, unknown>;
  output: unknown;
  inputCharacters: number;
  outputCharacters: number;
  phaseLimited: boolean;
}

export interface AssistantAttemptState {
  calledTools: string[];
  toolCalls: AssistantEvaluationToolCall[];
  validatedTemplates: Set<string>;
  previews: Map<string, PreviewState>;
  completedPreviewSignatures: Set<string>;
  createdPreviewIds: Set<string>;
  createdWidgets: HomarrCustomWidgetV2[];
  modelInputTokens: number;
  modelOutputTokens: number;
  finalText: string;
  failure: string | null;
  retryFeedback: string[];
}

export interface CustomWidgetAssistantEvaluationResult {
  caseId: string;
  attempts: number;
  widget: HomarrCustomWidgetV2 | null;
  judge: CustomWidgetJudgeResult | null;
  outputDirectory: string;
  errors: string[];
  calledTools: string[];
  widgets: HomarrCustomWidgetV2[];
  judges: CustomWidgetJudgeResult[];
  efficiency: {
    toolCalls: number;
    toolInputCharacters: number;
    toolOutputCharacters: number;
    modelInputTokens: number;
    modelOutputTokens: number;
  };
}

const objectSchema = (properties: Record<string, unknown>, required: string[] = []) => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const customWidgetAssistantEvaluationToolDefinitions: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "web_search",
      description:
        "Search current primary API documentation when the user did not supply a verified contract. Use one focused search per service and reuse its result across a widget set.",
      parameters: objectSchema({ query: { type: "string", minLength: 2, maxLength: 240 } }, ["query"]),
    },
  },
  {
    type: "function",
    function: {
      name: "customWidget_getSkill",
      description:
        "Load the compact installed Custom Widget skill entrypoint and reference index. Call this before authoring.",
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
      name: "customWidget_getReference",
      description:
        "Load one named installed reference only when needed: schema for manifest syntax, runtime for interactions, or security for authentication and interpreter constraints.",
      parameters: objectSchema({ name: { type: "string", enum: ["schema", "runtime", "security"] } }, ["name"]),
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
      name: "customWidget_findComponents",
      description:
        "Find a small release-matched component subset by name or capability. Prefer this over the complete catalog when the intended UI is known.",
      parameters: objectSchema(
        {
          query: { type: "string", minLength: 2, maxLength: 240 },
          limit: { type: "number", minimum: 1, maximum: 16 },
        },
        ["query"],
      ),
    },
  },
  {
    type: "function",
    function: {
      name: "customWidget_getComponents",
      description:
        "Get compact installed documentation for up to eight selected Custom JSX components in one batch. Full single-component details remain available for a concrete unresolved prop or repair.",
      parameters: objectSchema({ names: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 8 } }, [
        "names",
      ]),
    },
  },
  {
    type: "function",
    function: {
      name: "customWidget_getComponent",
      description:
        "Get one installed Custom JSX component document to resolve a concrete repair. Prefer customWidget_getComponents for a planned set.",
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
      name: "customWidget_validateTemplate",
      description:
        "Validate JSX without resending the manifest. Pass templateLines only and reuse those exact lines in the preview definition.",
      parameters: objectSchema(
        { templateLines: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 2_000 } },
        ["templateLines"],
      ),
    },
  },
  {
    type: "function",
    function: {
      name: "customWidget_previewCreate",
      description:
        "Fully validate a coherent complete definition and create its preview. Pass definition directly as an object, never serialized JSON. Returns every query and action that needs evidence.",
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
      name: "customWidget_previewReviseTemplate",
      description:
        "Replace only the validated JSX template in an existing preview after inspecting response evidence. Inherits the manifest, resets evidence, and avoids resending sources, requests, and options.",
      parameters: objectSchema(
        {
          sessionId: { type: "string" },
          templateLines: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 2_000 },
        },
        ["sessionId", "templateLines"],
      ),
    },
  },
  {
    type: "function",
    function: {
      name: "customWidget_previewAction",
      description:
        "Simulate one action returned by previewCreate.actions with representative parameters. Verify its confirmation, permission, and invalidation metadata.",
      parameters: objectSchema(
        {
          sessionId: { type: "string" },
          requestId: { type: "string" },
          params: { type: "object", additionalProperties: true },
          confirmed: { type: "boolean" },
        },
        ["sessionId", "requestId"],
      ),
    },
  },
  {
    type: "function",
    function: {
      name: "customWidget_previewJournal",
      description: "Read the redacted preview request journal when query or action routing needs inspection.",
      parameters: objectSchema({ sessionId: { type: "string" } }, ["sessionId"]),
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

const initiallyActiveAssistantEvaluationTools = new Set(["web_search", "customWidget_getSkill"]);
const maxFocusedComponentSearchesPerPhase = 4;
const customWidgetContextToolBudgets: Readonly<Record<string, number>> = {
  customWidget_findComponents: maxFocusedComponentSearchesPerPhase,
  customWidget_getComponents: 1,
  customWidget_getComponent: 2,
  customWidget_getSharedProps: 1,
  customWidget_getExample: 1,
};

export const getActiveAssistantEvaluationToolDefinitions = (state: AssistantAttemptState) => {
  const availableNames = customWidgetAssistantEvaluationToolDefinitions.map(
    ({ function: definition }) => definition.name,
  );
  const steps = state.toolCalls.map((toolCall) => ({
    toolResults: [{ toolName: toolCall.name, output: toolCall.output }],
  }));
  const phaseToolNames = getCustomWidgetPhaseToolNames(availableNames, steps);
  const activeToolNames = new Set(phaseToolNames ?? initiallyActiveAssistantEvaluationTools);
  return customWidgetAssistantEvaluationToolDefinitions.filter(({ function: definition }) =>
    activeToolNames.has(definition.name),
  );
};

export function executeActiveAssistantEvaluationTool(
  testCase: CustomWidgetAiEvaluationCase,
  state: AssistantAttemptState,
  name: string,
  input: Record<string, unknown>,
) {
  const activeTools = getActiveAssistantEvaluationToolDefinitions(state).map(
    ({ function: definition }) => definition.name,
  );
  if (!activeTools.includes(name)) {
    return {
      error: `Tool '${name}' is not active in the current authoring phase.`,
      activeTools,
    };
  }
  return executeAssistantEvaluationTool(testCase, state, name, input);
}

const getDefinitionSignature = (widget: HomarrCustomWidgetV2) => JSON.stringify(widget);

const getContextToolCallsInCurrentPhase = (state: AssistantAttemptState, toolName: string) => {
  const lastValidationIndex = state.toolCalls.findLastIndex(
    (toolCall) => toolCall.name === "customWidget_validateTemplate",
  );
  return state.toolCalls
    .slice(lastValidationIndex + 1)
    .filter((toolCall) => toolCall.name === toolName && !toolCall.phaseLimited).length;
};

const getContextPhaseCompleteOutput = (toolName: string) => ({
  phaseComplete: true as const,
  ...(toolName === "customWidget_findComponents" || toolName === "customWidget_getComponents"
    ? { components: [] }
    : {}),
  ...(toolName === "customWidget_getSharedProps" ? { props: [], notFound: [] } : {}),
  nextStep:
    "Context retrieval is complete for this phase. Use accumulated results and call customWidget_validateTemplate. A failed validation reopens focused retrieval.",
});

function parseDefinition(value: unknown) {
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch (error) {
      const detail = error instanceof Error ? ` ${error.message}` : "";
      return {
        success: false as const,
        issues: [
          {
            path: "definition",
            code: "invalid_json",
            message: `Pass definition directly as an object, never serialized JSON.${detail}`,
          },
        ],
      };
    }
  }
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

const getTemplateFromInput = (input: Record<string, unknown>) => {
  const templateString = typeof input.template === "string" ? input.template : null;
  const templateLines =
    Array.isArray(input.templateLines) && input.templateLines.every((line) => typeof line === "string")
      ? input.templateLines
      : null;
  if (templateString !== null && templateLines !== null) {
    return { success: false as const, error: "Provide template or templateLines, not both" };
  }
  const rawTemplate = templateString ?? templateLines?.join("\n");
  if (rawTemplate === undefined || rawTemplate === null) {
    return { success: false as const, error: "Provide template or templateLines" };
  }
  const template = normalizeCustomJsxAuthoringTemplate(rawTemplate);
  return { success: true as const, template, normalizedCharacters: rawTemplate.length - template.length };
};

const getRequestParams = (input: Record<string, unknown>) => {
  if (typeof input.params !== "object" || input.params === null || Array.isArray(input.params)) return {};
  return input.params as Record<string, unknown>;
};

const getMissingRequestParams = (request: HomarrCustomWidgetV2["requests"][string], input: Record<string, unknown>) => {
  const params = getRequestParams(input);
  return getRequiredAssistantEvaluationRequestParams(request).filter(
    (paramName) => !(paramName in params) || params[paramName] === null || params[paramName] === "",
  );
};

const isPreviewComplete = (preview: PreviewState) =>
  Object.entries(preview.widget.requests).every(([requestId, request]) => {
    if (request.kind === "query") return preview.testedQueries.has(requestId);
    return preview.testedActions.has(requestId);
  });

const rememberCompletedPreview = (state: AssistantAttemptState, preview: PreviewState) => {
  if (isPreviewComplete(preview)) state.completedPreviewSignatures.add(preview.signature);
};

const getAssistantEvaluationPreviewChecklist = (widget: HomarrCustomWidgetV2) => ({
  queries: Object.entries(widget.requests).flatMap(([requestId, request]) => {
    if (request.kind !== "query") return [];
    return [
      {
        requestId,
        trigger: request.trigger,
        requiredParams: getRequiredAssistantEvaluationRequestParams(request),
      },
    ];
  }),
  actions: Object.entries(widget.requests).flatMap(([requestId, request]) => {
    if (request.kind !== "action") return [];
    return [
      {
        requestId,
        method: request.method,
        requiredParams: getRequiredAssistantEvaluationRequestParams(request),
        minimumBoardPermission: request.permission,
        confirmation: request.confirmation,
        invalidates: request.invalidates ?? [],
      },
    ];
  }),
});

const executeAssistantEvaluationToolCore = (
  testCase: CustomWidgetAiEvaluationCase,
  state: AssistantAttemptState,
  name: string,
  input: Record<string, unknown>,
): unknown => {
  const contextRequestKey = getCustomWidgetContextRequestKey(name, input);
  if (
    contextRequestKey !== null &&
    state.toolCalls.some(
      (toolCall) =>
        !toolCall.phaseLimited && getCustomWidgetContextRequestKey(toolCall.name, toolCall.input) === contextRequestKey,
    )
  ) {
    return {
      contextAlreadyLoaded: true,
      nextStep: "Reuse the earlier result for this exact context request.",
    };
  }
  const contextBudget = customWidgetContextToolBudgets[name];
  if (contextBudget !== undefined && getContextToolCallsInCurrentPhase(state, name) >= contextBudget) {
    return getContextPhaseCompleteOutput(name);
  }
  if (name === "web_search") {
    return {
      query: typeof input.query === "string" ? input.query : "",
      results: [
        {
          title: `${testCase.id} primary API documentation`,
          url: testCase.documentationUrl,
          content: testCase.apiNotes,
        },
      ],
    };
  }
  if (name === "customWidget_getSkill") return getCustomWidgetSkillEntrypoint();
  if (name === "customWidget_schema") return getCustomWidgetJsonSchema();
  if (name === "customWidget_getReference") {
    const referenceName = input.name;
    if (referenceName !== "schema" && referenceName !== "runtime" && referenceName !== "security") {
      return { error: "Custom Widget reference not found" };
    }
    return getCustomWidgetSkillReference(referenceName);
  }
  if (name === "customWidget_getComponentCatalog") return getCustomWidgetComponentCatalog();
  if (name === "customWidget_findComponents") {
    const query = typeof input.query === "string" ? input.query : "";
    const limit = typeof input.limit === "number" ? input.limit : 16;
    return findCustomWidgetComponents(query, limit);
  }
  if (name === "customWidget_getComponent") {
    const component = typeof input.name === "string" ? getCustomWidgetComponent(input.name) : null;
    return component ?? { error: "Custom JSX component not found" };
  }
  if (name === "customWidget_getComponents") {
    const names = Array.isArray(input.names)
      ? input.names.filter((entry): entry is string => typeof entry === "string")
      : [];
    if (names.length === 0) return { error: "At least one component name is required" };
    return getCustomWidgetComponents(names);
  }
  if (name === "customWidget_getSharedProps") {
    const names = Array.isArray(input.names)
      ? input.names.filter((entry): entry is string => typeof entry === "string")
      : [];
    if (names.length === 0) return { error: "At least one shared prop name is required" };
    return getCustomWidgetSharedProps(names);
  }
  if (name === "customWidget_getExample") {
    const example = typeof input.name === "string" ? getCustomWidgetExample(input.name) : null;
    if (!example) return { error: "Custom JSX example not found" };
    const { template, ...widget } = example.widget;
    return { ...example, widget: { ...widget, templateLines: template.split("\n") } };
  }
  if (name === "customWidget_validateTemplate") {
    const templateInput = getTemplateFromInput(input);
    if (!templateInput.success) {
      return {
        valid: false,
        diagnostics: [{ severity: "error", message: templateInput.error }],
        nextStep: "Send exactly one corrected template format and revalidate before previewing.",
      };
    }
    const { template, normalizedCharacters } = templateInput;
    const diagnostics = addCustomJsxDiagnosticSourceExcerpts(template, validateCustomJsxTemplate(template));
    const valid = diagnostics.every((diagnostic) => diagnostic.severity !== "error");
    const hasUnknownProp = diagnostics.some((diagnostic) => diagnostic.message.startsWith("UNKNOWN_MANTINE_PROP"));
    let nextStep = "Send the matching coherent definition to customWidget_previewCreate.";
    if (!valid) {
      nextStep = "Repair the reported JSX errors, then revalidate only the corrected template before previewing.";
    } else if (hasUnknownProp) {
      nextStep = "Repair unknown component props before previewing, then revalidate only the corrected JSX.";
    }
    if (valid) state.validatedTemplates.add(template);
    return {
      valid,
      normalizedCharacters,
      diagnostics,
      summary: { characters: template.length, lines: template.split("\n").length },
      nextStep,
    };
  }
  if (name === "customWidget_previewCreate") {
    const parsed = parseDefinition(input.definition);
    if (!parsed.success) return { error: "Definition is invalid", issues: parsed.issues };
    if (!state.validatedTemplates.has(parsed.widget.template)) {
      return { error: "Validate this exact JSX template before sending the complete definition to preview." };
    }
    const signature = getDefinitionSignature(parsed.widget);
    if ([...state.previews.values()].some((preview) => preview.signature === signature)) {
      return {
        error:
          "This unchanged definition already has a preview. Make a material improvement before another preview cycle.",
      };
    }
    const id = `preview-${state.previews.size + 1}`;
    state.previews.set(id, {
      widget: parsed.widget,
      signature,
      revision: 0,
      testedQueries: new Set(),
      testedActions: new Set(),
      journal: [],
    });
    return {
      success: true,
      previewSession: { id, revision: 0 },
      previewPath: `/manage/custom-widgets/preview/${id}`,
      ...getAssistantEvaluationPreviewChecklist(parsed.widget),
    };
  }
  if (name === "customWidget_previewReviseTemplate") {
    const sessionId = typeof input.sessionId === "string" ? input.sessionId : "";
    const preview = state.previews.get(sessionId);
    if (!preview || state.createdPreviewIds.has(sessionId)) return { error: "Preview session not found" };
    if (
      typeof input.expectedRevision === "number" &&
      Number.isInteger(input.expectedRevision) &&
      input.expectedRevision !== preview.revision
    ) {
      return {
        error: `Preview session revision changed from ${input.expectedRevision} to ${preview.revision}`,
      };
    }
    const templateInput = getTemplateFromInput(input);
    if (!templateInput.success) return { error: templateInput.error };
    if (!state.validatedTemplates.has(templateInput.template)) {
      return { error: "Validate this exact revised JSX template before revising the preview." };
    }
    const parsed = customWidgetDefinitionSchema.safeParse({ ...preview.widget, template: templateInput.template });
    if (!parsed.success) {
      return {
        error: "Revised preview template is invalid",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.map(String).join("."),
          code: issue.code,
          message: issue.message,
        })),
      };
    }
    const signature = getDefinitionSignature(parsed.data);
    if (signature === preview.signature) return { error: "Revised preview template is unchanged" };
    if ([...state.previews.values()].some((candidate) => candidate !== preview && candidate.signature === signature)) {
      return { error: "This exact definition already has a preview" };
    }
    rememberCompletedPreview(state, preview);
    preview.widget = parsed.data;
    preview.signature = signature;
    preview.revision += 1;
    preview.testedQueries.clear();
    preview.testedActions.clear();
    preview.journal = [];
    return {
      success: true,
      evidenceReset: true,
      previewSession: { id: sessionId, revision: preview.revision },
      previewPath: `/manage/custom-widgets/preview/${sessionId}`,
      ...getAssistantEvaluationPreviewChecklist(preview.widget),
    };
  }
  if (name === "customWidget_previewQuery") {
    const sessionId = typeof input.sessionId === "string" ? input.sessionId : "";
    const requestId = typeof input.requestId === "string" ? input.requestId : "";
    const preview = state.previews.get(sessionId);
    const request = preview?.widget.requests[requestId];
    if (!preview || request?.kind !== "query") return { error: "Preview query was not found" };
    const missingParams = getMissingRequestParams(request, input);
    if (missingParams.length > 0) {
      return { error: `Supply the required manual preview parameters: ${missingParams.join(", ")}` };
    }
    const response = getAssistantEvaluationPreviewResponse(testCase, request);
    if (response === undefined) return { error: `No deterministic preview response is configured for ${request.path}` };
    preview.testedQueries.add(requestId);
    preview.journal.push({
      requestId,
      kind: "query",
      method: request.method,
      path: request.path,
      status: 200,
      simulated: false,
    });
    rememberCompletedPreview(state, preview);
    return {
      sessionId,
      requestId,
      ok: true,
      status: 200,
      data: response,
      request: { method: request.method, path: request.path },
    };
  }
  if (name === "customWidget_previewAction") {
    const sessionId = typeof input.sessionId === "string" ? input.sessionId : "";
    const requestId = typeof input.requestId === "string" ? input.requestId : "";
    const preview = state.previews.get(sessionId);
    const request = preview?.widget.requests[requestId];
    if (!preview || request?.kind !== "action") return { error: "Preview action was not found" };
    const missingParams = getMissingRequestParams(request, input);
    if (missingParams.length > 0) {
      return { error: `Supply the required manual preview parameters: ${missingParams.join(", ")}` };
    }
    preview.testedActions.add(requestId);
    preview.journal.push({
      requestId,
      kind: "action",
      method: request.method,
      path: request.path,
      status: null,
      simulated: true,
    });
    rememberCompletedPreview(state, preview);
    return {
      sessionId,
      requestId,
      ok: true,
      status: 0,
      statusText: "Simulated",
      data: null,
      simulated: true,
    };
  }
  if (name === "customWidget_previewJournal") {
    const sessionId = typeof input.sessionId === "string" ? input.sessionId : "";
    const preview = state.previews.get(sessionId);
    if (!preview) return { error: "Preview session not found" };
    return { entries: preview.journal };
  }
  if (name === "customWidget_createFromPreview") {
    const sessionId = typeof input.previewSessionId === "string" ? input.previewSessionId : "";
    const preview = state.previews.get(sessionId);
    if (!preview) return { error: "Preview session not found" };
    if (state.createdPreviewIds.has(sessionId)) return { error: "This preview was already persisted" };
    const untestedQueries = Object.entries(preview.widget.requests).flatMap(([requestId, request]) =>
      request.kind === "query" && !preview.testedQueries.has(requestId) ? [requestId] : [],
    );
    if (untestedQueries.length > 0) {
      return { error: `Test every preview query before creation: ${untestedQueries.join(", ")}` };
    }
    const untestedActions = Object.entries(preview.widget.requests).flatMap(([requestId, request]) =>
      request.kind === "action" && !preview.testedActions.has(requestId) ? [requestId] : [],
    );
    if (untestedActions.length > 0) {
      return { error: `Test every preview action before creation: ${untestedActions.join(", ")}` };
    }
    rememberCompletedPreview(state, preview);
    const completedPreviewCycles = state.completedPreviewSignatures.size;
    const minimumPreviewCycles = testCase.minimumPreviewCycles ?? 1;
    if (completedPreviewCycles < minimumPreviewCycles) {
      return {
        error: `Complete at least ${minimumPreviewCycles} distinct preview-and-evidence cycles before creation; ${completedPreviewCycles} completed. Make a material improvement, validate its JSX, create a fresh preview, and test it again.`,
      };
    }
    const widget = customWidgetDefinitionSchema.parse(preview.widget);
    state.createdPreviewIds.add(sessionId);
    state.createdWidgets.push(widget);
    const createdId = `created-${testCase.id}-${state.createdWidgets.length}`;
    return {
      id: createdId,
      managementPath: `/manage/custom-widgets/edit/${createdId}`,
      nextAction: { type: "place-custom-widget", widgetKind: "customApi" },
    };
  }
  return { error: `Unknown evaluation tool '${name}'` };
};

const getAssistantEvaluationToolRetryFeedback = (name: string, output: unknown) => {
  const result = isRecord(output) ? output : null;
  if (!result) return [];
  const messages: string[] = [];
  if (typeof result.error === "string") messages.push(result.error);
  for (const key of ["diagnostics", "issues"] as const) {
    const entries = Array.isArray(result[key]) ? result[key].slice(0, 3) : [];
    for (const entry of entries) {
      if (!isRecord(entry) || typeof entry.message !== "string") continue;
      if (key === "diagnostics" && entry.severity !== "error") continue;
      const path = typeof entry.path === "string" ? `${entry.path}: ` : "";
      messages.push(`${path}${entry.message}`);
    }
  }
  return [...new Set(messages)].map((message) => `${name}: ${message}`);
};

export function executeAssistantEvaluationTool(
  testCase: CustomWidgetAiEvaluationCase,
  state: AssistantAttemptState,
  name: string,
  input: Record<string, unknown>,
): unknown {
  const normalizedInput = normalizeCustomWidgetLifecycleToolInput(name, input);
  const output = executeAssistantEvaluationToolCore(testCase, state, name, normalizedInput);
  state.calledTools.push(name);
  state.toolCalls.push({
    name,
    input: normalizedInput,
    output,
    inputCharacters: JSON.stringify(normalizedInput).length,
    outputCharacters: JSON.stringify(output).length,
    phaseLimited: isRecord(output) && (output.phaseComplete === true || output.contextAlreadyLoaded === true),
  });
  for (const feedback of getAssistantEvaluationToolRetryFeedback(name, output)) {
    if (!state.retryFeedback.includes(feedback)) state.retryFeedback.push(feedback);
  }
  if (state.retryFeedback.length > 8) state.retryFeedback.splice(0, state.retryFeedback.length - 8);
  return output;
}

const getExpectedWidgetCount = (testCase: CustomWidgetAiEvaluationCase) => testCase.expectedWidgets?.length ?? 1;

export function getAssistantEvaluationLifecycleIssues(
  testCase: CustomWidgetAiEvaluationCase,
  state: AssistantAttemptState,
) {
  const required = [
    "customWidget_getSkill",
    "customWidget_validateTemplate",
    "customWidget_previewCreate",
    "customWidget_createFromPreview",
  ];
  const hasQueries = state.createdWidgets.some((widget) =>
    Object.values(widget.requests).some((request) => request.kind === "query"),
  );
  const hasActions = state.createdWidgets.some((widget) =>
    Object.values(widget.requests).some((request) => request.kind === "action"),
  );
  if (hasQueries) required.push("customWidget_previewQuery");
  if (hasActions) required.push("customWidget_previewAction");
  const issues = required.flatMap((name) =>
    state.calledTools.includes(name) ? [] : [`The assistant never called ${name}.`],
  );
  const expectedWidgetCount = getExpectedWidgetCount(testCase);
  if (state.createdWidgets.length !== expectedWidgetCount) {
    issues.push(`The assistant created ${state.createdWidgets.length} of ${expectedWidgetCount} required widgets.`);
  }
  if (testCase.research && state.calledTools.filter((name) => name === "web_search").length !== 1) {
    issues.push("The assistant must perform exactly one shared primary-documentation search for this widget set.");
  }
  for (const reference of testCase.research?.requiredReferences ?? []) {
    const loaded = state.toolCalls.some(
      (toolCall) => toolCall.name === "customWidget_getReference" && toolCall.input.name === reference,
    );
    if (!loaded) issues.push(`The assistant never loaded the required '${reference}' reference.`);
  }
  return issues;
}

export function getAssistantEvaluationEfficiencyIssues(
  testCase: CustomWidgetAiEvaluationCase,
  state: AssistantAttemptState,
) {
  const issues: string[] = [];
  if (state.calledTools.includes("customWidget_validate")) {
    issues.push("The assistant resent a complete definition through customWidget_validate.");
  }
  for (const resource of ["customWidget_getSkill", "customWidget_schema", "customWidget_getComponentCatalog"]) {
    const calls = state.toolCalls.filter((toolCall) => toolCall.name === resource && !toolCall.phaseLimited).length;
    if (calls > 1) issues.push(`The assistant loaded ${resource} ${calls} times instead of reusing it.`);
  }
  const skillCall = state.toolCalls.find((toolCall) => toolCall.name === "customWidget_getSkill");
  if (skillCall && skillCall.outputCharacters > 10_000) {
    issues.push(`The compact skill entrypoint used ${skillCall.outputCharacters} output characters.`);
  }
  const otherReusableContextTools = new Set(["web_search"]);
  const seenContextCalls = new Set<string>();
  for (const toolCall of state.toolCalls) {
    if (toolCall.phaseLimited) continue;
    let signature = getCustomWidgetContextRequestKey(toolCall.name, toolCall.input);
    if (signature === null && otherReusableContextTools.has(toolCall.name)) {
      signature = `${toolCall.name}:${JSON.stringify(toolCall.input)}`;
    }
    if (signature === null) continue;
    if (seenContextCalls.has(signature)) {
      issues.push(`The assistant repeated the same ${toolCall.name} context request.`);
    }
    seenContextCalls.add(signature);
  }
  for (const toolCall of state.toolCalls.filter((candidate) => candidate.name === "customWidget_validateTemplate")) {
    const unrelatedKeys = Object.keys(toolCall.input).filter((key) => key !== "template" && key !== "templateLines");
    if (unrelatedKeys.length > 0) {
      issues.push("The assistant sent manifest data through the template-only validator.");
    }
  }
  for (const toolCall of state.toolCalls.filter(
    (candidate) => candidate.name === "customWidget_previewReviseTemplate",
  )) {
    const allowedKeys = new Set(["sessionId", "expectedRevision", "template", "templateLines"]);
    if (Object.keys(toolCall.input).some((key) => !allowedKeys.has(key))) {
      issues.push("The assistant resent manifest data through the template-only preview revision tool.");
    }
  }
  const loadedReferences = state.toolCalls
    .filter((toolCall) => toolCall.name === "customWidget_getReference" && !toolCall.phaseLimited)
    .map((toolCall) => toolCall.input.name)
    .filter((name): name is string => typeof name === "string");
  if (testCase.research) {
    const allowedReferences = new Set(testCase.research.allowedReferences ?? testCase.research.requiredReferences);
    for (const reference of loadedReferences) {
      if (!allowedReferences.has(reference as "schema" | "runtime" | "security")) {
        issues.push(`The assistant loaded unrelated '${reference}' reference context.`);
      }
    }
    if (state.calledTools.includes("customWidget_getComponentCatalog")) {
      issues.push("The assistant loaded the full component catalog instead of using a focused component search.");
    }
    const firstValidationIndex = state.toolCalls.findIndex(
      (toolCall) => toolCall.name === "customWidget_validateTemplate",
    );
    const discoveryCalls =
      firstValidationIndex === -1 ? state.toolCalls : state.toolCalls.slice(0, firstValidationIndex);
    const componentSearches = discoveryCalls.filter(
      (toolCall) => toolCall.name === "customWidget_findComponents" && !toolCall.phaseLimited,
    ).length;
    const expectedWidgetCount = getExpectedWidgetCount(testCase);
    const componentSearchBudget = Math.max(expectedWidgetCount * 2, maxFocusedComponentSearchesPerPhase);
    if (componentSearches > componentSearchBudget) {
      issues.push(
        `The assistant used ${componentSearches} focused component searches before validation for ${expectedWidgetCount} widget jobs.`,
      );
    }
    const examples = discoveryCalls.filter(
      (toolCall) => toolCall.name === "customWidget_getExample" && !toolCall.phaseLimited,
    ).length;
    if (examples > expectedWidgetCount) {
      issues.push(
        `The assistant loaded ${examples} complete examples before validation for ${expectedWidgetCount} widget jobs.`,
      );
    }
    const modelInputTokenBudget = 600_000;
    if (state.modelInputTokens > modelInputTokenBudget) {
      issues.push(
        `The assistant used ${state.modelInputTokens} model input tokens; the advanced-case budget is ${modelInputTokenBudget}.`,
      );
    }
  }
  if (new Set(loadedReferences).size !== loadedReferences.length) {
    issues.push("The assistant loaded the same named reference more than once.");
  }
  for (const toolCall of state.toolCalls.filter((candidate) => candidate.name === "customWidget_createFromPreview")) {
    if (Object.keys(toolCall.input).some((key) => key !== "previewSessionId")) {
      issues.push("The assistant resent definition data while persisting a tested preview.");
    }
  }
  return issues;
}

export function createAssistantEvaluationState(): AssistantAttemptState {
  return {
    calledTools: [],
    toolCalls: [],
    validatedTemplates: new Set(),
    previews: new Map(),
    completedPreviewSignatures: new Set(),
    createdPreviewIds: new Set(),
    createdWidgets: [],
    modelInputTokens: 0,
    modelOutputTokens: 0,
    finalText: "",
    failure: null,
    retryFeedback: [],
  };
}

function buildAssistantPrompt(testCase: CustomWidgetAiEvaluationCase, feedback: readonly string[]) {
  const sections = [testCase.request];
  if (testCase.research) {
    sections.push(
      `The API contract was not supplied in the conversation. Use web_search exactly once with a focused primary-documentation query and reuse that result for the complete widget set.`,
    );
  } else {
    sections.push(
      `Verified API documentation: ${testCase.documentationUrl}`,
      `Verified API notes:\n${testCase.apiNotes}`,
    );
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
}) {
  const activeToolNames = args.tools.map(({ function: definition }) => definition.name);
  const compactedMessages = compactAssistantEvaluationMessages(args.messages);
  const messages = compactedMessages.map((message, index) => {
    if (index !== 0 || message.role !== "system") return message;
    return {
      ...message,
      content: appendActiveCustomWidgetToolInstruction(message.content, activeToolNames),
    };
  });
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
      messages,
      tools: args.tools,
      ...assistantEvaluationToolRequestOptions,
      temperature: 0.1,
      max_tokens: getAssistantEvaluationMaxOutputTokens(process.env.CUSTOM_WIDGET_AI_MAX_OUTPUT_TOKENS),
      reasoning: assistantEvaluationReasoningOptions,
    }),
    signal: AbortSignal.timeout(180_000),
  });
  const payload = (await response.json()) as OpenRouterResponse;
  if (!response.ok) {
    throw new Error(`AI provider request failed (${response.status}): ${payload.error?.message ?? "Unknown error"}`);
  }
  const message = payload.choices?.[0]?.message;
  if (!message) throw new Error("AI provider returned no assistant message");
  return {
    message,
    inputTokens: payload.usage?.prompt_tokens ?? 0,
    outputTokens: payload.usage?.completion_tokens ?? 0,
  };
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
      content: `${CUSTOM_WIDGET_TOOL_STAGING_INSTRUCTION}\n\n${CUSTOM_WIDGET_ASSISTANT_POLICY}\n\nThis is an unassisted tool-use evaluation. No tool will be forced for you. Complete and persist all ${getExpectedWidgetCount(args.testCase)} requested widget jobs before returning prose.`,
    },
    { role: "user", content: buildAssistantPrompt(args.testCase, args.feedback) },
  ];

  for (let step = 0; step < MAX_ASSISTANT_STEPS; step += 1) {
    let stepResult: Awaited<ReturnType<typeof callAssistantStep>>;
    try {
      stepResult = await callAssistantStep({
        apiKey: args.apiKey,
        baseUrl: args.baseUrl,
        model: args.model,
        messages,
        tools: getActiveAssistantEvaluationToolDefinitions(state),
      });
    } catch (error) {
      state.failure = error instanceof Error ? error.message : "The provider request failed";
      break;
    }
    const { message: providerMessage } = stepResult;
    const selection = selectSequentialCustomWidgetToolCalls(providerMessage.tool_calls ?? []);
    const message: OpenRouterAssistantMessage = {
      ...providerMessage,
      tool_calls: selection.selected.length > 0 ? selection.selected : undefined,
    };
    state.modelInputTokens += stepResult.inputTokens;
    state.modelOutputTokens += stepResult.outputTokens;
    if (selection.rejected.length > 0) {
      process.stdout.write(
        `    ignored ${selection.rejected.length} parallel authoring tool call${selection.rejected.length === 1 ? "" : "s"}\n`,
      );
    }
    if ((!message.tool_calls || message.tool_calls.length === 0) && !(message.content ?? "").trim()) {
      state.failure = "The model returned an empty assistant step before completing the Custom Widget lifecycle.";
      break;
    }
    messages.push(message);
    if (!message.tool_calls || message.tool_calls.length === 0) {
      state.finalText = message.content ?? "";
      state.failure = `The model stopped with prose after creating ${state.createdWidgets.length} of ${getExpectedWidgetCount(args.testCase)} required widgets.`;
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
        output = executeActiveAssistantEvaluationTool(args.testCase, state, toolCall.function.name, input);
      } catch (error) {
        output = { error: error instanceof Error ? error.message : "Tool input was not valid JSON" };
      }
      messages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(output) });
    }
    if (state.createdWidgets.length >= getExpectedWidgetCount(args.testCase)) break;
  }
  return { state, messages };
}

const getAssistantEfficiency = (state: AssistantAttemptState) => ({
  toolCalls: state.toolCalls.length,
  toolInputCharacters: state.toolCalls.reduce((sum, toolCall) => sum + toolCall.inputCharacters, 0),
  toolOutputCharacters: state.toolCalls.reduce((sum, toolCall) => sum + toolCall.outputCharacters, 0),
  modelInputTokens: state.modelInputTokens,
  modelOutputTokens: state.modelOutputTokens,
});

export function mergeAssistantEvaluationFeedback(feedback: string[], issues: readonly string[]) {
  const merged = [...new Set([...feedback, ...issues])];
  if (merged.length <= 16) {
    feedback.splice(0, feedback.length, ...merged);
    return;
  }
  feedback.splice(0, feedback.length, ...merged.slice(0, 8), ...merged.slice(-8));
}

export function replaceAssistantEvaluationFeedback(feedback: string[], issues: readonly string[]) {
  feedback.splice(0, feedback.length);
  mergeAssistantEvaluationFeedback(feedback, issues);
}

export function composeAssistantEvaluationFeedback(...groups: readonly (readonly string[])[]) {
  const feedback: string[] = [];
  for (const group of groups) {
    mergeAssistantEvaluationFeedback(feedback, group);
  }
  return feedback;
}

const maxReviewFixesPerWidget = 3;
const attemptLocalLifecycleFeedback = [
  "Preview session not found",
  "Preview session revision changed",
  "This preview was already persisted",
] as const;

export function getPortableAssistantLifecycleFeedback(issues: readonly string[]) {
  return issues.filter((issue) => !attemptLocalLifecycleFeedback.some((fragment) => issue.includes(fragment)));
}

export function selectAssistantEvaluationReviewFeedback(
  judgeResults: readonly CustomWidgetJudgeResult[],
  widgetIds: readonly string[],
) {
  return judgeResults.flatMap((judgeResult, index) => {
    let fixes = judgeResult.highestImpactFixes;
    if (fixes.length === 0) fixes = judgeResult.problems;
    const widgetId = widgetIds[index] ?? `widget-${index + 1}`;
    return fixes.slice(0, maxReviewFixesPerWidget).map((issue) => `${widgetId}: ${issue}`);
  });
}

export function formatAssistantDeterministicFeedback(
  issues: readonly { path?: Array<string | number>; message: string }[],
) {
  return issues.map((issue) => {
    if (!issue.path?.length) return issue.message;
    return `${issue.path.join(".")}: ${issue.message}`;
  });
}

export function getAssistantJudgeFloor(judges: readonly CustomWidgetJudgeResult[]) {
  return judges.toSorted((left, right) => left.total - right.total)[0] ?? null;
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
  const lifecycleFeedback: string[] = [];
  const deterministicFeedback: string[] = [];
  const reviewFeedback: string[] = [];
  let bestWidget: HomarrCustomWidgetV2 | null = null;
  let bestWidgets: HomarrCustomWidgetV2[] = [];
  let bestJudge: CustomWidgetJudgeResult | null = null;
  let bestJudges: CustomWidgetJudgeResult[] = [];
  let bestScoreFloor = -1;
  let bestCalledTools: string[] = [];
  let lastAttemptState: AssistantAttemptState | null = null;
  let bestEfficiency = {
    toolCalls: 0,
    toolInputCharacters: 0,
    toolOutputCharacters: 0,
    modelInputTokens: 0,
    modelOutputTokens: 0,
  };

  for (let attempt = 1; attempt <= args.maxLoops; attempt += 1) {
    process.stdout.write(`  assistant attempt ${attempt}/${args.maxLoops}\n`);
    let run: Awaited<ReturnType<typeof runAssistantAttempt>>;
    try {
      run = await runAssistantAttempt({
        testCase: args.testCase,
        apiKey: args.apiKey,
        baseUrl: args.baseUrl,
        model: args.generatorModel ?? DEFAULT_GENERATOR_MODEL,
        feedback: composeAssistantEvaluationFeedback(deterministicFeedback, reviewFeedback, lifecycleFeedback),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown assistant evaluation error";
      errors.push(`Attempt ${attempt}: ${message}`);
      replaceAssistantEvaluationFeedback(lifecycleFeedback, [message]);
      continue;
    }
    lastAttemptState = run.state;
    await writeFile(path.join(caseDirectory, `trace-${attempt}.json`), JSON.stringify(run.messages, null, 2), "utf8");
    await writeFile(
      path.join(caseDirectory, `efficiency-${attempt}.json`),
      JSON.stringify(getAssistantEfficiency(run.state), null, 2),
      "utf8",
    );
    if (run.state.previews.size > 0) {
      await writeFile(
        path.join(caseDirectory, `preview-candidates-${attempt}.json`),
        JSON.stringify(
          [...run.state.previews.values()].map(({ widget }) => widget),
          null,
          2,
        ),
        "utf8",
      );
    }
    const lifecycleIssues = [
      ...(run.state.failure ? [run.state.failure] : []),
      ...getAssistantEvaluationLifecycleIssues(args.testCase, run.state),
    ];
    const efficiencyIssues = getAssistantEvaluationEfficiencyIssues(args.testCase, run.state);
    if (lifecycleIssues.length > 0 || efficiencyIssues.length > 0) {
      const issues = [...lifecycleIssues, ...efficiencyIssues, ...run.state.retryFeedback];
      errors.push(`Attempt ${attempt}: lifecycle failed — ${issues.join(" ")}`);
      replaceAssistantEvaluationFeedback(lifecycleFeedback, getPortableAssistantLifecycleFeedback(issues));
      continue;
    }
    replaceAssistantEvaluationFeedback(lifecycleFeedback, []);
    const deterministicIssues = getDeterministicEvaluationSuiteIssues(args.testCase, run.state.createdWidgets);
    if (deterministicIssues.length > 0) {
      const issues = formatAssistantDeterministicFeedback(deterministicIssues);
      errors.push(`Attempt ${attempt}: deterministic checks failed — ${issues.join("; ")}`);
      replaceAssistantEvaluationFeedback(deterministicFeedback, issues);
      continue;
    }
    replaceAssistantEvaluationFeedback(deterministicFeedback, []);

    const matches = getDeterministicEvaluationMatches(args.testCase, run.state.createdWidgets);
    const judgeResults: CustomWidgetJudgeResult[] = [];
    let judgeFailure: string | null = null;
    for (const match of matches) {
      const widget = run.state.createdWidgets[match.widgetIndex];
      if (!widget) continue;
      await writeFile(
        path.join(caseDirectory, `widget-${attempt}-${match.expectedWidgetId}.json`),
        JSON.stringify(widget, null, 2),
        "utf8",
      );
      try {
        const judgeRaw = await requestCustomWidgetJudge({
          testCase: match.testCase,
          widget,
          apiKey: args.apiKey,
          baseUrl: args.baseUrl,
          judgeModel: args.judgeModel,
        });
        await writeFile(path.join(caseDirectory, `judge-${attempt}-${match.expectedWidgetId}.json`), judgeRaw, "utf8");
        judgeResults.push(parseJudgeResult(judgeRaw));
      } catch (error) {
        judgeFailure = error instanceof Error ? error.message : "Unknown judge error";
        break;
      }
    }
    if (judgeFailure) {
      errors.push(`Attempt ${attempt}: judge failed — ${judgeFailure}`);
      replaceAssistantEvaluationFeedback(reviewFeedback, [
        "Return a complete polished widget set for another independent review.",
      ]);
      continue;
    }
    const weakestJudge = getAssistantJudgeFloor(judgeResults);
    if (!weakestJudge) {
      errors.push(`Attempt ${attempt}: no widget received an independent review.`);
      replaceAssistantEvaluationFeedback(reviewFeedback, [
        "Return every requested widget as a complete tested preview.",
      ]);
      continue;
    }
    if (weakestJudge.total > bestScoreFloor) {
      bestWidget = run.state.createdWidgets[0] ?? null;
      bestWidgets = run.state.createdWidgets;
      bestJudge = weakestJudge;
      bestJudges = judgeResults;
      bestScoreFloor = weakestJudge.total;
      bestCalledTools = run.state.calledTools;
      bestEfficiency = getAssistantEfficiency(run.state);
    }
    if (judgeResults.every(judgePasses)) {
      return {
        caseId: args.testCase.id,
        attempts: attempt,
        widget: run.state.createdWidgets[0] ?? null,
        judge: weakestJudge,
        outputDirectory: caseDirectory,
        errors,
        calledTools: run.state.calledTools,
        widgets: run.state.createdWidgets,
        judges: judgeResults,
        efficiency: getAssistantEfficiency(run.state),
      };
    }
    const issues = selectAssistantEvaluationReviewFeedback(
      judgeResults,
      matches.map(({ expectedWidgetId }) => expectedWidgetId),
    );
    errors.push(`Attempt ${attempt}: weakest judge ${weakestJudge.total}/100 — ${issues.join("; ")}`);
    replaceAssistantEvaluationFeedback(reviewFeedback, issues);
  }

  return {
    caseId: args.testCase.id,
    attempts: args.maxLoops,
    widget: bestWidget,
    judge: bestJudge,
    outputDirectory: caseDirectory,
    errors,
    calledTools: bestCalledTools.length > 0 ? bestCalledTools : (lastAttemptState?.calledTools ?? []),
    widgets: bestWidgets,
    judges: bestJudges,
    efficiency:
      bestScoreFloor >= 0
        ? bestEfficiency
        : getAssistantEfficiency(lastAttemptState ?? createAssistantEvaluationState()),
  };
}
