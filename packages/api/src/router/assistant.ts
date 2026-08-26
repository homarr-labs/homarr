import { TRPCError } from "@trpc/server";
import { parse, stringify } from "superjson";
import { z } from "zod/v4";

import { constructIntegrationPermissions } from "@homarr/auth/shared";
import { createId } from "@homarr/common";
import { decryptSecret, encryptSecret } from "@homarr/common/server";
import { and, asc, desc, eq, handleTransactionsAsync, inArray } from "@homarr/db";
import type { Database } from "@homarr/db";
import {
  apps,
  assistantConfigurations,
  assistantMessages,
  assistantThreads,
  groupMembers,
  integrationGroupPermissions,
  integrations,
  integrationUserPermissions,
  items,
  users,
} from "@homarr/db/schema";
import {
  assistantProviderCanUseOpenRouterServerTools,
  assistantProviderIds,
  assistantProviderPresets,
  assistantProviderRequiresApiKey,
  getIconUrl,
  resolveAssistantModelId,
} from "@homarr/definitions";

import type { createTRPCContext } from "../trpc";
import { fetchOpenRouterGenerationTelemetryAsync } from "../assistant-generation-telemetry";
import { env } from "../env";
import { orderMessagesByParent } from "../assistant-message-order";
import { verifyAssistantGenerationAccessToken } from "../assistant-generation-access";
import { createTRPCRouter, isDemoMode, permissionRequiredProcedure, protectedProcedure } from "../trpc";
import { boardRouter, getHomeIdBoardAsync } from "./board";

const adminProcedure = permissionRequiredProcedure.requiresPermission("admin");
const configurationId = "default";
const providerSchema = z.enum(assistantProviderIds);

const modelSchema = z.object({
  id: z.string().min(1).max(256),
  name: z.string().min(1).max(256),
  description: z.string().max(2048).nullable(),
  contextLength: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).nullable(),
  promptPrice: z.string().max(64).nullable(),
  completionPrice: z.string().max(64).nullable(),
  inputModalities: z.array(z.string().max(32)).max(16),
  toolSupport: z.enum(["confirmed", "unknown"]),
});

type CompatibleModel = {
  id?: unknown;
  name?: unknown;
  display_name?: unknown;
  model?: unknown;
  description?: unknown;
  context_length?: unknown;
  max_context_length?: unknown;
  max_input_tokens?: unknown;
  supported_parameters?: unknown;
  input_modalities?: unknown;
  architecture?: { input_modalities?: unknown; output_modalities?: unknown };
  pricing?: { prompt?: unknown; completion?: unknown };
  capabilities?: { function_calling?: unknown };
};

type AssistantConfiguration = typeof assistantConfigurations.$inferSelect;
type AssistantContext = Awaited<ReturnType<typeof createTRPCContext>>;

export type AssistantContextEntity = {
  id: string;
  type: "app" | "integration" | "board" | "widget";
  label: string;
  description: string;
  iconUrl?: string;
  boardId?: string;
};

const modelListCache = new Map<string, { expiresAt: number; value: z.infer<typeof modelSchema>[] }>();

const customHeadersSchema = z
  .record(
    z
      .string()
      .trim()
      .min(1)
      .max(128)
      .regex(/^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/),
    z
      .string()
      .max(2048)
      .refine((value) => !value.includes("\r") && !value.includes("\n")),
  )
  .refine((headers) => Object.keys(headers).length <= 20)
  .refine(
    (headers) =>
      !Object.keys(headers).some((name) =>
        ["connection", "content-length", "host", "transfer-encoding"].includes(name.toLowerCase()),
      ),
    "Hop-by-hop and transport headers cannot be configured.",
  );

const normalizeBaseUrl = (value: string) => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Enter a valid provider URL." });
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "The provider URL must use HTTP or HTTPS without credentials, query parameters, or fragments.",
    });
  }
  return url.toString().replace(/\/$/, "");
};

const normalizeDiscoveryPath = (value: string | null) => {
  if (value === null || value.trim() === "") return null;
  const path = value.trim();
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("?") || path.includes("#")) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "The model discovery path must be an absolute path such as /models.",
    });
  }
  return path;
};

