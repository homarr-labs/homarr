import { hkdfSync } from "node:crypto";

import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { MetadataExtractor } from "@ai-sdk/openai-compatible";
import type { ToolSet, UIMessage } from "ai";
import { createUIMessageStream, createUIMessageStreamResponse, jsonSchema, stepCountIs, streamText, tool } from "ai";
import { cookies } from "next/headers";
import { z } from "zod/v4";

import { createTRPCContext, mcpRouter } from "@homarr/api/mcp";
import {
  createAssistantGenerationAccessToken,
  getAssistantRequestContextEntitiesAsync,
  getSelectedModelDetailsAsync,
} from "@homarr/api/assistant";
import { auth } from "@homarr/auth/next";
import { env } from "@homarr/common/env";
import { decryptSecret } from "@homarr/common/server";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { and, eq } from "@homarr/db";
import { db } from "@homarr/db";
import { assistantConfigurations, assistantThreads } from "@homarr/db/schema";
import {
  assistantProviderCanUseOpenRouterServerTools,
  assistantProviderRequiresApiKey,
  assistantReasoningModes,
} from "@homarr/definitions";
import { localeCookieKey } from "@homarr/definitions/cookie";
import type { SupportedLanguage } from "@homarr/translation";
import { fallbackLocale, isLocaleSupported } from "@homarr/translation";
import { getI18n } from "@homarr/translation/server";
import { resolveHomarrUrlConfig } from "@homarr/workshop/schema";
import { getCustomWidgetContextRequestKey } from "@homarr/custom-widgets/authoring-resources";
import { normalizeCustomWidgetLifecycleToolInput } from "@homarr/custom-widgets/core";

import { browserToolContracts } from "~/components/assistant/assistant-tool-contracts";
import { env as appEnv } from "~/env";
import type {
  AssistantMessageMetadata,
  AssistantRequestStep,
  AssistantUsage,
  AssistantWebSearchSource,
} from "~/components/assistant/assistant-message-metadata";

import { extractMcpTools } from "../../mcp/_extract-tools";
import {
  buildAssistantRequestContext,
  getRequestedMentionIds,
  sanitizeAttachmentFilename,
} from "./assistant-chat-input";
import { getAssistantModelLookupStatus } from "./assistant-model-lookup";
import { compactAssistantStepMessages, convertAssistantMessagesToModelMessages } from "./assistant-message-conversion";
import {
  getOpenRouterWebSearchRequests,
  getOpenRouterWebSearchSources,
  normalizeOpenRouterWebSearchSources,
  withOpenRouterToolRequestOptions,
  withOpenRouterWebSearch,
} from "./assistant-openrouter";
import { resolveHomarrProviderToken, toProviderOptionsKey } from "./assistant-provider-options";
import {
  appendActiveCustomWidgetToolInstruction,
  assistantExecutionPolicy,
  createCustomWidgetToolStepGate,
} from "./assistant-execution-policy";
import { getAssistantStreamErrorMessage } from "./assistant-stream-error";
import { getSafeAssistantToolError } from "./assistant-tool-error";
import { repairAssistantToolInput } from "./assistant-tool-input-repair";
import { getAssistantToolOutputMaxCharacters, toAssistantToolOutput } from "./assistant-tool-output";
import { getAssistantToolInputSchema } from "./assistant-tool-schema";
import {
  createCustomWidgetDiscoveryPhaseController,
  getActiveCustomWidgetToolNames,
  getCustomWidgetPhaseToolNames,
  needsCustomWidgetAuthoringContext,
} from "./custom-widget-authoring-context";
import { createAssistantMcpToolGroups } from "./assistant-tool-groups";
import {
  customWidgetAssistantInstructions,
  getForcedAssistantToolName,
  getRequiredAssistantToolNames,
  withAssistantToolPolicy,
} from "./assistant-tool-policy";

export const maxDuration = 300;

// Five 1 MB image attachments expand to roughly 6.7 MB as base64 before the surrounding message
// history and JSON envelope are added. Keep the transport ceiling above the composer contract while
// retaining a bounded request size for this authenticated endpoint.
const assistantRequestMaxBytes = 12_000_000;

const logger = createLogger({ module: "assistant" });
const getAssistantLogErrorType = (error: unknown) => (error instanceof Error ? error.name : typeof error);
const getToolApprovalSecret = () =>
  Buffer.from(
    hkdfSync("sha256", Buffer.from(env.SECRET_ENCRYPTION_KEY, "hex"), "", "assistant-tool-approval", 32),
  ).toString("base64url");
