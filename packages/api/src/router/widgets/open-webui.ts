import { observable } from "@trpc/server/observable";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { createLogger } from "@homarr/core/infrastructure/logs";
import { createIntegrationAsync } from "@homarr/integrations";
import {
  openWebUiChatRequestHandler,
  openWebUiChatsRequestHandler,
  openWebUiFilesRequestHandler,
  openWebUiKnowledgeFilesRequestHandler,
  openWebUiKnowledgeRequestHandler,
  openWebUiModelsRequestHandler,
  openWebUiNoteRequestHandler,
  openWebUiNotesRequestHandler,
} from "@homarr/request-handler/open-webui";

import { createOneIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../../trpc";

const logger = createLogger({ module: "openWebUiRouter" });

/**
 * Open WebUI integrations hold a personal API key that grants access to a
 * single user's data (chat history, files, notes, knowledge bases).  To prevent
 * other Homarr users from reading that data, every procedure that touches the
 * integration verifies that the caller is the integration's creator.
 *
 * The check is intentionally placed **after** the integration middleware (which
 * already validates the caller's permission level) so the error message does
 * not leak whether the integration exists.
 */
const throwIfNotCreator = (integration: { creatorId?: string | null }, userId: string | undefined) => {
  // Existing integrations that predate the creatorId column have a null
  // creatorId; we skip the check for backward compatibility.
  if (integration.creatorId && integration.creatorId !== userId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only the integration creator can access this data" });
  }
};

// Hosts that should never be fetched server-side. processWeb is already
// creator-gated, but we still refuse loopback and the cloud metadata endpoint so
// a stray URL can't turn Open WebUI's fetcher into an SSRF vector. Private LAN
// ranges stay allowed on purpose (self-hosters routinely ingest internal wikis).
const isBlockedWebHost = (hostname: string): boolean => {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "0.0.0.0" ||
    host === "::" ||
    host === "::1" ||
    host.startsWith("127.") ||
    host === "169.254.169.254" || // AWS/GCP/Azure instance metadata
    host === "metadata.google.internal"
  );
};

// A user-provided URL for web-page ingestion: must be http(s) and not target a
// loopback/metadata host.
const webUrlSchema = z
  .string()
  .url()
  .refine((value) => {
    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      return false;
    }
    return (parsed.protocol === "http:" || parsed.protocol === "https:") && !isBlockedWebHost(parsed.hostname);
  }, "URL must be an http(s) address and must not point at a loopback or metadata host");

// Roughly 18 MB of raw bytes once base64-decoded (base64 inflates by ~4/3).
// Bounds the upload/transcription payloads so a huge request can't pressure
// memory here or upstream before we even start decoding.
const MAX_BASE64_LENGTH = 25_000_000;
const boundedBase64Schema = z.string().min(1).max(MAX_BASE64_LENGTH);
const uploadFilenameSchema = z.string().min(1).max(255);
const contentTypeSchema = z.string().min(1).max(255);

// Tag persisted conversations with the owning Homarr user so they can be found
// back in Open WebUI even when an integration/account is shared between users.
const homarrUserTag = (userId: string) => `homarr-user:${userId}`;

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

// Number of chunks to retrieve per collection when grounding a reply.
const RETRIEVAL_K = 4;

// Instruction prepended to the retrieved context so the model knows how to use
// it. Model-facing, so intentionally not localized.
const RETRIEVAL_INSTRUCTION =
  "Use the following context from the user's attached sources (web pages, knowledge bases, " +
  "files, notes and chats) to answer. If the answer is not in the context, say so.";

// Retrieve relevant chunks from the attached collections and prepend them as a
// system context message so the model can ground its reply on them.
const groundMessagesAsync = async (
  client: { queryCollectionsAsync: (names: string[], query: string, k?: number) => Promise<string[]> },
  messages: CompletionMessage[],
  collections: string[],
  contextTexts: string[],
): Promise<CompletionMessage[]> => {
  if (collections.length === 0 && contextTexts.length === 0) return messages;

  // Use the most recent user message that has text. The latest turn can be
  // image-only (no text), in which case we fall back to the prior question so
  // attached collections still get a meaningful retrieval query.
  const query =
    messages
      .filter((message) => message.role === "user")
      .map(messageText)
      .findLast((text) => text.trim() !== "") ?? "";

  let documents: string[] = [];
  if (collections.length > 0) {
    try {
      documents = await client.queryCollectionsAsync(collections, query, RETRIEVAL_K);
    } catch (error) {
      logger.warn("Open WebUI context retrieval failed; continuing without it", { error });
    }
  }

  const blocks = [...documents, ...contextTexts].filter((block) => block.trim() !== "");
  if (blocks.length === 0) return messages;

  const contextMessage: CompletionMessage = {
    role: "system",
    content: `${RETRIEVAL_INSTRUCTION}\n\n${blocks.join("\n\n")}`,
  };
  return [contextMessage, ...messages];
};