const getHomarrProviderBaseUrl = () => {
  const baseUrl = env.WORKSHOP_API_URL ?? env.HOMARR_WEBSITE_URL;
  return baseUrl ? `${baseUrl.replace(/\/+$/u, "")}/api/ai/v1` : assistantProviderPresets.homarr.baseUrl;
};

const getConfigurationAsync = async (db: Database) => {
  return await db.query.assistantConfigurations.findFirst({
    where: eq(assistantConfigurations.id, configurationId),
  });
};

const decryptCustomHeaders = (encryptedHeaders: `${string}.${string}` | null) => {
  if (!encryptedHeaders) return {};
  try {
    return customHeadersSchema.parse(JSON.parse(decryptSecret(encryptedHeaders)));
  } catch {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "The stored provider headers could not be decrypted.",
    });
  }
};

const getProviderHeaders = (configuration: AssistantConfiguration) => {
  const headers: Record<string, string> = {};
  if (configuration.encryptedApiKey) {
    const apiKey = decryptSecret(configuration.encryptedApiKey);
    if (assistantProviderPresets[configuration.provider].discoveryAuthentication === "anthropic") {
      headers["X-Api-Key"] = apiKey;
      headers["anthropic-version"] = "2023-06-01";
    } else {
      headers.Authorization = `Bearer ${apiKey}`;
    }
  }
  if (configuration.provider === "openrouter") {
    headers["HTTP-Referer"] ??= "https://homarr.dev";
    headers["X-OpenRouter-Title"] ??= "Homarr AI Assistant";
  }
  return { ...headers, ...decryptCustomHeaders(configuration.encryptedHeaders) };
};

const getGenerationIdsFromMessageContent = (content: unknown) => {
  if (!content || typeof content !== "object" || Array.isArray(content)) return [];
  const metadata = (content as { metadata?: unknown }).metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return [];
  const custom = (metadata as { custom?: unknown }).custom;
  if (!custom || typeof custom !== "object" || Array.isArray(custom)) return [];
  const telemetry = (custom as { telemetry?: unknown }).telemetry;
  if (!telemetry || typeof telemetry !== "object" || Array.isArray(telemetry)) return [];
  const steps = (telemetry as { steps?: unknown }).steps;
  if (!Array.isArray(steps)) return [];
  return steps
    .flatMap((step) => {
      if (!step || typeof step !== "object" || Array.isArray(step)) return [];
      const generationId = (step as { generationId?: unknown }).generationId;
      const accessToken = (step as { generationAccessToken?: unknown }).generationAccessToken;
      return typeof generationId === "string" &&
        /^gen-[A-Za-z0-9_-]{1,128}$/.test(generationId) &&
        typeof accessToken === "string" &&
        /^[A-Za-z0-9_-]{43}$/.test(accessToken)
        ? [{ generationId, accessToken }]
        : [];
    })
    .slice(0, 8);
};