const allowedAttachmentMediaTypes = new Set([
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/json",
  "text/csv",
  "text/html",
  "text/markdown",
  "text/plain",
  "text/xml",
]);
const requestSchema = z.object({
  id: z.string().min(1).max(64),
  modelId: z.string().trim().min(1).max(256).optional(),
  reasoning: z.enum(assistantReasoningModes).default("auto"),
  clientContext: z
    .object({
      pathname: z
        .string()
        .min(1)
        .max(2048)
        .regex(/^\/(?!\/)/u),
      timeZone: z
        .string()
        .trim()
        .min(1)
        .max(100)
        .regex(/^[+\-/0-9A-Z_a-z]+$/u)
        .optional(),
    })
    .optional(),
  messages: z
    .array(
      z
        .object({
          id: z.string().min(1).max(128),
          role: z.enum(["user", "assistant"]),
          parts: z.array(z.unknown()).max(200),
        })
        .passthrough(),
    )
    .max(200),
  tools: z
    .record(
      z.string(),
      z.object({
        description: z.string().optional(),
        parameters: z.record(z.string(), z.unknown()),
        providerOptions: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .refine((tools) => tools === undefined || Object.keys(tools).length <= 16)
    .optional(),
});

const assistantToolGroupActivationName = "homarr_enableToolGroups";
const maxAssistantToolGroupsPerActivation = 4;

const assistantInstructions = `You are Homarr Assistant, embedded in the user's self-hosted Homarr dashboard.

Use Homarr tools for live instance data or actions; never invent resources, IDs, state, or results. Homarr tools are grouped by their MCP router namespace. Call ${assistantToolGroupActivationName} with the task-needed group when its typed tools are not visible, then use the activated tool. Follow each tool's description and use integration IDs returned by Homarr tools.

Homarr permissions are authoritative. Explain denied access without suggesting a bypass. Read before changing when current state matters. Mutations use Homarr's native approval UI: when inputs are sufficient, call the mutation immediately and never ask for duplicate prose confirmation or retry a denial. Use ask_user only when a missing choice blocks the next action; do not end with a prose question expecting a reply.

Use configure_app, configure_board_settings, and configure_widget as the native review step before their matching mutations. Preserve existing board CSS unless replacement was requested. Use Homarr icon results rather than invented icon URLs. Browser tools are same-origin only and may refresh after a completed mutation.

Complete requested batches before summarizing. Keep responses concise, lead with the result, summarize tool output instead of dumping JSON, and use well-formed GitHub-flavored Markdown. If a service is unavailable, state the concrete next action.`;

const webSearchInstructions = `

OpenRouter web search is available. Use it only when current external information or unsupplied API documentation is needed. Prefer primary documentation, keep the search focused, and cite the sources that support the answer or generated artifact.`;

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const asFiniteNumber = (value: unknown) => {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(number) && number >= 0 ? number : undefined;
};

const createProviderTelemetryExtractor = (): MetadataExtractor => {
  const createAccumulator = () => {
    let metadata: Record<string, string | number | AssistantWebSearchSource[]> = {};
    const webSearchSources = new Map<string, AssistantWebSearchSource>();
    const process = (value: unknown) => {
      const body = asRecord(value);
      if (!body) return;
      const usage = asRecord(body.usage);
      const costDetails = asRecord(usage?.cost_details);
      const webSearchRequests = getOpenRouterWebSearchRequests(body);
      for (const source of getOpenRouterWebSearchSources(body)) {
        const existing = webSearchSources.get(source.url);
        webSearchSources.set(source.url, existing?.title || !source.title ? (existing ?? source) : source);
      }
      const routerMetadata = asRecord(body.openrouter_metadata);
      const endpoints = asRecord(routerMetadata?.endpoints);
      const selectedEndpoint = Array.isArray(endpoints?.available)
        ? endpoints.available.map(asRecord).find((endpoint) => endpoint?.selected === true)
        : undefined;
      const generationId = typeof body.id === "string" ? body.id : undefined;
      const routedProvider =
        typeof body.provider === "string"
          ? body.provider
          : typeof usage?.provider === "string"
            ? usage.provider
            : typeof selectedEndpoint?.provider === "string"
              ? selectedEndpoint.provider
              : undefined;
      const cost = asFiniteNumber(usage?.cost);
      const upstreamCost = asFiniteNumber(costDetails?.upstream_inference_cost);
      const routerAttempt = asFiniteNumber(routerMetadata?.attempt);
      metadata = {
        ...metadata,
        ...(generationId ? { generationId } : {}),
        ...(routedProvider ? { routedProvider } : {}),
        ...(cost !== undefined ? { cost } : {}),
        ...(upstreamCost !== undefined ? { upstreamCost } : {}),
        ...(webSearchRequests !== undefined ? { webSearchRequests } : {}),
        ...(webSearchSources.size > 0 ? { webSearchSources: [...webSearchSources.values()] } : {}),
        ...(routerAttempt !== undefined ? { fallbackCount: Math.max(routerAttempt - 1, 0) } : {}),
        ...(typeof routerMetadata?.strategy === "string" ? { routerStrategy: routerMetadata.strategy } : {}),
        ...(typeof routerMetadata?.region === "string" ? { routerRegion: routerMetadata.region } : {}),
        ...(typeof routerMetadata?.is_byok === "boolean" ? { isByok: routerMetadata.is_byok ? 1 : 0 } : {}),
      };
    };
    const build = () => (Object.keys(metadata).length > 0 ? { homarrTelemetry: metadata } : undefined);
    return { process, build };
  };

  return {
    async extractMetadata({ parsedBody }) {
      const accumulator = createAccumulator();
      accumulator.process(parsedBody);
      return accumulator.build();
    },
    createStreamExtractor() {
      const accumulator = createAccumulator();
      return {
        processChunk: accumulator.process,
        buildMetadata: accumulator.build,
      };
    },
  };
};

const hasValidAttachments = (messages: { parts: unknown[] }[]) => {
  for (const message of messages) {
    let count = 0;
    for (const part of message.parts) {
      const value = asRecord(part);
      if (value?.type !== "file") continue;
      count += 1;
      if (count > 5) return false;
      const mediaType = typeof value.mediaType === "string" ? value.mediaType : "";
      const url = typeof value.url === "string" ? value.url : "";
      const prefix = `data:${mediaType};base64,`;
      if (!allowedAttachmentMediaTypes.has(mediaType) || !url.startsWith(prefix)) return false;
      const encoded = url.slice(prefix.length);
      if (encoded.length === 0 || encoded.length % 4 !== 0 || !/^[\d+/A-Za-z]*={0,2}$/u.test(encoded)) return false;
      const decodedSize = Buffer.from(encoded, "base64").byteLength;
      const sizeLimit = mediaType.startsWith("image/") ? 1_000_000 : 350_000;
      if (decodedSize === 0 || decodedSize > sizeLimit) return false;
    }
  }
  return true;
};

const hasImageAttachment = (messages: { parts: unknown[] }[]) =>
  messages.some((message) =>
    message.parts.some((part) => {
      const value = asRecord(part);
      return value?.type === "file" && typeof value.mediaType === "string" && value.mediaType.startsWith("image/");
    }),
  );

const prepareMessagesForModel = (messages: UIMessage[]) =>
  messages.map((message) => ({
    ...message,
    parts: message.parts.flatMap((part) => {
      if (part.type !== "file" || (!part.mediaType.startsWith("text/") && part.mediaType !== "application/json")) {
        return [part];
      }
      const prefix = `data:${part.mediaType};base64,`;
      if (!part.url.startsWith(prefix)) return [];
      const text = Buffer.from(part.url.slice(prefix.length), "base64").toString("utf8");
      const safeName = sanitizeAttachmentFilename(part.filename);
      return [
        {
          type: "text" as const,
          text: `<attachment name="${safeName}" media-type="${part.mediaType}">\n${text}\n</attachment>`,
        },
      ];
    }),
  }));

const toUsageMetadata = (usage: {
  inputTokens: number | undefined;
  outputTokens: number | undefined;
  totalTokens: number | undefined;
  inputTokenDetails: { cacheReadTokens: number | undefined; cacheWriteTokens: number | undefined };
  outputTokenDetails: { reasoningTokens: number | undefined };
}): AssistantUsage => ({
  ...(usage.inputTokens !== undefined ? { inputTokens: usage.inputTokens } : {}),
  ...(usage.outputTokens !== undefined ? { outputTokens: usage.outputTokens } : {}),
  ...(usage.totalTokens !== undefined ? { totalTokens: usage.totalTokens } : {}),
  ...(usage.inputTokenDetails.cacheReadTokens !== undefined
    ? { cachedInputTokens: usage.inputTokenDetails.cacheReadTokens }
    : {}),
  ...(usage.inputTokenDetails.cacheWriteTokens !== undefined
    ? { cacheWriteTokens: usage.inputTokenDetails.cacheWriteTokens }
    : {}),
  ...(usage.outputTokenDetails.reasoningTokens !== undefined
    ? { reasoningTokens: usage.outputTokenDetails.reasoningTokens }
    : {}),
});

const sumCompleteStepMetric = (
  steps: AssistantRequestStep[],
  getValue: (step: AssistantRequestStep) => number | undefined,
) => {
  if (steps.length === 0) return undefined;
  const values = steps.map(getValue);
  if (values.some((value) => value === undefined)) return undefined;
  return (values as number[]).reduce((sum, value) => sum + value, 0);
};

const waitForDemoChunkAsync = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const createDemoAssistantResponse = (request: z.infer<typeof requestSchema>) => {
  const text =
    "This is the Homarr demo assistant. It is running in preview/mock mode, so it responds with a canned answer instead of calling a real language model. In a real deployment, an administrator configures a provider and a model for full conversations.";
  const responseId = crypto.randomUUID();
  const partId = crypto.randomUUID();
  const chunkTexts = text.match(/.{1,3}/gs) ?? [text];

  const stream = createUIMessageStream<UIMessage>({
    originalMessages: request.messages as UIMessage[],
    execute: async ({ writer }) => {
      writer.write({ type: "start", messageId: responseId });
      writer.write({ type: "text-start", id: partId });
      for (const chunk of chunkTexts) {
        writer.write({ type: "text-delta", id: partId, delta: chunk });
        await waitForDemoChunkAsync(18);
      }
      writer.write({ type: "text-end", id: partId });
      writer.write({ type: "finish", finishReason: "stop" });
    },
  });

  return createUIMessageStreamResponse({ stream });
};

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > assistantRequestMaxBytes) {
    return Response.json({ error: "The assistant request is too large." }, { status: 413 });
  }

  const session = await auth();
  if (!session) {
    return Response.json({ error: "Sign in to use Assistant." }, { status: 401 });
  }

  const requestBody = await request.text();
  if (requestBody.length > assistantRequestMaxBytes) {
    return Response.json({ error: "The assistant request is too large." }, { status: 413 });
  }
  const parsed = requestSchema.safeParse(
    (() => {
      try {
        const value: unknown = JSON.parse(requestBody);
        return value;
      } catch {
        return null;
      }
    })(),
  );
  if (!parsed.success) {
    return Response.json({ error: "The assistant request was invalid." }, { status: 400 });
  }
  if (!hasValidAttachments(parsed.data.messages)) {
    return Response.json(
      { error: "An attachment is unsupported, too large, or exceeds the five-file limit." },
      { status: 413 },
    );
  }
  const incomingMessages = parsed.data.messages as UIMessage[];

  const configuration = await db.query.assistantConfigurations.findFirst({
    where: eq(assistantConfigurations.id, "default"),
  });

  const thread = await db.query.assistantThreads.findFirst({
    where: and(eq(assistantThreads.id, parsed.data.id), eq(assistantThreads.userId, session.user.id)),
  });
  if (!thread) {
    return Response.json({ error: "Conversation not found." }, { status: 404 });
  }

  if (appEnv.DEMO_MODE) {
    return createDemoAssistantResponse(parsed.data);
  }

  const requiresApiKey = configuration ? assistantProviderRequiresApiKey(configuration.provider) : false;
  if (!configuration?.enabled || !configuration.modelId || (requiresApiKey && !configuration.encryptedApiKey)) {
    const requestedLocale = (await cookies()).get(localeCookieKey)?.value;
    let locale: SupportedLanguage = fallbackLocale;
    if (requestedLocale && isLocaleSupported(requestedLocale)) locale = requestedLocale;
    const t = await getI18n({ locale, namespace: "assistant.unavailable" });
    return Response.json({ error: t("notConfigured") }, { status: 503 });
  }

  let homarrProviderToken: string | null | undefined;
  try {
    homarrProviderToken = resolveHomarrProviderToken({
      provider: configuration.provider,
      configuredBaseUrl: configuration.baseUrl,
      workshopApiUrl: appEnv.WORKSHOP_API_URL ?? appEnv.HOMARR_WEBSITE_URL,
      headers: request.headers,
    });
  } catch (error) {
    logger.warn("Rejected an unsafe Homarr provider endpoint", {
      provider: configuration.provider,
      errorType: getAssistantLogErrorType(error),
    });
    return Response.json({ error: "The Homarr provider endpoint is not configured safely." }, { status: 503 });
  }
  if (homarrProviderToken === null) {
    return Response.json(
      { error: "Sign in to the Homarr Community Workshop to use the Homarr provider." },
      { status: 401 },
    );
  }

  const context = createTRPCContext({ headers: request.headers, session });
  const requestStartedAt = Date.now();
  const requestId = crypto.randomUUID();
  const requestedModelId = parsed.data.modelId ?? configuration.modelId;
  const requestedMentions = getRequestedMentionIds(parsed.data.messages);
  const [modelLookup, contextEntities] = await Promise.all([
    getSelectedModelDetailsAsync(configuration, requestedModelId).then(
      (model) => ({ model, error: null }),
      (error: unknown) => ({ model: null, error }),
    ),
    getAssistantRequestContextEntitiesAsync(context, requestedMentions).catch((error: unknown) => {
      logger.warn("Assistant request context could not be loaded", {
        requestId,
        errorType: getAssistantLogErrorType(error),
      });
      return [];
    }),
  ]);
  const requestContext = buildAssistantRequestContext({
    clientContext: parsed.data.clientContext,
    currentTime: new Date(requestStartedAt),
    entities: contextEntities,
    messages: parsed.data.messages,
    userName: session.user.name,
    workshopWebUrl: resolveHomarrUrlConfig({
      homarrWebsiteUrl: appEnv.HOMARR_WEBSITE_URL,
      workshopApiUrl: appEnv.WORKSHOP_API_URL,
      workshopWebUrl: appEnv.WORKSHOP_WEB_URL,
    }).workshopWebUrl,
  });
  if (modelLookup.error !== null) {
    logger.warn("Assistant model discovery failed before the response started", {
      requestId,
      provider: configuration.provider,
      modelId: requestedModelId,
      errorType: getAssistantLogErrorType(modelLookup.error),
    });
  }
  const selectedModel = modelLookup.model;
  const modelLookupStatus = getAssistantModelLookupStatus({
    configuredModelId: configuration.modelId,
    requestedModelId,
    hasModel: selectedModel !== null,
    failed: modelLookup.error !== null,
  });
  if (modelLookupStatus === "unreachable") {
    return Response.json(
      { error: "The configured model endpoint could not be reached. Try again in a moment." },
      { status: 503 },
    );
  }
  if (modelLookupStatus === "unavailable") {
    return Response.json(
      { error: "The selected model is not available from the configured provider." },
      { status: 400 },
    );
  }
  const modelId = selectedModel?.id ?? configuration.modelId;
  if (
    selectedModel &&
    selectedModel.inputModalities.length > 0 &&
    !selectedModel.inputModalities.includes("image") &&
    hasImageAttachment(parsed.data.messages)
  ) {
    return Response.json({ error: "The selected model does not support image input." }, { status: 400 });
  }
  const canAuthorCustomWidgets = session.user.permissions.includes("admin");
  const customWidgetAuthoringActive = canAuthorCustomWidgets && needsCustomWidgetAuthoringContext(incomingMessages);
  const customWidgetDiscoveryPhase = createCustomWidgetDiscoveryPhaseController();
  const customWidgetToolStepGate = createCustomWidgetToolStepGate();
  const loadedCustomWidgetContextRequests = new Set<string>();
  const caller = mcpRouter.createCaller(context);
  const mcpTools = extractMcpTools().filter(
    (mcpTool) => canAuthorCustomWidgets || !mcpTool.name.startsWith("customWidget_"),
  );

  const homarrTools = Object.fromEntries(
    mcpTools.map((mcpTool) => {
      const requiresApproval = mcpTool.type === "mutation";
      return [
        mcpTool.name,
        tool({
          description: withAssistantToolPolicy(mcpTool.description, requiresApproval),
          inputSchema: jsonSchema(
            getAssistantToolInputSchema(
              mcpTool.name,
              mcpTool.inputSchema ?? { type: "object", properties: {} },
            ) as Parameters<typeof jsonSchema>[0],
          ),
          execute: async (input) => {
            if (customWidgetAuthoringActive && !customWidgetToolStepGate.claim(mcpTool.name)) {
              return {
                error:
                  "A Custom Widget tool must run in its own model step. Use that result before calling another tool.",
              };
            }
            let executionInput = input;
            if (
              mcpTool.name.startsWith("customWidget_") &&
              typeof input === "object" &&
              input !== null &&
              !Array.isArray(input)
            ) {
              executionInput = normalizeCustomWidgetLifecycleToolInput(mcpTool.name, input as Record<string, unknown>);
            }
            const contextRequestKey = getCustomWidgetContextRequestKey(mcpTool.name, executionInput);
            if (contextRequestKey !== null && loadedCustomWidgetContextRequests.has(contextRequestKey)) {
              return {
                contextAlreadyLoaded: true,
                nextStep: "Reuse the earlier result for this exact context request.",
              };
            }
            if (customWidgetAuthoringActive && !customWidgetDiscoveryPhase.claim(mcpTool.name)) {
              return {
                phaseComplete: true,
                components: [],
                nextStep:
                  "Focused discovery is complete for this phase. Use the accumulated component names, batch selected docs with customWidget_getComponents, then call customWidget_validateTemplate. A failed validation reopens focused discovery.",
              };
            }
            if (contextRequestKey !== null) loadedCustomWidgetContextRequests.add(contextRequestKey);
            try {
              const procedure = mcpTool.pathInRouter.reduce<unknown>(
                (current, segment) =>
                  (typeof current === "object" || typeof current === "function") && current !== null
                    ? (current as Record<string, unknown>)[segment]
                    : undefined,
                caller,
              );
              if (typeof procedure !== "function") {
                throw new Error("Procedure not callable");
              }
              const result = await (procedure as (value: unknown) => Promise<unknown>)(
                executionInput && Object.keys(executionInput as object).length > 0 ? executionInput : undefined,
              );
              customWidgetDiscoveryPhase.observe(mcpTool.name, result);
              return toAssistantToolOutput(result, {
                maxCharacters: getAssistantToolOutputMaxCharacters(mcpTool.name),
              });
            } catch (error) {
              if (contextRequestKey !== null) loadedCustomWidgetContextRequests.delete(contextRequestKey);
              customWidgetDiscoveryPhase.observeFailure(mcpTool.name);
              logger.error("Assistant tool call failed", {
                toolName: mcpTool.name,
                errorType: getAssistantLogErrorType(error),
              });
              return { error: getSafeAssistantToolError(error, { toolName: mcpTool.name }) };
            }
          },
        }),
      ];
    }),
  ) satisfies ToolSet;
  const toolApproval = Object.fromEntries(
    mcpTools
      .filter((mcpTool) => mcpTool.type === "mutation")
      .map((mcpTool) => [mcpTool.name, "user-approval" as const]),
  );

  const frontendTools = Object.fromEntries(
    Object.keys(parsed.data.tools ?? {}).flatMap((name) => {
      if (!(name in browserToolContracts)) return [];
      const definition = browserToolContracts[name as keyof typeof browserToolContracts];
      return [
        [
          name,
          tool({
            description: definition.description,
            inputSchema: jsonSchema(z.toJSONSchema(definition.parameters) as Parameters<typeof jsonSchema>[0]),
          }),
        ] as const,
      ];
    }),
  ) satisfies ToolSet;
  const groupedToolCandidates = customWidgetAuthoringActive
    ? mcpTools.filter((mcpTool) => !mcpTool.name.startsWith("customWidget_"))
    : mcpTools;
  const assistantToolGroups = createAssistantMcpToolGroups(groupedToolCandidates);
  const assistantToolGroupIds = assistantToolGroups.ids as [string, ...string[]];
  const assistantToolGroupActivationSchema = z.object({
    groups: z
      .array(z.enum(assistantToolGroupIds))
      .min(1)
      .max(maxAssistantToolGroupsPerActivation)
      .describe("MCP router groups whose typed Homarr tools are needed for the current task."),
  });
  const enabledToolGroupIds = new Set<string>();
  const toolGroupActivation = tool({
    description:
      "Enable task-needed typed Homarr tools by MCP router group. Enabled groups remain available on later steps.",
    inputSchema: jsonSchema(z.toJSONSchema(assistantToolGroupActivationSchema) as Parameters<typeof jsonSchema>[0]),
    execute: (value) => {
      if (customWidgetAuthoringActive && !customWidgetToolStepGate.claim(assistantToolGroupActivationName)) {
        return {
          error: "A Custom Widget tool must run in its own model step. Use that result before calling another tool.",
        };
      }
      const input = assistantToolGroupActivationSchema.parse(value);
      const groups = assistantToolGroups.resolve(input.groups);
      for (const group of groups) enabledToolGroupIds.add(group.id);
      return {
        enabledGroups: groups.map(({ id }) => id),
        nextStep: "Use one or more enabled typed tools now. Enable another group only when the task needs it.",
      };
    },
  });
  const availableTools: ToolSet = {
    ...homarrTools,
    [assistantToolGroupActivationName]: toolGroupActivation,
    ...frontendTools,
  };
  const frontendToolNames = Object.keys(frontendTools);
  const activeCustomWidgetToolNames = getActiveCustomWidgetToolNames(
    Object.keys(homarrTools),
    incomingMessages,
    canAuthorCustomWidgets,
  );
  const getActiveToolNames = (steps: Parameters<typeof getCustomWidgetPhaseToolNames>[1] = []) => {
    const enabledToolNames = assistantToolGroups
      .resolve([...enabledToolGroupIds])
      .flatMap((group) => group.tools.map(({ name }) => name));
    const phaseToolNames = customWidgetAuthoringActive
      ? getCustomWidgetPhaseToolNames(Object.keys(homarrTools), steps)
      : null;
    if (phaseToolNames) return [...frontendToolNames, ...enabledToolNames, ...phaseToolNames];
    return [
      assistantToolGroupActivationName,
      ...frontendToolNames,
      ...new Set([...enabledToolNames, ...activeCustomWidgetToolNames]),
    ];
  };
  const forcedToolName = getForcedAssistantToolName(incomingMessages);
  const openRouterServerToolsEnabled =
    configuration.webSearchEnabled && assistantProviderCanUseOpenRouterServerTools(configuration.provider);

  try {
    const customHeaders = configuration.encryptedHeaders
      ? z.record(z.string(), z.string()).parse(JSON.parse(decryptSecret(configuration.encryptedHeaders)))
      : {};
    const providerHeaders = {
      ...(configuration.provider === "openrouter" || openRouterServerToolsEnabled
        ? {
            "HTTP-Referer": "https://homarr.dev",
            "X-OpenRouter-Title": "Homarr AI Assistant",
            "X-OpenRouter-Metadata": "enabled",
          }
        : {}),
      ...customHeaders,
    };
    const providerApiKey =
      configuration.provider === "homarr"
        ? homarrProviderToken
        : configuration.encryptedApiKey
          ? decryptSecret(configuration.encryptedApiKey)
          : undefined;
    const providerName = `homarr-${configuration.provider}`;
    const provider = createOpenAICompatible({
      name: providerName,
      baseURL: configuration.baseUrl,
      apiKey: providerApiKey,
      headers: providerHeaders,
      includeUsage: true,
      transformRequestBody:
        configuration.provider === "openrouter"
          ? (body) => withOpenRouterToolRequestOptions(body, { webSearchEnabled: openRouterServerToolsEnabled })
          : openRouterServerToolsEnabled
            ? withOpenRouterWebSearch
            : undefined,
      metadataExtractor: createProviderTelemetryExtractor(),
    });

    const requestSteps: AssistantRequestStep[] = [];
    let firstOutputAt: number | undefined;
    let reportedCost = 0;
    let hasReportedCost = false;
    let upstreamCost = 0;
    let hasUpstreamCost = false;
    const initialModelMessages = await convertAssistantMessagesToModelMessages(
      prepareMessagesForModel(incomingMessages),
    );
    const baseInstructions = `${assistantInstructions}${customWidgetAuthoringActive ? customWidgetAssistantInstructions : ""}${openRouterServerToolsEnabled ? webSearchInstructions : ""}${requestContext}`;
    const getStepInstructions = (activeToolNames: readonly string[]) => {
      if (!customWidgetAuthoringActive) return undefined;
      return appendActiveCustomWidgetToolInstruction(baseInstructions, activeToolNames);
    };
    const result = streamText({
      model: provider(modelId),
      instructions: baseInstructions,
      messages: initialModelMessages,
      tools: availableTools,
      prepareStep: ({ messages, responseMessages, stepNumber, steps }) => {
        customWidgetToolStepGate.begin(stepNumber);
        if (stepNumber === 0 && forcedToolName !== undefined && forcedToolName in availableTools) {
          return {
            activeTools: [forcedToolName],
            instructions: getStepInstructions([forcedToolName]),
            toolChoice: { type: "tool", toolName: forcedToolName },
          };
        }
        const requiredToolNames = getRequiredAssistantToolNames(incomingMessages, steps, responseMessages).filter(
          (toolName) => toolName in availableTools,
        );
        if (requiredToolNames.length > 0) {
          return {
            activeTools: requiredToolNames,
            instructions: getStepInstructions(requiredToolNames),
            messages: compactAssistantStepMessages(messages),
            toolChoice: "required",
          };
        }
        const activeTools = getActiveToolNames(steps);
        return {
          activeTools,
          instructions: getStepInstructions(activeTools),
          messages: compactAssistantStepMessages(messages),
        };
      },
      stopWhen: stepCountIs(assistantExecutionPolicy.maxSteps),
      abortSignal: request.signal,
      timeout: {
        totalMs: assistantExecutionPolicy.totalTimeoutMs,
        stepMs: assistantExecutionPolicy.stepTimeoutMs,
        toolMs: assistantExecutionPolicy.toolTimeoutMs,
      },
      maxOutputTokens: assistantExecutionPolicy.maxOutputTokens,
      maxRetries: 2,
      experimental_repairToolCall: ({ toolCall }) => Promise.resolve(repairAssistantToolInput(toolCall)),
      reasoning: parsed.data.reasoning === "auto" ? undefined : parsed.data.reasoning,
      providerOptions:
        configuration.provider === "openrouter" || openRouterServerToolsEnabled
          ? { [toProviderOptionsKey(providerName)]: { usage: { include: true } } }
          : undefined,
      toolApproval,
      experimental_toolApprovalSecret: getToolApprovalSecret(),
      onChunk: ({ chunk }) => {
        if (
          firstOutputAt === undefined &&
          [
            "text-delta",
            "reasoning-delta",
            "source",
            "file",
            "tool-call",
            "tool-input-start",
            "tool-input-delta",
          ].includes(chunk.type)
        ) {
          firstOutputAt = Date.now();
        }
      },
      onStepFinish: ({ performance, providerMetadata, response, usage }) => {
        const telemetry = asRecord(providerMetadata?.homarrTelemetry);
        const webSearchSources = normalizeOpenRouterWebSearchSources(telemetry?.webSearchSources);
        const generationId =
          typeof telemetry?.generationId === "string"
            ? telemetry.generationId
            : typeof response.id === "string"
              ? response.id
              : undefined;
        const step: AssistantRequestStep = {
          index: requestSteps.length + 1,
          durationMs: performance.stepTimeMs,
          modelDurationMs: performance.responseTimeMs,
          toolDurationMs: Object.values(performance.toolExecutionMs).reduce((sum, value) => sum + value, 0),
          ...(performance.timeToFirstOutputMs !== undefined
            ? { timeToFirstOutputMs: performance.timeToFirstOutputMs }
            : {}),
          ...(performance.outputTokensPerSecond !== undefined
            ? { outputTokensPerSecond: performance.outputTokensPerSecond }
            : {}),
          ...(usage.inputTokens !== undefined ? { inputTokens: usage.inputTokens } : {}),
          ...(usage.outputTokens !== undefined ? { outputTokens: usage.outputTokens } : {}),
          ...(asFiniteNumber(telemetry?.cost) !== undefined ? { cost: asFiniteNumber(telemetry?.cost) } : {}),
          ...(asFiniteNumber(telemetry?.upstreamCost) !== undefined
            ? { upstreamCost: asFiniteNumber(telemetry?.upstreamCost) }
            : {}),
          ...(asFiniteNumber(telemetry?.webSearchRequests) !== undefined
            ? { webSearchRequests: asFiniteNumber(telemetry?.webSearchRequests) }
            : {}),
          ...(webSearchSources.length > 0 ? { webSearchSources } : {}),
          ...(generationId ? { generationId } : {}),
          ...(generationId
            ? {
                generationAccessToken: createAssistantGenerationAccessToken({
                  userId: session.user.id,
                  threadId: thread.id,
                  generationId,
                }),
              }
            : {}),
          ...(typeof telemetry?.routedProvider === "string" ? { routedProvider: telemetry.routedProvider } : {}),
          ...(asFiniteNumber(telemetry?.fallbackCount) !== undefined
            ? { fallbackCount: asFiniteNumber(telemetry?.fallbackCount) }
            : {}),
          ...(typeof telemetry?.routerStrategy === "string" ? { routerStrategy: telemetry.routerStrategy } : {}),
          ...(typeof telemetry?.routerRegion === "string" ? { routerRegion: telemetry.routerRegion } : {}),
          ...(telemetry?.isByok === 0 || telemetry?.isByok === 1 ? { isByok: telemetry.isByok === 1 } : {}),
        };
        requestSteps.push(step);
        if (step.cost !== undefined) {
          reportedCost += step.cost;
          hasReportedCost = true;
        }
        if (step.upstreamCost !== undefined) {
          upstreamCost += step.upstreamCost;
          hasUpstreamCost = true;
        }
      },
      onError: ({ error }) => {
        logger.error("Assistant response stream failed", {
          requestId,
          provider: configuration.provider,
          modelId,
          errorType: getAssistantLogErrorType(error),
        });
      },
      onFinish: async () => {
        try {
          await db
            .update(assistantThreads)
            .set({ modelId, updatedAt: new Date() })
            .where(eq(assistantThreads.id, thread.id));
        } catch (error) {
          logger.error("Failed to update assistant conversation metadata", {
            threadId: thread.id,
            errorType: getAssistantLogErrorType(error),
          });
        }
      },
    });

    return result.toUIMessageStreamResponse<UIMessage<AssistantMessageMetadata>>({
      originalMessages: parsed.data.messages as UIMessage<AssistantMessageMetadata>[],
      sendReasoning: true,
      messageMetadata: ({ part }) => {
        const common = {
          requestId,
          provider: configuration.provider,
          modelId,
          startedAt: new Date(requestStartedAt).toISOString(),
          steps: requestSteps,
          ...(selectedModel?.contextLength ? { contextLength: selectedModel.contextLength } : {}),
        };
        if (part.type !== "finish") {
          return { custom: { telemetry: common } };
        }

        const completedAt = Date.now();
        const aiUsage = toUsageMetadata(part.totalUsage);
        const providerInputTokens = sumCompleteStepMetric(requestSteps, (step) => step.inputTokens);
        const providerOutputTokens = sumCompleteStepMetric(requestSteps, (step) => step.outputTokens);
        const providerCachedInputTokens = sumCompleteStepMetric(requestSteps, (step) => step.cachedInputTokens);
        const providerReasoningTokens = sumCompleteStepMetric(requestSteps, (step) => step.reasoningTokens);
        const inputTokens = providerInputTokens ?? aiUsage.inputTokens;
        const outputTokens = providerOutputTokens ?? aiUsage.outputTokens;
        const usage: AssistantUsage = {
          ...aiUsage,
          ...(inputTokens !== undefined ? { inputTokens } : {}),
          ...(outputTokens !== undefined ? { outputTokens } : {}),
          ...(inputTokens !== undefined && outputTokens !== undefined
            ? { totalTokens: inputTokens + outputTokens }
            : {}),
          ...(providerCachedInputTokens !== undefined ? { cachedInputTokens: providerCachedInputTokens } : {}),
          ...(providerReasoningTokens !== undefined ? { reasoningTokens: providerReasoningTokens } : {}),
        };
        const latestStep = requestSteps.at(-1);
        const latestContextUsed =
          latestStep?.inputTokens !== undefined && latestStep.outputTokens !== undefined
            ? latestStep.inputTokens + latestStep.outputTokens
            : undefined;
        const contextUsed =
          latestContextUsed ??
          (usage.inputTokens !== undefined || usage.outputTokens !== undefined
            ? (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0)
            : undefined);
        const promptPrice = asFiniteNumber(selectedModel?.promptPrice);
        const completionPrice = asFiniteNumber(selectedModel?.completionPrice);
        const estimatedCost =
          promptPrice !== undefined && completionPrice !== undefined
            ? (usage.inputTokens ?? 0) * promptPrice + (usage.outputTokens ?? 0) * completionPrice
            : undefined;
        const cost = hasReportedCost ? reportedCost : estimatedCost;
        const generatedSeconds = requestSteps.reduce((sum, step) => sum + step.modelDurationMs, 0) / 1000;
        const outputTokensPerSecond =
          usage.outputTokens !== undefined && generatedSeconds > 0 ? usage.outputTokens / generatedSeconds : undefined;
        const providerGenerationTimeMs = sumCompleteStepMetric(requestSteps, (step) => step.generationTimeMs);
        const providerGeneratedTokens = sumCompleteStepMetric(requestSteps, (step) => step.outputTokens);
        const providerOutputTokensPerSecond =
          providerGenerationTimeMs !== undefined &&
          providerGenerationTimeMs > 0 &&
          providerGeneratedTokens !== undefined
            ? providerGeneratedTokens / (providerGenerationTimeMs / 1000)
            : undefined;
        const cacheDiscount = sumCompleteStepMetric(requestSteps, (step) => step.cacheDiscount);
        const fallbackCount = sumCompleteStepMetric(requestSteps, (step) => step.fallbackCount);
        const webSearchRequests = requestSteps.reduce((sum, step) => sum + (step.webSearchRequests ?? 0), 0);
        const webSearchSources = [
          ...new Map(
            requestSteps.flatMap((step) => step.webSearchSources ?? []).map((source) => [source.url, source] as const),
          ).values(),
        ];

        return {
          usage,
          custom: {
            telemetry: {
              ...common,
              completedAt: new Date(completedAt).toISOString(),
              durationMs: completedAt - requestStartedAt,
              ...(firstOutputAt !== undefined ? { timeToFirstOutputMs: firstOutputAt - requestStartedAt } : {}),
              ...(outputTokensPerSecond !== undefined ? { outputTokensPerSecond } : {}),
              ...(providerOutputTokensPerSecond !== undefined ? { providerOutputTokensPerSecond } : {}),
              ...(providerGenerationTimeMs !== undefined ? { generationTimeMs: providerGenerationTimeMs } : {}),
              ...(contextUsed !== undefined && contextUsed > 0 ? { contextUsed } : {}),
              ...(selectedModel?.contextLength && contextUsed !== undefined && contextUsed > 0
                ? { contextUtilization: Math.min(contextUsed / selectedModel.contextLength, 1) }
                : {}),
              ...(cost !== undefined ? { cost, costType: hasReportedCost ? "reported" : "estimated" } : {}),
              ...(hasUpstreamCost ? { upstreamCost } : {}),
              ...(cacheDiscount !== undefined ? { cacheDiscount } : {}),
              ...(fallbackCount !== undefined ? { fallbackCount } : {}),
              ...(webSearchRequests > 0 ? { webSearchRequests } : {}),
              ...(webSearchSources.length > 0 ? { webSearchSources } : {}),
              finishReason: latestStep?.finishReason ?? part.finishReason,
            },
          },
        };
      },
      onError: getAssistantStreamErrorMessage,
    });
  } catch (error) {
    logger.error("Assistant response could not start", {
      errorType: getAssistantLogErrorType(error),
    });
    return Response.json(
      {
        error:
          "The configured model endpoint could not start this response. Try again, or ask an administrator to verify its URL, model, and credentials.",
      },
      { status: 502 },
    );
  }
}
