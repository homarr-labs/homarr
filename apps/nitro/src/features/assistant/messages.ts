import { z } from "zod";

import type { AssistantAppendInput, AssistantThread } from "./client";

const contentSchema = z
  .object({
    role: z.enum(["user", "assistant"]),
    parts: z.array(z.unknown()).max(200),
    metadata: z.unknown().optional(),
  })
  .passthrough();

const messageSchema = contentSchema.extend({ id: z.string().min(1).max(128) });
const textSchema = z.object({ type: z.literal("text"), text: z.string() });
const reasoningSchema = z.object({ type: z.literal("reasoning"), text: z.string() });
const stepStartSchema = z.object({ type: z.literal("step-start") });
const feedbackSchema = z.object({ submittedFeedback: z.object({ type: z.enum(["positive", "negative"]) }) });
const pendingToolSchema = z.object({
  type: z.string(),
  state: z.enum(["input-streaming", "input-available", "approval-requested", "approval-responded"]),
});
const numberSchema = z.number().finite().nonnegative().optional();
const displayMetadataSchema = z.object({
  usage: z
    .object({
      inputTokens: numberSchema,
      outputTokens: numberSchema,
      totalTokens: numberSchema,
      reasoningTokens: numberSchema,
      cachedInputTokens: numberSchema,
    })
    .optional(),
  custom: z
    .object({
      telemetry: z.object({
        provider: z.string(),
        modelId: z.string(),
        durationMs: numberSchema,
        contextUsed: numberSchema,
        contextLength: numberSchema,
        cost: numberSchema,
        costType: z.enum(["reported", "estimated"]).optional(),
      }),
    })
    .optional(),
});

export type AssistantMessage = z.infer<typeof messageSchema>;
export type AssistantMessageEntry =
  | {
      readonly kind: "supported";
      readonly id: string;
      readonly parentId: string | null;
      readonly message: AssistantMessage;
    }
  | { readonly kind: "unsupported"; readonly id: string; readonly parentId: string | null };

export function decodeAssistantMessages(thread: AssistantThread): AssistantMessageEntry[] {
  return thread.messages.map((stored) => {
    const content = contentSchema.safeParse(stored.content);
    if (stored.format !== "ai-sdk/v6" || !content.success) {
      return { kind: "unsupported", id: stored.id, parentId: stored.parentId };
    }
    return {
      kind: "supported",
      id: stored.id,
      parentId: stored.parentId,
      message: { ...content.data, id: stored.id },
    };
  });
}

export function parseAssistantStreamMessage(value: unknown): AssistantMessage {
  const message = messageSchema.parse(value);
  if (message.role !== "assistant") throw new Error("Invalid assistant stream role");
  return message;
}

export function encodeAssistantMessage(
  threadId: string,
  parentId: string | null,
  message: AssistantMessage,
): AssistantAppendInput {
  const { id, ...content } = message;
  return { threadId, id, parentId, format: "ai-sdk/v6", content };
}

export function assistantMessageText(message: AssistantMessage) {
  return message.parts
    .flatMap((part) => {
      const result = textSchema.safeParse(part);
      return result.success ? [result.data.text] : [];
    })
    .join("\n");
}

export function assistantMessageReasoning(message: AssistantMessage) {
  return message.parts
    .flatMap((part) => {
      const result = reasoningSchema.safeParse(part);
      return result.success ? [result.data.text] : [];
    })
    .join("\n");
}

export function assistantMessageHasPendingTool(message: AssistantMessage) {
  return message.parts.some((part) => {
    const result = pendingToolSchema.safeParse(part);
    return result.success && (result.data.type === "dynamic-tool" || result.data.type.startsWith("tool-"));
  });
}

export function assistantMessageHasOtherParts(message: AssistantMessage) {
  return message.parts.some(
    (part) =>
      !textSchema.safeParse(part).success &&
      !reasoningSchema.safeParse(part).success &&
      !stepStartSchema.safeParse(part).success,
  );
}

export function assistantMessageFeedback(message: AssistantMessage) {
  const result = feedbackSchema.safeParse(message.metadata);
  return result.success ? result.data.submittedFeedback.type : null;
}

export function assistantDisplayMetadata(message: AssistantMessage) {
  const result = displayMetadataSchema.safeParse(message.metadata);
  return result.success ? result.data : null;
}

export function assistantBranch(entries: readonly AssistantMessageEntry[], leafId: string | null) {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const branch: AssistantMessageEntry[] = [];
  const visited = new Set<string>();
  let id = leafId;
  while (id !== null) {
    if (visited.has(id)) throw new Error("Invalid assistant message parent cycle");
    visited.add(id);
    const entry = byId.get(id);
    if (!entry) throw new Error("Missing assistant message parent");
    branch.push(entry);
    id = entry.parentId;
  }
  return branch.reverse();
}
