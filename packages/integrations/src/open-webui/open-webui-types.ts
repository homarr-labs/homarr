// Open WebUI API types and schemas.
// Open WebUI exposes an OpenAI-compatible API plus its own native chat-history API.
// Schemas are intentionally defensive (`.nullish()`) because the native chat
// endpoints are undocumented and vary between Open WebUI versions.
import { z } from "zod/v4";

// GET /api/models — OpenAI-compatible. Open WebUI returns `{ data: [...] }`.
export const openWebUiModelSchema = z.object({
  id: z.string(),
  name: z.string().nullish(),
  object: z.string().nullish(),
  owned_by: z.string().nullish(),
});

export const openWebUiModelsResponseSchema = z.object({
  data: z.array(openWebUiModelSchema),
});

export type OpenWebUiModel = z.infer<typeof openWebUiModelSchema>;

// POST /api/chat/completions (stream: true) — OpenAI-compatible SSE delta chunk.
export const openWebUiCompletionChunkSchema = z.object({
  id: z.string().nullish(),
  choices: z
    .array(
      z.object({
        delta: z
          .object({
            role: z.string().nullish(),
            content: z.string().nullish(),
          })
          .nullish(),
        finish_reason: z.string().nullish(),
      }),
    )
    .nullish(),
});

// A single chat message exchanged with the model / persisted in a chat.
export const openWebUiChatMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string(),
});

export type OpenWebUiChatMessage = z.infer<typeof openWebUiChatMessageSchema>;

// GET /api/v1/chats/ — list of the user's chats (native Open WebUI shape).
export const openWebUiChatListItemSchema = z.object({
  id: z.string(),
  title: z.string().nullish(),
  updated_at: z.number().nullish(),
  created_at: z.number().nullish(),
});

export type OpenWebUiChatListItem = z.infer<typeof openWebUiChatListItemSchema>;

// GET /api/v1/chats/{id} — full chat.
// Two message representations exist: a flat `chat.messages` list (used by chats
// we create) and a `chat.history` tree keyed by message id with a `currentId`
// leaf (used by chats created in the Open WebUI UI). The history tree is
// authoritative when present, since `chat.messages` can be stale/partial.
export const openWebUiHistoryMessageSchema = z.object({
  id: z.string().nullish(),
  parentId: z.string().nullish(),
  role: z.string().nullish(),
  content: z.string().nullish(),
});

export const openWebUiChatSchema = z.object({
  id: z.string(),
  title: z.string().nullish(),
  updated_at: z.number().nullish(),
  created_at: z.number().nullish(),
  chat: z
    .object({
      title: z.string().nullish(),
      models: z.array(z.string()).nullish(),
      messages: z
        .array(
          z.object({
            role: z.string().nullish(),
            content: z.string().nullish(),
          }),
        )
        .nullish(),
      history: z
        .object({
          currentId: z.string().nullish(),
          messages: z.record(z.string(), openWebUiHistoryMessageSchema).nullish(),
        })
        .nullish(),
    })
    .nullish(),
});

export type OpenWebUiChat = z.infer<typeof openWebUiChatSchema>;

// Body used when creating/updating a chat through the native API.
export interface OpenWebUiChatPayload {
  title: string;
  models: string[];
  messages: OpenWebUiChatMessage[];
}
