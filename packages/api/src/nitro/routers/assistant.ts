import { parse, stringify } from "superjson";
import { z } from "zod/v4";

import {
  assistantProviderCanUseOpenRouterServerTools,
  assistantProviderIds,
  assistantProviderRequiresApiKey,
  resolveAssistantModelId,
} from "@homarr/definitions";

import { orderMessagesByParent } from "../../assistant-message-order";
import type { SourceLeafPath } from "../port-map";
import { authenticatedProcedure } from "../procedure";
import type { SourceProcedureDescriptor } from "../procedure";
import {
  addFeedbackToMessageContent,
  assistantConfigurationId,
  assistantCustomHeadersSchema,
  assistantModelSchema,
  assistantSourceError,
  createAssistantHelpers,
  getGenerationIdsFromMessageContent,
  normalizeAssistantBaseUrl,
  normalizeAssistantDiscoveryPath,
} from "./-assistant/helpers";
import type { AssistantModel, AssistantProcedureResources } from "./-assistant/resources";

export type { AssistantProcedureResources } from "./-assistant/resources";
export type { AssistantContextEntity, AssistantContextReference } from "./-assistant/helpers";

export const assistantImplementedPaths = [
  "assistant.getAvailability",
  "assistant.getContextEntities",
  "assistant.getModelCapabilities",
  "assistant.getRuntimeOptions",
  "assistant.getAdminConfiguration",
  "assistant.updateConnection",
  "assistant.clearCredentials",
  "assistant.discoverModels",
  "assistant.updateConfiguration",
  "assistant.listThreads",
  "assistant.createThread",
  "assistant.updateThreadModel",
  "assistant.getThread",
  "assistant.getGenerationTelemetry",
  "assistant.renameThread",
  "assistant.deleteThread",
  "assistant.appendMessage",
  "assistant.submitFeedback",
  "assistant.deleteMessages",
] as const satisfies readonly SourceLeafPath[];

export const assistantProducerHeldPaths = assistantImplementedPaths;

type AssistantPath = (typeof assistantImplementedPaths)[number];
type AssistantQueryPath = Extract<Extract<SourceProcedureDescriptor, { kind: "query" }>["path"], AssistantPath>;
type AssistantMutationPath = Extract<Extract<SourceProcedureDescriptor, { kind: "mutation" }>["path"], AssistantPath>;
type AssistantAdminQueryPath = "assistant.getAdminConfiguration" | "assistant.discoverModels";
type AssistantAdminMutationPath =
  | "assistant.updateConnection"
  | "assistant.clearCredentials"
  | "assistant.updateConfiguration";