const fetchModelsAsync = async (configuration: AssistantConfiguration) => {
  if (!configuration.modelDiscoveryPath) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Model discovery is disabled for this provider. Enter a model ID manually.",
    });
  }

  const endpoint = `${configuration.baseUrl}${configuration.modelDiscoveryPath}`;
  let response: Response;
  try {
    response = await fetch(endpoint, {
      headers: getProviderHeaders(configuration),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new TRPCError({
      code: "BAD_GATEWAY",
      message: "The model endpoint could not be reached from the Homarr server.",
    });
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "The provider rejected the configured credentials." });
    }
    throw new TRPCError({
      code: "BAD_GATEWAY",
      message: `Model discovery failed with status ${response.status}.`,
    });
  }

  let body: { data?: CompatibleModel[]; models?: CompatibleModel[] } | CompatibleModel[];
  try {
    body = (await response.json()) as typeof body;
  } catch {
    throw new TRPCError({ code: "BAD_GATEWAY", message: "The model endpoint returned invalid JSON." });
  }
  const models = (Array.isArray(body) ? body : (body.data ?? body.models ?? [])).slice(0, 1_000);
  return models
    .filter((model) => {
      if (configuration.provider !== "openrouter" && configuration.provider !== "homarr") return true;
      const parameters = Array.isArray(model.supported_parameters) ? model.supported_parameters : [];
      const outputModalities = Array.isArray(model.architecture?.output_modalities)
        ? model.architecture.output_modalities
        : [];
      return parameters.includes("tools") && (outputModalities.length === 0 || outputModalities.includes("text"));
    })
    .flatMap((model) => {
      const id = typeof model.id === "string" ? model.id : typeof model.model === "string" ? model.model : null;
      if (!id || id.length > 256) return [];
      const rawName =
        typeof model.name === "string" ? model.name : typeof model.display_name === "string" ? model.display_name : id;
      const name = rawName.trim() || id;
      const contextLength =
        typeof model.context_length === "number" &&
        Number.isSafeInteger(model.context_length) &&
        model.context_length > 0
          ? model.context_length
          : typeof model.max_context_length === "number" &&
              Number.isSafeInteger(model.max_context_length) &&
              model.max_context_length > 0
            ? model.max_context_length
            : typeof model.max_input_tokens === "number" &&
                Number.isSafeInteger(model.max_input_tokens) &&
                model.max_input_tokens > 0
              ? model.max_input_tokens
              : null;
      const toolSupport =
        configuration.provider === "openrouter" ||
        configuration.provider === "homarr" ||
        model.capabilities?.function_calling === true ||
        configuration.provider === "anthropic"
          ? ("confirmed" as const)
          : ("unknown" as const);
      const rawInputModalities = Array.isArray(model.architecture?.input_modalities)
        ? model.architecture.input_modalities
        : Array.isArray(model.input_modalities)
          ? model.input_modalities
          : [];
      const inputModalities = rawInputModalities
        .filter((modality): modality is string => typeof modality === "string" && modality.length <= 32)
        .slice(0, 16);
      return [
        {
          id,
          name: name.slice(0, 256),
          description: typeof model.description === "string" ? model.description.slice(0, 2048) : null,
          contextLength,
          promptPrice: typeof model.pricing?.prompt === "string" ? model.pricing.prompt.slice(0, 64) : null,
          completionPrice: typeof model.pricing?.completion === "string" ? model.pricing.completion.slice(0, 64) : null,
          inputModalities,
          toolSupport,
        },
      ];
    })
    .toSorted((left, right) => left.name.localeCompare(right.name));
};

const getModelListCacheKey = (configuration: AssistantConfiguration) =>
  [
    configuration.provider,
    configuration.baseUrl,
    configuration.modelDiscoveryPath,
    configuration.updatedAt.getTime(),
  ].join(":");

export const getAssistantModelsAsync = async (configuration: AssistantConfiguration, refresh = false) => {
  if (!configuration.modelDiscoveryPath) return [];
  const cacheKey = getModelListCacheKey(configuration);
  const cached = modelListCache.get(cacheKey);
  if (!refresh && cached && cached.expiresAt > Date.now()) return cached.value;

  const value = await fetchModelsAsync(configuration);
  modelListCache.clear();
  modelListCache.set(cacheKey, { expiresAt: Date.now() + 10 * 60_000, value });
  return value;
};

export const getSelectedModelDetailsAsync = async (
  configuration: AssistantConfiguration,
  requestedModelId = configuration.modelId,
) => {
  if (!requestedModelId || !configuration.modelDiscoveryPath) return null;
  const models = await getAssistantModelsAsync(configuration);
  const resolvedModelId = resolveAssistantModelId(models, requestedModelId);
  return models.find((model) => model.id === resolvedModelId) ?? null;
};

