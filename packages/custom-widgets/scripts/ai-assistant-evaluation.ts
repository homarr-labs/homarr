import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { z } from "zod/v4";

import { widgetKinds } from "@homarr/definitions";

import { integrationDefs } from "@homarr/definitions/integration";

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
import { getCustomWidgetSourceAuthType } from "../src/core/request-schema";
import { isCustomWidgetSourceUrlPlaceholder } from "../src/core/source-setup";
import { normalizeCustomWidgetLifecycleToolInput } from "../src/core/assistant-tool-input";
import { createCustomWidgetTemplateLifecycleController } from "../src/core/assistant-template-lifecycle";
import {
  getCustomWidgetPhaseToolNames,
  isRecoverableCustomWidgetAuthoringFailure,
  isSuccessfulCustomWidgetAuthoringAdvance,
} from "../src/core/assistant-authoring-phase";
import { assistantExecutionPolicy } from "../src/core/assistant-execution-policy";
import {
  appendActiveCustomWidgetToolInstruction,
  selectSequentialCustomWidgetToolCalls,
} from "../src/core/assistant-tool-step";
import { getCustomWidgetPlacementToolNames, resolveCustomWidgetPlacementState } from "../src/core/assistant-placement";
import type { HomarrCustomWidgetV2 } from "../src/core/custom-jsx-schema";
import { CUSTOM_WIDGET_ASSISTANT_POLICY, CUSTOM_WIDGET_TOOL_STAGING_INSTRUCTION } from "../src/core/ai-prompt";
import { getCustomWidgetJsonSchema } from "../src/core/schema";
import { addCustomJsxDiagnosticSourceExcerpts, validateCustomJsxTemplate } from "../src/jsx";
import type { CustomWidgetAiEvaluationCase, CustomWidgetAiPlacementFixture } from "./ai-evaluation-cases";
import {
  aiEvaluationSpendBudget,
  assertLiveAiEvaluationSpendCap,
  DEFAULT_GENERATOR_MODEL,
  getAiEvaluationRequestTimeoutMs,
  getAiProviderChatCompletionsUrl,
  getDeterministicEvaluationMatches,
  getDeterministicEvaluationSuiteIssues,
  judgeCustomWidgetCase,
  judgePasses,
  withAiEvaluationProviderSpendCeiling,
} from "./ai-evaluation";
import type { CustomWidgetJudgeResult } from "./ai-evaluation";

const defaultAssistantEvaluationMaxLoops = 10;
const defaultAssistantEvaluationMaxOutputTokens = assistantExecutionPolicy.maxOutputTokens;
export const assistantEvaluationToolRequestOptions = {
  tool_choice: "auto",
  parallel_tool_calls: false,
} as const;
const assistantReasoningEfforts = ["low", "medium", "high", "xhigh", "max"] as const;
export type AssistantEvaluationReasoningEffort = (typeof assistantReasoningEfforts)[number];

export function getRequiredAssistantEvaluationReasoningEffort(model: string) {
  if (model.trim().toLowerCase().includes("gpt-5.6-luna")) return "high" as const;
  return "max" as const;
}

export function getAssistantEvaluationReasoningOptions(
  configuredValue: string | undefined,
  model = DEFAULT_GENERATOR_MODEL,
) {
  const normalized = configuredValue?.trim().toLowerCase();
  if (normalized && !assistantReasoningEfforts.includes(normalized as AssistantEvaluationReasoningEffort)) {
    throw new Error(`CUSTOM_WIDGET_AI_REASONING_EFFORT must be one of: ${assistantReasoningEfforts.join(", ")}`);
  }
  const effort = normalized
    ? (normalized as AssistantEvaluationReasoningEffort)
    : getRequiredAssistantEvaluationReasoningEffort(model);
  return { effort, exclude: true } as const;
}

export function getAssistantEvaluationProviderPreferences(environment: Record<string, string | undefined>) {
  const order = environment.CUSTOM_WIDGET_AI_PROVIDER_ORDER?.split(",")
    .map((provider) => provider.trim().toLowerCase())
    .filter(Boolean);
  const quantizations = environment.CUSTOM_WIDGET_AI_PROVIDER_QUANTIZATIONS?.split(",")
    .map((quantization) => quantization.trim().toLowerCase())
    .filter(Boolean);
  if (!order?.length && !quantizations?.length) return undefined;
  return {
    ...(order?.length ? { order, allow_fallbacks: false } : {}),
    ...(quantizations?.length ? { quantizations } : {}),
  };
}

export const assistantEvaluationReasoningOptions = getAssistantEvaluationReasoningOptions(
  process.env.CUSTOM_WIDGET_AI_REASONING_EFFORT,
  process.env.AI_PROVIDER_MODEL?.trim() || process.env.OPENROUTER_GENERATOR_MODEL?.trim() || DEFAULT_GENERATOR_MODEL,
);
export const assistantEvaluationProviderPreferences = getAssistantEvaluationProviderPreferences(process.env);
export const assistantEvaluationTemperature = 0.2;

export function resolveAssistantEvaluationMaxLoops(cliValue: string | undefined, environmentValue: string | undefined) {
  if (cliValue !== undefined) {
    const configured = Number(cliValue);
    if (!Number.isInteger(configured) || configured < 1 || configured > defaultAssistantEvaluationMaxLoops) {
      throw new Error("--max-loops must be an integer between 1 and 10");
    }
    return { value: configured, source: "cli" as const, configuredValue: cliValue };
  }
  if (environmentValue !== undefined) {
    const configured = Number(environmentValue);
    if (Number.isInteger(configured) && configured > 0) {
      return {
        value: Math.min(configured, defaultAssistantEvaluationMaxLoops),
        source: "environment" as const,
        configuredValue: environmentValue,
      };
    }
  }
  return {
    value: defaultAssistantEvaluationMaxLoops,
    source: "default" as const,
    configuredValue: environmentValue ?? null,
  };
}

export function validateAssistantEvaluationExperimentConfiguration(
  maxLoops: number,
  experimentId: string | undefined,
  generationId: string | undefined,
  split: string | undefined,
  hasCandidatePrompt = false,
) {
  const isComparativeRun = experimentId !== undefined || generationId !== undefined || hasCandidatePrompt;
  if (isComparativeRun && maxLoops !== 1) {
    throw new Error("Comparative prompt runs require --max-loops=1 for pass@1 evaluation");
  }
  if (isComparativeRun && split === undefined) {
    throw new Error("Comparative prompt runs require an explicit --split=train|dev|heldout");
  }
}

export function getAssistantEvaluationPromotionEligibility(args: {
  assistantMode: boolean;
  requestedCase: string | undefined;
  requestedSplit: string | undefined;
  experimentId: string | undefined;
  generationId: string | undefined;
  maxLoops: number;
  selectedCaseIds: readonly string[];
  expectedCaseIds: readonly string[];
  generatorModel: string;
  reasoningEffort: AssistantEvaluationReasoningEffort;
  maxOutputTokens: number;
}) {
  const requiredReasoningEffort = getRequiredAssistantEvaluationReasoningEffort(args.generatorModel);
  const reasons = [
    ...(!args.assistantMode ? ["promotion requires --assistant"] : []),
    ...(args.requestedCase ? ["single-case exploratory runs are not eligible for promotion"] : []),
    ...(args.requestedSplit === undefined ? ["promotion requires an explicit --split"] : []),
    ...(args.requestedSplit === "train" ? ["train split runs are not eligible for promotion"] : []),
    ...(args.experimentId === undefined ? ["promotion requires --experiment"] : []),
    ...(args.generationId === undefined ? ["promotion requires --generation"] : []),
    ...(args.maxLoops !== 1 ? ["promotion requires --max-loops=1"] : []),
    ...(args.reasoningEffort !== requiredReasoningEffort
      ? [`promotion requires ${requiredReasoningEffort} reasoning for generator model '${args.generatorModel}'`]
      : []),
    ...(args.maxOutputTokens !== assistantExecutionPolicy.maxOutputTokens
      ? [`promotion requires the production maxOutputTokens=${assistantExecutionPolicy.maxOutputTokens}`]
      : []),
    ...(args.selectedCaseIds.join("\n") !== args.expectedCaseIds.join("\n")
      ? ["selected cases do not cover the complete requested split"]
      : []),
  ];
  return { eligible: reasons.length === 0, reasons };
}

export function getAssistantEvaluationMaxOutputTokens(configuredValue: string | undefined) {
  if (configuredValue === undefined) return defaultAssistantEvaluationMaxOutputTokens;
  const configured = Number(configuredValue);
  if (!Number.isInteger(configured) || configured <= 0) return defaultAssistantEvaluationMaxOutputTokens;
  return Math.min(defaultAssistantEvaluationMaxOutputTokens, Math.max(4_096, configured));
}

export function getAssistantEvaluationStepTimeoutMs(configuredValue: string | undefined, remainingTotalMs: number) {
  const configuredTimeoutMs = getAiEvaluationRequestTimeoutMs(configuredValue);
  return Math.max(1, Math.min(configuredTimeoutMs, assistantExecutionPolicy.stepTimeoutMs, remainingTotalMs));
}