export function createAssistantProcedures(resources: AssistantProcedureResources) {
  const {
    getHomarrProviderBaseUrl,
    getConfigurationAsync,
    getAssistantAvailabilityAsync,
    getProviderHeaders,
    fetchModelsAsync,
    getAssistantModelsAsync,
    getSelectedModelDetailsAsync,
    getAssistantContextEntitiesAsync,
    ownedThreadAsync,
  } = createAssistantHelpers(resources);
  const { assistantConfigurations, assistantMessages, assistantThreads } = resources.tables;
  const { and, asc, desc, eq, handleTransactionsAsync, inArray } = resources.operators;

  const query = (path: Exclude<AssistantQueryPath, AssistantAdminQueryPath>) =>
    authenticatedProcedure({ path, kind: "query", access: { kind: "protected" }, demo: "guarded" }).use(
      async ({ context, next }) => {
        await resources.authority.assertCurrentAsync(context, "protected");
        return next();
      },
    );
  const adminQuery = (path: AssistantAdminQueryPath) =>
    authenticatedProcedure({
      path,
      kind: "query",
      access: { kind: "permission", permission: "admin" },
      demo: "guarded",
    }).use(async ({ context, next }) => {
      await resources.authority.assertCurrentAsync(context, "admin");
      return next();
    });
  const adminMutation = (path: AssistantAdminMutationPath) =>
    authenticatedProcedure({
      path,
      kind: "mutation",
      access: { kind: "permission", permission: "admin" },
      demo: "guarded",
    }).use(async ({ context, next }) => {
      await resources.authority.assertCurrentAsync(context, "admin");
      return next();
    });
  const conversationMutation = (path: Exclude<AssistantMutationPath, AssistantAdminMutationPath>) =>
    authenticatedProcedure({
      path,
      kind: "mutation",
      access: { kind: "protected" },
      demo: "authenticatedException",
    }).use(async ({ context, next }) => {
      await resources.authority.assertCurrentAsync(context, "protected");
      return next();
    });

  return {
    getAvailability: query("assistant.getAvailability").handler(async ({ context }) => {
      return { enabled: await getAssistantAvailabilityAsync(context) };
    }),

    getContextEntities: query("assistant.getContextEntities").handler(async ({ context }) => {
      return await getAssistantContextEntitiesAsync(context);
    }),

    getModelCapabilities: query("assistant.getModelCapabilities")
      .input(z.object({ modelId: z.string().trim().min(1).max(256).optional() }).optional())
      .handler(async ({ context, input }) => {
        const configuration = await getConfigurationAsync(context.db);
        if (!configuration?.enabled || !configuration.modelId) {
          return { imageInput: "unsupported" as const, inputModalities: Array<string>() };
        }
        const model = await getSelectedModelDetailsAsync(configuration, input?.modelId).catch(() => null);
        if (!model || model.inputModalities.length === 0) {
          return { imageInput: "unknown" as const, inputModalities: Array<string>() };
        }
        return {
          imageInput: model.inputModalities.includes("image") ? ("supported" as const) : ("unsupported" as const),
          inputModalities: model.inputModalities,
        };
      }),

    getRuntimeOptions: query("assistant.getRuntimeOptions").handler(async ({ context }) => {
      const configuration = await getConfigurationAsync(context.db);
      if (context.demo.enabled) {
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
        throw assistantSourceError("PRECONDITION_FAILED", "Assistant is not configured.");
      }
      const discoveredModels = await getAssistantModelsAsync(configuration).catch(() => []);
      const resolvedDefaultId =
        resolveAssistantModelId(discoveredModels, configuration.modelId) ?? configuration.modelId;
      const defaultModel: AssistantModel = discoveredModels.find((model) => model.id === resolvedDefaultId) ?? {
        id: resolvedDefaultId,
        name: resolvedDefaultId,
        description: null,
        contextLength: null,
        promptPrice: null,
        completionPrice: null,
        inputModalities: [],
        toolSupport: "unknown",
      };
      return {
        provider: configuration.provider,
        defaultModelId: defaultModel.id,
        models: [defaultModel, ...discoveredModels.filter((model) => model.id !== defaultModel.id)],
      };
    }),

    getAdminConfiguration: adminQuery("assistant.getAdminConfiguration").handler(async ({ context }) => {
      const configuration = await getConfigurationAsync(context.db);
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

    updateConnection: adminMutation("assistant.updateConnection")
      .input(
        z.object({
          provider: z.enum(assistantProviderIds),
          baseUrl: z.string().trim().min(1).max(2048),
          modelDiscoveryPath: z.string().trim().max(512).nullable(),
          apiKey: z.string().trim().min(1).max(2048).optional(),
          clearApiKey: z.boolean().default(false),
          customHeaders: assistantCustomHeadersSchema.optional(),
          clearCustomHeaders: z.boolean().default(false),
        }),
      )
      .handler(async ({ context, input }) => {
        const baseUrl =
          input.provider === "homarr" ? getHomarrProviderBaseUrl() : normalizeAssistantBaseUrl(input.baseUrl);
        const modelDiscoveryPath =
          input.provider === "homarr" ? "/models" : normalizeAssistantDiscoveryPath(input.modelDiscoveryPath);
        const existing = await getConfigurationAsync(context.db);
        const destinationChanged =
          existing !== undefined && (existing.provider !== input.provider || existing.baseUrl !== baseUrl);
        const connectionChanged =
          existing !== undefined && (destinationChanged || existing.modelDiscoveryPath !== modelDiscoveryPath);
        const encryptedApiKey =
          input.provider === "homarr"
            ? null
            : input.apiKey
              ? resources.crypto.encryptSecret(input.apiKey)
              : input.clearApiKey || destinationChanged
                ? null
                : (existing?.encryptedApiKey ?? null);
        const encryptedHeaders =
          input.provider === "homarr"
            ? null
            : input.customHeaders
              ? resources.crypto.encryptSecret(JSON.stringify(input.customHeaders))
              : input.clearCustomHeaders || destinationChanged
                ? null
                : (existing?.encryptedHeaders ?? null);
        if (existing) {
          await context.db
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
            .where(eq(assistantConfigurations.id, assistantConfigurationId));
        } else {
          await context.db.insert(assistantConfigurations).values({
            id: assistantConfigurationId,
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

    clearCredentials: adminMutation("assistant.clearCredentials").handler(async ({ context }) => {
      const existing = await getConfigurationAsync(context.db);
      if (!existing) return;
      await context.db
        .update(assistantConfigurations)
        .set({
          encryptedApiKey: null,
          encryptedHeaders: null,
          modelId: null,
          enabled: false,
          updatedAt: new Date(),
        })
        .where(eq(assistantConfigurations.id, assistantConfigurationId));
    }),

    discoverModels: adminQuery("assistant.discoverModels")
      .output(z.array(assistantModelSchema))
      .handler(async ({ context }) => {
        const configuration = await getConfigurationAsync(context.db);
        if (!configuration) throw assistantSourceError("PRECONDITION_FAILED", "Save a provider connection first.");
        return await getAssistantModelsAsync(configuration, true);
      }),

    updateConfiguration: adminMutation("assistant.updateConfiguration")
      .input(
        z.object({
          enabled: z.boolean(),
          modelId: z.string().trim().min(1).max(256),
          webSearchEnabled: z.boolean().default(false),
        }),
      )
      .handler(async ({ context, input }) => {
        const configuration = await getConfigurationAsync(context.db);
        if (!configuration) throw assistantSourceError("PRECONDITION_FAILED", "Save a provider connection first.");
        const requiresApiKey = assistantProviderRequiresApiKey(configuration.provider);
        if (input.enabled && requiresApiKey && !configuration.encryptedApiKey) {
          throw assistantSourceError("PRECONDITION_FAILED", "This provider requires an API key.");
        }
        if (input.webSearchEnabled && !assistantProviderCanUseOpenRouterServerTools(configuration.provider)) {
          throw assistantSourceError(
            "BAD_REQUEST",
            "Web search requires OpenRouter or an OpenRouter-compatible proxy endpoint.",
          );
        }
        const discoveredModels = configuration.modelDiscoveryPath
          ? await fetchModelsAsync(configuration).catch(() => null)
          : null;
        const modelId = discoveredModels
          ? (resolveAssistantModelId(discoveredModels, input.modelId) ?? input.modelId)
          : input.modelId;
        await context.db
          .update(assistantConfigurations)
          .set({ enabled: input.enabled, modelId, webSearchEnabled: input.webSearchEnabled, updatedAt: new Date() })
          .where(eq(assistantConfigurations.id, assistantConfigurationId));
      }),

    listThreads: query("assistant.listThreads").handler(async ({ context }) => {
      return await context.db.query.assistantThreads.findMany({
        where: eq(assistantThreads.userId, context.principal.user.id),
        orderBy: desc(assistantThreads.updatedAt),
        limit: 100,
      });
    }),

    createThread: conversationMutation("assistant.createThread")
      .input(z.object({ localId: z.string().max(128).optional() }).optional())
      .handler(async ({ context }) => {
        const configuration = await getConfigurationAsync(context.db);
        const id = resources.createId();
        const now = new Date();
        await context.db.insert(assistantThreads).values({
          id,
          userId: context.principal.user.id,
          modelId: configuration?.modelId ?? null,
          createdAt: now,
          updatedAt: now,
        });
        return { id };
      }),

    updateThreadModel: conversationMutation("assistant.updateThreadModel")
      .input(z.object({ threadId: z.string().max(64), modelId: z.string().trim().min(1).max(256) }))
      .handler(async ({ context, input }) => {
        const [thread, configuration] = await Promise.all([
          ownedThreadAsync(context.db, input.threadId, context.principal.user.id),
          getConfigurationAsync(context.db),
        ]);
        if (context.demo.enabled) {
          await context.db
            .update(assistantThreads)
            .set({ modelId: input.modelId, updatedAt: new Date() })
            .where(eq(assistantThreads.id, thread.id));
          return { modelId: input.modelId };
        }
        if (!configuration?.enabled || !configuration.modelId) {
          throw assistantSourceError("PRECONDITION_FAILED", "Assistant is not configured.");
        }
        const selectedModel = await getSelectedModelDetailsAsync(configuration, input.modelId).catch(() => null);
        if (input.modelId !== configuration.modelId && !selectedModel) {
          throw assistantSourceError(
            "BAD_REQUEST",
            "The selected model is not available from the configured provider.",
          );
        }
        const modelId = selectedModel?.id ?? configuration.modelId;
        await context.db
          .update(assistantThreads)
          .set({ modelId, updatedAt: new Date() })
          .where(eq(assistantThreads.id, thread.id));
        return { modelId };
      }),

    getThread: query("assistant.getThread")
      .input(z.object({ threadId: z.string().max(64) }))
      .handler(async ({ context, input }) => {
        const thread = await ownedThreadAsync(context.db, input.threadId, context.principal.user.id);
        const messages = await context.db.query.assistantMessages.findMany({
          where: eq(assistantMessages.threadId, thread.id),
          orderBy: [asc(assistantMessages.createdAt), asc(assistantMessages.id)],
        });
        return {
          thread,
          messages: orderMessagesByParent(messages).map((message) => ({
            id: message.id,
            parentId: message.parentId,
            format: message.format,
            createdAt: message.createdAt,
            content: parse<unknown>(message.content),
          })),
        };
      }),

    getGenerationTelemetry: query("assistant.getGenerationTelemetry")
      .input(z.object({ threadId: z.string().max(64), messageId: z.string().min(1).max(128) }))
      .handler(async ({ context, input }) => {
        const thread = await ownedThreadAsync(context.db, input.threadId, context.principal.user.id);
        const [message, configuration] = await Promise.all([
          context.db.query.assistantMessages.findFirst({
            where: and(eq(assistantMessages.id, input.messageId), eq(assistantMessages.threadId, thread.id)),
          }),
          getConfigurationAsync(context.db),
        ]);
        if (!message) return { complete: true, generations: [] };
        if (configuration?.provider !== "openrouter" || !configuration.encryptedApiKey) {
          return { complete: true, generations: [] };
        }
        const generationReferences = getGenerationIdsFromMessageContent(parse<unknown>(message.content)).filter(
          (reference) =>
            resources.crypto.verifyAssistantGenerationAccessToken(
              {
                userId: context.principal.user.id,
                threadId: thread.id,
                generationId: reference.generationId,
              },
              reference.accessToken,
            ),
        );
        if (generationReferences.length === 0) return { complete: true, generations: [] };
        const generations = await Promise.all(
          generationReferences.map(({ generationId }) =>
            resources.transport.fetchOpenRouterGenerationTelemetryAsync({
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

    renameThread: conversationMutation("assistant.renameThread")
      .input(z.object({ threadId: z.string().max(64), title: z.string().trim().min(1).max(120) }))
      .handler(async ({ context, input }) => {
        await ownedThreadAsync(context.db, input.threadId, context.principal.user.id);
        await context.db
          .update(assistantThreads)
          .set({ title: input.title, updatedAt: new Date() })
          .where(eq(assistantThreads.id, input.threadId));
      }),

    deleteThread: conversationMutation("assistant.deleteThread")
      .input(z.object({ threadId: z.string().max(64) }))
      .handler(async ({ context, input }) => {
        await ownedThreadAsync(context.db, input.threadId, context.principal.user.id);
        await context.db.delete(assistantThreads).where(eq(assistantThreads.id, input.threadId));
      }),

    appendMessage: conversationMutation("assistant.appendMessage")
      .input(
        z.object({
          threadId: z.string().max(64),
          id: z.string().min(1).max(128),
          parentId: z.string().max(128).nullable(),
          format: z.literal("ai-sdk/v6"),
          content: z.unknown(),
        }),
      )
      .handler(async ({ context, input }) => {
        const thread = await ownedThreadAsync(context.db, input.threadId, context.principal.user.id);
        const existing = await context.db.query.assistantMessages.findFirst({
          where: and(eq(assistantMessages.id, input.id), eq(assistantMessages.threadId, thread.id)),
        });
        if (existing) {
          await context.db
            .update(assistantMessages)
            .set({ parentId: input.parentId, format: input.format, content: stringify(input.content) })
            .where(eq(assistantMessages.id, input.id));
        } else {
          await context.db.insert(assistantMessages).values({
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
                  (part: unknown): part is { type: "text"; text: string } =>
                    typeof part === "object" &&
                    part !== null &&
                    "type" in part &&
                    part.type === "text" &&
                    "text" in part &&
                    typeof part.text === "string",
                )
                .map((part: { type: "text"; text: string }) => part.text)
                .join(" ")
                .trim()
                .slice(0, 80) || null
            : null);
        await context.db
          .update(assistantThreads)
          .set({ title, updatedAt: new Date() })
          .where(eq(assistantThreads.id, thread.id));
      }),

    submitFeedback: conversationMutation("assistant.submitFeedback")
      .input(
        z.object({
          threadId: z.string().max(64),
          messageId: z.string().min(1).max(128),
          type: z.enum(["positive", "negative"]),
        }),
      )
      .handler(async ({ context, input }) => {
        const thread = await ownedThreadAsync(context.db, input.threadId, context.principal.user.id);
        await handleTransactionsAsync(context.db, {
          handleAsync: async (db, schema) => {
            await db.transaction(async (transaction) => {
              const table = schema.assistantMessages;
              const [message] = await transaction
                .select({ content: table.content })
                .from(table)
                .where(and(eq(table.id, input.messageId), eq(table.threadId, thread.id)))
                .for("update");
              if (!message) throw assistantSourceError("NOT_FOUND", "Message not found.");
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
              if (!message) throw assistantSourceError("NOT_FOUND", "Message not found.");
              transaction
                .update(assistantMessages)
                .set({ content: addFeedbackToMessageContent(message.content, input.type) })
                .where(and(eq(assistantMessages.id, input.messageId), eq(assistantMessages.threadId, thread.id)))
                .run();
            });
          },
        });
      }),

    deleteMessages: conversationMutation("assistant.deleteMessages")
      .input(z.object({ threadId: z.string().max(64), ids: z.array(z.string().max(128)).max(100) }))
      .handler(async ({ context, input }) => {
        await ownedThreadAsync(context.db, input.threadId, context.principal.user.id);
        if (input.ids.length === 0) return;
        await context.db
          .delete(assistantMessages)
          .where(and(eq(assistantMessages.threadId, input.threadId), inArray(assistantMessages.id, input.ids)));
        await context.db
          .update(assistantThreads)
          .set({ updatedAt: new Date() })
          .where(eq(assistantThreads.id, input.threadId));
      }),
  };
}
