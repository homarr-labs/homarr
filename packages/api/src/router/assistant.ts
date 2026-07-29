import { TRPCError } from "@trpc/server";
import { parse, stringify } from "superjson";
import { z } from "zod/v4";

import { createId } from "@homarr/common";
import { decryptSecret, encryptSecret } from "@homarr/common/server";
import { and, desc, eq, inArray } from "@homarr/db";
import type { Database } from "@homarr/db";
import { assistantConfigurations, assistantMessages, assistantThreads } from "@homarr/db/schema";
import { assistantProviderIds, assistantProviderPresets, assistantProviderRequiresApiKey } from "@homarr/definitions";

import { createTRPCRouter, permissionRequiredProcedure, protectedProcedure } from "../trpc";

const adminProcedure = permissionRequiredProcedure.requiresPermission("admin");
const configurationId = "default";
const providerSchema = z.enum(assistantProviderIds);

const modelSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  contextLength: z.number().nullable(),
  promptPrice: z.string().nullable(),
  completionPrice: z.string().nullable(),
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
  architecture?: { output_modalities?: unknown };
  pricing?: { prompt?: unknown; completion?: unknown };
  capabilities?: { function_calling?: unknown };
};

type AssistantConfiguration = typeof assistantConfigurations.$inferSelect;

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
    headers["X-Title"] ??= "Homarr Assistant";
  }
  return { ...headers, ...decryptCustomHeaders(configuration.encryptedHeaders) };
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
  const models = Array.isArray(body) ? body : (body.data ?? body.models ?? []);
  return models
    .filter((model) => {
      if (configuration.provider !== "openrouter") return true;
      const parameters = Array.isArray(model.supported_parameters) ? model.supported_parameters : [];
      const outputModalities = Array.isArray(model.architecture?.output_modalities)
        ? model.architecture.output_modalities
        : [];
      return parameters.includes("tools") && (outputModalities.length === 0 || outputModalities.includes("text"));
    })
    .flatMap((model) => {
      const id = typeof model.id === "string" ? model.id : typeof model.model === "string" ? model.model : null;
      if (!id) return [];
      const name =
        typeof model.name === "string" ? model.name : typeof model.display_name === "string" ? model.display_name : id;
      const contextLength =
        typeof model.context_length === "number"
          ? model.context_length
          : typeof model.max_context_length === "number"
            ? model.max_context_length
            : typeof model.max_input_tokens === "number"
              ? model.max_input_tokens
              : null;
      const toolSupport =
        configuration.provider === "openrouter" ||
        model.capabilities?.function_calling === true ||
        configuration.provider === "anthropic"
          ? ("confirmed" as const)
          : ("unknown" as const);
      return [
        {
          id,
          name,
          description: typeof model.description === "string" ? model.description : null,
          contextLength,
          promptPrice: typeof model.pricing?.prompt === "string" ? model.pricing.prompt : null,
          completionPrice: typeof model.pricing?.completion === "string" ? model.pricing.completion : null,
          toolSupport,
        },
      ];
    })
    .toSorted((left, right) => left.name.localeCompare(right.name));
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

export const assistantRouter = createTRPCRouter({
  getAvailability: protectedProcedure
    .meta({
      mcp: {
        enabled: true,
        description: "Check whether Homarr Assistant is enabled and configured for the current user",
      },
    })
    .query(async ({ ctx }) => {
      const configuration = await getConfigurationAsync(ctx.db);
      const requiresApiKey = configuration ? assistantProviderRequiresApiKey(configuration.provider) : false;
      return {
        enabled: Boolean(
          configuration?.enabled && configuration.modelId && (!requiresApiKey || configuration.encryptedApiKey),
        ),
      };
    }),

  getAdminConfiguration: adminProcedure.query(async ({ ctx }) => {
    const configuration = await getConfigurationAsync(ctx.db);
    return {
      connectionConfigured: Boolean(configuration),
      enabled: configuration?.enabled ?? false,
      provider: configuration?.provider ?? "openrouter",
      baseUrl: configuration?.baseUrl ?? "https://openrouter.ai/api/v1",
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
      const baseUrl = normalizeBaseUrl(input.baseUrl);
      const modelDiscoveryPath = normalizeDiscoveryPath(input.modelDiscoveryPath);
      const existing = await getConfigurationAsync(ctx.db);
      const destinationChanged =
        existing !== undefined && (existing.provider !== input.provider || existing.baseUrl !== baseUrl);
      const encryptedApiKey = input.apiKey
        ? encryptSecret(input.apiKey)
        : input.clearApiKey || destinationChanged
          ? null
          : (existing?.encryptedApiKey ?? null);
      const encryptedHeaders = input.customHeaders
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
            modelId: destinationChanged ? null : existing.modelId,
            enabled: destinationChanged ? false : existing.enabled,
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
    return await fetchModelsAsync(configuration);
  }),

  updateConfiguration: adminProcedure
    .input(z.object({ enabled: z.boolean(), modelId: z.string().trim().min(1).max(256) }))
    .mutation(async ({ ctx, input }) => {
      const configuration = await getConfigurationAsync(ctx.db);
      if (!configuration) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Save a provider connection first." });
      }
      const requiresApiKey = assistantProviderRequiresApiKey(configuration.provider);
      if (input.enabled && requiresApiKey && !configuration.encryptedApiKey) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "This provider requires an API key." });
      }
      await ctx.db
        .update(assistantConfigurations)
        .set({ enabled: input.enabled, modelId: input.modelId, updatedAt: new Date() })
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

  getThread: protectedProcedure.input(z.object({ threadId: z.string().max(64) })).query(async ({ ctx, input }) => {
    const thread = await ownedThreadAsync(ctx.db, input.threadId, ctx.session.user.id);
    const messages = await ctx.db.query.assistantMessages.findMany({
      where: eq(assistantMessages.threadId, thread.id),
      orderBy: assistantMessages.createdAt,
    });
    return {
      thread,
      messages: messages.map((message) => ({
        id: message.id,
        parentId: message.parentId,
        format: message.format,
        content: parse(message.content),
      })),
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

  setThreadStatus: protectedProcedure
    .input(z.object({ threadId: z.string().max(64), status: z.enum(["regular", "archived"]) }))
    .mutation(async ({ ctx, input }) => {
      await ownedThreadAsync(ctx.db, input.threadId, ctx.session.user.id);
      await ctx.db
        .update(assistantThreads)
        .set({ status: input.status, updatedAt: new Date() })
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
