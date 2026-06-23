import { observable } from "@trpc/server/observable";
import { z } from "zod/v4";

import { createLogger } from "@homarr/core/infrastructure/logs";
import { createIntegrationAsync } from "@homarr/integrations";
import {
  openWebUiChatRequestHandler,
  openWebUiChatsRequestHandler,
  openWebUiKnowledgeRequestHandler,
  openWebUiModelsRequestHandler,
} from "@homarr/request-handler/open-webui";

import { createOneIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../../trpc";

const logger = createLogger({ module: "openWebUiRouter" });

const messageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string(),
});

// Outbound completion messages may carry multimodal parts (text + images),
// so users can attach images to a message.
const contentPartSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text: z.string() }),
  z.object({ type: z.literal("image_url"), image_url: z.object({ url: z.string() }) }),
]);

const completionMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.union([z.string(), z.array(contentPartSchema)]),
});

const chatPayloadSchema = z.object({
  title: z.string(),
  models: z.array(z.string()),
  messages: z.array(messageSchema),
});

type StreamEvent = { type: "delta"; content: string } | { type: "done" } | { type: "error"; message: string };

type CompletionMessage = z.infer<typeof completionMessageSchema>;

// Extract the plain text of a message, flattening multimodal content parts.
const messageText = (message: CompletionMessage): string =>
  typeof message.content === "string"
    ? message.content
    : message.content
        .filter((part): part is { type: "text"; text: string } => part.type === "text")
        .map((part) => part.text)
        .join(" ");

// Retrieve relevant chunks from the attached collections and prepend them as a
// system context message so the model can ground its reply on them.
const groundMessagesAsync = async (
  client: { queryCollectionsAsync: (names: string[], query: string, k?: number) => Promise<string[]> },
  messages: CompletionMessage[],
  collections: string[],
): Promise<CompletionMessage[]> => {
  if (collections.length === 0) return messages;

  const lastUserMessage = messages.findLast((message) => message.role === "user");
  const query = lastUserMessage ? messageText(lastUserMessage) : "";

  let documents: string[] = [];
  try {
    documents = await client.queryCollectionsAsync(collections, query, 4);
  } catch (error) {
    logger.warn("Open WebUI context retrieval failed; continuing without it", { error });
  }
  if (documents.length === 0) return messages;

  const context = documents.join("\n\n");
  const contextMessage: CompletionMessage = {
    role: "system",
    content:
      "Use the following context from the user's attached sources (web pages and knowledge bases) " +
      `to answer. If the answer is not in the context, say so.\n\n${context}`,
  };
  return [contextMessage, ...messages];
};

export const openWebUiRouter = createTRPCRouter({
  getModels: publicProcedure.concat(createOneIntegrationMiddleware("query", "openWebUi")).query(async ({ ctx }) => {
    const handler = openWebUiModelsRequestHandler.handler(ctx.integration, {});
    const { data } = await handler.getCachedOrUpdatedDataAsync({ forceUpdate: false });
    return data;
  }),

  getChats: publicProcedure.concat(createOneIntegrationMiddleware("query", "openWebUi")).query(async ({ ctx }) => {
    const handler = openWebUiChatsRequestHandler.handler(ctx.integration, {});
    const { data } = await handler.getCachedOrUpdatedDataAsync({ forceUpdate: false });
    return data;
  }),

  getKnowledge: publicProcedure.concat(createOneIntegrationMiddleware("query", "openWebUi")).query(async ({ ctx }) => {
    const handler = openWebUiKnowledgeRequestHandler.handler(ctx.integration, {});
    const { data } = await handler.getCachedOrUpdatedDataAsync({ forceUpdate: false });
    return data;
  }),

  // Ingest a web page so its content can ground later messages. Returns the
  // collection to retrieve from plus a display title.
  processWeb: protectedProcedure
    .input(z.object({ url: z.string().url() }))
    .concat(createOneIntegrationMiddleware("interact", "openWebUi"))
    .mutation(async ({ ctx, input }) => {
      const client = await createIntegrationAsync(ctx.integration);
      return await client.processWebAsync(input.url);
    }),

  getChat: publicProcedure
    .input(z.object({ chatId: z.string() }))
    .concat(createOneIntegrationMiddleware("query", "openWebUi"))
    .query(async ({ ctx, input }) => {
      const handler = openWebUiChatRequestHandler.handler(ctx.integration, { chatId: input.chatId });
      const { data } = await handler.getCachedOrUpdatedDataAsync({ forceUpdate: false });
      return data;
    }),

  createChat: protectedProcedure
    .input(chatPayloadSchema)
    .concat(createOneIntegrationMiddleware("interact", "openWebUi"))
    .mutation(async ({ ctx, input }) => {
      const client = await createIntegrationAsync(ctx.integration);
      const chat = await client.createChatAsync({
        title: input.title,
        models: input.models,
        messages: input.messages,
      });
      await openWebUiChatsRequestHandler.handler(ctx.integration, {}).invalidateAsync();
      return chat;
    }),

  updateChat: protectedProcedure
    .input(z.object({ chatId: z.string(), chat: chatPayloadSchema }))
    .concat(createOneIntegrationMiddleware("interact", "openWebUi"))
    .mutation(async ({ ctx, input }) => {
      const client = await createIntegrationAsync(ctx.integration);
      const chat = await client.updateChatAsync(input.chatId, input.chat);
      await openWebUiChatsRequestHandler.handler(ctx.integration, {}).invalidateAsync();
      await openWebUiChatRequestHandler.handler(ctx.integration, { chatId: input.chatId }).invalidateAsync();
      return chat;
    }),

  // Streaming chat completion. Delivered over the WebSocket subscription link so
  // tokens can be emitted as they arrive. Uses "query" access (same level as
  // viewing the widget) to match the other integration subscriptions in the app.
  sendMessage: publicProcedure
    .input(
      z.object({
        model: z.string(),
        messages: z.array(completionMessageSchema),
        // Collections to ground the reply on (web pages + knowledge bases). We
        // retrieve relevant chunks and inject them as context before streaming.
        collections: z.array(z.string()).optional(),
      }),
    )
    .concat(createOneIntegrationMiddleware("query", "openWebUi"))
    .subscription(({ ctx, input }) => {
      return observable<StreamEvent>((emit) => {
        const controller = new AbortController();

        void (async () => {
          try {
            const client = await createIntegrationAsync(ctx.integration);
            const messages = await groundMessagesAsync(client, input.messages, input.collections ?? []);
            await client.streamChatCompletionAsync(
              { model: input.model, messages },
              (delta) => emit.next({ type: "delta", content: delta }),
              controller.signal,
            );
            emit.next({ type: "done" });
            emit.complete();
          } catch (error) {
            if (!controller.signal.aborted) {
              logger.error("Open WebUI chat completion failed", {
                integrationId: ctx.integration.id,
                error,
              });
              emit.next({
                type: "error",
                message: error instanceof Error ? error.message : "Failed to stream chat completion",
              });
            }
            emit.complete();
          }
        })();

        return () => {
          controller.abort();
        };
      });
    }),
});