export const isAssistantEvaluationRetryableStatus = (status: number) =>
  status === 408 || status === 409 || status === 429 || status >= 500;

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
    cost?: number;
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
  definitionId?: string;
  signature: string;
  revision: number;
  testedQueries: Set<string>;
  testedActions: Set<string>;
  configuredSourceIds: Set<string>;
  configuredSourceHttpStatuses: Map<string, number>;
  journal: Array<{
    requestId: string;
    kind: "query" | "action";
    method: string;
    path: string;
    status: number | null;
    simulated: boolean;
  }>;
}

export interface AssistantEvaluationCredentialRequest {
  id: string;
  sessionId: string;
  sourceId: string;
  status: "pending" | "completed" | "expired";
  checkedCompleted: boolean;
  configuredSource?: {
    baseUrl: string;
    networkScope: "public" | "private" | "loopback";
  };
}

const getAssistantEvaluationPersistenceTool = (preview: Pick<PreviewState, "definitionId">) => {
  if (preview.definitionId) return "customWidget_updateFromPreview" as const;
  return "customWidget_createFromPreview" as const;
};

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

export interface AssistantEvaluationPlacementEvidence {
  widgetId: string;
  boardId: string;
  itemId: string;
}

export interface AssistantAttemptState {
  integrationDiscoveryEnabled: boolean;
  placement: CustomWidgetAiPlacementFixture | undefined;
  placementEvidence: AssistantEvaluationPlacementEvidence[];
  calledTools: string[];
  toolCalls: AssistantEvaluationToolCall[];
  validatedTemplates: Set<string>;
  templateLifecycle: ReturnType<typeof createCustomWidgetTemplateLifecycleController>;
  previews: Map<string, PreviewState>;
  credentialRequests: Map<string, AssistantEvaluationCredentialRequest>;
  syntheticCredentialContinues: number;
  completedPreviewSignatures: Set<string>;
  createdPreviewIds: Set<string>;
  createdWidgets: HomarrCustomWidgetV2[];
  modelInputTokens: number;
  modelOutputTokens: number;
  modelReportedCostUsd: number;
  modelAccountedCostUsd: number;
  modelCostExact: boolean;
  elapsedMs: number;
  toolStepNarrations: string[];
  finalText: string;
  failure: string | null;
  retryFeedback: string[];
}