export const getAssistantContextEntitiesAsync = async (ctx: AssistantContext): Promise<AssistantContextEntity[]> => {
  if (!ctx.session) return [];

  const groupsOfCurrentUser = await ctx.db.query.groupMembers.findMany({
    where: eq(groupMembers.userId, ctx.session.user.id),
  });
  const [availableBoards, availableIntegrations, availableApps, currentUser] = await Promise.all([
    boardRouter.createCaller(ctx).getAllBoards(),
    ctx.db.query.integrations.findMany({
      columns: { id: true, name: true, kind: true },
      with: {
        userPermissions: {
          where: eq(integrationUserPermissions.userId, ctx.session.user.id),
        },
        groupPermissions: {
          where: inArray(
            integrationGroupPermissions.groupId,
            groupsOfCurrentUser.map((group) => group.groupId).concat(""),
          ),
        },
      },
      orderBy: asc(integrations.name),
      limit: 250,
    }),
    ctx.db.query.apps.findMany({
      columns: { id: true, name: true, description: true, iconUrl: true },
      orderBy: asc(apps.name),
      limit: 250,
    }),
    ctx.db.query.users.findFirst({ where: eq(users.id, ctx.session.user.id) }),
  ]);
  const homeBoardId = await getHomeIdBoardAsync(ctx.db, currentUser ?? null, ctx.deviceType);
  const boardsById = new Map(availableBoards.map((board) => [board.id, board]));
  const availableItems =
    availableBoards.length === 0
      ? []
      : await ctx.db.query.items.findMany({
          columns: { id: true, boardId: true, kind: true },
          where: inArray(
            items.boardId,
            availableBoards.map((board) => board.id),
          ),
          orderBy: asc(items.kind),
          limit: 500,
        });

  return [
    ...availableApps.map(
      (app): AssistantContextEntity => ({
        id: app.id,
        type: "app",
        label: app.name,
        description: app.description ?? "Homarr app",
        iconUrl: app.iconUrl,
      }),
    ),
    ...availableIntegrations
      .filter((integration) => constructIntegrationPermissions(integration, ctx.session).hasUseAccess)
      .map(
        (integration): AssistantContextEntity => ({
          id: integration.id,
          type: "integration",
          label: integration.name,
          description: `${integration.kind} integration`,
          iconUrl: getIconUrl(integration.kind),
        }),
      ),
    ...availableBoards.map(
      (board): AssistantContextEntity => ({
        id: board.id,
        type: "board",
        label: board.name,
        description:
          board.id === homeBoardId ? "Home board" : board.isMobileHome ? "Mobile home board" : "Homarr board",
      }),
    ),
    ...availableItems.flatMap((item): AssistantContextEntity[] => {
      const board = boardsById.get(item.boardId);
      if (!board) return [];
      return [
        {
          id: item.id,
          type: "widget",
          label: `${item.kind} · ${board.name}`,
          description: `${item.kind} widget on ${board.name}`,
          boardId: board.id,
        },
      ];
    }),
  ];
};

const ownedThreadAsync = async (db: Database, threadId: string, userId: string) => {
  const thread = await db.query.assistantThreads.findFirst({
    where: and(eq(assistantThreads.id, threadId), eq(assistantThreads.userId, userId)),
  });
  if (!thread) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found." });
  }
  return thread;
};

const addFeedbackToMessageContent = (serializedContent: string, type: "positive" | "negative") => {
  let content: unknown;
  try {
    content = parse(serializedContent);
  } catch {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The stored message is invalid." });
  }
  if (!content || typeof content !== "object" || Array.isArray(content)) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The stored message is invalid." });
  }
  const metadata =
    "metadata" in content &&
    content.metadata &&
    typeof content.metadata === "object" &&
    !Array.isArray(content.metadata)
      ? content.metadata
      : {};
  return stringify({
    ...content,
    metadata: { ...metadata, submittedFeedback: { type } },
  });
};

