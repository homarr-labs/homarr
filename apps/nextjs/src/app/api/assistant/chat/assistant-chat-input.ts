export type AssistantMentionReference = {
  type: "app" | "integration" | "board" | "widget";
  id: string;
};

const mentionPattern = /:(app|integration|board|widget)\[([^\]\n]{1,1024})\](?:\{name=[^}\n]{1,1024}\})?/gu;

const getMessageText = (message: { parts: unknown[] }) =>
  message.parts
    .flatMap((part) => {
      if (!part || typeof part !== "object" || Array.isArray(part)) return [];
      const value = part as Record<string, unknown>;
      return value.type === "text" && typeof value.text === "string" ? [value.text] : [];
    })
    .join("\n");

export const getRequestedMentionIds = (messages: { role: "user" | "assistant"; parts: unknown[] }[]) => {
  const mentions = new Map<string, AssistantMentionReference>();
  for (const message of messages) {
    if (message.role !== "user") continue;
    for (const match of getMessageText(message).matchAll(mentionPattern)) {
      const type = match[1] as AssistantMentionReference["type"];
      const id = match[2];
      if (id) mentions.set(`${type}:${id}`, { type, id });
      if (mentions.size >= 30) return [...mentions.values()];
    }
  }
  return [...mentions.values()];
};

export const sanitizeAttachmentFilename = (filename: string | undefined) =>
  (filename ?? "document").replaceAll(/[\n"<>]/gu, "_");
