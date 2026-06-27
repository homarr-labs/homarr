import { observable } from "@trpc/server/observable";
import { z } from "zod/v4";

import { createLogger } from "@homarr/core/infrastructure/logs";
import { createIntegrationAsync } from "@homarr/integrations";
import {
  openWebUiChatRequestHandler,
  openWebUiChatsRequestHandler,
  openWebUiModelsRequestHandler,
} from "@homarr/request-handler/open-webui";

import { createOneIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../../trpc";

const logger = createLogger({ module: "openWebUiRouter" });

const messageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string(),
});

const chatPayloadSchema = z.object({
  title: z.string(),
  models: z.array(z.string()),
  messages: z.array(messageSchema),
});

type StreamEvent = { type: "delta"; content: string } | { type: "done" } | { type: "error"; message: string };

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
    .input(z.object({ model: z.string(), messages: z.array(messageSchema) }))
    .concat(createOneIntegrationMiddleware("query", "openWebUi"))
    .subscription(({ ctx, input }) => {
      return observable<StreamEvent>((emit) => {
        const controller = new AbortController();

        void (async () => {
          try {
            const client = await createIntegrationAsync(ctx.integration);
            await client.streamChatCompletionAsync(
              { model: input.model, messages: input.messages },
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