export const assistantRouter = createTRPCRouter({
  getAvailability: protectedProcedure.query(async ({ ctx }) => {
    if (isDemoMode) {
      return { enabled: true };
    }
    const configuration = await getConfigurationAsync(ctx.db);
    const requiresApiKey = configuration ? assistantProviderRequiresApiKey(configuration.provider) : false;
    return {
      enabled: Boolean(
        configuration?.enabled && configuration.modelId && (!requiresApiKey || configuration.encryptedApiKey),
      ),
    };
  }),

  getContextEntities: protectedProcedure.query(async ({ ctx }) => {
    return await getAssistantContextEntitiesAsync(ctx);
  }),

  getModelCapabilities: protectedProcedure
    .input(z.object({ modelId: z.string().trim().min(1).max(256).optional() }).optional())
    .query(async ({ ctx, input }) => {
      const configuration = await getConfigurationAsync(ctx.db);
      if (!configuration?.enabled || !configuration.modelId) {
        return { imageInput: "unsupported" as const, inputModalities: [] as string[] };
      }
      const model = await getSelectedModelDetailsAsync(configuration, input?.modelId).catch(() => null);
      if (!model || model.inputModalities.length === 0) {
        return { imageInput: "unknown" as const, inputModalities: [] as string[] };
      }
      return {
        imageInput: model.inputModalities.includes("image") ? ("supported" as const) : ("unsupported" as const),
        inputModalities: model.inputModalities,
      };
    }),

  getRuntimeOptions: protectedProcedure.query(async ({ ctx }) => {
    const configuration = await getConfigurationAsync(ctx.db);
    if (isDemoMode) {
      return {
        provider: "custom" as const,
        defaultModelId: "homarr-assistant",
        models: [
          {
            id: "homarr-assistant",
            name: "Assistant (Demo)",
            description: null,
            contextLength: null,
            promptPrice: null,
            completionPrice: null,
            inputModalities: [],
            toolSupport: "unknown" as const,
          },
        ],
      };
    }
    if (!configuration?.enabled || !configuration.modelId) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Assistant is not configured." });
    }
    const discoveredModels = await getAssistantModelsAsync(configuration).catch(() => []);
    const resolvedDefaultId = resolveAssistantModelId(discoveredModels, configuration.modelId) ?? configuration.modelId;
    const defaultModel = discoveredModels.find((model) => model.id === resolvedDefaultId) ?? {
      id: resolvedDefaultId,
      name: resolvedDefaultId,
      description: null,
      contextLength: null,
      promptPrice: null,
      completionPrice: null,
      inputModalities: [],
      toolSupport: "unknown" as const,
    };
    return {
      provider: configuration.provider,
      defaultModelId: defaultModel.id,
      models: [defaultModel, ...discoveredModels.filter((model) => model.id !== defaultModel.id)],
    };
  }),

  getAdminConfiguration: adminProcedure.query(async ({ ctx }) => {
    const configuration = await getConfigurationAsync(ctx.db);
    return {
      connectionConfigured: Boolean(configuration),
      enabled: configuration?.enabled ?? false,
      webSearchEnabled: configuration?.webSearchEnabled ?? false,
      provider: configuration?.provider ?? "homarr",
      baseUrl: configuration?.baseUrl ?? getHomarrProviderBaseUrl(),
      modelDiscoveryPath: configuration?.modelDiscoveryPath ?? "/models",
      apiKeyConfigured: Boolean(configuration?.encryptedApiKey),
      customHeadersConfigured: Boolean(configuration?.encryptedHeaders),
      modelId: configuration?.modelId ?? null,
      updatedAt: configuration?.updatedAt ?? null,
    };
  }),

  updateConnection: adminProcedure
    .input(
      z.object({
        provider: providerSchema,
        baseUrl: z.string().trim().min(1).max(2048),
        modelDiscoveryPath: z.string().trim().max(512).nullable(),
        apiKey: z.string().trim().min(1).max(2048).optional(),
        clearApiKey: z.boolean().default(false),
        customHeaders: customHeadersSchema.optional(),
        clearCustomHeaders: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const baseUrl = input.provider === "homarr" ? getHomarrProviderBaseUrl() : normalizeBaseUrl(input.baseUrl);
      const modelDiscoveryPath =
        input.provider === "homarr" ? "/models" : normalizeDiscoveryPath(input.modelDiscoveryPath);
      const existing = await getConfigurationAsync(ctx.db);
      const destinationChanged =
        existing !== undefined && (existing.provider !== input.provider || existing.baseUrl !== baseUrl);
      const connectionChanged =
        existing !== undefined && (destinationChanged || existing.modelDiscoveryPath !== modelDiscoveryPath);
      const encryptedApiKey =
        input.provider === "homarr"
          ? null
          : input.apiKey
            ? encryptSecret(input.apiKey)
            : input.clearApiKey || destinationChanged
              ? null
              : (existing?.encryptedApiKey ?? null);
      const encryptedHeaders =
        input.provider === "homarr"
          ? null
          : input.customHeaders
            ? encryptSecret(JSON.stringify(input.customHeaders))
            : input.clearCustomHeaders || destinationChanged
              ? null
              : (existing?.encryptedHeaders ?? null);

      if (existing) {
        await ctx.db
          .update(assistantConfigurations)
          .set({
            provider: input.provider,
            baseUrl,
            modelDiscoveryPath,
            encryptedApiKey,
            encryptedHeaders,
            modelId: connectionChanged ? null : existing.modelId,
            enabled: connectionChanged ? false : existing.enabled,
            webSearchEnabled:
              destinationChanged || !assistantProviderCanUseOpenRouterServerTools(input.provider)
                ? false
                : existing.webSearchEnabled,
            updatedAt: new Date(),
          })
          .where(eq(assistantConfigurations.id, configurationId));
      } else {
        await ctx.db.insert(assistantConfigurations).values({
          id: configurationId,
          provider: input.provider,
          baseUrl,
          modelDiscoveryPath,
          encryptedApiKey,
          encryptedHeaders,
        });
      }

      return {
        apiKeyConfigured: Boolean(encryptedApiKey),
        customHeadersConfigured: Boolean(encryptedHeaders),
        credentialsClearedForDestinationChange: destinationChanged && !input.apiKey && !input.customHeaders,
      };
    }),

  clearCredentials: adminProcedure.mutation(async ({ ctx }) => {
    const existing = await getConfigurationAsync(ctx.db);
    if (!existing) return;
    await ctx.db
      .update(assistantConfigurations)
      .set({
        encryptedApiKey: null,
        encryptedHeaders: null,
        modelId: null,
        enabled: false,
        updatedAt: new Date(),
      })
      .where(eq(assistantConfigurations.id, configurationId));
  }),

  discoverModels: adminProcedure.output(z.array(modelSchema)).query(async ({ ctx }) => {
    const configuration = await getConfigurationAsync(ctx.db);
    if (!configuration) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Save a provider connection first." });
    }
    return await getAssistantModelsAsync(configuration, true);
  }),

  updateConfiguration: adminProcedure
    .input(
      z.object({
        enabled: z.boolean(),
        modelId: z.string().trim().min(1).max(256),
        webSearchEnabled: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const configuration = await getConfigurationAsync(ctx.db);
      if (!configuration) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Save a provider connection first." });
      }
      const requiresApiKey = assistantProviderRequiresApiKey(configuration.provider);
      if (input.enabled && requiresApiKey && !configuration.encryptedApiKey) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "This provider requires an API key." });
      }
      if (input.webSearchEnabled && !assistantProviderCanUseOpenRouterServerTools(configuration.provider)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Web search requires OpenRouter or an OpenRouter-compatible proxy endpoint.",
        });
      }
      const discoveredModels = configuration.modelDiscoveryPath
        ? await fetchModelsAsync(configuration).catch(() => null)
        : null;
      const modelId = discoveredModels
        ? (resolveAssistantModelId(discoveredModels, input.modelId) ?? input.modelId)
        : input.modelId;
      await ctx.db
        .update(assistantConfigurations)
        .set({ enabled: input.enabled, modelId, webSearchEnabled: input.webSearchEnabled, updatedAt: new Date() })
        .where(eq(assistantConfigurations.id, configurationId));
    }),

  listThreads: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.query.assistantThreads.findMany({
      where: eq(assistantThreads.userId, ctx.session.user.id),
      orderBy: desc(assistantThreads.updatedAt),
      limit: 100,
    });
  }),

  createThread: protectedProcedure
    .input(z.object({ localId: z.string().max(128).optional() }).optional())
    .mutation(async ({ ctx }) => {
      const configuration = await getConfigurationAsync(ctx.db);
      const id = createId();
      const now = new Date();
      await ctx.db.insert(assistantThreads).values({
        id,
        userId: ctx.session.user.id,
        modelId: configuration?.modelId ?? null,
        createdAt: now,
        updatedAt: now,
      });
      return { id };
    }),

  updateThreadModel: protectedProcedure
    .input(z.object({ threadId: z.string().max(64), modelId: z.string().trim().min(1).max(256) }))
    .mutation(async ({ ctx, input }) => {
      const [thread, configuration] = await Promise.all([
        ownedThreadAsync(ctx.db, input.threadId, ctx.session.user.id),
        getConfigurationAsync(ctx.db),
      ]);
      if (!configuration?.enabled || !configuration.modelId) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Assistant is not configured." });
      }
      const selectedModel = await getSelectedModelDetailsAsync(configuration, input.modelId).catch(() => null);
      if (input.modelId !== configuration.modelId && !selectedModel) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "The selected model is not available from the configured provider.",
        });
      }
      const modelId = selectedModel?.id ?? configuration.modelId;
      await ctx.db
        .update(assistantThreads)
        .set({ modelId, updatedAt: new Date() })
        .where(eq(assistantThreads.id, thread.id));
      return { modelId };
    }),

  getThread: protectedProcedure.input(z.object({ threadId: z.string().max(64) })).query(async ({ ctx, input }) => {
    const thread = await ownedThreadAsync(ctx.db, input.threadId, ctx.session.user.id);
    const messages = await ctx.db.query.assistantMessages.findMany({
      where: eq(assistantMessages.threadId, thread.id),
      // `created_at` is only second-granular on MySQL and SQLite, so sibling messages written in the
      // same second tie. The id tiebreaker makes the database order at least deterministic.
      orderBy: [asc(assistantMessages.createdAt), asc(assistantMessages.id)],
    });
    return {
      thread,
      messages: orderMessagesByParent(messages).map((message) => ({
        id: message.id,
        parentId: message.parentId,
        format: message.format,
        createdAt: message.createdAt,
        content: parse(message.content),
      })),
    };
  }),

  getGenerationTelemetry: protectedProcedure
    .input(
      z.object({
        threadId: z.string().max(64),
        messageId: z.string().min(1).max(128),
      }),
    )
    .query(async ({ ctx, input }) => {
      const thread = await ownedThreadAsync(ctx.db, input.threadId, ctx.session.user.id);
      const [message, configuration] = await Promise.all([
        ctx.db.query.assistantMessages.findFirst({
          where: and(eq(assistantMessages.id, input.messageId), eq(assistantMessages.threadId, thread.id)),
        }),
        getConfigurationAsync(ctx.db),
      ]);
      if (!message) return { complete: true, generations: [] };
      if (configuration?.provider !== "openrouter" || !configuration.encryptedApiKey) {
        return { complete: true, generations: [] };
      }

      const generationReferences = getGenerationIdsFromMessageContent(parse(message.content)).filter((reference) =>
        verifyAssistantGenerationAccessToken(
          {
            userId: ctx.session.user.id,
            threadId: thread.id,
            generationId: reference.generationId,
          },
          reference.accessToken,
        ),
      );
      if (generationReferences.length === 0) return { complete: true, generations: [] };
      const generations = await Promise.all(
        generationReferences.map(({ generationId }) =>
          fetchOpenRouterGenerationTelemetryAsync({
            baseUrl: configuration.baseUrl,
            generationId,
            headers: getProviderHeaders(configuration),
          }),
        ),
      );
      return {
        complete: generations.every((generation) => generation !== null),
        generations: generations.filter((generation) => generation !== null),
      };
    }),

  renameThread: protectedProcedure
    .input(z.object({ threadId: z.string().max(64), title: z.string().trim().min(1).max(120) }))
    .mutation(async ({ ctx, input }) => {
      await ownedThreadAsync(ctx.db, input.threadId, ctx.session.user.id);
      await ctx.db
        .update(assistantThreads)
        .set({ title: input.title, updatedAt: new Date() })
        .where(eq(assistantThreads.id, input.threadId));
    }),

  deleteThread: protectedProcedure
    .input(z.object({ threadId: z.string().max(64) }))
    .mutation(async ({ ctx, input }) => {
      await ownedThreadAsync(ctx.db, input.threadId, ctx.session.user.id);
      await ctx.db.delete(assistantThreads).where(eq(assistantThreads.id, input.threadId));
    }),

  appendMessage: protectedProcedure
    .input(
      z.object({
        threadId: z.string().max(64),
        id: z.string().min(1).max(128),
        parentId: z.string().max(128).nullable(),
        // The current assistant-ui AI SDK v7 adapter uses this value as its persisted wire-format identifier.
        format: z.literal("ai-sdk/v6"),
        content: z.unknown(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const thread = await ownedThreadAsync(ctx.db, input.threadId, ctx.session.user.id);
      const existing = await ctx.db.query.assistantMessages.findFirst({
        where: and(eq(assistantMessages.id, input.id), eq(assistantMessages.threadId, thread.id)),
      });
      if (existing) {
        await ctx.db
          .update(assistantMessages)
          .set({ parentId: input.parentId, format: input.format, content: stringify(input.content) })
          .where(eq(assistantMessages.id, input.id));
      } else {
        await ctx.db.insert(assistantMessages).values({
          id: input.id,
          threadId: thread.id,
          parentId: input.parentId,
          format: input.format,
          content: stringify(input.content),
        });
      }

      const title =
        thread.title ??
        (typeof input.content === "object" &&
        input.content !== null &&
        "role" in input.content &&
        input.content.role === "user" &&
        "parts" in input.content &&
        Array.isArray(input.content.parts)
          ? input.content.parts
              .filter(
                (part): part is { type: "text"; text: string } =>
                  typeof part === "object" &&
                  part !== null &&
                  "type" in part &&
                  part.type === "text" &&
                  "text" in part &&
                  typeof part.text === "string",
              )
              .map((part) => part.text)
              .join(" ")
              .trim()
              .slice(0, 80) || null
          : null);

      await ctx.db
        .update(assistantThreads)
        .set({ title, updatedAt: new Date() })
        .where(eq(assistantThreads.id, thread.id));
    }),

  submitFeedback: protectedProcedure
    .input(
      z.object({
        threadId: z.string().max(64),
        messageId: z.string().min(1).max(128),
        type: z.enum(["positive", "negative"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const thread = await ownedThreadAsync(ctx.db, input.threadId, ctx.session.user.id);
      await handleTransactionsAsync(ctx.db, {
        handleAsync: async (db, schema) => {
          await db.transaction(async (transaction) => {
            const table = schema.assistantMessages;
            const [message] = await transaction
              .select({ content: table.content })
              .from(table)
              .where(and(eq(table.id, input.messageId), eq(table.threadId, thread.id)))
              .for("update");
            if (!message) throw new TRPCError({ code: "NOT_FOUND", message: "Message not found." });
            await transaction
              .update(table)
              .set({ content: addFeedbackToMessageContent(message.content, input.type) })
              .where(and(eq(table.id, input.messageId), eq(table.threadId, thread.id)));
          });
        },
        handleSync: (db) => {
          db.transaction((transaction) => {
            const message = transaction
              .select({ content: assistantMessages.content })
              .from(assistantMessages)
              .where(and(eq(assistantMessages.id, input.messageId), eq(assistantMessages.threadId, thread.id)))
              .get();
            if (!message) throw new TRPCError({ code: "NOT_FOUND", message: "Message not found." });
            transaction
              .update(assistantMessages)
              .set({ content: addFeedbackToMessageContent(message.content, input.type) })
              .where(and(eq(assistantMessages.id, input.messageId), eq(assistantMessages.threadId, thread.id)))
              .run();
          });
        },
      });
    }),

  deleteMessages: protectedProcedure
    .input(z.object({ threadId: z.string().max(64), ids: z.array(z.string().max(128)).max(100) }))
    .mutation(async ({ ctx, input }) => {
      await ownedThreadAsync(ctx.db, input.threadId, ctx.session.user.id);
      if (input.ids.length === 0) return;
      await ctx.db
        .delete(assistantMessages)
        .where(and(eq(assistantMessages.threadId, input.threadId), inArray(assistantMessages.id, input.ids)));
      await ctx.db
        .update(assistantThreads)
        .set({ updatedAt: new Date() })
        .where(eq(assistantThreads.id, input.threadId));
    }),
});

export { fetchModelsAsync, getConfigurationAsync, ownedThreadAsync };