export interface CustomWidgetAssistantEvaluationResult {
  caseId: string;
  attempts: number;
  selectedAttempt: number | null;
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
    modelCostUsd: number | null;
    modelAccountedCostUsd: number;
    modelCostExact: boolean;
    elapsedMs: number;
  };
  cumulativeEfficiency: {
    toolCalls: number;
    toolInputCharacters: number;
    toolOutputCharacters: number;
    modelInputTokens: number;
    modelOutputTokens: number;
    modelCostUsd: number | null;
    modelAccountedCostUsd: number;
    modelCostExact: boolean;
    elapsedMs: number;
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

const configureWidgetInputSchema = z.object({
  boardId: z.string().trim().min(1).max(64),
  boardName: z.string().trim().min(1).max(255),
  kind: z.enum(widgetKinds),
  summary: z.string().trim().min(1).max(400),
  options: z.record(z.string(), z.unknown()).optional(),
  integrationIds: z.array(z.string().trim().min(1).max(64)).max(32).optional(),
});

const boardAddItemInputSchema = z.object({
  boardId: z.string(),
  kind: z.enum(widgetKinds),
  options: z.record(z.string(), z.unknown()).default({}),
  integrationIds: z.array(z.string()).max(32).default([]),
});

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
      name: "integration_getKinds",
      description:
        "List integration kinds with required secret fields and supportsHttpRequests. Use this before selecting a saved integration for a Custom Widget source.",
      parameters: objectSchema({}),
    },
  },
  {
    type: "function",
    function: {
      name: "integration_all",
      description:
        "List accessible configured integrations. A Custom Widget integration source requires permissions.hasFullAccess and a kind whose supportsHttpRequests is true.",
      parameters: objectSchema({}),
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
          query: { type: "string" },
          limit: { type: "integer", minimum: 1, maximum: 16, default: 16 },
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
        {
          templateLines: {
            type: "array",
            items: { type: "string", maxLength: 10_000 },
            minItems: 1,
            maxItems: 2_000,
          },
        },
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
          definition: z.toJSONSchema(customWidgetAuthoringDefinitionSchema, { io: "input" }),
          definitionId: { type: "string" },
          options: { type: "object", propertyNames: { type: "string" }, additionalProperties: {} },
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
          sessionId: { type: "string", minLength: 1 },
          templateLines: {
            type: "array",
            items: { type: "string", maxLength: 10_000 },
            minItems: 1,
            maxItems: 2_000,
          },
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
          sessionId: { type: "string", minLength: 1 },
          requestId: { type: "string", minLength: 1, maxLength: 64 },
          params: {
            type: "object",
            propertyNames: { type: "string" },
            additionalProperties: {
              anyOf: [{ type: "string" }, { type: "number" }, { type: "boolean" }],
            },
            default: {},
          },
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
      parameters: objectSchema({ sessionId: { type: "string", minLength: 1 } }, ["sessionId"]),
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
          sessionId: { type: "string", minLength: 1 },
          requestId: { type: "string", minLength: 1, maxLength: 64 },
          params: {
            type: "object",
            propertyNames: { type: "string" },
            additionalProperties: {
              anyOf: [{ type: "string" }, { type: "number" }, { type: "boolean" }],
            },
            default: {},
          },
        },
        ["sessionId", "requestId"],
      ),
    },
  },
  {
    type: "function",
    function: {
      name: "customWidget_configurationRequestUser",
      description:
        "Create or check a secure source-configuration request. Complete every sourceConfigurations item before preview evidence. If a previously configured source later fails authentication, request fresh setup for its exact previewSessionId and sourceId. Pause for the user, then check the same requestId on Continue.",
      parameters: objectSchema({
        definitionId: { type: "string" },
        requestId: { type: "string" },
        previewSessionId: { type: "string" },
        sourceId: { type: "string" },
      }),
    },
  },
  {
    type: "function",
    function: {
      name: "customWidget_createFromPreview",
      description: "Persist the exact final tested preview. Every query in that preview must have succeeded first.",
      parameters: objectSchema(
        { previewSessionId: { type: "string", minLength: 1 }, targetBoardId: { type: "string", minLength: 1 } },
        ["previewSessionId"],
      ),
    },
  },
  {
    type: "function",
    function: {
      name: "customWidget_updateFromPreview",
      description:
        "Update the existing Custom Widget associated with an exact final tested edit preview. Every query in that preview must have succeeded first.",
      parameters: objectSchema({ previewSessionId: { type: "string", minLength: 1 } }, ["previewSessionId"]),
    },
  },
  {
    type: "function",
    function: {
      name: "configure_widget",
      description:
        "Open Homarr's native widget editor with the known target board and created Custom Widget preselected. Use the returned boardId, kind, options, and integrationIds exactly with board_addItem.",
      parameters: z.toJSONSchema(configureWidgetInputSchema, { io: "input" }),
    },
  },
  {
    type: "function",
    function: {
      name: "board_addItem",
      description:
        "Add the reviewed widget to the target board at the first free grid position. Use the configure_widget result exactly.",
      parameters: z.toJSONSchema(boardAddItemInputSchema, { io: "input" }),
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

const getAssistantEvaluationPlacementState = (state: AssistantAttemptState) =>
  resolveCustomWidgetPlacementState(
    state.toolCalls.map((toolCall) => ({
      toolName: toolCall.name,
      input: toolCall.input,
      output: toolCall.output,
    })),
  );

const hasRequiredAssistantEvaluationPlacement = (state: AssistantAttemptState, expectedWidgetCount: number) => {
  if (!state.placement) return true;
  const placedWidgetIds = new Set(
    state.placementEvidence.flatMap(({ widgetId, boardId }) =>
      boardId === state.placement?.targetBoardId ? [widgetId] : [],
    ),
  );
  return placedWidgetIds.size >= expectedWidgetCount;
};

const isAssistantEvaluationComplete = (state: AssistantAttemptState, expectedWidgetCount: number) =>
  state.createdWidgets.length >= expectedWidgetCount &&
  hasRequiredAssistantEvaluationPlacement(state, expectedWidgetCount);

export const getActiveAssistantEvaluationToolDefinitions = (state: AssistantAttemptState) => {
  const availableNames = customWidgetAssistantEvaluationToolDefinitions.flatMap(({ function: definition }) => {
    if (
      !state.integrationDiscoveryEnabled &&
      (definition.name === "integration_getKinds" || definition.name === "integration_all")
    ) {
      return [];
    }
    return [definition.name];
  });
  if (state.placement) {
    const placementToolNames = getCustomWidgetPlacementToolNames(getAssistantEvaluationPlacementState(state));
    if (placementToolNames.length > 0) {
      return customWidgetAssistantEvaluationToolDefinitions.filter(({ function: definition }) =>
        placementToolNames.includes(definition.name),
      );
    }
  }
  const steps = state.toolCalls.map((toolCall) => ({
    toolResults: [{ toolName: toolCall.name, output: toolCall.output }],
  }));
  const phaseToolNames = getCustomWidgetPhaseToolNames(availableNames, steps);
  const activeToolNames = new Set(
    (phaseToolNames ?? [...initiallyActiveAssistantEvaluationTools]).filter((name) => availableNames.includes(name)),
  );
  return customWidgetAssistantEvaluationToolDefinitions.filter(({ function: definition }) =>
    activeToolNames.has(definition.name),
  );
};

export const getAssistantEvaluationToolChoice = (
  state: AssistantAttemptState,
  expectedWidgetCount: number,
): "auto" | "required" => {
  if (state.failure !== null) return "auto";
  if (state.placement && getCustomWidgetPlacementToolNames(getAssistantEvaluationPlacementState(state)).length > 0) {
    return "required";
  }
  if (isAssistantEvaluationComplete(state, expectedWidgetCount)) return "auto";
  const latestToolCall = state.toolCalls.at(-1);
  if (!latestToolCall) return "auto";
  const activeTools = getActiveAssistantEvaluationToolDefinitions(state);
  const hasFollowUpTool = activeTools.some(
    ({ function: definition }) =>
      definition.name.startsWith("customWidget_") && definition.name !== latestToolCall.name,
  );
  if (
    isRecoverableCustomWidgetAuthoringFailure(latestToolCall.name, latestToolCall.output) &&
    activeTools.some(({ function: definition }) => definition.name.startsWith("customWidget_"))
  ) {
    return "required";
  }
  if (!hasFollowUpTool) return "auto";
  if (isSuccessfulCustomWidgetAuthoringAdvance(latestToolCall.name, latestToolCall.output)) return "required";
  return "auto";
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

const sourceNeedsAssistantEvaluationCredentials = (widget: HomarrCustomWidgetV2, sourceId: string) => {
  const source = widget.sources[sourceId];
  if (!source || source.type === "integration" || getCustomWidgetSourceAuthType(source) === "none") return false;
  return Object.values(widget.requests).some((request) => request.source === sourceId && request.auth !== "none");
};

const sourceHasAssistantEvaluationRequests = (widget: HomarrCustomWidgetV2, sourceId: string) =>
  Object.values(widget.requests).some((request) => request.source === sourceId);

const getAssistantEvaluationSourceConfigurations = (
  widget: HomarrCustomWidgetV2,
  sessionId: string,
  configuredSourceIds: ReadonlySet<string>,
) =>
  Object.entries(widget.sources).flatMap(([sourceId, source]) => {
    if (
      source.type === "integration" ||
      configuredSourceIds.has(sourceId) ||
      !sourceHasAssistantEvaluationRequests(widget, sourceId)
    ) {
      return [];
    }
    if (
      !isCustomWidgetSourceUrlPlaceholder(source.baseUrl) &&
      !sourceNeedsAssistantEvaluationCredentials(widget, sourceId)
    ) {
      return [];
    }
    return [
      {
        sourceId,
        nextStep: `Call customWidget_configurationRequestUser with previewSessionId '${sessionId}' and sourceId '${sourceId}' before testing preview requests.`,
      },
    ];
  });

const sourceNeedsAssistantEvaluationUrlConfiguration = (
  source: HomarrCustomWidgetV2["sources"][string] | undefined,
) => {
  if (!source || source.type === "integration") return false;
  return isCustomWidgetSourceUrlPlaceholder(source.baseUrl);
};

const requestNeedsAssistantEvaluationCredentials = (
  preview: PreviewState,
  request: HomarrCustomWidgetV2["requests"][string],
) => {
  const source = preview.widget.sources[request.source];
  return source?.type !== "integration" && request.auth !== "none" && getCustomWidgetSourceAuthType(source) !== "none";
};

const widgetNeedsAssistantEvaluationCredentials = (widget: HomarrCustomWidgetV2) =>
  Object.keys(widget.sources).some((sourceId) => sourceNeedsAssistantEvaluationCredentials(widget, sourceId));

export function completeAssistantEvaluationCredentialRequest(
  state: AssistantAttemptState,
  requestId: string,
  options: { httpStatus?: number } = {},
) {
  const request = state.credentialRequests.get(requestId);
  if (!request || request.status !== "pending") return false;
  const preview = state.previews.get(request.sessionId);
  if (!preview || state.createdPreviewIds.has(request.sessionId)) return false;

  request.status = "completed";
  const source = preview.widget.sources[request.sourceId];
  if (request.configuredSource && source?.type !== "integration") {
    preview.widget = customWidgetDefinitionSchema.parse({
      ...preview.widget,
      sources: {
        ...preview.widget.sources,
        [request.sourceId]: {
          ...source,
          baseUrl: request.configuredSource.baseUrl,
          networkScope: request.configuredSource.networkScope,
        },
      },
    });
    preview.signature = getDefinitionSignature(preview.widget);
  }
  preview.configuredSourceIds.add(request.sourceId);
  preview.configuredSourceHttpStatuses.set(request.sourceId, options.httpStatus ?? 200);
  preview.revision += 1;
  preview.testedQueries.clear();
  preview.testedActions.clear();
  preview.journal = [];
  state.templateLifecycle.recordPreview({
    success: true,
    evidenceReset: true,
    previewSession: { id: request.sessionId, revision: preview.revision },
    persistenceTool: getAssistantEvaluationPersistenceTool(preview),
    ...getAssistantEvaluationPreviewChecklist(preview.widget),
  });
  return true;
}

export function expireAssistantEvaluationCredentialRequest(state: AssistantAttemptState, requestId: string) {
  const request = state.credentialRequests.get(requestId);
  if (!request || request.status !== "pending") return false;
  request.status = "expired";
  return true;
}

export function resumeAssistantEvaluationCredentialRequests(state: AssistantAttemptState) {
  const completedRequestIds = [...state.credentialRequests.values()].flatMap((request) =>
    request.status === "pending" && completeAssistantEvaluationCredentialRequest(state, request.id) ? [request.id] : [],
  );
  if (completedRequestIds.length > 0) state.syntheticCredentialContinues += 1;
  return completedRequestIds;
}

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
    const research = testCase.research;
    const configuredResults = research?.searchResults;
    if (research?.requiresFrozenSearchResults && !configuredResults?.length) {
      throw new Error(
        `Evaluation case '${testCase.id}' requires frozen first-party search results; refusing to substitute apiNotes`,
      );
    }
    return {
      query: typeof input.query === "string" ? input.query : "",
      results: configuredResults ?? [
        {
          title: `${testCase.id} primary API documentation`,
          url: testCase.documentationUrl,
          content: testCase.apiNotes,
          authority: "first-party",
        },
      ],
    };
  }
  if (name === "integration_getKinds") {
    return Object.entries(integrationDefs).map(([kind, definition]) => ({
      kind,
      name: definition.name,
      category: definition.category,
      requiredSecrets: definition.secretKinds,
      supportsHttpRequests: definition.supportsHttpRequests,
    }));
  }
  if (name === "integration_all") {
    return (testCase.availableIntegrations ?? []).map(
      ({ supportsHttpRequests: _supportsHttpRequests, ...integration }) => integration,
    );
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
    const componentName = typeof input.name === "string" ? input.name : "";
    const component = getCustomWidgetComponent(componentName);
    return (
      component ?? {
        error: "Custom JSX component not found",
        recovery: {
          recoverable: true,
          kind: "component-not-found",
          allowedNextTools: [
            "customWidget_findComponents",
            "customWidget_getComponents",
            "customWidget_validateTemplate",
          ],
        },
        nextStep:
          "Do not retry this component name. Replace it with a previously discovered component, or run one focused component search, then validate the corrected template.",
      }
    );
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
    return state.templateLifecycle.recordValidation(input, {
      valid,
      normalizedCharacters,
      diagnostics,
      summary: { characters: template.length, lines: template.split("\n").length },
      nextStep,
    });
  }
  if (name === "customWidget_previewCreate") {
    if (Array.isArray(input.secrets) && input.secrets.length > 0) {
      return {
        error:
          "Assistant preview inputs must not contain credentials. Use secure source configuration before evidence.",
      };
    }
    const mismatch = state.templateLifecycle.getPreviewValidationMismatch(name, input);
    if (mismatch !== null) return mismatch;
    const parsed = parseDefinition(input.definition);
    if (!parsed.success) {
      return state.templateLifecycle.recordInvalidPreview(name, input, {
        error: "Definition is invalid",
        issues: parsed.issues,
        recovery: {
          recoverable: true,
          kind: "preview-validation-required",
          requiredNextTool: "customWidget_validateTemplate",
        },
      });
    }
    if (!state.validatedTemplates.has(parsed.widget.template)) {
      return {
        error: "Validate this exact JSX template before sending the complete definition to preview.",
        recovery: {
          recoverable: true,
          kind: "preview-validation-required",
          requiredNextTool: "customWidget_validateTemplate",
        },
      };
    }
    if (testCase.sourceConfiguration) {
      const source = parsed.widget.sources[testCase.sourceConfiguration.sourceId];
      if (!sourceNeedsAssistantEvaluationUrlConfiguration(source)) {
        return {
          error:
            "The user did not supply this self-hosted URL. Use an explicit example.com placeholder and complete the returned sourceConfigurations flow instead of guessing an address.",
          recovery: {
            recoverable: true,
            kind: "source-placeholder-required",
            requiredNextTool: "customWidget_previewCreate",
          },
        };
      }
    }
    const signature = getDefinitionSignature(parsed.widget);
    if ([...state.previews.values()].some((preview) => preview.signature === signature)) {
      return {
        error:
          "This unchanged definition already has a preview. Make a material improvement before another preview cycle.",
      };
    }
    const id = `preview-${state.previews.size + 1}`;
    const definitionId = typeof input.definitionId === "string" ? input.definitionId : undefined;
    const configuredSourceIds = new Set<string>();
    if (definitionId) {
      for (const [sourceId, source] of Object.entries(parsed.widget.sources)) {
        if (
          source.type !== "integration" &&
          !isCustomWidgetSourceUrlPlaceholder(source.baseUrl) &&
          sourceNeedsAssistantEvaluationCredentials(parsed.widget, sourceId)
        ) {
          configuredSourceIds.add(sourceId);
        }
      }
    }
    state.previews.set(id, {
      widget: parsed.widget,
      definitionId,
      signature,
      revision: 0,
      testedQueries: new Set(),
      testedActions: new Set(),
      configuredSourceIds,
      configuredSourceHttpStatuses: new Map(),
      journal: [],
    });
    return state.templateLifecycle.recordPreview({
      success: true,
      previewSession: { id, revision: 0 },
      previewPath: `/manage/custom-widgets/preview/${id}`,
      persistenceTool: getAssistantEvaluationPersistenceTool({ definitionId }),
      sourceConfigurations: getAssistantEvaluationSourceConfigurations(parsed.widget, id, configuredSourceIds),
      ...getAssistantEvaluationPreviewChecklist(parsed.widget),
    });
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
    if (!templateInput.success) {
      return {
        error: templateInput.error,
        recovery: {
          recoverable: true,
          kind: "preview-validation-required",
          requiredNextTool: "customWidget_validateTemplate",
          preservesPreviewEvidence: true,
        },
      };
    }
    const mismatch = state.templateLifecycle.getPreviewValidationMismatch(name, input);
    if (mismatch !== null) return mismatch;
    if (!state.validatedTemplates.has(templateInput.template)) {
      return {
        error: "Validate this exact revised JSX template before revising the preview.",
        recovery: {
          recoverable: true,
          kind: "preview-validation-required",
          requiredNextTool: "customWidget_validateTemplate",
          preservesPreviewEvidence: true,
        },
      };
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
        recovery: {
          recoverable: true,
          kind: "preview-validation-required",
          requiredNextTool: "customWidget_validateTemplate",
          preservesPreviewEvidence: true,
        },
      };
    }
    const signature = getDefinitionSignature(parsed.data);
    if (signature === preview.signature) {
      const persistenceTool = getAssistantEvaluationPersistenceTool(preview);
      return {
        error: "Revised preview template is unchanged",
        unchanged: true,
        preservesPreviewEvidence: true,
        sessionId,
        recovery: {
          recoverable: true,
          kind: "unchanged-preview-revision",
          allowedNextTools: ["customWidget_validateTemplate", "customWidget_previewReviseTemplate", persistenceTool],
        },
        nextStep:
          "The existing preview and its evidence remain valid. Persist it, or make a distinct correction and validate before revising.",
      };
    }
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
    return state.templateLifecycle.recordPreview({
      success: true,
      evidenceReset: true,
      previewSession: { id: sessionId, revision: preview.revision },
      previewPath: `/manage/custom-widgets/preview/${sessionId}`,
      persistenceTool: getAssistantEvaluationPersistenceTool(preview),
      ...getAssistantEvaluationPreviewChecklist(preview.widget),
    });
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
    const source = preview.widget.sources[request.source];
    if (
      !preview.configuredSourceIds.has(request.source) &&
      (sourceNeedsAssistantEvaluationUrlConfiguration(source) ||
        requestNeedsAssistantEvaluationCredentials(preview, request))
    ) {
      return {
        sessionId,
        requestId,
        sourceId: request.source,
        ok: false,
        status: 0,
        statusText: "Configuration required",
        data: null,
        error: `Source '${request.source}' requires secure URL or credential configuration before preview testing.`,
        requiredNextTool: "customWidget_configurationRequestUser",
      };
    }
    if (requestNeedsAssistantEvaluationCredentials(preview, request)) {
      const sourceId = request.source;
      const configuredStatus = preview.configuredSourceHttpStatuses.get(sourceId) ?? 200;
      if (configuredStatus < 200 || configuredStatus >= 300) {
        preview.journal.push({
          requestId,
          kind: "query",
          method: request.method,
          path: request.path,
          status: configuredStatus,
          simulated: false,
        });
        return {
          sessionId,
          requestId,
          sourceId,
          ok: false,
          status: configuredStatus,
          statusText: configuredStatus === 403 ? "Forbidden" : "Authentication failed",
          error: `HTTP ${configuredStatus}: Authentication failed`,
        };
      }
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
    return state.templateLifecycle.recordEvidence(name, {
      sessionId,
      requestId,
      sourceId: request.source,
      ok: true,
      status: 200,
      data: response,
      request: { method: request.method, path: request.path },
    });
  }
  if (name === "customWidget_configurationRequestUser") {
    if (typeof input.requestId === "string") {
      const request = state.credentialRequests.get(input.requestId);
      if (!request || request.status === "expired") {
        return {
          error: "Source configuration request expired or was not found",
          requestId: input.requestId,
          status: "expired",
          recovery: {
            recoverable: true,
            kind: "expired-source-configuration-request",
            requiredNextTool: "customWidget_configurationRequestUser",
          },
          nextStep:
            "This source-configuration request is no longer available. Create a replacement request with the original previewSessionId and sourceId; do not reuse this requestId.",
        };
      }
      if (input.previewSessionId !== undefined || input.sourceId !== undefined) {
        return { error: "Status checks only accept requestId" };
      }
      if (request.status === "completed") request.checkedCompleted = true;
      return {
        requestId: request.id,
        status: request.status,
        previewSessionId: request.sessionId,
        sourceId: request.sourceId,
      };
    }
    const sessionId = typeof input.previewSessionId === "string" ? input.previewSessionId : "";
    const sourceId = typeof input.sourceId === "string" ? input.sourceId : "";
    const preview = state.previews.get(sessionId);
    const source = preview?.widget.sources[sourceId];
    if (!preview || !source) return { error: "Preview source was not found" };
    const requiresUrlConfiguration = sourceNeedsAssistantEvaluationUrlConfiguration(source);
    const requiresCredentials = source.type !== "integration" && getCustomWidgetSourceAuthType(source) !== "none";
    if (source.type === "integration" || (!requiresUrlConfiguration && !requiresCredentials)) {
      return { error: "This preview source does not need user configuration" };
    }
    const configuredSource = requiresUrlConfiguration ? testCase.sourceConfiguration : undefined;
    if (requiresUrlConfiguration && configuredSource?.sourceId !== sourceId) {
      return { error: `No deterministic source configuration is configured for '${sourceId}'` };
    }
    const existing = [...state.credentialRequests.values()].find(
      (request) => request.sessionId === sessionId && request.sourceId === sourceId && request.status !== "expired",
    );
    if (existing) {
      return {
        error: `A source configuration request already exists; check requestId '${existing.id}' instead`,
        requestId: existing.id,
        status: existing.status,
        previewSessionId: existing.sessionId,
        sourceId: existing.sourceId,
      };
    }
    const request: AssistantEvaluationCredentialRequest = {
      id: `configuration-${state.credentialRequests.size + 1}`,
      sessionId,
      sourceId,
      status: "pending",
      checkedCompleted: false,
      ...(configuredSource
        ? {
            configuredSource: {
              baseUrl: configuredSource.baseUrl,
              networkScope: configuredSource.networkScope,
            },
          }
        : {}),
    };
    state.credentialRequests.set(request.id, request);
    return {
      requestId: request.id,
      status: request.status,
      previewSessionId: request.sessionId,
      sourceId: request.sourceId,
      url: `https://homarr.test/custom-widget-configuration/${request.id}`,
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
    const source = preview.widget.sources[request.source];
    if (
      !preview.configuredSourceIds.has(request.source) &&
      (sourceNeedsAssistantEvaluationUrlConfiguration(source) ||
        requestNeedsAssistantEvaluationCredentials(preview, request))
    ) {
      return {
        sessionId,
        requestId,
        sourceId: request.source,
        ok: false,
        status: 0,
        statusText: "Configuration required",
        data: null,
        simulated: false,
        error: `Source '${request.source}' requires secure URL or credential configuration before preview testing.`,
        requiredNextTool: "customWidget_configurationRequestUser",
      };
    }
    if (requestNeedsAssistantEvaluationCredentials(preview, request)) {
      const configuredStatus = preview.configuredSourceHttpStatuses.get(request.source) ?? 200;
      if (configuredStatus < 200 || configuredStatus >= 300) {
        return {
          sessionId,
          requestId,
          sourceId: request.source,
          ok: false,
          status: configuredStatus,
          statusText: configuredStatus === 403 ? "Forbidden" : "Authentication failed",
          error: `HTTP ${configuredStatus}: Authentication failed`,
        };
      }
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
    return state.templateLifecycle.recordEvidence(name, {
      sessionId,
      requestId,
      sourceId: request.source,
      ok: true,
      status: 0,
      statusText: "Simulated",
      data: null,
      simulated: true,
    });
  }
  if (name === "customWidget_previewJournal") {
    const sessionId = typeof input.sessionId === "string" ? input.sessionId : "";
    const preview = state.previews.get(sessionId);
    if (!preview) return { error: "Preview session not found" };
    return { entries: preview.journal };
  }
  if (name === "customWidget_createFromPreview" || name === "customWidget_updateFromPreview") {
    const sessionId = typeof input.previewSessionId === "string" ? input.previewSessionId : "";
    const preview = state.previews.get(sessionId);
    if (!preview) return { error: "Preview session not found" };
    if (state.createdPreviewIds.has(sessionId)) return { error: "This preview was already persisted" };
    if (name === "customWidget_createFromPreview" && preview.definitionId) {
      return { error: "This edit preview must update its existing custom widget with customWidget_updateFromPreview" };
    }
    if (name === "customWidget_updateFromPreview" && !preview.definitionId) {
      return { error: "This preview is not associated with an existing custom widget definition" };
    }
    const uncheckedCredentialRequest = [...state.credentialRequests.values()].find(
      (request) =>
        request.sessionId === sessionId && request.status === "completed" && request.checkedCompleted === false,
    );
    if (uncheckedCredentialRequest) {
      return {
        error: `Check completed source configuration request '${uncheckedCredentialRequest.id}' before persistence`,
      };
    }
    const unresolvedSourceId = Object.entries(preview.widget.sources).find(
      ([sourceId, source]) =>
        !preview.configuredSourceIds.has(sourceId) &&
        sourceHasAssistantEvaluationRequests(preview.widget, sourceId) &&
        (sourceNeedsAssistantEvaluationUrlConfiguration(source) ||
          sourceNeedsAssistantEvaluationCredentials(preview.widget, sourceId)),
    )?.[0];
    if (unresolvedSourceId) {
      return { error: `Configure preview source '${unresolvedSourceId}' before persistence` };
    }
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
    const targetBoardId = typeof input.targetBoardId === "string" ? input.targetBoardId : undefined;
    if (testCase.placement && targetBoardId !== testCase.placement.targetBoardId) {
      return {
        error: `Persist this preview with targetBoardId '${testCase.placement.targetBoardId}' so the requested placement can be verified.`,
        recovery: {
          recoverable: true,
          kind: "placement-target-required",
          requiredNextTool: "customWidget_createFromPreview",
        },
      };
    }
    if (!testCase.placement && targetBoardId !== undefined) {
      return { error: "This evaluation case does not provide a known target board." };
    }
    const widget = customWidgetDefinitionSchema.parse(preview.widget);
    state.createdPreviewIds.add(sessionId);
    state.createdWidgets.push(widget);
    if (name === "customWidget_updateFromPreview") {
      return {
        id: preview.definitionId,
        managementPath: `/manage/custom-widgets/edit/${preview.definitionId}`,
      };
    }
    const createdId = `created-${testCase.id}-${state.createdWidgets.length}`;
    return {
      id: createdId,
      managementPath: `/manage/custom-widgets/edit/${createdId}`,
      nextAction: {
        type: "place-custom-widget",
        widgetKind: "customApi",
        options: { definitionId: createdId },
        ...(targetBoardId ? { targetBoardId } : {}),
        whenTargetIsKnown: "Call configure_widget now with the requested board and these exact widget options.",
        whenTargetIsUnknown:
          "Call ask_user now with 'Place on a board' and 'Leave unplaced'. Never ask this choice in prose.",
      },
    };
  }
  if (name === "configure_widget") {
    const placementState = getAssistantEvaluationPlacementState(state);
    if (!state.placement || placementState.status !== "configure") {
      return { error: "No created Custom Widget is awaiting native configuration." };
    }
    const parsed = configureWidgetInputSchema.safeParse(input);
    if (!parsed.success) return { error: "Widget configuration is invalid", issues: parsed.error.issues };
    if (
      parsed.data.boardId !== state.placement.targetBoardId ||
      parsed.data.boardName !== state.placement.targetBoardName
    ) {
      return { error: "Use the known target board ID and name supplied by this evaluation case." };
    }
    if (parsed.data.kind !== "customApi" || parsed.data.options?.definitionId !== placementState.definitionId) {
      return { error: "Configure the created Custom Widget with the exact definitionId from nextAction." };
    }
    return {
      boardId: parsed.data.boardId,
      kind: parsed.data.kind,
      options: parsed.data.options ?? {},
      integrationIds: parsed.data.integrationIds ?? [],
    };
  }
  if (name === "board_addItem") {
    const placementState = getAssistantEvaluationPlacementState(state);
    if (!state.placement || placementState.status !== "board-add") {
      return { error: "No configured Custom Widget is awaiting board placement." };
    }
    const parsed = boardAddItemInputSchema.safeParse(input);
    if (!parsed.success) return { error: "Board item input is invalid", issues: parsed.error.issues };
    const configured = state.toolCalls.findLast(
      (toolCall) => toolCall.name === "configure_widget" && isRecord(toolCall.output) && !("error" in toolCall.output),
    )?.output;
    if (!isRecord(configured)) return { error: "Configure the widget before adding it to the board." };
    const expectedInput = {
      boardId: configured.boardId,
      kind: configured.kind,
      options: configured.options,
      integrationIds: configured.integrationIds,
    };
    if (JSON.stringify(parsed.data) !== JSON.stringify(expectedInput)) {
      return { error: "Use the configure_widget result exactly with board_addItem." };
    }
    const itemId = `item-${testCase.id}-${state.placementEvidence.length + 1}`;
    state.placementEvidence.push({
      widgetId: placementState.widgetId,
      boardId: parsed.data.boardId,
      itemId,
    });
    return { itemId };
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
      const issuePath = typeof entry.path === "string" ? `${entry.path}: ` : "";
      messages.push(`${issuePath}${entry.message}`);
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
  if (state.placement === undefined && testCase.placement) state.placement = testCase.placement;
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
  const required = ["customWidget_getSkill", "customWidget_validateTemplate", "customWidget_previewCreate"];
  const hasQueries = state.createdWidgets.some((widget) =>
    Object.values(widget.requests).some((request) => request.kind === "query"),
  );
  const hasActions = state.createdWidgets.some((widget) =>
    Object.values(widget.requests).some((request) => request.kind === "action"),
  );
  const hasAuthenticatedHttpSource = state.createdWidgets.some(widgetNeedsAssistantEvaluationCredentials);
  const hasSourceConfigurationRequests = state.credentialRequests.size > 0;
  if (hasQueries) required.push("customWidget_previewQuery");
  if (hasActions) required.push("customWidget_previewAction");
  if (hasAuthenticatedHttpSource || hasSourceConfigurationRequests) {
    required.push("customWidget_configurationRequestUser");
  }
  const issues = required.flatMap((name) =>
    state.calledTools.includes(name) ? [] : [`The assistant never called ${name}.`],
  );
  if (
    !state.calledTools.includes("customWidget_createFromPreview") &&
    !state.calledTools.includes("customWidget_updateFromPreview")
  ) {
    issues.push("The assistant never called customWidget_createFromPreview or customWidget_updateFromPreview.");
  }
  const expectedWidgetCount = getExpectedWidgetCount(testCase);
  if (state.createdWidgets.length !== expectedWidgetCount) {
    issues.push(`The assistant created ${state.createdWidgets.length} of ${expectedWidgetCount} required widgets.`);
  }
  const placedWidgetIds = new Set(
    state.placementEvidence.flatMap(({ widgetId, boardId }) =>
      boardId === testCase.placement?.targetBoardId ? [widgetId] : [],
    ),
  );
  if (testCase.placement && placedWidgetIds.size !== expectedWidgetCount) {
    issues.push(
      `The assistant placed ${placedWidgetIds.size} of ${expectedWidgetCount} required widgets on '${testCase.placement.targetBoardName}'.`,
    );
  }
  if (testCase.research && state.calledTools.filter((name) => name === "web_search").length !== 1) {
    issues.push("The assistant must perform one primary-documentation search for this unknown service.");
  }
  const webSearchCall = state.toolCalls.find((toolCall) => toolCall.name === "web_search");
  const webSearchQuery = typeof webSearchCall?.input.query === "string" ? webSearchCall.input.query.toLowerCase() : "";
  for (const term of testCase.research?.requiredQueryTerms ?? []) {
    if (!webSearchQuery.includes(term.toLowerCase())) {
      issues.push(`The primary-documentation search omitted required term '${term}'.`);
    }
  }
  for (const term of testCase.research?.forbiddenQueryTerms ?? []) {
    if (webSearchQuery.includes(term.toLowerCase())) {
      issues.push(`The primary-documentation search included forbidden term '${term}'.`);
    }
  }
  for (const reference of testCase.research?.requiredReferences ?? []) {
    const loaded = state.toolCalls.some(
      (toolCall) => toolCall.name === "customWidget_getReference" && toolCall.input.name === reference,
    );
    if (!loaded) issues.push(`The assistant never loaded the required '${reference}' reference.`);
  }
  if (testCase.expectations?.sourceType === "integration") {
    for (const toolName of ["integration_getKinds", "integration_all"]) {
      if (!state.calledTools.includes(toolName)) issues.push(`The assistant never called ${toolName}.`);
    }
  }
  if (hasAuthenticatedHttpSource || hasSourceConfigurationRequests) {
    if (state.syntheticCredentialContinues === 0) {
      issues.push("The assistant never paused for secure source configuration and resumed on Continue.");
    }
    for (const request of state.credentialRequests.values()) {
      const recovered =
        request.status === "expired" &&
        [...state.credentialRequests.values()].some(
          (candidate) =>
            candidate !== request &&
            candidate.sessionId === request.sessionId &&
            candidate.sourceId === request.sourceId &&
            candidate.status === "completed" &&
            candidate.checkedCompleted,
        );
      if (recovered) continue;
      if (request.status !== "completed" || !request.checkedCompleted) {
        issues.push(`The assistant did not verify completed source configuration request '${request.id}'.`);
      }
    }
  }
  for (const toolCall of state.toolCalls.filter((candidate) => candidate.name === "customWidget_previewCreate")) {
    if (Array.isArray(toolCall.input.secrets) && toolCall.input.secrets.length > 0) {
      issues.push("The assistant sent plaintext credentials through customWidget_previewCreate.");
    }
  }
  const finalResponse = testCase.finalResponse;
  issues.push(
    ...assessAssistantFinalResponse({
      text: state.finalText,
      persistedWidgets: state.createdWidgets,
      maxCharacters: finalResponse?.maxCharacters ?? 600,
      requiredTerms: finalResponse?.requiredTerms ?? [],
      requiredPhrasesAny: finalResponse?.requiredPhrasesAny,
      forbiddenPhrases: finalResponse?.forbiddenPhrases,
      placementEvidence: state.placementEvidence,
    }).issues,
  );
  return issues;
}

export function assessAssistantFinalResponse(args: {
  text: string;
  persistedWidgets: readonly HomarrCustomWidgetV2[];
  maxCharacters: number;
  requiredTerms: readonly string[];
  requiredPhrasesAny?: readonly string[];
  forbiddenPhrases?: readonly string[];
  placementEvidence?: readonly AssistantEvaluationPlacementEvidence[];
}) {
  const response = args.text.trim();
  const words = response.length === 0 ? 0 : response.split(/\s+/u).length;
  const issues: string[] = [];
  if (response.length === 0) issues.push("The assistant did not return a final user-facing response.");
  if (response.length > args.maxCharacters) {
    issues.push(`The final response used ${response.length} characters; the limit is ${args.maxCharacters}.`);
  }
  if (response.length > 0 && words < 8) issues.push("The final response is too terse to hand off the created widget.");
  if (words > 80) issues.push("The final response exceeds the 80-word handoff limit.");
  if (/[\r\n]/u.test(response) || /```/u.test(response)) {
    issues.push("The final response must be one short paragraph without headings, lists, or code fences.");
  }
  if (!/\b(?:created|saved|updated)\b/iu.test(response)) {
    issues.push("The final response must state that the widget was created, saved, or updated.");
  }
  if (
    !/\b(?:shows?|showing|displays?|displaying|summari[sz](?:es|ing)|tracks?|tracking|lists?|listing|surfaces?|surfacing|highlights?|highlighting|reports?|reporting|monitors?|monitoring|provides?|providing)\b/iu.test(
      response,
    )
  ) {
    issues.push("The final response must briefly state what data or capability the widget shows.");
  }
  const statesRefreshBehavior = /\b(?:refresh(?:es|ed|ing)?|reload(?:s|ed|ing)?|rerun(?:s|ning)?)\b/iu.test(response);
  const statesUpdateBehavior =
    /\bupdates?\b[^.\n]{0,40}\b(?:automatically|manually|on demand|after|when|every)\b/iu.test(response) ||
    /\b(?:automatically|manually|on demand|after|when|every)\b[^.\n]{0,40}\bupdates?\b/iu.test(response);
  if (!statesRefreshBehavior && !statesUpdateBehavior) {
    issues.push("The final response must briefly state refresh or update behavior.");
  }
  const namesToRequire = args.persistedWidgets.length <= 4 ? args.persistedWidgets.map(({ name }) => name) : [];
  for (const name of namesToRequire) {
    if (!response.toLowerCase().includes(name.toLowerCase()))
      issues.push(`The final response omitted widget '${name}'.`);
  }
  for (const term of args.requiredTerms) {
    if (!response.toLowerCase().includes(term.toLowerCase())) issues.push(`The final response omitted '${term}'.`);
  }
  if (
    args.requiredPhrasesAny?.length &&
    !args.requiredPhrasesAny.some((phrase) => response.toLowerCase().includes(phrase.toLowerCase()))
  ) {
    issues.push(`The final response omitted a required phrase: ${args.requiredPhrasesAny.join("; ")}.`);
  }
  for (const phrase of args.forbiddenPhrases ?? []) {
    if (!response.toLowerCase().includes(phrase.toLowerCase())) continue;
    issues.push(`The final response made the forbidden claim '${phrase}'.`);
  }
  if (/"(?:schemaVersion|sources|requests|template)"\s*:|<Stack\b|customWidget_/u.test(response)) {
    issues.push("The final response dumped implementation or tool data instead of a concise handoff.");
  }
  if (/\b(?:added|placed)\b[^.\n]{0,40}\b(?:board|dashboard)\b/iu.test(response) && !args.placementEvidence?.length) {
    issues.push("The final response claimed board placement without placement evidence.");
  }
  return { passed: issues.length === 0, issues, words, characters: response.length };
}

export function getAssistantEvaluationEfficiencyIssues(
  testCase: CustomWidgetAiEvaluationCase,
  state: AssistantAttemptState,
) {
  const issues: string[] = [];
  if (state.toolStepNarrations.length > 0) {
    issues.push(
      `The assistant included visible narration in ${state.toolStepNarrations.length} tool-call step${state.toolStepNarrations.length === 1 ? "" : "s"}; tool-call steps must contain no prose.`,
    );
  }
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
  for (const toolCall of state.toolCalls.filter(
    (candidate) =>
      candidate.name === "customWidget_createFromPreview" || candidate.name === "customWidget_updateFromPreview",
  )) {
    const allowedInputKeys = ["previewSessionId"];
    if (toolCall.name === "customWidget_createFromPreview") allowedInputKeys.push("targetBoardId");
    if (Object.keys(toolCall.input).some((key) => !allowedInputKeys.includes(key))) {
      issues.push("The assistant resent definition data while persisting a tested preview.");
    }
  }
  return issues;
}

export function createAssistantEvaluationState(
  integrationDiscoveryEnabled = false,
  placement?: CustomWidgetAiPlacementFixture,
): AssistantAttemptState {
  return {
    integrationDiscoveryEnabled,
    placement,
    placementEvidence: [],
    calledTools: [],
    toolCalls: [],
    validatedTemplates: new Set(),
    templateLifecycle: createCustomWidgetTemplateLifecycleController(),
    previews: new Map(),
    credentialRequests: new Map(),
    syntheticCredentialContinues: 0,
    completedPreviewSignatures: new Set(),
    createdPreviewIds: new Set(),
    createdWidgets: [],
    modelInputTokens: 0,
    modelOutputTokens: 0,
    modelReportedCostUsd: 0,
    modelAccountedCostUsd: 0,
    modelCostExact: true,
    elapsedMs: 0,
    toolStepNarrations: [],
    finalText: "",
    failure: null,
    retryFeedback: [],
  };
}

function buildAssistantPrompt(testCase: CustomWidgetAiEvaluationCase, feedback: readonly string[]) {
  const sections = [testCase.request];
  if (testCase.availableIntegrations?.length) {
    sections.push(
      "Use integration_getKinds and integration_all to discover and reuse the compatible saved integration. Do not ask for its URL or credentials again.",
    );
  }
  if (testCase.placement) {
    sections.push(
      `After the tested preview is ready, persist it with targetBoardId '${testCase.placement.targetBoardId}', then complete configure_widget and board_addItem for the known '${testCase.placement.targetBoardName}' board before claiming placement.`,
    );
  }
  if (testCase.research) {
    sections.push(
      `The API contract was not supplied in the conversation. Use web_search once for this unknown service with a focused primary-documentation query and reuse that result across its widgets.`,
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
  sections.push(
    `After persistence, return one concise user-facing paragraph of at most ${testCase.finalResponse?.maxCharacters ?? 600} characters. Name what was created, state what it shows, and summarize refresh or update behavior plus any real setup or privilege limitation without dumping the manifest or tool narration. Tool-call steps must contain no user-facing prose.`,
  );
  return sections.join("\n\n");
}

async function callAssistantStep(args: {
  apiKey: string;
  baseUrl?: string;
  model: string;
  messages: OpenRouterMessage[];
  tools: ToolDefinition[];
  toolChoice: "auto" | "required";
  timeoutMs: number;
  onCost: (accountedCostUsd: number, reportedCostUsd: number | null) => void;
}) {
  assertLiveAiEvaluationSpendCap(aiEvaluationSpendBudget, args.baseUrl);
  const activeToolNames = args.tools.map(({ function: definition }) => definition.name);
  const compactedMessages = compactAssistantEvaluationMessages(args.messages);
  const messages = compactedMessages.map((message, index) => {
    if (index !== 0 || message.role !== "system") return message;
    if (activeToolNames.length === 0) return message;
    return {
      ...message,
      content: appendActiveCustomWidgetToolInstruction(message.content, activeToolNames),
    };
  });
  const maxOutputTokens = getAssistantEvaluationMaxOutputTokens(process.env.CUSTOM_WIDGET_AI_MAX_OUTPUT_TOKENS);
  const requestBody = {
    model: args.model,
    messages,
    ...(args.tools.length > 0
      ? {
          tools: args.tools,
          ...assistantEvaluationToolRequestOptions,
          tool_choice: args.toolChoice,
        }
      : {}),
    temperature: assistantEvaluationTemperature,
    max_tokens: maxOutputTokens,
    reasoning: getAssistantEvaluationReasoningOptions(process.env.CUSTOM_WIDGET_AI_REASONING_EFFORT, args.model),
    ...(assistantEvaluationProviderPreferences ? { provider: assistantEvaluationProviderPreferences } : {}),
  };
  const deadline = Date.now() + args.timeoutMs;
  let lastError: unknown = null;
  for (let attempt = 0; attempt <= assistantExecutionPolicy.maxRetries; attempt += 1) {
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) throw lastError ?? new Error("AI provider request exceeded the production step timeout");
    const reservation = aiEvaluationSpendBudget.reserve();
    const boundedRequest = withAiEvaluationProviderSpendCeiling(requestBody, reservation);
    let settled = false;
    const settle = (cost?: number) => {
      if (settled) return;
      settled = true;
      const hasReportedCost = typeof cost === "number" && Number.isFinite(cost) && cost >= 0;
      const reportedCost = hasReportedCost ? cost : null;
      const accountedCost = reportedCost ?? reservation;
      aiEvaluationSpendBudget.settle(reservation, reportedCost ?? undefined);
      args.onCost(accountedCost, reportedCost);
    };
    try {
      const response = await fetch(getAiProviderChatCompletionsUrl(args.baseUrl), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${args.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://homarr.dev",
          "X-Title": "Homarr Custom Widget Assistant Evaluation",
        },
        body: JSON.stringify(boundedRequest.requestBody),
        signal: AbortSignal.timeout(remainingMs),
      });
      const payload = (await response.json().catch(() => ({}))) as OpenRouterResponse;
      settle(payload.usage?.cost);
      if (!response.ok) {
        const error = new Error(
          `AI provider request failed (${response.status}): ${payload.error?.message ?? "Unknown error"}`,
        );
        lastError = error;
        if (!isAssistantEvaluationRetryableStatus(response.status) || attempt >= assistantExecutionPolicy.maxRetries) {
          throw error;
        }
      } else {
        const message = payload.choices?.[0]?.message;
        if (!message) throw new Error("AI provider returned no assistant message");
        return {
          message,
          inputTokens: payload.usage?.prompt_tokens ?? 0,
          outputTokens: payload.usage?.completion_tokens ?? 0,
        };
      }
    } catch (error) {
      settle();
      lastError = error;
      const isProviderStatusError =
        error instanceof Error && /^AI provider request failed \(\d+\):/u.test(error.message);
      const isTimeout = error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
      const isNetworkError = error instanceof TypeError;
      if (isProviderStatusError || isTimeout || !isNetworkError || attempt >= assistantExecutionPolicy.maxRetries) {
        throw error;
      }
    }
    const retryDelayMs = 2_000 * 2 ** attempt;
    if (Date.now() + retryDelayMs >= deadline) {
      throw lastError ?? new Error("AI provider retry exceeded the production step timeout");
    }
    await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
  }
  throw lastError ?? new Error("AI provider request failed");
}

async function runAssistantAttempt(args: {
  testCase: CustomWidgetAiEvaluationCase;
  apiKey: string;
  baseUrl?: string;
  model: string;
  stagingInstruction: string;
  assistantPolicy: string;
  feedback: readonly string[];
}) {
  const startedAt = Date.now();
  let requestStartedAt = startedAt;
  let requestStep = 0;
  const state = createAssistantEvaluationState(
    (args.testCase.availableIntegrations?.length ?? 0) > 0,
    args.testCase.placement,
  );
  const messages: OpenRouterMessage[] = [
    {
      role: "system",
      content: buildAssistantEvaluationSystemPrompt(
        args.assistantPolicy,
        getExpectedWidgetCount(args.testCase),
        args.stagingInstruction,
      ),
    },
    { role: "user", content: buildAssistantPrompt(args.testCase, args.feedback) },
  ];

  while (requestStep < assistantExecutionPolicy.maxSteps) {
    requestStep += 1;
    const remainingTotalMs = assistantExecutionPolicy.totalTimeoutMs - (Date.now() - requestStartedAt);
    if (remainingTotalMs <= 0) {
      state.failure = `The assistant exceeded the production total timeout of ${assistantExecutionPolicy.totalTimeoutMs}ms.`;
      break;
    }
    let stepResult: Awaited<ReturnType<typeof callAssistantStep>>;
    try {
      let tools = getActiveAssistantEvaluationToolDefinitions(state);
      if (isAssistantEvaluationComplete(state, getExpectedWidgetCount(args.testCase))) {
        tools = [];
      }
      stepResult = await callAssistantStep({
        apiKey: args.apiKey,
        baseUrl: args.baseUrl,
        model: args.model,
        messages,
        tools,
        toolChoice: getAssistantEvaluationToolChoice(state, getExpectedWidgetCount(args.testCase)),
        timeoutMs: getAssistantEvaluationStepTimeoutMs(
          process.env.CUSTOM_WIDGET_AI_REQUEST_TIMEOUT_MS,
          remainingTotalMs,
        ),
        onCost: (accountedCostUsd, reportedCostUsd) => {
          state.modelAccountedCostUsd += accountedCostUsd;
          if (reportedCostUsd === null) {
            state.modelCostExact = false;
            return;
          }
          state.modelReportedCostUsd += reportedCostUsd;
        },
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
    if (message.tool_calls?.length && (message.content ?? "").trim()) {
      state.toolStepNarrations.push((message.content ?? "").trim());
    }
    if (!message.tool_calls || message.tool_calls.length === 0) {
      const pendingCredentialRequests = [...state.credentialRequests.values()].filter(
        (request) => request.status === "pending",
      );
      if (pendingCredentialRequests.length > 0) {
        resumeAssistantEvaluationCredentialRequests(state);
        messages.push({
          role: "user",
          content: "Continue. I completed the secure source configuration request.",
        });
        requestStartedAt = Date.now();
        requestStep = 0;
        continue;
      }
      state.finalText = message.content ?? "";
      if (!isAssistantEvaluationComplete(state, getExpectedWidgetCount(args.testCase))) {
        const placementDetail = args.testCase.placement
          ? ` and placing ${state.placementEvidence.length} of ${getExpectedWidgetCount(args.testCase)}`
          : "";
        state.failure = `The model stopped with prose after creating ${state.createdWidgets.length} of ${getExpectedWidgetCount(args.testCase)}${placementDetail} required widgets.`;
      }
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
  }
  if (
    requestStep >= assistantExecutionPolicy.maxSteps &&
    state.failure === null &&
    !isAssistantEvaluationComplete(state, getExpectedWidgetCount(args.testCase))
  ) {
    state.failure = `The assistant exceeded the production request limit of ${assistantExecutionPolicy.maxSteps} steps.`;
  }
  state.elapsedMs = Date.now() - startedAt;
  return { state, messages };
}

export function buildAssistantEvaluationSystemPrompt(
  assistantPolicy: string,
  expectedWidgetCount: number,
  stagingInstruction = CUSTOM_WIDGET_TOOL_STAGING_INSTRUCTION,
) {
  return `${stagingInstruction}\n\n${assistantPolicy}\n\nThis is a production-equivalent tool-use evaluation. The lifecycle controller may require one active tool after an actionable or recoverable result. Complete and persist all ${expectedWidgetCount} requested widget jobs before returning prose.`;
}

export function createAssistantEvaluationPromptSnapshot(args: {
  text: string;
  source: "built-in" | "candidate-file";
  sourceFile: string | null;
}) {
  return Object.freeze({
    ...args,
    sha256: createHash("sha256").update(args.text, "utf8").digest("hex"),
  });
}

export function createAssistantEvaluationCaseSnapshot<TCase extends { id: string }>(cases: readonly TCase[]) {
  const caseIds = Object.freeze(cases.map((testCase) => testCase.id));
  return Object.freeze({
    caseIds,
    sha256: createHash("sha256").update(JSON.stringify(cases), "utf8").digest("hex"),
  });
}

const getAssistantEfficiency = (state: AssistantAttemptState) => ({
  toolCalls: state.toolCalls.length,
  toolInputCharacters: state.toolCalls.reduce((sum, toolCall) => sum + toolCall.inputCharacters, 0),
  toolOutputCharacters: state.toolCalls.reduce((sum, toolCall) => sum + toolCall.outputCharacters, 0),
  modelInputTokens: state.modelInputTokens,
  modelOutputTokens: state.modelOutputTokens,
  modelCostUsd: state.modelCostExact ? state.modelReportedCostUsd : null,
  modelAccountedCostUsd: state.modelAccountedCostUsd,
  modelCostExact: state.modelCostExact,
  elapsedMs: state.elapsedMs,
});

const getCumulativeAssistantEfficiency = (states: readonly AssistantAttemptState[]) => {
  const efficiencies = states.map(getAssistantEfficiency);
  const modelCostExact = efficiencies.every((efficiency) => efficiency.modelCostExact);
  return {
    toolCalls: efficiencies.reduce((total, efficiency) => total + efficiency.toolCalls, 0),
    toolInputCharacters: efficiencies.reduce((total, efficiency) => total + efficiency.toolInputCharacters, 0),
    toolOutputCharacters: efficiencies.reduce((total, efficiency) => total + efficiency.toolOutputCharacters, 0),
    modelInputTokens: efficiencies.reduce((total, efficiency) => total + efficiency.modelInputTokens, 0),
    modelOutputTokens: efficiencies.reduce((total, efficiency) => total + efficiency.modelOutputTokens, 0),
    modelCostUsd: modelCostExact
      ? efficiencies.reduce((total, efficiency) => total + (efficiency.modelCostUsd ?? 0), 0)
      : null,
    modelAccountedCostUsd: efficiencies.reduce((total, efficiency) => total + efficiency.modelAccountedCostUsd, 0),
    modelCostExact,
    elapsedMs: efficiencies.reduce((total, efficiency) => total + efficiency.elapsedMs, 0),
  };
};

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

export function selectAssistantEvaluationLifecycleEvidence(
  bestWidgets: readonly HomarrCustomWidgetV2[],
  bestCalledTools: readonly string[],
  attemptStates: readonly AssistantAttemptState[],
) {
  if (bestWidgets.length > 0) {
    return { widgets: [...bestWidgets], calledTools: [...bestCalledTools] };
  }
  let evidenceState = attemptStates.at(-1) ?? null;
  for (const state of attemptStates) {
    if (state.createdWidgets.length <= (evidenceState?.createdWidgets.length ?? 0)) continue;
    evidenceState = state;
  }
  return {
    widgets: [...(evidenceState?.createdWidgets ?? [])],
    calledTools: [...(evidenceState?.calledTools ?? [])],
  };
}

const getAssistantEvaluationLifecycleEvidenceIndex = (attemptStates: readonly AssistantAttemptState[]) => {
  if (attemptStates.length === 0) return -1;
  let evidenceIndex = attemptStates.length - 1;
  for (const [index, state] of attemptStates.entries()) {
    const evidenceState = attemptStates[evidenceIndex];
    if (state.createdWidgets.length <= (evidenceState?.createdWidgets.length ?? 0)) continue;
    evidenceIndex = index;
  }
  return evidenceIndex;
};

export async function evaluateCustomWidgetAssistantCase(args: {
  testCase: CustomWidgetAiEvaluationCase;
  apiKey: string;
  baseUrl?: string;
  outputRoot: string;
  maxLoops: number;
  generatorModel?: string;
  judgeModel?: string;
  stagingInstruction?: string;
  assistantPolicy?: string;
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
  let bestAttempt: number | null = null;
  let bestCalledTools: string[] = [];
  let lastAttemptState: AssistantAttemptState | null = null;
  const attemptStates: AssistantAttemptState[] = [];
  const attemptStateNumbers: number[] = [];
  let bestEfficiency: ReturnType<typeof getAssistantEfficiency> = {
    toolCalls: 0,
    toolInputCharacters: 0,
    toolOutputCharacters: 0,
    modelInputTokens: 0,
    modelOutputTokens: 0,
    modelCostUsd: null,
    modelAccountedCostUsd: 0,
    modelCostExact: false,
    elapsedMs: 0,
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
        stagingInstruction: args.stagingInstruction ?? CUSTOM_WIDGET_TOOL_STAGING_INSTRUCTION,
        assistantPolicy: args.assistantPolicy ?? CUSTOM_WIDGET_ASSISTANT_POLICY,
        feedback: composeAssistantEvaluationFeedback(deterministicFeedback, reviewFeedback, lifecycleFeedback),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown assistant evaluation error";
      errors.push(`Attempt ${attempt}: ${message}`);
      replaceAssistantEvaluationFeedback(lifecycleFeedback, [message]);
      continue;
    }
    lastAttemptState = run.state;
    attemptStates.push(run.state);
    attemptStateNumbers.push(attempt);
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
        const judgeBasename = `judge-${attempt}-${match.expectedWidgetId}`;
        const { raw: judgeRaw, result: judgeResult } = await judgeCustomWidgetCase({
          testCase: match.testCase,
          widget,
          apiKey: args.apiKey,
          baseUrl: args.baseUrl,
          judgeModel: args.judgeModel,
          onResponse: async (requestAttempt, raw) => {
            await writeFile(path.join(caseDirectory, `${judgeBasename}.request-${requestAttempt}.json`), raw, "utf8");
            await writeFile(path.join(caseDirectory, `${judgeBasename}.json`), raw, "utf8");
          },
        });
        await writeFile(path.join(caseDirectory, `${judgeBasename}.json`), judgeRaw, "utf8");
        judgeResults.push(judgeResult);
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
      bestAttempt = attempt;
      bestCalledTools = run.state.calledTools;
      bestEfficiency = getAssistantEfficiency(run.state);
    }
    if (judgeResults.every(judgePasses)) {
      return {
        caseId: args.testCase.id,
        attempts: attempt,
        selectedAttempt: attempt,
        widget: run.state.createdWidgets[0] ?? null,
        judge: weakestJudge,
        outputDirectory: caseDirectory,
        errors,
        calledTools: run.state.calledTools,
        widgets: run.state.createdWidgets,
        judges: judgeResults,
        efficiency: getAssistantEfficiency(run.state),
        cumulativeEfficiency: getCumulativeAssistantEfficiency(attemptStates),
      };
    }
    const issues = selectAssistantEvaluationReviewFeedback(
      judgeResults,
      matches.map(({ expectedWidgetId }) => expectedWidgetId),
    );
    errors.push(`Attempt ${attempt}: weakest judge ${weakestJudge.total}/100 — ${issues.join("; ")}`);
    replaceAssistantEvaluationFeedback(reviewFeedback, issues);
  }

  const lifecycleEvidence = selectAssistantEvaluationLifecycleEvidence(bestWidgets, bestCalledTools, attemptStates);
  const lifecycleEvidenceIndex = getAssistantEvaluationLifecycleEvidenceIndex(attemptStates);
  const lifecycleEvidenceAttempt = attemptStateNumbers[lifecycleEvidenceIndex] ?? null;
  return {
    caseId: args.testCase.id,
    attempts: args.maxLoops,
    selectedAttempt: bestAttempt ?? lifecycleEvidenceAttempt,
    widget: bestWidget ?? lifecycleEvidence.widgets[0] ?? null,
    judge: bestJudge,
    outputDirectory: caseDirectory,
    errors,
    calledTools: lifecycleEvidence.calledTools,
    widgets: lifecycleEvidence.widgets,
    judges: bestJudges,
    efficiency:
      bestScoreFloor >= 0
        ? bestEfficiency
        : getAssistantEfficiency(lastAttemptState ?? createAssistantEvaluationState()),
    cumulativeEfficiency: getCumulativeAssistantEfficiency(attemptStates),
  };
}
