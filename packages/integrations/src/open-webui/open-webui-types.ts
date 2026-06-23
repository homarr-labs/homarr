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
  // Open WebUI exposes per-model capabilities here when configured; `vision`
  // tells us whether the model can accept image attachments.
  info: z
    .object({
      meta: z
        .object({
          capabilities: z.object({ vision: z.boolean().nullish() }).nullish(),
        })
        .nullish(),
    })
    .nullish(),
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

// Multimodal content part (OpenAI vision format). Used only for outbound
// completion requests so users can attach images to a message.
export const openWebUiContentPartSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text: z.string() }),
  z.object({ type: z.literal("image_url"), image_url: z.object({ url: z.string() }) }),
]);

// A completion message can carry plain text or multimodal parts (text + images).
export const openWebUiCompletionMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.union([z.string(), z.array(openWebUiContentPartSchema)]),
});

export type OpenWebUiCompletionMessage = z.infer<typeof openWebUiCompletionMessageSchema>;

// GET /api/v1/knowledge/ — knowledge bases (RAG collections owned by the user).
// Newer Open WebUI versions paginate the list as `{ items, total }`; older ones
// return a bare array. Accept both and normalise in the integration.
export const openWebUiKnowledgeSchema = z.object({
  id: z.string(),
  name: z.string().nullish(),
  description: z.string().nullish(),
});

export type OpenWebUiKnowledge = z.infer<typeof openWebUiKnowledgeSchema>;

export const openWebUiKnowledgeListSchema = z.union([
  z.array(openWebUiKnowledgeSchema),
  z.object({ items: z.array(openWebUiKnowledgeSchema) }),
]);

// A file stored in Open WebUI (uploaded directly or part of a knowledge base).
export const openWebUiFileSchema = z.object({
  id: z.string(),
  filename: z.string().nullish(),
  meta: z.object({ name: z.string().nullish(), content_type: z.string().nullish() }).nullish(),
});

export type OpenWebUiFile = z.infer<typeof openWebUiFileSchema>;

export const openWebUiFileListSchema = z.union([
  z.array(openWebUiFileSchema),
  z.object({ items: z.array(openWebUiFileSchema) }),
]);

// POST /api/v1/files/ — upload response (we only need the new file id + name).
export const openWebUiUploadedFileSchema = z.object({
  id: z.string(),
  filename: z.string().nullish(),
  meta: z.object({ name: z.string().nullish() }).nullish(),
});

// GET /api/v1/knowledge/{id} — knowledge base with its files.
export const openWebUiKnowledgeDetailSchema = z.object({
  id: z.string(),
  name: z.string().nullish(),
  files: z.array(openWebUiFileSchema).nullish(),
});

export type OpenWebUiKnowledgeDetail = z.infer<typeof openWebUiKnowledgeDetailSchema>;

// GET /api/v1/notes/ — user notes (markdown content under data.content.md).
export const openWebUiNoteSchema = z.object({
  id: z.string(),
  title: z.string().nullish(),
  data: z.object({ content: z.object({ md: z.string().nullish() }).nullish() }).nullish(),
});

export const openWebUiNoteListSchema = z.union([
  z.array(openWebUiNoteSchema),
  z.object({ items: z.array(openWebUiNoteSchema) }),
]);

// A note flattened for the widget: id, title and its markdown body.
export interface OpenWebUiNote {
  id: string;
  title: string;
  content: string;
}

// A file flattened for the widget: id and a display name.
export interface OpenWebUiFileSummary {
  id: string;
  name: string;
}

// POST /api/v1/retrieval/process/web — ingests a URL into a temporary vector
// collection. We retrieve from that collection at send time and inject the
// results as context (Open WebUI does not fetch URLs at completion time).
export const openWebUiProcessWebResponseSchema = z.object({
  collection_name: z.string(),
  filename: z.string().nullish(),
  file: z.object({ meta: z.object({ name: z.string().nullish() }).nullish() }).nullish(),
});

// POST /api/v1/retrieval/query/collection — top-k chunks per collection.
export const openWebUiCollectionQueryResponseSchema = z.object({
  documents: z.array(z.array(z.string())).nullish(),
});

// A web page ingested for grounding: the collection to retrieve from + a label.
export interface OpenWebUiWebDocument {
  collectionName: string;
  title: string;
}

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