export const openWebUiRouter = createTRPCRouter({
  getModels: publicProcedure.concat(createOneIntegrationMiddleware("query", "openWebUi")).query(async ({ ctx }) => {
    throwIfNotCreator(ctx.integration, ctx.session?.user.id);
    const handler = openWebUiModelsRequestHandler.handler(ctx.integration, {});
    const { data } = await handler.getCachedOrUpdatedDataAsync({ forceUpdate: false });
    return data;
  }),

  // Chat history exposes private user data, so we require "interact" access
  // (not just "query") and verify the caller is the integration's creator.
  getChats: protectedProcedure
    .concat(createOneIntegrationMiddleware("interact", "openWebUi"))
    .query(async ({ ctx }) => {
      throwIfNotCreator(ctx.integration, ctx.session.user.id);
      const handler = openWebUiChatsRequestHandler.handler(ctx.integration, {});
      const { data } = await handler.getCachedOrUpdatedDataAsync({ forceUpdate: false });
      return data;
    }),

  // Knowledge bases, files and notes expose private source content/metadata, so
  // gate them like the interactive chat paths (protected + "interact" access,
  // creator-only) instead of leaving them reachable by anonymous board viewers.
  getKnowledge: protectedProcedure
    .concat(createOneIntegrationMiddleware("interact", "openWebUi"))
    .query(async ({ ctx }) => {
      throwIfNotCreator(ctx.integration, ctx.session.user.id);
      const handler = openWebUiKnowledgeRequestHandler.handler(ctx.integration, {});
      const { data } = await handler.getCachedOrUpdatedDataAsync({ forceUpdate: false });
      return data;
    }),

  getFiles: protectedProcedure
    .concat(createOneIntegrationMiddleware("interact", "openWebUi"))
    .query(async ({ ctx }) => {
      throwIfNotCreator(ctx.integration, ctx.session.user.id);
      const handler = openWebUiFilesRequestHandler.handler(ctx.integration, {});
      const { data } = await handler.getCachedOrUpdatedDataAsync({ forceUpdate: false });
      return data;
    }),

  getNotes: protectedProcedure
    .concat(createOneIntegrationMiddleware("interact", "openWebUi"))
    .query(async ({ ctx }) => {
      throwIfNotCreator(ctx.integration, ctx.session.user.id);
      const handler = openWebUiNotesRequestHandler.handler(ctx.integration, {});
      const { data } = await handler.getCachedOrUpdatedDataAsync({ forceUpdate: false });
      return data;
    }),

  getNote: protectedProcedure
    .input(z.object({ noteId: z.string() }))
    .concat(createOneIntegrationMiddleware("interact", "openWebUi"))
    .query(async ({ ctx, input }) => {
      throwIfNotCreator(ctx.integration, ctx.session.user.id);
      const handler = openWebUiNoteRequestHandler.handler(ctx.integration, { noteId: input.noteId });
      const { data } = await handler.getCachedOrUpdatedDataAsync({ forceUpdate: false });
      return data;
    }),

  getKnowledgeFiles: protectedProcedure
    .input(z.object({ knowledgeId: z.string() }))
    .concat(createOneIntegrationMiddleware("interact", "openWebUi"))
    .query(async ({ ctx, input }) => {
      throwIfNotCreator(ctx.integration, ctx.session.user.id);
      const handler = openWebUiKnowledgeFilesRequestHandler.handler(ctx.integration, {
        knowledgeId: input.knowledgeId,
      });
      const { data } = await handler.getCachedOrUpdatedDataAsync({ forceUpdate: false });
      return data;
    }),

  // Ingest a web page so its content can ground later messages. Returns the
  // collection to retrieve from plus a display title.
  processWeb: protectedProcedure
    .input(z.object({ url: webUrlSchema }))
    .concat(createOneIntegrationMiddleware("interact", "openWebUi"))
    .mutation(async ({ ctx, input }) => {
      throwIfNotCreator(ctx.integration, ctx.session.user.id);
      const client = await createIntegrationAsync(ctx.integration);
      return await client.processWebAsync(input.url);
    }),

  // Upload a file (e.g. a document) so it can be retrieved from later. Returns
  // the file id; its vector collection is `file-{id}`.
  uploadFile: protectedProcedure
    .input(
      z.object({ filename: uploadFilenameSchema, contentBase64: boundedBase64Schema, contentType: contentTypeSchema }),
    )
    .concat(createOneIntegrationMiddleware("interact", "openWebUi"))
    .mutation(async ({ ctx, input }) => {
      throwIfNotCreator(ctx.integration, ctx.session.user.id);
      const client = await createIntegrationAsync(ctx.integration);
      return await client.uploadFileAsync(input.filename, input.contentBase64, input.contentType);
    }),

  // Transcribe recorded audio to text for voice messages.
  transcribe: protectedProcedure
    .input(
      z.object({ filename: uploadFilenameSchema, contentBase64: boundedBase64Schema, contentType: contentTypeSchema }),
    )
    .concat(createOneIntegrationMiddleware("interact", "openWebUi"))
    .mutation(async ({ ctx, input }) => {
      throwIfNotCreator(ctx.integration, ctx.session.user.id);
      const client = await createIntegrationAsync(ctx.integration);
      const text = await client.transcribeAudioAsync(input.filename, input.contentBase64, input.contentType);
      return { text };
    }),

  // Full chat messages contain private user data; restrict to the creator.
  getChat: protectedProcedure
    .input(z.object({ chatId: z.string() }))
    .concat(createOneIntegrationMiddleware("interact", "openWebUi"))
    .query(async ({ ctx, input }) => {
      throwIfNotCreator(ctx.integration, ctx.session.user.id);
      const handler = openWebUiChatRequestHandler.handler(ctx.integration, { chatId: input.chatId });
      const { data } = await handler.getCachedOrUpdatedDataAsync({ forceUpdate: false });
      return data;
    }),

  createChat: protectedProcedure
    .input(chatPayloadSchema)
    .concat(createOneIntegrationMiddleware("interact", "openWebUi"))
    .mutation(async ({ ctx, input }) => {
      throwIfNotCreator(ctx.integration, ctx.session.user.id);
      const client = await createIntegrationAsync(ctx.integration);
      const chat = await client.createChatAsync({
        title: input.title,
        models: input.models,
        messages: input.messages,
        meta: { tags: [homarrUserTag(ctx.session.user.id)] },
      });
      await openWebUiChatsRequestHandler.handler(ctx.integration, {}).invalidateAsync();
      return chat;
    }),

  updateChat: protectedProcedure
    .input(z.object({ chatId: z.string(), chat: chatPayloadSchema }))
    .concat(createOneIntegrationMiddleware("interact", "openWebUi"))
    .mutation(async ({ ctx, input }) => {
      throwIfNotCreator(ctx.integration, ctx.session.user.id);
      const client = await createIntegrationAsync(ctx.integration);
      const chat = await client.updateChatAsync(input.chatId, {
        ...input.chat,
        meta: { tags: [homarrUserTag(ctx.session.user.id)] },
      });
      await openWebUiChatsRequestHandler.handler(ctx.integration, {}).invalidateAsync();
      await openWebUiChatRequestHandler.handler(ctx.integration, { chatId: input.chatId }).invalidateAsync();
      return chat;
    }),

  // Streaming chat completion. Delivered over the WebSocket subscription link so
  // tokens can be emitted as they arrive. A completion spends the owner's upstream
  // LLM credits, so it must not be reachable by anonymous viewers of a public
  // board: protectedProcedure requires a session (the WS context resolves it from
  // the session-token cookie) and the "interact" middleware checks integration
  // access, matching processWeb/uploadFile/transcribe above.
  sendMessage: protectedProcedure
    .input(
      z.object({
        model: z.string(),
        messages: z.array(completionMessageSchema),
        // Collections to ground the reply on (web pages, knowledge bases, files).
        // We retrieve relevant chunks and inject them before streaming.
        collections: z.array(z.string()).optional(),
        // Verbatim context blocks (notes, referenced chats) injected as-is.
        contextTexts: z.array(z.string()).optional(),
      }),
    )
    .concat(createOneIntegrationMiddleware("interact", "openWebUi"))
    .subscription(({ ctx, input }) => {
      throwIfNotCreator(ctx.integration, ctx.session?.user.id);
      return observable<StreamEvent>((emit) => {
        const controller = new AbortController();

        void (async () => {
          try {
            const client = await createIntegrationAsync(ctx.integration);
            const messages = await groundMessagesAsync(
              client,
              input.messages,
              input.collections ?? [],
              input.contextTexts ?? [],
            );
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
